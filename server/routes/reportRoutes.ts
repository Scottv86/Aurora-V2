import { Router, Response } from 'express';
import { TenantRequest } from '../middleware/tenantMiddleware';
import { GoogleGenAI, Type } from '@google/genai';
import { resolveTenantAIClient, executeAICompletion } from '../services/aiProviderService';
import dotenv from 'dotenv';

dotenv.config();

const router = Router();

// GET all reports for the tenant
router.get('/', async (req: TenantRequest, res: Response) => {
  try {
    const db = req.db!;
    const tenantId = req.tenantId!;

    const reports = await db.report.findMany({
      where: { tenantId },
      orderBy: { updatedAt: 'desc' }
    });

    res.json(reports);
  } catch (err: any) {
    console.error('[ReportsAPI] GET / Error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch reports' });
  }
});

// GET single report by ID
router.get('/:id', async (req: TenantRequest, res: Response) => {
  try {
    const db = req.db!;
    const tenantId = req.tenantId!;
    const { id } = req.params;

    const report = await db.report.findFirst({
      where: { id, tenantId }
    });

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json(report);
  } catch (err: any) {
    console.error('[ReportsAPI] GET /:id Error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch report' });
  }
});

// POST create a report
router.post('/', async (req: TenantRequest, res: Response) => {
  try {
    const db = req.db!;
    const tenantId = req.tenantId!;
    const { name, description, config, status, createdBy } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Report name is required' });
    }

    const report = await db.report.create({
      data: {
        tenantId,
        name,
        description: description || '',
        config: config || { dataSource: { type: 'local', tables: [] }, widgets: [] },
        status: status || 'Draft',
        createdBy: createdBy || 'System'
      }
    });

    res.status(201).json(report);
  } catch (err: any) {
    console.error('[ReportsAPI] POST / Error:', err);
    res.status(500).json({ error: err.message || 'Failed to create report' });
  }
});

// PUT update a report
router.put('/:id', async (req: TenantRequest, res: Response) => {
  try {
    const db = req.db!;
    const tenantId = req.tenantId!;
    const { id } = req.params;
    const { name, description, config, status } = req.body;

    // Check if exists
    const existing = await db.report.findFirst({
      where: { id, tenantId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const updated = await db.report.update({
      where: { id },
      data: {
        name: name !== undefined ? name : existing.name,
        description: description !== undefined ? description : existing.description,
        config: config !== undefined ? config : existing.config,
        status: status !== undefined ? status : existing.status
      }
    });

    res.json(updated);
  } catch (err: any) {
    console.error('[ReportsAPI] PUT /:id Error:', err);
    res.status(500).json({ error: err.message || 'Failed to update report' });
  }
});

// DELETE a report
router.delete('/:id', async (req: TenantRequest, res: Response) => {
  try {
    const db = req.db!;
    const tenantId = req.tenantId!;
    const { id } = req.params;

    const existing = await db.report.findFirst({
      where: { id, tenantId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Report not found' });
    }

    await db.report.delete({
      where: { id }
    });

    res.json({ success: true });
  } catch (err: any) {
    console.error('[ReportsAPI] DELETE /:id Error:', err);
    res.status(500).json({ error: err.message || 'Failed to delete report' });
  }
});

// POST generate report with AI
router.post('/ai-builder', async (req: TenantRequest, res: Response) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const tenantId = req.tenantId || 'default-tenant';
    const client = await resolveTenantAIClient(tenantId);

    const promptText = `You are Aurora BI AI, an expert business intelligence designer.
      Generate a report dashboard layout based on the user's request: "${prompt}".
      
      Available local tables in Aurora tenancy:
      1. 'records': contains general items, fields: 'id', 'status', 'created_at', 'module_id'
      2. 'tenant_members': contains workforce staff members, fields: 'id', 'first_name', 'family_name', 'status', 'role_id'
      3. 'teams': contains tenant teams, fields: 'id', 'name', 'description'
      4. 'automations': contains workflow automation rules, fields: 'id', 'name', 'trigger_type', 'enabled'
      5. 'automation_runs': contains logs of runs, fields: 'id', 'status', 'started_at'
      6. 'catalog_items': contains pricing catalog products/services, fields: 'id', 'name', 'type', 'base_price'
      7. 'audit_logs': contains compliance logs, fields: 'id', 'action', 'timestamp'
      
      Design a report that contains 2 to 4 charts/widgets matching the user's request.
      Select one or more matching tables as data sources.
      Determine proper mapping parameters: xAxisKey, yAxisKey, and aggregate (count, sum, avg).
      
      If the user prompt implies filtering (e.g. "by team status" or "recent items"), you can configure global filter dropdown fields in 'slicers' (array of database field paths).
      If the user wants custom calculations (e.g. "case age in days"), you can configure calculated fields in 'calculatedFields'. Formula expressions should use standard Excel-like syntax, e.g. TIMESPAN("days", {created_at}, TODAY()).
      
      Provide a suitable title, description, and config schema.
      Return the output as a valid structured JSON object matching the report schema.`;

    const response = await executeAICompletion(client, {
      contents: [{ role: 'user', parts: [{ text: promptText }] }],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            description: { type: Type.STRING },
            config: {
              type: Type.OBJECT,
              properties: {
                dataSource: {
                  type: Type.OBJECT,
                  properties: {
                    type: { type: Type.STRING, enum: ['local', 'external'] },
                    tables: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING }
                    }
                  },
                  required: ['type', 'tables']
                },
                widgets: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      type: { type: Type.STRING, enum: ['bar', 'line', 'area', 'pie', 'kpi', 'table'] },
                      title: { type: Type.STRING },
                      w: { type: Type.INTEGER },
                      properties: {
                        type: Type.OBJECT,
                        properties: {
                          xAxisKey: { type: Type.STRING },
                          yAxisKey: { type: Type.STRING },
                          aggregate: { type: Type.STRING, enum: ['count', 'sum', 'avg', 'min', 'max'] },
                          color: { type: Type.STRING }
                        },
                        required: ['xAxisKey', 'yAxisKey', 'aggregate']
                      }
                    },
                    required: ['id', 'type', 'title', 'w', 'properties']
                  }
                },
                slicers: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                },
                calculatedFields: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      name: { type: Type.STRING },
                      formula: { type: Type.STRING }
                    },
                    required: ['id', 'name', 'formula']
                  }
                }
              },
              required: ['dataSource', 'widgets']
            }
          },
          required: ['name', 'description', 'config']
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error('Empty response from AI builder');
    }

    const reportData = JSON.parse(resultText);
    res.json(reportData);
  } catch (err: any) {
    console.error('[ReportsAPI] AI Builder Error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate report configuration via AI.' });
  }
});

export default router;
