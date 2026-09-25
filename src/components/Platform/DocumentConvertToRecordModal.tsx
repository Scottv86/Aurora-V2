import React, { useState, useEffect } from 'react';
import { 
  FileOutput, 
  X, 
  Users, 
  Building2, 
  Database, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2, 
  ArrowRight, 
  Table, 
  ExternalLink,
  ShieldCheck,
  Check
} from 'lucide-react';
import { UniversalDocument, DocumentConversionDraft, LineItemRow } from '../../types/document';
import { DocumentClientService } from '../../services/documentClientService';
import { usePlatform } from '../../hooks/usePlatform';
import { toast } from 'sonner';

interface DocumentConvertToRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: UniversalDocument;
  onRecordCreated?: (recordId: string, recordType: string) => void;
}

export const DocumentConvertToRecordModal: React.FC<DocumentConvertToRecordModalProps> = ({
  isOpen,
  onClose,
  document,
  onRecordCreated
}) => {
  const { tenant, modules } = usePlatform();
  const [targetType, setTargetType] = useState<'PEOPLE_ORG' | 'MODULE'>('PEOPLE_ORG');
  const [entityType, setEntityType] = useState<'ORGANIZATION' | 'PERSON'>('ORGANIZATION');
  const [selectedModuleId, setSelectedModuleId] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<DocumentConversionDraft | null>(null);
  const [formFields, setFormFields] = useState<Record<string, any>>({});
  const [lineItems, setLineItems] = useState<LineItemRow[]>([]);
  const [includeLineItems, setIncludeLineItems] = useState(true);
  const [isExecuting, setIsExecuting] = useState(false);
  const [createdResult, setCreatedResult] = useState<{ recordId: string; recordName: string } | null>(null);

  useEffect(() => {
    if (modules && modules.length > 0 && !selectedModuleId) {
      setSelectedModuleId(modules[0].id);
    }
  }, [modules]);

  useEffect(() => {
    if (isOpen && document) {
      handleRunExtraction();
    }
  }, [isOpen, targetType, entityType, selectedModuleId]);

  const resolveModuleFields = (mod: any): Array<{ id: string; label: string; type: string }> => {
    if (!mod) return [];
    const cfg = mod.config || {};
    const rawFields = (Array.isArray(mod.fields) ? mod.fields : null) 
      || (Array.isArray(cfg.fields) ? cfg.fields : null) 
      || (Array.isArray(cfg.sections) ? cfg.sections.flatMap((s: any) => s.fields || []) : null)
      || (Array.isArray(mod.tabs) ? mod.tabs.flatMap((t: any) => t.fields || []) : null)
      || [];
      
    return rawFields
      .filter((f: any) => f && (f.id || f.key || f.name))
      .map((f: any) => ({
        id: f.id || f.key || f.name,
        label: f.label || f.name || f.id,
        type: f.type || 'text'
      }));
  };

  const handleRunExtraction = async () => {
    try {
      setLoading(true);
      setCreatedResult(null);

      const targetMod = modules.find(m => m.id === selectedModuleId);
      const modFields = resolveModuleFields(targetMod);
      const targetSchema = targetType === 'PEOPLE_ORG' 
        ? { entityType } 
        : { 
            moduleId: selectedModuleId, 
            moduleName: targetMod?.name,
            fields: modFields 
          };

      const [draftRes, lineItemsRes] = await Promise.all([
        DocumentClientService.previewConvertToRecord(document.id, targetType, targetSchema),
        DocumentClientService.extractLineItems(document.id).catch(() => [])
      ]);

      setDraft(draftRes);
      setFormFields(draftRes.fields || {});
      setLineItems(lineItemsRes || []);
      if (draftRes.entityType) {
        setEntityType(draftRes.entityType);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to extract record details');
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (key: string, value: any) => {
    setFormFields(prev => ({ ...prev, [key]: value }));
  };

  const handleExecuteCreate = async () => {
    try {
      setIsExecuting(true);
      const payload = targetType === 'PEOPLE_ORG' 
        ? { entityType, fields: formFields }
        : { moduleId: selectedModuleId, fields: formFields, lineItems: includeLineItems ? lineItems : [] };

      const res = await DocumentClientService.executeConvertToRecord(document.id, targetType, payload);
      setCreatedResult({ recordId: res.recordId, recordName: res.recordName });
      toast.success(`Created ${res.recordName} and linked document!`);
      if (onRecordCreated) {
        onRecordCreated(res.recordId, targetType);
      }
    } catch (err: any) {
      toast.error(err.message || 'Record creation failed');
    } finally {
      setIsExecuting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200 dark:border-indigo-800/60">
              <FileOutput className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                AI Convert to Record
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-medium">
                  Zero Manual Entry
                </span>
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Transform {document.name} directly into a living CRM/ERP record with automatic polymorphic linkage
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

        {/* Target Selector Toolbar */}
        <div className="px-6 py-3 bg-zinc-100/60 dark:bg-zinc-800/40 border-b border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Target Destination:</span>
            
            <button
              onClick={() => setTargetType('PEOPLE_ORG')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                targetType === 'PEOPLE_ORG'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              People & Organisations
            </button>

            <button
              onClick={() => setTargetType('MODULE')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                targetType === 'MODULE'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              Custom Module Record
            </button>
          </div>

          {/* Sub-Selection */}
          {targetType === 'PEOPLE_ORG' ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500">Entity Type:</span>
              <select
                value={entityType}
                onChange={(e) => setEntityType(e.target.value as any)}
                className="px-2.5 py-1 text-xs font-medium rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"
              >
                <option value="ORGANIZATION">🏢 Organisation (Company / Vendor)</option>
                <option value="PERSON">👤 Person (Contact / Individual)</option>
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500">Select Module:</span>
              <select
                value={selectedModuleId}
                onChange={(e) => setSelectedModuleId(e.target.value)}
                className="px-2.5 py-1 text-xs font-medium rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"
              >
                {modules.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center text-center">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
              <p className="text-sm font-medium text-zinc-900 dark:text-white">Extracting and mapping entities...</p>
              <p className="text-xs text-zinc-500">
                Gemini is cross-referencing document text with the destination schema.
              </p>
            </div>
          ) : createdResult ? (
            <div className="py-16 text-center max-w-md mx-auto">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center mb-4">
                <Check className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-1">
                Record Successfully Created!
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-6">
                Created <span className="font-semibold text-zinc-900 dark:text-white font-mono">{createdResult.recordName}</span>. Source file <span className="font-medium">{document.name}</span> has been permanently linked with cryptographic provenance.
              </p>
              <button
                onClick={onClose}
                className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
              >
                Done
              </button>
            </div>
          ) : (
            <>
              {/* Deduplication Warning Alert */}
              {draft?.dedupMatch && (
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wide">
                      Existing Entity Matched (Deduplication Check)
                    </h4>
                    <p className="text-xs text-amber-800 dark:text-amber-300">
                      Found existing directory record: <span className="font-semibold">{draft.dedupMatch.existingName}</span> ({draft.dedupMatch.existingDetails}).
                    </p>
                    <p className="text-[11px] text-amber-700 dark:text-amber-400">
                      Proceeding will create an additional verified record or attach this document to your directory.
                    </p>
                  </div>
                </div>
              )}

              {/* Split Form View */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Side: Extracted Form Fields */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
                    <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                      Schema-Constrained Form Fields
                    </span>
                    <span className="text-[11px] text-zinc-400 font-medium">Verify & Edit</span>
                  </div>

                  <div className="space-y-3">
                    {Object.keys(formFields).length === 0 ? (
                      <p className="text-xs text-zinc-400 italic">No specific fields detected.</p>
                    ) : (
                      Object.entries(formFields).map(([key, val]) => {
                        const confidence = draft?.fieldConfidences?.[key] || 0.9;
                        const isHigh = confidence >= 0.85;
                        const citation = draft?.sourceCitations?.[key];

                        const targetMod = modules.find(m => m.id === selectedModuleId);
                        const modFields = resolveModuleFields(targetMod);
                        const matchedField = modFields.find(f => f.id === key);
                        const fieldLabel = matchedField?.label || key.replace(/([A-Z])/g, ' $1');

                        return (
                          <div key={key} className="space-y-1">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 capitalize">
                                {fieldLabel}
                              </label>
                              <div className="flex items-center gap-1.5">
                                {citation && (
                                  <span className="text-[10px] text-zinc-400 truncate max-w-[150px]" title={citation}>
                                    "{citation}"
                                  </span>
                                )}
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-medium ${
                                  isHigh 
                                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300' 
                                    : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                                }`}>
                                  {Math.round(confidence * 100)}%
                                </span>
                              </div>
                            </div>
                            <input
                              type="text"
                              value={val ?? ''}
                              onChange={(e) => handleFieldChange(key, e.target.value)}
                              className="w-full text-xs px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Right Side: Tabular Line Items Preview */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
                    <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Table className="w-3.5 h-3.5 text-indigo-500" />
                      Tabular Line Items ({lineItems.length})
                    </span>
                    <label className="flex items-center gap-1.5 text-xs text-zinc-500 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeLineItems}
                        onChange={(e) => setIncludeLineItems(e.target.checked)}
                        className="rounded text-indigo-600"
                      />
                      Include Sub-Table Rows
                    </label>
                  </div>

                  {lineItems.length === 0 ? (
                    <div className="p-8 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                      <p className="text-xs text-zinc-400">No tabular items or financial rows detected in this file.</p>
                    </div>
                  ) : (
                    <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-zinc-500 border-b border-zinc-200 dark:border-zinc-800 text-[11px]">
                          <tr>
                            <th className="px-3 py-2">Item Description</th>
                            <th className="px-2 py-2 text-right">Qty</th>
                            <th className="px-2 py-2 text-right">Price</th>
                            <th className="px-3 py-2 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                          {lineItems.map((item, idx) => (
                            <tr key={`item-${idx}`} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                              <td className="px-3 py-2 text-zinc-900 dark:text-white font-medium truncate max-w-[180px]">
                                {item.description}
                              </td>
                              <td className="px-2 py-2 text-right text-zinc-600 dark:text-zinc-400 font-mono">
                                {item.quantity}
                              </td>
                              <td className="px-2 py-2 text-right text-zinc-600 dark:text-zinc-400 font-mono">
                                ${item.unitPrice?.toFixed(2)}
                              </td>
                              <td className="px-3 py-2 text-right text-indigo-600 dark:text-indigo-400 font-mono font-semibold">
                                ${item.totalAmount?.toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Document Provenance Stamp Note */}
                  <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/60 flex items-start gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                    <div className="text-[11px] text-zinc-500 leading-snug">
                      When generated, this document will be attached to the new record automatically via <span className="font-mono text-zinc-700 dark:text-zinc-300">UniversalDocumentLink</span>, preserving full audit traceability.
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!createdResult && (
          <div className="px-6 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex items-center justify-between">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              Cancel
            </button>
            <button
              onClick={handleExecuteCreate}
              disabled={isExecuting || loading}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors disabled:opacity-50 shadow-sm"
            >
              {isExecuting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileOutput className="w-3.5 h-3.5" />
              )}
              Create {targetType === 'PEOPLE_ORG' ? (entityType === 'PERSON' ? 'Person' : 'Organisation') : 'Record'} & Attach File
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
