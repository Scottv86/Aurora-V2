import { globalPrisma } from '../lib/prisma';
import { recordAudit } from '../lib/audit';
import { AccountingService } from './accountingService';

export interface IssueVoucherInput {
  type: 'GIFT_CARD' | 'DISCOUNT_PROMO' | 'STORE_CREDIT';
  initialBalance: number;
  discountPercent?: number | null;
  currency?: string;
  expiresAt?: Date | string | null;
  recipientPartyId?: string | null;
  paymentAccountId?: string | null; // e.g. 1010 Operating Bank, 1020 Cash Till, 1050 POS Clearing
  notes?: string | null;
  code?: string | null;
}

export class VoucherService {
  /**
   * Generates a random secure voucher code if not provided
   */
  static generateCode(prefix: string = 'VCH'): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `${prefix}-${code.substring(0, 4)}-${code.substring(4)}`;
  }

  /**
   * Issues a voucher or gift card and posts to General Ledger if stored value
   */
  static async issueVoucher(tenantId: string, input: IssueVoucherInput, userId?: string, db: any = globalPrisma) {
    const code = input.code ? input.code.trim().toUpperCase() : this.generateCode(input.type === 'GIFT_CARD' ? 'GIFT' : 'PROMO');
    const balance = Number(input.initialBalance || 0);

    const voucher = await db.voucher.create({
      data: {
        tenantId,
        code,
        type: input.type,
        initialBalance: balance,
        currentBalance: balance,
        currency: input.currency || 'AUD',
        discountPercent: input.discountPercent || null,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
        recipientPartyId: input.recipientPartyId || null,
        status: 'ACTIVE'
      },
      include: {
        recipientParty: {
          include: { person: true, organization: true }
        }
      }
    });

    // If selling a gift card with a monetary balance and payment account is provided, post to GL
    if (input.type === 'GIFT_CARD' && balance > 0 && input.paymentAccountId) {
      // Find Voucher Liability account (2200)
      const voucherLiability = await db.chartOfAccount.findFirst({
        where: { tenantId, systemAccount: 'VOUCHER_LIABILITY' }
      });

      if (voucherLiability) {
        await AccountingService.postJournalEntry(tenantId, {
          date: new Date(),
          sourceModule: 'POS',
          sourceReferenceId: voucher.id,
          narration: `Gift Card Issued: ${voucher.code} for $${balance.toFixed(2)}`,
          createdByUserId: userId,
          lines: [
            {
              accountId: input.paymentAccountId,
              debit: balance,
              credit: 0,
              description: `Cash/Card received for Gift Card ${voucher.code}`
            },
            {
              accountId: voucherLiability.id,
              debit: 0,
              credit: balance,
              description: `Deferred Revenue - Gift Card ${voucher.code}`
            }
          ]
        }, db);
      }
    }

    await recordAudit({
      tenantId,
      action: 'VOUCHER_ISSUED',
      category: 'CREATION',
      resourceId: voucher.id,
      resourceKey: voucher.code,
      resourceTitle: `${voucher.type} ${voucher.code}`,
      description: `Issued ${voucher.type} ${voucher.code} with initial balance of $${balance.toFixed(2)}`
    });

    return voucher;
  }

  /**
   * Looks up a voucher by code and verifies validity
   */
  static async lookupVoucher(tenantId: string, code: string, db: any = globalPrisma) {
    const voucher = await db.voucher.findUnique({
      where: {
        tenantId_code: {
          tenantId,
          code: code.trim().toUpperCase()
        }
      },
      include: {
        recipientParty: {
          include: { person: true, organization: true }
        }
      }
    });

    if (!voucher) {
      throw new Error(`Voucher code "${code}" not found.`);
    }

    if (voucher.status !== 'ACTIVE') {
      throw new Error(`Voucher ${voucher.code} is ${voucher.status.toLowerCase()}.`);
    }

    if (voucher.expiresAt && new Date(voucher.expiresAt) < new Date()) {
      await db.voucher.update({
        where: { id: voucher.id },
        data: { status: 'EXPIRED' }
      });
      throw new Error(`Voucher ${voucher.code} expired on ${new Date(voucher.expiresAt).toLocaleDateString()}.`);
    }

    if (Number(voucher.currentBalance) <= 0 && !voucher.discountPercent) {
      throw new Error(`Voucher ${voucher.code} has zero remaining balance.`);
    }

    return voucher;
  }

  /**
   * Redeems a voucher partially or fully against a transaction
   */
  static async redeemVoucher(
    tenantId: string, 
    code: string, 
    amountToRedeem: number, 
    sourceType: 'POS' | 'SITE_ORDER' | 'PORTAL_FORM', 
    sourceId: string, 
    db: any = globalPrisma
  ) {
    const voucher = await this.lookupVoucher(tenantId, code, db);
    const currentBal = Number(voucher.currentBalance);
    const redeemAmount = Math.min(currentBal, amountToRedeem);

    if (redeemAmount <= 0) {
      throw new Error('Redemption amount must be greater than zero.');
    }

    const newBalance = Math.round((currentBal - redeemAmount) * 100) / 100;
    const newStatus = newBalance <= 0 ? 'DEPLETED' : 'ACTIVE';

    const updated = await db.voucher.update({
      where: { id: voucher.id },
      data: {
        currentBalance: newBalance,
        status: newStatus,
        redemptions: {
          create: {
            sourceType,
            sourceId,
            amountRedeemed: redeemAmount
          }
        }
      }
    });

    return {
      voucher: updated,
      amountRedeemed: redeemAmount,
      remainingBalance: newBalance
    };
  }
}
