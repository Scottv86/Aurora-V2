import express from 'express';
import { z } from 'zod';
import { TenantRequest } from '../middleware/tenantMiddleware';
import { globalPrisma } from '../lib/prisma';
import { AccountingService } from '../services/accountingService';
import { recordAudit } from '../lib/audit';

const router = express.Router();

// Validation Schemas
const AccountSchema = z.object({
  accountCode: z.string().min(1, 'Account Code is required'),
  accountName: z.string().min(1, 'Account Name is required'),
  accountType: z.enum(['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE']),
  systemAccount: z.enum([
    'BANK', 'AR', 'AP', 'GST_PAYABLE', 'GST_PAID', 
    'COGS', 'INVENTORY_ASSET', 'POS_CLEARING', 
    'GATEWAY_CLEARING', 'VOUCHER_LIABILITY', 'TRUST_LIABILITY'
  ]).optional().nullable(),
  taxRateId: z.string().optional().nullable(),
  currency: z.string().default('AUD'),
  description: z.string().optional().nullable(),
});

const UpdateAccountSchema = z.object({
  accountCode: z.string().min(1).optional(),
  accountName: z.string().min(1).optional(),
  accountType: z.enum(['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE']).optional(),
  taxRateId: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

const TaxRateSchema = z.object({
  code: z.string().min(1, 'Tax Code is required'),
  name: z.string().min(1, 'Tax Name is required'),
  rate: z.number().min(0).max(1),
  isRecoverable: z.boolean().default(true),
  reportCategory: z.string().optional().nullable(),
});

const JournalLineSchema = z.object({
  accountId: z.string().min(1, 'Account is required'),
  debit: z.number().nonnegative(),
  credit: z.number().nonnegative(),
  taxAmount: z.number().nonnegative().optional(),
  taxRateId: z.string().optional().nullable(),
  contactPartyId: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
});

const JournalSchema = z.object({
  date: z.string().or(z.date()),
  narration: z.string().min(1, 'Narration / Description is required'),
  sourceModule: z.enum(['POS', 'INVOICE', 'BILL', 'PORTAL_PAYMENT', 'BANK_RECONCILIATION', 'INVENTORY_ADJUSTMENT', 'MANUAL']).default('MANUAL'),
  sourceReferenceId: z.string().optional().nullable(),
  lines: z.array(JournalLineSchema).min(2, 'Journal entry requires at least 2 lines (Debit and Credit)'),
});

// GET /api/finance/accounts - List Chart of Accounts with live balances
router.get('/accounts', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const tenantId = req.tenantId!;

    await AccountingService.ensureStandardChartOfAccounts(tenantId, db);

    const accounts = await db.chartOfAccount.findMany({
      where: { tenantId },
      include: {
        taxRate: true,
        journalLines: {
          select: {
            debit: true,
            credit: true
          }
        }
      },
      orderBy: { accountCode: 'asc' }
    });

    const enriched = accounts.map((acc: any) => {
      let debitTotal = 0;
      let creditTotal = 0;
      for (const line of acc.journalLines) {
        debitTotal += Number(line.debit || 0);
        creditTotal += Number(line.credit || 0);
      }
      
      let balance = 0;
      if (acc.accountType === 'ASSET' || acc.accountType === 'EXPENSE') {
        balance = debitTotal - creditTotal;
      } else {
        balance = creditTotal - debitTotal;
      }

      const { journalLines, ...rest } = acc;
      return {
        ...rest,
        debitTotal: Math.round(debitTotal * 100) / 100,
        creditTotal: Math.round(creditTotal * 100) / 100,
        currentBalance: Math.round(balance * 100) / 100
      };
    });

    res.json(enriched);
  } catch (err: any) {
    console.error('[FinanceAPI] GET /accounts error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch accounts' });
  }
});

// POST /api/finance/accounts - Create Account
router.post('/accounts', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const tenantId = req.tenantId!;
    const validated = AccountSchema.parse(req.body);

    const account = await db.chartOfAccount.create({
      data: {
        tenantId,
        ...validated
      },
      include: { taxRate: true }
    });

    await recordAudit({
      tenantId,
      action: 'ACCOUNT_CREATED',
      category: 'SECURITY',
      resourceId: account.id,
      resourceKey: account.accountCode,
      resourceTitle: account.accountName,
      description: `Account ${account.accountCode} - ${account.accountName} created`
    });

    res.status(201).json(account);
  } catch (err: any) {
    console.error('[FinanceAPI] POST /accounts error:', err);
    res.status(400).json({ error: err.message || 'Failed to create account' });
  }
});

