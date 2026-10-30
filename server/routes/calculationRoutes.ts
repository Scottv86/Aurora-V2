import { Router, Response } from 'express';
import { TenantRequest } from '../middleware/tenantMiddleware';
import { CalculationService } from '../services/calculationService';

const router = Router();

// GET /api/calculations - List calculations
router.get('/', async (req: TenantRequest, res: Response) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) return res.status(400).json({ error: 'Tenant context required' });

    const {
      authorId,
      mode,
      moduleId,
      recordId,
      isPinned,
      search,
      limit,
      offset,
    } = req.query;

    const calculations = await CalculationService.getCalculations(tenantId, {
      authorId: authorId as string,
      mode: mode as string,
      moduleId: moduleId as string,
      recordId: recordId as string,
      isPinned: isPinned !== undefined ? isPinned === 'true' : undefined,
      search: search as string,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });

    res.json(calculations);
  } catch (err: any) {
    console.error('[CalculationAPI] GET / error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch calculations' });
  }
});

// GET /api/calculations/:id - Single calculation
router.get('/:id', async (req: TenantRequest, res: Response) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) return res.status(400).json({ error: 'Tenant context required' });

    const calc = await CalculationService.getCalculationById(tenantId, req.params.id);
    if (!calc) return res.status(404).json({ error: 'Calculation not found' });

    res.json(calc);
  } catch (err: any) {
    console.error('[CalculationAPI] GET /:id error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch calculation' });
  }
});

// POST /api/calculations - Create calculation
router.post('/', async (req: TenantRequest, res: Response) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) return res.status(400).json({ error: 'Tenant context required' });

    const authorId = (req as any).user?.id || req.body.authorId || 'system';
    const authorName = (req as any).user?.name || req.body.authorName || 'Aurora User';
    const authorEmail = (req as any).user?.email || req.body.authorEmail;

    const calc = await CalculationService.createCalculation(tenantId, {
      ...req.body,
      authorId,
      authorName,
      authorEmail,
    });

    res.status(201).json(calc);
  } catch (err: any) {
    console.error('[CalculationAPI] POST / error:', err);
    res.status(500).json({ error: err.message || 'Failed to create calculation' });
  }
});

// PATCH /api/calculations/:id - Update calculation
router.patch('/:id', async (req: TenantRequest, res: Response) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) return res.status(400).json({ error: 'Tenant context required' });

    const calc = await CalculationService.updateCalculation(tenantId, req.params.id, req.body);
    res.json(calc);
  } catch (err: any) {
    console.error('[CalculationAPI] PATCH /:id error:', err);
    res.status(500).json({ error: err.message || 'Failed to update calculation' });
  }
});

// DELETE /api/calculations/:id - Delete calculation
router.delete('/:id', async (req: TenantRequest, res: Response) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) return res.status(400).json({ error: 'Tenant context required' });

    await CalculationService.deleteCalculation(tenantId, req.params.id);
    res.json({ success: true, message: 'Calculation deleted' });
  } catch (err: any) {
    console.error('[CalculationAPI] DELETE /:id error:', err);
    res.status(500).json({ error: err.message || 'Failed to delete calculation' });
  }
});

// POST /api/calculations/:id/tape - Append tape entry
router.post('/:id/tape', async (req: TenantRequest, res: Response) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) return res.status(400).json({ error: 'Tenant context required' });

    const { expression, result, mode, variables } = req.body;
    if (!expression || result === undefined) {
      return res.status(400).json({ error: 'Expression and result are required' });
    }

    const item = {
      id: `tape_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      expression,
      result: String(result),
      timestamp: new Date().toISOString(),
      mode,
      variables,
    };

    const updated = await CalculationService.appendTapeItem(tenantId, req.params.id, item);
    res.json(updated);
  } catch (err: any) {
    console.error('[CalculationAPI] POST /:id/tape error:', err);
    res.status(500).json({ error: err.message || 'Failed to append tape item' });
  }
});

// DELETE /api/calculations/:id/tape - Clear tape
router.delete('/:id/tape', async (req: TenantRequest, res: Response) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) return res.status(400).json({ error: 'Tenant context required' });

    const updated = await CalculationService.clearTape(tenantId, req.params.id);
    res.json(updated);
  } catch (err: any) {
    console.error('[CalculationAPI] DELETE /:id/tape error:', err);
    res.status(500).json({ error: err.message || 'Failed to clear tape' });
  }
});

// POST /api/calculations/aggregate - Compute live module aggregate
router.post('/aggregate', async (req: TenantRequest, res: Response) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) return res.status(400).json({ error: 'Tenant context required' });

    const { moduleId, fieldName, aggregateType, filterField, filterValue } = req.body;
    if (!moduleId || !fieldName || !aggregateType) {
      return res.status(400).json({ error: 'moduleId, fieldName, and aggregateType are required' });
    }

    const result = await CalculationService.computeModuleAggregate(tenantId, {
      moduleId,
      fieldName,
      aggregateType,
      filterField,
      filterValue,
    });

    res.json(result);
  } catch (err: any) {
    console.error('[CalculationAPI] POST /aggregate error:', err);
    res.status(500).json({ error: err.message || 'Failed to compute aggregate' });
  }
});

export default router;
