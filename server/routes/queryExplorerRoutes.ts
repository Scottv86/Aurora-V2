import { Router } from 'express';
import { TenantRequest } from '../middleware/tenantMiddleware';

const router = Router();

const PHYSICAL_TABLES_WHITELIST = [
  'workspaces',
  'modules',
  'records',
  'tenant_members',
  'member_phone_numbers',
  'member_certifications',
  'member_education',
  'member_skills',
  'teams',
  'agents',
  'positions',
  'permission_groups',
  'member_permission_groups',
  'audit_logs',
  'parties',
  'persons',
  'organizations',
  'party_relationships',
  'member_successions',
  'employment_contracts',
  'global_lists',
  'global_list_items',
  'tenant_connectors',
  'automations',
  'automation_runs',
  'catalog_items'
];

const TABLE_SCHEMAS: Record<string, Array<{ name: string; type: string; nullable: boolean; isPrimary?: boolean }>> = {
  workspaces: [
    { name: 'id', type: 'TEXT', nullable: false, isPrimary: true },
    { name: 'name', type: 'TEXT', nullable: false },
    { name: 'tenant_id', type: 'TEXT', nullable: false }
  ],
  modules: [
    { name: 'id', type: 'TEXT', nullable: false, isPrimary: true },
    { name: 'workspace_id', type: 'TEXT', nullable: false },
    { name: 'name', type: 'TEXT', nullable: false },
    { name: 'category', type: 'TEXT', nullable: false },
    { name: 'enabled', type: 'BOOLEAN', nullable: false },
    { name: 'icon', type: 'TEXT', nullable: false },
    { name: 'type', type: 'TEXT', nullable: false }
  ],
  records: [
    { name: 'id', type: 'TEXT', nullable: false, isPrimary: true },
    { name: 'module_id', type: 'TEXT', nullable: false },
    { name: 'status', type: 'TEXT', nullable: false },
    { name: 'created_at', type: 'TIMESTAMP', nullable: false },
    { name: 'updated_at', type: 'TIMESTAMP', nullable: false },
    { name: 'created_by_member_id', type: 'TEXT', nullable: true },
    { name: 'path', type: 'TEXT', nullable: true },
    { name: 'associations', type: 'JSON', nullable: false }
  ],
  tenant_members: [
    { name: 'id', type: 'TEXT', nullable: false, isPrimary: true },
    { name: 'first_name', type: 'TEXT', nullable: true },
    { name: 'family_name', type: 'TEXT', nullable: true },
    { name: 'work_email', type: 'TEXT', nullable: true },
    { name: 'role_id', type: 'TEXT', nullable: false },
    { name: 'status', type: 'TEXT', nullable: false },
    { name: 'team_id', type: 'TEXT', nullable: true },
    { name: 'position_id', type: 'TEXT', nullable: true },
    { name: 'start_date', type: 'TIMESTAMP', nullable: true },
    { name: 'licence_type', type: 'TEXT', nullable: false }
  ],
  member_phone_numbers: [
    { name: 'id', type: 'TEXT', nullable: false, isPrimary: true },
    { name: 'member_id', type: 'TEXT', nullable: false },
    { name: 'label', type: 'TEXT', nullable: false },
    { name: 'number', type: 'TEXT', nullable: false }
  ],
  member_certifications: [
    { name: 'id', type: 'TEXT', nullable: false, isPrimary: true },
    { name: 'member_id', type: 'TEXT', nullable: false },
    { name: 'name', type: 'TEXT', nullable: false },
    { name: 'issuer', type: 'TEXT', nullable: true },
    { name: 'date_obtained', type: 'TIMESTAMP', nullable: true },
    { name: 'expiry_date', type: 'TIMESTAMP', nullable: true }
  ],
  member_education: [
    { name: 'id', type: 'TEXT', nullable: false, isPrimary: true },
    { name: 'member_id', type: 'TEXT', nullable: false },
    { name: 'institution', type: 'TEXT', nullable: false },
    { name: 'degree', type: 'TEXT', nullable: true },
    { name: 'field_of_study', type: 'TEXT', nullable: true },
    { name: 'start_date', type: 'TIMESTAMP', nullable: true },
    { name: 'end_date', type: 'TIMESTAMP', nullable: true }
  ],
  member_skills: [
    { name: 'id', type: 'TEXT', nullable: false, isPrimary: true },
    { name: 'member_id', type: 'TEXT', nullable: false },
    { name: 'name', type: 'TEXT', nullable: false },
    { name: 'proficiency_level', type: 'TEXT', nullable: true }
  ],
  teams: [
    { name: 'id', type: 'TEXT', nullable: false, isPrimary: true },
    { name: 'name', type: 'TEXT', nullable: false },
    { name: 'description', type: 'TEXT', nullable: true },
    { name: 'created_at', type: 'TIMESTAMP', nullable: false }
  ],
  agents: [
    { name: 'id', type: 'TEXT', nullable: false, isPrimary: true },
    { name: 'name', type: 'TEXT', nullable: false },
    { name: 'model_type', type: 'TEXT', nullable: false },
    { name: 'created_at', type: 'TIMESTAMP', nullable: false }
  ],
  positions: [
    { name: 'id', type: 'TEXT', nullable: false, isPrimary: true },
    { name: 'position_number', type: 'TEXT', nullable: false },
    { name: 'title', type: 'TEXT', nullable: false },
    { name: 'description', type: 'TEXT', nullable: true },
    { name: 'parent_id', type: 'TEXT', nullable: true }
  ],
  permission_groups: [
    { name: 'id', type: 'TEXT', nullable: false, isPrimary: true },
    { name: 'name', type: 'TEXT', nullable: false },
    { name: 'description', type: 'TEXT', nullable: true },
    { name: 'created_at', type: 'TIMESTAMP', nullable: false }
  ],
  member_permission_groups: [
    { name: 'member_id', type: 'TEXT', nullable: false, isPrimary: true },
    { name: 'permission_group_id', type: 'TEXT', nullable: false, isPrimary: true },
    { name: 'assigned_at', type: 'TIMESTAMP', nullable: false }
  ],
  audit_logs: [
    { name: 'id', type: 'TEXT', nullable: false, isPrimary: true },
    { name: 'actor_id', type: 'TEXT', nullable: false },
    { name: 'action', type: 'TEXT', nullable: false },
    { name: 'resource_id', type: 'TEXT', nullable: false },
    { name: 'timestamp', type: 'TIMESTAMP', nullable: false }
  ],
  parties: [
    { name: 'id', type: 'TEXT', nullable: false, isPrimary: true },
    { name: 'party_type', type: 'TEXT', nullable: false },
    { name: 'status', type: 'TEXT', nullable: false },
    { name: 'created_at', type: 'TIMESTAMP', nullable: false }
  ],
  persons: [
    { name: 'party_id', type: 'TEXT', nullable: false, isPrimary: true },
    { name: 'first_name', type: 'TEXT', nullable: false },
    { name: 'last_name', type: 'TEXT', nullable: false },
    { name: 'date_of_birth', type: 'TIMESTAMP', nullable: true }
  ],
  organizations: [
    { name: 'party_id', type: 'TEXT', nullable: false, isPrimary: true },
    { name: 'legal_name', type: 'TEXT', nullable: false },
    { name: 'org_structure_type', type: 'TEXT', nullable: false },
    { name: 'incorporation_date', type: 'TIMESTAMP', nullable: true },
    { name: 'tax_identifier', type: 'TEXT', nullable: true }
  ],
  party_relationships: [
    { name: 'id', type: 'TEXT', nullable: false, isPrimary: true },
    { name: 'source_party_id', type: 'TEXT', nullable: false },
    { name: 'target_party_id', type: 'TEXT', nullable: false },
    { name: 'relationship_type', type: 'TEXT', nullable: false }
  ],
  member_successions: [
    { name: 'id', type: 'TEXT', nullable: false, isPrimary: true },
    { name: 'position_id', type: 'TEXT', nullable: false },
    { name: 'member_id', type: 'TEXT', nullable: false },
    { name: 'ranking', type: 'INTEGER', nullable: false }
  ],
  employment_contracts: [
    { name: 'id', type: 'TEXT', nullable: false, isPrimary: true },
    { name: 'member_id', type: 'TEXT', nullable: false },
    { name: 'type', type: 'TEXT', nullable: false },
    { name: 'status', type: 'TEXT', nullable: false },
    { name: 'start_date', type: 'TIMESTAMP', nullable: false },
    { name: 'end_date', type: 'TIMESTAMP', nullable: true }
  ],
  global_lists: [
    { name: 'id', type: 'TEXT', nullable: false, isPrimary: true },
    { name: 'name', type: 'TEXT', nullable: false },
    { name: 'description', type: 'TEXT', nullable: true }
  ],
  global_list_items: [
    { name: 'id', type: 'TEXT', nullable: false, isPrimary: true },
    { name: 'list_id', type: 'TEXT', nullable: false },
    { name: 'value', type: 'TEXT', nullable: false },
    { name: 'label', type: 'TEXT', nullable: false }
  ],
  tenant_connectors: [
    { name: 'id', type: 'TEXT', nullable: false, isPrimary: true },
    { name: 'name', type: 'TEXT', nullable: false },
    { name: 'connector_type', type: 'TEXT', nullable: false },
    { name: 'enabled', type: 'BOOLEAN', nullable: false }
  ],
  automations: [
    { name: 'id', type: 'TEXT', nullable: false, isPrimary: true },
    { name: 'name', type: 'TEXT', nullable: false },
    { name: 'trigger_type', type: 'TEXT', nullable: false },
    { name: 'enabled', type: 'BOOLEAN', nullable: false },
    { name: 'created_at', type: 'TIMESTAMP', nullable: false }
  ],
  automation_runs: [
    { name: 'id', type: 'TEXT', nullable: false, isPrimary: true },
    { name: 'automation_id', type: 'TEXT', nullable: false },
    { name: 'status', type: 'TEXT', nullable: false },
    { name: 'started_at', type: 'TIMESTAMP', nullable: false },
    { name: 'finished_at', type: 'TIMESTAMP', nullable: true }
  ],
  catalog_items: [
    { name: 'id', type: 'TEXT', nullable: false, isPrimary: true },
    { name: 'name', type: 'TEXT', nullable: false },
    { name: 'code', type: 'TEXT', nullable: false },
    { name: 'price', type: 'DECIMAL', nullable: false }
  ]
};

