import { globalPrisma } from '../lib/prisma';
import { recordAudit } from '../lib/audit';
import { RefundService } from './refundService';

export interface CreateRmaInput {
  tenantId: string;
  customerPartyId: string;
  posOrderId?: string | null;
  invoiceId?: string | null;
  requestedMethod?: string;
  reason: any;
  customerComments?: string | null;
  photoUrls?: string[] | null;
  items: Array<{
    catalogItemId?: string | null;
    variantId?: string | null;
    description: string;
    quantity: number;
    condition?: string;
    requestedAction?: string;
  }>;
}

export class RmaService {
  /**
   * Generates a sequential, professional RMA tracking number (e.g. RMA-2026-0042)
   */
  static async generateRmaNumber(tenantId: string, db: any = globalPrisma): Promise<string> {
    const year = new Date().getFullYear();
    const count = await db.returnRequest.count({
      where: { tenantId }
    });
    const seq = String(count + 1).padStart(4, '0');
    return `RMA-${year}-${seq}`;
  }

  /**
   * Submits a new customer return request
   */
  static async createReturnRequest(input: CreateRmaInput, db: any = globalPrisma) {
    const rmaNumber = await this.generateRmaNumber(input.tenantId, db);

    const rma = await db.returnRequest.create({
      data: {
        tenantId: input.tenantId,
        rmaNumber,
        customerPartyId: input.customerPartyId,
        posOrderId: input.posOrderId || null,
        invoiceId: input.invoiceId || null,
        status: 'PENDING_REVIEW',
        requestedMethod: input.requestedMethod || 'ORIGINAL_TENDER',
        reason: input.reason,
        customerComments: input.customerComments || null,
        photoUrls: input.photoUrls || null,
        items: {
          create: input.items.map(item => ({
            catalogItemId: item.catalogItemId || null,
            variantId: item.variantId || null,
            description: item.description,
            quantity: Math.max(1, Number(item.quantity) || 1),
            condition: item.condition || 'OPENED_LIKE_NEW',
            requestedAction: item.requestedAction || 'REFUND'
          }))
        }
      },
      include: {
        items: true,
        customer: {
          include: { person: true, organization: true }
        }
      }
    });

    await recordAudit({
      tenantId: input.tenantId,
      action: 'rma.created',
      entityId: rma.id,
      entityType: 'ReturnRequest',
      changes: {
        rmaNumber,
        customerPartyId: input.customerPartyId,
        itemCount: input.items.length,
        status: 'PENDING_REVIEW'
      }
    });

    return rma;
  }

