import express from 'express';
import { TenantRequest } from '../middleware/tenantMiddleware';
import { authorize } from '../middleware/authorize';
import { logRecordActivity } from '../lib/audit';

const router = express.Router();

// Helper to normalize and hydrate audit log entries
function formatLogEntry(log: any, memberMap: Map<string, any>) {
  const newVal = (log.newValue || {}) as any;
  const oldVal = (log.oldValue || {}) as any;

  // Actor resolution fallback
  let actor = newVal.actor;
  if (!actor || !actor.name || actor.name === 'System') {
    const member = memberMap.get(log.actorId);
    if (member) {
      actor = {
        id: member.id,
        name: `${member.firstName || ''} ${member.familyName || ''}`.trim() || member.workEmail || 'Tenant Member',
        email: member.workEmail || member.personalEmail || '',
        avatarUrl: member.avatarUrl,
        role: member.roleId,
        type: member.isSynthetic ? 'AI_AGENT' : 'USER'
      };
    } else {
      actor = {
        id: log.actorId,
        name: log.actorId === 'system' ? 'System Workflow' : 'User',
        email: '',
        type: log.actorId === 'system' ? 'SYSTEM' : 'USER'
      };
    }
  }

  return {
    id: log.id,
    tenantId: log.tenantId,
    timestamp: log.timestamp ? log.timestamp.toISOString() : new Date().toISOString(),
    action: log.action,
    category: newVal.category || (log.action.includes('STATUS') ? 'STATUS' : log.action.includes('ASSIGN') ? 'ASSIGNMENT' : log.action.includes('CREATED') ? 'CREATION' : 'FIELD'),
    resourceId: log.resourceId,
    moduleId: newVal.moduleId,
    moduleName: newVal.moduleName,
    resourceKey: newVal.resourceKey,
    resourceTitle: newVal.resourceTitle,
    actor,
    changes: newVal.changes || [],
    metadata: newVal.metadata || {},
    description: newVal.description || `${log.action} on ${newVal.resourceKey || log.resourceId}`,
    oldValue: oldVal.payload || oldVal,
    newValue: newVal.payload || newVal
  };
}

// 1. Tenant-Wide Activity Feed (for Workspace 'Feed' App)
router.get('/feed', async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const tenantId = req.tenantId!;
    const {
      moduleId,
      actorId,
      category,
      search,
      order = 'desc',
      limit = '50',
      cursor
    } = req.query as Record<string, string>;

    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);
    const sortOrder = order === 'asc' ? 'asc' : 'desc';

    const where: any = {
      tenantId
    };

    if (actorId) {
      where.actorId = actorId;
    }

    if (cursor) {
      where.timestamp = sortOrder === 'desc' 
        ? { lt: new Date(cursor) } 
        : { gt: new Date(cursor) };
    }

    const rawLogs = await db.auditLog.findMany({
      where,
      orderBy: { timestamp: sortOrder },
      take: parsedLimit * 2 // Take extra to account for in-memory category/module filtering
    });

    // Hydrate members in batch
    const actorIds = [...new Set(rawLogs.map((l: any) => l.actorId).filter(Boolean))];
    const members = actorIds.length > 0 ? await db.tenantMember.findMany({
      where: {
        id: { in: actorIds }
      }
    }) : [];

    const memberMap = new Map<string, any>();
    members.forEach((m: any) => memberMap.set(m.id, m));

    let events = rawLogs.map((l: any) => formatLogEntry(l, memberMap));

    // Filter by moduleId if specified
    if (moduleId && moduleId !== 'all') {
      events = events.filter((e: any) => e.moduleId === moduleId);
    }

    // Filter by category if specified
    if (category && category !== 'all') {
      events = events.filter((e: any) => e.category?.toLowerCase() === category.toLowerCase());
    }

    // Filter by search keyword
    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      events = events.filter((e: any) => 
        e.description?.toLowerCase().includes(q) ||
        e.resourceKey?.toLowerCase().includes(q) ||
        e.resourceTitle?.toLowerCase().includes(q) ||
        e.moduleName?.toLowerCase().includes(q) ||
        e.actor?.name?.toLowerCase().includes(q) ||
        (e.changes || []).some((c: any) => 
          c.fieldLabel?.toLowerCase().includes(q) || 
          String(c.newValue)?.toLowerCase().includes(q) || 
          String(c.oldValue)?.toLowerCase().includes(q)
        )
      );
    }

    const pagedEvents = events.slice(0, parsedLimit);
    const nextCursor = pagedEvents.length === parsedLimit 
      ? pagedEvents[pagedEvents.length - 1].timestamp 
      : null;

    res.json({
      events: pagedEvents,
      nextCursor,
      totalCount: pagedEvents.length
    });
  } catch (err: any) {
    console.error('[AuditRoutes /feed error]:', err);
    res.status(500).json({ error: err.message });
  }
});

// 2. Platform-wide high-level admin logs
router.get('/', authorize('view:audit_logs'), async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const logs = await db.auditLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: 100
    });

    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Record-scoped Activity Feed
router.get('/:resourceId', async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const { resourceId } = req.params;
    const { order = 'desc', category, limit = '100' } = req.query as Record<string, string>;

    const sortOrder = order === 'asc' ? 'asc' : 'desc';
    const take = Math.min(Math.max(parseInt(limit, 10) || 100, 1), 200);

    const logs = await db.auditLog.findMany({
      where: { resourceId },
      orderBy: { timestamp: sortOrder },
      take
    });

    // Hydrate actors
    const actorIds = [...new Set(logs.map((l: any) => l.actorId).filter(Boolean))];
    const members = actorIds.length > 0 ? await db.tenantMember.findMany({
      where: { id: { in: actorIds } }
    }) : [];

    const memberMap = new Map<string, any>();
    members.forEach((m: any) => memberMap.set(m.id, m));

    let events = logs.map((l: any) => formatLogEntry(l, memberMap));

    if (category && category !== 'all') {
      events = events.filter((e: any) => e.category?.toLowerCase() === category.toLowerCase());
    }

    res.json(events);
  } catch (err: any) {
    console.error('[AuditRoutes /:resourceId error]:', err);
    res.status(500).json({ error: err.message });
  }
});

// 4. Post Timeline Comment to a Record's Activity Feed
router.post('/:resourceId/comments', async (req: TenantRequest, res) => {
  try {
    const tenantId = req.tenantId!;
    const { resourceId } = req.params;
    const { comment, moduleId, moduleName, resourceKey, resourceTitle } = req.body;

    if (!comment || !comment.trim()) {
      return res.status(400).json({ error: 'Comment text is required' });
    }

    const actorId = req.user?.memberId || req.user?.id || req.user?.uid || 'user';
    const actorName = req.user?.name || req.user?.email || 'User';

    const entry = await logRecordActivity({
      tenantId,
      actorId,
      actor: {
        id: actorId,
        name: actorName,
        email: req.user?.email || '',
        avatarUrl: req.user?.avatarUrl,
        type: 'USER'
      },
      action: 'COMMENT_ADDED',
      category: 'COMMENT',
      resourceId,
      moduleId,
      moduleName,
      resourceKey,
      resourceTitle,
      description: `${actorName} commented: "${comment.trim()}"`,
      metadata: {
        comment: comment.trim(),
        source: 'DIRECT_UI'
      }
    });

    res.status(201).json(entry);
  } catch (err: any) {
    console.error('[AuditRoutes POST comment error]:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
