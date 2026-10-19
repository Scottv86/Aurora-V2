import React from 'react';
import { Printer, X, FileText, CheckCircle2 } from 'lucide-react';
import { Button } from '../../UI/Primitives';

export interface CreditNoteData {
  id: string;
  refundNumber: string;
  invoiceNumber: string;
  invoiceDate?: string | Date;
  createdAt: string | Date;
  amount: number;
  taxAmount: number;
  refundMethod: string;
  reason: string;
  reasonNotes?: string | null;
  customerName?: string;
  customerAddress?: string;
  customerAbn?: string;
  businessName?: string;
  businessTradingName?: string;
  businessAbn?: string;
  businessAddress?: string;
  businessEmail?: string;
  items?: Array<{
    description: string;
    quantity?: number;
    unitPrice?: number;
    amount: number;
    taxAmount?: number;
  }>;
}

interface CreditNoteDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  creditNote: CreditNoteData | null;
}

import { AuroraModal } from '../../UI/AuroraModal';

export const CreditNoteDocumentModal: React.FC<CreditNoteDocumentModalProps> = ({
  isOpen,
  onClose,
  creditNote
}) => {
  if (!isOpen || !creditNote) return null;

  const handlePrint = () => {
    window.print();
  };

  const issueDate = new Date(creditNote.createdAt || Date.now());
  const grossAmount = Number(creditNote.amount || 0);
  const gstAmount = Number(creditNote.taxAmount || 0);
  const netAmount = Math.max(0, grossAmount - gstAmount);

  return (
    <AuroraModal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[95vh] flex flex-col text-zinc-900 dark:text-zinc-100"
    >
      {/* Modal Toolbar */}
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            <FileText size={16} />
          </div>
          <div>
            <h3 className="text-zinc-900 dark:text-white font-bold text-sm">Formal Tax Adjustment / Credit Note</h3>
            <p className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">Ref: {creditNote.refundNumber}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          <X size={16} />
        </button>
      </div>

      {/* Printable A4 Document Sheet */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 bg-zinc-100/70 dark:bg-zinc-950/60 rounded-xl border border-zinc-200 dark:border-zinc-800/80">
            <div
              id="formal-credit-note-document"
              className="bg-white text-zinc-900 font-sans p-8 sm:p-12 rounded-xl shadow-lg max-w-[720px] mx-auto select-text print:p-0 print:shadow-none print:max-w-full"
            >
              {/* Document Header */}
              <div className="flex justify-between items-start border-b-2 border-zinc-900 pb-6">
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-zinc-950 uppercase">
                    ADJUSTMENT NOTE
                  </h1>
                  <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold mt-0.5">
                    (Tax Invoice Credit Memo - ATO Compliant)
                  </p>
                  <div className="mt-4 space-y-0.5 text-xs text-zinc-700">
                    <p className="font-bold text-zinc-950 text-sm">
                      {creditNote.businessName || 'AURORA ENTERPRISE COMMERCE PTY LTD'}
                    </p>
                    {creditNote.businessTradingName && (
                      <p className="text-zinc-600">Trading as: {creditNote.businessTradingName}</p>
                    )}
                    <p className="font-mono">ABN: {creditNote.businessAbn || '72 918 274 019'}</p>
                    <p>{creditNote.businessAddress || 'Level 14, 100 Miller St, North Sydney NSW 2060'}</p>
                    <p className="text-zinc-500">{creditNote.businessEmail || 'accounts@auroraretail.internal'}</p>
                  </div>
                </div>

                <div className="text-right space-y-1">
                  <div className="inline-block bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg text-rose-800 font-bold font-mono text-xs">
                    CREDIT NOTE: {creditNote.refundNumber}
                  </div>
                  <div className="text-xs text-zinc-600 pt-2 space-y-1">
                    <p><span className="font-semibold text-zinc-800">Date Issued:</span> {issueDate.toLocaleDateString()}</p>
                    <p><span className="font-semibold text-zinc-800">Original Invoice:</span> #{creditNote.invoiceNumber}</p>
                    {creditNote.invoiceDate && (
                      <p><span className="font-semibold text-zinc-800">Invoice Date:</span> {new Date(creditNote.invoiceDate).toLocaleDateString()}</p>
                    )}
                    <p><span className="font-semibold text-zinc-800">Refund Method:</span> {creditNote.refundMethod}</p>
                  </div>
                </div>
              </div>

              {/* Recipient / Client Details */}
              <div className="py-6 border-b border-zinc-200 grid grid-cols-2 gap-6 text-xs">
                <div>
                  <p className="font-bold text-zinc-500 uppercase tracking-wider text-[10px] mb-1">
                    CREDITED TO (RECIPIENT):
                  </p>
                  <p className="font-black text-sm text-zinc-900">
                    {creditNote.customerName || 'Valued Customer / Organization'}
                  </p>
                  {creditNote.customerAddress && (
                    <p className="text-zinc-600 whitespace-pre-line mt-1">{creditNote.customerAddress}</p>
                  )}
                  {creditNote.customerAbn && (
                    <p className="text-zinc-600 font-mono mt-0.5">ABN: {creditNote.customerAbn}</p>
                  )}
                </div>

                <div>
                  <p className="font-bold text-zinc-500 uppercase tracking-wider text-[10px] mb-1">
                    REASON FOR ADJUSTMENT:
                  </p>
                  <p className="font-semibold text-zinc-800 uppercase">
                    {creditNote.reason.replace(/_/g, ' ')}
                  </p>
                  {creditNote.reasonNotes && (
                    <p className="text-zinc-600 mt-1 italic text-[11px] bg-zinc-50 p-2 rounded border border-zinc-100">
                      "{creditNote.reasonNotes}"
                    </p>
                  )}
                </div>
              </div>

              {/* Line Items Table */}
              <div className="py-6">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b-2 border-zinc-800 text-zinc-600 uppercase font-mono text-[10px]">
                      <th className="py-2.5 px-2">Description / Adjustment Detail</th>
                      <th className="py-2.5 px-2 text-center">Tax Rate</th>
                      <th className="py-2.5 px-2 text-right">Net Credit (Ex-GST)</th>
                      <th className="py-2.5 px-2 text-right">GST Adjustment</th>
                      <th className="py-2.5 px-2 text-right">Total Credit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {creditNote.items && creditNote.items.length > 0 ? (
                      creditNote.items.map((item, idx) => {
                        const itemNet = Math.max(0, item.amount - (item.taxAmount || 0));
                        return (
                          <tr key={idx} className="hover:bg-zinc-50">
                            <td className="py-3 px-2 font-medium text-zinc-900">{item.description}</td>
                            <td className="py-3 px-2 text-center font-mono text-zinc-600">10% GST</td>
                            <td className="py-3 px-2 text-right font-mono text-zinc-700">${itemNet.toFixed(2)}</td>
                            <td className="py-3 px-2 text-right font-mono text-zinc-700">${Number(item.taxAmount || 0).toFixed(2)}</td>
                            <td className="py-3 px-2 text-right font-mono font-bold text-rose-700">-${item.amount.toFixed(2)}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td className="py-3 px-2 font-medium text-zinc-900">
                          Credit adjustment against Tax Invoice #{creditNote.invoiceNumber}
                        </td>
                        <td className="py-3 px-2 text-center font-mono text-zinc-600">10% GST</td>
                        <td className="py-3 px-2 text-right font-mono text-zinc-700">${netAmount.toFixed(2)}</td>
                        <td className="py-3 px-2 text-right font-mono text-zinc-700">${gstAmount.toFixed(2)}</td>
                        <td className="py-3 px-2 text-right font-mono font-bold text-rose-700">-${grossAmount.toFixed(2)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Totals Summary */}
              <div className="pt-4 border-t-2 border-zinc-900 flex justify-end">
                <div className="w-72 space-y-1.5 text-xs">
                  <div className="flex justify-between text-zinc-600">
                    <span>Adjustment Ex-GST:</span>
                    <span className="font-mono">${netAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-zinc-600">
                    <span>GST (10%) Reversal:</span>
                    <span className="font-mono">${gstAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-black text-zinc-950 pt-2 border-t border-zinc-300">
                    <span>TOTAL CREDIT ADJUSTMENT:</span>
                    <span className="font-mono text-rose-600">-${grossAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Settlement Notice */}
              <div className="mt-8 p-4 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-600 space-y-1">
                <p className="font-bold text-zinc-800">Settlement Breakdown:</p>
                <p>
                  {creditNote.refundMethod === 'STORE_CREDIT'
                    ? '• This adjustment has been credited to your customer store account balance and can be applied toward future invoices.'
                    : `• This adjustment has been settled via ${creditNote.refundMethod} and returned to the designated bank account / card.`}
                </p>
                <p className="text-[10px] text-zinc-500 pt-1">
                  This document serves as an authorized Adjustment Note under A New Tax System (Goods and Services Tax) Act 1999. Please retain this notice for your Business Activity Statement (BAS) records.
                </p>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-2 flex items-center justify-between border-t border-zinc-200 dark:border-zinc-800 shrink-0">
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-emerald-500 dark:text-emerald-400" />
              <span>ATO compliant A4 Adjustment Note</span>
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
                <span>Print / Save PDF</span>
              </Button>
            </div>
          </div>
    </AuroraModal>
  );
};
