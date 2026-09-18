import { Router, Response } from 'express';
import { TenantRequest } from '../middleware/tenantMiddleware';
import { globalPrisma } from '../lib/prisma';

const router = Router();

// Helper: Compile visual search configuration into executable SQL
export const compileSearchToSql = (config: {
  scopeType?: string;
  targetModuleIds?: string[];
  exposedControls?: any[];
  fieldAliases?: any[];
  entityTarget?: 'records' | 'files';
}): string => {
  const { scopeType = 'MULTI_MODULE', targetModuleIds = [], exposedControls = [], fieldAliases = [], entityTarget = 'records' } = config;

  const whereClauses: string[] = ['r.tenant_id = :tenantId', 'r.status != \'archived\''];

  if (scopeType === 'MULTI_MODULE' && targetModuleIds.length > 0) {
    const formattedIds = targetModuleIds.map(id => `'${id.replace(/'/g, "''")}'`).join(', ');
    whereClauses.push(`r.module_id IN (${formattedIds})`);
  }

  // Parameterized filters
  exposedControls.forEach(ctrl => {
    const pName = (ctrl.parameterName || ctrl.id).replace(/[^a-zA-Z0-9_]/g, '_');
    const fKey = ctrl.fieldKey || ctrl.id;

    if (fKey === 'status') {
      whereClauses.push(`(:${pName} IS NULL OR :${pName} = '' OR r.status = ANY(string_to_array(:${pName}, ',')) OR r.status ILIKE :${pName})`);
    } else if (fKey === 'assigneeId' || fKey === 'assignedTo') {
      whereClauses.push(`(:${pName} IS NULL OR :${pName} = '' OR r.data->>'assigneeId' = :${pName} OR r.data->>'assignedTo' = :${pName})`);
    } else if (ctrl.controlType === 'date_preset' || ctrl.controlType === 'date_range') {
      whereClauses.push(`(:${pName}From IS NULL OR r.created_at >= :${pName}From) AND (:${pName}To IS NULL OR r.created_at <= :${pName}To)`);
    } else if (ctrl.controlType === 'boolean') {
      whereClauses.push(`(:${pName} IS NULL OR :${pName} = '' OR (r.data->>'${fKey.replace(/'/g, "''")}')::boolean = (:${pName} = 'true'))`);
    } else {
      // Custom module field (supports single text or comma-separated multi-select)
      const safeKey = fKey.replace(/'/g, "''");
      whereClauses.push(`(:${pName} IS NULL OR :${pName} = '' OR r.data->>'${safeKey}' ILIKE '%' || :${pName} || '%' OR r.data->>'${safeKey}' = ANY(string_to_array(:${pName}, ',')))`);
    }
  });

  // Cross-module field aliases
  fieldAliases.forEach(alias => {
    const pName = alias.aliasName.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const orParts = (alias.mappings || []).map((m: any) => {
      const safeKey = m.fieldKey.replace(/[^a-zA-Z0-9_]/g, '');
      return `(r.module_id = '${m.moduleId}' AND r.data->>'${safeKey}' ILIKE '%' || :${pName} || '%')`;
    });
    if (orParts.length > 0) {
      whereClauses.push(`(:${pName} IS NULL OR :${pName} = '' OR (${orParts.join(' OR ')}))`);
    }
  });

  const selectFields = [
    'r.id',
    'r.module_id',
    'm.name AS module_name',
    'm.icon AS module_icon',
    'r.status',
    'COALESCE(r.data->>\'title\', r.data->>\'name\', r.id) AS title',
    'r.data->>\'assigneeId\' AS assignee_id',
    'COALESCE(tm.first_name || \' \' || tm.family_name, r.data->>\'assigneeName\', \'Unassigned\') AS assignee_name',
    'r.associations->\'files\' AS files',
    'r.data',
    'r.created_at',
    'r.updated_at'
  ];

  if (entityTarget === 'files') {
    whereClauses.push('(r.associations->\'files\' IS NOT NULL AND jsonb_array_length(CASE WHEN jsonb_typeof(r.associations->\'files\') = \'array\' THEN r.associations->\'files\' ELSE \'[]\'::jsonb END) > 0)');
  }

  return `SELECT 
  ${selectFields.join(',\n  ')}
FROM records r
JOIN modules m ON m.id = r.module_id
LEFT JOIN tenant_members tm ON tm.id = (r.data->>'assigneeId')
WHERE 
  ${whereClauses.join('\n  AND ')}
ORDER BY r.created_at DESC;`;
};

// GET /api/searches - List all searches
router.get('/', async (req: TenantRequest, res: Response) => {
  try {
    const tenantId = req.tenantId || 't1';
    const isSearchOnly = req.query.searchOnly !== 'false';

    const where: any = { tenantId };
    if (isSearchOnly) {
      where.isSearchEnabled = true;
    }

    const searches = await globalPrisma.savedQuery.findMany({
      where,
      orderBy: { updatedAt: 'desc' }
    });

    res.json(searches);
  } catch (err: any) {
    console.error('[SearchesAPI] GET / Error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch searches' });
  }
});

