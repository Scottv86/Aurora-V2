import { Decimal } from '@prisma/client/runtime/library';
import { globalPrisma } from '../lib/prisma';
import { recordAudit } from '../lib/audit';

export interface JournalLineInput {
  accountId: string;
  debit: number | Decimal;
  credit: number | Decimal;
  taxAmount?: number | Decimal;
  taxRateId?: string | null;
  contactPartyId?: string | null;
  description?: string | null;
}

export interface PostJournalInput {
  date: Date | string;
  sourceModule: 'POS' | 'INVOICE' | 'BILL' | 'PORTAL_PAYMENT' | 'BANK_RECONCILIATION' | 'INVENTORY_ADJUSTMENT' | 'MANUAL';
  sourceReferenceId?: string | null;
  narration: string;
  createdByUserId?: string | null;
  lines: JournalLineInput[];
}

export const DEFAULT_CHART_OF_ACCOUNTS = [
  // ASSETS (1000 - 1999)
  { accountCode: '1010', accountName: 'Operating Bank Account', accountType: 'ASSET' as const, systemAccount: 'BANK' as const, description: 'Main business operating transaction account' },
  { accountCode: '1020', accountName: 'Petty Cash', accountType: 'ASSET' as const, systemAccount: null, description: 'Till cash and physical office cash' },
  { accountCode: '1050', accountName: 'POS Card Clearing Account', accountType: 'ASSET' as const, systemAccount: 'POS_CLEARING' as const, description: 'In-store EFTPOS and credit card batches awaiting settlement' },
  { accountCode: '1055', accountName: 'Online Gateway Clearing (Stripe)', accountType: 'ASSET' as const, systemAccount: 'GATEWAY_CLEARING' as const, description: 'Online portal payments awaiting bank payout' },
  { accountCode: '1200', accountName: 'Accounts Receivable (AR)', accountType: 'ASSET' as const, systemAccount: 'AR' as const, description: 'Outstanding unpaid customer invoices' },
  { accountCode: '1300', accountName: 'Inventory Asset', accountType: 'ASSET' as const, systemAccount: 'INVENTORY_ASSET' as const, description: 'Current value of merchandise on hand' },

  // LIABILITIES (2000 - 2999)
  { accountCode: '2000', accountName: 'Accounts Payable (AP)', accountType: 'LIABILITY' as const, systemAccount: 'AP' as const, description: 'Outstanding supplier bills and unpaid expenses' },
  { accountCode: '2100', accountName: 'Sales Tax / GST Collected', accountType: 'LIABILITY' as const, systemAccount: 'GST_PAYABLE' as const, description: 'Tax collected on taxable sales and lodgments' },
  { accountCode: '2110', accountName: 'Sales Tax / GST Paid (Input Tax Credits)', accountType: 'LIABILITY' as const, systemAccount: 'GST_PAID' as const, description: 'Tax paid on purchases and expenses' },
  { accountCode: '2200', accountName: 'Customer Vouchers & Gift Cards Liability', accountType: 'LIABILITY' as const, systemAccount: 'VOUCHER_LIABILITY' as const, description: 'Unredeemed gift cards and store credit balances' },
  { accountCode: '2300', accountName: 'Bonds & Deposits Held in Trust', accountType: 'LIABILITY' as const, systemAccount: 'TRUST_LIABILITY' as const, description: 'Security bonds and retainers held on behalf of third parties' },

  // EQUITY (3000 - 3999)
  { accountCode: '3000', accountName: "Owner's Equity", accountType: 'EQUITY' as const, systemAccount: null, description: 'Owner capital contributions' },
  { accountCode: '3100', accountName: 'Retained Earnings', accountType: 'EQUITY' as const, systemAccount: null, description: 'Cumulative historical earnings' },

  // REVENUE (4000 - 4999)
  { accountCode: '4000', accountName: 'Merchandise & Retail Sales', accountType: 'REVENUE' as const, systemAccount: null, description: 'Sales from catalog products and POS registers' },
  { accountCode: '4100', accountName: 'Professional & Service Fees', accountType: 'REVENUE' as const, systemAccount: null, description: 'Consulting, hourly billing, and professional fees' },
  { accountCode: '4200', accountName: 'Statutory & Portal Lodgment Fees', accountType: 'REVENUE' as const, systemAccount: null, description: 'Fees collected via public forms and portal applications' },
  { accountCode: '4900', accountName: 'Discounts Allowed (Contra-Revenue)', accountType: 'REVENUE' as const, systemAccount: null, description: 'Promotional reductions and volume discounts granted' },

  // COST OF GOODS SOLD (5000 - 5999)
  { accountCode: '5000', accountName: 'Cost of Goods Sold (COGS)', accountType: 'EXPENSE' as const, systemAccount: 'COGS' as const, description: 'Cost of merchandise sold at retail or via portal' },
  { accountCode: '5100', accountName: 'Freight & Inbound Shipping', accountType: 'EXPENSE' as const, systemAccount: null, description: 'Freight paid to receive stock' },

  // OPERATING EXPENSES (6000 - 6999)
  { accountCode: '6100', accountName: 'Payment Processing & Gateway Fees', accountType: 'EXPENSE' as const, systemAccount: null, description: 'Stripe, EFTPOS, and merchant processing fees' },
  { accountCode: '6200', accountName: 'Cash Discrepancies & Till Variances', accountType: 'EXPENSE' as const, systemAccount: null, description: 'Register drawer shortages or overages on shift close' },
  { accountCode: '6300', accountName: 'Inventory Shrinkage & Write-Offs', accountType: 'EXPENSE' as const, systemAccount: null, description: 'Lost, damaged, or expired stock adjustments' },
  { accountCode: '6400', accountName: 'General Operating Expenses', accountType: 'EXPENSE' as const, systemAccount: null, description: 'Office supplies, rent, and general overhead' },
];

