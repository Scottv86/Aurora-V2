import { Router } from 'express';
import { TenantRequest } from '../middleware/tenantMiddleware';
import { runAgentLoop } from '../services/antigravityAgent';

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
    const { message, socketId, context, model } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Run the agent loop asynchronously. The socket emits intermediate thoughts/results
    const result = await runAgentLoop(tenantId, userId, id, message, socketId, context, model);

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
    res.status(500).json({ error: err.message || 'Agent loop encountered an error' });
  }
});

export default router;
