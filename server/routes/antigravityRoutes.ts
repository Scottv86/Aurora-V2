import { Router } from 'express';
import { TenantRequest } from '../middleware/tenantMiddleware';
import { runAgentLoop, executeAgentTool, resumeAgentLoop } from '../services/antigravityAgent';

const router = Router();

// GET all sessions
router.get('/sessions', async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const tenantId = req.tenantId!;

    const sessions = await db.antigravitySession.findMany({
      where: { tenantId },
      orderBy: { updatedAt: 'desc' }
    });

    res.json(sessions);
  } catch (err: any) {
    console.error('[AntigravityRoutes] GET /sessions Error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch sessions' });
  }
});

// GET session details (including messages)
router.get('/sessions/:id', async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const { id } = req.params;

    const session = await db.antigravitySession.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json(session);
  } catch (err: any) {
    console.error('[AntigravityRoutes] GET /sessions/:id Error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch session' });
  }
});

// CREATE session
router.post('/sessions', async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const tenantId = req.tenantId!;
    const { title } = req.body;

    const session = await db.antigravitySession.create({
      data: {
        tenantId,
        title: title || 'New Vibe Chat',
        metadata: {
          plan: "",
          tasks: [],
          walkthrough: ""
        }
      }
    });

    res.json(session);
  } catch (err: any) {
    console.error('[AntigravityRoutes] POST /sessions Error:', err);
    res.status(500).json({ error: err.message || 'Failed to create session' });
  }
});

// PATCH update session title or metadata
router.patch('/sessions/:id', async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const { id } = req.params;
    const { title, metadata } = req.body;

    const existing = await db.antigravitySession.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const updated = await db.antigravitySession.update({
      where: { id },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(metadata !== undefined ? { metadata: { ...((existing.metadata as object) || {}), ...metadata } } : {})
      }
    });

    res.json(updated);
  } catch (err: any) {
    console.error('[AntigravityRoutes] PATCH /sessions/:id Error:', err);
    res.status(500).json({ error: err.message || 'Failed to update session' });
  }
});

// DELETE session
router.delete('/sessions/:id', async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const { id } = req.params;

    await db.antigravitySession.delete({
      where: { id }
    });

    res.json({ success: true });
  } catch (err: any) {
    console.error('[AntigravityRoutes] DELETE /sessions/:id Error:', err);
    res.status(500).json({ error: err.message || 'Failed to delete session' });
  }
});

// POST user message / run agent loop
router.post('/sessions/:id/chat', async (req: TenantRequest, res) => {
  try {
    const tenantId = req.tenantId!;
    const userId = req.user!.uid; // Resolved by authMiddleware
    const { id } = req.params;
    const { message, socketId, context, model, attachments } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Run the agent loop asynchronously. The socket emits intermediate thoughts/results
    const result = await runAgentLoop(tenantId, userId, id, message, socketId, context, model, attachments);

    // Also update session title if it was default
    const db = req.db!;
    const session = await db.antigravitySession.findUnique({ where: { id } });
    if (session && session.title === 'New Vibe Chat') {
      const summaryTitle = message.substring(0, 30) + (message.length > 30 ? '...' : '');
      await db.antigravitySession.update({
        where: { id },
        data: { title: summaryTitle }
      });
    }

    res.json({ success: true, ...result });
  } catch (err: any) {
    console.error('[AntigravityRoutes] POST /sessions/:id/chat Error:', err);
    res.status(500).json({ error: err.message || 'Agent loop encountered an error', provider: err.provider, model: err.model });
  }
});

// POST action approval callback
router.post('/sessions/:id/approve', async (req: TenantRequest, res) => {
  try {
    const tenantId = req.tenantId!;
    const userId = req.user!.uid;
    const { id } = req.params;
    const { action, socketId, model } = req.body; // 'approve' or 'reject'
    const db = req.db!;

    const session = await db.antigravitySession.findUnique({
      where: { id }
    });
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const metadata = (session.metadata as any) || {};
    const pausedState = metadata.pausedSessionState;

    if (!pausedState) {
      return res.status(400).json({ error: 'No paused action found for this session' });
    }

    if (action === 'reject') {
      // Clear paused state
      metadata.pausedSessionState = null;
      await db.antigravitySession.update({
        where: { id },
        data: { metadata }
      });

      const text = "Action rejected by user. The request has been cancelled.";
      await db.antigravityMessage.create({
        data: {
          sessionId: id,
          role: 'model',
          content: text,
          steps: []
        }
      });

      return res.json({ success: true, text });
    }

    // Process approved tool execution
    const { contents, steps, pendingTool } = pausedState;
    const { name, args } = pendingTool;

    console.log(`[Approval] User approved execution of: ${name} with args`, args);

    let result: any = null;
    try {
      result = await executeAgentTool(db, tenantId, name, args, id, metadata);
    } catch (toolErr: any) {
      result = { error: toolErr.message || "Failed to execute approved action" };
    }

    // Append response to history
    const functionResponses = [{
      response: { output: result },
      name
    }];
    const nextContents = [...contents];
    nextContents.push({
      role: 'user',
      parts: functionResponses.map(r => ({
        functionResponse: { name: r.name, response: r.response }
      }))
    });

    // Update message steps
    const lastMsg = await db.antigravityMessage.findFirst({
      where: { sessionId: id, role: 'model' },
      orderBy: { createdAt: 'desc' }
    });
    if (lastMsg) {
      const msgSteps = Array.isArray(lastMsg.steps) ? lastMsg.steps : [];
      const updatedSteps = msgSteps.map((s: any) => 
        s.name === name ? { ...s, status: 'done', result } : s
      );
      await db.antigravityMessage.update({
        where: { id: lastMsg.id },
        data: { steps: updatedSteps as any }
      });
    }

    // Clear paused state from metadata
    metadata.pausedSessionState = null;
    await db.antigravitySession.update({
      where: { id },
      data: { metadata }
    });

    // Resume agent loop
    const resumeResult = await resumeAgentLoop(tenantId, userId, id, nextContents, steps, socketId, model, metadata);

    res.json({ success: true, ...resumeResult });
  } catch (err: any) {
    console.error('[AntigravityRoutes] Action Approval Error:', err);
    res.status(500).json({ error: err.message || 'Failed to process approval action', provider: err.provider, model: err.model });
  }
});

export default router;