export const DEFAULT_TAX_RATES = [
  { code: 'GST', name: 'Goods & Services Tax (10%)', rate: 0.1000, isRecoverable: true, reportCategory: 'BAS_1A' },
  { code: 'FRE', name: 'GST Free Supplies (0%)', rate: 0.0000, isRecoverable: true, reportCategory: 'BAS_G3' },
  { code: 'INP', name: 'Input Taxed (0%)', rate: 0.0000, isRecoverable: false, reportCategory: 'BAS_G4' },
  { code: 'EXP', name: 'Export / Exempt (0%)', rate: 0.0000, isRecoverable: true, reportCategory: 'BAS_G2' }
];

export class AccountingService {
  /**
   * Initializes standard Chart of Accounts and Tax Rates for a tenant if not present
   */
  static async ensureStandardChartOfAccounts(tenantId: string, db: any = globalPrisma) {
    const existingAccounts = await db.chartOfAccount.count({ where: { tenantId } });
    if (existingAccounts === 0) {
      // Seed default Tax Rates first
      for (const tr of DEFAULT_TAX_RATES) {
        await db.taxRate.upsert({
          where: { tenantId_code: { tenantId, code: tr.code } },
          update: {},
          create: {
            tenantId,
            code: tr.code,
            name: tr.name,
            rate: tr.rate,
            isRecoverable: tr.isRecoverable,
            reportCategory: tr.reportCategory
          }
        });
      }

      const defaultGSTRate = await db.taxRate.findFirst({
        where: { tenantId, code: 'GST' }
      });

      // Seed Chart of Accounts
      for (const acc of DEFAULT_CHART_OF_ACCOUNTS) {
        await db.chartOfAccount.upsert({
          where: { tenantId_accountCode: { tenantId, accountCode: acc.accountCode } },
          update: {},
          create: {
            tenantId,
            accountCode: acc.accountCode,
            accountName: acc.accountName,
            accountType: acc.accountType,
            systemAccount: acc.systemAccount,
            taxRateId: (acc.accountType === 'REVENUE' || acc.accountType === 'EXPENSE') ? defaultGSTRate?.id : null,
            description: acc.description
          }
        });
      }
    }
  }

  /**
   * Generates a sequential journal entry number: JRN-YYYY-XXXX
   */
  static async getNextJournalNumber(tenantId: string, db: any = globalPrisma): Promise<string> {
    const year = new Date().getFullYear();
    const count = await db.journalEntry.count({
      where: {
        tenantId,
        entryNumber: { startsWith: `JRN-${year}-` }
      }
    });
    const seq = String(count + 1).padStart(4, '0');
    return `JRN-${year}-${seq}`;
  }

