import express from 'express';
import { z } from 'zod';
import { TenantRequest } from '../middleware/tenantMiddleware';
import { globalPrisma } from '../lib/prisma';
import { recordAudit } from '../lib/audit';

const router = express.Router();

// Validation Schema
const CatalogItemSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(1, 'SKU/Code is required'),
  type: z.enum(['PRODUCT', 'SERVICE', 'FEE', 'RECURRING', 'FINE']),
  description: z.string().optional().nullable(),
  priceType: z.enum(['FLAT', 'UNIT', 'TIME']).default('FLAT'),
  basePrice: z.number().nonnegative('Price/Rate must be non-negative'),
  currency: z.string().default('AUD'),
  billingInterval: z.enum(['day', 'week', 'month', 'year']).optional().nullable(),
  billingIntervalCount: z.number().int().positive().optional().nullable(),
  billingBlockMinutes: z.number().int().positive().optional().nullable(),
  trackInventory: z.boolean().default(false),
  stockLevel: z.number().int().nonnegative().default(0),
  reorderPoint: z.number().int().nonnegative().default(0),
  metadata: z.any().optional().nullable(),
  status: z.enum(['active', 'draft', 'archived']).default('active'),
});

const DEFAULT_SEEDS = [
  {
    name: 'Enterprise License Handbook',
    code: 'PROD-ELH-01',
    type: 'PRODUCT',
    description: 'Comprehensive physical reference manual for corporate compliance.',
    priceType: 'UNIT',
    basePrice: 49.00,
    currency: 'AUD',
    trackInventory: true,
    stockLevel: 120,
    reorderPoint: 15,
    status: 'active'
  },
  {
    name: 'Senior Partner Advisory',
    code: 'SRV-SPA-01',
    type: 'SERVICE',
    description: 'Strategic legal counsel billed in 15-minute intervals.',
    priceType: 'TIME',
    basePrice: 150.00,
    currency: 'AUD',
    billingBlockMinutes: 15,
    status: 'active'
  },
  {
    name: 'Portal Lodgment Fee',
    code: 'FEE-LODGE-01',
    type: 'FEE',
    description: 'One-off administrative charge for online application processing.',
    priceType: 'FLAT',
    basePrice: 120.00,
    currency: 'AUD',
    status: 'active'
  },
  {
    name: 'Premium Support Plan',
    code: 'SUB-PSP-01',
    type: 'RECURRING',
    description: 'Monthly platform support retainer with 24/7 technical hotline access.',
    priceType: 'FLAT',
    basePrice: 299.00,
    currency: 'AUD',
    billingInterval: 'month',
    billingIntervalCount: 1,
    status: 'active'
  },
  {
    name: 'Late Filing Citation Fine',
    code: 'FINE-LATE-01',
    type: 'FINE',
    description: 'Statutory fine applied to applications submitted after the regular deadline.',
    priceType: 'FLAT',
    basePrice: 85.00,
    currency: 'AUD',
    status: 'active'
  }
];

// GET List
router.get('/', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const { type, status, search } = req.query;

    const where: any = {
      tenantId: req.tenantId,
    };

    if (type) {
      where.type = type as string;
    }
    if (status) {
      where.status = status as string;
    }
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { code: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    let items = await db.catalogItem.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    // Auto-seed if empty for this tenant
    if (items.length === 0 && !type && !search) {
      console.log(`[PricingCatalog] Seeding defaults for tenant ${req.tenantId}`);
      await db.catalogItem.createMany({
        data: DEFAULT_SEEDS.map(seed => ({
          ...seed,
          tenantId: req.tenantId!,
        }))
      });

      items = await db.catalogItem.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });
    }

    res.json(items);
  } catch (err: any) {
    console.error('[PricingCatalog GET List Error]:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET Single
router.get('/:id', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const { id } = req.params;

    const item = await db.catalogItem.findFirst({
      where: {
        id,
        tenantId: req.tenantId,
      }
    });

    if (!item) {
      return res.status(404).json({ error: 'Catalog item not found' });
    }

    res.json(item);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST Create
router.post('/', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const body = CatalogItemSchema.parse(req.body);

    // Guardrail: Check SKU/Code uniqueness for tenant
    const existing = await db.catalogItem.findFirst({
      where: {
        tenantId: req.tenantId,
        code: { equals: body.code, mode: 'insensitive' },
      }
    });

    if (existing) {
      return res.status(409).json({ error: `SKU/Code "${body.code}" is already in use.` });
    }

    const newItem = await db.catalogItem.create({
      data: {
        ...body,
        tenantId: req.tenantId!,
      }
    });

    await recordAudit({
      tenantId: req.tenantId!,
      actorId: req.user?.uid || 'SYSTEM',
      action: 'PRICING_CATALOG_CREATE',
      resourceId: newItem.id,
      newValue: newItem
    });

    res.status(201).json(newItem);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    console.error('[PricingCatalog POST Error]:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT Update
router.put('/:id', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const { id } = req.params;
    const body = CatalogItemSchema.parse(req.body);

    const existing = await db.catalogItem.findFirst({
      where: {
        id,
        tenantId: req.tenantId,
      }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Catalog item not found' });
    }

    // Guardrail: Check unique SKU/Code if it changed
    if (existing.code.toLowerCase() !== body.code.toLowerCase()) {
      const codeConflict = await db.catalogItem.findFirst({
        where: {
          tenantId: req.tenantId,
          code: { equals: body.code, mode: 'insensitive' },
        }
      });
      if (codeConflict) {
        return res.status(409).json({ error: `SKU/Code "${body.code}" is already in use by another item.` });
      }
    }

    const updatedItem = await db.catalogItem.update({
      where: { id },
      data: body,
    });

    await recordAudit({
      tenantId: req.tenantId!,
      actorId: req.user?.uid || 'SYSTEM',
      action: 'PRICING_CATALOG_UPDATE',
      resourceId: id,
      oldValue: existing,
      newValue: updatedItem
    });

    res.json(updatedItem);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    console.error('[PricingCatalog PUT Error]:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE
router.delete('/:id', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const { id } = req.params;

    const existing = await db.catalogItem.findFirst({
      where: {
        id,
        tenantId: req.tenantId,
      }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Catalog item not found' });
    }

    await db.catalogItem.delete({
      where: { id }
    });

    await recordAudit({
      tenantId: req.tenantId!,
      actorId: req.user?.uid || 'SYSTEM',
      action: 'PRICING_CATALOG_DELETE',
      resourceId: id,
      oldValue: existing
    });

    res.status(204).send();
  } catch (err: any) {
    console.error('[PricingCatalog DELETE Error]:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