function cleanQuery(query: string): string {
  // Strip single-line comments
  let cleaned = query.replace(/--.*$/gm, '');
  // Strip multi-line comments
  cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');
  return cleaned.trim();
}

function validateQuerySecurity(query: string, allowedTables: string[]): { isValid: boolean; error?: string } {
  const cleaned = cleanQuery(query);
  
  if (!cleaned) {
    return { isValid: false, error: 'Query is empty.' };
  }

  // 1. Check stacked queries (semicolons)
  // Strip string literals to avoid blocking semicolons inside strings
  const strippedStrings = cleaned
    .replace(/'[^']*'/g, '')
    .replace(/"[^"]*"/g, '')
    .replace(/\$\$[\s\S]*?\$\$/g, '');
  
  if (strippedStrings.includes(';')) {
    // Semicolon is only allowed if it is the very last non-whitespace character
    const lastCharIndex = cleaned.lastIndexOf(';');
    const isOnlyTrailing = cleaned.substring(lastCharIndex + 1).trim() === '';
    if (!isOnlyTrailing) {
      return { isValid: false, error: 'Stacked queries (semicolons) are blocked for safety.' };
    }
  }

  // 2. Query must start with SELECT or WITH
  const normalized = cleaned.toLowerCase();
  if (!normalized.startsWith('select') && !normalized.startsWith('with')) {
    return { isValid: false, error: 'Only SELECT or WITH queries are allowed.' };
  }

  // 3. Blacklist of forbidden SQL commands, tables, or terms
  const forbiddenKeywords = [
    'insert', 'update', 'delete', 'drop', 'alter', 'create', 'truncate',
    'grant', 'revoke', 'reindex', 'vacuum', 'analyze', 'set', 'reset',
    'copy', 'begin', 'commit', 'rollback', 'users', 'tenants', '_prisma_migrations',
    'information_schema'
  ];
  
  for (const keyword of forbiddenKeywords) {
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    if (regex.test(cleaned)) {
      return { isValid: false, error: `Access to table, command, or term '${keyword}' is restricted.` };
    }
  }

  if (/\bpg_/i.test(cleaned)) {
    return { isValid: false, error: 'Access to system tables, catalogs, or functions starting with pg_ is restricted.' };
  }

  // 4. Validate Table References in FROM/JOIN clauses
  const fromJoinRegex = /(?:from|join)\s+(?:"([^"]+)"|([a-zA-Z_][a-zA-Z0-9_]*))/gi;
  const matches = [...cleaned.matchAll(fromJoinRegex)];
  
  for (const match of matches) {
    const rawTableName = match[1] || match[2];
    const tableName = rawTableName.toLowerCase();
    const cleanName = tableName.replace(/_/g, ' ');
    
    const isAllowedPhysical = PHYSICAL_TABLES_WHITELIST.includes(tableName);
    const isAllowedModule = allowedTables.includes(tableName) || allowedTables.includes(cleanName);
    
    if (!isAllowedPhysical && !isAllowedModule) {
      return { isValid: false, error: `Access to table '${rawTableName}' is restricted or table does not exist.` };
    }
  }

  return { isValid: true };
}

