import express from 'express';
import { TenantRequest } from '../middleware/tenantMiddleware';
import { globalPrisma } from '../lib/prisma';

const router = express.Router();

const getTemplateModel = (db: any) => 
  db?.templateCatalog || db?.TemplateCatalog || globalPrisma.templateCatalog;

// GET /api/templates - Faceted search & query across the template registry
router.get('/', async (req: TenantRequest, res) => {
  try {
    const tenantId = req.tenantId || null;
    const db = req.db || globalPrisma;
    const model = getTemplateModel(db);

    if (!model) {
      return res.status(503).json({ error: 'Template catalog model is unavailable.' });
    }

    const {
      builderType,
      industry,
      category,
      search,
      tags,
      isSystemOnly,
      limit = '50',
      offset = '0',
      sortBy = 'popularity',
      includePayload = 'false'
    } = req.query as Record<string, string | undefined>;

    const parsedLimit = Math.min(parseInt(limit, 10) || 50, 200);
    const parsedOffset = Math.max(parseInt(offset, 10) || 0, 0);

    // Build Where Clause
    const where: any = {};

    // Tenant scoping: show system templates OR templates owned by this tenant
    if (isSystemOnly === 'true') {
      where.isSystem = true;
    } else if (tenantId) {
      where.OR = [
        { isSystem: true },
        { tenantId }
      ];
    } else {
      where.isSystem = true;
    }

    if (builderType && builderType !== 'ALL') {
      where.builderType = builderType.toUpperCase();
    }

    if (industry && industry !== 'All Industries' && industry !== 'ALL') {
      where.industry = industry;
    }

    if (category && category !== 'All Categories' && category !== 'ALL') {
      where.category = category;
    }

    if (search && search.trim()) {
      where.OR = [
        { name: { contains: search.trim(), mode: 'insensitive' } },
        { description: { contains: search.trim(), mode: 'insensitive' } },
        { tags: { has: search.trim().toLowerCase() } }
      ];
    }

    if (tags) {
      const tagList = tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
      if (tagList.length > 0) {
        where.tags = { hasSome: tagList };
      }
    }

    // Sort order
    let orderBy: any = { popularityScore: 'desc' };
    if (sortBy === 'name') {
      orderBy = { name: 'asc' };
    } else if (sortBy === 'newest') {
      orderBy = { createdAt: 'desc' };
    }

    // Select metadata for browsing (optionally include deep payload if includePayload=true)
    const shouldIncludePayload = includePayload === 'true';
    const [templates, totalCount] = await Promise.all([
      model.findMany({
        where,
        select: {
          id: true,
          slug: true,
          builderType: true,
          name: true,
          description: true,
          industry: true,
          category: true,
          department: true,
          tags: true,
          icon: true,
          thumbnailUrl: true,
          version: true,
          isSystem: true,
          tenantId: true,
          popularityScore: true,
          complexity: true,
          dependencies: true,
          createdAt: true,
          updatedAt: true,
          ...(shouldIncludePayload ? { payload: true } : {})
        },
        orderBy,
        take: parsedLimit,
        skip: parsedOffset
      }),
      model.count({ where })
    ]);

    // Facet counts for filters
    const allMatching = await model.findMany({
      where: {
        ...(where.OR ? { OR: where.OR } : {}),
        ...(where.isSystem !== undefined ? { isSystem: where.isSystem } : {})
      },
      select: {
        industry: true,
        category: true,
        builderType: true
      },
      take: 1000
    });

    const industriesMap: Record<string, number> = {};
    const categoriesMap: Record<string, number> = {};
    const builderTypesMap: Record<string, number> = {};

    allMatching.forEach((item: any) => {
      if (item.industry) {
        industriesMap[item.industry] = (industriesMap[item.industry] || 0) + 1;
      }
      if (item.category) {
        categoriesMap[item.category] = (categoriesMap[item.category] || 0) + 1;
      }
      if (item.builderType) {
        builderTypesMap[item.builderType] = (builderTypesMap[item.builderType] || 0) + 1;
      }
    });

    const responseTemplates = templates.map((t: any) => {
      if (t.payload && !t.schemaPayload) {
        return { ...t, schemaPayload: t.payload };
      }
      return t;
    });

    res.json({
      templates: responseTemplates,
      total: totalCount,
      limit: parsedLimit,
      offset: parsedOffset,
      facets: {
        industries: Object.entries(industriesMap).map(([name, count]) => ({ name, count })),
        categories: Object.entries(categoriesMap).map(([name, count]) => ({ name, count })),
        builderTypes: Object.entries(builderTypesMap).map(([type, count]) => ({ type, count }))
      }
    });
  } catch (err: any) {
    console.error('[TemplateRoutes] GET / Error:', err);
    res.status(500).json({ error: 'Failed to retrieve templates catalog.', details: err.message });
  }
});

