import express from 'express';
import { z } from 'zod';
import { TenantRequest } from '../middleware/tenantMiddleware';
import { globalPrisma } from '../lib/prisma';
import { ReconciliationService } from '../services/reconciliationService';

const router = express.Router();

const ReconcileSchema = z.object({
  lineId: z.string().min(1, 'Line ID is required'),
  matchType: z.enum(['INVOICE', 'BILL', 'POS_CLEARING', 'GATEWAY_CLEARING', 'MANUAL_EXPENSE']),
  matchId: z.string().optional(),
  feeAmount: z.number().nonnegative().optional().default(0),
  expenseAccountId: z.string().optional(),
});

// GET /api/reconciliation/lines - List Bank Statement Lines
router.get('/lines', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const { bankAccountId, status = 'unreconciled' } = req.query;

    const where: any = { tenantId: req.tenantId };
    if (bankAccountId) where.bankAccountId = bankAccountId as string;
    if (status === 'unreconciled') where.isReconciled = false;
    else if (status === 'reconciled') where.isReconciled = true;

    const lines = await db.bankStatementLine.findMany({
      where,
      include: { bankAccount: true },
      orderBy: { transactionDate: 'desc' }
    });

    res.json(lines);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/reconciliation/import - Import Statement Lines
router.post('/import', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const { bankAccountId, lines } = req.body;

    if (!bankAccountId || !Array.isArray(lines) || lines.length === 0) {
      return res.status(400).json({ error: 'bankAccountId and lines array are required' });
    }

    const result = await ReconciliationService.importLines(
      req.tenantId!,
      bankAccountId,
      lines,
      db
    );

    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/reconciliation/match-suggestions/:lineId - Get Match Suggestions
router.get('/match-suggestions/:lineId', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const suggestions = await ReconciliationService.findSuggestedMatches(
      req.tenantId!,
      req.params.lineId,
      db
    );
    res.json(suggestions);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/reconciliation/reconcile - 1-Click Reconcile
router.post('/reconcile', async (req: TenantRequest, res) => {
  try {
    const db = req.db || globalPrisma;
    const validated = ReconcileSchema.parse(req.body);

    const reconciled = await ReconciliationService.reconcileLine(
      req.tenantId!,
      validated.lineId,
      validated.matchType,
      validated.matchId,
      validated.feeAmount,
      validated.expenseAccountId,
      req.user?.uid,
      db
    );

    res.json(reconciled);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