// PUT /api/finance/accounts/:id - Update Account
router.put('/accounts/:id', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const tenantId = req.tenantId!;
    const { id } = req.params;
    const validated = UpdateAccountSchema.parse(req.body);

    const existing = await db.chartOfAccount.findFirst({
      where: { id, tenantId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Account not found' });
    }

    if (validated.accountCode && validated.accountCode !== existing.accountCode) {
      const codeConflict = await db.chartOfAccount.findFirst({
        where: { tenantId, accountCode: validated.accountCode }
      });
      if (codeConflict) {
        return res.status(400).json({ error: `Account code ${validated.accountCode} already exists.` });
      }
    }

    if (existing.systemAccount && validated.isActive === false) {
      return res.status(400).json({ error: `System account (${existing.systemAccount}) cannot be deactivated because core automated transactions depend on it.` });
    }

    const updated = await db.chartOfAccount.update({
      where: { id },
      data: {
        ...(validated.accountCode ? { accountCode: validated.accountCode } : {}),
        ...(validated.accountName ? { accountName: validated.accountName } : {}),
        ...(validated.accountType ? { accountType: validated.accountType } : {}),
        ...(validated.taxRateId !== undefined ? { taxRateId: validated.taxRateId } : {}),
        ...(validated.description !== undefined ? { description: validated.description } : {}),
        ...(validated.isActive !== undefined ? { isActive: validated.isActive } : {}),
      },
      include: { taxRate: true }
    });

    await recordAudit({
      tenantId,
      action: 'ACCOUNT_UPDATED',
      category: 'SECURITY',
      resourceId: updated.id,
      resourceKey: updated.accountCode,
      resourceTitle: updated.accountName,
      description: `Account ${updated.accountCode} - ${updated.accountName} updated`
    });

    res.json(updated);
  } catch (err: any) {
    console.error('[FinanceAPI] PUT /accounts/:id error:', err);
    res.status(400).json({ error: err.message || 'Failed to update account' });
  }
});

// DELETE /api/finance/accounts/:id - Delete Account (if no transactions and not system account)
router.delete('/accounts/:id', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const tenantId = req.tenantId!;
    const { id } = req.params;

    const existing = await db.chartOfAccount.findFirst({
      where: { id, tenantId },
      include: {
        journalLines: { select: { id: true }, take: 1 }
      }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Account not found' });
    }

    if (existing.systemAccount) {
      return res.status(400).json({ error: `System account (${existing.systemAccount}) cannot be deleted because it is required for core ledger operations.` });
    }

    if (existing.journalLines && existing.journalLines.length > 0) {
      return res.status(400).json({ error: `Cannot delete account ${existing.accountCode} because it has recorded general ledger journal transactions. Deactivate or archive this account instead.` });
    }

    await db.chartOfAccount.delete({
      where: { id }
    });

    await recordAudit({
      tenantId,
      action: 'ACCOUNT_DELETED',
      category: 'SECURITY',
      resourceId: existing.id,
      resourceKey: existing.accountCode,
      resourceTitle: existing.accountName,
      description: `Account ${existing.accountCode} - ${existing.accountName} deleted`
    });

    res.json({ success: true, message: 'Account deleted' });
  } catch (err: any) {
    console.error('[FinanceAPI] DELETE /accounts/:id error:', err);
    res.status(400).json({ error: err.message || 'Failed to delete account' });
  }
});

// GET /api/finance/tax-rates - List Tax Rates
router.get('/tax-rates', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const tenantId = req.tenantId!;

    await AccountingService.ensureStandardChartOfAccounts(tenantId, db);

    const rates = await db.taxRate.findMany({
      where: { tenantId },
      orderBy: { code: 'asc' }
    });

    res.json(rates);
  } catch (err: any) {
    console.error('[FinanceAPI] GET /tax-rates error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch tax rates' });
  }
});

// POST /api/finance/tax-rates - Create Tax Rate
router.post('/tax-rates', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const tenantId = req.tenantId!;
    const validated = TaxRateSchema.parse(req.body);

    const taxRate = await db.taxRate.create({
      data: {
        tenantId,
        ...validated
      }
    });

    res.status(201).json(taxRate);
  } catch (err: any) {
    console.error('[FinanceAPI] POST /tax-rates error:', err);
    res.status(400).json({ error: err.message || 'Failed to create tax rate' });
  }
});

