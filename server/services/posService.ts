import { globalPrisma } from '../lib/prisma';
import { recordAudit } from '../lib/audit';
import { AccountingService } from './accountingService';
import { InventoryService } from './inventoryService';
import { VoucherService } from './voucherService';

export interface PosPaymentInput {
  tenderType: 'CASH' | 'CARD' | 'VOUCHER' | 'ON_ACCOUNT';
  amount: number;
  changeGiven?: number;
  voucherCode?: string | null;
  terminalRef?: string | null;
}

export interface PosOrderItemInput {
  catalogItemId?: string | null;
  variantId?: string | null;
  title: string;
  sku?: string | null;
  quantity: number;
  unitPrice: number;
  unitCost?: number;
  discountAmount?: number;
  taxRate?: number;
}

export interface CreatePosOrderInput {
  sessionId: string;
  customerPartyId?: string | null;
  items: PosOrderItemInput[];
  payments: PosPaymentInput[];
}

export class PosService {
  /**
   * Ensures at least one active register exists for the tenant
   */
  static async ensureDefaultRegister(tenantId: string, db: any = globalPrisma) {
    const count = await db.posRegister.count({ where: { tenantId } });
    if (count === 0) {
      const defaultLoc = await InventoryService.getDefaultLocation(tenantId, db);
      return await db.posRegister.create({
        data: {
          tenantId,
          code: 'REG-01',
          name: 'Main Counter Register 1',
          locationId: defaultLoc.id,
          isActive: true
        }
      });
    }
    return db.posRegister.findFirst({ where: { tenantId, isActive: true } });
  }

  /**
   * Gets or initializes the active POS session for a register
   */
  static async getActiveSession(tenantId: string, registerId?: string, db: any = globalPrisma) {
    const reg = registerId 
      ? await db.posRegister.findUnique({ where: { id: registerId } })
      : await this.ensureDefaultRegister(tenantId, db);

    if (!reg) return null;

    return await db.posSession.findFirst({
      where: {
        tenantId,
        registerId: reg.id,
        status: 'OPEN'
      },
      include: {
        register: { include: { location: true } },
        orders: {
          include: {
            items: true,
            payments: true
          }
        }
      }
    });
  }

  /**
   * Opens a new POS session with opening cash float
   */
  static async openSession(tenantId: string, registerId: string, userId: string, openingFloat: number = 0, db: any = globalPrisma) {
    const active = await db.posSession.findFirst({
      where: { tenantId, registerId, status: 'OPEN' }
    });

    if (active) {
      throw new Error('An open session already exists on this register. Please close it before opening a new one.');
    }

    const session = await db.posSession.create({
      data: {
        tenantId,
        registerId,
        openedByUserId: userId,
        openingFloat: Number(openingFloat),
        status: 'OPEN'
      },
      include: { register: true }
    });

    await recordAudit({
      tenantId,
      action: 'POS_SESSION_OPENED',
      category: 'SECURITY',
      resourceId: session.id,
      resourceTitle: `Register Shift Opened`,
      description: `Opened shift on ${session.register.name} with float $${Number(openingFloat).toFixed(2)}`
    });

    return session;
  }

