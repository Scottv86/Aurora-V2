import express from 'express';
import { z } from 'zod';
import { TenantRequest } from '../middleware/tenantMiddleware';
import { globalPrisma } from '../lib/prisma';
import { PosService } from '../services/posService';

const router = express.Router();

const OpenSessionSchema = z.object({
  registerId: z.string().min(1, 'Register is required'),
  openingFloat: z.number().nonnegative().default(0),
});

const CloseSessionSchema = z.object({
  sessionId: z.string().min(1, 'Session is required'),
  actualCashCount: z.number().nonnegative(),
  notes: z.string().optional().nullable(),
});

const PosOrderSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
  customerPartyId: z.string().optional().nullable(),
  items: z.array(z.object({
    catalogItemId: z.string().optional().nullable(),
    variantId: z.string().optional().nullable(),
    title: z.string().min(1, 'Title is required'),
    sku: z.string().optional().nullable(),
    quantity: z.number().positive(),
    unitPrice: z.number().nonnegative(),
    unitCost: z.number().nonnegative().optional(),
    discountAmount: z.number().nonnegative().optional(),
    taxRate: z.number().nonnegative().optional(),
  })).min(1, 'Order must contain at least one item'),
  payments: z.array(z.object({
    tenderType: z.enum(['CASH', 'CARD', 'VOUCHER', 'ON_ACCOUNT']),
    amount: z.number().positive(),
    changeGiven: z.number().nonnegative().optional(),
    voucherCode: z.string().optional().nullable(),
    terminalRef: z.string().optional().nullable(),
  })).min(1, 'Order must contain at least one payment tender'),
});

// GET /api/pos/registers - List Registers
router.get('/registers', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    await PosService.ensureDefaultRegister(req.tenantId!, db);
    const registers = await db.posRegister.findMany({
      where: { tenantId: req.tenantId },
      include: { location: true },
      orderBy: { name: 'asc' }
    });
    res.json(registers);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/pos/registers - Create Register
router.post('/registers', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const { name, code, locationId } = req.body;
    const register = await db.posRegister.create({
      data: {
        tenantId: req.tenantId!,
        name,
        code,
        locationId,
        isActive: true
      },
      include: { location: true }
    });
    res.status(201).json(register);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/pos/sessions/active - Get Active Session
router.get('/sessions/active', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const { registerId } = req.query;
    const session = await PosService.getActiveSession(req.tenantId!, registerId as string, db);
    res.json(session);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/pos/sessions/open - Open Shift
router.post('/sessions/open', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const validated = OpenSessionSchema.parse(req.body);

    const session = await PosService.openSession(
      req.tenantId!,
      validated.registerId,
      req.user?.uid || 'anonymous',
      validated.openingFloat,
      db
    );

    res.status(201).json(session);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/pos/sessions/close - Close Shift & Z-Report
router.post('/sessions/close', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const validated = CloseSessionSchema.parse(req.body);

    const result = await PosService.closeSession(
      req.tenantId!,
      validated.sessionId,
      req.user?.uid || 'anonymous',
      validated.actualCashCount,
      validated.notes || '',
      db
    );

    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/pos/orders - List Orders
router.get('/orders', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const { sessionId, limit = 50 } = req.query;

    const where: any = { tenantId: req.tenantId };
    if (sessionId) where.sessionId = sessionId as string;

    const orders = await db.posOrder.findMany({
      where,
      include: {
        items: true,
        payments: true,
        customer: { include: { person: true, organization: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: Number(limit)
    });

    res.json(orders);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/pos/orders - Complete Checkout
router.post('/orders', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const validated = PosOrderSchema.parse(req.body);

    const order = await PosService.processOrder(
      req.tenantId!,
      validated,
      req.user?.uid || 'anonymous',
      db
    );

    res.status(201).json(order);
  } catch (err: any) {
    console.error('[PosAPI] Order checkout error:', err);
    res.status(400).json({ error: err.message || 'Failed to process order' });
  }
});

export default router;
