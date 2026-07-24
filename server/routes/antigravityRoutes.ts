import { Router } from 'express';
import { TenantRequest } from '../middleware/tenantMiddleware';
import { runAgentLoop, executeAgentTool, resumeAgentLoop } from '../services/antigravityAgent';
import { resolveTenantAIClient, executeAICompletion } from '../services/aiProviderService';
import { AutomationScheduler } from '../services/scheduler';
import { emitTenantUpdate } from '../socket';

const router = Router();

async function generateSmartSessionTitle(message: string): Promise<string> {
  try {
    const cleanMsg = message.trim();
    let prompt = cleanMsg.replace(/^(what is an|what is a|what is|tell me how to|tell me how|tell me|explain|how do i|how to|i want to|give me all the|give me|i want you to)\s+/i, '');
    prompt = prompt.charAt(0).toUpperCase() + prompt.slice(1);

    const words = prompt.split(/\s+/);
    if (words.length <= 7 && prompt.length <= 60) {
      return prompt.replace(/[?.!]+$/, '');
    }

    const client = await resolveTenantAIClient('default-tenant', 'gemini-3.1-flash-lite');
    const result = await executeAICompletion(client, {
      contents: [{ role: 'user', parts: [{ text: `Summarize this user request into a clean 3 to 6 word chat title (like ChatGPT/Gemini titles). Do NOT use quotes, punctuation, or filler words. Return ONLY the short title text.\n\nUSER REQUEST: "${message}"` }] }],
      systemInstruction: "You are an automated chat title generator. Output ONLY a clean 3-6 word title."
    });

    const title = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim()?.replace(/["']/g, '');
    if (title && title.length > 0 && title.length < 60) {
      return title;
    }
  } catch (e) {
    console.warn('[antigravityRoutes] Smart title generation failed, using fallback:', e);
  }

  const words = message.replace(/^(what is an|what is a|what is|tell me how to|tell me how|tell me|explain|how do i|how to|i want to|give me all the|give me|i want you to)\s+/i, '').split(/\s+/);
  const fallback = words.slice(0, 7).join(' ').replace(/[?.!]+$/, '');
  return fallback.charAt(0).toUpperCase() + fallback.slice(1);
}

function canUserAccessSession(session: any, userId?: string, isSuperAdmin?: boolean): boolean {
  if (isSuperAdmin) return true;
  if (!session) return false;
  if (!session.userId) return true; // Legacy session with no owner
  if (!userId) return true;
  if (session.userId === userId) return true; // Creator/owner
  if (session.isSharedWithTenant) return true; // Shared with whole tenancy

  let sharedWith: string[] = [];
  if (Array.isArray(session.sharedWithUserIds)) {
    sharedWith = session.sharedWithUserIds;
  } else if (typeof session.sharedWithUserIds === 'string') {
    try { sharedWith = JSON.parse(session.sharedWithUserIds); } catch (e) {}
  }
  return sharedWith.includes(userId);
}

// GET all active sessions
router.get('/sessions', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const tenantId = req.tenantId!;
    const currentUserId = req.user?.uid;
    const isSuperAdmin = req.user?.isSuperAdmin;

    const trashModel = (db as any).recyclingBinItem || (globalPrisma as any).recyclingBinItem;
    let trashedSessionIds: string[] = [];
    if (trashModel) {
      const trashed = await trashModel.findMany({
        where: { tenantId, itemType: 'CHAT_SESSION' },
        select: { itemId: true }
      }).catch(() => []);
      trashedSessionIds = trashed.map((t: any) => t.itemId);
    }

    let sessions = await (db as any).antigravitySession.findMany({
      where: {
        tenantId,
        ...(trashedSessionIds.length > 0 ? { id: { notIn: trashedSessionIds } } : {})
      },
      orderBy: { updatedAt: 'desc' }
    });

    // Filter sessions to only those accessible by the user
    if (!isSuperAdmin && currentUserId) {
      sessions = sessions.filter((session: any) => canUserAccessSession(session, currentUserId, false));
    }

    // Clean up legacy truncated/verbose session titles
    for (const session of sessions) {
      if (session.title.includes('...') || session.title.length <= 30 || /^(what is|tell me|give me|i want|explain|how do|what are)/i.test(session.title)) {
        const cleaned = session.title
          .replace(/^(what is an|what is a|what is|tell me how to|tell me how|tell me|explain|how do i|how to|i want to|give me all the|give me|i want you to|what are the|what are)\s+/i, '')
          .replace(/\.\.\.$/, '')
          .trim();
        const words = cleaned.split(/\s+/);
        const newTitle = words.slice(0, 6).join(' ').replace(/[?.!]+$/, '');
        const formatted = newTitle ? (newTitle.charAt(0).toUpperCase() + newTitle.slice(1)) : session.title;
        if (formatted && formatted !== session.title && formatted.length > 1) {
          session.title = formatted;
          (db as any).antigravitySession.update({ where: { id: session.id }, data: { title: formatted } }).catch(() => {});
        }
      }
    }

    res.json(sessions);
  } catch (err: any) {
    console.error('[AntigravityRoutes] GET /sessions Error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch sessions' });
  }
});

