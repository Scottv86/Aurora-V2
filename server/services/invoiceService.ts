import { globalPrisma } from '../lib/prisma';
import { recordAudit } from '../lib/audit';
import { AccountingService } from './accountingService';

export interface InvoiceLineInput {
  catalogItemId?: string | null;
  variantId?: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  discountAmount?: number;
  taxRateId?: string | null;
  taxAmount?: number;
  accountId?: string | null; // Revenue Account
}

export interface CreateInvoiceInput {
  customerPartyId: string;
  issueDate: Date | string;
  dueDate: Date | string;
  currency?: string;
  notes?: string | null;
  lines: InvoiceLineInput[];
  status?: 'DRAFT' | 'AUTHORIZED';
}

export interface CreateBillInput {
  supplierPartyId: string;
  billNumber?: string | null;
  issueDate: Date | string;
  dueDate: Date | string;
  currency?: string;
  notes?: string | null;
  lines: {
    catalogItemId?: string | null;
    description: string;
    quantity: number;
    unitCost: number;
    taxRateId?: string | null;
    taxAmount?: number;
    accountId?: string | null; // Expense or Inventory Asset
  }[];
  status?: 'DRAFT' | 'AWAITING_PAYMENT';
}

export class InvoiceService {
  /**
   * Generates next sequential invoice number: INV-YYYY-XXXX
   */
  static async getNextInvoiceNumber(tenantId: string, db: any = globalPrisma): Promise<string> {
    const year = new Date().getFullYear();
    const count = await db.invoice.count({
      where: {
        tenantId,
        invoiceNumber: { startsWith: `INV-${year}-` }
      }
    });
    return `INV-${year}-${String(count + 1).padStart(4, '0')}`;
  }

  /**
   * Generates next sequential bill number: BILL-YYYY-XXXX
   */
  static async getNextBillNumber(tenantId: string, db: any = globalPrisma): Promise<string> {
    const year = new Date().getFullYear();
    const count = await db.bill.count({
      where: {
        tenantId,
        billNumber: { startsWith: `BILL-${year}-` }
      }
    });
    return `BILL-${year}-${String(count + 1).padStart(4, '0')}`;
  }

  /**
   * Creates and optionally authorizes a sales invoice
   */
  static async createInvoice(tenantId: string, input: CreateInvoiceInput, userId?: string, db: any = globalPrisma) {
    await AccountingService.ensureStandardChartOfAccounts(tenantId, db);

    const invoiceNumber = await this.getNextInvoiceNumber(tenantId, db);
    const defaultRevenueAcc = await db.chartOfAccount.findFirst({
      where: { tenantId, systemAccount: null, accountType: 'REVENUE' }
    });

    let subtotal = 0;
    let taxTotal = 0;
    let discountTotal = 0;

    const formattedLines = input.lines.map(line => {
      const qty = Number(line.quantity || 1);
      const price = Number(line.unitPrice || 0);
      const discount = Number(line.discountAmount || 0);
      const tax = Number(line.taxAmount || 0);
      const lineTotal = Math.round(((qty * price) - discount + tax) * 100) / 100;

      subtotal += (qty * price);
      discountTotal += discount;
      taxTotal += tax;

      return {
        catalogItemId: line.catalogItemId || null,
        variantId: line.variantId || null,
        description: line.description,
        quantity: qty,
        unitPrice: price,
        discountAmount: discount,
        taxRateId: line.taxRateId || null,
        taxAmount: tax,
        accountId: line.accountId || defaultRevenueAcc?.id || '',
        lineTotal
      };
    });

    const total = Math.round((subtotal - discountTotal + taxTotal) * 100) / 100;
    const initialStatus = input.status || 'DRAFT';

    const invoice = await db.invoice.create({
      data: {
        tenantId,
        invoiceNumber,
        customerPartyId: input.customerPartyId,
        issueDate: new Date(input.issueDate),
        dueDate: new Date(input.dueDate),
        currency: input.currency || 'AUD',
        subtotal: Math.round(subtotal * 100) / 100,
        discountTotal: Math.round(discountTotal * 100) / 100,
        taxTotal: Math.round(taxTotal * 100) / 100,
        total,
        amountPaid: 0,
        status: initialStatus,
        notes: input.notes || null,
        lines: { create: formattedLines }
      },
      include: {
        customer: { include: { person: true, organization: true } },
        lines: true
      }
    });

    // If authorized immediately, post to General Ledger
    if (initialStatus === 'AUTHORIZED') {
      await this.postInvoiceAuthorizationJournal(tenantId, invoice.id, userId, db);
    }

    await recordAudit({
      tenantId,
      action: 'INVOICE_CREATED',
      category: 'CREATION',
      resourceId: invoice.id,
      resourceKey: invoice.invoiceNumber,
      resourceTitle: `Invoice ${invoice.invoiceNumber}`,
      description: `Invoice ${invoice.invoiceNumber} created for $${total.toFixed(2)} (${initialStatus})`
    });

    return invoice;
  }