  /**
   * Closes a POS session, computes cash variance, and posts Z-Report discrepancy journal if needed
   */
  static async closeSession(tenantId: string, sessionId: string, userId: string, actualCashCount: number, notes?: string, db: any = globalPrisma) {
    const session = await db.posSession.findUnique({
      where: { id: sessionId },
      include: {
        register: true,
        orders: {
          include: { payments: true }
        }
      }
    });

    if (!session || session.tenantId !== tenantId) {
      throw new Error('POS session not found');
    }

    if (session.status === 'CLOSED') {
      throw new Error('Session is already closed.');
    }

    // Calculate expected cash in drawer = openingFloat + all cash payments - change given
    let cashSalesTotal = 0;
    let cardSalesTotal = 0;
    let voucherSalesTotal = 0;
    let totalSales = 0;

    for (const order of session.orders) {
      if (order.status !== 'COMPLETED') continue;
      totalSales += Number(order.total);
      for (const p of order.payments) {
        if (p.tenderType === 'CASH') {
          cashSalesTotal += (Number(p.amount) - Number(p.changeGiven || 0));
        } else if (p.tenderType === 'CARD') {
          cardSalesTotal += Number(p.amount);
        } else if (p.tenderType === 'VOUCHER') {
          voucherSalesTotal += Number(p.amount);
        }
      }
    }

    const expectedCash = Number(session.openingFloat) + cashSalesTotal;
    const actualCash = Number(actualCashCount);
    const variance = Math.round((actualCash - expectedCash) * 100) / 100;

    const updatedSession = await db.posSession.update({
      where: { id: sessionId },
      data: {
        closedByUserId: userId,
        closedAt: new Date(),
        closingCashActual: actualCash,
        closingCashExpected: expectedCash,
        cashVariance: variance,
        status: 'CLOSED',
        notes: notes || null
      }
    });

    // If there is cash variance, post to General Ledger (6200 Cash Discrepancies)
    if (Math.abs(variance) > 0.01) {
      const varianceAcc = await db.chartOfAccount.findFirst({
        where: { tenantId, accountCode: '6200' }
      });
      const cashAcc = await db.chartOfAccount.findFirst({
        where: { tenantId, accountCode: '1020' } // Petty Cash / Till
      });

      if (varianceAcc && cashAcc) {
        if (variance < 0) {
          // Cash shortage: Debit Discrepancy Expense, Credit Till Cash
          await AccountingService.postJournalEntry(tenantId, {
            date: new Date(),
            sourceModule: 'POS',
            sourceReferenceId: session.id,
            narration: `Shift Close Shortage: ${session.register.name} ($${Math.abs(variance).toFixed(2)} Short)`,
            createdByUserId: userId,
            lines: [
              { accountId: varianceAcc.id, debit: Math.abs(variance), credit: 0, description: 'Till cash shortage' },
              { accountId: cashAcc.id, debit: 0, credit: Math.abs(variance), description: 'Cash reduction' }
            ]
          }, db);
        } else {
          // Cash overage: Debit Till Cash, Credit Discrepancy (negative expense or income)
          await AccountingService.postJournalEntry(tenantId, {
            date: new Date(),
            sourceModule: 'POS',
            sourceReferenceId: session.id,
            narration: `Shift Close Overage: ${session.register.name} ($${variance.toFixed(2)} Over)`,
            createdByUserId: userId,
            lines: [
              { accountId: cashAcc.id, debit: variance, credit: 0, description: 'Cash excess in drawer' },
              { accountId: varianceAcc.id, debit: 0, credit: variance, description: 'Till cash overage' }
            ]
          }, db);
        }
      }
    }

    await recordAudit({
      tenantId,
      action: 'POS_SESSION_CLOSED',
      category: 'SECURITY',
      resourceId: session.id,
      resourceTitle: `Register Shift Closed (Z-Report)`,
      description: `Closed shift. Total sales: $${totalSales.toFixed(2)}. Cash variance: $${variance.toFixed(2)}`
    });

    return {
      session: updatedSession,
      zReport: {
        totalSales: Math.round(totalSales * 100) / 100,
        cashSales: Math.round(cashSalesTotal * 100) / 100,
        cardSales: Math.round(cardSalesTotal * 100) / 100,
        voucherSales: Math.round(voucherSalesTotal * 100) / 100,
        openingFloat: Number(session.openingFloat),
        expectedCash: Math.round(expectedCash * 100) / 100,
        actualCash: Math.round(actualCash * 100) / 100,
        variance: Math.round(variance * 100) / 100
      }
    };
  }

  /**
   * Generates next sequential POS order number: POS-YYYY-XXXX
   */
  static async getNextOrderNumber(tenantId: string, db: any = globalPrisma): Promise<string> {
    const year = new Date().getFullYear();
    const count = await db.posOrder.count({
      where: {
        tenantId,
        orderNumber: { startsWith: `POS-${year}-` }
      }
    });
    return `POS-${year}-${String(count + 1).padStart(4, '0')}`;
  }

