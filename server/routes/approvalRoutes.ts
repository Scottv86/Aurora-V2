import { Router } from 'express';
import { TenantRequest } from '../middleware/tenantMiddleware';
import { globalPrisma } from '../lib/prisma';
import { recordAudit } from '../lib/audit';
import crypto from 'crypto';

const router = Router();

export interface UnifiedApprovalItem {
  id: string;
  sourceId: string;
  category: 'WORKFLOW' | 'LEAVE' | 'INVOICE' | 'RMA' | 'PARTY' | 'AI_ACTION';
  title: string;
  description: string;
  requester: {
    name: string;
    email?: string;
    avatarUrl?: string;
    memberId?: string;
  };
  submittedAt: string;
  amount?: number;
  currency?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  metadata: Record<string, any>;
  quorum: {
    required: number;
    current: number;
    approvers: string[];
  };
}

// GET /api/approvals - Unified Approval Aggregator
router.get('/', async (req: TenantRequest, res) => {
  try {
    const tenantId = req.tenantId!;
    const db = req.db || globalPrisma;
    const filterStatus = ((req.query.status as string) || 'PENDING').toUpperCase();
    const filterCategory = ((req.query.category as string) || 'ALL').toUpperCase();
    const search = ((req.query.search as string) || '').toLowerCase().trim();

    const items: UnifiedApprovalItem[] = [];

    // 1. LEAVE REQUESTS
    if (filterCategory === 'ALL' || filterCategory === 'LEAVE') {
      try {
        const leaveWhere: any = {
          member: { tenantId }
        };
        if (filterStatus !== 'ALL') {
          leaveWhere.status = filterStatus === 'PENDING' ? 'Pending' : (filterStatus === 'APPROVED' ? 'Approved' : 'Rejected');
        }

        const leaves: any[] = await (db.leaveRequest as any).findMany({
          where: leaveWhere,
          include: {
            member: {
              include: { user: true, position: true }
            }
          },
          orderBy: { startDate: 'desc' },
          take: 50
        });

        for (const l of leaves) {
          const userName = l.member?.user ? `${l.member.user.firstName || ''} ${l.member.user.lastName || ''}`.trim() || l.member.user.email : 'Team Member';
          const startStr = new Date(l.startDate).toLocaleDateString();
          const endStr = new Date(l.endDate).toLocaleDateString();
          const durationDays = Math.max(1, Math.round((new Date(l.endDate).getTime() - new Date(l.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1);

          items.push({
            id: `leave_${l.id}`,
            sourceId: l.id,
            category: 'LEAVE',
            title: `${l.type} - ${userName}`,
            description: l.reason ? `Reason: "${l.reason}" (${durationDays} days: ${startStr} to ${endStr})` : `${durationDays} days (${startStr} to ${endStr})`,
            requester: {
              name: userName,
              email: l.member?.user?.email,
              avatarUrl: l.member?.avatarUrl || undefined,
              memberId: l.memberId
            },
            submittedAt: new Date(l.startDate).toISOString(),
            status: l.status.toUpperCase() as any,
            urgency: durationDays > 10 ? 'HIGH' : 'MEDIUM',
            metadata: {
              leaveType: l.type,
              startDate: l.startDate,
              endDate: l.endDate,
              durationDays,
              position: l.member?.position?.title
            },
            quorum: {
              required: 1,
              current: l.status === 'Approved' ? 1 : 0,
              approvers: l.status === 'Approved' ? ['Manager'] : []
            }
          });
        }
      } catch (e: any) {
        console.warn('[ApprovalsAPI] Error fetching leave requests:', e.message);
      }
    }

    // 2. SUPPLIER BILLS / INVOICES AWAITING APPROVAL
    if (filterCategory === 'ALL' || filterCategory === 'INVOICE') {
      try {
        const invWhere: any = { tenantId };
        if (filterStatus === 'PENDING') {
          invWhere.status = { in: ['DRAFT', 'AWAITING_APPROVAL'] };
        } else if (filterStatus === 'APPROVED') {
          invWhere.status = 'AUTHORIZED';
        } else if (filterStatus === 'REJECTED') {
          invWhere.status = 'VOID';
        }

        const invoices = await db.invoice.findMany({
          where: invWhere,
          include: { 
            customer: { 
              include: { 
                person: true, 
                organization: true 
              } 
            }, 
            lines: true 
          },
          orderBy: { createdAt: 'desc' },
          take: 50
        });

        for (const inv of invoices) {
          const partyName = inv.customer?.organization?.legalName || 
            (inv.customer?.person ? `${inv.customer.person.firstName} ${inv.customer.person.lastName}`.trim() : 'Customer');
          const totalAmt = Number(inv.total) || 0;
          const urgency = totalAmt > 25000 ? 'CRITICAL' : (totalAmt > 5000 ? 'HIGH' : 'MEDIUM');

          items.push({
            id: `inv_${inv.id}`,
            sourceId: inv.id,
            category: 'INVOICE',
            title: `Payable Authorization: ${inv.invoiceNumber || 'INV-DRAFT'} - ${partyName}`,
            description: `Payment authorization required for ${inv.lines?.length || 0} line items. Total: $${totalAmt.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
            requester: {
              name: partyName
            },
            submittedAt: inv.createdAt.toISOString(),
            amount: totalAmt,
            currency: inv.currency || 'USD',
            status: inv.status === 'AUTHORIZED' ? 'APPROVED' : (inv.status === 'VOID' ? 'REJECTED' : 'PENDING'),
            urgency,
            metadata: {
              invoiceNumber: inv.invoiceNumber,
              dueDate: inv.dueDate,
              lineItemsCount: inv.lines?.length || 0,
              subtotal: inv.subtotal,
              taxTotal: inv.taxTotal
            },
            quorum: {
              required: totalAmt > 10000 ? 2 : 1,
              current: inv.status === 'AUTHORIZED' ? (totalAmt > 10000 ? 2 : 1) : 0,
              approvers: []
            }
          });
        }
      } catch (e: any) {
        console.warn('[ApprovalsAPI] Error fetching invoices:', e.message);
      }
    }

    // 3. RMA / RETURN REQUESTS
    if (filterCategory === 'ALL' || filterCategory === 'RMA') {
      try {
        const rmaWhere: any = { tenantId };
        if (filterStatus === 'PENDING') {
          rmaWhere.status = 'PENDING_REVIEW';
        } else if (filterStatus === 'APPROVED') {
          rmaWhere.status = { in: ['APPROVED_PENDING_RECEIPT', 'ACCEPTED_REFUNDED'] };
        } else if (filterStatus === 'REJECTED') {
          rmaWhere.status = 'REJECTED';
        }

        const rmas = await db.returnRequest.findMany({
          where: rmaWhere,
          include: {
            customer: {
              include: { person: true, organization: true }
            },
            items: true
          },
          orderBy: { createdAt: 'desc' },
          take: 50
        });

        for (const rma of rmas) {
          const custName = rma.customer?.organization?.legalName || 
            (rma.customer?.person ? `${rma.customer.person.firstName} ${rma.customer.person.lastName}`.trim() : 'Customer');

          items.push({
            id: `rma_${rma.id}`,
            sourceId: rma.id,
            category: 'RMA',
            title: `RMA Triage Sign-off: ${rma.rmaNumber || rma.id.slice(0, 8)}`,
            description: `Customer Return Request. Reason: ${rma.reason} | Items: ${rma.items.length}`,
            requester: {
              name: custName
            },
            submittedAt: rma.createdAt.toISOString(),
            status: (rma.status === 'APPROVED_PENDING_RECEIPT' || rma.status === 'ACCEPTED_REFUNDED') ? 'APPROVED' : (rma.status === 'REJECTED' ? 'REJECTED' : 'PENDING'),
            urgency: 'MEDIUM',
            metadata: {
              rmaNumber: rma.rmaNumber,
              reason: rma.reason,
              requestedMethod: rma.requestedMethod,
              customerComments: rma.customerComments,
              itemsCount: rma.items.length
            },
            quorum: {
              required: 1,
              current: (rma.status === 'APPROVED_PENDING_RECEIPT' || rma.status === 'ACCEPTED_REFUNDED') ? 1 : 0,
              approvers: []
            }
          });
        }
      } catch (e: any) {
        console.warn('[ApprovalsAPI] Error fetching RMAs:', e.message);
      }
    }

    // 4. WORKFLOW APPROVAL RECORDS
    if (filterCategory === 'ALL' || filterCategory === 'WORKFLOW') {
      try {
        const recordWhere: any = {
          tenantId,
          OR: [
            { status: { in: ['Pending Approval', 'Pending', 'PENDING_APPROVAL', 'Awaiting Sign-off'] } },
            { workflowState: { path: ['status'], equals: 'PENDING' } }
          ]
        };

        const records = await db.record.findMany({
          where: recordWhere,
          include: { module: true },
          orderBy: { updatedAt: 'desc' },
          take: 50
        });

        for (const rec of records) {
          const recData = (rec.data as any) || {};
          const wfState = (rec.workflowState as any) || {};
          const moduleName = rec.module?.name || 'Record';
          const recTitle = recData.name || recData.title || recData.subject || `${moduleName} #${rec.id.slice(-6)}`;
          const amount = recData.amount || recData.total || recData.budget || undefined;

          items.push({
            id: `rec_${rec.id}`,
            sourceId: rec.id,
            category: 'WORKFLOW',
            title: `Workflow Approval: ${recTitle} (${moduleName})`,
            description: wfState.currentNodeName ? `Current Step: "${wfState.currentNodeName}". Awaiting executive sign-off.` : `Record status: "${rec.status}" in ${moduleName}`,
            requester: {
              name: recData.createdBy || recData.owner || 'System Workflow',
              email: recData.email
            },
            submittedAt: rec.updatedAt.toISOString(),
            amount: typeof amount === 'number' ? amount : undefined,
            status: 'PENDING',
            urgency: (rec.slaStatus === 'BREACHED' || rec.slaStatus === 'WARNING') ? 'CRITICAL' : 'MEDIUM',
            metadata: {
              moduleId: rec.moduleId,
              moduleName,
              recordData: recData,
              currentNode: wfState.currentNode,
              currentNodeName: wfState.currentNodeName
            },
            quorum: {
              required: wfState.quorumRequired || 1,
              current: Array.isArray(wfState.approvals) ? wfState.approvals.length : 0,
              approvers: Array.isArray(wfState.approvals) ? wfState.approvals : []
            }
          });
        }
      } catch (e: any) {
        console.warn('[ApprovalsAPI] Error fetching workflow records:', e.message);
      }
    }

    // 5. STAGED AI AGENT ACTIONS (Human-In-The-Loop)
    if (filterCategory === 'ALL' || filterCategory === 'AI_ACTION') {
      try {
        const tenant = await db.tenant.findUnique({
          where: { id: tenantId },
          select: { workspaceSettings: true }
        });
        const wsSettings = (tenant?.workspaceSettings as any) || {};
        const stagedActions: any[] = Array.isArray(wsSettings.stagedAiActions) ? wsSettings.stagedAiActions : [];

        for (const act of stagedActions) {
          if (filterStatus !== 'ALL' && act.status && act.status !== filterStatus) continue;

          items.push({
            id: `ai_${act.id}`,
            sourceId: act.id,
            category: 'AI_ACTION',
            title: `AI Agent Proposal: ${act.title || act.actionType}`,
            description: `Confidence: ${Math.round((act.confidence || 0.85) * 100)}%. Rationale: ${act.rationale || 'Autonomous workflow proposed modification.'}`,
            requester: {
              name: act.agentName || 'Antigravity Copilot',
              avatarUrl: '/sparkle.svg'
            },
            submittedAt: act.stagedAt || new Date().toISOString(),
            amount: act.estimatedImpact,
            currency: 'USD',
            status: (act.status || 'PENDING') as any,
            urgency: act.confidence < 0.8 ? 'HIGH' : 'LOW',
            metadata: act,
            quorum: {
              required: 1,
              current: act.status === 'APPROVED' ? 1 : 0,
              approvers: []
            }
          });
        }
      } catch (e: any) {
        console.warn('[ApprovalsAPI] Error fetching staged AI actions:', e.message);
      }
    }

    // Filter by Search Query if present
    let filtered = items;
    if (search) {
      filtered = items.filter(i => 
        i.title.toLowerCase().includes(search) || 
        i.description.toLowerCase().includes(search) ||
        i.requester.name.toLowerCase().includes(search)
      );
    }

    // Sort by Urgency & Recency
    const urgencyOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
    filtered.sort((a, b) => {
      const uA = urgencyOrder[a.urgency] || 0;
      const uB = urgencyOrder[b.urgency] || 0;
      if (uA !== uB) return uB - uA;
      return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
    });

    res.json(filtered);
  } catch (err: any) {
    console.error('[ApprovalsAPI Error]', err);
    res.status(500).json({ error: err.message || 'Failed to fetch approval queue' });
  }
});

// GET /api/approvals/stats - Quick Summary Statistics
router.get('/stats', async (req: TenantRequest, res) => {
  try {
    const tenantId = req.tenantId!;
    const db = req.db || globalPrisma;

    const [pendingLeaves, pendingInvoices, pendingRmas, pendingRecords] = await Promise.all([
      db.leaveRequest.count({ where: { member: { tenantId }, status: 'Pending' } }).catch(() => 0),
      db.invoice.count({ where: { tenantId, status: { in: ['DRAFT', 'AWAITING_APPROVAL'] } } }).catch(() => 0),
      db.returnRequest.count({ where: { tenantId, status: 'PENDING_REVIEW' } }).catch(() => 0),
      db.record.count({
        where: {
          tenantId,
          OR: [
            { status: { in: ['Pending Approval', 'Pending', 'PENDING_APPROVAL', 'Awaiting Sign-off'] } },
            { workflowState: { path: ['status'], equals: 'PENDING' } }
          ]
        }
      }).catch(() => 0)
    ]);

    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { workspaceSettings: true }
    });
    const stagedAiCount = ((tenant?.workspaceSettings as any)?.stagedAiActions || [])
      .filter((a: any) => !a.status || a.status === 'PENDING').length;

    const totalPending = pendingLeaves + pendingInvoices + pendingRmas + pendingRecords + stagedAiCount;

    res.json({
      totalPending,
      byCategory: {
        leave: pendingLeaves,
        invoice: pendingInvoices,
        rma: pendingRmas,
        workflow: pendingRecords,
        ai: stagedAiCount
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/approvals/:id/decide - Execute Decision (Approve or Reject)
router.post('/:id/decide', async (req: TenantRequest, res) => {
  try {
    const tenantId = req.tenantId!;
    const db = req.db || globalPrisma;
    const { id } = req.params;
    const { decision, notes, pin, category, sourceId } = req.body;

    if (!['APPROVE', 'REJECT'].includes(decision)) {
      return res.status(400).json({ error: 'Decision must be APPROVE or REJECT' });
    }

    const actorId = req.user?.uid || 'USER';
    const actorEmail = req.user?.email || 'actor@aurora.io';
    const digitalSignature = crypto.createHash('sha256')
      .update(`${tenantId}:${id}:${decision}:${actorId}:${Date.now()}`)
      .digest('hex');

    // Parse category and sourceId
    const cat = (category || id.split('_')[0]).toUpperCase();
    const targetId = sourceId || (id.includes('_') ? id.slice(id.indexOf('_') + 1) : id);

    let resultPayload: any = { success: true, decision, digitalSignature };

    if (cat === 'LEAVE') {
      const updated = await db.leaveRequest.update({
        where: { id: targetId },
        data: {
          status: decision === 'APPROVE' ? 'Approved' : 'Rejected'
        }
      });
      resultPayload.leave = updated;
    } else if (cat === 'INVOICE') {
      const updated = await db.invoice.update({
        where: { id: targetId },
        data: {
          status: decision === 'APPROVE' ? 'AUTHORIZED' : 'VOID'
        }
      });
      resultPayload.invoice = updated;
    } else if (cat === 'RMA') {
      const updated = await db.returnRequest.update({
        where: { id: targetId },
        data: {
          status: decision === 'APPROVE' ? 'APPROVED_PENDING_RECEIPT' : 'REJECTED'
        }
      });
      resultPayload.rma = updated;
    } else if (cat === 'WORKFLOW') {
      const record = await db.record.findUnique({
        where: { id: targetId }
      });
      if (record) {
        const wfState = ((record.workflowState as any) || {});
        const currentApprovals = Array.isArray(wfState.approvals) ? [...wfState.approvals, actorEmail] : [actorEmail];
        const requiredQuorum = wfState.quorumRequired || 1;

        const isFullyApproved = decision === 'APPROVE' && currentApprovals.length >= requiredQuorum;

        const updated = await db.record.update({
          where: { id: targetId },
          data: {
            status: isFullyApproved ? 'Active' : (decision === 'REJECT' ? 'Rejected' : 'Pending Approval'),
            workflowState: {
              ...wfState,
              approvals: currentApprovals,
              status: isFullyApproved ? 'COMPLETED' : (decision === 'REJECT' ? 'REJECTED' : 'PENDING'),
              lastDecision: { decision, actor: actorEmail, notes, at: new Date().toISOString() }
            }
          }
        });
        resultPayload.record = updated;
      }
    } else if (cat === 'AI_ACTION') {
      const tenant = await db.tenant.findUnique({
        where: { id: tenantId },
        select: { workspaceSettings: true }
      });
      const wsSettings = (tenant?.workspaceSettings as any) || {};
      const staged: any[] = Array.isArray(wsSettings.stagedAiActions) ? wsSettings.stagedAiActions : [];

      const targetAction = staged.find(a => a.id === targetId);
      if (targetAction && decision === 'APPROVE' && targetAction.targetRecordId && targetAction.patchData) {
        await db.record.update({
          where: { id: targetAction.targetRecordId },
          data: {
            data: targetAction.patchData
          }
        });
      }

      const updatedStaged = staged.map(a => a.id === targetId ? { ...a, status: decision === 'APPROVE' ? 'APPROVED' : 'REJECTED', decidedBy: actorEmail, notes } : a);
      await db.tenant.update({
        where: { id: tenantId },
        data: {
          workspaceSettings: {
            ...wsSettings,
            stagedAiActions: updatedStaged
          }
        }
      });
      resultPayload.aiAction = { id: targetId, status: decision === 'APPROVE' ? 'APPROVED' : 'REJECTED' };
    }

    // Record immutable audit log
    await recordAudit({
      tenantId,
      actorId,
      action: `APPROVAL_${decision}_${cat}`,
      resourceId: targetId,
      newValue: {
        decision,
        notes,
        pinValidated: Boolean(pin),
        signature: digitalSignature,
        timestamp: new Date().toISOString()
      }
    });

    res.json(resultPayload);
  } catch (err: any) {
    console.error('[ApprovalsAPI Decide Error]', err);
    res.status(500).json({ error: err.message || 'Failed to process decision' });
  }
});

// POST /api/approvals/batch-decide - Batch Sign-off
router.post('/batch-decide', async (req: TenantRequest, res) => {
  try {
    const tenantId = req.tenantId!;
    const db = req.db || globalPrisma;
    const { items, decision, notes } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Items array is required' });
    }

    const processed: string[] = [];

    for (const item of items) {
      const { id, category, sourceId } = item;
      const cat = (category || id.split('_')[0]).toUpperCase();
      const targetId = sourceId || (id.includes('_') ? id.slice(id.indexOf('_') + 1) : id);

      try {
        if (cat === 'LEAVE') {
          await db.leaveRequest.update({
            where: { id: targetId },
            data: { status: decision === 'APPROVE' ? 'Approved' : 'Rejected' }
          });
        } else if (cat === 'INVOICE') {
          await db.invoice.update({
            where: { id: targetId },
            data: { status: decision === 'APPROVE' ? 'AUTHORIZED' : 'VOID' }
          });
        } else if (cat === 'RMA') {
          await db.returnRequest.update({
            where: { id: targetId },
            data: { status: decision === 'APPROVE' ? 'APPROVED_PENDING_RECEIPT' : 'REJECTED' }
          });
        } else if (cat === 'WORKFLOW') {
          await db.record.update({
            where: { id: targetId },
            data: { status: decision === 'APPROVE' ? 'Active' : 'Rejected' }
          });
        }
        processed.push(id);
      } catch (e: any) {
        console.warn(`[BatchApprovals] Failed to process ${id}:`, e.message);
      }
    }

    await recordAudit({
      tenantId,
      actorId: req.user?.uid || 'USER',
      action: `APPROVAL_BATCH_${decision}`,
      resourceId: 'BATCH',
      newValue: { count: processed.length, items: processed, notes }
    });

    res.json({ success: true, processedCount: processed.length, processed });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/approvals/delegation - Out-of-Office Delegation Settings
router.get('/delegation', async (req: TenantRequest, res) => {
  try {
    const tenantId = req.tenantId!;
    const db = req.db || globalPrisma;

    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { workspaceSettings: true }
    });
    const wsSettings = (tenant?.workspaceSettings as any) || {};

    res.json(wsSettings.approvalDelegations || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/approvals/delegation - Save Out-of-Office Delegation
router.post('/delegation', async (req: TenantRequest, res) => {
  try {
    const tenantId = req.tenantId!;
    const db = req.db || globalPrisma;
    const { delegateMemberId, delegateName, startDate, endDate, notes } = req.body;

    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { workspaceSettings: true }
    });
    const wsSettings = (tenant?.workspaceSettings as any) || {};
    const existing = Array.isArray(wsSettings.approvalDelegations) ? wsSettings.approvalDelegations : [];

    const newDelegation = {
      id: `del_${Date.now()}`,
      assignedBy: req.user?.email || 'user',
      delegateMemberId,
      delegateName,
      startDate,
      endDate,
      notes,
      createdAt: new Date().toISOString()
    };

    await db.tenant.update({
      where: { id: tenantId },
      data: {
        workspaceSettings: {
          ...wsSettings,
          approvalDelegations: [...existing, newDelegation]
        }
      }
    });

    res.status(201).json(newDelegation);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
