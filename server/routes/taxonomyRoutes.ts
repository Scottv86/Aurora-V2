import express from 'express';
import { z } from 'zod';
import { TenantRequest } from '../middleware/tenantMiddleware';
import { globalPrisma } from '../lib/prisma';
import { recordAudit } from '../lib/audit';

const router = express.Router();

const TaxonomySchema = z.object({
  category: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().optional().nullable(),
  metadata: z.any().optional().nullable(),
});

const DEFAULT_TAXONOMIES: Record<string, { name: string; slug: string; description: string }[]> = {
  ORG_TYPE: [
    { name: 'Private Limited Company', slug: 'PTE_LTD', description: 'Standard private company structure' },
    { name: 'Public Listed Company', slug: 'PLC', description: 'Publicly traded entity' },
    { name: 'Non-Profit Organization', slug: 'NPO', description: 'Charities and social enterprises' },
    { name: 'Sole Proprietorship', slug: 'SOLE_PROP', description: 'Individual business owner' },
    { name: 'Trust / Foundation', slug: 'TRUST', description: 'Legal trust or philanthropic foundation' },
  ],
  RELATIONSHIP_TYPE: [
    { name: 'Employee', slug: 'EMPLOYEE', description: 'Direct employment relationship' },
    { name: 'Contractor', slug: 'CONTRACTOR', description: 'External service provider' },
    { name: 'Owner / Shareholder', slug: 'OWNER', description: 'Capital interest or ownership' },
    { name: 'Director', slug: 'DIRECTOR', description: 'Board or executive governance' },
    { name: 'Subsidiary', slug: 'SUBSIDIARY', description: 'Controlled corporate entity' },
    { name: 'Partner', slug: 'PARTNER', description: 'Collaborative business partner' },
    { name: 'Spouse', slug: 'SPOUSE', description: 'Legal domestic partner' },
    { name: 'Parent', slug: 'PARENT', description: 'Immediate biological or legal parent' },
    { name: 'Child', slug: 'CHILD', description: 'Immediate biological or legal child' },
  ]
};

// GET Taxonomies (with category filter)
router.get('/', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const { category } = req.query;

    const where: any = {
      tenantId: req.tenantId,
    };

    if (category) {
      where.category = category as string;
    }

    let taxonomies = await db.taxonomy.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    // Auto-seed defaults if empty for this category
    if (taxonomies.length === 0 && category && DEFAULT_TAXONOMIES[category as string]) {
      const defaults = DEFAULT_TAXONOMIES[category as string];
      await db.taxonomy.createMany({
        data: defaults.map(d => ({
          ...d,
          category: category as string,
          tenantId: req.tenantId!
        }))
      });
      
      taxonomies = await db.taxonomy.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });
    }

    // Add usage counts
    const withUsage = await Promise.all(taxonomies.map(async (tax: any) => {
      let usage = 0;
      if (tax.category === 'ORG_TYPE') {
        usage = await db.organization.count({
          where: { orgStructureType: tax.slug, party: { tenantId: req.tenantId } }
        });
      } else if (tax.category === 'RELATIONSHIP_TYPE') {
        usage = await db.partyRelationship.count({
          where: { relationshipType: tax.slug, tenantId: req.tenantId }
        });
      }
      return { ...tax, usage };
    }));

    res.json(withUsage);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST Create Taxonomy
router.post('/', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const body = TaxonomySchema.parse(req.body);

    const taxonomy = await db.taxonomy.create({
      data: {
        ...body,
        tenantId: req.tenantId!,
      },
    });

    await recordAudit({
      tenantId: req.tenantId!,
      actorId: req.user?.uid || 'SYSTEM',
      action: 'TAXONOMY_CREATE',
      resourceId: taxonomy.id,
      newValue: taxonomy
    });

    res.status(201).json(taxonomy);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    res.status(500).json({ error: err.message });
  }
});

// PUT Update Taxonomy
router.put('/:id', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const { id } = req.params;
    const body = TaxonomySchema.partial().parse(req.body);

    const existing = await db.taxonomy.findUnique({
      where: { id, tenantId: req.tenantId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Taxonomy not found' });
    }

    const updated = await db.taxonomy.update({
      where: { id },
      data: body,
    });

    await recordAudit({
      tenantId: req.tenantId!,
      actorId: req.user?.uid || 'SYSTEM',
      action: 'TAXONOMY_UPDATE',
      resourceId: id,
      oldValue: existing,
      newValue: updated
    });

    res.json(updated);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    res.status(500).json({ error: err.message });
  }
});

// DELETE Taxonomy
router.delete('/:id', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const { id } = req.params;

    await db.taxonomy.delete({
      where: { id, tenantId: req.tenantId }
    });

    await recordAudit({
      tenantId: req.tenantId!,
      actorId: req.user?.uid || 'SYSTEM',
      action: 'TAXONOMY_DELETE',
      resourceId: id
    });

    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
