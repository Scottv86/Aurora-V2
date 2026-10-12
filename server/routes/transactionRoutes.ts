import { Router, Response } from 'express';
import { z } from 'zod';
import { TenantRequest } from '../middleware/tenantMiddleware';
import { globalPrisma } from '../lib/prisma';
import { TransactionService } from '../services/transactionService';
import { RefundService } from '../services/refundService';

const router = Router();

// Validation Schemas
const PosRefundSchema = z.object({
  orderId: z.string(),
  refundMethod: z.enum(['ORIGINAL_TENDER', 'CASH', 'CARD', 'VOUCHER', 'STORE_CREDIT']).default('ORIGINAL_TENDER'),
  reason: z.enum([
    'CUSTOMER_RETURN',
    'DEFECTIVE_GOODS',
    'DUPLICATE_CHARGE',
    'INCORRECT_PRICING',
    'ORDER_CANCELLED',
    'GOODWILL',
    'OTHER'
  ]).default('CUSTOMER_RETURN'),
  reasonNotes: z.string().optional(),
  items: z.array(z.object({
    catalogItemId: z.string().nullable().optional(),
    variantId: z.string().nullable().optional(),
    title: z.string(),
    quantity: z.number().positive(),
    unitPrice: z.number().nonnegative(),
    unitCost: z.number().nonnegative().optional(),
    taxRate: z.number().nonnegative().optional(),
    isRestocked: z.boolean().default(true)
  })).min(1),
  managerApproval: z.boolean().optional()
});

const BlindRefundSchema = z.object({
  amount: z.number().positive(),
  taxAmount: z.number().nonnegative().optional(),
  refundMethod: z.enum(['CASH', 'CARD', 'VOUCHER', 'STORE_CREDIT']).default('STORE_CREDIT'),
  reason: z.enum([
    'CUSTOMER_RETURN',
    'DEFECTIVE_GOODS',
    'DUPLICATE_CHARGE',
    'INCORRECT_PRICING',
    'ORDER_CANCELLED',
    'GOODWILL',
    'OTHER'
  ]).default('CUSTOMER_RETURN'),
  reasonNotes: z.string().optional(),
  customerPartyId: z.string().nullable().optional(),
  items: z.array(z.object({
    catalogItemId: z.string().nullable().optional(),
    variantId: z.string().nullable().optional(),
    title: z.string(),
    quantity: z.number().positive(),
    unitPrice: z.number().nonnegative(),
    unitCost: z.number().nonnegative().optional(),
    taxRate: z.number().nonnegative().optional(),
    isRestocked: z.boolean().default(true)
  })).optional(),
  managerApproval: z.boolean()
});

const InvoiceRefundSchema = z.object({
  invoiceId: z.string(),
  amount: z.number().positive(),
  refundMethod: z.string().default('BANK_TRANSFER'),
  reason: z.enum([
    'CUSTOMER_RETURN',
    'DEFECTIVE_GOODS',
    'DUPLICATE_CHARGE',
    'INCORRECT_PRICING',
    'ORDER_CANCELLED',
    'GOODWILL',
    'OTHER'
  ]).default('ORDER_CANCELLED'),
  reasonNotes: z.string().optional()
});

// GET /api/transactions - List universal transactions
router.get('/', async (req: TenantRequest, res: Response) => {
  try {
    const db = req.db || globalPrisma;
    const tenantId = req.tenantId!;
    const { channel, type, status, search, customerPartyId, dateFrom, dateTo, limit, offset } = req.query;

    const result = await TransactionService.listTransactions({
      tenantId,
      channel: channel as string,
      type: type as string,
      status: status as string,
      search: search as string,
      customerPartyId: customerPartyId as string,
      dateFrom: dateFrom as string,
      dateTo: dateTo as string,
      limit: limit ? parseInt(limit as string) : 50,
      offset: offset ? parseInt(offset as string) : 0
    }, db);

    res.json(result);
  } catch (err: any) {
    console.error('[TransactionsAPI] GET / error:', err);
    res.status(500).json({ error: err.message || 'Failed to list transactions' });
  }
});

