import React, { useState, useEffect, useMemo } from 'react';
import { 
  RotateCcw, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Package, 
  DollarSign, 
  CreditCard, 
  Banknote, 
  Receipt,
  Plus,
  Minus,
  AlertTriangle
} from 'lucide-react';
import { TransactionClientService } from '../../../services/transactionService';
import { toast } from 'sonner';
import { cn } from '../../../lib/utils';
import { AuroraModal } from '../../UI/AuroraModal';

interface PosRefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: any;
  onRefundSuccess: (refund: any) => void;
  tenantId: string;
}

export const PosRefundModal: React.FC<PosRefundModalProps> = ({
  isOpen,
  onClose,
  order,
  onRefundSuccess,
  tenantId
}) => {
  if (!isOpen || !order) return null;

  // Selected items state: map of orderItemId -> { selected: boolean, quantity: number, isRestocked: boolean }
  const [selectedItems, setSelectedItems] = useState<Record<string, { selected: boolean; quantity: number; isRestocked: boolean }>>(() => {
    const initial: Record<string, { selected: boolean; quantity: number; isRestocked: boolean }> = {};
    (order.items || []).forEach((item: any) => {
      initial[item.id] = {
        selected: true,
        quantity: Number(item.quantity) || 1,
        isRestocked: true
      };
    });
    return initial;
  });

  const [reason, setReason] = useState<string>('CUSTOMER_RETURN');
  const [reasonNotes, setReasonNotes] = useState<string>('');
  const [refundMethod, setRefundMethod] = useState<'ORIGINAL_TENDER' | 'CASH' | 'CARD' | 'VOUCHER' | 'STORE_CREDIT'>('ORIGINAL_TENDER');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Automatic smart restocking policy:
  // If reason is DEFECTIVE_GOODS, automatically set restocking to FALSE
  useEffect(() => {
    if (reason === 'DEFECTIVE_GOODS') {
      setSelectedItems(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(k => {
          next[k] = { ...next[k], isRestocked: false };
        });
        return next;
      });
    } else {
      setSelectedItems(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(k => {
          next[k] = { ...next[k], isRestocked: true };
        });
        return next;
      });
    }
  }, [reason]);

  // Calculations
  const refundTotals = useMemo(() => {
    let gross = 0;
    let tax = 0;
    let itemCount = 0;

    (order.items || []).forEach((item: any) => {
      const state = selectedItems[item.id];
      if (state && state.selected && state.quantity > 0) {
        const lineGross = Math.round(state.quantity * Number(item.unitPrice) * 100) / 100;
        const lineTax = Math.round((lineGross - (lineGross / 1.10)) * 100) / 100;
        gross += lineGross;
        tax += lineTax;
        itemCount += state.quantity;
      }
    });

    return {
      gross: Math.round(gross * 100) / 100,
      tax: Math.round(tax * 100) / 100,
      netRevenue: Math.round((gross - tax) * 100) / 100,
      itemCount
    };
  }, [order, selectedItems]);

  const handleToggleItem = (itemId: string) => {
    setSelectedItems(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        selected: !prev[itemId]?.selected
      }
    }));
  };

  const handleQuantityChange = (itemId: string, maxQty: number, delta: number) => {
    setSelectedItems(prev => {
      const current = prev[itemId]?.quantity || 1;
      const next = Math.max(1, Math.min(maxQty, current + delta));
      return {
        ...prev,
        [itemId]: {
          ...prev[itemId],
          quantity: next
        }
      };
    });
  };

  const handleToggleRestock = (itemId: string) => {
    setSelectedItems(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        isRestocked: !prev[itemId]?.isRestocked
      }
    }));
  };

  const handleSubmitRefund = async () => {
    if (refundTotals.gross <= 0) {
      toast.error('Please select at least one item to refund');
      return;
    }

    const refundItemsPayload: any[] = [];
    (order.items || []).forEach((item: any) => {
      const state = selectedItems[item.id];
      if (state && state.selected && state.quantity > 0) {
        refundItemsPayload.push({
          catalogItemId: item.catalogItemId || null,
          variantId: item.variantId || null,
          title: item.title,
          quantity: state.quantity,
          unitPrice: Number(item.unitPrice),
          unitCost: Number(item.unitCost || 0),
          taxRate: 0.10,
          isRestocked: state.isRestocked
        });
      }
    });

    try {
      setIsSubmitting(true);
      const refund = await TransactionClientService.processPosRefund({
        orderId: order.id,
        items: refundItemsPayload,
        refundMethod,
        reason,
        reasonNotes
      }, tenantId);

      toast.success(`Refund #${refund.refundNumber} of $${refundTotals.gross.toFixed(2)} processed!`);
      onRefundSuccess(refund);
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to process refund');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuroraModal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] text-zinc-900 dark:text-zinc-100"
    >
      {/* Header */}
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0 bg-zinc-50 dark:bg-zinc-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
              <RotateCcw size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">Return & Refund Order</h3>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                  #{order.orderNumber}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Select items to return, verify restock condition, and choose payout tender.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
          {/* Item Selector Table */}
          <div>
            <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2 flex justify-between items-center">
              <span>Items to Return</span>
              <span className="text-zinc-500 font-normal">Original Total: ${Number(order.total).toFixed(2)}</span>
            </div>

            <div className="bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden divide-y divide-zinc-200 dark:divide-zinc-800/80">
              {(order.items || []).map((item: any) => {
                const state = selectedItems[item.id] || { selected: false, quantity: 1, isRestocked: true };
                const maxQty = Number(item.quantity) || 1;

                return (
                  <div 
                    key={item.id}
                    className={cn(
                      "p-3.5 flex items-center justify-between gap-3 transition-colors",
                      state.selected ? "bg-indigo-50/50 dark:bg-zinc-900/40" : "opacity-60"
                    )}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={state.selected}
                        onChange={() => handleToggleItem(item.id)}
                        className="rounded border-zinc-300 dark:border-zinc-700 text-rose-500 focus:ring-rose-500 w-4 h-4 cursor-pointer"
                      />
                      <div className="min-w-0">
                        <div className="font-semibold text-zinc-900 dark:text-white truncate text-xs">{item.title}</div>
                        <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">
                          ${Number(item.unitPrice).toFixed(2)} each • Purchased: {maxQty}
                        </div>
                      </div>
                    </div>

                    {/* Quantity Stepper */}
                    {state.selected && (
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl overflow-hidden shadow-2xs">
                          <button
                            type="button"
                            disabled={state.quantity <= 1}
                            onClick={() => handleQuantityChange(item.id, maxQty, -1)}
                            className="p-1.5 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white disabled:opacity-30 cursor-pointer"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="px-2 font-mono font-bold text-zinc-900 dark:text-white text-xs">{state.quantity}</span>
                          <button
                            type="button"
                            disabled={state.quantity >= maxQty}
                            onClick={() => handleQuantityChange(item.id, maxQty, 1)}
                            className="p-1.5 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white disabled:opacity-30 cursor-pointer"
                          >
                            <Plus size={12} />
                          </button>
                        </div>

                        {/* Restock Pill Toggle */}
                        <button
                          type="button"
                          onClick={() => handleToggleRestock(item.id)}
                          className={cn(
                            "px-2 py-1 rounded-lg text-[10px] font-semibold border transition-all cursor-pointer",
                            state.isRestocked
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                          )}
                          title={state.isRestocked ? "Will return item to active inventory stock" : "Damaged/Defective: Item written off to shrinkage"}
                        >
                          {state.isRestocked ? "Restock: Yes" : "Restock: No (Write-Off)"}
                        </button>

                        {/* Line Refund Total */}
                        <div className="w-16 text-right font-mono font-bold text-zinc-900 dark:text-white text-xs">
                          ${(state.quantity * Number(item.unitPrice)).toFixed(2)}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Refund Details Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-zinc-700 dark:text-zinc-300 font-semibold block mb-1.5">Reason for Return</label>
              <select
                value={reason}
                onChange={e => setReason(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-zinc-900 dark:text-white focus:outline-none focus:border-rose-500"
              >
                <option value="CUSTOMER_RETURN">Customer Return / Changed Mind</option>
                <option value="DEFECTIVE_GOODS">Defective / Damaged (Auto-Write-Off)</option>
                <option value="DUPLICATE_CHARGE">Duplicate Scan / Overcharge</option>
                <option value="INCORRECT_PRICING">Incorrect Pricing</option>
                <option value="ORDER_CANCELLED">Order Cancelled</option>
                <option value="GOODWILL">Goodwill Compensation</option>
                <option value="OTHER">Other Reason</option>
              </select>
              {reason === 'DEFECTIVE_GOODS' && (
                <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1 font-medium">
                  <AlertTriangle size={11} />
                  Items marked defective will not be restocked into saleable inventory.
                </p>
              )}
            </div>

            <div>
              <label className="text-zinc-700 dark:text-zinc-300 font-semibold block mb-1.5">Refund Tender Method</label>
              <select
                value={refundMethod}
                onChange={e => setRefundMethod(e.target.value as any)}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-zinc-900 dark:text-white focus:outline-none focus:border-rose-500"
              >
                <option value="ORIGINAL_TENDER">Original Tender ({order.payments?.[0]?.tenderType || 'CASH'})</option>
                <option value="CASH">Cash Out (Till Drawer)</option>
                <option value="CARD">Card Reversal (Terminal)</option>
                <option value="STORE_CREDIT">Store Credit / Digital Voucher</option>
              </select>
            </div>

            <div className="col-span-full">
              <label className="text-zinc-700 dark:text-zinc-300 font-semibold block mb-1.5">Return Notes (Optional)</label>
              <input
                type="text"
                value={reasonNotes}
                onChange={e => setReasonNotes(e.target.value)}
                placeholder="Reason details or customer feedback..."
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-zinc-900 dark:text-white focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          {/* Real-time Financial Breakdown Card */}
          <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-2">
            <div className="flex justify-between items-center text-zinc-600 dark:text-zinc-400">
              <span>Gross Return Amount:</span>
              <span className="font-mono font-bold text-zinc-900 dark:text-white text-sm">
                ${refundTotals.gross.toFixed(2)} AUD
              </span>
            </div>
            <div className="flex justify-between items-center text-zinc-600 dark:text-zinc-400 text-[11px]">
              <span>Reclaimed GST (10% inc.):</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-medium">-${refundTotals.tax.toFixed(2)}</span>
            </div>
            <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 flex justify-between items-center text-xs font-bold text-zinc-900 dark:text-white">
              <span>Total Payout / Credit:</span>
              <span className="font-mono text-rose-600 dark:text-rose-400 text-base">
                ${refundTotals.gross.toFixed(2)} AUD
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/90 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
            {refundTotals.itemCount} {refundTotals.itemCount === 1 ? 'item' : 'items'} selected for return
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSubmitting || refundTotals.gross <= 0}
              onClick={handleSubmitRefund}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
            >
              {isSubmitting && <RefreshCw size={12} className="animate-spin" />}
              <span>Process Return (${refundTotals.gross.toFixed(2)})</span>
            </button>
          </div>
        </div>
    </AuroraModal>
  );
};