// GET /api/searches/:id - Get single search by ID or slug
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
      return res.status(404).json({ error: 'Search not found' });
    }

    res.json(found);
  } catch (err: any) {
    console.error('[SearchesAPI] GET /:id Error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch search' });
  }
});

// POST /api/searches - Create or Upsert search
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
      isSearchEnabled = true,
      scopeType = 'MULTI_MODULE',
      targetModuleIds = [],
      searchConfig = {},
      allowedRoleIds = [],
      sql,
      parameters = [],
      columnsConfig = [],
      status = 'PUBLISHED',
      cacheTtlSeconds = 0
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Search name is required' });
    }

    const searchSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    // Compile SQL if not provided explicitly
    const finalSql = sql || compileSearchToSql({
      scopeType,
      targetModuleIds,
      exposedControls: searchConfig?.exposedControls || [],
      fieldAliases: searchConfig?.fieldAliases || [],
      entityTarget: searchConfig?.entityTarget || 'records'
    });

    let existing = null;
    if (id) {
      existing = await globalPrisma.savedQuery.findFirst({ where: { id, tenantId } });
    }
    if (!existing) {
      existing = await globalPrisma.savedQuery.findFirst({ where: { tenantId, slug: searchSlug } });
    }

    if (existing) {
      const updated = await globalPrisma.savedQuery.update({
        where: { id: existing.id },
        data: {
          name,
          slug: searchSlug,
          description: description !== undefined ? description : existing.description,
          category: category || existing.category,
          tags: Array.isArray(tags) ? tags : existing.tags,
          iconName: iconName || existing.iconName,
          isSearchEnabled: isSearchEnabled !== undefined ? isSearchEnabled : existing.isSearchEnabled,
          scopeType: scopeType || existing.scopeType,
          targetModuleIds: Array.isArray(targetModuleIds) ? targetModuleIds : existing.targetModuleIds,
          searchConfig: searchConfig || existing.searchConfig,
          allowedRoleIds: Array.isArray(allowedRoleIds) ? allowedRoleIds : existing.allowedRoleIds,
          sql: finalSql,
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
        slug: searchSlug,
        description: description || '',
        category: category || 'General',
        tags: Array.isArray(tags) ? tags : [],
        iconName: iconName || 'Search',
        isSearchEnabled: isSearchEnabled !== undefined ? isSearchEnabled : true,
        scopeType,
        targetModuleIds,
        searchConfig,
        allowedRoleIds,
        sql: finalSql,
        parameters,
        columnsConfig,
        status,
        cacheTtlSeconds
      }
    });

    res.json(created);
  } catch (err: any) {
    console.error('[SearchesAPI] POST / Error:', err);
    res.status(500).json({ error: err.message || 'Failed to save search' });
  }
});

// POST /api/searches/compile - Preview generated SQL from visual config
router.post('/compile', (req: TenantRequest, res: Response) => {
  try {
    const { scopeType, targetModuleIds, exposedControls, fieldAliases, entityTarget } = req.body;
    const sql = compileSearchToSql({
      scopeType,
      targetModuleIds,
      exposedControls,
      fieldAliases,
      entityTarget
    });
    res.json({ sql });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to compile search' });
  }
});

