import { globalPrisma } from '../lib/prisma';

export interface CreateNoteInput {
  authorId: string;
  authorName?: string;
  authorEmail?: string;
  authorAvatar?: string;
  title?: string;
  body: string;
  snippet?: string;
  color?: string;
  isPinned?: boolean;
  isArchived?: boolean;
  isPersonal?: boolean;
  tags?: string[];
  mentions?: string[];
  metadata?: any;
  moduleId?: string;
  recordId?: string;
  entityType?: string;
  entityId?: string;
}

export interface UpdateNoteInput {
  title?: string;
  body?: string;
  snippet?: string;
  color?: string;
  isPinned?: boolean;
  isArchived?: boolean;
  isPersonal?: boolean;
  tags?: string[];
  mentions?: string[];
  metadata?: any;
}

export class NotesService {
  /**
   * Fetch notes with flexible polymorphic filters and full-text search
   */
  static async getNotes(
    tenantId: string,
    params: {
      authorId?: string;
      moduleId?: string;
      recordId?: string;
      entityType?: string;
      entityId?: string;
      isPinned?: boolean;
      isPersonal?: boolean;
      tag?: string;
      search?: string;
      limit?: number;
      offset?: number;
    } = {}
  ) {
    const where: any = {
      tenantId,
      isArchived: false,
    };

    if (params.authorId) where.authorId = params.authorId;
    if (params.moduleId) where.moduleId = params.moduleId;
    if (params.recordId) where.recordId = params.recordId;
    if (params.entityType) where.entityType = params.entityType;
    if (params.entityId) where.entityId = params.entityId;
    if (typeof params.isPinned === 'boolean') where.isPinned = params.isPinned;
    if (typeof params.isPersonal === 'boolean') where.isPersonal = params.isPersonal;

    if (params.search && params.search.trim()) {
      const q = params.search.trim();
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { body: { contains: q, mode: 'insensitive' } },
        { snippet: { contains: q, mode: 'insensitive' } },
      ];
    }

    const notes = await (globalPrisma as any).universalNote.findMany({
      where,
      orderBy: [
        { isPinned: 'desc' },
        { updatedAt: 'desc' },
      ],
      take: params.limit || 100,
      skip: params.offset || 0,
      include: {
        module: {
          select: { id: true, name: true, icon: true },
        },
        record: {
          select: { id: true, status: true, data: true },
        },
      },
    });

    const formatted = notes.map((n: any) => NotesService.formatNote(n));

    if (params.tag) {
      const tagLower = params.tag.toLowerCase();
      return formatted.filter((n: any) => {
        const tags = Array.isArray(n.tags) ? n.tags : [];
        return tags.some((t: string) => t.toLowerCase() === tagLower || t.toLowerCase() === `#${tagLower}`);
      });
    }

    return formatted;
  }

  static formatNote(n: any) {
    if (!n) return n;
    const meta = n.metadata && typeof n.metadata === 'object' ? n.metadata : {};
    return {
      ...n,
      lastEditedById: n.lastEditedById || meta.lastEditedById || null,
      lastEditedByName: n.lastEditedByName || meta.lastEditedByName || null,
      lastEditedByAvatar: n.lastEditedByAvatar || meta.lastEditedByAvatar || null,
      lastEditedAt: n.lastEditedAt || meta.lastEditedAt || null,
    };
  }

  static async getNoteById(tenantId: string, id: string) {
    const note = await (globalPrisma as any).universalNote.findFirst({
      where: { id, tenantId },
      include: {
        module: {
          select: { id: true, name: true, icon: true },
        },
        record: {
          select: { id: true, status: true, data: true },
        },
      },
    });
    return this.formatNote(note);
  }

  static async createNote(tenantId: string, input: CreateNoteInput) {
    const body = input.body ?? '';
    const snippet = input.snippet || body.replace(/<[^>]+>/g, '').slice(0, 200).trim();

    const created = await (globalPrisma as any).universalNote.create({
      data: {
        tenantId,
        authorId: input.authorId,
        authorName: input.authorName || 'User',
        authorEmail: input.authorEmail,
        authorAvatar: input.authorAvatar,
        title: input.title || null,
        body,
        snippet,
        color: input.color || 'zinc',
        isPinned: Boolean(input.isPinned),
        isArchived: false,
        isPersonal: Boolean(input.isPersonal),
        tags: input.tags || [],
        mentions: input.mentions || [],
        metadata: input.metadata || null,
        moduleId: input.moduleId || null,
        recordId: input.recordId || null,
        entityType: input.entityType || (input.recordId ? 'RECORD' : null),
        entityId: input.entityId || input.recordId || null,
      },
      include: {
        module: { select: { id: true, name: true, icon: true } },
        record: { select: { id: true, status: true, data: true } },
      },
    });

    return this.formatNote(created);
  }

  static async updateNote(tenantId: string, id: string, input: UpdateNoteInput) {
    const data: any = { ...input };
    if (input.body !== undefined && !input.snippet) {
      data.snippet = input.body.replace(/<[^>]+>/g, '').slice(0, 200).trim();
    }

    delete data.lastEditedById;
    delete data.lastEditedByName;
    delete data.lastEditedByAvatar;
    delete data.lastEditedAt;

    return (globalPrisma as any).universalNote.updateMany({
      where: { id, tenantId },
      data,
    });
  }

  static async togglePin(tenantId: string, id: string) {
    const existing = await this.getNoteById(tenantId, id);
    if (!existing) throw new Error('Note not found');

    await (globalPrisma as any).universalNote.update({
      where: { id },
      data: { isPinned: !existing.isPinned },
    });

    return { success: true, isPinned: !existing.isPinned };
  }

  static async deleteNote(tenantId: string, id: string) {
    return (globalPrisma as any).universalNote.deleteMany({
      where: { id, tenantId },
    });
  }
}
