import React from 'react';
import { Printer, X, RotateCcw, CheckCircle2 } from 'lucide-react';
import { Button } from '../../UI/Primitives';

export interface PosReturnSlipData {
  id: string;
  refundNumber: string;
  orderNumber?: string;
  createdAt: string | Date;
  amount: number;
  taxAmount: number;
  refundMethod: string;
  reason: string;
  reasonNotes?: string | null;
  restocked?: boolean;
  cashierName?: string;
  managerApproval?: boolean;
  storeName?: string;
  storeAbn?: string;
  storeAddress?: string;
  items?: Array<{
    id?: string;
    title: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    isRestocked?: boolean;
    catalogItemId?: string | null;
  }>;
}

interface PosReturnSlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  refund: PosReturnSlipData | null;
}

import { AuroraModal } from '../../UI/AuroraModal';

export const PosReturnSlipModal: React.FC<PosReturnSlipModalProps> = ({
  isOpen,
  onClose,
  refund
}) => {
  if (!isOpen || !refund) return null;

  const handlePrint = () => {
    window.print();
  };

  const refundDate = new Date(refund.createdAt || Date.now());
  const netAmount = Math.max(0, Number(refund.amount) - Number(refund.taxAmount || 0));

  return (
    <AuroraModal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[95vh] flex flex-col text-zinc-900 dark:text-zinc-100"
    >
          {/* Modal Header */}
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3 shrink-0">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400">
                <RotateCcw size={16} />
              </div>
              <div>
                <h3 className="text-zinc-900 dark:text-white font-bold text-sm">Customer Return Slip</h3>
                <p className="text-[11px] font-mono text-zinc-400">80mm Thermal Receipt Layout</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white p-1 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Printable 80mm Slip Container */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 bg-zinc-100 dark:bg-zinc-950/60 rounded-xl border border-zinc-200 dark:border-zinc-800/80">
            <div 
              id="thermal-return-slip"
              className="bg-white text-black font-mono text-xs p-5 rounded-lg shadow-inner max-w-[340px] mx-auto select-text leading-tight print:p-0 print:shadow-none print:max-w-full"
              style={{
                fontFamily: '"Courier New", Courier, monospace',
                fontSize: '11px',
                lineHeight: '1.25'
              }}
            >
              {/* Slip Header */}
              <div className="text-center pb-2 border-b border-dashed border-zinc-400 space-y-0.5">
                <p className="font-black text-sm uppercase tracking-wider">{refund.storeName || 'AURORA RETAIL & COMMERCE'}</p>
                <p className="text-[10px]">ABN: {refund.storeAbn || '72 918 274 019'}</p>
                <p className="text-[10px]">{refund.storeAddress || 'Main Flagship Store, Terminal 01'}</p>
                <div className="pt-1">
                  <span className="font-bold border border-black px-2 py-0.5 text-[10px] uppercase">
                    *** RETURN VOUCHER / SLIP ***
                  </span>
                </div>
              </div>

              {/* Meta Details */}
              <div className="py-2 border-b border-dashed border-zinc-400 space-y-1 text-[10px]">
                <div className="flex justify-between">
                  <span>RETURN REF:</span>
                  <span className="font-bold">{refund.refundNumber}</span>
                </div>
                {refund.orderNumber && (
                  <div className="flex justify-between">
                    <span>ORIGINAL SALE:</span>
                    <span className="font-semibold">{refund.orderNumber}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>DATE & TIME:</span>
                  <span>{refundDate.toLocaleDateString()} {refundDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="flex justify-between">
                  <span>OPERATOR:</span>
                  <span>{refund.cashierName || 'Cashier #1'}</span>
                </div>
                {refund.managerApproval && (
                  <div className="flex justify-between font-bold">
                    <span>AUTH OVERRIDE:</span>
                    <span>MANAGER PIN VERIFIED</span>
                  </div>
                )}
              </div>

              {/* Itemized Table */}
              <div className="py-2 border-b border-dashed border-zinc-400">
                <div className="flex justify-between font-bold text-[10px] pb-1 border-b border-zinc-300">
                  <span className="w-1/2">ITEM / DESCRIPTION</span>
                  <span className="w-1/4 text-center">QTY</span>
                  <span className="w-1/4 text-right">REFUND</span>
                </div>
                <div className="pt-1.5 space-y-1.5 text-[10px]">
                  {refund.items && refund.items.length > 0 ? (
                    refund.items.map((it, idx) => (
                      <div key={idx} className="space-y-0.5">
                        <div className="flex justify-between">
                          <span className="w-1/2 truncate font-semibold">{it.title}</span>
                          <span className="w-1/4 text-center">x{it.quantity}</span>
                          <span className="w-1/4 text-right font-bold">${Number(it.lineTotal || (it.quantity * it.unitPrice)).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-[9px] text-zinc-600 pl-1">
                          <span>@{Number(it.unitPrice).toFixed(2)} ea</span>
                          <span className="uppercase">{it.isRestocked ? '[RESTOCKED]' : '[SCRAP/DAMAGED]'}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex justify-between">
                      <span className="w-3/4">Ad-Hoc Return Adjustment</span>
                      <span className="w-1/4 text-right font-bold">${Number(refund.amount).toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Totals Breakdown */}
              <div className="py-2 border-b border-dashed border-zinc-400 space-y-1 text-[11px]">
                <div className="flex justify-between text-[10px]">
                  <span>SUBTOTAL (EX-GST):</span>
                  <span>${netAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span>GST RECOVERED (10%):</span>
                  <span>${Number(refund.taxAmount || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-black text-sm pt-1 border-t border-zinc-300">
                  <span>TOTAL REFUND:</span>
                  <span>${Number(refund.amount).toFixed(2)}</span>
                </div>
              </div>

              {/* Tender Reversal */}
              <div className="py-2 border-b border-dashed border-zinc-400 space-y-1 text-[10px]">
                <div className="flex justify-between font-bold">
                  <span>TENDER RETURNED:</span>
                  <span className="uppercase">{refund.refundMethod || 'ORIGINAL_TENDER'}</span>
                </div>
                <div className="flex justify-between text-[9px] text-zinc-600">
                  <span>REASON CODE:</span>
                  <span className="uppercase">{refund.reason?.replace(/_/g, ' ') || 'CUSTOMER RETURN'}</span>
                </div>
                {refund.reasonNotes && (
                  <p className="text-[9px] text-zinc-500 italic mt-0.5">Note: {refund.reasonNotes}</p>
                )}
              </div>

              {/* Barcode & Verification */}
              <div className="pt-3 text-center space-y-2">
                <div className="font-mono text-[9px] tracking-widest bg-zinc-100 p-1 rounded border border-zinc-300 font-bold">
                  ||||| | |||| |||| ||| ||||| || ||||
                </div>
                <p className="text-[9px] tracking-widest font-bold">*{refund.refundNumber}*</p>
                <p className="text-[8px] text-zinc-600 pt-1 leading-normal">
                  Retain this slip for your records.<br />
                  Customer care: support@auroraretail.internal
                </p>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-2 flex items-center justify-between border-t border-zinc-200 dark:border-zinc-800 shrink-0">
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-emerald-500 dark:text-emerald-400" />
              <span>Ready to print (80mm POS Slip)</span>
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={onClose}
                className="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-white text-xs px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700"
              >
                Close
              </Button>
              <Button
                type="button"
                onClick={handlePrint}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-4 py-2 rounded-xl font-bold cursor-pointer shadow-md shadow-indigo-600/20 flex items-center gap-1.5"
              >
                <Printer size={13} />
                <span>Print Slip</span>
              </Button>
            </div>
          </div>
    </AuroraModal>
  );
};