// GET session details (including messages)
router.get('/sessions/:id', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const tenantId = req.tenantId!;
    const currentUserId = req.user?.uid;
    const isSuperAdmin = req.user?.isSuperAdmin;
    const { id } = req.params;

    const trashModel = (db as any).recyclingBinItem || (globalPrisma as any).recyclingBinItem;
    if (trashModel) {
      const isTrashed = await trashModel.findFirst({
        where: { tenantId, itemId: id, itemType: 'CHAT_SESSION' }
      }).catch(() => null);
      if (isTrashed) {
        return res.status(404).json({ error: 'Chat session is in recycling bin' });
      }
    }

    const session = await (db as any).antigravitySession.findUnique({
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

    if (!canUserAccessSession(session, currentUserId, isSuperAdmin)) {
      return res.status(403).json({ error: 'Access denied: You do not have permission to view this chat session' });
    }

    // Exclude any messages soft deleted in recycling bin
    if (session.messages && trashModel) {
      const trashedMsgItems = await trashModel.findMany({
        where: { tenantId, itemType: 'CHAT_MESSAGE' },
        select: { itemId: true }
      }).catch(() => []);
      const trashedMsgIds = new Set(trashedMsgItems.map((t: any) => t.itemId));
      if (trashedMsgIds.size > 0) {
        session.messages = session.messages.filter((m: any) => !trashedMsgIds.has(m.id));
      }
    }

    // Auto-heal truncated or default session title if messages exist
    if (session.messages.length > 0) {
      const isDefaultOrTruncated = session.title === 'New Vibe Chat' || 
                                    session.title.length <= 30 || 
                                    session.title.endsWith('...');
      if (isDefaultOrTruncated) {
        const firstUserMsg = session.messages.find((m: any) => m.role === 'user');
        if (firstUserMsg && firstUserMsg.content) {
          const smartTitle = await generateSmartSessionTitle(firstUserMsg.content);
          if (smartTitle && smartTitle !== session.title) {
            session.title = smartTitle;
            await (db as any).antigravitySession.update({
              where: { id: session.id },
              data: { title: smartTitle }
            }).catch(() => {});
          }
        }
      }
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
    const userId = req.user?.uid || null;
    const { title, isSharedWithTenant, sharedWithUserIds } = req.body;

    const session = await db.antigravitySession.create({
      data: {
        tenantId,
        userId,
        isSharedWithTenant: Boolean(isSharedWithTenant),
        sharedWithUserIds: Array.isArray(sharedWithUserIds) ? sharedWithUserIds : [],
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

// PATCH update session title, metadata, or share settings
router.patch('/sessions/:id', async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const { id } = req.params;
    const currentUserId = req.user?.uid;
    const isSuperAdmin = req.user?.isSuperAdmin;
    const { title, metadata, isSharedWithTenant, sharedWithUserIds } = req.body;

    const existing = await db.antigravitySession.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Permission check: only owner or super admin (or legacy session owner) can modify sharing settings or session title
    const isOwner = !existing.userId || existing.userId === currentUserId;
    if (!isOwner && !isSuperAdmin) {
      return res.status(403).json({ error: 'Only the chat owner can modify this chat session' });
    }

    const updated = await db.antigravitySession.update({
      where: { id },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(isSharedWithTenant !== undefined ? { isSharedWithTenant: Boolean(isSharedWithTenant) } : {}),
        ...(sharedWithUserIds !== undefined ? { sharedWithUserIds } : {}),
        ...(metadata !== undefined ? { metadata: { ...((existing.metadata as object) || {}), ...metadata } } : {})
      }
    });

    res.json(updated);
  } catch (err: any) {
    console.error('[AntigravityRoutes] PATCH /sessions/:id Error:', err);
    res.status(500).json({ error: err.message || 'Failed to update session' });
  }
});

// DELETE session (Soft-delete into Recycling Bin)
router.delete('/sessions/:id', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const tenantId = req.tenantId!;
    const currentUserId = req.user?.uid;
    const isSuperAdmin = req.user?.isSuperAdmin;
    const { id } = req.params;

    const session = await (db as any).antigravitySession.findUnique({
      where: { id },
      include: { messages: true }
    });

    if (!session) {
      return res.status(404).json({ error: 'Chat session not found' });
    }

    const isOwner = !session.userId || session.userId === currentUserId;
    if (!isOwner && !isSuperAdmin) {
      return res.status(403).json({ error: 'Only the chat owner can delete this session' });
    }

    const trashModel = (db as any).recyclingBinItem || (globalPrisma as any).recyclingBinItem;
    if (trashModel) {
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await trashModel.create({
        data: {
          tenantId,
          itemType: 'CHAT_SESSION',
          itemId: session.id,
          title: session.title || 'Chat Conversation',
          subtitle: `Chat Conversation • ${session.messages?.length || 0} messages`,
          payload: {
            id: session.id,
            title: session.title,
            metadata: session.metadata,
            messages: session.messages || []
          },
          deletedBy: (req as any).user?.email || 'User',
          deletedAt: new Date(),
          expiresAt
        }
      }).catch((e: any) => console.warn('[AntigravityRoutes] Soft-delete warning:', e.message));
      emitTenantUpdate(tenantId, 'recycling_bin_updated', { action: 'add', itemType: 'CHAT_SESSION', itemId: session.id });
    }

    // Delete messages first to satisfy foreign key constraints before deleting session
    await (db as any).antigravityMessage.deleteMany({
      where: { sessionId: id }
    }).catch((e: any) => console.warn('[AntigravityRoutes] Message deletion warning:', e.message));

    await (db as any).antigravitySession.delete({
      where: { id }
    });

    res.json({ success: true, message: 'Chat conversation moved to recycling bin' });
  } catch (err: any) {
    console.error('[AntigravityRoutes] DELETE /sessions/:id Error:', err);
    res.status(500).json({ error: err.message || 'Failed to delete session' });
  }
});

// DELETE individual message (Soft-delete into Recycling Bin)
router.delete('/sessions/:id/messages/:messageId', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const tenantId = req.tenantId!;
    const { id, messageId } = req.params;

    const message = await (db as any).antigravityMessage.findUnique({
      where: { id: messageId }
    });

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const trashModel = (db as any).recyclingBinItem || (globalPrisma as any).recyclingBinItem;
    if (trashModel) {
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const snippet = message.content ? (message.content.length > 50 ? message.content.slice(0, 50) + '...' : message.content) : 'Chat Message';
      await trashModel.create({
        data: {
          tenantId,
          itemType: 'CHAT_MESSAGE',
          itemId: message.id,
          title: snippet,
          subtitle: `Chat Message`,
          payload: {
            id: message.id,
            sessionId: id,
            role: message.role,
            content: message.content,
            steps: message.steps,
            promptTokens: message.promptTokens,
            completionTokens: message.completionTokens,
            model: message.model,
            provider: message.provider,
            isBYOK: message.isBYOK,
            keyHint: message.keyHint,
            createdAt: message.createdAt
          },
          deletedBy: (req as any).user?.email || 'User',
          deletedAt: new Date(),
          expiresAt
        }
      }).catch((e: any) => console.warn('[AntigravityRoutes] Soft-delete message warning:', e.message));
      emitTenantUpdate(tenantId, 'recycling_bin_updated', { action: 'add', itemType: 'CHAT_MESSAGE', itemId: message.id });
    }

    await (db as any).antigravityMessage.delete({
      where: { id: messageId }
    });

    res.json({ success: true, message: 'Message moved to recycling bin' });
  } catch (err: any) {
    console.error('[AntigravityRoutes] DELETE message Error:', err);
    res.status(500).json({ error: err.message || 'Failed to delete message' });
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

    // Update session title if default, initial message, or legacy truncated snippet
    const db = req.db!;
    const session = await db.antigravitySession.findUnique({
      where: { id },
      include: { messages: true }
    });
    if (session) {
      const isFirstMessage = session.messages.length <= 1;
      const isDefaultOrTruncated = session.title === 'New Vibe Chat' || 
                                    session.title.length <= 30 || 
                                    session.title.endsWith('...') ||
                                    /^(what is|tell me|give me|i want|explain|how do|what are)/i.test(session.title);

      if (isFirstMessage || isDefaultOrTruncated) {
        const summaryTitle = await generateSmartSessionTitle(message);
        await db.antigravitySession.update({
          where: { id },
          data: { title: summaryTitle }
        });
      }
    }

    res.json({ success: true, ...result });
  } catch (err: any) {
    console.error('[AntigravityRoutes] POST /sessions/:id/chat Error:', err);
    const errStr = typeof err === 'string' ? err : (err.message || JSON.stringify(err));
    let statusCode = 500;
    let code = "SERVICE_UNAVAILABLE";
    let title = "AI Provider Error";
    let message = "An error occurred while calling the AI provider.";

    if (errStr.includes('429') || errStr.includes('RESOURCE_EXHAUSTED') || errStr.includes('quota') || errStr.includes('rate limit')) {
      statusCode = 429;
      code = "RATE_LIMIT_EXCEEDED";
      title = "AI Quota Reached";
      message = "The AI is currently processing too many requests. Please wait a moment.";
    } else if (errStr.includes('401') || errStr.includes('403') || errStr.includes('key') || errStr.includes('unauthorized')) {
      statusCode = 401;
      code = "INVALID_KEY";
      title = "Invalid AI Gateway Key";
      message = "Your AI Gateway key is invalid or lacks proper permission.";
    }

    res.status(statusCode).json({
      success: false,
      error: {
        code,
        title,
        message,
        technical_details: errStr
      },
      provider: err.provider,
      model: err.model
    });
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

// ==========================================
// SCHEDULED TASKS API
// ==========================================

// GET all scheduled tasks for tenant
router.get('/scheduled-tasks', async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const tenantId = req.tenantId!;

    // Auto-heal stale running statuses older than 2 minutes
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    await (db as any).antigravityScheduledTask.updateMany({
      where: {
        tenantId,
        status: 'running',
        lastRunAt: { lt: twoMinutesAgo }
      },
      data: { status: 'idle' }
    });

    const tasks = await (db as any).antigravityScheduledTask.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' }
    });

    res.json(tasks);
  } catch (err: any) {
    console.error('[AntigravityRoutes] GET /scheduled-tasks Error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch scheduled tasks' });
  }
});

