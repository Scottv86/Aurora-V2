import { Router, Response } from 'express';
import { TenantRequest } from '../middleware/tenantMiddleware';
import { NotesService } from '../services/notesService';
import { globalPrisma } from '../lib/prisma';

const router = Router();

// GET /api/notes - Query notes
router.get('/', async (req: TenantRequest, res: Response) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) return res.status(400).json({ error: 'Tenant context required' });

    const {
      authorId,
      moduleId,
      recordId,
      entityType,
      entityId,
      isPinned,
      isPersonal,
      tag,
      search,
      limit,
      offset
    } = req.query;

    const notes = await NotesService.getNotes(tenantId, {
      authorId: authorId as string,
      moduleId: moduleId as string,
      recordId: recordId as string,
      entityType: entityType as string,
      entityId: entityId as string,
      isPinned: isPinned !== undefined ? isPinned === 'true' : undefined,
      isPersonal: isPersonal !== undefined ? isPersonal === 'true' : undefined,
      tag: tag as string,
      search: search as string,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });

    res.json(notes);
  } catch (err: any) {
    console.error('[NotesAPI] GET / error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch notes' });
  }
});

// GET /api/notes/:id - Single note
router.get('/:id', async (req: TenantRequest, res: Response) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) return res.status(400).json({ error: 'Tenant context required' });

    const note = await NotesService.getNoteById(tenantId, req.params.id);
    if (!note) return res.status(404).json({ error: 'Note not found' });

    res.json(note);
  } catch (err: any) {
    console.error('[NotesAPI] GET /:id error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch note' });
  }
});

// POST /api/notes - Create note
router.post('/', async (req: any, res: Response) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) return res.status(400).json({ error: 'Tenant context required' });

    const user = req.user || {};
    let authorId = req.body.authorId || user.memberId || user.id || user.uid || 'anonymous';
    let authorName = req.body.authorName || user.name || user.email?.split('@')[0] || 'User';
    let authorEmail = req.body.authorEmail || user.email;
    let authorAvatar = req.body.authorAvatar || user.avatarUrl;

    if (!authorAvatar && tenantId) {
      try {
        const member = await globalPrisma.tenantMember.findFirst({
          where: {
            tenantId,
            OR: [
              ...(authorId && authorId !== 'anonymous' ? [{ id: authorId }, { userId: authorId }] : []),
              ...(user.id ? [{ userId: user.id }] : []),
              ...(authorEmail ? [{ workEmail: authorEmail }, { personalEmail: authorEmail }] : []),
              ...(authorName ? [{ firstName: authorName.split(' ')[0] }] : [])
            ]
          },
          select: { avatarUrl: true, firstName: true, familyName: true, workEmail: true, id: true }
        });
        if (member) {
          if (member.avatarUrl) authorAvatar = member.avatarUrl;
          if ((!authorName || authorName === 'User') && (member.firstName || member.familyName)) {
            authorName = `${member.firstName || ''} ${member.familyName || ''}`.trim();
          }
          if (!authorEmail && member.workEmail) authorEmail = member.workEmail;
        }
      } catch (lookupErr) {
        // non-blocking
      }
    }

    const body = req.body.body ?? '';

    const note = await NotesService.createNote(tenantId, {
      ...req.body,
      body,
      authorId,
      authorName,
      authorEmail,
      authorAvatar,
    });

    res.status(201).json(note);
  } catch (err: any) {
    console.error('[NotesAPI] POST / error:', err);
    res.status(500).json({ error: err.message || 'Failed to create note' });
  }
});

// PATCH /api/notes/:id - Update note
router.patch('/:id', async (req: any, res: Response) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) return res.status(400).json({ error: 'Tenant context required' });

    const user = req.user || {};
    let lastEditedById = req.body.lastEditedById || user.memberId || user.id || user.uid || 'anonymous';
    let lastEditedByName = req.body.lastEditedByName || user.name || user.email?.split('@')[0] || 'User';
    let lastEditedByAvatar = req.body.lastEditedByAvatar || user.avatarUrl;

    if (!lastEditedByAvatar && tenantId) {
      try {
        const member = await globalPrisma.tenantMember.findFirst({
          where: {
            tenantId,
            OR: [
              ...(lastEditedById && lastEditedById !== 'anonymous' ? [{ id: lastEditedById }, { userId: lastEditedById }] : []),
              ...(user.id ? [{ userId: user.id }] : []),
              ...(lastEditedByName ? [{ firstName: lastEditedByName.split(' ')[0] }] : [])
            ]
          },
          select: { avatarUrl: true, firstName: true, familyName: true }
        });
        if (member) {
          if (member.avatarUrl) lastEditedByAvatar = member.avatarUrl;
          if ((!lastEditedByName || lastEditedByName === 'User') && (member.firstName || member.familyName)) {
            lastEditedByName = `${member.firstName || ''} ${member.familyName || ''}`.trim();
          }
        }
      } catch (lookupErr) {
        // non-blocking
      }
    }

    const existingNote = await NotesService.getNoteById(tenantId, req.params.id);
    const existingMetadata = (existingNote?.metadata as any) || {};

    const updatedMetadata = {
      ...existingMetadata,
      ...(req.body.metadata || {}),
      lastEditedById,
      lastEditedByName,
      lastEditedByAvatar,
      lastEditedAt: new Date().toISOString()
    };

    const updatePayload: any = {
      ...req.body,
      metadata: updatedMetadata,
      lastEditedById,
      lastEditedByName,
      lastEditedByAvatar,
      lastEditedAt: updatedMetadata.lastEditedAt
    };

    await NotesService.updateNote(tenantId, req.params.id, updatePayload);
    const updated = await NotesService.getNoteById(tenantId, req.params.id);
    res.json(updated);
  } catch (err: any) {
    console.error('[NotesAPI] PATCH /:id error:', err);
    res.status(500).json({ error: err.message || 'Failed to update note' });
  }
});

// POST /api/notes/:id/pin - Toggle pin
router.post('/:id/pin', async (req: TenantRequest, res: Response) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) return res.status(400).json({ error: 'Tenant context required' });

    const result = await NotesService.togglePin(tenantId, req.params.id);
    res.json(result);
  } catch (err: any) {
    console.error('[NotesAPI] POST /:id/pin error:', err);
    res.status(500).json({ error: err.message || 'Failed to toggle pin' });
  }
});

// DELETE /api/notes/:id - Delete note
router.delete('/:id', async (req: TenantRequest, res: Response) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) return res.status(400).json({ error: 'Tenant context required' });

    await NotesService.deleteNote(tenantId, req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    console.error('[NotesAPI] DELETE /:id error:', err);
    res.status(500).json({ error: err.message || 'Failed to delete note' });
  }
});

export default router;
