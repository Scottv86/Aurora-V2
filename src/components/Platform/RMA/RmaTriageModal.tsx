import React, { useState } from 'react';
import { RotateCcw, X, CheckCircle2, AlertCircle, Package, ArrowRight, ShieldCheck, Check, Ban, DollarSign } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../../UI/Primitives';
import { AuroraModal } from '../../UI/AuroraModal';
import { RmaClientService, ReturnRequest } from '../../../services/rmaService';
import { toast } from 'sonner';

interface RmaTriageModalProps {
  isOpen: boolean;
  onClose: () => void;
  rma: ReturnRequest | null;
  tenantId: string;
  onUpdated: () => void;
}

export const RmaTriageModal: React.FC<RmaTriageModalProps> = ({
  isOpen,
  onClose,
  rma,
  tenantId,
  onUpdated
}) => {
  if (!isOpen || !rma) return null;

  const [triageAction, setTriageAction] = useState<'REVIEW' | 'REFUND'>('REVIEW');
  const [rejectionReason, setRejectionReason] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [refundMethod, setRefundMethod] = useState<'STORE_CREDIT' | 'CASH' | 'CARD' | 'ORIGINAL_TENDER'>('STORE_CREDIT');
  const [restock, setRestock] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleReview = async (decision: 'APPROVE' | 'REJECT') => {
    if (decision === 'REJECT' && !rejectionReason.trim()) {
      toast.error('Please specify a rejection reason');
      return;
    }
    try {
      setIsSubmitting(true);
      await RmaClientService.reviewRequest(rma.id, {
        action: decision,
        rejectionReason: decision === 'REJECT' ? rejectionReason.trim() : undefined,
        internalNotes: internalNotes.trim() || undefined
      }, tenantId);

      toast.success(decision === 'APPROVE' ? `RMA ${rma.rmaNumber} approved for customer return` : `RMA ${rma.rmaNumber} rejected`);
      onUpdated();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update RMA');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExecuteRefund = async () => {
    try {
      setIsSubmitting(true);
      await RmaClientService.executeRefund(rma.id, {
        refundMethod,
        restock,
        notes: internalNotes.trim() || undefined
      }, tenantId);

      toast.success(`Refund for RMA ${rma.rmaNumber} executed successfully!`);
      onUpdated();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to execute refund');
    } finally {
      setIsSubmitting(false);
    }
  };

  const customerName = rma.customer?.organization?.legalName ||
    `${rma.customer?.person?.firstName || ''} ${rma.customer?.person?.lastName || ''}`.trim() || 'Customer';

  return (
    <AuroraModal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar text-zinc-900 dark:text-zinc-100"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <ShieldCheck size={18} />
          </div>
          <div>
            <h3 className="text-zinc-900 dark:text-white font-bold text-base">RMA Triage: {rma.rmaNumber}</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Customer: {customerName}</p>
          </div>
        </div>
        <button onClick={onClose} className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer">
          <X size={16} />
        </button>
      </div>

          {/* Details Overview */}
          <div className="p-3.5 bg-zinc-950/60 rounded-2xl border border-zinc-800 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-zinc-400">Current Status:</span>
              <span className="font-bold text-white uppercase font-mono">{rma.status.replace(/_/g, ' ')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Reason:</span>
              <span className="font-semibold text-zinc-200 uppercase">{rma.reason.replace(/_/g, ' ')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Requested Tender:</span>
              <span className="font-semibold text-zinc-200">{rma.requestedMethod}</span>
            </div>
            {rma.customerComments && (
              <div className="pt-1 border-t border-zinc-900">
                <span className="text-zinc-400 block mb-0.5 font-semibold">Customer Comments:</span>
                <p className="text-zinc-300 italic bg-zinc-900/60 p-2 rounded-lg">"{rma.customerComments}"</p>
              </div>
            )}
          </div>

          {/* Items */}
          <div className="space-y-1.5 text-xs">
            <span className="text-zinc-400 font-semibold block">Requested Items:</span>
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {rma.items.map((it, idx) => (
                <div key={idx} className="p-2 bg-zinc-850 rounded-xl border border-zinc-800 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-white block">{it.description}</span>
                    <span className="text-[10px] text-zinc-400">Condition: {it.condition || 'Opened'}</span>
                  </div>
                  <span className="font-mono font-bold text-indigo-400">Qty: {it.quantity}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Triage Decision Flow */}
          {rma.status === 'PENDING_REVIEW' && (
            <div className="space-y-3 pt-2 border-t border-zinc-800 text-xs">
              <div>
                <label className="text-zinc-300 font-semibold block mb-1">Rejection Reason (If rejecting)</label>
                <input
                  type="text"
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  placeholder="e.g. Return window expired, item not eligible"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="text-zinc-300 font-semibold block mb-1">Internal Notes</label>
                <textarea
                  rows={2}
                  value={internalNotes}
                  onChange={e => setInternalNotes(e.target.value)}
                  placeholder="Instructions for receiving staff..."
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  disabled={isSubmitting}
                  onClick={() => handleReview('REJECT')}
                  className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Ban size={14} />
                  <span>Reject Return</span>
                </Button>
                <Button
                  disabled={isSubmitting}
                  onClick={() => handleReview('APPROVE')}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-5 py-2 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-600/20"
                >
                  <Check size={14} />
                  <span>Approve & Authorize RMA</span>
                </Button>
              </div>
            </div>
          )}

          {/* Finalize Refund Step for Approved/Received RMAs */}
          {(rma.status === 'APPROVED_PENDING_RECEIPT' || rma.status === 'RECEIVED_INSPECTING') && (
            <div className="space-y-3 pt-2 border-t border-zinc-800 text-xs">
              <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-300 text-[11px] flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                <span>Return authorized. Goods can now be inspected and settled.</span>
              </div>

              <div>
                <label className="text-zinc-300 font-semibold block mb-1">Refund Settlement Tender *</label>
                <select
                  value={refundMethod}
                  onChange={e => setRefundMethod(e.target.value as any)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="STORE_CREDIT">Store Credit Voucher (Instant, No Expiry)</option>
                  <option value="CASH">Cash Drawer Out</option>
                  <option value="CARD">Card Reversal</option>
                  <option value="ORIGINAL_TENDER">Original Tender</option>
                </select>
              </div>

              <label className="flex items-center gap-2 cursor-pointer p-2 bg-zinc-950/60 rounded-xl border border-zinc-800">
                <input
                  type="checkbox"
                  checked={restock}
                  onChange={e => setRestock(e.target.checked)}
                  className="rounded border-zinc-700 bg-zinc-800 text-indigo-600 focus:ring-0"
                />
                <span className="text-zinc-300 font-semibold">Restock items back into inventory</span>
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  onClick={onClose}
                  className="bg-zinc-800 text-zinc-300 hover:text-white text-xs px-3 py-2 rounded-xl"
                >
                  Close
                </Button>
                <Button
                  disabled={isSubmitting}
                  onClick={handleExecuteRefund}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-5 py-2 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/20"
                >
                  <DollarSign size={14} />
                  <span>{isSubmitting ? 'Processing...' : 'Authorize Refund & Close RMA'}</span>
                </Button>
              </div>
            </div>
          )}

          {/* Already Refunded State */}
          {rma.status === 'ACCEPTED_REFUNDED' && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center text-xs text-emerald-600 dark:text-emerald-400 font-bold">
              ✓ This RMA was completed and refunded.
            </div>
          )}
    </AuroraModal>
  );
};
