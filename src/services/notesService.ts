import { API_BASE_URL } from '../config';
import { UniversalNote, CreateNotePayload, NoteFilters } from '../types/notes';

export class NotesClientService {
  private static getHeaders(token?: string, tenantId?: string): HeadersInit {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (tenantId) headers['x-tenant-id'] = tenantId;
    return headers;
  }

  static async getNotes(
    filters: NoteFilters = {},
    token?: string,
    tenantId?: string
  ): Promise<UniversalNote[]> {
    const query = new URLSearchParams();
    if (filters.moduleId) query.set('moduleId', filters.moduleId);
    if (filters.recordId) query.set('recordId', filters.recordId);
    if (filters.isPinned !== undefined) query.set('isPinned', String(filters.isPinned));
    if (filters.isPersonal !== undefined) query.set('isPersonal', String(filters.isPersonal));
    if (filters.tag) query.set('tag', filters.tag);
    if (filters.search) query.set('search', filters.search);

    const res = await fetch(`${API_BASE_URL}/api/notes?${query.toString()}`, {
      headers: this.getHeaders(token, tenantId),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  static async getNoteById(id: string, token?: string, tenantId?: string): Promise<UniversalNote> {
    const res = await fetch(`${API_BASE_URL}/api/notes/${id}`, {
      headers: this.getHeaders(token, tenantId),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  static async createNote(
    payload: CreateNotePayload,
    token?: string,
    tenantId?: string
  ): Promise<UniversalNote> {
    const res = await fetch(`${API_BASE_URL}/api/notes`, {
      method: 'POST',
      headers: this.getHeaders(token, tenantId),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  static async updateNote(
    id: string,
    payload: Partial<CreateNotePayload>,
    token?: string,
    tenantId?: string
  ): Promise<UniversalNote> {
    const res = await fetch(`${API_BASE_URL}/api/notes/${id}`, {
      method: 'PATCH',
      headers: this.getHeaders(token, tenantId),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  static async togglePin(id: string, token?: string, tenantId?: string): Promise<{ success: boolean; isPinned: boolean }> {
    const res = await fetch(`${API_BASE_URL}/api/notes/${id}/pin`, {
      method: 'POST',
      headers: this.getHeaders(token, tenantId),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  static async deleteNote(id: string, token?: string, tenantId?: string): Promise<boolean> {
    const res = await fetch(`${API_BASE_URL}/api/notes/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(token, tenantId),
    });
    return res.ok;
  }
}