// GET /api/finance/journals - List Journal Entries with lines
router.get('/journals', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const tenantId = req.tenantId!;
    const { sourceModule, page = 1, limit = 50 } = req.query;

    const where: any = { tenantId };
    if (sourceModule) {
      where.sourceModule = sourceModule as string;
    }

    const [total, journals] = await Promise.all([
      db.journalEntry.count({ where }),
      db.journalEntry.findMany({
        where,
        include: {
          lines: {
            include: {
              account: true,
              contactParty: {
                include: { person: true, organization: true }
              }
            }
          }
        },
        orderBy: { date: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit)
      })
    ]);

    res.json({
      journals,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit))
    });
  } catch (err: any) {
    console.error('[FinanceAPI] GET /journals error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch journals' });
  }
});

// POST /api/finance/journals - Post Manual Journal
router.post('/journals', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const tenantId = req.tenantId!;
    const validated = JournalSchema.parse(req.body);

    const journal = await AccountingService.postJournalEntry(tenantId, {
      ...validated,
      createdByUserId: req.user?.uid
    }, db);

    res.status(201).json(journal);
  } catch (err: any) {
    console.error('[FinanceAPI] POST /journals error:', err);
    res.status(400).json({ error: err.message || 'Failed to post journal' });
  }
});

// POST /api/finance/journals/:id/reverse - Reverse Journal
router.post('/journals/:id/reverse', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const tenantId = req.tenantId!;
    const { id } = req.params;
    const { reason = 'Manual reversal' } = req.body;

    const reversal = await AccountingService.reverseJournalEntry(tenantId, id, reason, req.user?.uid, db);
    res.json(reversal);
  } catch (err: any) {
    console.error('[FinanceAPI] POST /journals/:id/reverse error:', err);
    res.status(400).json({ error: err.message || 'Failed to reverse journal' });
  }
});

// GET /api/finance/reports/trial-balance
router.get('/reports/trial-balance', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const tenantId = req.tenantId!;
    const asOfDate = req.query.date ? new Date(req.query.date as string) : new Date();

    const report = await AccountingService.getTrialBalance(tenantId, asOfDate, db);
    res.json(report);
  } catch (err: any) {
    console.error('[FinanceAPI] Trial Balance report error:', err);
    res.status(500).json({ error: err.message || 'Failed to compute Trial Balance' });
  }
});

// GET /api/finance/reports/profit-and-loss
router.get('/reports/profit-and-loss', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const tenantId = req.tenantId!;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(new Date().getFullYear(), 0, 1);
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();

    const report = await AccountingService.getProfitAndLoss(tenantId, startDate, endDate, db);
    res.json(report);
  } catch (err: any) {
    console.error('[FinanceAPI] Profit and Loss report error:', err);
    res.status(500).json({ error: err.message || 'Failed to compute Profit & Loss' });
  }
});

// GET /api/finance/reports/balance-sheet
router.get('/reports/balance-sheet', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const tenantId = req.tenantId!;
    const asOfDate = req.query.date ? new Date(req.query.date as string) : new Date();

    const report = await AccountingService.getBalanceSheet(tenantId, asOfDate, db);
    res.json(report);
  } catch (err: any) {
    console.error('[FinanceAPI] Balance Sheet report error:', err);
    res.status(500).json({ error: err.message || 'Failed to compute Balance Sheet' });
  }
});

// GET /api/finance/lock-date - Get Lock Date
router.get('/lock-date', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const tenant = await db.tenant.findUnique({
      where: { id: req.tenantId },
      select: { workspaceSettings: true }
    });
    const lockDate = (tenant?.workspaceSettings as any)?.financialLockDate || null;
    res.json({ lockDate });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/finance/lock-date - Set Lock Date
router.post('/lock-date', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const { lockDate } = req.body;
    const tenantId = req.tenantId!;

    const tenant = await db.tenant.findUnique({ where: { id: tenantId } });
    const currentSettings = (tenant?.workspaceSettings || {}) as any;

    await db.tenant.update({
      where: { id: tenantId },
      data: {
        workspaceSettings: {
          ...currentSettings,
          financialLockDate: lockDate || null
        }
      }
    });

    await recordAudit({
      tenantId,
      action: 'FINANCIAL_LOCK_DATE_UPDATED',
      category: 'SECURITY',
      resourceId: tenantId,
      resourceTitle: 'Financial Lock Date',
      description: lockDate ? `Period locked up to ${lockDate}` : 'Period lock removed'
    });

    res.json({ success: true, lockDate });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
