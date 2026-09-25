import React, { useState } from 'react';
import { 
  EyeOff, 
  X, 
  ShieldAlert, 
  CheckSquare, 
  Square, 
  Plus, 
  Loader2, 
  Lock, 
  Sparkles 
} from 'lucide-react';
import { UniversalDocument } from '../../types/document';
import { DocumentClientService } from '../../services/documentClientService';
import { toast } from 'sonner';

interface DocumentRedactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: UniversalDocument;
  onRedacted: (updatedDoc: UniversalDocument) => void;
}

export const DocumentRedactionModal: React.FC<DocumentRedactionModalProps> = ({
  isOpen,
  onClose,
  document,
  onRedacted
}) => {
  const detectedPii = document.aiMetadata?.detectedPii || [];
  const [selectedItems, setSelectedItems] = useState<string[]>(
    detectedPii.length > 0 ? detectedPii : ['BANK_ACCOUNT', 'CREDIT_CARD', 'TAX_FILE_NUMBER']
  );
  const [customKeyword, setCustomKeyword] = useState('');
  const [customEntities, setCustomEntities] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const toggleItem = (item: string) => {
    setSelectedItems(prev => 
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
    );
  };

  const handleAddCustom = () => {
    if (!customKeyword.trim()) return;
    setCustomEntities(prev => [...prev, customKeyword.trim()]);
    setSelectedItems(prev => [...prev, customKeyword.trim()]);
    setCustomKeyword('');
  };

  const handleApplyRedaction = async () => {
    if (selectedItems.length === 0) {
      toast.error('Select at least one entity or pattern to redact');
      return;
    }

    try {
      setIsProcessing(true);
      const updated = await DocumentClientService.redactDocument(document.id, selectedItems);
      toast.success('Document sanitized with irreversible redactions');
      onRedacted(updated);
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Redaction failed');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-200 dark:border-rose-800/60">
              <EyeOff className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                AI PII Redaction & Sanitiser
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 font-medium">
                  Compliance
                </span>
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {document.name} • Masks sensitive data for safe external distribution
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 flex-1 overflow-y-auto">
          {/* Banner */}
          <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <div className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
              Redactions permanently black-box sensitive values. A new clean revision <span className="font-mono font-semibold">v{(document.versions?.[0]?.versionNumber || 1) + 1}</span> is published while the original remains safely locked under retention.
            </div>
          </div>

          {/* Detected Entities Checklist */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                Detected Sensitive Patterns
              </span>
              <button
                onClick={() => setSelectedItems(prev => prev.length > 0 ? [] : ['BANK_ACCOUNT', 'CREDIT_CARD', 'TAX_FILE_NUMBER', 'SSN', 'PASSPORT', 'SIGNATURE', ...customEntities])}
                className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                {selectedItems.length > 0 ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="space-y-1.5">
              {[
                { key: 'TAX_FILE_NUMBER', label: 'Tax Identification Numbers (ABN, TFN, SSN)' },
                { key: 'BANK_ACCOUNT', label: 'Bank Account & Routing Numbers (BSB, IBAN)' },
                { key: 'CREDIT_CARD', label: 'Credit Card & Payment Pan Numbers' },
                { key: 'SIGNATURE', label: 'Handwritten Signatures & Physical Initials' },
                { key: 'PASSPORT', label: 'Passports & Government Photo Identification' },
                { key: 'HEALTH_INFO', label: 'Medical Records & Health Information' },
                ...customEntities.map(c => ({ key: c, label: `Custom Text: "${c}"` }))
              ].map(item => {
                const isChecked = selectedItems.includes(item.key);
                return (
                  <div
                    key={item.key}
                    onClick={() => toggleItem(item.key)}
                    className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                      isChecked
                        ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60 text-zinc-900 dark:text-white'
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                    }`}
                  >
                    {isChecked ? (
                      <CheckSquare className="w-4 h-4 text-rose-600 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-zinc-400 shrink-0" />
                    )}
                    <span className="text-xs font-medium">{item.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Custom Keyword Redaction */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
              Add Specific Word / Phrase to Blackout
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={customKeyword}
                onChange={(e) => setCustomKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCustom()}
                placeholder="e.g. John Doe, Confidential Project X"
                className="flex-1 text-xs px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
              <button
                onClick={handleAddCustom}
                disabled={!customKeyword.trim()}
                className="flex items-center gap-1 px-3 py-2 text-xs font-medium rounded-lg bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white transition-colors disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            Cancel
          </button>
          <button
            onClick={handleApplyRedaction}
            disabled={isProcessing || selectedItems.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition-colors disabled:opacity-50 shadow-sm"
          >
            {isProcessing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <EyeOff className="w-3.5 h-3.5" />
            )}
            Sanitise & Create Clean Version ({selectedItems.length})
          </button>
        </div>
      </div>
    </div>
  );
};
