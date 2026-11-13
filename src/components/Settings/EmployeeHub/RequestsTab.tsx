import React, { useState } from 'react';
import { 
  FileText, 
  DollarSign, 
  Laptop, 
  FileCheck2, 
  HelpCircle, 
  Plus, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  UploadCloud, 
  Send,
  X
} from 'lucide-react';
import { MemberHRData, EmployeeRequestItem } from './types';
import { toast } from 'sonner';

interface RequestsTabProps {
  hrData: MemberHRData;
  onLodgeRequest: (payload: {
    type: 'expense' | 'equipment' | 'letter' | 'general';
    title: string;
    description?: string;
    amount?: number | null;
    currency?: string;
    urgency?: 'Normal' | 'Urgent' | 'Critical';
    attachments?: string[];
  }) => Promise<boolean>;
}

export const RequestsTab: React.FC<RequestsTabProps> = ({ hrData, onLodgeRequest }) => {
  const [showForm, setShowForm] = useState(false);
  const [requestType, setRequestType] = useState<'expense' | 'equipment' | 'letter' | 'general'>('expense');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('AUD');
  const [urgency, setUrgency] = useState<'Normal' | 'Urgent' | 'Critical'>('Normal');
  const [receiptName, setReceiptName] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReceiptName(file.name);
      toast.success(`Attached receipt: ${file.name}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    setIsSubmitting(true);
    const success = await onLodgeRequest({
      type: requestType,
      title,
      description,
      amount: amount ? parseFloat(amount) : null,
      currency,
      urgency,
      attachments: receiptName ? [receiptName] : []
    });

    setIsSubmitting(false);
    if (success) {
      setShowForm(false);
      setTitle('');
      setDescription('');
      setAmount('');
      setReceiptName(null);
    }
  };

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <h2 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <FileText size={18} className="text-indigo-500" />
            Universal Workplace Request Center
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Submit expense reimbursements, order IT hardware, request official employment verification letters, or query People Operations.
          </p>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
        >
          <Plus size={16} />
          {showForm ? 'Close Form' : 'Lodge New Request'}
        </button>
      </div>

      {/* Lodgement Drawer */}
      {showForm && (
        <div className="p-6 rounded-2xl bg-indigo-50/40 dark:bg-zinc-900/90 border border-indigo-500/30 shadow-2xl space-y-5 w-full">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
              Create Workplace Lodgement
            </h3>
            <button
              onClick={() => setShowForm(false)}
              className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <X size={16} />
            </button>
          </div>

          {/* Request Type Selector Chips */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'expense', label: 'Expense Claim', icon: DollarSign, color: 'text-emerald-500' },
              { id: 'equipment', label: 'IT Hardware', icon: Laptop, color: 'text-purple-500' },
              { id: 'letter', label: 'Proof Letter', icon: FileCheck2, color: 'text-indigo-500' },
              { id: 'general', label: 'HR Inquiry', icon: HelpCircle, color: 'text-amber-500' }
            ].map(({ id, label, icon: Icon, color }) => (
              <button
                key={id}
                type="button"
                onClick={() => setRequestType(id as any)}
                className={`p-3 rounded-xl border flex items-center gap-2.5 transition-all text-xs font-semibold ${
                  requestType === id
                    ? 'bg-white dark:bg-zinc-800 border-indigo-500 shadow-md text-zinc-900 dark:text-white'
                    : 'bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                <Icon size={16} className={color} />
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Request Subject / Title
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    requestType === 'expense'
                      ? 'e.g. Flight to Tech Conference or Team Lunch'
                      : requestType === 'equipment'
                      ? 'e.g. Ergonomic Monitor Arm / Wireless Keyboard'
                      : requestType === 'letter'
                      ? 'e.g. Employment Verification Letter for Apartment Lease'
                      : 'e.g. Question regarding parental leave policy'
                  }
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Urgency Level
                </label>
                <select
                  value={urgency}
                  onChange={(e) => setUrgency(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Normal">Normal</option>
                  <option value="Urgent">Urgent</option>
                  <option value="Critical">Critical (Immediate approval needed)</option>
                </select>
              </div>
            </div>

            {/* Expense-specific amount inputs */}
            {requestType === 'expense' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Amount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs font-mono bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Currency
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="AUD">AUD ($)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Receipt / Tax Invoice
                  </label>
                  <label className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-zinc-800 border border-dashed border-zinc-300 dark:border-zinc-700 text-zinc-500 hover:text-zinc-900 dark:hover:text-white cursor-pointer flex items-center justify-center gap-1.5 truncate">
                    <UploadCloud size={14} />
                    <span className="truncate">{receiptName || 'Upload Receipt (PDF/Img)'}</span>
                    <input type="file" className="hidden" onChange={handleFileSelect} />
                  </label>
                </div>
              </div>
            )}

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Detailed Notes & Business Context
              </label>
              <textarea
                rows={3}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide complete business justification, recipient contact, or details for the reviewer..."
                className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !title}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                <Send size={13} />
                {isSubmitting ? 'Lodging...' : 'Lodge Request'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lodged Requests Tracking Table */}
      <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800/80 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
            <Clock size={14} className="text-indigo-500" />
            My Lodged Requests & Status Desk
          </h3>
          <span className="text-[11px] text-zinc-400">
            Real-time manager & HR review tracking
          </span>
        </div>

        <div className="space-y-2.5">
          {hrData.requests && hrData.requests.length > 0 ? (
            hrData.requests.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-xl bg-white dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 flex flex-col sm:flex-row sm:items-start justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500">
                      {item.type}
                    </span>
                    <span className="text-xs font-bold text-zinc-900 dark:text-white">
                      {item.title}
                    </span>
                    {item.amount && (
                      <span className="text-xs font-mono font-bold text-emerald-500">
                        ${item.amount.toLocaleString()} {item.currency}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    {item.description}
                  </p>
                  <div className="flex items-center gap-3 text-[11px] text-zinc-400 pt-1">
                    <span>Submitted: {new Date(item.submittedAt).toLocaleDateString()}</span>
                    <span>Urgency: <strong className="text-zinc-700 dark:text-zinc-300">{item.urgency || 'Normal'}</strong></span>
                  </div>
                  {item.reviewerNotes && (
                    <div className="mt-2 p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 text-[11px] text-zinc-500 border border-zinc-200 dark:border-zinc-800">
                      <strong>Reviewer Note:</strong> {item.reviewerNotes}
                    </div>
                  )}
                </div>

                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0 self-start sm:self-auto ${
                  item.status.toLowerCase().includes('approved')
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : item.status.toLowerCase().includes('rejected')
                    ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}>
                  {item.status}
                </span>
              </div>
            ))
          ) : (
            <div className="p-8 text-center rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500">
              No requests lodged yet. Click "Lodge New Request" above to submit an expense, equipment order, or HR inquiry.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