  /**
   * Lists return requests with filtering
   */
  static async listReturnRequests(filters: {
    tenantId: string;
    status?: string;
    customerPartyId?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }, db: any = globalPrisma) {
    const { tenantId, status, customerPartyId, search, limit = 50, offset = 0 } = filters;
    const where: any = { tenantId };

    if (status && status !== 'ALL') where.status = status;
    if (customerPartyId) where.customerPartyId = customerPartyId;

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { rmaNumber: { contains: q, mode: 'insensitive' } },
        { customerComments: { contains: q, mode: 'insensitive' } },
        { customer: { person: { firstName: { contains: q, mode: 'insensitive' } } } },
        { customer: { person: { lastName: { contains: q, mode: 'insensitive' } } } },
        { customer: { organization: { legalName: { contains: q, mode: 'insensitive' } } } }
      ];
    }

    const [total, requests] = await Promise.all([
      db.returnRequest.count({ where }),
      db.returnRequest.findMany({
        where,
        include: {
          items: true,
          customer: {
            include: { person: true, organization: true }
          },
          refund: true
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      })
    ]);

    return { total, requests };
  }

  /**
   * Fetches full RMA details
   */
  static async getReturnRequestById(tenantId: string, id: string, db: any = globalPrisma) {
    const rma = await db.returnRequest.findFirst({
      where: { id, tenantId },
      include: {
        items: true,
        customer: {
          include: { person: true, organization: true }
        },
        refund: {
          include: { items: true }
        }
      }
    });

    if (!rma) throw new Error('Return request not found');
    return rma;
  }

  /**
   * Staff Review Decision: Approve or Reject
   */
  static async reviewReturnRequest(input: {
    tenantId: string;
    id: string;
    action: 'APPROVE' | 'REJECT';
    rejectionReason?: string;
    internalNotes?: string;
    memberId?: string;
  }, db: any = globalPrisma) {
    const rma = await this.getReturnRequestById(input.tenantId, input.id, db);

    if (rma.status !== 'PENDING_REVIEW') {
      throw new Error(`Cannot review RMA in status ${rma.status}`);
    }

    const newStatus = input.action === 'APPROVE' ? 'APPROVED_PENDING_RECEIPT' : 'REJECTED';

    const updated = await db.returnRequest.update({
      where: { id: input.id },
      data: {
        status: newStatus,
        reviewedByMemberId: input.memberId || null,
        reviewedAt: new Date(),
        rejectionReason: input.rejectionReason || null,
        internalNotes: input.internalNotes || null
      },
      include: {
        items: true,
        customer: { include: { person: true, organization: true } }
      }
    });

    await recordAudit({
      tenantId: input.tenantId,
      action: `rma.${input.action.toLowerCase()}`,
      entityId: rma.id,
      entityType: 'ReturnRequest',
      userId: input.memberId,
      changes: {
        status: newStatus,
        rejectionReason: input.rejectionReason
      }
    });

    return updated;
  }

  /**
   * Mark goods as received at the store/warehouse for inspection
   */
  static async markReceived(input: {
    tenantId: string;
    id: string;
    memberId?: string;
    internalNotes?: string;
  }, db: any = globalPrisma) {
    const rma = await this.getReturnRequestById(input.tenantId, input.id, db);

    const updated = await db.returnRequest.update({
      where: { id: input.id },
      data: {
        status: 'RECEIVED_INSPECTING',
        internalNotes: input.internalNotes || rma.internalNotes
      },
      include: { items: true, customer: true }
    });

    return updated;
  }

  /**
   * Finalize and execute financial refund for received RMA goods
   */
  static async executeRmaRefund(input: {
    tenantId: string;
    id: string;
    refundMethod: 'CASH' | 'CARD' | 'STORE_CREDIT' | 'ORIGINAL_TENDER';
    restock: boolean;
    memberId?: string;
    notes?: string;
  }, db: any = globalPrisma) {
    const rma = await this.getReturnRequestById(input.tenantId, input.id, db);

    if (rma.status === 'ACCEPTED_REFUNDED') {
      throw new Error('RMA has already been refunded');
    }

    // Calculate approximate refund amount from items
    let refundResult: any;

    if (rma.posOrderId) {
      // Find original order items
      const order = await db.posOrder.findUnique({
        where: { id: rma.posOrderId },
        include: { items: true }
      });

      if (order && order.items.length > 0) {
        const refundItems = rma.items.map(ri => {
          const matched = order.items.find((oi: any) => oi.catalogItemId === ri.catalogItemId) || order.items[0];
          return {
            catalogItemId: ri.catalogItemId,
            variantId: ri.variantId,
            title: ri.description,
            quantity: ri.quantity,
            unitPrice: Number(matched?.price || 10),
            unitCost: Number(matched?.costPrice || 0),
            taxRate: 0.10,
            isRestocked: input.restock
          };
        });

        refundResult = await RefundService.processPosRefund({
          tenantId: input.tenantId,
          orderId: rma.posOrderId,
          items: refundItems,
          refundMethod: input.refundMethod as any,
          reason: rma.reason,
          reasonNotes: `[RMA ${rma.rmaNumber}] ${input.notes || ''}`.trim(),
          processedByUserId: input.memberId
        }, db);
      }
    }

    // If no posOrderId or pos refund wasn't run, execute as approved return
    if (!refundResult) {
      const estimatedTotal = rma.items.reduce((s: number, it: any) => s + (it.quantity * 25), 0) || 50;
      refundResult = await RefundService.processBlindRefund({
        tenantId: input.tenantId,
        amount: estimatedTotal,
        refundMethod: input.refundMethod as any,
        reason: rma.reason,
        reasonNotes: `[RMA ${rma.rmaNumber}] ${input.notes || ''}`.trim(),
        customerPartyId: rma.customerPartyId,
        processedByUserId: input.memberId,
        managerApproval: true,
        items: rma.items.map(ri => ({
          catalogItemId: ri.catalogItemId,
          variantId: ri.variantId,
          title: ri.description,
          quantity: ri.quantity,
          unitPrice: 25,
          isRestocked: input.restock
        }))
      }, db);
    }

    // Link refund to RMA and mark completed
    const updated = await db.returnRequest.update({
      where: { id: input.id },
      data: {
        status: 'ACCEPTED_REFUNDED',
        refundId: refundResult.id,
        internalNotes: input.notes || rma.internalNotes
      },
      include: {
        items: true,
        refund: true,
        customer: true
      }
    });

    return updated;
  }
}