/**
 * GET /api/query-explorer/schema
 * Returns the whitelisted schema and dynamic module configurations for Object Explorer.
 */
router.get('/schema', async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    
    // Fetch custom modules for the tenant
    const modules = await db.module.findMany({
      where: { enabled: true }
    });
    
    const physicalTables = Object.entries(TABLE_SCHEMAS).map(([name, columns]) => ({
      name,
      columns
    }));

    const customModules = modules.map(m => {
      const config = m.config as any;
      const columns = [
        { name: 'id', type: 'TEXT', label: 'ID' },
        { name: 'created_at', type: 'TIMESTAMP', label: 'Created At' },
        { name: 'updated_at', type: 'TIMESTAMP', label: 'Updated At' },
        { name: 'status', type: 'TEXT', label: 'Status' }
      ];

      if (config && Array.isArray(config.layout)) {
        config.layout.forEach((f: any) => {
          if (f.name) {
            columns.push({
              name: f.name,
              type: f.type ? f.type.toUpperCase() : 'TEXT',
              label: f.label || f.name
            });
          }
        });
      }

      return {
        name: m.name,
        displayName: m.name,
        columns
      };
    });

    res.json({
      physicalTables,
      customModules
    });
  } catch (error: any) {
    console.error('[QueryExplorer API] Failed to fetch schema:', error);
    res.status(500).json({ error: 'Failed to retrieve schema definitions.' });
  }
});

