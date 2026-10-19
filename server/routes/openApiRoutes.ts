import { Router, Response } from 'express';
import { TenantRequest } from '../middleware/tenantMiddleware';
import { globalPrisma } from '../lib/prisma';

const router = Router();

// GET /api/docs/openapi.json - Dynamically generates OpenAPI 3.1 specification for tenant custom modules
router.get('/openapi.json', async (req: TenantRequest, res: Response) => {
  try {
    let tenantId = req.tenantId || (req.headers['x-tenant-id'] as string) || (req.query.tenantId as string);
    const db = req.db || globalPrisma;

    let tenant: any = null;
    if (tenantId) {
      tenant = await db.tenant.findUnique({
        where: { id: tenantId }
      }).catch(() => null);
    }

    if (!tenant) {
      tenant = await db.tenant.findFirst().catch(() => null);
      if (tenant) {
        tenantId = tenant.id;
      }
    }

    const tenantName = tenant?.name || 'Aurora Enterprise Platform';
    const modules = tenantId ? await db.module.findMany({
      where: { tenantId }
    }).catch(() => []) : [];

    const paths: Record<string, any> = {
      '/api/approvals': {
        get: {
          summary: 'List Pending Executive Approvals',
          description: 'Fetches unified approval items across Workflows, Invoices, Leave Requests, and RMAs.',
          tags: ['Approvals & Governance'],
          parameters: [
            { name: 'status', in: 'query', schema: { type: 'string', default: 'PENDING' } },
            { name: 'category', in: 'query', schema: { type: 'string', default: 'ALL' } }
          ],
          responses: {
            '200': { description: 'Successful response' }
          }
        }
      },
      '/api/invoices': {
        get: {
          summary: 'List Financial Invoices and Bills',
          tags: ['Commerce & Finance'],
          responses: { '200': { description: 'Successful response' } }
        },
        post: {
          summary: 'Create an Invoice or Supplier Bill',
          tags: ['Commerce & Finance'],
          responses: { '201': { description: 'Invoice Created' } }
        }
      },
      '/api/members': {
        get: {
          summary: 'List Workforce Personnel',
          tags: ['Workforce HR'],
          responses: { '200': { description: 'Successful response' } }
        }
      }
    };

    const schemas: Record<string, any> = {};

    // Generate dynamic endpoints and schemas for each custom module
    modules.forEach((mod: any) => {
      const slug = mod.id;
      const modName = mod.name || 'Record';
      const safeSchemaName = `${modName.replace(/[^a-zA-Z0-9]/g, '') || 'Custom'}Record`;
      const config = (mod.config as any) || {};
      
      let fields: any[] = [];
      if (Array.isArray(config.fields)) {
        fields = config.fields;
      } else if (Array.isArray(config.schema?.fields)) {
        fields = config.schema.fields;
      } else if (Array.isArray(config.layout)) {
        fields = config.layout;
      } else if (Array.isArray(mod.schema?.fields)) {
        fields = mod.schema.fields;
      }

      const properties: Record<string, any> = {
        id: { type: 'string', description: 'Primary Unique Identifier (CUID)' },
        status: { type: 'string', default: 'active' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' }
      };

      const required: string[] = [];

      fields.forEach((f: any) => {
        const fieldName = f.name || f.id || f.key;
        if (!fieldName || typeof fieldName !== 'string') return;

        let fieldType = 'string';
        if (f.type === 'number' || f.type === 'currency') fieldType = 'number';
        if (f.type === 'boolean') fieldType = 'boolean';
        if (f.type === 'array' || f.type === 'multi_select' || f.type === 'tags') fieldType = 'array';

        properties[fieldName] = {
          type: fieldType,
          description: f.label || fieldName
        };

        if (f.required) required.push(fieldName);
      });

      schemas[safeSchemaName] = {
        type: 'object',
        properties,
        required
      };

      // Register Module Endpoints
      paths[`/api/data/records?moduleId=${slug}`] = {
        get: {
          summary: `List ${modName} Records`,
          description: `Query and filter records within the "${modName}" custom schema.`,
          tags: [`Module: ${modName}`],
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
            { name: 'search', in: 'query', schema: { type: 'string' } }
          ],
          responses: {
            '200': {
              description: 'Array of records',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: { $ref: `#/components/schemas/${safeSchemaName}` }
                  }
                }
              }
            }
          }
        },
        post: {
          summary: `Create ${modName} Record`,
          description: `Inserts a new record conforming to the "${modName}" schema.`,
          tags: [`Module: ${modName}`],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    moduleId: { type: 'string', default: slug },
                    data: { $ref: `#/components/schemas/${safeSchemaName}` }
                  }
                }
              }
            }
          },
          responses: {
            '201': { description: 'Record Created' }
          }
        }
      };

      paths[`/api/data/records/{id}?moduleId=${slug}`] = {
        get: {
          summary: `Get ${modName} Record by ID`,
          tags: [`Module: ${modName}`],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Found Record' } }
        },
        put: {
          summary: `Update ${modName} Record`,
          tags: [`Module: ${modName}`],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Record Updated' } }
        },
        delete: {
          summary: `Delete ${modName} Record`,
          tags: [`Module: ${modName}`],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Record Soft-Deleted' } }
        }
      };
    });

    const openApiSpec = {
      openapi: '3.1.0',
      info: {
        title: `${tenantName} REST API`,
        version: '1.0.0',
        description: `Automated OpenAPI 3.1 specification dynamically generated for ${tenantName}. Contains all custom module schemas, workflow endpoints, and commerce integrations.`
      },
      servers: [
        { url: 'http://localhost:3001', description: 'Local Development Server' },
        { url: 'https://api.aurora.io', description: 'Production Gateway' }
      ],
      security: [
        { BearerAuth: [] },
        { TenantHeader: [] }
      ],
      paths,
      components: {
        schemas,
        securitySchemes: {
          BearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT'
          },
          TenantHeader: {
            type: 'apiKey',
            in: 'header',
            name: 'x-tenant-id'
          }
        }
      }
    };

    res.json(openApiSpec);
  } catch (err: any) {
    console.error('[OpenApiRoutes Error]', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
