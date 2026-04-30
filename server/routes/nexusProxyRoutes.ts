import express from 'express';
import { TenantRequest } from '../middleware/tenantMiddleware';
import { globalPrisma } from '../lib/prisma';

const router = express.Router();

router.post('/execute', async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const tenantId = req.tenantId!;
    const { connectorId, payload, moduleId } = req.body;

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
    console.log(`[NexusProxy] Executing connector ${connector.name} for tenant ${tenantId}`);
    
    // Simulate latency
    await new Promise(resolve => setTimeout(resolve, 800));

    // Simple simulation of custom logic
    let rawResult: any = { 
      success: true, 
      connectorName: connector.name,
      timestamp: new Date().toISOString(),
      data: {} 
    };
    
    if (connector.ioSchema) {
       const schema = connector.ioSchema as any;
       schema.outputs?.forEach((o: any) => {
          rawResult.data[o.name] = `Sample ${o.label} Data`;
       });
    }

    // 4. APPLY MAPPINGS if moduleId is provided
    if (moduleId) {
      const module = await db.module.findUnique({ where: { id: moduleId } });
      if (module) {
        const config = module.config as any;
        const mappings = config.connectorMappings?.[connectorId];
        
        if (mappings) {
          console.log(`[NexusProxy] Applying mappings for module: ${module.name}`);
          const reshapedData: Record<string, any> = {};
          
          Object.entries(mappings).forEach(([sourceKey, targetFieldId]) => {
            if (targetFieldId && rawResult.data[sourceKey] !== undefined) {
              reshapedData[targetFieldId as string] = rawResult.data[sourceKey];
            }
          });
          
          return res.json({
            ...rawResult,
            reshaped: true,
            originalData: rawResult.data,
            data: reshapedData
          });
        }
      }
    }

    res.json(rawResult);

  } catch (err: any) {
    console.error('[NexusProxy] Execution Error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