/**
 * POST /api/query-explorer/query
 * Executes a SELECT query inside a tenant-scoped transaction.
 */
router.post('/query', async (req: TenantRequest, res) => {
  const { query } = req.body;
  const tenantId = req.tenantId!;
  const user = req.user!;
  
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Missing SQL query parameter.' });
  }

  try {
    const db = req.db!;

    // 1. Fetch modules to populate dynamic tables whitelist
    const modules = await db.module.findMany({
      where: { enabled: true }
    });

    const moduleNames = modules.map(m => m.name.toLowerCase());
    const snakeModuleNames = modules.map(m => m.name.toLowerCase().replace(/\s+/g, '_'));
    const allowedTables = [...moduleNames, ...snakeModuleNames];

    // 2. Security Validation
    const securityCheck = validateQuerySecurity(query, allowedTables);
    if (!securityCheck.isValid) {
      return res.status(400).json({ error: securityCheck.error });
    }

    // 3. Prepend CTE definitions for custom modules
    // Strip trailing semicolon from user query
    let userQuery = cleanQuery(query);
    if (userQuery.endsWith(';')) {
      userQuery = userQuery.substring(0, userQuery.length - 1).trim();
    }

    // 3. Prepend CTE definitions for custom modules
    const ctes: string[] = [];
    modules.forEach(m => {
      const moduleName = m.name;
      const snakeName = moduleName.toLowerCase().replace(/\s+/g, '_');
      const escapedName = moduleName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      
      const isReferenced = new RegExp(`\\b"${escapedName}"\\b|\\b${escapedName}\\b|\\b${snakeName}\\b`, 'i').test(userQuery);
      if (!isReferenced) return;

      const config = m.config as any;
      const selectCols = [
        'id',
        'created_at AS "created_at"',
        'updated_at AS "updated_at"',
        'status'
      ];

      if (config && Array.isArray(config.layout)) {
        config.layout.forEach((f: any) => {
          if (f.name) {
            const safeFieldName = f.name.replace(/[^a-zA-Z0-9_]/g, '');
            selectCols.push(`data->>'${safeFieldName}' AS "${safeFieldName}"`);
          }
        });
      }

      const subquery = `SELECT ${selectCols.join(', ')} FROM records WHERE module_id = '${m.id}' AND tenant_id = '${tenantId}' AND status = 'active'`;
      
      // Push double-quoted display name
      ctes.push(`"${m.name}" AS (${subquery})`);
      
      // Push snake_cased display name
      ctes.push(`"${snakeName}" AS (${subquery})`);
    });

    // Combine CTEs with query
    let finalQuery = '';
    if (ctes.length > 0) {
      const isCteQuery = userQuery.toLowerCase().startsWith('with');
      if (isCteQuery) {
        // Strip the user's WITH keyword and append ours
        const withoutWith = userQuery.replace(/^\s*with\s+/i, '');
        finalQuery = `WITH ${ctes.join(',\n')},\n${withoutWith}`;
      } else {
        finalQuery = `WITH ${ctes.join(',\n')}\n${userQuery}`;
      }
    } else {
      finalQuery = userQuery;
    }

    console.log(`[QueryExplorer API] Executing translated SQL (Tenant: ${tenantId}):\n${finalQuery}`);

    // 4. Execute inside a PostgreSQL transaction to bind RLS variables
    const startTime = Date.now();
    const results = await db.$transaction(async (tx: any) => {
      // Set session variables (SET LOCAL persists only for this transaction)
      await tx.$executeRawUnsafe(`SET LOCAL app.current_tenant_id = '${tenantId.replace(/'/g, "''")}'`);
      await tx.$executeRawUnsafe(`SET LOCAL app.current_user_id = '${user.uid.replace(/'/g, "''")}'`);
      await tx.$executeRawUnsafe(`SET LOCAL app.is_superadmin = '${user.isSuperAdmin ? 'true' : 'false'}'`);
      await tx.$executeRawUnsafe(`SET ROLE authenticated`);

      // Run raw user query
      return await tx.$queryRawUnsafe(finalQuery);
    }, {
      timeout: 10000 // 10 second timeout for user queries
    });

    const duration = Date.now() - startTime;

    res.json({
      success: true,
      rows: results || [],
      rowCount: Array.isArray(results) ? results.length : 0,
      durationMs: duration
    });
  } catch (error: any) {
    console.error('[QueryExplorer API] SQL Query Execution Failure:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'An error occurred during query execution.'
    });
  }
});

export default router;
