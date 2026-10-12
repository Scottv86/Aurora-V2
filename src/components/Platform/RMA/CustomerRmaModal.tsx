import React, { useState } from 'react';
import { RotateCcw, X, CheckCircle2, AlertCircle, Package, ArrowRight, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../../UI/Primitives';
import { AuroraModal } from '../../UI/AuroraModal';
import { RmaClientService } from '../../../services/rmaService';
import { toast } from 'sonner';

interface CustomerRmaModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerPartyId: string;
  customerName?: string;
  order?: {
    id: string;
    orderNumber: string;
    items: Array<{ id: string; name?: string; title?: string; quantity: number; price?: number; unitPrice?: number }>;
  } | null;
  tenantId: string;
  onSuccess?: (rma: any) => void;
}

export const CustomerRmaModal: React.FC<CustomerRmaModalProps> = ({
  isOpen,
  onClose,
  customerPartyId,
  customerName,
  order,
  tenantId,
  onSuccess
}) => {
  if (!isOpen) return null;

  const [reason, setReason] = useState<string>('CUSTOMER_RETURN');
  const [requestedMethod, setRequestedMethod] = useState<string>('STORE_CREDIT');
  const [comments, setComments] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdRma, setCreatedRma] = useState<any | null>(null);

  // Items selection state
  const [itemSelections, setItemSelections] = useState<Record<string, { selected: boolean; qty: number; condition: string }>>(() => {
    const init: Record<string, any> = {};
    if (order?.items) {
      order.items.forEach(it => {
        init[it.id] = { selected: true, qty: Number(it.quantity) || 1, condition: 'OPENED_LIKE_NEW' };
      });
    }
    return init;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerPartyId) {
      toast.error('Customer profile reference is required');
      return;
    }

    const selectedList = Object.entries(itemSelections)
      .filter(([_, v]) => v.selected)
      .map(([k, v]) => {
        const itemObj = order?.items?.find(it => it.id === k);
        return {
          catalogItemId: k,
          description: itemObj?.name || itemObj?.title || 'Returned Item',
          quantity: v.qty,
          condition: v.condition,
          requestedAction: requestedMethod === 'STORE_CREDIT' ? 'STORE_CREDIT' : 'REFUND'
        };
      });

    const itemsToSubmit = selectedList.length > 0 ? selectedList : [
      {
        description: comments.trim() ? comments.substring(0, 40) : 'General Item Return',
        quantity: 1,
        condition: 'OPENED_LIKE_NEW',
        requestedAction: requestedMethod === 'STORE_CREDIT' ? 'STORE_CREDIT' : 'REFUND'
      }
    ];

    try {
      setIsSubmitting(true);
      const rma = await RmaClientService.createRequest({
        customerPartyId,
        posOrderId: order?.id || null,
        requestedMethod,
        reason,
        customerComments: comments.trim() || null,
        items: itemsToSubmit
      }, tenantId);

      setCreatedRma(rma);
      toast.success(`Return Request ${rma.rmaNumber} submitted successfully!`);
      if (onSuccess) onSuccess(rma);
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit return request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuroraModal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar text-zinc-900 dark:text-zinc-100"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
            <RotateCcw size={18} />
          </div>
          <div>
            <h3 className="text-zinc-900 dark:text-white font-bold text-base">Request Return (RMA)</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {order ? `Order #${order.orderNumber}` : customerName || 'Self-Service Return Portal'}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer">
          <X size={16} />
        </button>
      </div>

          {/* Success State */}
          {createdRma ? (
            <div className="py-6 text-center space-y-4">
              <div className="w-14 h-14 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto">
                <CheckCircle2 size={32} />
              </div>
              <div>
                <h4 className="text-lg font-bold text-white">Return Request Authorized</h4>
                <div className="inline-block mt-2 px-3 py-1 bg-zinc-800 border border-zinc-700 rounded-lg text-emerald-400 font-mono font-bold text-sm">
                  {createdRma.rmaNumber}
                </div>
              </div>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
                Your request has been received by our store team. Please retain this authorization reference. Once inspected, your refund will be automatically settled.
              </p>
              <div className="pt-2">
                <Button
                  onClick={onClose}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-6 py-2.5 rounded-xl cursor-pointer"
                >
                  Done
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Items Selection if order exists */}
              {order?.items && order.items.length > 0 && (
                <div className="space-y-2">
                  <label className="text-zinc-300 font-semibold block">Select Items to Return</label>
                  <div className="space-y-2 max-h-48 overflow-y-auto p-2 bg-zinc-950/60 rounded-xl border border-zinc-800">
                    {order.items.map(it => {
                      const sel = itemSelections[it.id] || { selected: false, qty: 1, condition: 'OPENED_LIKE_NEW' };
                      return (
                        <div key={it.id} className="p-2 bg-zinc-900 rounded-lg border border-zinc-800/80 flex items-center justify-between gap-3">
                          <label className="flex items-center gap-2 cursor-pointer flex-1">
                            <input
                              type="checkbox"
                              checked={sel.selected}
                              onChange={e => setItemSelections({
                                ...itemSelections,
                                [it.id]: { ...sel, selected: e.target.checked }
                              })}
                              className="rounded border-zinc-700 bg-zinc-800 text-indigo-600 focus:ring-0"
                            />
                            <div className="truncate">
                              <span className="font-semibold text-white block truncate">{it.name || it.title}</span>
                              <span className="text-[10px] text-zinc-500 font-mono">Qty available: {it.quantity}</span>
                            </div>
                          </label>

                          {sel.selected && (
                            <select
                              value={sel.condition}
                              onChange={e => setItemSelections({
                                ...itemSelections,
                                [it.id]: { ...sel, condition: e.target.value }
                              })}
                              className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-[10px] text-zinc-300 focus:outline-none"
                            >
                              <option value="UNOPENED">Unopened / New</option>
                              <option value="OPENED_LIKE_NEW">Opened (Like New)</option>
                              <option value="DAMAGED_DEFECTIVE">Damaged / Defective</option>
                            </select>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Reason */}
              <div>
                <label className="text-zinc-300 font-semibold block mb-1">Reason for Return *</label>
                <select
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="CUSTOMER_RETURN">Change of Mind / Unwanted</option>
                  <option value="DEFECTIVE_GOODS">Faulty / Defective or Damaged</option>
                  <option value="INCORRECT_PRICING">Wrong Item Received</option>
                  <option value="ORDER_CANCELLED">Order Cancelled</option>
                  <option value="OTHER">Other Reason</option>
                </select>
              </div>

              {/* Preferred Refund Tender */}
              <div>
                <label className="text-zinc-300 font-semibold block mb-1">Preferred Settlement Method *</label>
                <select
                  value={requestedMethod}
                  onChange={e => setRequestedMethod(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="STORE_CREDIT">Store Credit Voucher (Instant, No Expiry)</option>
                  <option value="ORIGINAL_TENDER">Original Payment Method (Card / Bank Transfer)</option>
                </select>
              </div>

              {/* Customer Comments */}
              <div>
                <label className="text-zinc-300 font-semibold block mb-1">Comments & Details</label>
                <textarea
                  rows={2}
                  value={comments}
                  onChange={e => setComments(e.target.value)}
                  placeholder="Describe the issue or reason for returning this item..."
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              {/* Submit Footer */}
              <div className="pt-2 flex justify-end gap-2 border-t border-zinc-800">
                <Button
                  type="button"
                  onClick={onClose}
                  className="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white text-xs px-3 py-2 rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-5 py-2 rounded-xl font-bold cursor-pointer shadow-md shadow-indigo-600/20"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Return Request'}
                </Button>
              </div>
            </form>
          )}
    </AuroraModal>
  );
};