// GET /api/transactions/metrics - KPI statistics
router.get('/metrics', async (req: TenantRequest, res: Response) => {
  try {
    const db = req.db || globalPrisma;
    const tenantId = req.tenantId!;
    const { dateFrom, dateTo } = req.query;

    const metrics = await TransactionService.getMetrics(tenantId, dateFrom as string, dateTo as string, db);
    res.json(metrics);
  } catch (err: any) {
    console.error('[TransactionsAPI] GET /metrics error:', err);
    res.status(500).json({ error: err.message || 'Failed to get transaction metrics' });
  }
});

// GET /api/transactions/export/csv - Export CSV stream
router.get('/export/csv', async (req: TenantRequest, res: Response) => {
  try {
    const db = req.db || globalPrisma;
    const tenantId = req.tenantId!;
    const csvContent = await TransactionService.exportCsv(tenantId, req.query, db);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=transactions-${Date.now()}.csv`);
    res.send(csvContent);
  } catch (err: any) {
    console.error('[TransactionsAPI] GET /export/csv error:', err);
    res.status(500).json({ error: err.message || 'Failed to export CSV' });
  }
});

// GET /api/transactions/:id - Detail view
router.get('/:id', async (req: TenantRequest, res: Response) => {
  try {
    const db = req.db || globalPrisma;
    const tenantId = req.tenantId!;
    const { id } = req.params;

    const txn = await db.paymentTransaction.findUnique({
      where: { id },
      include: {
        customer: {
          include: { person: true, organization: true }
        },
        posOrder: {
          include: { items: true, payments: true, session: { include: { register: true } } }
        },
        invoice: {
          include: { lines: true, payments: true }
        },
        journalEntry: {
          include: {
            lines: {
              include: { account: true }
            }
          }
        },
        refunds: {
          include: {
            items: true,
            journalEntry: {
              include: {
                lines: { include: { account: true } }
              }
            }
          }
        }
      }
    });

    if (!txn || txn.tenantId !== tenantId) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json(txn);
  } catch (err: any) {
    console.error('[TransactionsAPI] GET /:id error:', err);
    res.status(500).json({ error: err.message || 'Failed to load transaction details' });
  }
});

// POST /api/transactions/pos/refund - Process POS Order Return
router.post('/pos/refund', async (req: TenantRequest, res: Response) => {
  try {
    const db = req.db || globalPrisma;
    const tenantId = req.tenantId!;
    const validated = PosRefundSchema.parse(req.body);
    const userId = (req as any).user?.id;

    const refund = await RefundService.processPosRefund({
      tenantId,
      ...validated,
      processedByUserId: userId
    }, db);

    res.status(201).json(refund);
  } catch (err: any) {
    console.error('[TransactionsAPI] POST /pos/refund error:', err);
    res.status(400).json({ error: err.message || 'Failed to process POS refund' });
  }
});

// POST /api/transactions/blind/refund - Process Blind Return (Requires Manager Approval)
router.post('/blind/refund', async (req: TenantRequest, res: Response) => {
  try {
    const db = req.db || globalPrisma;
    const tenantId = req.tenantId!;
    const validated = BlindRefundSchema.parse(req.body);
    const userId = (req as any).user?.id;

    if (!validated.managerApproval) {
      return res.status(403).json({ error: 'Manager approval required for blind refunds' });
    }

    const refund = await RefundService.processBlindRefund({
      tenantId,
      ...validated,
      processedByUserId: userId
    }, db);

    res.status(201).json(refund);
  } catch (err: any) {
    console.error('[TransactionsAPI] POST /blind/refund error:', err);
    res.status(400).json({ error: err.message || 'Failed to process blind refund' });
  }
});

// POST /api/transactions/invoice/refund - Process Invoice Credit / Refund
router.post('/invoice/refund', async (req: TenantRequest, res: Response) => {
  try {
    const db = req.db || globalPrisma;
    const tenantId = req.tenantId!;
    const validated = InvoiceRefundSchema.parse(req.body);
    const userId = (req as any).user?.id;

    const refund = await RefundService.processInvoiceRefund({
      tenantId,
      ...validated,
      processedByUserId: userId
    }, db);

    res.status(201).json(refund);
  } catch (err: any) {
    console.error('[TransactionsAPI] POST /invoice/refund error:', err);
    res.status(400).json({ error: err.message || 'Failed to process invoice refund' });
  }
});

// POST /api/transactions/:id/refund - 1-Click Refund from Transactions Table
router.post('/:id/refund', async (req: TenantRequest, res: Response) => {
  try {
    const db = req.db || globalPrisma;
    const tenantId = req.tenantId!;
    const { id } = req.params;
    const { amount, reason = 'CUSTOMER_RETURN', reasonNotes, refundMethod } = req.body;
    const userId = (req as any).user?.id;

    const txn = await db.paymentTransaction.findUnique({
      where: { id },
      include: { posOrder: { include: { items: true } }, invoice: true }
    });

    if (!txn || txn.tenantId !== tenantId) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (txn.type !== 'SALE' || txn.status === 'REFUNDED') {
      return res.status(400).json({ error: 'Transaction is not eligible for refund' });
    }

    let refundResult;

    if (txn.posOrderId && txn.posOrder) {
      // Refund through POS order
      const refundAmt = amount ? Number(amount) : Number(txn.grossAmount);
      // Create a refund item representing the refund
      const refundItem = {
        title: `Refund for Order #${txn.posOrder.orderNumber}`,
        quantity: 1,
        unitPrice: refundAmt,
        isRestocked: false // direct quick refund defaults restock to false
      };

      refundResult = await RefundService.processPosRefund({
        tenantId,
        orderId: txn.posOrderId,
        items: [refundItem],
        refundMethod: (refundMethod || txn.paymentMethod || 'CASH') as any,
        reason: reason as any,
        reasonNotes: reasonNotes || `Direct refund from transaction ${txn.transactionRef}`,
        processedByUserId: userId
      }, db);
    } else if (txn.invoiceId && txn.invoice) {
      // Refund through invoice
      const refundAmt = amount ? Number(amount) : Number(txn.grossAmount);
      refundResult = await RefundService.processInvoiceRefund({
        tenantId,
        invoiceId: txn.invoiceId,
        amount: refundAmt,
        reason: reason as any,
        reasonNotes: reasonNotes || `Direct refund from transaction ${txn.transactionRef}`,
        refundMethod: refundMethod || txn.paymentMethod || 'BANK_TRANSFER',
        processedByUserId: userId
      }, db);
    } else {
      // Ad-hoc blind refund
      const refundAmt = amount ? Number(amount) : Number(txn.grossAmount);
      refundResult = await RefundService.processBlindRefund({
        tenantId,
        amount: refundAmt,
        refundMethod: (refundMethod || txn.paymentMethod || 'CASH') as any,
        reason: reason as any,
        reasonNotes: reasonNotes || `Direct refund for transaction ${txn.transactionRef}`,
        customerPartyId: txn.customerPartyId,
        processedByUserId: userId,
        managerApproval: true
      }, db);
    }

    res.status(201).json(refundResult);
  } catch (err: any) {
    console.error('[TransactionsAPI] POST /:id/refund error:', err);
    res.status(500).json({ error: err.message || 'Failed to process refund' });
  }
});

// GET /api/transactions/refunds/:refundId - Fetch full refund details for slip / credit note printing
router.get('/refunds/:refundId', async (req: TenantRequest, res: Response) => {
  try {
    const db = req.db || globalPrisma;
    const tenantId = req.tenantId!;
    const { refundId } = req.params;

    const refund = await db.refund.findFirst({
      where: {
        id: refundId,
        tenantId
      },
      include: {
        items: true,
        posOrder: {
          include: {
            items: true
          }
        },
        invoice: {
          include: {
            lines: true,
            customer: {
              include: { person: true, organization: true }
            }
          }
        },
        paymentTransaction: {
          include: {
            customer: {
              include: { person: true, organization: true }
            }
          }
        },
        journalEntry: {
          include: {
            lines: {
              include: { account: true }
            }
          }
        },
        tenant: true
      }
    });

    if (!refund) {
      return res.status(404).json({ error: 'Refund record not found' });
    }

    res.json(refund);
  } catch (err: any) {
    console.error('[TransactionsAPI] GET /refunds/:refundId error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch refund details' });
  }
});

export default router;