// POST create scheduled task
router.post('/scheduled-tasks', async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const tenantId = req.tenantId!;
    const { name, project, frequency, scheduleType, scheduleTime, cronExpression, runDate, startDate, endDate, prompt, model } = req.body;

    if (!name || !prompt) {
      return res.status(400).json({ error: 'Name and prompt are required' });
    }

    const userId = req.user?.uid || null;

    const newTask = await (db as any).antigravityScheduledTask.create({
      data: {
        tenantId,
        userId,
        name,
        project: project || 'aurora',
        frequency: frequency || 'Recurring',
        scheduleType: scheduleType || 'Daily',
        scheduleTime: scheduleTime || '9:00 AM',
        cronExpression: cronExpression || null,
        runDate: runDate || null,
        startDate: startDate || null,
        endDate: endDate || null,
        prompt,
        model: model || 'Flash',
        isActive: true,
        status: 'idle'
      }
    });

    res.json(newTask);
  } catch (err: any) {
    console.error('[AntigravityRoutes] POST /scheduled-tasks Error:', err);
    res.status(500).json({ error: err.message || 'Failed to create scheduled task' });
  }
});

// PATCH update scheduled task
router.patch('/scheduled-tasks/:id', async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const tenantId = req.tenantId!;
    const { id } = req.params;
    const updateData = { ...req.body };

    // Prevent parameter tampering of tenantId or primary key
    delete updateData.tenantId;
    delete updateData.id;

    const existing = await (db as any).antigravityScheduledTask.findFirst({
      where: { id, tenantId }
    });
    if (!existing) {
      return res.status(404).json({ error: 'Scheduled task not found' });
    }

    const updated = await (db as any).antigravityScheduledTask.update({
      where: { id },
      data: updateData
    });

    res.json(updated);
  } catch (err: any) {
    console.error('[AntigravityRoutes] PATCH /scheduled-tasks/:id Error:', err);
    res.status(500).json({ error: err.message || 'Failed to update scheduled task' });
  }
});

