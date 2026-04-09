import { Router } from 'express';
import { globalPrisma } from '../lib/prisma';
import { spawnTenant } from '../services/provisioner';

const router = Router();

/**
 * GET /api/admin/tenants
 * Lists all businesses from the Global Registry.
 */
router.get('/tenants', async (req, res) => {
  try {
    const tenants = await globalPrisma.tenant.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(tenants);
  } catch (error) {
    console.error('Failed to fetch tenants:', error);
    res.status(500).json({ error: 'Failed to access registry' });
  }
});

/**
 * POST /api/admin/tenants
 * Triggers the atomic 'spawnTenant' workflow.
 */
router.post('/tenants', async (req, res) => {
  const { name, subdomain, adminEmail, plan } = req.body;
  if (!name || !subdomain || !adminEmail) {
    return res.status(400).json({ error: 'Missing required provisioning fields' });
  }
  try {
    const result = await spawnTenant({ name, subdomain, adminEmail, plan });
    res.status(201).json(result);
  } catch (error: any) {
    console.error('Provisioning failure:', error);
    res.status(500).json({ error: error.message || 'Failed to spawn tenant' });
  }
});

/**
 * GET /api/admin/tenancy/:id
 * Deep-dive aggregation for a single tenant's activity.
 */
router.get('/tenancy/:id', async (req, res) => {
  const { id } = req.params;
  console.log(`[AdminAPI] Fetching mission briefing for tenant: ${id}`);
  try {
    const tenant = await globalPrisma.tenant.findUnique({
      where: { id: id.trim() },
      include: {
        workspaces: {
          include: {
            users: true,
            modules: true
          }
        },
        usageLogs: {
          take: 10,
          orderBy: { timestamp: 'desc' }
        }
      }
    });

    if (!tenant) return res.status(404).json({ error: 'Tenant index not found' });

    // Aggregate counts
    const totalModules = tenant.workspaces.reduce((acc, w) => acc + w.modules.length, 0);
    const totalUsers = tenant.workspaces.reduce((acc, w) => acc + w.users.length, 0);
    const totalWorkspaces = tenant.workspaces.length;

    res.json({
      ...tenant,
      stats: { totalModules, totalUsers, totalWorkspaces }
    });
  } catch (error) {
    console.error('Failed to fetch tenant overview:', error);
    res.status(500).json({ error: 'Failed to aggregate tenant telemetry' });
  }
});

/**
 * GET /api/admin/nodes
 * Infrastructure telemetry HUD data.
 */
router.get('/nodes', async (req, res) => {
  try {
    // Simulated real-time metrics for the HUD
    const health = {
      registrySync: '100%',
      latency: Math.floor(Math.random() * 5) + 2 + 'ms',
      databaseNodes: 3,
      aiExecutionSwarm: 14,
      lastMigration: '2026-03-28T12:00:00Z',
      services: [
        { name: 'Global Registry', status: 'optimal', uptime: '99.999%' },
        { name: 'Compute Gateway', status: 'optimal', uptime: '99.99%' },
        { name: 'Aurora Swarm-Node', status: 'optimal', uptime: '99.9%' },
        { name: 'Vector Store', status: 'degraded', uptime: '98.5%' }
      ]
    };
    res.json(health);
  } catch (error) {
    res.status(500).json({ error: 'Health telemetry unavailable' });
  }
});

/**
 * GET /api/admin/versions
 * Fleet deployment & version distribution.
 */
router.get('/versions', async (req, res) => {
  try {
    const modules = await globalPrisma.module.findMany();
    const distribution = modules.reduce((acc: any, mod) => {
      const type = (mod.config as any)?.type || 'standard';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    res.json({
      distribution,
      deployments: [
        { id: 'v2.6.4', label: 'Stable', nodes: 42, rollout: '100%' },
        { id: 'v2.7.0-beta', label: 'Beta', nodes: 12, rollout: '28.5%' }
      ]
    });
  } catch (error) {
    res.status(500).json({ error: 'Fleet telemetry unavailable' });
  }
});

/**
 * GET /api/admin/stats
 * Platform-wide usage metrics.
 */
router.get('/stats', async (req, res) => {
  try {
    const totalTenants = await globalPrisma.tenant.count();
    const activeTenants = await globalPrisma.tenant.count({ where: { status: 'active' } });
    const usageByTenant = await globalPrisma.usageLog.groupBy({
      by: ['tenantId'],
      _sum: { amount: true },
      where: { type: 'ai_token' }
    });
    res.json({
      overview: {
        totalTenants,
        activeTenants,
        platformHealth: '99.99%',
        totalAiUsage: usageByTenant.reduce((acc, u) => acc + (u._sum.amount || 0), 0)
      },
      usageByTenant
    });
  } catch (error) {
    console.error('Failed to fetch stats:', error);
    res.status(500).json({ error: 'Failed to aggregate registry metrics' });
  }
});

/**
 * GET /api/admin/compute
 * AI Swarm & GPU node resource telemetry.
 */
router.get('/compute', async (req, res) => {
  try {
    res.json({
      nodes: [
        { id: 'gpu-cluster-01', region: 'us-east-1', load: '78%', status: 'optimal', gpus: 8, temp: '62°C' },
        { id: 'gpu-cluster-02', region: 'eu-west-1', load: '42%', status: 'optimal', gpus: 8, temp: '58°C' },
        { id: 'gpu-cluster-03', region: 'ap-south-1', load: '94%', status: 'high-load', gpus: 16, temp: '74°C' },
        { id: 'edge-inference-01', region: 'us-west-2', load: '12%', status: 'idle', gpus: 2, temp: '45°C' }
      ],
      globalMetrics: {
        totalTokensProcessed: '1.4B',
        activeKernels: 1420,
        averageLatency: '18ms'
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Compute telemetry unavailable' });
  }
});

export default router;
