export interface UniversalNote {
  id: string;
  tenantId: string;
  authorId: string;
  authorName?: string;
  authorEmail?: string;
  authorAvatar?: string;
  lastEditedById?: string;
  lastEditedByName?: string;
  lastEditedByAvatar?: string;
  lastEditedAt?: string;
  title?: string;
  body: string;
  snippet?: string;
  color: 'zinc' | 'yellow' | 'blue' | 'emerald' | 'purple' | 'rose' | 'amber';
  isPinned: boolean;
  isArchived: boolean;
  isPersonal: boolean;
  tags: string[];
  mentions: string[];
  metadata?: any;
  moduleId?: string;
  recordId?: string;
  entityType?: string;
  entityId?: string;
  createdAt: string;
  updatedAt: string;
  module?: {
    id: string;
    name: string;
    icon?: string;
  };
  record?: {
    id: string;
    status?: string;
    data?: any;
  };
}

export interface CreateNotePayload {
  authorId?: string;
  authorName?: string;
  authorEmail?: string;
  authorAvatar?: string;
  lastEditedById?: string;
  lastEditedByName?: string;
  lastEditedByAvatar?: string;
  lastEditedAt?: string;
  title?: string;
  body: string;
  snippet?: string;
  color?: string;
  isPinned?: boolean;
  isPersonal?: boolean;
  tags?: string[];
  mentions?: string[];
  metadata?: any;
  moduleId?: string;
  recordId?: string;
  entityType?: string;
  entityId?: string;
}

export interface NoteFilters {
  moduleId?: string;
  recordId?: string;
  isPinned?: boolean;
  isPersonal?: boolean;
  tag?: string;
  search?: string;
}