// POST trigger manual run for a scheduled task
router.post('/scheduled-tasks/:id/run', async (req: TenantRequest, res) => {
  try {
    const tenantId = req.tenantId!;
    const userId = req.user?.uid || (req as any).user?.id || 'system';
    const { id } = req.params;

// GET run history for a scheduled task
router.get('/scheduled-tasks/:id/history', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const tenantId = req.tenantId!;
    const { id } = req.params;

    const existing = await (db as any).antigravityScheduledTask.findFirst({
      where: { id, tenantId }
    });
    if (!existing) {
      return res.status(404).json({ error: 'Scheduled task not found' });
    }

    const sessions = await db.antigravitySession.findMany({
      where: {
        tenantId,
        metadata: {
          path: ['scheduledTaskId'],
          equals: id
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        title: true,
        metadata: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json(sessions);
  } catch (err: any) {
    console.error('[AntigravityRoutes] GET /scheduled-tasks/:id/history Error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch task run history' });
  }
});

// DELETE scheduled task
router.delete('/scheduled-tasks/:id', async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const tenantId = req.tenantId!;
    const { id } = req.params;

    const existing = await (db as any).antigravityScheduledTask.findFirst({
      where: { id, tenantId }
    });
    if (!existing) {
      return res.status(404).json({ error: 'Scheduled task not found' });
    }

    await (db as any).antigravityScheduledTask.delete({
      where: { id }
    });

    res.json({ success: true });
  } catch (err: any) {
    console.error('[AntigravityRoutes] DELETE /scheduled-tasks/:id Error:', err);
    res.status(500).json({ error: err.message || 'Failed to delete scheduled task' });
  }
});

export default router;
