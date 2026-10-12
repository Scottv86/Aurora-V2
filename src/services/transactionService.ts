import { API_BASE_URL } from '../config';

export interface PaymentTransaction {
  id: string;
  tenantId: string;
  transactionRef: string;
  channel: 'POS' | 'INVOICE' | 'PORTAL' | 'SUBSCRIPTION' | 'API_MANUAL';
  type: 'SALE' | 'REFUND' | 'VOID' | 'AUTH_HOLD' | 'CHARGEBACK' | 'PAYOUT';
  status: 'SUCCEEDED' | 'PENDING' | 'FAILED' | 'REFUNDED' | 'PARTIALLY_REFUNDED' | 'DISPUTED';
  grossAmount: number;
  taxAmount: number;
  feeAmount: number;
  netAmount: number;
  currency: string;
  paymentMethod: string;
  cardBrand?: string | null;
  cardLast4?: string | null;
  gatewayRef?: string | null;
  gatewayResponse?: any;
  customerPartyId?: string | null;
  posOrderId?: string | null;
  invoiceId?: string | null;
  journalEntryId?: string | null;
  metadata?: any;
  failureReason?: string | null;
  createdAt: string;
  updatedAt: string;
  customer?: {
    id: string;
    person?: { firstName: string; lastName: string };
    organization?: { legalName: string };
  } | null;
  posOrder?: { id: string; orderNumber: string; total: number; status: string } | null;
  invoice?: { id: string; invoiceNumber: string; total: number; status: string } | null;
  journalEntry?: { id: string; entryNumber: string; narration: string; lines?: any[] } | null;
  refunds?: Array<{ id: string; refundNumber: string; amount: number; reason: string; createdAt: string }>;
}

export interface TransactionMetrics {
  totalTransactions: number;
  successfulCount: number;
  failedCount: number;
  grossVolume: number;
  totalRefunded: number;
  totalFees: number;
  netSettled: number;
  refundRatePct: number;
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

export const TransactionClientService = {
  async getTransactions(params: {
    tenantId?: string;
    channel?: string;
    type?: string;
    status?: string;
    search?: string;
    customerPartyId?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ total: number; transactions: PaymentTransaction[]; limit: number; offset: number }> {
    const url = new URL(`${API_BASE_URL}/api/transactions`);
    if (params.channel && params.channel !== 'ALL') url.searchParams.append('channel', params.channel);
    if (params.type && params.type !== 'ALL') url.searchParams.append('type', params.type);
    if (params.status && params.status !== 'ALL') url.searchParams.append('status', params.status);
    if (params.search) url.searchParams.append('search', params.search);
    if (params.customerPartyId) url.searchParams.append('customerPartyId', params.customerPartyId);
    if (params.dateFrom) url.searchParams.append('dateFrom', params.dateFrom);
    if (params.dateTo) url.searchParams.append('dateTo', params.dateTo);
    if (params.limit) url.searchParams.append('limit', String(params.limit));
    if (params.offset) url.searchParams.append('offset', String(params.offset));

    const res = await fetch(url.toString(), {
      headers: getHeaders(params.tenantId)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to fetch transactions: ${res.statusText}`);
    }

    return await res.json();
  },

  async getMetrics(params: { tenantId?: string; dateFrom?: string; dateTo?: string }): Promise<TransactionMetrics> {
    const url = new URL(`${API_BASE_URL}/api/transactions/metrics`);
    if (params.dateFrom) url.searchParams.append('dateFrom', params.dateFrom);
    if (params.dateTo) url.searchParams.append('dateTo', params.dateTo);

    const res = await fetch(url.toString(), {
      headers: getHeaders(params.tenantId)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to fetch transaction metrics: ${res.statusText}`);
    }

    return await res.json();
  },

  async getTransactionById(id: string, tenantId?: string): Promise<PaymentTransaction> {
    const res = await fetch(`${API_BASE_URL}/api/transactions/${id}`, {
      headers: getHeaders(tenantId)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to load transaction: ${res.statusText}`);
    }

    return await res.json();
  },

  async refundTransaction(
    id: string,
    payload: { amount?: number; reason: string; reasonNotes?: string; refundMethod?: string },
    tenantId?: string
  ) {
    const res = await fetch(`${API_BASE_URL}/api/transactions/${id}/refund`, {
      method: 'POST',
      headers: getHeaders(tenantId),
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to refund transaction');
    }

    return await res.json();
  },

  async processPosRefund(
    payload: {
      orderId: string;
      items: Array<{
        catalogItemId?: string | null;
        variantId?: string | null;
        title: string;
        quantity: number;
        unitPrice: number;
        unitCost?: number;
        taxRate?: number;
        isRestocked?: boolean;
      }>;
      refundMethod: 'ORIGINAL_TENDER' | 'CASH' | 'CARD' | 'VOUCHER' | 'STORE_CREDIT';
      reason: string;
      reasonNotes?: string;
      managerApproval?: boolean;
    },
    tenantId?: string
  ) {
    const res = await fetch(`${API_BASE_URL}/api/transactions/pos/refund`, {
      method: 'POST',
      headers: getHeaders(tenantId),
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to process POS refund');
    }

    return await res.json();
  },

  async processBlindRefund(
    payload: {
      amount: number;
      taxAmount?: number;
      items?: any[];
      refundMethod: 'CASH' | 'CARD' | 'VOUCHER' | 'STORE_CREDIT';
      reason: string;
      reasonNotes?: string;
      customerPartyId?: string | null;
      managerApproval: boolean;
    },
    tenantId?: string
  ) {
    const res = await fetch(`${API_BASE_URL}/api/transactions/blind/refund`, {
      method: 'POST',
      headers: getHeaders(tenantId),
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to process blind refund');
    }

    return await res.json();
  },

  async processInvoiceRefund(
    payload: {
      invoiceId: string;
      amount: number;
      refundMethod?: string;
      reason: string;
      reasonNotes?: string;
    },
    tenantId?: string
  ) {
    const res = await fetch(`${API_BASE_URL}/api/transactions/invoice/refund`, {
      method: 'POST',
      headers: getHeaders(tenantId),
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to process invoice refund');
    }

    return await res.json();
  },

  async getRefundById(refundId: string, tenantId?: string) {
    const res = await fetch(`${API_BASE_URL}/api/transactions/refunds/${refundId}`, {
      headers: getHeaders(tenantId)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch refund details');
    }

    return await res.json();
  },

  async getCustomerVouchers(partyId: string, tenantId?: string) {
    const res = await fetch(`${API_BASE_URL}/api/vouchers/party/${partyId}`, {
      headers: getHeaders(tenantId)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch customer vouchers');
    }

    return await res.json();
  },

  getExportCsvUrl(filters: any = {}, tenantId?: string) {
    const url = new URL(`${API_BASE_URL}/api/transactions/export/csv`);
    const currentTenant = tenantId || localStorage.getItem('aurora_tenant_id') || '';
    url.searchParams.append('tenantId', currentTenant);
    Object.entries(filters).forEach(([k, v]) => {
      if (v && v !== 'ALL') url.searchParams.append(k, String(v));
    });
    return url.toString();
  }
};