// GET /api/templates/:id - Fetch full template envelope including deep payload
router.get('/:id', async (req: TenantRequest, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId || null;
    const db = req.db || globalPrisma;
    const model = getTemplateModel(db);

    if (!model) {
      return res.status(503).json({ error: 'Template catalog model is unavailable.' });
    }

    const template = await model.findFirst({
      where: {
        OR: [
          { id },
          { slug: id }
        ]
      }
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found.' });
    }

    // Permission check: must be system template or owned by requester's tenant
    if (!template.isSystem && template.tenantId && template.tenantId !== tenantId) {
      return res.status(403).json({ error: 'Unauthorized access to private tenant template.' });
    }

    // Increment popularity metric asynchronously
    model.update({
      where: { id: template.id },
      data: { popularityScore: { increment: 1 } }
    }).catch(() => {});

    res.json({ template });
  } catch (err: any) {
    console.error('[TemplateRoutes] GET /:id Error:', err);
    res.status(500).json({ error: 'Failed to fetch template detail.', details: err.message });
  }
});

// POST /api/templates - Publish or register a new template envelope
router.post('/', async (req: TenantRequest, res) => {
  try {
    const tenantId = req.tenantId || null;
    const db = req.db || globalPrisma;
    const model = getTemplateModel(db);

    const {
      slug,
      builderType,
      name,
      description,
      industry,
      category,
      department,
      tags,
      icon,
      thumbnailUrl,
      version = '1.0.0',
      isSystem = false,
      complexity = 'Intermediate',
      dependencies,
      payload
    } = req.body;

    if (!builderType || !name || !payload) {
      return res.status(400).json({ error: 'Missing required template parameters (builderType, name, payload).' });
    }

    const generatedSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const newTemplate = await model.create({
      data: {
        slug: generatedSlug,
        builderType: builderType.toUpperCase(),
        name,
        description: description || '',
        industry: industry || 'Cross-Industry',
        category: category || 'General',
        department: department || null,
        tags: Array.isArray(tags) ? tags : [],
        icon: icon || null,
        thumbnailUrl: thumbnailUrl || null,
        version,
        isSystem: isSystem && !tenantId ? true : false,
        tenantId: isSystem ? null : tenantId,
        complexity,
        dependencies: dependencies || {},
        payload
      }
    });

    res.status(201).json({ template: newTemplate });
  } catch (err: any) {
    console.error('[TemplateRoutes] POST / Error:', err);
    res.status(500).json({ error: 'Failed to create template.', details: err.message });
  }
});

// POST /api/templates/:id/clone - Clone a template into custom tenant space
router.post('/:id/clone', async (req: TenantRequest, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant context required to clone template.' });
    }

    const db = req.db || globalPrisma;
    const model = getTemplateModel(db);

    const source = await model.findFirst({
      where: {
        OR: [{ id }, { slug: id }]
      }
    });

    if (!source) {
      return res.status(404).json({ error: 'Source template not found.' });
    }

    const clonedSlug = `${source.slug}-custom-${Date.now().toString(36)}`;

    const cloned = await model.create({
      data: {
        slug: clonedSlug,
        builderType: source.builderType,
        name: `${source.name} (Custom Copy)`,
        description: source.description,
        industry: source.industry,
        category: source.category,
        department: source.department,
        tags: source.tags,
        icon: source.icon,
        thumbnailUrl: source.thumbnailUrl,
        version: '1.0.0',
        isSystem: false,
        tenantId,
        complexity: source.complexity,
        dependencies: source.dependencies,
        payload: source.payload
      }
    });

    res.status(201).json({ template: cloned });
  } catch (err: any) {
    console.error('[TemplateRoutes] POST /:id/clone Error:', err);
    res.status(500).json({ error: 'Failed to clone template.', details: err.message });
  }
});

export default router;
