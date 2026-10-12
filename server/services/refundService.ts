import { globalPrisma } from '../lib/prisma';
import { recordAudit } from '../lib/audit';
import { AccountingService } from './accountingService';
import { InventoryService } from './inventoryService';
import { TransactionService } from './transactionService';
import { VoucherService } from './voucherService';

export interface RefundItemInput {
  catalogItemId?: string | null;
  variantId?: string | null;
  title: string;
  quantity: number;
  unitPrice: number;
  unitCost?: number;
  taxRate?: number;
  isRestocked?: boolean;
}

export interface ProcessPosRefundInput {
  tenantId: string;
  orderId: string;
  items: RefundItemInput[];
  refundMethod: 'ORIGINAL_TENDER' | 'CASH' | 'CARD' | 'VOUCHER' | 'STORE_CREDIT';
  reason: 'CUSTOMER_RETURN' | 'DEFECTIVE_GOODS' | 'DUPLICATE_CHARGE' | 'INCORRECT_PRICING' | 'ORDER_CANCELLED' | 'GOODWILL' | 'OTHER';
  reasonNotes?: string;
  processedByUserId?: string;
  managerApproval?: boolean;
}

export interface ProcessBlindRefundInput {
  tenantId: string;
  amount: number;
  taxAmount?: number;
  items?: RefundItemInput[];
  refundMethod: 'CASH' | 'CARD' | 'VOUCHER' | 'STORE_CREDIT';
  reason: 'CUSTOMER_RETURN' | 'DEFECTIVE_GOODS' | 'DUPLICATE_CHARGE' | 'INCORRECT_PRICING' | 'ORDER_CANCELLED' | 'GOODWILL' | 'OTHER';
  reasonNotes?: string;
  customerPartyId?: string | null;
  processedByUserId?: string;
  managerApproval?: boolean;
}

