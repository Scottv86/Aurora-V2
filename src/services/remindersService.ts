import { API_BASE_URL } from '../config';
import { UniversalReminder, CreateReminderPayload, ReminderSmartView } from '../types/reminders';

export class RemindersClientService {
  private static getHeaders(token?: string, tenantId?: string): HeadersInit {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (tenantId) headers['x-tenant-id'] = tenantId;
    return headers;
  }

  static async getReminders(
    params: {
      view?: ReminderSmartView;
      moduleId?: string;
      recordId?: string;
      status?: string;
      search?: string;
    } = {},
    token?: string,
    tenantId?: string
  ): Promise<UniversalReminder[]> {
    const query = new URLSearchParams();
    if (params.view) query.set('view', params.view);
    if (params.moduleId) query.set('moduleId', params.moduleId);
    if (params.recordId) query.set('recordId', params.recordId);
    if (params.status) query.set('status', params.status);
    if (params.search) query.set('search', params.search);

    const res = await fetch(`${API_BASE_URL}/api/reminders?${query.toString()}`, {
      headers: this.getHeaders(token, tenantId),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  static async getReminderById(id: string, token?: string, tenantId?: string): Promise<UniversalReminder> {
    const res = await fetch(`${API_BASE_URL}/api/reminders/${id}`, {
      headers: this.getHeaders(token, tenantId),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  static async createReminder(
    payload: CreateReminderPayload,
    token?: string,
    tenantId?: string
  ): Promise<UniversalReminder> {
    const res = await fetch(`${API_BASE_URL}/api/reminders`, {
      method: 'POST',
      headers: this.getHeaders(token, tenantId),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  static async updateReminder(
    id: string,
    payload: Partial<CreateReminderPayload>,
    token?: string,
    tenantId?: string
  ): Promise<UniversalReminder> {
    const res = await fetch(`${API_BASE_URL}/api/reminders/${id}`, {
      method: 'PATCH',
      headers: this.getHeaders(token, tenantId),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  static async toggleComplete(id: string, token?: string, tenantId?: string): Promise<UniversalReminder> {
    const res = await fetch(`${API_BASE_URL}/api/reminders/${id}/complete`, {
      method: 'POST',
      headers: this.getHeaders(token, tenantId),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  static async snoozeReminder(
    id: string,
    minutes: number = 15,
    token?: string,
    tenantId?: string
  ): Promise<UniversalReminder> {
    const res = await fetch(`${API_BASE_URL}/api/reminders/${id}/snooze`, {
      method: 'POST',
      headers: this.getHeaders(token, tenantId),
      body: JSON.stringify({ minutes }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  static async deleteReminder(id: string, token?: string, tenantId?: string): Promise<boolean> {
    const res = await fetch(`${API_BASE_URL}/api/reminders/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(token, tenantId),
    });
    return res.ok;
  }
}
