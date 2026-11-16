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

// GET /api/invoices/wip/unbilled - List all unbilled timesheet entries (WIP)
router.get('/wip/unbilled', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const tenantId = req.tenantId!;
    const { customerPartyId, matterRecordId } = req.query;

    const entries = await db.timesheetEntry.findMany({
      where: {
        timesheet: { member: { tenantId } },
        isBillable: true,
        billingStatus: 'UNBILLED',
        ...(customerPartyId ? { partyId: customerPartyId as string } : {}),
        ...(matterRecordId ? { matterRecordId: matterRecordId as string } : {})
      },
      include: {
        timesheet: {
          include: {
            member: {
              select: { id: true, firstName: true, familyName: true, workEmail: true }
            }
          }
        }
      },
      orderBy: { date: 'desc' }
    });

    const partyIds = Array.from(new Set(entries.map((e: any) => e.partyId).filter(Boolean))) as string[];
    const catalogItemIds = Array.from(new Set(entries.map((e: any) => e.catalogItemId).filter(Boolean))) as string[];

    const [parties, catalogItems] = await Promise.all([
      db.party.findMany({
        where: { id: { in: partyIds } },
        select: { id: true, displayName: true, email: true, currency: true }
      }),
      db.catalogItem.findMany({
        where: { id: { in: catalogItemIds } },
        select: { id: true, name: true, basePrice: true, code: true }
      })
    ]);

    const partyMap = new Map(parties.map((p: any) => [p.id, p]));
    const catalogMap = new Map(catalogItems.map((c: any) => [c.id, c]));

    const enriched = entries.map((e: any) => {
      const party = e.partyId ? partyMap.get(e.partyId) : null;
      const catalog = e.catalogItemId ? catalogMap.get(e.catalogItemId) : null;
      const rate = e.hourlyRate || catalog?.basePrice || 0;
      const accruedAmount = Math.round(Number(e.hours) * Number(rate) * 100) / 100;

      return {
        ...e,
        clientName: party?.displayName || 'Unassigned Client',
        clientEmail: party?.email || null,
        catalogItemName: catalog?.name || null,
        effectiveRate: rate,
        accruedAmount
      };
    });

    res.json(enriched);
  } catch (err: any) {
    console.error('[InvoiceAPI] GET /wip/unbilled error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch unbilled WIP' });
  }
});

// POST /api/invoices/wip/generate - Generate draft Invoice from selected unbilled WIP
router.post('/wip/generate', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const tenantId = req.tenantId!;
    const { customerPartyId, entryIds, dueDate, notes } = req.body;

    if (!customerPartyId) {
      return res.status(400).json({ error: 'customerPartyId is required' });
    }
    if (!Array.isArray(entryIds) || entryIds.length === 0) {
      return res.status(400).json({ error: 'At least one timesheet entry must be selected' });
    }

    const result = await InvoiceService.generateInvoiceFromWIP(
      tenantId,
      customerPartyId,
      entryIds,
      dueDate,
      notes,
      req.user?.uid,
      db
    );

    res.status(201).json(result);
  } catch (err: any) {
    console.error('[InvoiceAPI] POST /wip/generate error:', err);
    res.status(400).json({ error: err.message || 'Failed to generate invoice from WIP' });
  }
});

