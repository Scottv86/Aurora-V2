import express from 'express';
import { TenantRequest } from '../middleware/tenantMiddleware';
import { globalPrisma } from '../lib/prisma';

const router = express.Router();

router.post('/execute', async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const tenantId = req.tenantId!;
    const { connectorId, payload } = req.body;

    // 1. Fetch the connector
    const connector = await globalPrisma.nexusConnector.findUnique({
      where: { id: connectorId }
    });

    if (!connector) {
      return res.status(404).json({ error: 'Connector not found' });
    }

    // 2. Fetch the tenant secrets
    const tenantConnector = await db.tenantConnector.findUnique({
      where: { tenantId_connectorId: { tenantId, connectorId } },
      include: { secrets: true }
    });

    const secrets: Record<string, string> = {};
    tenantConnector?.secrets.forEach(s => {
      secrets[s.secretKey] = s.secretValue;
    });

    // 3. Prepare the execution context
    // Simulation logic for the mission
    console.log(`[NexusProxy] Executing connector ${connector.name} for tenant ${tenantId}`);
    
    // Simulate latency
    await new Promise(resolve => setTimeout(resolve, 800));

    // Simple simulation of custom logic
    let result = { 
      success: true, 
      connectorName: connector.name,
      timestamp: new Date().toISOString(),
      data: {} 
    };
    
    if (connector.ioSchema) {
       const schema = connector.ioSchema as any;
       schema.outputs?.forEach((o: any) => {
          (result.data as any)[o.name] = `Sample ${o.label} Data`;
       });
    }

    res.json(result);

  } catch (err: any) {
    console.error('[NexusProxy] Execution Error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
