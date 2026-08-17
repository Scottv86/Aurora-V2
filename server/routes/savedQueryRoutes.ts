import { Router, Response } from 'express';
import { TenantRequest } from '../middleware/tenantMiddleware';
import { globalPrisma } from '../lib/prisma';

const router = Router();

// GET /api/saved-queries - List all queries for tenant
router.get('/', async (req: TenantRequest, res: Response) => {
  try {
    const tenantId = req.tenantId || 't1';
    const queries = await globalPrisma.savedQuery.findMany({
      where: { tenantId },
      orderBy: { updatedAt: 'desc' }
    });
    res.json(queries);
  } catch (err: any) {
    console.error('[SavedQueriesAPI] GET / Error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch saved queries' });
  }
});

// GET /api/saved-queries/:id - Get single query
router.get('/:id', async (req: TenantRequest, res: Response) => {
  try {
    const tenantId = req.tenantId || 't1';
    const { id } = req.params;

    const found = await globalPrisma.savedQuery.findFirst({
      where: {
        tenantId,
        OR: [{ id }, { slug: id }]
      }
    });

    if (!found) {
      return res.status(404).json({ error: 'Saved query not found' });
    }

    res.json(found);
  } catch (err: any) {
    console.error('[SavedQueriesAPI] GET /:id Error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch saved query' });
  }
});

// POST /api/saved-queries - Create or Upsert query
router.post('/', async (req: TenantRequest, res: Response) => {
  try {
    const tenantId = req.tenantId || 't1';
    const { 
      id, 
      name, 
      slug, 
      description, 
      category, 
      tags, 
      iconName, 
      sql, 
      parameters, 
      columnsConfig, 
      status, 
      cacheTtlSeconds 
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Query name is required' });
    }

    const querySlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    // Check if query exists by ID
    let existing = null;
    if (id) {
      existing = await globalPrisma.savedQuery.findFirst({
        where: { id, tenantId }
      });
    }

    if (!existing) {
      // Check if query exists with matching slug in tenant
      existing = await globalPrisma.savedQuery.findFirst({
        where: { tenantId, slug: querySlug }
      });
    }

    if (existing) {
      const updated = await globalPrisma.savedQuery.update({
        where: { id: existing.id },
        data: {
          name,
          slug: querySlug,
          description: description !== undefined ? description : existing.description,
          category: category || existing.category,
          tags: Array.isArray(tags) ? tags : existing.tags,
          iconName: iconName || existing.iconName,
          sql: sql !== undefined ? sql : existing.sql,
          parameters: Array.isArray(parameters) ? parameters : existing.parameters,
          columnsConfig: Array.isArray(columnsConfig) ? columnsConfig : existing.columnsConfig,
          status: status || existing.status,
          cacheTtlSeconds: typeof cacheTtlSeconds === 'number' ? cacheTtlSeconds : existing.cacheTtlSeconds,
          updatedAt: new Date()
        }
      });
      return res.json(updated);
    }

    const created = await globalPrisma.savedQuery.create({
      data: {
        ...(id ? { id } : {}),
        tenantId,
        name,
        slug: querySlug,
        description: description || '',
        category: category || 'General',
        tags: Array.isArray(tags) ? tags : [],
        iconName: iconName || 'Database',
        sql: sql || 'SELECT * FROM workspaces LIMIT 10;',
        parameters: Array.isArray(parameters) ? parameters : [],
        columnsConfig: Array.isArray(columnsConfig) ? columnsConfig : [],
        status: status || 'DRAFT',
        cacheTtlSeconds: typeof cacheTtlSeconds === 'number' ? cacheTtlSeconds : 0,
        downstreamUsagesCount: 0
      }
    });

    res.json(created);
  } catch (err: any) {
    console.error('[SavedQueriesAPI] POST / Error:', err);
    res.status(500).json({ error: err.message || 'Failed to save query' });
  }
});

// PUT /api/saved-queries/:id - Update existing query
router.put('/:id', async (req: TenantRequest, res: Response) => {
  try {
    const tenantId = req.tenantId || 't1';
    const { id } = req.params;

    const existing = await globalPrisma.savedQuery.findFirst({
      where: { id, tenantId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Saved query not found' });
    }

    const updated = await globalPrisma.savedQuery.update({
      where: { id: existing.id },
      data: {
        ...(req.body.name ? { name: req.body.name } : {}),
        ...(req.body.slug ? { slug: req.body.slug } : {}),
        ...(req.body.description !== undefined ? { description: req.body.description } : {}),
        ...(req.body.category ? { category: req.body.category } : {}),
        ...(req.body.tags ? { tags: req.body.tags } : {}),
        ...(req.body.iconName ? { iconName: req.body.iconName } : {}),
        ...(req.body.sql !== undefined ? { sql: req.body.sql } : {}),
        ...(req.body.parameters ? { parameters: req.body.parameters } : {}),
        ...(req.body.columnsConfig ? { columnsConfig: req.body.columnsConfig } : {}),
        ...(req.body.status ? { status: req.body.status } : {}),
        ...(typeof req.body.cacheTtlSeconds === 'number' ? { cacheTtlSeconds: req.body.cacheTtlSeconds } : {}),
        ...(typeof req.body.downstreamUsagesCount === 'number' ? { downstreamUsagesCount: req.body.downstreamUsagesCount } : {}),
        updatedAt: new Date()
      }
    });

    res.json(updated);
  } catch (err: any) {
    console.error('[SavedQueriesAPI] PUT /:id Error:', err);
    res.status(500).json({ error: err.message || 'Failed to update saved query' });
  }
});

// DELETE /api/saved-queries/:id - Delete query
router.delete('/:id', async (req: TenantRequest, res: Response) => {
  try {
    const tenantId = req.tenantId || 't1';
    const { id } = req.params;

    const existing = await globalPrisma.savedQuery.findFirst({
      where: { id, tenantId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Saved query not found' });
    }

    const removed = await globalPrisma.savedQuery.delete({
      where: { id: existing.id }
    });

    res.json({ success: true, removed });
  } catch (err: any) {
    console.error('[SavedQueriesAPI] DELETE /:id Error:', err);
    res.status(500).json({ error: err.message || 'Failed to delete saved query' });
  }
});

export default router;
