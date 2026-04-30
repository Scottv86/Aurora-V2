import express from 'express';
import { TenantRequest } from '../middleware/tenantMiddleware';
import { globalPrisma } from '../lib/prisma';

const router = express.Router();

// GET all connectors (Registry + Tenant activations)
router.get('/', async (req: TenantRequest, res) => {
  try {
    const tenantId = req.tenantId!;
    const db = req.db!;

    console.log(`[ConnectorsAPI] Fetching connectors for tenant: ${tenantId}`);

    // 1. Fetch registry items
    const registry = await globalPrisma.nexusConnector.findMany({
      where: {
        OR: [
          { tenantId: null },
          { tenantId: tenantId }
        ]
      },
      orderBy: { name: 'asc' }
    });

    // 2. Fetch tenant-specific activations
    const active = await db.tenantConnector.findMany({
      where: { tenantId },
      include: {
        connector: true, // Include registry details (ioSchema, etc.)
        secrets: {
          select: {
            secretKey: true,
          }
        }
      }
    });

    console.log(`[ConnectorsAPI] Found ${registry.length} registry items and ${active.length} active connectors`);
    res.json({ registry, active });
  } catch (err: any) {
    console.error('[ConnectorsAPI] GET / Error:', err);
    res.status(500).json({ error: err.message || 'Unknown error fetching connectors' });
  }
});

// ACTIVATE a connector
router.post('/:id/activate', async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const tenantId = req.tenantId!;
    const { id } = req.params;

    const connector = await globalPrisma.nexusConnector.findUnique({
      where: { id }
    });

    if (!connector) {
      return res.status(404).json({ error: 'Connector not found in registry' });
    }

    const tenantConnector = await db.tenantConnector.upsert({
      where: {
        tenantId_connectorId: {
          tenantId,
          connectorId: id
        }
      },
      update: {
        isActive: true
      },
      create: {
        tenantId,
        connectorId: id,
        isActive: true,
        displayName: connector.name
      }
    });

    res.json(tenantConnector);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DEACTIVATE a connector
router.post('/:id/deactivate', async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const tenantId = req.tenantId!;
    const { id } = req.params;

    await db.tenantConnector.update({
      where: {
        tenantId_connectorId: {
          tenantId,
          connectorId: id
        }
      },
      data: {
        isActive: false
      }
    });

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE config (secrets)
router.put('/:id/config', async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const tenantId = req.tenantId!;
    const { id } = req.params;
    const { secrets } = req.body; // Map of key -> value

    const tenantConnector = await db.tenantConnector.findUnique({
      where: {
        tenantId_connectorId: {
          tenantId,
          connectorId: id
        }
      }
    });

    if (!tenantConnector) {
      return res.status(404).json({ error: 'Tenant connector not found' });
    }

    // Upsert secrets
    for (const [key, value] of Object.entries(secrets)) {
      await db.tenantConnectorSecret.upsert({
        where: {
          tenantConnectorId_secretKey: {
            tenantConnectorId: tenantConnector.id,
            secretKey: key
          }
        },
        update: {
          secretValue: value as string
        },
        create: {
          tenantConnectorId: tenantConnector.id,
          secretKey: key,
          secretValue: value as string
        }
      });
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE a custom connector
router.post('/custom', async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const tenantId = req.tenantId!;
    const { name, icon, category, ioSchema, edgeFunctionLogic, config } = req.body;

    const connector = await globalPrisma.nexusConnector.create({
      data: {
        name,
        icon,
        category,
        ioSchema,
        isCustom: true,
        tenantId,
        config: config || {},
        edgeFunctionUrl: '/api/nexus-proxy/execute' 
      }
    });

    const tenantConnector = await db.tenantConnector.create({
      data: {
        tenantId,
        connectorId: connector.id,
        isActive: true,
        displayName: name
      }
    });

    res.json({ connector, activation: tenantConnector });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
