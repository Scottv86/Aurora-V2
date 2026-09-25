import React, { useState } from 'react';
import { 
  CheckSquare, 
  Layers, 
  Lock, 
  Trash2, 
  Calendar, 
  X, 
  Loader2, 
  Sparkles 
} from 'lucide-react';
import { UniversalDocument, UniversalDisposalSchedule } from '../../types/document';
import { DocumentClientService } from '../../services/documentClientService';
import { toast } from 'sonner';

interface DocumentBatchActionBarProps {
  selectedDocIds: string[];
  documents: UniversalDocument[];
  schedules: UniversalDisposalSchedule[];
  onClearSelection: () => void;
  onRefresh: () => void;
  recordContext?: { moduleId?: string; recordId?: string };
}

export const DocumentBatchActionBar: React.FC<DocumentBatchActionBarProps> = ({
  selectedDocIds,
  documents,
  schedules,
  onClearSelection,
  onRefresh,
  recordContext
}) => {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [showRdsPicker, setShowRdsPicker] = useState(false);

  if (selectedDocIds.length === 0) return null;

  const count = selectedDocIds.length;

  const handleBulkLegalHold = async (enable: boolean) => {
    try {
      setLoadingAction('HOLD');
      await DocumentClientService.bulkActions(
        selectedDocIds, 
        enable ? 'LEGAL_HOLD_ON' : 'LEGAL_HOLD_OFF',
        { reason: 'Bulk legal hold toggled from Files workstation' }
      );
      toast.success(`${enable ? 'Applied' : 'Removed'} legal hold for ${count} files`);
      onRefresh();
      onClearSelection();
    } catch (err: any) {
      toast.error('Failed to update legal holds');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleBulkTrash = async () => {
    if (!confirm(`Are you sure you want to move ${count} document(s) to the recycling bin?`)) return;

    try {
      setLoadingAction('TRASH');
      await DocumentClientService.bulkActions(selectedDocIds, 'TRASH');
      toast.success(`Moved ${count} documents to recycling bin`);
      onRefresh();
      onClearSelection();
    } catch (err: any) {
      toast.error('Failed to recycle documents');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleAssignRds = async (scheduleId: string) => {
    try {
      setLoadingAction('RDS');
      await DocumentClientService.bulkActions(selectedDocIds, 'ASSIGN_RDS', { retentionScheduleId: scheduleId });
      toast.success(`Applied retention schedule to ${count} files`);
      setShowRdsPicker(false);
      onRefresh();
      onClearSelection();
    } catch (err: any) {
      toast.error('Failed to assign schedule');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleMergePdfs = async () => {
    const binderName = prompt('Enter a name for the merged master binder:', 'Consolidated_Records');
    if (!binderName) return;

    try {
      setLoadingAction('MERGE');
      await DocumentClientService.mergeDocuments(selectedDocIds, binderName, recordContext);
      toast.success(`Created merged document binder "${binderName}"`);
      onRefresh();
      onClearSelection();
    } catch (err: any) {
      toast.error(err.message || 'Failed to merge documents');
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="absolute bottom-4 left-4 right-4 z-40 flex items-center justify-between p-3 rounded-2xl bg-zinc-900/95 text-white shadow-2xl border border-zinc-700/80 backdrop-blur-md animate-in slide-in-from-bottom-3 duration-200">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-indigo-600/30 text-indigo-400 border border-indigo-500/40 flex items-center justify-center font-bold text-xs">
          {count}
        </div>
        <div>
          <div className="text-xs font-semibold flex items-center gap-1.5">
            <span>{count} Document{count > 1 ? 's' : ''} Selected</span>
          </div>
          <span className="text-[10px] text-zinc-400">Apply batch actions across selection</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        {/* Merge Button */}
        <button
          onClick={handleMergePdfs}
          disabled={!!loadingAction}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition-colors disabled:opacity-50"
        >
          {loadingAction === 'MERGE' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Layers className="w-3.5 h-3.5" />}
          Merge into Binder
        </button>

        {/* Legal Hold */}
        <button
          onClick={() => handleBulkLegalHold(true)}
          disabled={!!loadingAction}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors disabled:opacity-50 border border-zinc-700"
        >
          {loadingAction === 'HOLD' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5 text-amber-400" />}
          Legal Hold
        </button>

        {/* Assign RDS Dropdown Popover */}
        <div className="relative">
          <button
            onClick={() => setShowRdsPicker(!showRdsPicker)}
            disabled={!!loadingAction}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors disabled:opacity-50 border border-zinc-700"
          >
            {loadingAction === 'RDS' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Calendar className="w-3.5 h-3.5 text-blue-400" />}
            Assign RDS
          </button>

          {showRdsPicker && (
            <div className="absolute bottom-11 right-0 w-60 p-2 rounded-xl bg-zinc-900 border border-zinc-700 shadow-2xl text-left space-y-1 z-50">
              <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                Statutory Retention Schedules
              </div>
              {schedules.map(s => (
                <button
                  key={s.id}
                  onClick={() => handleAssignRds(s.id)}
                  className="w-full text-left px-2.5 py-1.5 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors flex items-center justify-between"
                >
                  <span className="truncate">{s.name}</span>
                  <span className="text-[10px] text-zinc-500 font-mono">{s.durationLabel}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Trash */}
        <button
          onClick={handleBulkTrash}
          disabled={!!loadingAction}
          className="p-1.5 rounded-lg bg-zinc-800 hover:bg-rose-950/40 text-zinc-400 hover:text-rose-400 text-xs font-medium transition-colors border border-zinc-700"
          title="Move to Recycling Bin"
        >
          {loadingAction === 'TRASH' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
        </button>

        {/* Dismiss */}
        <button
          onClick={onClearSelection}
          className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors ml-1"
          title="Deselect All"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
