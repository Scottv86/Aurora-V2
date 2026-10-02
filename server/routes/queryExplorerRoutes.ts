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

interface IntrospectedSchema {
  physicalTables: Array<{
    name: string;
    displayName?: string;
    columns: Array<{
      name: string;
      type: string;
      nullable: boolean;
      isPrimary?: boolean;
      foreignKey?: { targetTable: string; targetColumn: string };
    }>;
    foreignKeys: Record<string, { targetTable: string; targetColumn: string }>;
  }>;
  tableWhitelist: string[];
  foreignKeyMap: Record<string, { targetTable: string; targetColumn: string }>;
  columnToFkMap: Record<string, { targetTable: string; targetColumn: string }>;
  timestamp: number;
}

let cachedSchema: IntrospectedSchema | null = null;
const SCHEMA_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getIntrospectedSchema(db: any): Promise<IntrospectedSchema> {
  const now = Date.now();
  if (cachedSchema && (now - cachedSchema.timestamp) < SCHEMA_CACHE_TTL) {
    return cachedSchema;
  }

  try {
    const [tables, cols, pks, fks]: [any[], any[], any[], any[]] = await Promise.all([
      db.$queryRawUnsafe(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
          AND table_name NOT IN ('_prisma_migrations', 'users', 'tenants')
        ORDER BY table_name;
      `),
      db.$queryRawUnsafe(`
        SELECT table_name, column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public'
        ORDER BY table_name, ordinal_position;
      `),
      db.$queryRawUnsafe(`
        SELECT tc.table_name, kcu.column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        WHERE tc.constraint_type = 'PRIMARY KEY'
          AND tc.table_schema = 'public';
      `),
      db.$queryRawUnsafe(`
        SELECT
          tc.table_name AS source_table,
          kcu.column_name AS source_column,
          ccu.table_name AS target_table,
          ccu.column_name AS target_column
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public';
      `)
    ]);

    const pkSet = new Set(pks.map(p => `${p.table_name}.${p.column_name}`));
    const fkMap: Record<string, { targetTable: string; targetColumn: string }> = {};
    const columnToFkMap: Record<string, { targetTable: string; targetColumn: string }> = {};

    fks.forEach(f => {
      const key = `${f.source_table}.${f.source_column}`;
      const val = { targetTable: f.target_table, targetColumn: f.target_column };
      fkMap[key] = val;
      if (!columnToFkMap[f.source_column]) {
        columnToFkMap[f.source_column] = val;
      }
    });

    const tableColsMap: Record<string, any[]> = {};
    cols.forEach(c => {
      if (!tableColsMap[c.table_name]) {
        tableColsMap[c.table_name] = [];
      }
      const isPrimary = pkSet.has(`${c.table_name}.${c.column_name}`);
      const fk = fkMap[`${c.table_name}.${c.column_name}`];

      let cleanType = c.data_type.toLowerCase();
      if (cleanType.includes('character') || cleanType.includes('text')) cleanType = 'text';
      else if (cleanType.includes('timestamp')) cleanType = 'timestamp';
      else if (cleanType.includes('integer') || cleanType.includes('bigint') || cleanType.includes('smallint')) cleanType = 'int';
      else if (cleanType.includes('boolean')) cleanType = 'bool';
      else if (cleanType.includes('json')) cleanType = 'json';

      tableColsMap[c.table_name].push({
        name: c.column_name,
        type: cleanType,
        nullable: c.is_nullable === 'YES',
        isPrimary,
        foreignKey: fk || undefined
      });
    });

    const physicalTables = tables.map(t => {
      const tName = t.table_name;
      const tCols = tableColsMap[tName] || [];
      const tFks: Record<string, { targetTable: string; targetColumn: string }> = {};
      tCols.forEach(col => {
        if (col.foreignKey) {
          tFks[col.name] = col.foreignKey;
        }
      });
      return {
        name: tName,
        displayName: tName,
        columns: tCols,
        foreignKeys: tFks
      };
    });

    const tableWhitelist = tables.map(t => t.table_name);

    cachedSchema = {
      physicalTables,
      tableWhitelist,
      foreignKeyMap: fkMap,
      columnToFkMap,
      timestamp: now
    };

    return cachedSchema;
  } catch (err) {
    console.error('[QueryExplorer API] Error introspecting database schema, falling back to static list:', err);
    return {
      physicalTables: Object.entries(TABLE_SCHEMAS).map(([name, columns]) => ({
        name,
        displayName: name,
        columns,
        foreignKeys: {}
      })),
      tableWhitelist: PHYSICAL_TABLES_WHITELIST,
      foreignKeyMap: {},
      columnToFkMap: {},
      timestamp: now
    };
  }
}

function cleanQuery(query: string): string {
  // Strip single-line comments
  let cleaned = query.replace(/--.*$/gm, '');
  // Strip multi-line comments
  cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');
  return cleaned.trim();
}

function validateQuerySecurity(
  query: string, 
  allowedModules: string[], 
  allowedPhysical: string[] = PHYSICAL_TABLES_WHITELIST
): { isValid: boolean; error?: string } {
  const cleaned = cleanQuery(query);
  
  if (!cleaned) {
    return { isValid: false, error: 'Query is empty.' };
  }

  // 1. Check stacked queries (semicolons)
  const strippedStrings = cleaned
    .replace(/'[^']*'/g, '')
    .replace(/"[^"]*"/g, '')
    .replace(/\$\$[\s\S]*?\$\$/g, '');
  
  if (strippedStrings.includes(';')) {
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
  const fromJoinRegex = /(?<!:)\b(?:from|join)\b\s+(?:"([^"]+)"|([a-zA-Z_][a-zA-Z0-9_]*))/gi;
  const matches = [...cleaned.matchAll(fromJoinRegex)];
  
  const SQL_SYNTAX_KEYWORDS = ['is', 'null', 'where', 'on', 'select', 'case', 'when', 'then', 'else', 'end', 'values', 'lateral'];

  for (const match of matches) {
    const rawTableName = match[1] || match[2];
    const tableName = rawTableName.toLowerCase();
    
    if (SQL_SYNTAX_KEYWORDS.includes(tableName)) {
      continue;
    }

    const cleanName = tableName.replace(/_/g, ' ');
    
    const isAllowedPhysical = allowedPhysical.includes(tableName) || PHYSICAL_TABLES_WHITELIST.includes(tableName);
    const isAllowedModule = allowedModules.includes(tableName) || allowedModules.includes(cleanName);
    
    if (!isAllowedPhysical && !isAllowedModule) {
      return { isValid: false, error: `Access to table '${rawTableName}' is restricted or table does not exist.` };
    }
  }

  return { isValid: true };
}

/**
 * GET /api/query-explorer/schema
 * Returns the whitelisted schema, foreign keys, and dynamic module configurations for Object Explorer.
 */
router.get('/schema', async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const introspected = await getIntrospectedSchema(db);
    
    // Fetch custom modules for the tenant
    const modules = await db.module.findMany({
      where: { enabled: true }
    });
    
    const customModules = modules.map(m => {
      const config = m.config as any;
      const columns: any[] = [
        { name: 'id', type: 'text', label: 'ID', isPrimary: true },
        { name: 'created_at', type: 'timestamp', label: 'Created At' },
        { name: 'updated_at', type: 'timestamp', label: 'Updated At' },
        { name: 'status', type: 'text', label: 'Status' }
      ];

      const moduleFks: Record<string, { targetTable: string; targetColumn: string }> = {};

      if (config && Array.isArray(config.layout)) {
        config.layout.forEach((f: any) => {
          if (f.name) {
            let colType = 'text';
            if (f.type === 'number') colType = 'int';
            else if (f.type === 'date') colType = 'date';
            else if (f.type === 'boolean') colType = 'bool';
            else if (f.type === 'json' || f.type === 'group') colType = 'json';

            const fk = (f.type === 'relation' || f.type === 'lookup') && f.targetModule ? {
              targetTable: f.targetModule,
              targetColumn: 'id'
            } : undefined;

            if (fk) {
              moduleFks[f.name] = fk;
            }

            columns.push({
              name: f.name,
              type: colType,
              label: f.label || f.name,
              foreignKey: fk
            });
          }
        });
      }

      return {
        name: m.name,
        displayName: m.name,
        columns,
        foreignKeys: moduleFks
      };
    });

    res.json({
      physicalTables: introspected.physicalTables,
      customModules,
      foreignKeyMap: introspected.foreignKeyMap,
      columnToFkMap: introspected.columnToFkMap
    });
  } catch (error: any) {
    console.error('[QueryExplorer API] Failed to fetch schema:', error);
    res.status(500).json({ error: 'Failed to retrieve schema definitions.' });
  }
});

/**
 * GET /api/query-explorer/referenced-record
 * Fetches a single record referenced by a foreign key for inline preview.
 */
router.get('/referenced-record', async (req: TenantRequest, res) => {
  try {
    const { table, column, value } = req.query;
    const tenantId = req.tenantId!;
    const user = req.user!;
    const db = req.db!;

    if (!table || !column || !value) {
      return res.status(400).json({ error: 'Missing table, column, or value parameter.' });
    }

    const tableName = String(table).toLowerCase().trim();
    const columnName = String(column).toLowerCase().trim();
    const val = String(value).trim();

    // Security check
    const FORBIDDEN_TABLES = ['users', 'tenants', '_prisma_migrations', 'information_schema'];
    if (FORBIDDEN_TABLES.includes(tableName)) {
      return res.status(403).json({ error: 'Access to this table is restricted.' });
    }

    if (!/^[a-zA-Z0-9_]+$/.test(tableName) || !/^[a-zA-Z0-9_]+$/.test(columnName)) {
      return res.status(400).json({ error: 'Invalid table or column identifier.' });
    }

    // Get introspected schema to send column metadata for target table
    const introspected = await getIntrospectedSchema(db);
    const tableDef = introspected.physicalTables.find(t => t.name === tableName);

    // Execute query inside tenant-scoped transaction
    const results = await db.$transaction(async (tx: any) => {
      await tx.$executeRawUnsafe(`SET LOCAL app.current_tenant_id = '${tenantId.replace(/'/g, "''")}'`);
      await tx.$executeRawUnsafe(`SET LOCAL app.current_user_id = '${user.uid.replace(/'/g, "''")}'`);
      await tx.$executeRawUnsafe(`SET LOCAL app.is_superadmin = '${user.isSuperAdmin ? 'true' : 'false'}'`);

      return await tx.$queryRawUnsafe(`SELECT * FROM "${tableName}" WHERE "${columnName}" = $1 LIMIT 1`, val);
    });

    const record = Array.isArray(results) && results.length > 0 ? results[0] : null;

    res.json({
      success: true,
      table: tableName,
      schema: 'public',
      targetColumn: columnName,
      record,
      columns: tableDef?.columns || []
    });
  } catch (err: any) {
    console.error('[QueryExplorer API] Failed to fetch referenced record:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch referenced record.' });
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
    const introspected = await getIntrospectedSchema(db);
    const securityCheck = validateQuerySecurity(query, allowedTables, introspected.tableWhitelist);
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

      // Run raw user query
      return await tx.$queryRawUnsafe(finalQuery);
    }, {
      timeout: 10000 // 10 second timeout for user queries
    });

    const duration = Date.now() - startTime;

    res.json({
      success: true,
      rows: results || [],
      results: results || [],
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
