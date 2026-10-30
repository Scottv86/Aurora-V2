import { API_BASE_URL } from '../config';
import { 
  UniversalCalculationItem, 
  CalculationTapeEntry, 
  CalculationMode,
  ModuleAggregateQuery,
  ModuleAggregateResult
} from '../types/calculations';

export interface CalculationFilters {
  authorId?: string;
  mode?: CalculationMode;
  moduleId?: string;
  recordId?: string;
  isPinned?: boolean;
  search?: string;
}

export interface CreateCalculationPayload {
  title?: string;
  mode?: CalculationMode;
  expression?: string;
  result?: string;
  tape?: CalculationTapeEntry[];
  variables?: Record<string, any>;
  notes?: string;
  isPinned?: boolean;
  moduleId?: string;
  recordId?: string;
  metadata?: any;
}

export class CalculationClientService {
  private static getHeaders(token?: string, tenantId?: string): HeadersInit {
    const effectiveToken = token || localStorage.getItem('aurora_token') || '';
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (effectiveToken && effectiveToken !== 'undefined') {
      headers['Authorization'] = `Bearer ${effectiveToken}`;
    }
    if (tenantId) {
      headers['x-tenant-id'] = tenantId;
    }
    return headers;
  }

  static async getCalculations(
    filters: CalculationFilters = {},
    token?: string,
    tenantId?: string
  ): Promise<UniversalCalculationItem[]> {
    const query = new URLSearchParams();
    if (filters.authorId) query.set('authorId', filters.authorId);
    if (filters.mode) query.set('mode', filters.mode);
    if (filters.moduleId) query.set('moduleId', filters.moduleId);
    if (filters.recordId) query.set('recordId', filters.recordId);
    if (filters.isPinned !== undefined) query.set('isPinned', String(filters.isPinned));
    if (filters.search) query.set('search', filters.search);

    const res = await fetch(`${API_BASE_URL}/api/calculations?${query.toString()}`, {
      headers: this.getHeaders(token, tenantId),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  static async getCalculationById(
    id: string,
    token?: string,
    tenantId?: string
  ): Promise<UniversalCalculationItem> {
    const res = await fetch(`${API_BASE_URL}/api/calculations/${id}`, {
      headers: this.getHeaders(token, tenantId),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  static async createCalculation(
    payload: CreateCalculationPayload,
    token?: string,
    tenantId?: string
  ): Promise<UniversalCalculationItem> {
    const res = await fetch(`${API_BASE_URL}/api/calculations`, {
      method: 'POST',
      headers: this.getHeaders(token, tenantId),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  static async updateCalculation(
    id: string,
    payload: Partial<CreateCalculationPayload>,
    token?: string,
    tenantId?: string
  ): Promise<UniversalCalculationItem> {
    const res = await fetch(`${API_BASE_URL}/api/calculations/${id}`, {
      method: 'PATCH',
      headers: this.getHeaders(token, tenantId),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  static async deleteCalculation(
    id: string,
    token?: string,
    tenantId?: string
  ): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/calculations/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(token, tenantId),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  }

  static async appendTapeEntry(
    id: string,
    entry: { expression: string; result: string; mode?: CalculationMode; variables?: Record<string, any> },
    token?: string,
    tenantId?: string
  ): Promise<UniversalCalculationItem> {
    const res = await fetch(`${API_BASE_URL}/api/calculations/${id}/tape`, {
      method: 'POST',
      headers: this.getHeaders(token, tenantId),
      body: JSON.stringify(entry),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  static async clearTape(
    id: string,
    token?: string,
    tenantId?: string
  ): Promise<UniversalCalculationItem> {
    const res = await fetch(`${API_BASE_URL}/api/calculations/${id}/tape`, {
      method: 'DELETE',
      headers: this.getHeaders(token, tenantId),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  static async computeAggregate(
    query: ModuleAggregateQuery,
    token?: string,
    tenantId?: string
  ): Promise<ModuleAggregateResult> {
    const res = await fetch(`${API_BASE_URL}/api/calculations/aggregate`, {
      method: 'POST',
      headers: this.getHeaders(token, tenantId),
      body: JSON.stringify(query),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }
}