// POST /api/searches/execute - Execute parameterized search
router.post('/execute', async (req: TenantRequest, res: Response) => {
  const startTime = Date.now();
  try {
    const tenantId = req.tenantId || 't1';
    const user = (req as any).user || { uid: 'u1' };
    const {
      searchId,
      parameters = {},
      page = 1,
      pageSize = 25,
      sortKey,
      sortDirection = 'desc',
      keyword
    } = req.body;

    let targetSearch: any = null;
    if (searchId) {
      targetSearch = await globalPrisma.savedQuery.findFirst({
        where: {
          tenantId,
          OR: [{ id: searchId }, { slug: searchId }]
        }
      });
    }

    // Determine target module IDs
    let targetModuleIds: string[] = [];
    if (targetSearch?.targetModuleIds && Array.isArray(targetSearch.targetModuleIds)) {
      targetModuleIds = targetSearch.targetModuleIds;
    } else if (req.body.targetModuleIds && Array.isArray(req.body.targetModuleIds)) {
      targetModuleIds = req.body.targetModuleIds;
    }

    // Build dynamic WHERE query
    const whereConditions: string[] = [
      `r.tenant_id = '${tenantId.replace(/'/g, "''")}'`,
      `r.status != 'archived'`
    ];

    // Module scoping
    if (targetModuleIds.length > 0) {
      const escapedModuleIds = targetModuleIds.map(id => `'${id.replace(/'/g, "''")}'`).join(', ');
      whereConditions.push(`r.module_id IN (${escapedModuleIds})`);
    }

    // Keyword Omnisearch
    if (keyword && typeof keyword === 'string' && keyword.trim()) {
      const cleanKw = keyword.trim().replace(/'/g, "''");
      whereConditions.push(`(
        r.id ILIKE '%${cleanKw}%' OR 
        r.data->>'title' ILIKE '%${cleanKw}%' OR 
        r.data->>'name' ILIKE '%${cleanKw}%' OR 
        r.data::text ILIKE '%${cleanKw}%'
      )`);
    }

    // Dynamic parameter bindings
    Object.entries(parameters).forEach(([key, val]) => {
      if (val === undefined || val === null || val === '') return;

      // Handle Current User token
      let resolvedVal = val;
      if (typeof val === 'string' && (val === '@me' || val === ':currentUser')) {
        resolvedVal = user.uid;
      }

      if (key === 'status') {
        const statuses = Array.isArray(resolvedVal) 
          ? resolvedVal 
          : (typeof resolvedVal === 'string' && resolvedVal.includes(',') 
              ? resolvedVal.split(',').map(s => s.trim()).filter(Boolean)
              : [resolvedVal]);
        
        if (statuses.length > 1) {
          const formattedList = statuses.map((st: any) => `'${String(st).replace(/'/g, "''")}'`).join(', ');
          whereConditions.push(`r.status IN (${formattedList})`);
        } else if (statuses.length === 1 && statuses[0]) {
          const cleanStatus = String(statuses[0]).replace(/'/g, "''");
          whereConditions.push(`r.status ILIKE '${cleanStatus}'`);
        }
      } else if (key === 'assigneeId' || key === 'assignedTo' || key === 'allocatedTo') {
        const cleanAssignee = String(resolvedVal).replace(/'/g, "''");
        whereConditions.push(`(r.data->>'assigneeId' = '${cleanAssignee}' OR r.data->>'assignedTo' = '${cleanAssignee}')`);
      } else if (key === 'datePreset') {
        // Date presets
        const now = new Date();
        if (resolvedVal === 'today') {
          const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
          whereConditions.push(`r.created_at >= '${start}'`);
        } else if (resolvedVal === 'past_7_days' || resolvedVal === '7d') {
          const past7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
          whereConditions.push(`r.created_at >= '${past7}'`);
        } else if (resolvedVal === 'past_30_days' || resolvedVal === '30d') {
          const past30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
          whereConditions.push(`r.created_at >= '${past30}'`);
        }
      } else if (key.endsWith('From')) {
        whereConditions.push(`r.created_at >= '${String(resolvedVal).replace(/'/g, "''")}'`);
      } else if (key.endsWith('To')) {
        whereConditions.push(`r.created_at <= '${String(resolvedVal).replace(/'/g, "''")}'`);
      } else {
        // Custom field on records.data
        const cleanKey = key.replace(/[^a-zA-Z0-9_]/g, '');
        if (typeof resolvedVal === 'boolean' || resolvedVal === 'true' || resolvedVal === 'false') {
          const boolVal = String(resolvedVal) === 'true';
          whereConditions.push(`(r.data->>'${cleanKey}')::boolean = ${boolVal}`);
        } else if (Array.isArray(resolvedVal) || (typeof resolvedVal === 'string' && resolvedVal.includes(','))) {
          const items = Array.isArray(resolvedVal)
            ? resolvedVal
            : resolvedVal.split(',').map((s: string) => s.trim()).filter(Boolean);
          if (items.length > 0) {
            const orConditions = items.map((it: any) => {
              const cleanItem = String(it).replace(/'/g, "''");
              return `(r.data->>'${cleanKey}' ILIKE '%${cleanItem}%' OR r.data->>'${cleanKey}' = '${cleanItem}')`;
            });
            whereConditions.push(`(${orConditions.join(' OR ')})`);
          }
        } else {
          const cleanVal = String(resolvedVal).replace(/'/g, "''");
          whereConditions.push(`r.data->>'${cleanKey}' ILIKE '%${cleanVal}%'`);
        }
      }
    });

    const whereClause = whereConditions.join(' AND ');

    // Order By
    let orderByClause = 'r.created_at DESC';
    if (sortKey) {
      const safeSortKey = sortKey.replace(/[^a-zA-Z0-9_]/g, '');
      const dir = sortDirection?.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
      if (['id', 'status', 'created_at', 'updated_at'].includes(safeSortKey)) {
        orderByClause = `r.${safeSortKey} ${dir}`;
      } else {
        orderByClause = `r.data->>'${safeSortKey}' ${dir}`;
      }
    }

    const limit = Math.min(Math.max(Number(pageSize) || 25, 1), 100);
    const offset = Math.max((Number(page) || 1) - 1, 0) * limit;

    // Count query
    const countSql = `SELECT COUNT(*)::int AS total FROM records r WHERE ${whereClause};`;

    // Data query
    const dataSql = `
      SELECT 
        r.id,
        r.module_id,
        m.name AS module_name,
        m.icon AS module_icon,
        r.status,
        COALESCE(r.data->>'title', r.data->>'name', r.id) AS title,
        r.data->>'assigneeId' AS assignee_id,
        COALESCE(tm.first_name || ' ' || tm.family_name, r.data->>'assigneeName', 'Unassigned') AS assignee_name,
        tm.avatar_url AS assignee_avatar,
        r.associations->'files' AS files,
        r.data,
        r.created_at,
        r.updated_at
      FROM records r
      JOIN modules m ON m.id = r.module_id
      LEFT JOIN tenant_members tm ON tm.id = (r.data->>'assigneeId')
      WHERE ${whereClause}
      ORDER BY ${orderByClause}
      LIMIT ${limit} OFFSET ${offset};
    `;

    // Execute via raw query inside tenant RLS transaction
    const [countResult, rowsResult] = await globalPrisma.$transaction(async (tx: any) => {
      await tx.$executeRawUnsafe(`SET LOCAL app.current_tenant_id = '${tenantId.replace(/'/g, "''")}'`);
      await tx.$executeRawUnsafe(`SET LOCAL app.current_user_id = '${(user.uid || 'u1').replace(/'/g, "''")}'`);
      
      const countRes = await tx.$queryRawUnsafe(countSql);
      const rowsRes = await tx.$queryRawUnsafe(dataSql);
      return [countRes, rowsRes];
    });

    const totalCount = Number(countResult?.[0]?.total || 0);
    const duration = Date.now() - startTime;

    res.json({
      success: true,
      rows: rowsResult || [],
      rowCount: (rowsResult || []).length,
      totalCount,
      page: Number(page) || 1,
      pageSize: limit,
      durationMs: duration,
      columns: [
        { name: 'id', type: 'string' },
        { name: 'module_name', type: 'string' },
        { name: 'title', type: 'string' },
        { name: 'status', type: 'badge' },
        { name: 'assignee_name', type: 'user' },
        { name: 'created_at', type: 'date' },
        { name: 'files', type: 'files' }
      ]
    });
  } catch (err: any) {
    console.error('[SearchesAPI] POST /execute Error:', err);
    res.status(500).json({ error: err.message || 'Search execution failed' });
  }
});

// DELETE /api/searches/:id - Delete search
router.delete('/:id', async (req: TenantRequest, res: Response) => {
  try {
    const tenantId = req.tenantId || 't1';
    const { id } = req.params;

    const existing = await globalPrisma.savedQuery.findFirst({
      where: { id, tenantId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Search not found' });
    }

    const removed = await globalPrisma.savedQuery.delete({
      where: { id: existing.id }
    });

    res.json({ success: true, removed });
  } catch (err: any) {
    console.error('[SearchesAPI] DELETE /:id Error:', err);
    res.status(500).json({ error: err.message || 'Failed to delete search' });
  }
});

export default router;