  /**
   * Processes a complete Point of Sale checkout:
   * 1. Creates PosOrder & Line items
   * 2. Decrements Inventory allocations
   * 3. Redeems vouchers (if used)
   * 4. Posts balanced sales & COGS journal to General Ledger
   */
  static async processOrder(tenantId: string, input: CreatePosOrderInput, userId?: string, db: any = globalPrisma) {
    await AccountingService.ensureStandardChartOfAccounts(tenantId, db);

    const session = await db.posSession.findUnique({
      where: { id: input.sessionId },
      include: { register: true }
    });

    if (!session || session.tenantId !== tenantId || session.status !== 'OPEN') {
      throw new Error('Active POS session not found or register shift is closed.');
    }

    const orderNumber = await this.getNextOrderNumber(tenantId, db);

    let subtotal = 0;
    let discountTotal = 0;
    let taxTotal = 0;
    let totalCogs = 0;

    const formattedItems = input.items.map(item => {
      const qty = Number(item.quantity || 1);
      const price = Number(item.unitPrice || 0);
      const discount = Number(item.discountAmount || 0);
      const cost = Number(item.unitCost || 0);
      const taxRate = Number(item.taxRate !== undefined ? item.taxRate : 0.10);
      
      const lineSubtotal = (qty * price) - discount;
      const lineTax = Math.round((lineSubtotal * taxRate) * 100) / 100;
      const lineTotal = Math.round((lineSubtotal + lineTax) * 100) / 100;

      subtotal += (qty * price);
      discountTotal += discount;
      taxTotal += lineTax;
      totalCogs += (qty * cost);

      return {
        catalogItemId: item.catalogItemId || null,
        variantId: item.variantId || null,
        title: item.title,
        sku: item.sku || null,
        quantity: qty,
        unitPrice: price,
        unitCost: cost,
        discountAmount: discount,
        taxRate,
        lineTotal
      };
    });

    const total = Math.round((subtotal - discountTotal + taxTotal) * 100) / 100;

    // Verify payments equal or exceed total
    let totalPaid = 0;
    for (const p of input.payments) {
      totalPaid += Number(p.amount) - Number(p.changeGiven || 0);
    }
    const roundedPaid = Math.round(totalPaid * 100) / 100;

    if (roundedPaid < total - 0.01) {
      throw new Error(`Insufficient payment: Order total is $${total.toFixed(2)}, but total tenders received is $${roundedPaid.toFixed(2)}`);
    }

    // 1. Create PosOrder & Payments
    const order = await db.posOrder.create({
      data: {
        tenantId,
        sessionId: input.sessionId,
        orderNumber,
        customerPartyId: input.customerPartyId || null,
        subtotal: Math.round(subtotal * 100) / 100,
        discountTotal: Math.round(discountTotal * 100) / 100,
        taxTotal: Math.round(taxTotal * 100) / 100,
        total,
        status: 'COMPLETED',
        items: { create: formattedItems },
        payments: {
          create: input.payments.map(p => ({
            tenderType: p.tenderType,
            amount: p.amount,
            changeGiven: p.changeGiven || 0,
            voucherCode: p.voucherCode || null,
            terminalRef: p.terminalRef || null
          }))
        }
      },
      include: {
        items: true,
        payments: true,
        customer: { include: { person: true, organization: true } }
      }
    });

    // 2. Decrement inventory for items with catalogItemId
    for (const item of formattedItems) {
      if (item.catalogItemId) {
        try {
          await InventoryService.recordMovement(tenantId, {
            locationId: session.register.locationId,
            catalogItemId: item.catalogItemId,
            variantId: item.variantId,
            quantityDelta: -item.quantity,
            movementType: 'POS_SALE',
            unitCost: item.unitCost,
            referenceId: order.id,
            notes: `POS Sale: ${order.orderNumber}`
          }, userId, db);
        } catch (err) {
          console.error(`[POS] Failed to decrement inventory for item ${item.title}:`, err);
        }
      }
    }

    // 3. Redeem vouchers if used
    for (const p of input.payments) {
      if (p.tenderType === 'VOUCHER' && p.voucherCode) {
        try {
          await VoucherService.redeemVoucher(
            tenantId,
            p.voucherCode,
            Number(p.amount),
            'POS',
            order.id,
            db
          );
        } catch (err) {
          console.error(`[POS] Failed to redeem voucher ${p.voucherCode}:`, err);
        }
      }
    }

    // 4. Post Double-Entry Sales Journal to General Ledger
    const cashAcc = await db.chartOfAccount.findFirst({ where: { tenantId, accountCode: '1020' } });
    const posCardClearing = await db.chartOfAccount.findFirst({ where: { tenantId, accountCode: '1050' } });
    const voucherLiability = await db.chartOfAccount.findFirst({ where: { tenantId, accountCode: '2200' } });
    const arAccount = await db.chartOfAccount.findFirst({ where: { tenantId, accountCode: '1200' } });
    const salesRevenue = await db.chartOfAccount.findFirst({ where: { tenantId, accountCode: '4000' } });
    const taxPayable = await db.chartOfAccount.findFirst({ where: { tenantId, accountCode: '2100' } });
    const cogsExpense = await db.chartOfAccount.findFirst({ where: { tenantId, accountCode: '5000' } });
    const inventoryAsset = await db.chartOfAccount.findFirst({ where: { tenantId, accountCode: '1300' } });

    const journalLines: any[] = [];

    // Tenders (Debits)
    for (const p of input.payments) {
      const netPayment = Number(p.amount) - Number(p.changeGiven || 0);
      if (p.tenderType === 'CASH' && cashAcc && netPayment > 0) {
        journalLines.push({
          accountId: cashAcc.id,
          debit: netPayment,
          credit: 0,
          description: `Cash received on ${order.orderNumber}`
        });
      } else if (p.tenderType === 'CARD' && posCardClearing && netPayment > 0) {
        journalLines.push({
          accountId: posCardClearing.id,
          debit: netPayment,
          credit: 0,
          description: `Card payment received on ${order.orderNumber}`
        });
      } else if (p.tenderType === 'VOUCHER' && voucherLiability && netPayment > 0) {
        journalLines.push({
          accountId: voucherLiability.id,
          debit: netPayment,
          credit: 0,
          description: `Voucher redeemed on ${order.orderNumber}`
        });
      } else if (p.tenderType === 'ON_ACCOUNT' && arAccount && netPayment > 0) {
        journalLines.push({
          accountId: arAccount.id,
          debit: netPayment,
          credit: 0,
          contactPartyId: input.customerPartyId,
          description: `Charged to account on ${order.orderNumber}`
        });
      }
    }

    // Revenue & Tax (Credits)
    const netRevenue = Math.round((subtotal - discountTotal) * 100) / 100;
    if (salesRevenue && netRevenue > 0) {
      journalLines.push({
        accountId: salesRevenue.id,
        debit: 0,
        credit: netRevenue,
        contactPartyId: input.customerPartyId,
        description: `POS Sales Revenue - ${order.orderNumber}`
      });
    }

    if (taxPayable && taxTotal > 0) {
      journalLines.push({
        accountId: taxPayable.id,
        debit: 0,
        credit: taxTotal,
        description: `GST collected on ${order.orderNumber}`
      });
    }

    // COGS & Inventory Asset (Debit COGS, Credit Inventory Asset)
    if (totalCogs > 0 && cogsExpense && inventoryAsset) {
      journalLines.push({
        accountId: cogsExpense.id,
        debit: Math.round(totalCogs * 100) / 100,
        credit: 0,
        description: `COGS for ${order.orderNumber}`
      });
      journalLines.push({
        accountId: inventoryAsset.id,
        debit: 0,
        credit: Math.round(totalCogs * 100) / 100,
        description: `Inventory relief for ${order.orderNumber}`
      });
    }

    try {
      const journal = await AccountingService.postJournalEntry(tenantId, {
        date: new Date(),
        sourceModule: 'POS',
        sourceReferenceId: order.id,
        narration: `POS Order ${order.orderNumber}`,
        createdByUserId: userId,
        lines: journalLines
      }, db);

      await db.posOrder.update({
        where: { id: order.id },
        data: { journalEntryId: journal.id }
      });
    } catch (err) {
      console.error(`[POS] Failed to post GL journal for order ${order.orderNumber}:`, err);
    }

    await recordAudit({
      tenantId,
      action: 'POS_ORDER_COMPLETED',
      category: 'CREATION',
      resourceId: order.id,
      resourceKey: order.orderNumber,
      resourceTitle: `POS Order ${order.orderNumber}`,
      description: `Completed order ${order.orderNumber} for $${total.toFixed(2)}`
    });

    return order;
  }
}