// GET /api/invoices/wip/record/:recordId - Get all timesheet entries & financial ledger for a specific matter/record
router.get('/wip/record/:recordId', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const tenantId = req.tenantId!;
    const { recordId } = req.params;

    const entries = await db.timesheetEntry.findMany({
      where: {
        timesheet: { member: { tenantId } },
        matterRecordId: recordId
      },
      include: {
        timesheet: {
          include: {
            member: {
              select: { id: true, firstName: true, familyName: true, workEmail: true, avatarUrl: true }
            }
          }
        }
      },
      orderBy: { date: 'desc' }
    });

    const partyIds = Array.from(new Set(entries.map((e: any) => e.partyId).filter(Boolean))) as string[];
    const catalogItemIds = Array.from(new Set(entries.map((e: any) => e.catalogItemId).filter(Boolean))) as string[];
    const invoiceIds = Array.from(new Set(entries.map((e: any) => e.invoiceId).filter(Boolean))) as string[];

    const [parties, catalogItems, invoices] = await Promise.all([
      partyIds.length > 0
        ? db.party.findMany({
            where: { id: { in: partyIds } },
            select: { id: true, displayName: true, email: true, currency: true }
          })
        : [],
      catalogItemIds.length > 0
        ? db.catalogItem.findMany({
            where: { id: { in: catalogItemIds } },
            select: { id: true, name: true, basePrice: true, code: true }
          })
        : [],
      invoiceIds.length > 0
        ? db.invoice.findMany({
            where: { id: { in: invoiceIds } },
            select: { id: true, invoiceNumber: true, status: true, totalAmount: true }
          })
        : []
    ]);

    const partyMap = new Map(parties.map((p: any) => [p.id, p]));
    const catalogMap = new Map(catalogItems.map((c: any) => [c.id, c]));
    const invoiceMap = new Map(invoices.map((inv: any) => [inv.id, inv]));

    let totalHours = 0;
    let unbilledHours = 0;
    let unbilledAmount = 0;
    let invoicedAmount = 0;
    let paidAmount = 0;

    const enriched = entries.map((e: any) => {
      const party = e.partyId ? partyMap.get(e.partyId) : null;
      const catalog = e.catalogItemId ? catalogMap.get(e.catalogItemId) : null;
      const invoice = e.invoiceId ? invoiceMap.get(e.invoiceId) : null;
      const rate = e.hourlyRate || catalog?.basePrice || 0;
      const hours = Number(e.hours) || 0;
      const amount = Math.round(hours * Number(rate) * 100) / 100;

      totalHours += hours;
      if (e.billingStatus === 'UNBILLED' && e.isBillable) {
        unbilledHours += hours;
        unbilledAmount += amount;
      } else if (e.billingStatus === 'INVOICED') {
        invoicedAmount += amount;
      } else if (e.billingStatus === 'PAID') {
        paidAmount += amount;
      }

      return {
        ...e,
        clientName: party?.displayName || 'Unassigned Client',
        catalogItemName: catalog?.name || null,
        invoiceNumber: invoice?.invoiceNumber || null,
        invoiceStatus: invoice?.status || null,
        effectiveRate: rate,
        amount,
        authorName: e.timesheet?.member
          ? `${e.timesheet.member.firstName || ''} ${e.timesheet.member.familyName || ''}`.trim()
          : 'Unknown Member',
        authorAvatar: e.timesheet?.member?.avatarUrl || null
      };
    });

    res.json({
      recordId,
      entries: enriched,
      stats: {
        totalHours: Math.round(totalHours * 100) / 100,
        unbilledHours: Math.round(unbilledHours * 100) / 100,
        unbilledAmount: Math.round(unbilledAmount * 100) / 100,
        invoicedAmount: Math.round(invoicedAmount * 100) / 100,
        paidAmount: Math.round(paidAmount * 100) / 100
      }
    });
  } catch (err: any) {
    console.error('[InvoiceAPI] GET /wip/record/:recordId error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch matter time entries' });
  }
});

// POST /api/invoices/wip/record/:recordId/log - Log a time entry directly against a record
router.post('/wip/record/:recordId/log', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const tenantId = req.tenantId!;
    const { recordId } = req.params;
    const {
      hours,
      description,
      date,
      partyId,
      catalogItemId,
      hourlyRate,
      isBillable = true
    } = req.body;

    if (!hours || Number(hours) <= 0) {
      return res.status(400).json({ error: 'Valid hours (> 0) required' });
    }

    // Resolve member for user
    let member = await db.tenantMember.findFirst({
      where: {
        tenantId,
        user: { id: req.user?.uid }
      }
    });

    if (!member) {
      member = await db.tenantMember.findFirst({
        where: { tenantId }
      });
    }

    if (!member) {
      return res.status(404).json({ error: 'Tenant member profile not found' });
    }

    // Find or create active draft timesheet
    let timesheet = await db.timesheet.findFirst({
      where: { memberId: member.id, status: 'Draft' },
      orderBy: { periodStart: 'desc' }
    });

    if (!timesheet) {
      const now = new Date();
      timesheet = await db.timesheet.create({
        data: {
          memberId: member.id,
          status: 'Draft',
          periodStart: now,
          periodEnd: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
        }
      });
    }

    // Create entry
    const entry = await db.timesheetEntry.create({
      data: {
        timesheetId: timesheet.id,
        date: date ? new Date(date) : new Date(),
        hours: parseFloat(hours),
        description: description || '',
        partyId: partyId || null,
        catalogItemId: catalogItemId || null,
        hourlyRate: hourlyRate !== undefined && hourlyRate !== null ? parseFloat(hourlyRate) : 150,
        currency: 'AUD',
        isBillable: Boolean(isBillable),
        billingStatus: isBillable ? 'UNBILLED' : 'NON_BILLABLE',
        matterRecordId: recordId
      }
    });

    res.status(201).json(entry);
  } catch (err: any) {
    console.error('[InvoiceAPI] POST /wip/record/:recordId/log error:', err);
    res.status(500).json({ error: err.message || 'Failed to log time to record' });
  }
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

    const invoice = await InvoiceService.createInvoice(tenantId, {
      ...validated,
      issueDate: validated.issueDate || new Date(),
      dueDate: validated.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    }, req.user?.uid, db);
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

    const bill = await InvoiceService.createBill(tenantId, {
      ...validated,
      issueDate: validated.issueDate || new Date(),
      dueDate: validated.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    }, req.user?.uid, db);
    res.status(201).json(bill);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
