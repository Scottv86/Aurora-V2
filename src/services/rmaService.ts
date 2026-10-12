import { API_BASE_URL } from '../config';

export interface ReturnRequestItem {
  id?: string;
  catalogItemId?: string | null;
  variantId?: string | null;
  description: string;
  quantity: number;
  condition?: string;
  requestedAction?: string;
}

export interface ReturnRequest {
  id: string;
  tenantId: string;
  rmaNumber: string;
  customerPartyId: string;
  posOrderId?: string | null;
  invoiceId?: string | null;
  status: 'PENDING_REVIEW' | 'APPROVED_PENDING_RECEIPT' | 'RECEIVED_INSPECTING' | 'ACCEPTED_REFUNDED' | 'REJECTED' | 'CANCELLED';
  requestedMethod: string;
  reason: string;
  customerComments?: string | null;
  photoUrls?: string[] | null;
  reviewedByMemberId?: string | null;
  reviewedAt?: string | null;
  rejectionReason?: string | null;
  internalNotes?: string | null;
  refundId?: string | null;
  createdAt: string;
  updatedAt: string;
  items: ReturnRequestItem[];
  customer?: {
    id: string;
    person?: { firstName: string; lastName: string };
    organization?: { legalName: string };
  } | null;
  refund?: {
    id: string;
    refundNumber: string;
    amount: number;
  } | null;
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

export const RmaClientService = {
  async listRequests(filters: { status?: string; search?: string; customerPartyId?: string } = {}, tenantId?: string) {
    const params = new URLSearchParams();
    if (filters.status && filters.status !== 'ALL') params.append('status', filters.status);
    if (filters.search) params.append('search', filters.search);
    if (filters.customerPartyId) params.append('customerPartyId', filters.customerPartyId);

    const res = await fetch(`${API_BASE_URL}/api/rma/requests?${params.toString()}`, {
      headers: getHeaders(tenantId)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to list return requests');
    }

    const data = await res.json();
    return Array.isArray(data) ? data : (data.requests || []);
  },

  async getRequestById(id: string, tenantId?: string) {
    const res = await fetch(`${API_BASE_URL}/api/rma/requests/${id}`, {
      headers: getHeaders(tenantId)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch RMA request');
    }

    return await res.json();
  },

  async createRequest(payload: {
    customerPartyId: string;
    posOrderId?: string | null;
    invoiceId?: string | null;
    requestedMethod?: string;
    reason: string;
    customerComments?: string;
    photoUrls?: string[];
    items: Array<{
      catalogItemId?: string | null;
      variantId?: string | null;
      description: string;
      quantity: number;
      condition?: string;
      requestedAction?: string;
    }>;
  }, tenantId?: string) {
    const res = await fetch(`${API_BASE_URL}/api/rma/requests`, {
      method: 'POST',
      headers: getHeaders(tenantId),
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to submit return request');
    }

    return await res.json();
  },

  async reviewRequest(id: string, payload: {
    action: 'APPROVE' | 'REJECT';
    rejectionReason?: string;
    internalNotes?: string;
  }, tenantId?: string) {
    const res = await fetch(`${API_BASE_URL}/api/rma/requests/${id}/review`, {
      method: 'POST',
      headers: getHeaders(tenantId),
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to review RMA');
    }

    return await res.json();
  },

  async markReceived(id: string, internalNotes?: string, tenantId?: string) {
    const res = await fetch(`${API_BASE_URL}/api/rma/requests/${id}/receive`, {
      method: 'POST',
      headers: getHeaders(tenantId),
      body: JSON.stringify({ internalNotes })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to mark return as received');
    }

    return await res.json();
  },

  async executeRefund(id: string, payload: {
    refundMethod?: string;
    restock?: boolean;
    notes?: string;
  }, tenantId?: string) {
    const res = await fetch(`${API_BASE_URL}/api/rma/requests/${id}/execute-refund`, {
      method: 'POST',
      headers: getHeaders(tenantId),
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to execute refund for RMA');
    }

    return await res.json();
  },

  async getCustomerRequests(partyId: string, tenantId?: string) {
    const res = await fetch(`${API_BASE_URL}/api/rma/customer/${partyId}`, {
      headers: getHeaders(tenantId)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch customer RMA history');
    }

    return await res.json();
  }
};
