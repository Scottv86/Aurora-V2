import { Router, Response } from 'express';
import { z } from 'zod';
import { TenantRequest } from '../middleware/tenantMiddleware';
import { globalPrisma } from '../lib/prisma';
import { PaymentGatewayService, PROVIDER_PRESETS } from '../services/paymentGatewayService';

const router = Router();

const SaveGatewaySchema = z.object({
  id: z.string().optional(),
  provider: z.enum([
    'CYBERSOURCE',
    'COMMBANK_COMMWEB',
    'COMMBANK_BPOINT',
    'STRIPE',
    'TYRO_EFTPOS',
    'SQUARE',
    'ADYEN',
    'CUSTOM_WEBHOOK',
    'SANDBOX_SIMULATOR'
  ]),
  displayName: z.string().min(1),
  isDefault: z.boolean().default(false),
  isEnabled: z.boolean().default(true),
  isTestMode: z.boolean().default(true),
  enableForPos: z.boolean().default(true),
  enableForInvoice: z.boolean().default(true),
  enableForPortal: z.boolean().default(true),
  credentials: z.record(z.string(), z.any()).default({})
});

// GET /api/payment-gateways/presets - Catalog of all supported gateways
router.get('/presets', (_req, res: Response) => {
  res.json(PROVIDER_PRESETS);
});

// GET /api/payment-gateways/connections - List tenant's gateway connections
router.get('/connections', async (req: TenantRequest, res: Response) => {
  try {
    const db = req.db || globalPrisma;
    const tenantId = req.tenantId!;
    const connections = await PaymentGatewayService.listConnections(tenantId, db);
    res.json(connections);
  } catch (err: any) {
    console.error('[PaymentGateways] GET /connections error:', err);
    res.status(500).json({ error: err.message || 'Failed to list gateway connections' });
  }
});

// POST /api/payment-gateways/connections - Create or update connection
router.post('/connections', async (req: TenantRequest, res: Response) => {
  try {
    const db = req.db || globalPrisma;
    const tenantId = req.tenantId!;
    const validated = SaveGatewaySchema.parse(req.body);

    const connection = await PaymentGatewayService.saveConnection(tenantId, validated, db);
    res.status(201).json(connection);
  } catch (err: any) {
    console.error('[PaymentGateways] POST /connections error:', err);
    res.status(400).json({ error: err.message || 'Failed to save gateway connection' });
  }
});

// DELETE /api/payment-gateways/connections/:id - Remove connection
router.delete('/connections/:id', async (req: TenantRequest, res: Response) => {
  try {
    const db = req.db || globalPrisma;
    const tenantId = req.tenantId!;
    await PaymentGatewayService.deleteConnection(tenantId, req.params.id, db);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to delete gateway connection' });
  }
});

// POST /api/payment-gateways/test-connection - 1-Click live ping
router.post('/test-connection', async (req: TenantRequest, res: Response) => {
  try {
    const { provider, credentials, isTestMode } = req.body;
    const result = await PaymentGatewayService.testConnection({
      provider,
      credentials: credentials || {},
      isTestMode: Boolean(isTestMode)
    });
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Connection test failed' });
  }
});

export default router;
