import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  X, 
  CheckCircle2, 
  Calendar, 
  DollarSign, 
  Building2, 
  Send, 
  Loader2,
  ArrowRight
} from 'lucide-react';
import { AuroraModal } from '../../UI/AuroraModal';
import { API_BASE_URL } from '../../../config';
import { usePlatform } from '../../../hooks/usePlatform';
import { useAuth } from '../../../hooks/useAuth';
import { toast } from 'sonner';

interface WipEntry {
  id: string;
  date: string;
  hours: number;
  description: string;
  partyId: string;
  clientName: string;
  catalogItemId?: string;
  catalogItemName?: string;
  effectiveRate: number;
  accruedAmount: number;
}

interface GenerateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPartyId?: string;
  matterRecordId?: string;
  onInvoiceCreated?: () => void;
}

export const GenerateInvoiceModal: React.FC<GenerateInvoiceModalProps> = ({
  isOpen,
  onClose,
  selectedPartyId,
  matterRecordId,
  onInvoiceCreated
}) => {
  const { tenant } = usePlatform();
  const { session } = useAuth();
  const [wipEntries, setWipEntries] = useState<WipEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEntryIds, setSelectedEntryIds] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [notes, setNotes] = useState('Professional services rendered as per timesheet activity');
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });

  const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
  const tenantId = tenant?.id;

  // Fetch unbilled WIP entries for this client
  useEffect(() => {
    if (!isOpen || !tenantId) return;
    setLoading(true);

    const query = new URLSearchParams();
    if (selectedPartyId) query.set('customerPartyId', selectedPartyId);
    if (matterRecordId) query.set('matterRecordId', matterRecordId);

    fetch(`${API_BASE_URL}/api/invoices/wip/unbilled?${query.toString()}`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'x-tenant-id': tenantId
      }
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch unbilled time');
        return res.json();
      })
      .then((data: WipEntry[]) => {
        setWipEntries(data || []);
        // Select all by default
        setSelectedEntryIds((data || []).map((e) => e.id));
      })
      .catch((err) => {
        console.error('[GenerateInvoiceModal] Error:', err);
        toast.error('Could not load unbilled WIP entries');
      })
      .finally(() => setLoading(false));
  }, [isOpen, tenantId, selectedPartyId, token]);

  const toggleSelectEntry = (id: string) => {
    setSelectedEntryIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectedEntries = wipEntries.filter((e) => selectedEntryIds.includes(e.id));
  const totalHours = selectedEntries.reduce((sum, e) => sum + Number(e.hours || 0), 0);
  const totalSubtotal = selectedEntries.reduce((sum, e) => sum + Number(e.accruedAmount || 0), 0);
  const gstTax = Math.round(totalSubtotal * 0.1 * 100) / 100;
  const totalAmount = Math.round((totalSubtotal + gstTax) * 100) / 100;

  const handleGenerateInvoice = async () => {
    if (selectedEntryIds.length === 0) {
      toast.error('Please select at least one timesheet entry to bill');
      return;
    }

    const partyId = selectedPartyId || wipEntries[0]?.partyId;
    if (!partyId) {
      toast.error('Client reference missing');
      return;
    }

    setGenerating(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/invoices/wip/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'x-tenant-id': tenantId!
        },
        body: JSON.stringify({
          customerPartyId: partyId,
          entryIds: selectedEntryIds,
          dueDate: new Date(dueDate).toISOString(),
          notes
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to generate invoice');
      }

      const result = await res.json();
      toast.success(
        `Invoice ${result.invoice.invoiceNumber} created for $${totalAmount.toFixed(2)} AUD (${result.entriesBilled} entries billed)`
      );
      if (onInvoiceCreated) onInvoiceCreated();
      onClose();
    } catch (err: any) {
      console.error('[GenerateInvoiceModal] Generate error:', err);
      toast.error(err.message || 'Error generating invoice');
    } finally {
      setGenerating(false);
    }
  };

  const clientName = wipEntries[0]?.clientName || 'Selected Client';

  return (
    <AuroraModal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden"
    >
      <div className="w-full flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200/50 dark:border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <FileText size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white leading-tight">
                Bill Unbilled Time (WIP to Invoice)
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                Generate an itemized sales invoice from logged billable hours.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Client Banner */}
        <div className="px-5 py-3 bg-zinc-50/70 dark:bg-zinc-950/40 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 size={14} className="text-zinc-400" />
            <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
              Client: {clientName}
            </span>
          </div>
          <div className="text-xs font-semibold text-zinc-500">
            {wipEntries.length} unbilled sessions
          </div>
        </div>

        {/* Entries Table */}
        <div className="p-4 max-h-64 overflow-y-auto space-y-2">
          {loading ? (
            <div className="py-8 text-center text-xs text-zinc-400 flex items-center justify-center gap-2">
              <Loader2 size={14} className="animate-spin text-indigo-500" />
              <span>Loading unbilled WIP entries...</span>
            </div>
          ) : wipEntries.length === 0 ? (
            <div className="py-8 text-center text-zinc-400 dark:text-zinc-500 text-xs">
              No unbilled time entries found for this client.
            </div>
          ) : (
            wipEntries.map((entry) => {
              const isSelected = selectedEntryIds.includes(entry.id);
              const dateStr = entry.date ? new Date(entry.date).toLocaleDateString() : '';
              return (
                <div
                  key={entry.id}
                  onClick={() => toggleSelectEntry(entry.id)}
                  className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-3 cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-indigo-50/60 dark:bg-indigo-500/10 border-indigo-300 dark:border-indigo-500/30'
                      : 'bg-zinc-50/30 dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="rounded text-indigo-600 focus:ring-0 cursor-pointer"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                          {entry.description || 'Professional Consultation'}
                        </span>
                        {entry.catalogItemName && (
                          <span className="text-[10px] bg-zinc-200/60 dark:bg-zinc-800 px-1.5 py-0.2 rounded font-medium text-zinc-600 dark:text-zinc-300">
                            {entry.catalogItemName}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-zinc-500 mt-0.5 flex items-center gap-2">
                        <span>{dateStr}</span>
                        <span>•</span>
                        <span>{Number(entry.hours).toFixed(2)}h @ ${entry.effectiveRate}/hr</span>
                      </div>
                    </div>
                  </div>

                  <div className="font-mono font-bold text-zinc-900 dark:text-white shrink-0">
                    ${entry.accruedAmount.toFixed(2)} AUD
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Invoice Settings & Summary */}
        <div className="p-4 bg-zinc-50/50 dark:bg-zinc-950/60 border-t border-zinc-100 dark:border-zinc-800 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div>
              <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                Payment Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2 outline-none mt-1 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                Invoice Notes / Memo
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2 outline-none mt-1 focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 flex flex-col justify-between">
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-zinc-500">
                <span>Selected Sessions:</span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                  {selectedEntries.length} ({totalHours.toFixed(2)} hrs)
                </span>
              </div>
              <div className="flex justify-between text-zinc-500">
                <span>Subtotal:</span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                  ${totalSubtotal.toFixed(2)} AUD
                </span>
              </div>
              <div className="flex justify-between text-zinc-500">
                <span>GST (10%):</span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                  ${gstTax.toFixed(2)} AUD
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between font-bold text-sm text-zinc-900 dark:text-white mt-2">
              <span>Total Invoice Amount:</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-mono">
                ${totalAmount.toFixed(2)} AUD
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleGenerateInvoice}
            disabled={generating || selectedEntries.length === 0}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 hover:shadow-indigo-600/30 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-40"
          >
            {generating ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                <span>Generating Invoice...</span>
              </>
            ) : (
              <>
                <span>Generate & Issue Invoice</span>
                <ArrowRight size={13} />
              </>
            )}
          </button>
        </div>
      </div>
    </AuroraModal>
  );
};
