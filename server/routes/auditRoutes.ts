import express from 'express';
import { TenantRequest } from '../middleware/tenantMiddleware';
import { authorize } from '../middleware/authorize';

const router = express.Router();

router.get('/', authorize('view:audit_logs'), async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const logs = await db.auditLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: 100
    });

    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
