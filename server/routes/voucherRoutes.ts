import express from 'express';
import { z } from 'zod';
import { TenantRequest } from '../middleware/tenantMiddleware';
import { globalPrisma } from '../lib/prisma';
import { VoucherService } from '../services/voucherService';

const router = express.Router();

const IssueVoucherSchema = z.object({
  type: z.enum(['GIFT_CARD', 'DISCOUNT_PROMO', 'STORE_CREDIT']),
  initialBalance: z.number().nonnegative(),
  discountPercent: z.number().min(0).max(100).optional().nullable(),
  currency: z.string().default('AUD'),
  expiresAt: z.string().optional().nullable(),
  recipientPartyId: z.string().optional().nullable(),
  paymentAccountId: z.string().optional().nullable(),
  code: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// GET /api/vouchers - List Vouchers
router.get('/', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const { status, type } = req.query;

    const where: any = { tenantId: req.tenantId };
    if (status) where.status = status as string;
    if (type) where.type = type as string;

    const vouchers = await db.voucher.findMany({
      where,
      include: {
        recipientParty: { include: { person: true, organization: true } },
        redemptions: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(vouchers);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/vouchers/issue - Issue Voucher or Gift Card
router.post('/issue', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const validated = IssueVoucherSchema.parse(req.body);

    const voucher = await VoucherService.issueVoucher(
      req.tenantId!,
      validated,
      req.user?.uid,
      db
    );

    res.status(201).json(voucher);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/vouchers/lookup/:code - Lookup & Verify Voucher
router.get('/lookup/:code', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const voucher = await VoucherService.lookupVoucher(req.tenantId!, req.params.code, db);
    res.json(voucher);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/vouchers/redeem - Redeem Voucher
router.post('/redeem', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const { code, amount, sourceType = 'POS', sourceId = 'MANUAL' } = req.body;

    const result = await VoucherService.redeemVoucher(
      req.tenantId!,
      code,
      Number(amount),
      sourceType,
      sourceId,
      db
    );

    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
