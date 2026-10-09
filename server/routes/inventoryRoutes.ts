import express from 'express';
import { z } from 'zod';
import { TenantRequest } from '../middleware/tenantMiddleware';
import { globalPrisma } from '../lib/prisma';
import { InventoryService } from '../services/inventoryService';

const router = express.Router();

const AdjustmentSchema = z.object({
  locationId: z.string().optional(),
  catalogItemId: z.string().min(1, 'Catalog Item is required'),
  variantId: z.string().optional().nullable(),
  quantityDelta: z.number().refine(val => val !== 0, 'Quantity delta cannot be zero'),
  movementType: z.enum([
    'POS_SALE', 'POS_RETURN', 'ONLINE_ORDER', 
    'PURCHASE_RECEIPT', 'TRANSFER_IN', 'TRANSFER_OUT', 
    'ADJUSTMENT_WRITE_OFF', 'SHRINKAGE'
  ]),
  unitCost: z.number().nonnegative().optional(),
  notes: z.string().optional().nullable(),
  postToGeneralLedger: z.boolean().default(true),
});

// GET /api/inventory/status - Perpetual inventory status across locations
router.get('/status', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const inventory = await InventoryService.getInventoryStatus(req.tenantId!, db);
    res.json(inventory);
  } catch (err: any) {
    console.error('[InventoryAPI] GET /status error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch inventory status' });
  }
});

// GET /api/inventory/locations - List Locations
router.get('/locations', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    await InventoryService.ensureDefaultLocations(req.tenantId!, db);
    const locations = await db.inventoryLocation.findMany({
      where: { tenantId: req.tenantId },
      orderBy: { name: 'asc' }
    });
    res.json(locations);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/inventory/locations - Create Location
router.post('/locations', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const { code, name, isDefault } = req.body;
    const location = await db.inventoryLocation.create({
      data: {
        tenantId: req.tenantId!,
        code,
        name,
        isDefault: Boolean(isDefault)
      }
    });
    res.status(201).json(location);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/inventory/movements - List Movements
router.get('/movements', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const { catalogItemId, locationId, limit = 100 } = req.query;

    const where: any = { tenantId: req.tenantId };
    if (catalogItemId) where.catalogItemId = catalogItemId as string;
    if (locationId) where.locationId = locationId as string;

    const movements = await db.inventoryMovement.findMany({
      where,
      include: {
        location: true,
        catalogItem: true
      },
      orderBy: { createdAt: 'desc' },
      take: Number(limit)
    });

    res.json(movements);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/inventory/adjust - Stock Adjustment or Write-Off
router.post('/adjust', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const validated = AdjustmentSchema.parse(req.body);

    const movement = await InventoryService.recordMovement(
      req.tenantId!,
      validated,
      req.user?.uid,
      db
    );

    res.status(201).json(movement);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