  /**
   * Posts an immutable double-entry journal entry with strict mathematical verification
   */
  static async postJournalEntry(tenantId: string, input: PostJournalInput, db: any = globalPrisma) {
    const entryDate = new Date(input.date);

    // 1. Verify Period Lock Date
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { workspaceSettings: true }
    });
    const lockDateStr = (tenant?.workspaceSettings as any)?.financialLockDate;
    if (lockDateStr) {
      const lockDate = new Date(lockDateStr);
      if (entryDate <= lockDate) {
        throw new Error(`Accounting period is locked up to ${lockDate.toISOString().split('T')[0]}. Cannot post transactions on or before lock date.`);
      }
    }

    // 2. Validate Double-Entry Mathematical Invariance: Sum(Debit) === Sum(Credit)
    let totalDebit = 0;
    let totalCredit = 0;

    for (const line of input.lines) {
      const d = Number(line.debit || 0);
      const c = Number(line.credit || 0);
      if (d < 0 || c < 0) {
        throw new Error('Journal lines cannot contain negative amounts. Use debits and credits correctly.');
      }
      if (d === 0 && c === 0) {
        throw new Error('Journal line must have either a debit or a credit amount.');
      }
      totalDebit += d;
      totalCredit += c;
    }

    // Round to 2 decimal places to avoid floating point precision traps
    const roundedDebit = Math.round(totalDebit * 100) / 100;
    const roundedCredit = Math.round(totalCredit * 100) / 100;

    if (Math.abs(roundedDebit - roundedCredit) > 0.001) {
      throw new Error(`Double-entry balance violation: Total Debits ($${roundedDebit.toFixed(2)}) must equal Total Credits ($${roundedCredit.toFixed(2)}). Variance: $${Math.abs(roundedDebit - roundedCredit).toFixed(2)}`);
    }

    // 3. Generate sequential entry number
    const entryNumber = await this.getNextJournalNumber(tenantId, db);

    // 4. Create Journal and Lines atomically in a single transaction
    const journal = await db.journalEntry.create({
      data: {
        tenantId,
        entryNumber,
        date: entryDate,
        sourceModule: input.sourceModule,
        sourceReferenceId: input.sourceReferenceId,
        narration: input.narration,
        createdByUserId: input.createdByUserId,
        lines: {
          create: input.lines.map(line => ({
            accountId: line.accountId,
            contactPartyId: line.contactPartyId || null,
            description: line.description || null,
            debit: line.debit,
            credit: line.credit,
            taxAmount: line.taxAmount || 0,
            taxRateId: line.taxRateId || null
          }))
        }
      },
      include: {
        lines: {
          include: {
            account: true,
            contactParty: {
              include: { person: true, organization: true }
            }
          }
        }
      }
    });

    // 5. Audit log
    await recordAudit({
      tenantId,
      action: 'JOURNAL_ENTRY_POSTED',
      category: 'SECURITY',
      resourceId: journal.id,
      resourceKey: journal.entryNumber,
      resourceTitle: journal.narration,
      description: `Journal ${journal.entryNumber} posted for $${roundedDebit.toFixed(2)} via ${input.sourceModule}`
    });

    return journal;
  }

  /**
   * Reverses a posted journal entry with an inverted mirror journal
   */
  static async reverseJournalEntry(tenantId: string, journalId: string, reason: string, userId?: string, db: any = globalPrisma) {
    const existing = await db.journalEntry.findUnique({
      where: { id: journalId },
      include: { lines: true }
    });

    if (!existing || existing.tenantId !== tenantId) {
      throw new Error('Journal entry not found');
    }

    if (existing.reversedByEntryId) {
      throw new Error(`Journal ${existing.entryNumber} has already been reversed.`);
    }

    const reversalLines: JournalLineInput[] = existing.lines.map((l: any) => ({
      accountId: l.accountId,
      debit: Number(l.credit), // Flip credit into debit
      credit: Number(l.debit), // Flip debit into credit
      taxAmount: l.taxAmount,
      taxRateId: l.taxRateId,
      contactPartyId: l.contactPartyId,
      description: `Reversal of ${existing.entryNumber}: ${l.description || ''}`
    }));

    const nextNumber = await this.getNextJournalNumber(tenantId, db);

    const reversalJournal = await db.journalEntry.create({
      data: {
        tenantId,
        entryNumber: nextNumber,
        date: new Date(),
        sourceModule: existing.sourceModule,
        sourceReferenceId: existing.id,
        narration: `Reversal of ${existing.entryNumber} (${reason})`,
        reversalOfEntryId: existing.id,
        createdByUserId: userId,
        lines: {
          create: reversalLines.map(line => ({
            accountId: line.accountId,
            contactPartyId: line.contactPartyId || null,
            description: line.description,
            debit: line.debit,
            credit: line.credit,
            taxAmount: line.taxAmount || 0,
            taxRateId: line.taxRateId || null
          }))
        }
      }
    });

    // Link original journal to reversal
    await db.journalEntry.update({
      where: { id: existing.id },
      data: { reversedByEntryId: reversalJournal.id }
    });

    await recordAudit({
      tenantId,
      action: 'JOURNAL_ENTRY_REVERSED',
      category: 'SECURITY',
      resourceId: reversalJournal.id,
      resourceKey: reversalJournal.entryNumber,
      resourceTitle: `Reversal of ${existing.entryNumber}`,
      description: `Journal ${existing.entryNumber} reversed by ${reversalJournal.entryNumber}. Reason: ${reason}`
    });

    return reversalJournal;
  }

  /**
   * Computes Trial Balance: Debits vs Credits per account as of a given date
   */
  static async getTrialBalance(tenantId: string, asOfDate: Date | any = new Date(), db: any = globalPrisma) {
    if (asOfDate && (asOfDate.chartOfAccount || typeof asOfDate.$connect === 'function')) {
      db = asOfDate;
      asOfDate = new Date();
    }
    await this.ensureStandardChartOfAccounts(tenantId, db);

    const accounts = await db.chartOfAccount.findMany({
      where: { tenantId, isActive: true },
      orderBy: { accountCode: 'asc' },
      include: {
        journalLines: {
          where: {
            journalEntry: {
              date: { lte: asOfDate }
            }
          }
        }
      }
    });

    let totalDebits = 0;
    let totalCredits = 0;

    const rows = accounts.map((acc: any) => {
      let debitSum = 0;
      let creditSum = 0;
      for (const line of acc.journalLines) {
        debitSum += Number(line.debit || 0);
        creditSum += Number(line.credit || 0);
      }

      let netDebit = 0;
      let netCredit = 0;

      // Normal balances
      if (acc.accountType === 'ASSET' || acc.accountType === 'EXPENSE') {
        const net = debitSum - creditSum;
        if (net >= 0) netDebit = net;
        else netCredit = Math.abs(net);
      } else {
        const net = creditSum - debitSum;
        if (net >= 0) netCredit = net;
        else netDebit = Math.abs(net);
      }

      totalDebits += netDebit;
      totalCredits += netCredit;

      return {
        id: acc.id,
        accountCode: acc.accountCode,
        accountName: acc.accountName,
        accountType: acc.accountType,
        systemAccount: acc.systemAccount,
        totalDebit: Math.round(netDebit * 100) / 100,
        totalCredit: Math.round(netCredit * 100) / 100
      };
    });

    return {
      asOfDate,
      rows,
      totalDebits: Math.round(totalDebits * 100) / 100,
      totalCredits: Math.round(totalCredits * 100) / 100,
      isBalanced: Math.abs(totalDebits - totalCredits) < 0.01
    };
  }

  /**
   * Computes Profit & Loss (Income Statement) for a date range
   */
  static async getProfitAndLoss(tenantId: string, startDate: Date, endDate: Date, db: any = globalPrisma) {
    await this.ensureStandardChartOfAccounts(tenantId, db);

    const accounts = await db.chartOfAccount.findMany({
      where: {
        tenantId,
        accountType: { in: ['REVENUE', 'EXPENSE'] }
      },
      include: {
        journalLines: {
          where: {
            journalEntry: {
              date: { gte: startDate, lte: endDate }
            }
          }
        }
      },
      orderBy: { accountCode: 'asc' }
    });

    let totalRevenue = 0;
    let totalCOGS = 0;
    let totalExpenses = 0;

    const revenueAccounts: any[] = [];
    const cogsAccounts: any[] = [];
    const expenseAccounts: any[] = [];

    for (const acc of accounts) {
      let d = 0;
      let c = 0;
      for (const line of acc.journalLines) {
        d += Number(line.debit || 0);
        c += Number(line.credit || 0);
      }

      if (acc.accountType === 'REVENUE') {
        // Revenue normal credit balance
        const balance = c - d;
        totalRevenue += balance;
        revenueAccounts.push({ ...acc, balance: Math.round(balance * 100) / 100 });
      } else if (acc.systemAccount === 'COGS') {
        const balance = d - c;
        totalCOGS += balance;
        cogsAccounts.push({ ...acc, balance: Math.round(balance * 100) / 100 });
      } else {
        const balance = d - c;
        totalExpenses += balance;
        expenseAccounts.push({ ...acc, balance: Math.round(balance * 100) / 100 });
      }
    }

    const grossProfit = totalRevenue - totalCOGS;
    const netProfit = grossProfit - totalExpenses;

    return {
      startDate,
      endDate,
      revenue: {
        accounts: revenueAccounts,
        total: Math.round(totalRevenue * 100) / 100
      },
      cogs: {
        accounts: cogsAccounts,
        total: Math.round(totalCOGS * 100) / 100
      },
      grossProfit: Math.round(grossProfit * 100) / 100,
      expenses: {
        accounts: expenseAccounts,
        total: Math.round(totalExpenses * 100) / 100
      },
      netProfit: Math.round(netProfit * 100) / 100
    };
  }

  /**
   * Computes Balance Sheet as of a given date
   */
  static async getBalanceSheet(tenantId: string, asOfDate: Date | any = new Date(), db: any = globalPrisma) {
    if (asOfDate && (asOfDate.chartOfAccount || typeof asOfDate.$connect === 'function')) {
      db = asOfDate;
      asOfDate = new Date();
    }
    await this.ensureStandardChartOfAccounts(tenantId, db);

    const accounts = await db.chartOfAccount.findMany({
      where: {
        tenantId,
        accountType: { in: ['ASSET', 'LIABILITY', 'EQUITY'] }
      },
      include: {
        journalLines: {
          where: {
            journalEntry: {
              date: { lte: asOfDate }
            }
          }
        }
      },
      orderBy: { accountCode: 'asc' }
    });

    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;

    const assetAccounts: any[] = [];
    const liabilityAccounts: any[] = [];
    const equityAccounts: any[] = [];

    for (const acc of accounts) {
      let d = 0;
      let c = 0;
      for (const line of acc.journalLines) {
        d += Number(line.debit || 0);
        c += Number(line.credit || 0);
      }

      if (acc.accountType === 'ASSET') {
        const balance = d - c;
        totalAssets += balance;
        assetAccounts.push({ ...acc, balance: Math.round(balance * 100) / 100 });
      } else if (acc.accountType === 'LIABILITY') {
        const balance = c - d;
        totalLiabilities += balance;
        liabilityAccounts.push({ ...acc, balance: Math.round(balance * 100) / 100 });
      } else if (acc.accountType === 'EQUITY') {
        const balance = c - d;
        totalEquity += balance;
        equityAccounts.push({ ...acc, balance: Math.round(balance * 100) / 100 });
      }
    }

    // Retained Earnings (net profit from inception to asOfDate)
    const pnl = await this.getProfitAndLoss(tenantId, new Date('2000-01-01'), asOfDate, db);
    const retainedEarnings = pnl.netProfit;
    totalEquity += retainedEarnings;

    return {
      asOfDate,
      assets: {
        accounts: assetAccounts,
        total: Math.round(totalAssets * 100) / 100
      },
      liabilities: {
        accounts: liabilityAccounts,
        total: Math.round(totalLiabilities * 100) / 100
      },
      equity: {
        accounts: equityAccounts,
        retainedEarnings: Math.round(retainedEarnings * 100) / 100,
        total: Math.round(totalEquity * 100) / 100
      },
      totalLiabilitiesAndEquity: Math.round((totalLiabilities + totalEquity) * 100) / 100,
      isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.05
    };
  }
}
