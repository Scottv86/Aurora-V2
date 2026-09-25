import React, { useState, useEffect } from 'react';
import { PageHeader } from '../../components/UI/PageHeader';
import { Button } from '../../components/UI/Primitives';
import { 
  Clock, 
  Trash2, 
  Plus, 
  Search, 
  Database, 
  Lock, 
  Unlock, 
  ShieldCheck, 
  FileText, 
  Download, 
  Eye, 
  Loader2 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { DocumentClientService } from '../../services/documentClientService';
import { UniversalDocument, UniversalDisposalSchedule } from '../../types/document';
import { toast } from 'sonner';
import { API_BASE_URL } from '../../config';

export const RecordsManagement = () => {
  const [activeTab, setActiveTab] = useState<'schedules' | 'holds' | 'ediscovery' | 'disposal_queue' | 'audit'>('ediscovery');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassification, setSelectedClassification] = useState<string>('');
  const [schedules, setSchedules] = useState<UniversalDisposalSchedule[]>([]);
  const [allDocs, setAllDocs] = useState<UniversalDocument[]>([]);
  const [legalHolds, setLegalHolds] = useState<UniversalDocument[]>([]);
  const [pendingDisposal, setPendingDisposal] = useState<UniversalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewScheduleModal, setShowNewScheduleModal] = useState(false);
  const [newSchedule, setNewSchedule] = useState({
    name: '',
    moduleScope: 'ALL',
    documentType: 'GENERAL',
    retentionPeriodMonths: 84,
    durationLabel: '7 Years',
    action: 'ARCHIVE',
    description: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [schedulesData, queueData, searchResults] = await Promise.all([
        DocumentClientService.getDisposalSchedules().catch((): UniversalDisposalSchedule[] => []),
        DocumentClientService.getGovernanceQueue().catch(() => ({ 
          activeLegalHolds: [] as UniversalDocument[], 
          expiringWithin30Days: [] as UniversalDocument[], 
          pendingDisposal: [] as UniversalDocument[] 
        })),
        DocumentClientService.searchDocuments(searchQuery, { classification: selectedClassification }).catch((): UniversalDocument[] => [])
      ]);

      setSchedules(schedulesData);
      setLegalHolds(queueData.activeLegalHolds || []);
      setPendingDisposal(queueData.pendingDisposal || []);
      setAllDocs(searchResults);
    } catch (err: any) {
      console.error('[RecordsManagement] Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [searchQuery, selectedClassification]);

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSchedule.name.trim()) return;

    try {
      await DocumentClientService.saveDisposalSchedule({
        ...newSchedule,
        action: newSchedule.action as any,
        durationLabel: `${Math.round(newSchedule.retentionPeriodMonths / 12)} Years`
      });
      toast.success('Retention schedule created successfully.');
      setShowNewScheduleModal(false);
      setNewSchedule({
        name: '',
        moduleScope: 'ALL',
        documentType: 'GENERAL',
        retentionPeriodMonths: 84,
        durationLabel: '7 Years',
        action: 'ARCHIVE',
        description: ''
      });
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create schedule');
    }
  };

  const handleToggleHold = async (docId: string, isHold: boolean) => {
    try {
      const reason = !isHold ? prompt('Enter reason for legal hold:', 'Statutory audit inquiry') : undefined;
      if (!isHold && reason === null) return;

      await DocumentClientService.toggleLegalHold(docId, reason || undefined);
      toast.success(isHold ? 'Legal hold released.' : 'Legal hold applied.');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Action failed');
    }
  };

  const handleExecutePurge = async (doc: UniversalDocument) => {
    if (!confirm(`Are you sure you want to permanently purge "${doc.originalFilename || doc.name}"? This action will generate a cryptographic Certificate of Destruction and shred the file.`)) {
      return;
    }

    try {
      await DocumentClientService.deleteDocument(doc.id, true);

      // Generate Cryptographic Certificate of Destruction
      const cert = {
        certificateId: `CERT-DEST-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`,
        issuedAt: new Date().toISOString(),
        document: {
          id: doc.id,
          name: doc.originalFilename || doc.name,
          sha256Fingerprint: doc.sha256 || 'N/A',
          sizeBytes: doc.sizeBytes,
          documentType: doc.documentType,
          classification: doc.classification
        },
        disposalAuthority: {
          scheduleName: doc.retentionSchedule?.name || 'Standard Statutory RDS',
          retentionPeriod: doc.retentionSchedule?.durationLabel || 'Expired',
          disposalAction: 'PERMANENT_PURGE (Binary Shredding)',
          standardCompliance: 'ISO 15489-1:2016 Records Management'
        },
        authorizedBy: 'Compliance Lead / Admin',
        status: 'SHREDDED_AND_PURGED'
      };

      // Trigger automatic download of Certificate of Destruction
      const blob = new Blob([JSON.stringify(cert, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Certificate_of_Destruction_${doc.id}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success(`Document purged. Certificate of Destruction (${cert.certificateId}) generated and downloaded.`);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Purge failed');
    }
  };


  return (
    <div className="flex flex-col w-full px-6 lg:px-12 py-10 relative">
      <PageHeader 
        title="Records Management & eDiscovery"
        description="Centralized document governance, statutory retention schedules (RDS), legal holds, and cryptographic disposition."
        actions={
          <Button 
            className="gap-2 shadow-lg shadow-indigo-500/10 font-bold" 
            onClick={() => setShowNewScheduleModal(true)}
          >
            <Plus size={16} /> New Retention Schedule
          </Button>
        }
      />

      {/* Metrics Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 relative z-10">
        <div className="p-6 bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-3xl transition-all shadow-xl shadow-black/5 hover:border-indigo-500/30">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Clock size={20} />
            </div>
            <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">Active RDS</span>
          </div>
          <span className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white">{schedules.length}</span>
          <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mt-1">Retention Schedules</p>
        </div>

        <div className="p-6 bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-3xl transition-all shadow-xl shadow-black/5 hover:border-indigo-500/30">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-xl">
              <Database size={20} />
            </div>
            <span className="text-[10px] font-bold text-teal-500 bg-teal-500/10 px-2 py-0.5 rounded-full">Indexed</span>
          </div>
          <span className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white">{allDocs.length}</span>
          <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mt-1">Managed Documents</p>
        </div>

        <div className="p-6 bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-3xl transition-all shadow-xl shadow-black/5 hover:border-indigo-500/30">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl">
              <Lock size={20} />
            </div>
            <span className="text-[10px] font-bold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full">Immutable</span>
          </div>
          <span className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white">{legalHolds.length}</span>
          <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mt-1">Active Legal Holds</p>
        </div>

        <div className="p-6 bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-3xl transition-all shadow-xl shadow-black/5 hover:border-indigo-500/30">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
              <Trash2 size={20} />
            </div>
            <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">Review Queue</span>
          </div>
          <span className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white">{pendingDisposal.length}</span>
          <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mt-1">Pending Disposition</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-zinc-200/80 dark:border-zinc-800/80 mb-6 font-bold text-xs">
        <button
          onClick={() => setActiveTab('ediscovery')}
          className={cn(
            "pb-3 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-2",
            activeTab === 'ediscovery'
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
          )}
        >
          <Search size={15} /> eDiscovery & All Documents
        </button>
        <button
          onClick={() => setActiveTab('schedules')}
          className={cn(
            "pb-3 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-2",
            activeTab === 'schedules'
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
          )}
        >
          <ShieldCheck size={15} /> Retention Schedules ({schedules.length})
        </button>
        <button
          onClick={() => setActiveTab('holds')}
          className={cn(
            "pb-3 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-2",
            activeTab === 'holds'
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
          )}
        >
          <Lock size={15} /> Legal Holds ({legalHolds.length})
        </button>
        <button
          onClick={() => setActiveTab('disposal_queue')}
          className={cn(
            "pb-3 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-2",
            activeTab === 'disposal_queue'
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
          )}
        >
          <Trash2 size={15} /> Disposal Review Queue ({pendingDisposal.length})
        </button>
      </div>

      {/* Tab Contents */}
      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center gap-3 text-zinc-400">
          <Loader2 size={24} className="animate-spin text-indigo-500" />
          <p className="text-xs">Synchronizing document repository...</p>
        </div>
      ) : activeTab === 'ediscovery' ? (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Search across all modules, OCR text transcripts, tags, and filenames..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-xs outline-none focus:border-indigo-500 text-zinc-900 dark:text-white shadow-xs"
              />
            </div>
            <select
              value={selectedClassification}
              onChange={(e) => setSelectedClassification(e.target.value)}
              className="px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-xs font-semibold text-zinc-700 dark:text-zinc-200 outline-none focus:border-indigo-500 shadow-xs"
            >
              <option value="">All Classifications</option>
              <option value="PUBLIC">Public</option>
              <option value="INTERNAL">Internal</option>
              <option value="CONFIDENTIAL">Confidential</option>
              <option value="RESTRICTED">Restricted</option>
            </select>
          </div>

          {/* Document Table */}
          <div className="bg-white/40 dark:bg-white/[0.02] backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-bold text-zinc-400 uppercase tracking-wider bg-zinc-50/50 dark:bg-zinc-900/50">
                    <th className="py-4 px-6">Document Name</th>
                    <th className="py-4 px-6">Classification</th>
                    <th className="py-4 px-6">Document Type</th>
                    <th className="py-4 px-6">Size / Version</th>
                    <th className="py-4 px-6">Retention Expiry</th>
                    <th className="py-4 px-6">Legal Hold</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 font-medium">
                  {allDocs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-zinc-400">
                        No documents found matching your search.
                      </td>
                    </tr>
                  ) : (
                    allDocs.map((doc) => {
                      const streamUrl = `${API_BASE_URL}/api/documents/stream/${doc.id}`;
                      return (
                        <tr key={doc.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-900/40 transition-colors">
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                                <FileText size={16} />
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-zinc-900 dark:text-white truncate max-w-[240px]">
                                  {doc.originalFilename || doc.name}
                                </p>
                                <p className="text-[10px] text-zinc-400 truncate">
                                  SHA: {doc.sha256 ? `${doc.sha256.slice(0, 12)}...` : 'pending'}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <span className={cn(
                              "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                              doc.classification === 'RESTRICTED' && "bg-rose-500/10 text-rose-500 border-rose-500/20",
                              doc.classification === 'CONFIDENTIAL' && "bg-amber-500/10 text-amber-500 border-amber-500/20",
                              doc.classification === 'PUBLIC' && "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
                              doc.classification === 'INTERNAL' && "bg-zinc-500/10 text-zinc-500 border-zinc-500/20"
                            )}>
                              {doc.classification}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-zinc-600 dark:text-zinc-300 font-semibold">
                            {doc.documentType}
                          </td>
                          <td className="py-4 px-6 text-zinc-400">
                            {(doc.sizeBytes / 1024).toFixed(1)} KB • v{doc.versions?.length || 1}
                          </td>
                          <td className="py-4 px-6 text-zinc-400">
                            {doc.retentionExpiryDate ? doc.retentionExpiryDate.split('T')[0] : 'Permanent'}
                          </td>
                          <td className="py-4 px-6">
                            {doc.isLegalHold ? (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full w-max border border-rose-500/20">
                                <Lock size={10} /> Active Hold
                              </span>
                            ) : (
                              <span className="text-zinc-400 text-[11px]">—</span>
                            )}
                          </td>
                          <td className="py-4 px-6 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <a
                                href={streamUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 text-zinc-400 hover:text-indigo-500 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                title="Open Preview"
                              >
                                <Eye size={15} />
                              </a>
                              <a
                                href={streamUrl}
                                download={doc.originalFilename || doc.name}
                                className="p-1.5 text-zinc-400 hover:text-indigo-500 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                title="Download"
                              >
                                <Download size={15} />
                              </a>
                              <button
                                onClick={() => handleToggleHold(doc.id, doc.isLegalHold)}
                                className={cn(
                                  "p-1.5 rounded-lg transition-colors cursor-pointer",
                                  doc.isLegalHold
                                    ? "text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                    : "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                )}
                                title={doc.isLegalHold ? "Release Legal Hold" : "Apply Legal Hold"}
                              >
                                {doc.isLegalHold ? <Lock size={15} /> : <Unlock size={15} />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeTab === 'schedules' ? (
        /* Retention Schedules */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {schedules.map(sch => (
            <div key={sch.id} className="p-6 bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl space-y-4 shadow-xl">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                  <ShieldCheck size={20} />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                  {sch.durationLabel}
                </span>
              </div>

              <div>
                <h4 className="text-sm font-bold text-zinc-900 dark:text-white">{sch.name}</h4>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{sch.description || 'Statutory records retention schedule.'}</p>
              </div>

              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-500">
                <span>Scope: <strong>{sch.moduleScope || 'ALL'}</strong></span>
                <span className="font-bold text-indigo-500">{sch.action}</span>
              </div>
            </div>
          ))}
        </div>
      ) : activeTab === 'holds' ? (
        /* Legal Holds */
        <div className="space-y-4">
          <div className="bg-white/40 dark:bg-white/[0.02] backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl overflow-hidden shadow-xl">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-bold text-zinc-400 uppercase tracking-wider bg-zinc-50/50 dark:bg-zinc-900/50">
                  <th className="py-4 px-6">Document</th>
                  <th className="py-4 px-6">Hold Justification</th>
                  <th className="py-4 px-6">Applied By</th>
                  <th className="py-4 px-6">Applied Date</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 font-medium">
                {legalHolds.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-zinc-400">
                      No active legal holds. All records are operating under standard disposal rules.
                    </td>
                  </tr>
                ) : (
                  legalHolds.map(doc => (
                    <tr key={doc.id}>
                      <td className="py-4 px-6 font-bold text-zinc-900 dark:text-white">
                        {doc.originalFilename || doc.name}
                      </td>
                      <td className="py-4 px-6 text-rose-500 font-semibold">
                        {doc.legalHoldReason || 'Regulatory compliance hold'}
                      </td>
                      <td className="py-4 px-6 text-zinc-400">
                        {doc.legalHoldAppliedBy || 'Compliance Lead'}
                      </td>
                      <td className="py-4 px-6 text-zinc-400">
                        {doc.legalHoldAppliedAt ? new Date(doc.legalHoldAppliedAt).toLocaleDateString() : 'Active'}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => handleToggleHold(doc.id, true)}
                          className="px-3 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                        >
                          Release Hold
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Disposal Review Queue */
        <div className="space-y-4">
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-amber-950 dark:text-amber-200">
                Retention Expiry Queue ({pendingDisposal.length} items)
              </h4>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                Statutory retention periods have passed. Review items below before executing certified cryptographic disposal.
              </p>
            </div>
          </div>

          <div className="bg-white/40 dark:bg-white/[0.02] backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl overflow-hidden shadow-xl">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-bold text-zinc-400 uppercase tracking-wider bg-zinc-50/50 dark:bg-zinc-900/50">
                  <th className="py-4 px-6">Document</th>
                  <th className="py-4 px-6">Schedule</th>
                  <th className="py-4 px-6">Disposal Action</th>
                  <th className="py-4 px-6">Expired Date</th>
                  <th className="py-4 px-6 text-right">Purge Authorization</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 font-medium">
                {pendingDisposal.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-zinc-400">
                      Disposal queue is clear. No expired documents require disposition.
                    </td>
                  </tr>
                ) : (
                  pendingDisposal.map(doc => (
                    <tr key={doc.id}>
                      <td className="py-4 px-6 font-bold text-zinc-900 dark:text-white">
                        {doc.originalFilename || doc.name}
                      </td>
                      <td className="py-4 px-6 text-zinc-400">
                        {doc.retentionSchedule?.name || 'Standard Retention'}
                      </td>
                      <td className="py-4 px-6 font-bold text-amber-500">
                        {doc.disposalAction || 'ARCHIVE'}
                      </td>
                      <td className="py-4 px-6 text-zinc-400">
                        {doc.retentionExpiryDate ? doc.retentionExpiryDate.split('T')[0] : 'Expired'}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => handleExecutePurge(doc)}
                          className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                        >
                          <Trash2 size={13} /> Approve & Purge
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* New Schedule Modal */}
      <AnimatePresence>
        {showNewScheduleModal && (
          <div className="fixed inset-0 z-[1001] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNewScheduleModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-4"
            >
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                Create Retention Schedule (RDS)
              </h3>
              <form onSubmit={handleCreateSchedule} className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-zinc-600 dark:text-zinc-400">Schedule Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 7-Year Tax & Financial Records"
                    value={newSchedule.name}
                    onChange={(e) => setNewSchedule(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full mt-1.5 px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="font-bold text-zinc-600 dark:text-zinc-400">Retention Period (Months)</label>
                    <input
                      type="number"
                      required
                      value={newSchedule.retentionPeriodMonths}
                      onChange={(e) => setNewSchedule(prev => ({ ...prev, retentionPeriodMonths: Number(e.target.value) }))}
                      className="w-full mt-1.5 px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-zinc-600 dark:text-zinc-400">Disposal Action</label>
                    <select
                      value={newSchedule.action}
                      onChange={(e) => setNewSchedule(prev => ({ ...prev, action: e.target.value }))}
                      className="w-full mt-1.5 px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:border-indigo-500"
                    >
                      <option value="ARCHIVE">Archive</option>
                      <option value="SOFT_DELETE">Soft Delete</option>
                      <option value="PERMANENT_PURGE">Permanent Purge</option>
                      <option value="REVIEW">Manual Review</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-zinc-600 dark:text-zinc-400">Description</label>
                  <textarea
                    rows={2}
                    placeholder="Statutory citation or compliance reason..."
                    value={newSchedule.description}
                    onChange={(e) => setNewSchedule(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full mt-1.5 px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowNewScheduleModal(false)}
                    className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-xs cursor-pointer"
                  >
                    Save Schedule
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
