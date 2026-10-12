import { Router, Response } from 'express';
import { z } from 'zod';
import { TenantRequest } from '../middleware/tenantMiddleware';
import { globalPrisma } from '../lib/prisma';
import { RmaService } from '../services/rmaService';

const router = Router();

const CreateRmaSchema = z.object({
  customerPartyId: z.string(),
  posOrderId: z.string().optional().nullable(),
  invoiceId: z.string().optional().nullable(),
  requestedMethod: z.string().default('ORIGINAL_TENDER'),
  reason: z.enum([
    'CUSTOMER_RETURN',
    'DEFECTIVE_GOODS',
    'DUPLICATE_CHARGE',
    'INCORRECT_PRICING',
    'ORDER_CANCELLED',
    'GOODWILL',
    'OTHER'
  ]).default('CUSTOMER_RETURN'),
  customerComments: z.string().optional().nullable(),
  photoUrls: z.array(z.string()).optional().nullable(),
  items: z.array(z.object({
    catalogItemId: z.string().optional().nullable(),
    variantId: z.string().optional().nullable(),
    description: z.string(),
    quantity: z.number().positive(),
    condition: z.string().optional(),
    requestedAction: z.string().optional()
  })).min(1)
});

// POST /api/rma/requests - Create a new RMA request
router.post('/requests', async (req: TenantRequest, res: Response) => {
  try {
    const db = req.db || globalPrisma;
    const tenantId = req.tenantId!;
    const validated = CreateRmaSchema.parse(req.body);

    const rma = await RmaService.createReturnRequest({
      tenantId,
      ...validated
    }, db);

    res.status(201).json(rma);
  } catch (err: any) {
    console.error('[RMA API] POST /requests error:', err);
    res.status(400).json({ error: err.message || 'Failed to submit return request' });
  }
});

// GET /api/rma/requests - Staff list of all return requests
router.get('/requests', async (req: TenantRequest, res: Response) => {
  try {
    const db = req.db || globalPrisma;
    const tenantId = req.tenantId!;
    const { status, customerPartyId, search, limit, offset } = req.query;

    const result = await RmaService.listReturnRequests({
      tenantId,
      status: status as string,
      customerPartyId: customerPartyId as string,
      search: search as string,
      limit: limit ? Number(limit) : 50,
      offset: offset ? Number(offset) : 0
    }, db);

    res.json(result);
  } catch (err: any) {
    console.error('[RMA API] GET /requests error:', err);
    res.status(500).json({ error: err.message || 'Failed to list return requests' });
  }
});

// GET /api/rma/requests/:id - Inspect specific RMA
router.get('/requests/:id', async (req: TenantRequest, res: Response) => {
  try {
    const db = req.db || globalPrisma;
    const tenantId = req.tenantId!;
    const rma = await RmaService.getReturnRequestById(tenantId, req.params.id, db);
    res.json(rma);
  } catch (err: any) {
    res.status(404).json({ error: err.message || 'Return request not found' });
  }
});

// POST /api/rma/requests/:id/review - Staff decision (Approve or Reject)
router.post('/requests/:id/review', async (req: TenantRequest, res: Response) => {
  try {
    const db = req.db || globalPrisma;
    const tenantId = req.tenantId!;
    const { action, rejectionReason, internalNotes } = req.body;
    const userId = (req as any).user?.id;

    if (!['APPROVE', 'REJECT'].includes(action)) {
      return res.status(400).json({ error: 'Action must be APPROVE or REJECT' });
    }

    const rma = await RmaService.reviewReturnRequest({
      tenantId,
      id: req.params.id,
      action,
      rejectionReason,
      internalNotes,
      memberId: userId
    }, db);

    res.json(rma);
  } catch (err: any) {
    console.error('[RMA API] POST /requests/:id/review error:', err);
    res.status(400).json({ error: err.message || 'Failed to review return request' });
  }
});

// POST /api/rma/requests/:id/receive - Mark goods as received at the store/depot
router.post('/requests/:id/receive', async (req: TenantRequest, res: Response) => {
  try {
    const db = req.db || globalPrisma;
    const tenantId = req.tenantId!;
    const { internalNotes } = req.body;
    const userId = (req as any).user?.id;

    const rma = await RmaService.markReceived({
      tenantId,
      id: req.params.id,
      memberId: userId,
      internalNotes
    }, db);

    res.json(rma);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to mark return request as received' });
  }
});

// POST /api/rma/requests/:id/execute-refund - 1-Click finalize return & post refund
router.post('/requests/:id/execute-refund', async (req: TenantRequest, res: Response) => {
  try {
    const db = req.db || globalPrisma;
    const tenantId = req.tenantId!;
    const { refundMethod = 'STORE_CREDIT', restock = true, notes } = req.body;
    const userId = (req as any).user?.id;

    const rma = await RmaService.executeRmaRefund({
      tenantId,
      id: req.params.id,
      refundMethod,
      restock: Boolean(restock),
      memberId: userId,
      notes
    }, db);

    res.json(rma);
  } catch (err: any) {
    console.error('[RMA API] POST /requests/:id/execute-refund error:', err);
    res.status(400).json({ error: err.message || 'Failed to execute refund for RMA' });
  }
});

// GET /api/rma/customer/:partyId - Customer Portal self-service tracking
router.get('/customer/:partyId', async (req: TenantRequest, res: Response) => {
  try {
    const db = req.db || globalPrisma;
    const tenantId = req.tenantId!;
    const result = await RmaService.listReturnRequests({
      tenantId,
      customerPartyId: req.params.partyId
    }, db);

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to load customer return requests' });
  }
});

export default router;
