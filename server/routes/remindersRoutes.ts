import { Router, Response } from 'express';
import { TenantRequest } from '../middleware/tenantMiddleware';
import { RemindersService } from '../services/remindersService';

const router = Router();

// GET /api/reminders - Query reminders
router.get('/', async (req: TenantRequest, res: Response) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) return res.status(400).json({ error: 'Tenant context required' });

    const {
      assignedToId,
      moduleId,
      recordId,
      entityType,
      entityId,
      status,
      view,
      priority,
      search,
      limit,
      offset
    } = req.query;

    const reminders = await RemindersService.getReminders(tenantId, {
      assignedToId: assignedToId as string,
      moduleId: moduleId as string,
      recordId: recordId as string,
      entityType: entityType as string,
      entityId: entityId as string,
      status: status as string,
      view: view as any,
      priority: priority as string,
      search: search as string,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });

    res.json(reminders);
  } catch (err: any) {
    console.error('[RemindersAPI] GET / error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch reminders' });
  }
});

// GET /api/reminders/:id - Single reminder
router.get('/:id', async (req: TenantRequest, res: Response) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) return res.status(400).json({ error: 'Tenant context required' });

    const reminder = await RemindersService.getReminderById(tenantId, req.params.id);
    if (!reminder) return res.status(404).json({ error: 'Reminder not found' });

    res.json(reminder);
  } catch (err: any) {
    console.error('[RemindersAPI] GET /:id error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch reminder' });
  }
});

// POST /api/reminders - Create reminder
router.post('/', async (req: any, res: Response) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) return res.status(400).json({ error: 'Tenant context required' });

    const user = req.user || {};
    const createdById = user.memberId || user.id || user.uid || 'user';
    const createdByName = user.name || user.email?.split('@')[0] || 'User';

    const assignedToId = req.body.assignedToId || createdById;
    const assignedToName = req.body.assignedToName || createdByName;
    const assignedToEmail = req.body.assignedToEmail || user.email;
    const assignedToAvatar = req.body.assignedToAvatar || user.avatarUrl;

    if (!req.body.title || !req.body.title.trim()) {
      return res.status(400).json({ error: 'Reminder title is required' });
    }
    if (!req.body.dueAt) {
      return res.status(400).json({ error: 'dueAt timestamp is required' });
    }

    const reminder = await RemindersService.createReminder(tenantId, {
      ...req.body,
      createdById,
      createdByName,
      assignedToId,
      assignedToName,
      assignedToEmail,
      assignedToAvatar,
    });

    res.status(201).json(reminder);
  } catch (err: any) {
    console.error('[RemindersAPI] POST / error:', err);
    res.status(500).json({ error: err.message || 'Failed to create reminder' });
  }
});

// PATCH /api/reminders/:id - Update reminder
router.patch('/:id', async (req: TenantRequest, res: Response) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) return res.status(400).json({ error: 'Tenant context required' });

    const updated = await RemindersService.updateReminder(tenantId, req.params.id, req.body);
    res.json(updated);
  } catch (err: any) {
    console.error('[RemindersAPI] PATCH /:id error:', err);
    res.status(500).json({ error: err.message || 'Failed to update reminder' });
  }
});

// POST /api/reminders/:id/complete - Toggle completion
router.post('/:id/complete', async (req: TenantRequest, res: Response) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) return res.status(400).json({ error: 'Tenant context required' });

    const updated = await RemindersService.toggleComplete(tenantId, req.params.id);
    res.json(updated);
  } catch (err: any) {
    console.error('[RemindersAPI] POST /:id/complete error:', err);
    res.status(500).json({ error: err.message || 'Failed to toggle complete' });
  }
});

// POST /api/reminders/:id/snooze - Snooze reminder
router.post('/:id/snooze', async (req: TenantRequest, res: Response) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) return res.status(400).json({ error: 'Tenant context required' });

    const minutes = req.body.minutes ? Number(req.body.minutes) : 15;
    const updated = await RemindersService.snoozeReminder(tenantId, req.params.id, minutes);
    res.json(updated);
  } catch (err: any) {
    console.error('[RemindersAPI] POST /:id/snooze error:', err);
    res.status(500).json({ error: err.message || 'Failed to snooze reminder' });
  }
});

// DELETE /api/reminders/:id - Delete reminder
router.delete('/:id', async (req: TenantRequest, res: Response) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) return res.status(400).json({ error: 'Tenant context required' });

    const result = await RemindersService.deleteReminder(tenantId, req.params.id);
    res.json(result);
  } catch (err: any) {
    console.error('[RemindersAPI] DELETE /:id error:', err);
    res.status(500).json({ error: err.message || 'Failed to delete reminder' });
  }
});

export default router;