export class RefundService {
  /**
   * Generates sequential refund number (e.g. REF-20261012-0042)
   */
  static async generateRefundNumber(tenantId: string, db: any = globalPrisma): Promise<string> {
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await db.refund.count({
      where: {
        tenantId,
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0))
        }
      }
    });
    const seq = String(count + 1).padStart(4, '0');
    return `REF-${todayStr}-${seq}`;
  }

  /**
   * Processes a refund against an existing Point of Sale order
   */
  static async processPosRefund(input: ProcessPosRefundInput, db: any = globalPrisma) {
    const { tenantId, orderId, items, refundMethod, reason, reasonNotes, processedByUserId } = input;

    // 1. Fetch order with items and past refunds
    const order = await db.posOrder.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        payments: true,
        refunds: {
          include: { items: true }
        },
        transactions: true
      }
    });

    if (!order || order.tenantId !== tenantId) {
      throw new Error('POS Order not found');
    }

    if (order.status === 'VOIDED') {
      throw new Error('Cannot refund a voided order');
    }

    if (items.length === 0) {
      throw new Error('At least one item must be specified for refund');
    }

    // 2. Calculate refund gross and tax amounts
    let totalGross = 0;
    let totalTax = 0;
    let totalCostRestocked = 0;

    for (const item of items) {
      const qty = Number(item.quantity);
      const price = Number(item.unitPrice);
      const rate = item.taxRate !== undefined ? Number(item.taxRate) : 0.10; // default 10% GST
      const lineTotal = Math.round(qty * price * 100) / 100;
      
      // Calculate embedded GST: lineTotal - (lineTotal / (1 + rate))
      const lineTax = rate > 0 ? Math.round((lineTotal - (lineTotal / (1 + rate))) * 100) / 100 : 0;
      
      totalGross += lineTotal;
      totalTax += lineTax;

      if (item.isRestocked && item.unitCost) {
        totalCostRestocked += Math.round(qty * Number(item.unitCost) * 100) / 100;
      }
    }

    totalGross = Math.round(totalGross * 100) / 100;
    totalTax = Math.round(totalTax * 100) / 100;

    // Validate that this refund does not exceed remaining order amount
    const pastRefundTotal = (order.refunds || []).reduce((sum: number, r: any) => sum + Number(r.amount), 0);
    const maxRefundable = Math.round((Number(order.total) - pastRefundTotal) * 100) / 100;

    if (totalGross > maxRefundable + 0.01) {
      throw new Error(`Refund amount ($${totalGross.toFixed(2)}) exceeds remaining refundable order balance ($${maxRefundable.toFixed(2)})`);
    }

    // 3. Resolve tender method
    let resolvedTender = refundMethod;
    if (refundMethod === 'ORIGINAL_TENDER') {
      const primaryPayment = order.payments[0];
      resolvedTender = primaryPayment ? primaryPayment.tenderType : 'CASH';
    }

    // 4. Determine Chart of Accounts codes
    await AccountingService.ensureStandardChartOfAccounts(tenantId, db);
    const accounts = await db.chartOfAccount.findMany({ where: { tenantId } });
    const accMap = new Map<string, any>(accounts.map((a: any) => [a.accountCode, a]));

    const revenueAcc = accMap.get('4000') || accounts.find((a: any) => a.accountType === 'REVENUE');
    const gstAcc = accMap.get('2100') || accounts.find((a: any) => a.systemAccount === 'GST_PAYABLE');
    
    let tenderAcc = accMap.get('1010'); // Default Operating Bank
    if (resolvedTender === 'CASH') {
      tenderAcc = accMap.get('1020') || tenderAcc; // Petty cash / register till
    } else if (resolvedTender === 'CARD') {
      tenderAcc = accMap.get('1050') || tenderAcc; // POS Card Clearing
    } else if (resolvedTender === 'VOUCHER' || resolvedTender === 'STORE_CREDIT') {
      tenderAcc = accMap.get('2200') || tenderAcc; // Voucher liability
    }

    const inventoryAssetAcc = accMap.get('1300');
    const cogsAcc = accMap.get('5000');

    if (!revenueAcc || !gstAcc || !tenderAcc) {
      throw new Error('Required Chart of Accounts records not configured for refund processing');
    }

    // 5. Build balancing double-entry journal lines
    // Debit Revenue (amount ex GST)
    // Debit GST Collected (tax reversal)
    // Credit Tender account (cash/bank/card/voucher out)
    const netRevenueDebit = Math.round((totalGross - totalTax) * 100) / 100;
    const journalLines: any[] = [
      {
        accountId: revenueAcc.id,
        contactPartyId: order.customerPartyId || null,
        description: `Sales Return (${reason}): POS Order #${order.orderNumber}`,
        debit: netRevenueDebit,
        credit: 0,
        taxAmount: totalTax
      },
      {
        accountId: gstAcc.id,
        contactPartyId: order.customerPartyId || null,
        description: `GST Reclaimed on Return: POS Order #${order.orderNumber}`,
        debit: totalTax,
        credit: 0
      },
      {
        accountId: tenderAcc.id,
        contactPartyId: order.customerPartyId || null,
        description: `Refund Payout via ${resolvedTender}: POS Order #${order.orderNumber}`,
        debit: 0,
        credit: totalGross
      }
    ];

    // If restocked and cost > 0:
    // Debit Inventory Asset (1300), Credit COGS (5000)
    if (totalCostRestocked > 0 && inventoryAssetAcc && cogsAcc) {
      journalLines.push(
        {
          accountId: inventoryAssetAcc.id,
          description: `Inventory Restock Valuation: POS Order #${order.orderNumber}`,
          debit: totalCostRestocked,
          credit: 0
        },
        {
          accountId: cogsAcc.id,
          description: `COGS Reversal on Return: POS Order #${order.orderNumber}`,
          debit: 0,
          credit: totalCostRestocked
        }
      );
    }

    const refundNumber = await this.generateRefundNumber(tenantId, db);

    // 6. Post Journal Entry
    const journal = await AccountingService.createJournalEntry({
      tenantId,
      date: new Date().toISOString(),
      sourceModule: 'REFUND',
      sourceReferenceId: refundNumber,
      narration: `POS Order Refund ${refundNumber} for #${order.orderNumber} ($${totalGross.toFixed(2)})`,
      createdByUserId,
      lines: journalLines
    }, db);

    // 7. Restock physical inventory in InventoryService
    for (const item of items) {
      if (item.isRestocked && item.catalogItemId) {
        try {
          await InventoryService.recordMovement(tenantId, {
            catalogItemId: item.catalogItemId,
            variantId: item.variantId || null,
            quantityDelta: Number(item.quantity), // positive delta for restocking
            movementType: 'POS_RETURN',
            unitCost: Number(item.unitCost || 0),
            referenceId: refundNumber,
            notes: `Restocked via POS Refund ${refundNumber} (${reason})`
          }, processedByUserId, db);
        } catch (invErr) {
          console.warn(`[RefundService] Failed to restock catalog item ${item.catalogItemId}:`, invErr);
        }
      }
    }

    // 8. Find matching parent PaymentTransaction if exists
    const parentTxn = order.transactions && order.transactions.length > 0 ? order.transactions[0] : null;

    // 9. Create Refund record with line items
    const refund = await db.refund.create({
      data: {
        tenantId,
        refundNumber,
        paymentTransactionId: parentTxn?.id || null,
        posOrderId: order.id,
        amount: totalGross,
        taxAmount: totalTax,
        refundMethod: resolvedTender,
        reason,
        reasonNotes: reasonNotes || null,
        restocked: items.some(i => i.isRestocked),
        journalEntryId: journal.id,
        processedByUserId: processedByUserId || null,
        items: {
          create: items.map(item => ({
            catalogItemId: item.catalogItemId || null,
            variantId: item.variantId || null,
            title: item.title,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
            unitCost: Number(item.unitCost || 0),
            taxRate: Number(item.taxRate || 0.10),
            lineTotal: Math.round(Number(item.quantity) * Number(item.unitPrice) * 100) / 100,
            isRestocked: Boolean(item.isRestocked)
          }))
        }
      },
      include: {
        items: true,
        journalEntry: true
      }
    });

    // 10. Record negative PaymentTransaction in universal ledger
    await TransactionService.recordTransaction({
      tenantId,
      channel: 'POS',
      type: 'REFUND',
      status: 'SUCCEEDED',
      grossAmount: -totalGross,
      taxAmount: -totalTax,
      netAmount: -totalGross,
      paymentMethod: resolvedTender,
      customerPartyId: order.customerPartyId || null,
      posOrderId: order.id,
      journalEntryId: journal.id,
      metadata: {
        refundId: refund.id,
        refundNumber,
        originalOrderNumber: order.orderNumber,
        reason
      }
    }, db);

    // 11. Update Order status
    const newTotalRefunded = pastRefundTotal + totalGross;
    const isFullRefund = newTotalRefunded >= (Number(order.total) - 0.01);
    const newOrderStatus = isFullRefund ? 'REFUNDED' : 'PARTIALLY_REFUNDED';

    await db.posOrder.update({
      where: { id: order.id },
      data: { status: newOrderStatus }
    });

    // Also update parent transaction status if exists
    if (parentTxn) {
      await db.paymentTransaction.update({
        where: { id: parentTxn.id },
        data: {
          status: isFullRefund ? 'REFUNDED' : 'PARTIALLY_REFUNDED'
        }
      });
    }

    await recordAudit({
      tenantId,
      action: 'pos.order_refunded',
      entityId: refund.id,
      entityType: 'Refund',
      userId: processedByUserId,
      changes: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        refundNumber,
        amount: totalGross,
        status: newOrderStatus
      }
    });

    let issuedVoucher = null;
    if (resolvedTender === 'STORE_CREDIT' || resolvedTender === 'VOUCHER') {
      try {
        const scCode = VoucherService.generateCode('SC');
        issuedVoucher = await VoucherService.issueVoucher(tenantId, {
          type: 'STORE_CREDIT',
          initialBalance: totalGross,
          recipientPartyId: order.customerPartyId || null,
          expiresAt: null,
          code: scCode,
          notes: `Store Credit issued via POS Refund ${refundNumber}`
        }, processedByUserId, db);
      } catch (vcErr) {
        console.warn(`[RefundService] Failed to auto-generate store credit voucher:`, vcErr);
      }
    }

    return {
      ...refund,
      voucher: issuedVoucher
    };
  }

  /**
   * Processes a Blind Return (No Original Receipt)
   * Requires Manager Approval
   */
  static async processBlindRefund(input: ProcessBlindRefundInput, db: any = globalPrisma) {
    const { tenantId, amount, taxAmount, items = [], refundMethod, reason, reasonNotes, customerPartyId, processedByUserId, managerApproval } = input;

    if (!managerApproval) {
      throw new Error('Manager approval is required to issue a refund without an original receipt');
    }

    const totalGross = Math.round(Number(amount) * 100) / 100;
    const totalTax = taxAmount !== undefined 
      ? Math.round(Number(taxAmount) * 100) / 100 
      : Math.round((totalGross - (totalGross / 1.10)) * 100) / 100;

    await AccountingService.ensureStandardChartOfAccounts(tenantId, db);
    const accounts = await db.chartOfAccount.findMany({ where: { tenantId } });
    const accMap = new Map<string, any>(accounts.map((a: any) => [a.accountCode, a]));

    const revenueAcc = accMap.get('4000') || accounts.find((a: any) => a.accountType === 'REVENUE');
    const gstAcc = accMap.get('2100') || accounts.find((a: any) => a.systemAccount === 'GST_PAYABLE');
    let tenderAcc = accMap.get('1010');

    if (refundMethod === 'CASH') tenderAcc = accMap.get('1020') || tenderAcc;
    else if (refundMethod === 'CARD') tenderAcc = accMap.get('1050') || tenderAcc;
    else if (refundMethod === 'VOUCHER' || refundMethod === 'STORE_CREDIT') tenderAcc = accMap.get('2200') || tenderAcc;

    const netRevenueDebit = Math.round((totalGross - totalTax) * 100) / 100;
    const refundNumber = await this.generateRefundNumber(tenantId, db);

    const journal = await AccountingService.createJournalEntry({
      tenantId,
      date: new Date().toISOString(),
      sourceModule: 'REFUND',
      sourceReferenceId: refundNumber,
      narration: `Blind Refund ${refundNumber} (${reason}) via ${refundMethod} ($${totalGross.toFixed(2)})`,
      createdByUserId,
      lines: [
        {
          accountId: revenueAcc.id,
          contactPartyId: customerPartyId || null,
          description: `Blind Return (${reason})`,
          debit: netRevenueDebit,
          credit: 0,
          taxAmount: totalTax
        },
        {
          accountId: gstAcc.id,
          contactPartyId: customerPartyId || null,
          description: `GST Reversal on Blind Return`,
          debit: totalTax,
          credit: 0
        },
        {
          accountId: tenderAcc.id,
          contactPartyId: customerPartyId || null,
          description: `Blind Refund Payout via ${refundMethod}`,
          debit: 0,
          credit: totalGross
        }
      ]
    }, db);

    // Restock items if provided
    for (const item of items) {
      if (item.isRestocked && item.catalogItemId) {
        try {
          await InventoryService.recordMovement(tenantId, {
            catalogItemId: item.catalogItemId,
            variantId: item.variantId || null,
            quantityDelta: Number(item.quantity),
            movementType: 'POS_RETURN',
            unitCost: Number(item.unitCost || 0),
            referenceId: refundNumber,
            notes: `Blind Refund restock ${refundNumber}`
          }, processedByUserId, db);
        } catch (_) {}
      }
    }

    const refund = await db.refund.create({
      data: {
        tenantId,
        refundNumber,
        amount: totalGross,
        taxAmount: totalTax,
        refundMethod,
        reason,
        reasonNotes: `[BLIND RETURN - APPROVED] ${reasonNotes || ''}`.trim(),
        restocked: items.some(i => i.isRestocked),
        journalEntryId: journal.id,
        processedByUserId: processedByUserId || null,
        items: {
          create: items.map(item => ({
            catalogItemId: item.catalogItemId || null,
            variantId: item.variantId || null,
            title: item.title,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
            unitCost: Number(item.unitCost || 0),
            taxRate: Number(item.taxRate || 0.10),
            lineTotal: Math.round(Number(item.quantity) * Number(item.unitPrice) * 100) / 100,
            isRestocked: Boolean(item.isRestocked)
          }))
        }
      },
      include: { items: true, journalEntry: true }
    });

    await TransactionService.recordTransaction({
      tenantId,
      channel: 'POS',
      type: 'REFUND',
      status: 'SUCCEEDED',
      grossAmount: -totalGross,
      taxAmount: -totalTax,
      netAmount: -totalGross,
      paymentMethod: refundMethod,
      customerPartyId: customerPartyId || null,
      journalEntryId: journal.id,
      metadata: {
        refundId: refund.id,
        refundNumber,
        isBlindRefund: true,
        reason
      }
    }, db);

    let issuedVoucher = null;
    if (refundMethod === 'STORE_CREDIT' || refundMethod === 'VOUCHER') {
      try {
        const scCode = VoucherService.generateCode('SC');
        issuedVoucher = await VoucherService.issueVoucher(tenantId, {
          type: 'STORE_CREDIT',
          initialBalance: totalGross,
          recipientPartyId: customerPartyId || null,
          expiresAt: null,
          code: scCode,
          notes: `Store Credit issued via Blind Return ${refundNumber}`
        }, processedByUserId, db);
      } catch (vcErr) {
        console.warn(`[RefundService] Failed to auto-generate store credit voucher:`, vcErr);
      }
    }

    return {
      ...refund,
      voucher: issuedVoucher
    };
  }

  /**
   * Processes a refund / credit note against a customer invoice
   */
  static async processInvoiceRefund(input: {
    tenantId: string;
    invoiceId: string;
    amount: number;
    reason: any;
    reasonNotes?: string;
    refundMethod?: string;
    processedByUserId?: string;
  }, db: any = globalPrisma) {
    const { tenantId, invoiceId, amount, reason, reasonNotes, refundMethod = 'BANK_TRANSFER', processedByUserId } = input;

    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      include: { customer: true, payments: true, transactions: true }
    });

    if (!invoice || invoice.tenantId !== tenantId) {
      throw new Error('Invoice not found');
    }

    const refundAmount = Math.round(Number(amount) * 100) / 100;
    const currentPaid = Number(invoice.amountPaid);

    if (refundAmount > currentPaid) {
      throw new Error(`Refund amount ($${refundAmount.toFixed(2)}) exceeds amount paid ($${currentPaid.toFixed(2)})`);
    }

    // Estimate tax portion based on invoice tax/total ratio
    const totalTax = Number(invoice.taxTotal);
    const invoiceTotal = Number(invoice.total);
    const taxRatio = invoiceTotal > 0 ? (totalTax / invoiceTotal) : 0.10;
    const refundTax = Math.round(refundAmount * taxRatio * 100) / 100;
    const netDebit = Math.round((refundAmount - refundTax) * 100) / 100;

    await AccountingService.ensureStandardChartOfAccounts(tenantId, db);
    const accounts = await db.chartOfAccount.findMany({ where: { tenantId } });
    const accMap = new Map<string, any>(accounts.map((a: any) => [a.accountCode, a]));

    const revenueAcc = accMap.get('4100') || accMap.get('4000') || accounts.find((a: any) => a.accountType === 'REVENUE');
    const gstAcc = accMap.get('2100') || accounts.find((a: any) => a.systemAccount === 'GST_PAYABLE');
    const bankAcc = accMap.get('1010');

    const refundNumber = await this.generateRefundNumber(tenantId, db);

    const journal = await AccountingService.createJournalEntry({
      tenantId,
      date: new Date().toISOString(),
      sourceModule: 'REFUND',
      sourceReferenceId: refundNumber,
      narration: `Invoice Credit/Refund ${refundNumber} for #${invoice.invoiceNumber} ($${refundAmount.toFixed(2)})`,
      createdByUserId,
      lines: [
        {
          accountId: revenueAcc.id,
          contactPartyId: invoice.customerPartyId || null,
          description: `Invoice Credit Adjustment: #${invoice.invoiceNumber}`,
          debit: netDebit,
          credit: 0,
          taxAmount: refundTax
        },
        {
          accountId: gstAcc.id,
          contactPartyId: invoice.customerPartyId || null,
          description: `GST Reversal on Invoice Credit: #${invoice.invoiceNumber}`,
          debit: refundTax,
          credit: 0
        },
        {
          accountId: bankAcc.id,
          contactPartyId: invoice.customerPartyId || null,
          description: `Refund Out via ${refundMethod}: #${invoice.invoiceNumber}`,
          debit: 0,
          credit: refundAmount
        }
      ]
    }, db);

    const parentTxn = invoice.transactions && invoice.transactions.length > 0 ? invoice.transactions[0] : null;

    const refund = await db.refund.create({
      data: {
        tenantId,
        refundNumber,
        paymentTransactionId: parentTxn?.id || null,
        invoiceId: invoice.id,
        amount: refundAmount,
        taxAmount: refundTax,
        refundMethod,
        reason,
        reasonNotes: reasonNotes || null,
        journalEntryId: journal.id,
        processedByUserId: processedByUserId || null
      }
    });

    await TransactionService.recordTransaction({
      tenantId,
      channel: 'INVOICE',
      type: 'REFUND',
      status: 'SUCCEEDED',
      grossAmount: -refundAmount,
      taxAmount: -refundTax,
      netAmount: -refundAmount,
      paymentMethod: refundMethod,
      customerPartyId: invoice.customerPartyId || null,
      invoiceId: invoice.id,
      journalEntryId: journal.id,
      metadata: {
        refundId: refund.id,
        refundNumber,
        invoiceNumber: invoice.invoiceNumber,
        reason
      }
    }, db);

    // Update invoice amountPaid and status
    const newPaid = Math.max(0, currentPaid - refundAmount);
    let newStatus = invoice.status;
    if (newPaid === 0) newStatus = 'AWAITING_PAYMENT';
    else if (newPaid < Number(invoice.total)) newStatus = 'PARTIALLY_PAID';

    await db.invoice.update({
      where: { id: invoice.id },
      data: {
        amountPaid: newPaid,
        status: newStatus
      }
    });

    let issuedVoucher = null;
    if (refundMethod === 'STORE_CREDIT') {
      try {
        const scCode = VoucherService.generateCode('SC');
        issuedVoucher = await VoucherService.issueVoucher(tenantId, {
          type: 'STORE_CREDIT',
          initialBalance: refundAmount,
          recipientPartyId: invoice.customerPartyId || null,
          expiresAt: null,
          code: scCode,
          notes: `Store Credit / Credit Memo issued against Invoice #${invoice.invoiceNumber}`
        }, processedByUserId, db);
      } catch (vcErr) {
        console.warn(`[RefundService] Failed to auto-generate store credit voucher:`, vcErr);
      }
    }

    return {
      ...refund,
      voucher: issuedVoucher
    };
  }
}
