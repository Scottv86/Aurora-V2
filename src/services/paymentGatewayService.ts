import { API_BASE_URL } from '../config';

export interface ProviderPreset {
  id: string;
  name: string;
  category: 'ONLINE' | 'TERMINAL' | 'OMNICHANNEL';
  description: string;
  badge: string;
  fields: Array<{ key: string; label: string; placeholder: string; isSecret?: boolean }>;
}

export interface PaymentGatewayConnection {
  id: string;
  tenantId: string;
  provider: string;
  displayName: string;
  isDefault: boolean;
  isEnabled: boolean;
  isTestMode: boolean;
  enableForPos: boolean;
  enableForInvoice: boolean;
  enableForPortal: boolean;
  credentials: Record<string, any>;
  lastHealthCheck?: string | null;
  healthStatus: string;
  lastError?: string | null;
  createdAt: string;
  updatedAt: string;
}

const getHeaders = (tenantId?: string) => {
  const token = localStorage.getItem('aurora_token') || (import.meta as any).env.VITE_DEV_TOKEN || '';
  const currentTenant = tenantId || localStorage.getItem('aurora_tenant_id') || '';
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    'x-tenant-id': currentTenant
  };
};

export const PaymentGatewayClientService = {
  async listPresets(tenantId?: string): Promise<ProviderPreset[]> {
    const res = await fetch(`${API_BASE_URL}/api/payment-gateways/presets`, {
      headers: getHeaders(tenantId)
    });
    if (!res.ok) throw new Error('Failed to load gateway presets');
    return await res.json();
  },

  async listConnections(tenantId?: string): Promise<PaymentGatewayConnection[]> {
    const res = await fetch(`${API_BASE_URL}/api/payment-gateways/connections`, {
      headers: getHeaders(tenantId)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to list payment gateways');
    }
    return await res.json();
  },

  async saveConnection(data: Partial<PaymentGatewayConnection>, tenantId?: string): Promise<PaymentGatewayConnection> {
    const res = await fetch(`${API_BASE_URL}/api/payment-gateways/connections`, {
      method: 'POST',
      headers: getHeaders(tenantId),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to save payment gateway');
    }
    return await res.json();
  },

  async deleteConnection(id: string, tenantId?: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/payment-gateways/connections/${id}`, {
      method: 'DELETE',
      headers: getHeaders(tenantId)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to delete payment gateway');
    }
  },

  async testConnection(payload: {
    provider: string;
    credentials: Record<string, any>;
    isTestMode?: boolean;
  }, tenantId?: string): Promise<{ success: boolean; latencyMs?: number; message: string }> {
    const res = await fetch(`${API_BASE_URL}/api/payment-gateways/test-connection`, {
      method: 'POST',
      headers: getHeaders(tenantId),
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Connection test failed');
    }
    return await res.json();
  }
};
