import { Router, Response } from 'express';
import { globalPrisma as prisma } from '../lib/prisma';
import { TenantRequest } from '../middleware/tenantMiddleware';

const router = Router();

interface SchedulingState {
  configs?: any[];
  resources?: any[];
  blackouts?: any[];
  bookings?: any[];
}

async function getTenantSchedulingState(tenantId: string): Promise<{
  metadata: Record<string, any>;
  scheduling: SchedulingState;
}> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { metadata: true }
  });
  const metadata =
    tenant?.metadata && typeof tenant.metadata === 'object' && !Array.isArray(tenant.metadata)
      ? (tenant.metadata as Record<string, any>)
      : {};
  const scheduling =
    metadata.scheduling && typeof metadata.scheduling === 'object'
      ? (metadata.scheduling as SchedulingState)
      : {};
  return { metadata, scheduling };
}

async function saveTenantSchedulingState(
  tenantId: string,
  metadata: Record<string, any>,
  scheduling: SchedulingState
): Promise<void> {
  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      metadata: {
        ...metadata,
        scheduling
      }
    }
  });
}

// GET /api/scheduling - Fetch full scheduling state + RESOURCE_POOL module records
router.get('/', async (req: TenantRequest, res: Response) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) return res.status(400).json({ error: 'Tenant context required' });

    const { scheduling } = await getTenantSchedulingState(tenantId);

    // Discover records from modules marked as RESOURCE_POOL
    const poolModules = await prisma.module.findMany({
      where: {
        workspace: { tenantId },
        schedulingRole: 'RESOURCE_POOL'
      },
      select: {
        id: true,
        name: true,
        schedulingConfig: true
      }
    });

    const moduleRecords: Record<string, any[]> = {};
    if (poolModules.length > 0) {
      const records = await prisma.record.findMany({
        where: {
          moduleId: { in: poolModules.map(m => m.id) },
          isDeleted: false
        },
        take: 200,
        select: {
          id: true,
          moduleId: true,
          status: true,
          data: true
        }
      });

      for (const rec of records) {
        if (!moduleRecords[rec.moduleId]) moduleRecords[rec.moduleId] = [];
        const d = rec.data && typeof rec.data === 'object' ? (rec.data as Record<string, any>) : {};
        moduleRecords[rec.moduleId].push({
          id: rec.id,
          status: rec.status,
          ...d
        });
      }
    }

    res.json({
      configs: Array.isArray(scheduling.configs) ? scheduling.configs : [],
      resources: Array.isArray(scheduling.resources) ? scheduling.resources : [],
      blackouts: Array.isArray(scheduling.blackouts) ? scheduling.blackouts : [],
      bookings: Array.isArray(scheduling.bookings) ? scheduling.bookings : [],
      moduleRecords
    });
  } catch (err: any) {
    console.error('[SchedulingAPI] GET / error:', err);
    res.status(500).json({ error: err.message || 'Failed to load scheduling data' });
  }
});

// PUT /api/scheduling/state - Persist configs/resources/blackouts/bookings
router.put('/state', async (req: TenantRequest, res: Response) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) return res.status(400).json({ error: 'Tenant context required' });

    const { metadata, scheduling } = await getTenantSchedulingState(tenantId);
    const body = req.body || {};

    const nextScheduling: SchedulingState = {
      configs: Array.isArray(body.configs) ? body.configs : scheduling.configs || [],
      resources: Array.isArray(body.resources) ? body.resources : scheduling.resources || [],
      blackouts: Array.isArray(body.blackouts) ? body.blackouts : scheduling.blackouts || [],
      bookings: Array.isArray(body.bookings) ? body.bookings : scheduling.bookings || []
    };

    await saveTenantSchedulingState(tenantId, metadata, nextScheduling);
    res.json({ ok: true, scheduling: nextScheduling });
  } catch (err: any) {
    console.error('[SchedulingAPI] PUT /state error:', err);
    res.status(500).json({ error: err.message || 'Failed to save scheduling state' });
  }
});

// POST /api/scheduling/bookings - Create a booking
router.post('/bookings', async (req: TenantRequest, res: Response) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) return res.status(400).json({ error: 'Tenant context required' });

    const booking = req.body;
    if (!booking || !booking.id) {
      return res.status(400).json({ error: 'Valid booking payload required' });
    }

    const { metadata, scheduling } = await getTenantSchedulingState(tenantId);
    const existing = Array.isArray(scheduling.bookings) ? scheduling.bookings : [];
    const nextBookings = [booking, ...existing.filter((b: any) => b.id !== booking.id)];

    await saveTenantSchedulingState(tenantId, metadata, {
      ...scheduling,
      bookings: nextBookings
    });

    res.status(201).json(booking);
  } catch (err: any) {
    console.error('[SchedulingAPI] POST /bookings error:', err);
    res.status(500).json({ error: err.message || 'Failed to create booking' });
  }
});

// PATCH /api/scheduling/bookings/:id - Update a booking
router.patch('/bookings/:id', async (req: TenantRequest, res: Response) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) return res.status(400).json({ error: 'Tenant context required' });

    const bookingId = req.params.id;
    const patch = req.body || {};

    const { metadata, scheduling } = await getTenantSchedulingState(tenantId);
    const existing = Array.isArray(scheduling.bookings) ? scheduling.bookings : [];
    const idx = existing.findIndex((b: any) => b.id === bookingId);

    if (idx === -1) {
      const created = { id: bookingId, ...patch };
      await saveTenantSchedulingState(tenantId, metadata, {
        ...scheduling,
        bookings: [created, ...existing]
      });
      return res.json(created);
    }

    const updated = { ...existing[idx], ...patch, id: bookingId };
    existing[idx] = updated;

    await saveTenantSchedulingState(tenantId, metadata, {
      ...scheduling,
      bookings: existing
    });

    res.json(updated);
  } catch (err: any) {
    console.error('[SchedulingAPI] PATCH /bookings/:id error:', err);
    res.status(500).json({ error: err.message || 'Failed to update booking' });
  }
});

// DELETE /api/scheduling/bookings/:id - Delete a booking
router.delete('/bookings/:id', async (req: TenantRequest, res: Response) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) return res.status(400).json({ error: 'Tenant context required' });

    const bookingId = req.params.id;
    const { metadata, scheduling } = await getTenantSchedulingState(tenantId);
    const existing = Array.isArray(scheduling.bookings) ? scheduling.bookings : [];
    const nextBookings = existing.filter((b: any) => b.id !== bookingId);

    await saveTenantSchedulingState(tenantId, metadata, {
      ...scheduling,
      bookings: nextBookings
    });

    res.json({ ok: true });
  } catch (err: any) {
    console.error('[SchedulingAPI] DELETE /bookings/:id error:', err);
    res.status(500).json({ error: err.message || 'Failed to delete booking' });
  }
});

export default router;
