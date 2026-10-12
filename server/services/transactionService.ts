import { globalPrisma } from '../lib/prisma';
import { recordAudit } from '../lib/audit';

export interface CreateTransactionInput {
  tenantId: string;
  channel: 'POS' | 'INVOICE' | 'PORTAL' | 'SUBSCRIPTION' | 'API_MANUAL';
  type?: 'SALE' | 'REFUND' | 'VOID' | 'AUTH_HOLD' | 'CHARGEBACK' | 'PAYOUT';
  status?: 'SUCCEEDED' | 'PENDING' | 'FAILED' | 'REFUNDED' | 'PARTIALLY_REFUNDED' | 'DISPUTED';
  grossAmount: number;
  taxAmount?: number;
  feeAmount?: number;
  netAmount?: number;
  currency?: string;
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
}

export interface ListTransactionsFilter {
  tenantId: string;
  channel?: string;
  type?: string;
  status?: string;
  search?: string;
  customerPartyId?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

export class TransactionService {
  /**
   * Generates a unique, sequential transaction reference (e.g. TXN-20261012-1042)
   */
  static async generateTransactionRef(tenantId: string, db: any = globalPrisma): Promise<string> {
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await db.paymentTransaction.count({
      where: {
        tenantId,
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0))
        }
      }
    });
    const seq = String(count + 1).padStart(4, '0');
    return `TXN-${todayStr}-${seq}`;
  }

  /**
   * Records a new transaction in the universal ledger
   */
  static async recordTransaction(input: CreateTransactionInput, db: any = globalPrisma) {
    const transactionRef = await this.generateTransactionRef(input.tenantId, db);
    const gross = Number(input.grossAmount);
    const tax = Number(input.taxAmount || 0);
    const fee = Number(input.feeAmount || 0);
    const net = input.netAmount !== undefined ? Number(input.netAmount) : Math.round((gross - fee) * 100) / 100;

    const transaction = await db.paymentTransaction.create({
      data: {
        tenantId: input.tenantId,
        transactionRef,
        channel: input.channel,
        type: input.type || 'SALE',
        status: input.status || 'SUCCEEDED',
        grossAmount: gross,
        taxAmount: tax,
        feeAmount: fee,
        netAmount: net,
        currency: input.currency || 'AUD',
        paymentMethod: input.paymentMethod,
        cardBrand: input.cardBrand || null,
        cardLast4: input.cardLast4 || null,
        gatewayRef: input.gatewayRef || null,
        gatewayResponse: input.gatewayResponse || null,
        customerPartyId: input.customerPartyId || null,
        posOrderId: input.posOrderId || null,
        invoiceId: input.invoiceId || null,
        journalEntryId: input.journalEntryId || null,
        metadata: input.metadata || null,
        failureReason: input.failureReason || null
      },
      include: {
        customer: {
          include: { person: true, organization: true }
        },
        posOrder: true,
        invoice: true,
        journalEntry: {
          include: {
            lines: {
              include: { account: true }
            }
          }
        },
        refunds: true
      }
    });

    await recordAudit({
      tenantId: input.tenantId,
      action: 'transaction.recorded',
      entityId: transaction.id,
      entityType: 'PaymentTransaction',
      changes: {
        transactionRef,
        channel: input.channel,
        type: input.type || 'SALE',
        amount: gross
      }
    });

    return transaction;
  }

  /**
   * Lists transactions with multi-criteria filtering, search & pagination
   */
  static async listTransactions(filters: ListTransactionsFilter, db: any = globalPrisma) {
    const { tenantId, channel, type, status, search, customerPartyId, dateFrom, dateTo, limit = 50, offset = 0 } = filters;
    const where: any = { tenantId };

    if (channel && channel !== 'ALL') where.channel = channel;
    if (type && type !== 'ALL') where.type = type;
    if (status && status !== 'ALL') where.status = status;
    if (customerPartyId) where.customerPartyId = customerPartyId;

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { transactionRef: { contains: q, mode: 'insensitive' } },
        { gatewayRef: { contains: q, mode: 'insensitive' } },
        { cardLast4: { contains: q } },
        { paymentMethod: { contains: q, mode: 'insensitive' } },
        { customer: { person: { firstName: { contains: q, mode: 'insensitive' } } } },
        { customer: { person: { lastName: { contains: q, mode: 'insensitive' } } } },
        { customer: { organization: { legalName: { contains: q, mode: 'insensitive' } } } }
      ];
    }

    const [total, transactions] = await Promise.all([
      db.paymentTransaction.count({ where }),
      db.paymentTransaction.findMany({
        where,
        include: {
          customer: {
            include: { person: true, organization: true }
          },
          posOrder: {
            select: { id: true, orderNumber: true, total: true, status: true }
          },
          invoice: {
            select: { id: true, invoiceNumber: true, total: true, status: true }
          },
          journalEntry: {
            select: { id: true, entryNumber: true, narration: true }
          },
          refunds: {
            select: { id: true, refundNumber: true, amount: true, reason: true, createdAt: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit
      })
    ]);

    return { total, transactions, limit, offset };
  }

  /**
   * Computes KPI summary metrics for the Transactions Hub
   */
  static async getMetrics(tenantId: string, dateFrom?: string, dateTo?: string, db: any = globalPrisma) {
    const where: any = { tenantId };
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const transactions = await db.paymentTransaction.findMany({
      where,
      select: {
        type: true,
        status: true,
        grossAmount: true,
        taxAmount: true,
        feeAmount: true,
        netAmount: true
      }
    });

    let totalVolume = 0;
    let totalSettled = 0;
    let totalRefunded = 0;
    let totalFees = 0;
    let failedCount = 0;
    let successfulCount = 0;

    for (const t of transactions) {
      const gross = Number(t.grossAmount);
      const fee = Number(t.feeAmount || 0);

      if (t.status === 'FAILED') {
        failedCount += 1;
        continue;
      }

      if (t.type === 'SALE' && (t.status === 'SUCCEEDED' || t.status === 'REFUNDED' || t.status === 'PARTIALLY_REFUNDED')) {
        totalVolume += gross;
        totalFees += fee;
        successfulCount += 1;
      }

      if (t.type === 'REFUND') {
        totalRefunded += Math.abs(gross);
      }
    }

    totalSettled = Math.round((totalVolume - totalRefunded - totalFees) * 100) / 100;
    const refundRate = totalVolume > 0 ? Math.round((totalRefunded / totalVolume) * 10000) / 100 : 0;

    return {
      totalTransactions: transactions.length,
      successfulCount,
      failedCount,
      grossVolume: Math.round(totalVolume * 100) / 100,
      totalRefunded: Math.round(totalRefunded * 100) / 100,
      totalFees: Math.round(totalFees * 100) / 100,
      netSettled: totalSettled,
      refundRatePct: refundRate
    };
  }

  /**
   * Streams transactions formatted as CSV
   */
  static async exportCsv(tenantId: string, filters: any = {}, db: any = globalPrisma): Promise<string> {
    const { transactions } = await this.listTransactions({ ...filters, tenantId, limit: 10000, offset: 0 }, db);
    const headers = [
      'Transaction Ref',
      'Date (UTC)',
      'Channel',
      'Type',
      'Status',
      'Customer',
      'Method',
      'Card Brand',
      'Card Last4',
      'Gross Amount',
      'Tax Amount',
      'Fee Amount',
      'Net Amount',
      'Currency',
      'Gateway Ref',
      'POS Order',
      'Invoice'
    ];

    const rows = transactions.map((t: any) => {
      const custName = t.customer?.organization?.legalName || 
        `${t.customer?.person?.firstName || ''} ${t.customer?.person?.lastName || ''}`.trim() || 
        'Walk-in / Guest';

      return [
        t.transactionRef,
        new Date(t.createdAt).toISOString(),
        t.channel,
        t.type,
        t.status,
        `"${custName.replace(/"/g, '""')}"`,
        t.paymentMethod,
        t.cardBrand || '',
        t.cardLast4 || '',
        Number(t.grossAmount).toFixed(2),
        Number(t.taxAmount).toFixed(2),
        Number(t.feeAmount).toFixed(2),
        Number(t.netAmount).toFixed(2),
        t.currency,
        t.gatewayRef || '',
        t.posOrder?.orderNumber || '',
        t.invoice?.invoiceNumber || ''
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }
}
