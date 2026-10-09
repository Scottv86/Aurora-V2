import { globalPrisma } from '../lib/prisma';
import { recordAudit } from '../lib/audit';
import { AccountingService } from './accountingService';
import { InvoiceService } from './invoiceService';

export interface BankLineInput {
  transactionDate: Date | string;
  amount: number;
  payee?: string | null;
  description?: string | null;
  reference?: string | null;
}

export class ReconciliationService {
  /**
   * Imports raw bank statement lines
   */
  static async importLines(tenantId: string, bankAccountId: string, lines: BankLineInput[], db: any = globalPrisma) {
    const formatted = lines.map(line => ({
      tenantId,
      bankAccountId,
      transactionDate: new Date(line.transactionDate),
      amount: Number(line.amount),
      payee: line.payee || null,
      description: line.description || null,
      reference: line.reference || null,
      isReconciled: false
    }));

    const result = await db.bankStatementLine.createMany({
      data: formatted
    });

    await recordAudit({
      tenantId,
      action: 'BANK_STATEMENT_IMPORTED',
      category: 'CREATION',
      resourceId: bankAccountId,
      resourceTitle: 'Bank Statement Import',
      description: `Imported ${result.count} bank statement lines`
    });

    return result;
  }

  /**
   * Finds suggested matches for an unreconciled bank line:
   * 1. Exact amount match on open Invoices (Receivables)
   * 2. Exact amount match on open Bills (Payables)
   * 3. POS Clearing card settlement batches
   * 4. Online gateway (Stripe) clearing batches
   */
  static async findSuggestedMatches(tenantId: string, lineId: string, db: any = globalPrisma) {
    const line = await db.bankStatementLine.findUnique({
      where: { id: lineId }
    });

    if (!line || line.tenantId !== tenantId) {
      throw new Error('Bank statement line not found');
    }

    const amount = Number(line.amount);
    const suggestions: any[] = [];

    if (amount > 0) {
      // INFLOW (Deposit) -> Likely Invoice Payment, POS Card Batch, or Stripe Payout

      // 1. Invoices awaiting payment with matching total
      const matchingInvoices = await db.invoice.findMany({
        where: {
          tenantId,
          status: { in: ['AUTHORIZED', 'PARTIALLY_PAID'] },
          total: { gte: amount - 0.50, lte: amount + 0.50 }
        },
        include: {
          customer: { include: { person: true, organization: true } }
        },
        take: 5
      });

      for (const inv of matchingInvoices) {
        suggestions.push({
          type: 'INVOICE',
          id: inv.id,
          reference: inv.invoiceNumber,
          description: `Customer Invoice: ${inv.customer?.organization?.legalName || inv.customer?.person?.firstName || 'Customer'}`,
          amount: Number(inv.total),
          confidence: Math.abs(Number(inv.total) - amount) < 0.01 ? 'EXACT' : 'FUZZY'
        });
      }

      // 2. POS Card Clearing Account balance
      const posCardClearing = await db.chartOfAccount.findFirst({
        where: { tenantId, systemAccount: 'POS_CLEARING' },
        include: { journalLines: true }
      });

      if (posCardClearing) {
        let posBalance = 0;
        for (const jl of posCardClearing.journalLines) {
          posBalance += (Number(jl.debit) - Number(jl.credit));
        }
        if (posBalance > 0) {
          suggestions.push({
            type: 'POS_CLEARING',
            id: posCardClearing.id,
            reference: 'POS Card Settlement',
            description: `Aggregated POS card clearing balance ($${posBalance.toFixed(2)} pending)`,
            amount: posBalance,
            confidence: Math.abs(posBalance - amount) < 5.00 ? 'HIGH' : 'MEDIUM'
          });
        }
      }

      // 3. Online Gateway Clearing balance
      const gatewayClearing = await db.chartOfAccount.findFirst({
        where: { tenantId, systemAccount: 'GATEWAY_CLEARING' },
        include: { journalLines: true }
      });

      if (gatewayClearing) {
        let gwBalance = 0;
        for (const jl of gatewayClearing.journalLines) {
          gwBalance += (Number(jl.debit) - Number(jl.credit));
        }
        if (gwBalance > 0) {
          suggestions.push({
            type: 'GATEWAY_CLEARING',
            id: gatewayClearing.id,
            reference: 'Stripe Online Payout',
            description: `Online portal gateway clearing balance ($${gwBalance.toFixed(2)} pending)`,
            amount: gwBalance,
            confidence: Math.abs(gwBalance - amount) < 5.00 ? 'HIGH' : 'MEDIUM'
          });
        }
      }
    } else {
      // OUTFLOW (Withdrawal) -> Likely Supplier Bill or Operating Expense
      const absAmount = Math.abs(amount);

      const matchingBills = await db.bill.findMany({
        where: {
          tenantId,
          status: 'AWAITING_PAYMENT',
          total: { gte: absAmount - 0.50, lte: absAmount + 0.50 }
        },
        include: {
          supplier: { include: { person: true, organization: true } }
        },
        take: 5
      });

      for (const bill of matchingBills) {
        suggestions.push({
          type: 'BILL',
          id: bill.id,
          reference: bill.billNumber,
          description: `Supplier Bill: ${bill.supplier?.organization?.legalName || bill.supplier?.person?.firstName || 'Supplier'}`,
          amount: Number(bill.total),
          confidence: Math.abs(Number(bill.total) - absAmount) < 0.01 ? 'EXACT' : 'FUZZY'
        });
      }
    }

    return {
      line,
      suggestions
    };
  }