  /**
   * Authorizes an invoice and posts the sales journal to the General Ledger
   */
  static async authorizeInvoice(tenantId: string, invoiceId: string, userId?: string, db: any = globalPrisma) {
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      include: { lines: true, customer: true }
    });

    if (!invoice || invoice.tenantId !== tenantId) {
      throw new Error('Invoice not found');
    }

    if (invoice.status !== 'DRAFT' && invoice.status !== 'AWAITING_APPROVAL') {
      throw new Error(`Invoice cannot be authorized because it is currently ${invoice.status}`);
    }

    await db.invoice.update({
      where: { id: invoiceId },
      data: { status: 'AUTHORIZED' }
    });

    await this.postInvoiceAuthorizationJournal(tenantId, invoiceId, userId, db);

    return db.invoice.findUnique({
      where: { id: invoiceId },
      include: { lines: true, customer: { include: { person: true, organization: true } } }
    });
  }

  /**
   * Posts authorization journal:
   * Debit: 1200 Accounts Receivable ($Total)
   * Credit: Revenue Account ($Subtotal - Discount)
   * Credit: 2100 Sales Tax / GST Collected ($TaxTotal)
   */
  private static async postInvoiceAuthorizationJournal(tenantId: string, invoiceId: string, userId?: string, db: any = globalPrisma) {
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      include: { lines: true }
    });

    if (!invoice) return;

    const arAccount = await db.chartOfAccount.findFirst({
      where: { tenantId, systemAccount: 'AR' }
    });
    const taxPayableAccount = await db.chartOfAccount.findFirst({
      where: { tenantId, systemAccount: 'GST_PAYABLE' }
    });

    if (!arAccount) {
      throw new Error('System account for Accounts Receivable (1200) not found');
    }

    const journalLines: any[] = [
      {
        accountId: arAccount.id,
        debit: Number(invoice.total),
        credit: 0,
        contactPartyId: invoice.customerPartyId,
        description: `Receivable for ${invoice.invoiceNumber}`
      }
    ];

    // Revenue lines grouped by account
    for (const line of invoice.lines) {
      const netLine = Number(line.unitPrice) * Number(line.quantity) - Number(line.discountAmount);
      journalLines.push({
        accountId: line.accountId,
        debit: 0,
        credit: netLine,
        contactPartyId: invoice.customerPartyId,
        description: line.description
      });
    }

    // Tax line
    if (Number(invoice.taxTotal) > 0 && taxPayableAccount) {
      journalLines.push({
        accountId: taxPayableAccount.id,
        debit: 0,
        credit: Number(invoice.taxTotal),
        description: `GST/Tax collected on ${invoice.invoiceNumber}`
      });
    }

    const journal = await AccountingService.postJournalEntry(tenantId, {
      date: invoice.issueDate,
      sourceModule: 'INVOICE',
      sourceReferenceId: invoice.id,
      narration: `Invoice ${invoice.invoiceNumber} Authorized`,
      createdByUserId: userId,
      lines: journalLines
    }, db);

    await db.invoice.update({
      where: { id: invoice.id },
      data: { journalEntryId: journal.id }
    });
  }

  /**
   * Records a payment against an invoice (e.g. from bank feed, customer portal, or manual check)
   */
  static async recordInvoicePayment(
    tenantId: string, 
    invoiceId: string, 
    amount: number, 
    paymentMethod: string, 
    depositAccountId?: string,
    reference?: string,
    userId?: string,
    db: any = globalPrisma
  ) {
    const invoice = await db.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice || invoice.tenantId !== tenantId) {
      throw new Error('Invoice not found');
    }

    const payAmount = Number(amount);
    if (payAmount <= 0) {
      throw new Error('Payment amount must be greater than zero');
    }

    const newAmountPaid = Math.round((Number(invoice.amountPaid) + payAmount) * 100) / 100;
    const isFullyPaid = newAmountPaid >= Number(invoice.total);
    const newStatus = isFullyPaid ? 'PAID' : 'PARTIALLY_PAID';

    // 1. Post Payment Journal to GL:
    // Debit: Bank Account / Clearing (e.g. 1010 or 1055)
    // Credit: 1200 Accounts Receivable
    const arAccount = await db.chartOfAccount.findFirst({
      where: { tenantId, systemAccount: 'AR' }
    });
    const defaultBank = await db.chartOfAccount.findFirst({
      where: { tenantId, systemAccount: 'BANK' }
    });

    const bankAccountId = depositAccountId || defaultBank?.id;

    let paymentJournalId = null;
    if (arAccount && bankAccountId) {
      const journal = await AccountingService.postJournalEntry(tenantId, {
        date: new Date(),
        sourceModule: 'INVOICE',
        sourceReferenceId: invoice.id,
        narration: `Payment of $${payAmount.toFixed(2)} received for ${invoice.invoiceNumber}`,
        createdByUserId: userId,
        lines: [
          {
            accountId: bankAccountId,
            debit: payAmount,
            credit: 0,
            contactPartyId: invoice.customerPartyId,
            description: `Deposit for ${invoice.invoiceNumber} via ${paymentMethod}`
          },
          {
            accountId: arAccount.id,
            debit: 0,
            credit: payAmount,
            contactPartyId: invoice.customerPartyId,
            description: `Payment applied to ${invoice.invoiceNumber}`
          }
        ]
      }, db);
      paymentJournalId = journal.id;
    }

    // 2. Create payment record and update invoice
    const payment = await db.invoicePayment.create({
      data: {
        tenantId,
        invoiceId,
        amount: payAmount,
        paymentDate: new Date(),
        paymentMethod,
        reference: reference || null,
        journalEntryId: paymentJournalId
      }
    });

    await db.invoice.update({
      where: { id: invoiceId },
      data: {
        amountPaid: newAmountPaid,
        status: newStatus
      }
    });

    await recordAudit({
      tenantId,
      action: 'INVOICE_PAYMENT_RECORDED',
      category: 'CREATION',
      resourceId: invoice.id,
      resourceKey: invoice.invoiceNumber,
      resourceTitle: `Payment on ${invoice.invoiceNumber}`,
      description: `Recorded payment of $${payAmount.toFixed(2)} via ${paymentMethod}. Status: ${newStatus}`
    });

    return { payment, invoiceStatus: newStatus, amountPaid: newAmountPaid };
  }

  /**
   * Creates a supplier bill (Accounts Payable)
   */
  static async createBill(tenantId: string, input: CreateBillInput, userId?: string, db: any = globalPrisma) {
    await AccountingService.ensureStandardChartOfAccounts(tenantId, db);

    const billNumber = input.billNumber || (await this.getNextBillNumber(tenantId, db));
    const defaultExpenseAcc = await db.chartOfAccount.findFirst({
      where: { tenantId, systemAccount: null, accountType: 'EXPENSE' }
    });

    let subtotal = 0;
    let taxTotal = 0;

    const formattedLines = input.lines.map(line => {
      const qty = Number(line.quantity || 1);
      const cost = Number(line.unitCost || 0);
      const tax = Number(line.taxAmount || 0);
      const lineTotal = Math.round(((qty * cost) + tax) * 100) / 100;

      subtotal += (qty * cost);
      taxTotal += tax;

      return {
        catalogItemId: line.catalogItemId || null,
        description: line.description,
        quantity: qty,
        unitCost: cost,
        taxRateId: line.taxRateId || null,
        taxAmount: tax,
        accountId: line.accountId || defaultExpenseAcc?.id || '',
        lineTotal
      };
    });

    const total = Math.round((subtotal + taxTotal) * 100) / 100;
    const initialStatus = input.status || 'AWAITING_PAYMENT';

    const bill = await db.bill.create({
      data: {
        tenantId,
        billNumber,
        supplierPartyId: input.supplierPartyId,
        issueDate: new Date(input.issueDate),
        dueDate: new Date(input.dueDate),
        currency: input.currency || 'AUD',
        subtotal: Math.round(subtotal * 100) / 100,
        taxTotal: Math.round(taxTotal * 100) / 100,
        total,
        amountPaid: 0,
        status: initialStatus,
        notes: input.notes || null,
        lines: { create: formattedLines }
      },
      include: {
        supplier: { include: { person: true, organization: true } },
        lines: true
      }
    });

    // If awaiting payment, post AP journal
    if (initialStatus === 'AWAITING_PAYMENT') {
      const apAccount = await db.chartOfAccount.findFirst({
        where: { tenantId, systemAccount: 'AP' }
      });
      const taxPaidAccount = await db.chartOfAccount.findFirst({
        where: { tenantId, systemAccount: 'GST_PAID' }
      });

      if (apAccount) {
        const journalLines: any[] = [
          {
            accountId: apAccount.id,
            debit: 0,
            credit: total,
            contactPartyId: bill.supplierPartyId,
            description: `Accounts Payable for Bill ${bill.billNumber}`
          }
        ];

        for (const line of bill.lines) {
          journalLines.push({
            accountId: line.accountId,
            debit: Number(line.unitCost) * Number(line.quantity),
            credit: 0,
            contactPartyId: bill.supplierPartyId,
            description: line.description
          });
        }

        if (taxTotal > 0 && taxPaidAccount) {
          journalLines.push({
            accountId: taxPaidAccount.id,
            debit: taxTotal,
            credit: 0,
            description: `Input Tax Credit on Bill ${bill.billNumber}`
          });
        }

        const journal = await AccountingService.postJournalEntry(tenantId, {
          date: bill.issueDate,
          sourceModule: 'BILL',
          sourceReferenceId: bill.id,
          narration: `Supplier Bill ${bill.billNumber} Approved`,
          createdByUserId: userId,
          lines: journalLines
        }, db);

        await db.bill.update({
          where: { id: bill.id },
          data: { journalEntryId: journal.id }
        });
      }
    }

    return bill;
  }

  /**
   * Computes Aged Receivables (Debtors) buckets
   */
  static async getAgedReceivables(tenantId: string, asOfDate: Date = new Date(), db: any = globalPrisma) {
    const invoices = await db.invoice.findMany({
      where: {
        tenantId,
        status: { in: ['AUTHORIZED', 'PARTIALLY_PAID', 'OVERDUE'] }
      },
      include: {
        customer: { include: { person: true, organization: true } }
      }
    });

    const now = asOfDate.getTime();
    const buckets = {
      current: 0,
      days30: 0,
      days60: 0,
      days90Plus: 0,
      total: 0
    };

    const details = invoices.map((inv: any) => {
      const balance = Number(inv.total) - Number(inv.amountPaid);
      const dueTime = new Date(inv.dueDate).getTime();
      const diffDays = Math.floor((now - dueTime) / (1000 * 60 * 60 * 24));

      let bucket = 'current';
      if (diffDays > 90) bucket = 'days90Plus';
      else if (diffDays > 60) bucket = 'days60';
      else if (diffDays > 30) bucket = 'days30';

      (buckets as any)[bucket] += balance;
      buckets.total += balance;

      const customerName = inv.customer?.organization?.legalName || 
        `${inv.customer?.person?.firstName || ''} ${inv.customer?.person?.lastName || ''}`.trim() || 'Unknown';

      return {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        customerName,
        issueDate: inv.issueDate,
        dueDate: inv.dueDate,
        daysOverdue: Math.max(0, diffDays),
        balance: Math.round(balance * 100) / 100,
        bucket
      };
    });

    return {
      asOfDate,
      buckets: {
        current: Math.round(buckets.current * 100) / 100,
        days30: Math.round(buckets.days30 * 100) / 100,
        days60: Math.round(buckets.days60 * 100) / 100,
        days90Plus: Math.round(buckets.days90Plus * 100) / 100,
        total: Math.round(buckets.total * 100) / 100
      },
      invoices: details
    };
  }
}
