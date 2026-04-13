import express from 'express';
import { TenantRequest } from '../middleware/tenantMiddleware';
import { authorize } from '../middleware/authorize';
import { PLAN_QUOTAS, DEFAULT_PLAN } from '../lib/billingConstants';

const router = express.Router();

/**
 * GET /api/billing/usage
 * Returns current license usage vs quota for the tenant.
 */
router.get('/usage', authorize('view:settings'), async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const tenantId = req.tenantId!;

    // 1. Get Tenant details for the plan tier
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { planTier: true }
    });

    const tier = (tenant?.planTier || DEFAULT_PLAN).toLowerCase();
    const quota = PLAN_QUOTAS[tier] || PLAN_QUOTAS[DEFAULT_PLAN];

    // 2. Count active members by license type
    // We treat 'Developer' as anyone with licenceType === 'Developer'
    const developerUsed = await db.tenantMember.count({
      where: { 
        tenantId,
        licenceType: 'Developer',
        status: 'Active'
      }
    });

    const standardUsed = await db.tenantMember.count({
      where: { 
        tenantId,
        licenceType: 'Standard',
        status: 'Active'
      }
    });

    res.json({
      plan: tier,
      quota,
      usage: {
        developer: developerUsed,
        standard: standardUsed
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/billing/invoices
 * Returns mock invoice history.
 */
router.get('/invoices', authorize('view:settings'), async (req: TenantRequest, res) => {
  try {
    const tenantId = req.tenantId!;
    
    // In a real app, this would query a Stripe/Billing service or an Invoices table.
    // We'll return mock data for the high-fidelity UI.
    const mockInvoices = [
      { id: 'INV-2026-04', date: '2026-04-01', amount: 199.00, status: 'Paid', downloadUrl: '#' },
      { id: 'INV-2026-03', date: '2026-03-01', amount: 199.00, status: 'Paid', downloadUrl: '#' },
      { id: 'INV-2026-02', date: '2026-02-01', amount: 49.00, status: 'Paid', downloadUrl: '#' }, // Example of a plan change
    ];

    res.json(mockInvoices);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