  /**
   * Reconciles a bank line against a selected match and creates the clearing journal entry
   */
  static async reconcileLine(
    tenantId: string, 
    lineId: string, 
    matchType: 'INVOICE' | 'BILL' | 'POS_CLEARING' | 'GATEWAY_CLEARING' | 'MANUAL_EXPENSE', 
    matchId?: string, 
    feeAmount: number = 0,
    expenseAccountId?: string,
    userId?: string, 
    db: any = globalPrisma
  ) {
    const line = await db.bankStatementLine.findUnique({
      where: { id: lineId },
      include: { bankAccount: true }
    });

    if (!line || line.tenantId !== tenantId) {
      throw new Error('Bank statement line not found');
    }

    if (line.isReconciled) {
      throw new Error('This transaction is already reconciled.');
    }

    const lineAmount = Number(line.amount);
    const fee = Number(feeAmount || 0);
    let matchedJournalId = null;

    if (matchType === 'INVOICE' && matchId) {
      // Invoice match: record payment on invoice
      const result = await InvoiceService.recordInvoicePayment(
        tenantId,
        matchId,
        lineAmount,
        'BANK_RECONCILIATION',
        line.bankAccountId,
        line.reference || line.description || undefined,
        userId,
        db
      );
      matchedJournalId = result.payment.journalEntryId;
    } else if (matchType === 'POS_CLEARING' || matchType === 'GATEWAY_CLEARING') {
      // Clearing match (e.g. Stripe or EFTPOS deposit into bank)
      // Debit: Bank Account ($lineAmount)
      // Debit: Gateway Fees Expense ($fee)
      // Credit: Clearing Account ($lineAmount + $fee)
      const clearingSystemAcc = matchType === 'POS_CLEARING' ? 'POS_CLEARING' : 'GATEWAY_CLEARING';
      const clearingAcc = await db.chartOfAccount.findFirst({
        where: { tenantId, systemAccount: clearingSystemAcc }
      });
      const feeAcc = await db.chartOfAccount.findFirst({
        where: { tenantId, accountCode: '6100' } // Payment Processing & Gateway Fees
      });

      if (!clearingAcc) {
        throw new Error(`Clearing account ${clearingSystemAcc} not configured.`);
      }

      const grossAmount = lineAmount + fee;
      const lines: any[] = [
        {
          accountId: line.bankAccountId,
          debit: lineAmount,
          credit: 0,
          description: `Bank deposit from ${clearingAcc.accountName}`
        },
        {
          accountId: clearingAcc.id,
          debit: 0,
          credit: grossAmount,
          description: `Clearing settlement: ${line.reference || line.description || ''}`
        }
      ];

      if (fee > 0 && feeAcc) {
        lines.push({
          accountId: feeAcc.id,
          debit: fee,
          credit: 0,
          description: `Merchant fee deduction on settlement`
        });
      }

      const journal = await AccountingService.postJournalEntry(tenantId, {
        date: line.transactionDate,
        sourceModule: 'BANK_RECONCILIATION',
        sourceReferenceId: line.id,
        narration: `Bank Reconciliation: ${clearingAcc.accountName} settlement`,
        createdByUserId: userId,
        lines
      }, db);

      matchedJournalId = journal.id;
    } else if (matchType === 'MANUAL_EXPENSE' && expenseAccountId) {
      // Quick rule categorization
      const isOutflow = lineAmount < 0;
      const absVal = Math.abs(lineAmount);

      const journal = await AccountingService.postJournalEntry(tenantId, {
        date: line.transactionDate,
        sourceModule: 'BANK_RECONCILIATION',
        sourceReferenceId: line.id,
        narration: `Bank Transaction: ${line.payee || line.description || 'Expense'}`,
        createdByUserId: userId,
        lines: [
          {
            accountId: expenseAccountId,
            debit: isOutflow ? absVal : 0,
            credit: isOutflow ? 0 : absVal,
            description: line.description || line.payee || ''
          },
          {
            accountId: line.bankAccountId,
            debit: isOutflow ? 0 : absVal,
            credit: isOutflow ? absVal : 0,
            description: `Bank settlement`
          }
        ]
      }, db);

      matchedJournalId = journal.id;
    }

    // Mark line reconciled
    const updatedLine = await db.bankStatementLine.update({
      where: { id: lineId },
      data: {
        isReconciled: true,
        matchedJournalId
      }
    });

    await recordAudit({
      tenantId,
      action: 'BANK_LINE_RECONCILED',
      category: 'SECURITY',
      resourceId: line.id,
      resourceTitle: 'Reconciled Bank Transaction',
      description: `Reconciled $${lineAmount.toFixed(2)} against ${matchType}`
    });

    return updatedLine;
  }
}
