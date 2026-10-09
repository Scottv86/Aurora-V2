import express from 'express';
import { z } from 'zod';
import { TenantRequest } from '../middleware/tenantMiddleware';
import { globalPrisma } from '../lib/prisma';
import { InvoiceService } from '../services/invoiceService';

const router = express.Router();

const InvoiceLineSchema = z.object({
  catalogItemId: z.string().optional().nullable(),
  variantId: z.string().optional().nullable(),
  description: z.string().min(1, 'Description is required'),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  discountAmount: z.number().nonnegative().optional(),
  taxRateId: z.string().optional().nullable(),
  taxAmount: z.number().nonnegative().optional(),
  accountId: z.string().optional().nullable(),
});

const InvoiceSchema = z.object({
  customerPartyId: z.string().min(1, 'Customer is required'),
  issueDate: z.string().or(z.date()),
  dueDate: z.string().or(z.date()),
  currency: z.string().default('AUD'),
  notes: z.string().optional().nullable(),
  status: z.enum(['DRAFT', 'AUTHORIZED']).default('DRAFT'),
  lines: z.array(InvoiceLineSchema).min(1, 'Invoice must have at least one line item'),
});

const BillSchema = z.object({
  supplierPartyId: z.string().min(1, 'Supplier is required'),
  billNumber: z.string().optional().nullable(),
  issueDate: z.string().or(z.date()),
  dueDate: z.string().or(z.date()),
  currency: z.string().default('AUD'),
  notes: z.string().optional().nullable(),
  status: z.enum(['DRAFT', 'AWAITING_PAYMENT']).default('AWAITING_PAYMENT'),
  lines: z.array(z.object({
    catalogItemId: z.string().optional().nullable(),
    description: z.string().min(1, 'Description is required'),
    quantity: z.number().positive(),
    unitCost: z.number().nonnegative(),
    taxRateId: z.string().optional().nullable(),
    taxAmount: z.number().nonnegative().optional(),
    accountId: z.string().optional().nullable(),
  })).min(1, 'Bill must have at least one line item'),
});

// GET /api/invoices - List Invoices
router.get('/', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const tenantId = req.tenantId!;
    const { status, customerPartyId, page = 1, limit = 50 } = req.query;

    const where: any = { tenantId };
    if (status) where.status = status as string;
    if (customerPartyId) where.customerPartyId = customerPartyId as string;

    const [total, invoices] = await Promise.all([
      db.invoice.count({ where }),
      db.invoice.findMany({
        where,
        include: {
          customer: { include: { person: true, organization: true } },
          lines: true,
          payments: true
        },
        orderBy: { issueDate: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit)
      })
    ]);

    res.json({
      invoices,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit))
    });
  } catch (err: any) {
    console.error('[InvoiceAPI] GET / error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch invoices' });
  }
});

// GET /api/invoices/:id - Invoice Detail
router.get('/:id', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const invoice = await db.invoice.findUnique({
      where: { id: req.params.id },
      include: {
        customer: { include: { person: true, organization: true } },
        lines: true,
        payments: true
      }
    });

    if (!invoice || invoice.tenantId !== req.tenantId) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.json(invoice);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/invoices - Create Invoice
router.post('/', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const tenantId = req.tenantId!;
    const validated = InvoiceSchema.parse(req.body);

    const invoice = await InvoiceService.createInvoice(tenantId, validated, req.user?.uid, db);
    res.status(201).json(invoice);
  } catch (err: any) {
    console.error('[InvoiceAPI] POST / error:', err);
    res.status(400).json({ error: err.message || 'Failed to create invoice' });
  }
});

// POST /api/invoices/:id/authorize - Authorize Invoice
router.post('/:id/authorize', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const tenantId = req.tenantId!;
    const invoice = await InvoiceService.authorizeInvoice(tenantId, req.params.id, req.user?.uid, db);
    res.json(invoice);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/invoices/:id/pay - Record Payment
router.post('/:id/pay', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const tenantId = req.tenantId!;
    const { amount, paymentMethod = 'BANK_TRANSFER', depositAccountId, reference } = req.body;

    const result = await InvoiceService.recordInvoicePayment(
      tenantId,
      req.params.id,
      Number(amount),
      paymentMethod,
      depositAccountId,
      reference,
      req.user?.uid,
      db
    );

    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/invoices/reports/aged-receivables
router.get('/reports/aged-receivables', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const asOfDate = req.query.date ? new Date(req.query.date as string) : new Date();
    const report = await InvoiceService.getAgedReceivables(req.tenantId!, asOfDate, db);
    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/invoices/bills/list - List Bills
router.get('/bills/list', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const bills = await db.bill.findMany({
      where: { tenantId: req.tenantId },
      include: {
        supplier: { include: { person: true, organization: true } },
        lines: true
      },
      orderBy: { issueDate: 'desc' }
    });
    res.json(bills);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/invoices/bills - Create Bill
router.post('/bills', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const tenantId = req.tenantId!;
    const validated = BillSchema.parse(req.body);

    const bill = await InvoiceService.createBill(tenantId, validated, req.user?.uid, db);
    res.status(201).json(bill);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
