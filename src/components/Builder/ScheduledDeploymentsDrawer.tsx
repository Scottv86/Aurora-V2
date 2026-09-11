import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Calendar, 
  Clock, 
  Play, 
  Trash2, 
  RotateCcw, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  FileCode, 
  Terminal, 
  Lock, 
  Bell, 
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Layers,
  Sparkles,
  Info
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import { ScheduledDeployment, DeploymentStatus } from '../../types/deployments';
import { deploymentQueueService } from '../../utils/deploymentQueueService';

interface ScheduledDeploymentsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  moduleId?: string;
  moduleName?: string;
  onDeployExecuted?: (deployment: ScheduledDeployment) => void;
  onOpenDeployModal?: () => void;
}

export const ScheduledDeploymentsDrawer: React.FC<ScheduledDeploymentsDrawerProps> = ({
  isOpen,
  onClose,
  moduleId,
  moduleName,
  onDeployExecuted,
  onOpenDeployModal
}) => {
  const [deployments, setDeployments] = useState<ScheduledDeployment[]>([]);
  const [filter, setFilter] = useState<'all' | 'scheduled' | 'history'>('all');
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [reschedulingJobId, setReschedulingJobId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<string>('');
  const [executingJobId, setExecutingJobId] = useState<string | null>(null);

  // Load deployments & subscribe
  useEffect(() => {
    const refresh = () => {
      setDeployments(deploymentQueueService.getDeployments(moduleId));
    };
    refresh();
    const unsubscribe = deploymentQueueService.subscribe(refresh);
    return () => unsubscribe();
  }, [moduleId, isOpen]);

  // Periodic timer tick to recalculate countdowns
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(timer);
  }, []);

  const formatCountdown = (dateString: string) => {
    const target = new Date(dateString).getTime();
    const now = Date.now();
    const diff = target - now;

    if (diff <= 0) return 'Ready to execute';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `in ${days}d ${hours % 24}h`;
    }
    if (hours > 0) return `in ${hours}h ${mins}m`;
    return `in ${mins}m`;
  };

  const filteredDeployments = deployments.filter(d => {
    if (filter === 'scheduled') return d.status === 'SCHEDULED' || d.status === 'RUNNING';
    if (filter === 'history') return d.status === 'COMPLETED' || d.status === 'FAILED' || d.status === 'CANCELLED';
    return true;
  });

  const scheduledCount = deployments.filter(d => d.status === 'SCHEDULED').length;

  const handleExecuteNow = async (job: ScheduledDeployment) => {
    setExecutingJobId(job.id);
    toast.loading(`Executing scheduled deployment ${job.versionTag}...`, { id: 'exec-deploy' });
    try {
      const res = await deploymentQueueService.executeDeploymentNow(job.id);
      if (res && res.status === 'COMPLETED') {
        toast.success(`Successfully deployed ${job.versionTag} to database!`, { id: 'exec-deploy' });
        if (onDeployExecuted) {
          onDeployExecuted(res);
        }
      } else {
        toast.error(`Deployment failed: ${res?.error || 'Unknown error'}`, { id: 'exec-deploy' });
      }
    } catch {
      toast.error('Failed to trigger deployment', { id: 'exec-deploy' });
    } finally {
      setExecutingJobId(null);
    }
  };

  const handleCancel = (id: string) => {
    deploymentQueueService.cancelDeployment(id);
    toast.success('Scheduled deployment cancelled');
  };

  const handleRescheduleSubmit = (id: string) => {
    if (!rescheduleDate) {
      toast.error('Please select a valid date and time');
      return;
    }
    const iso = new Date(rescheduleDate).toISOString();
    deploymentQueueService.rescheduleDeployment(id, iso);
    setReschedulingJobId(null);
    setRescheduleDate('');
    toast.success('Deployment rescheduled successfully');
  };

  const handleDeleteRecord = (id: string) => {
    deploymentQueueService.deleteDeploymentRecord(id);
    toast.success('Deployment log removed');
  };

  const getStatusBadge = (status: DeploymentStatus) => {
    switch (status) {
      case 'SCHEDULED':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">SCHEDULED</span>;
      case 'RUNNING':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1"><RefreshCw size={10} className="animate-spin" /> RUNNING</span>;
      case 'COMPLETED':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1"><CheckCircle2 size={10} /> COMPLETED</span>;
      case 'FAILED':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center gap-1"><ShieldAlert size={10} /> FAILED</span>;
      case 'CANCELLED':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-500/20">CANCELLED</span>;
    }
  };

  const getRiskBadge = (risk: 'safe' | 'warning' | 'critical') => {
    switch (risk) {
      case 'safe':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">Safe</span>;
      case 'warning':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400">Warning</span>;
      case 'critical':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400">Critical</span>;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />

          {/* Slide-over Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="absolute inset-y-0 right-0 max-w-xl w-full bg-white dark:bg-zinc-900 shadow-2xl border-l border-zinc-200 dark:border-zinc-800 flex flex-col z-10"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/60 dark:bg-zinc-900/60">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center border border-indigo-500/20">
                  <Calendar size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                    Scheduled Deployments Queue
                    {scheduledCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white">
                        {scheduledCount} active
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-zinc-500">
                    {moduleName ? `Automated maintenance pipeline for ${moduleName}` : 'Manage scheduled database DDL migrations'}
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Filter Tabs */}
            <div className="px-6 py-2.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/30 dark:bg-zinc-900/30">
              <div className="flex items-center gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-800/80 rounded-xl border border-zinc-200 dark:border-zinc-700/60">
                <button
                  onClick={() => setFilter('all')}
                  className={cn(
                    "px-3 py-1 text-xs font-bold rounded-lg transition-all",
                    filter === 'all'
                      ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm"
                      : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
                  )}
                >
                  All ({deployments.length})
                </button>
                <button
                  onClick={() => setFilter('scheduled')}
                  className={cn(
                    "px-3 py-1 text-xs font-bold rounded-lg transition-all",
                    filter === 'scheduled'
                      ? "bg-white dark:bg-zinc-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                      : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
                  )}
                >
                  Scheduled ({scheduledCount})
                </button>
                <button
                  onClick={() => setFilter('history')}
                  className={cn(
                    "px-3 py-1 text-xs font-bold rounded-lg transition-all",
                    filter === 'history'
                      ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm"
                      : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
                  )}
                >
                  History ({deployments.length - scheduledCount})
                </button>
              </div>

              {onOpenDeployModal && (
                <button
                  onClick={onOpenDeployModal}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                >
                  <Sparkles size={12} />
                  <span>+ Schedule New</span>
                </button>
              )}
            </div>

            {/* Content List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {filteredDeployments.length === 0 ? (
                <div className="text-center py-12 px-4 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mx-auto mb-3">
                    <Clock size={24} />
                  </div>
                  <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">No Deployments in Queue</h4>
                  <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1 mb-4">
                    Stage modifications in the Module Builder and schedule migrations for off-peak maintenance windows.
                  </p>
                  {onOpenDeployModal && (
                    <button
                      onClick={onOpenDeployModal}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all inline-flex items-center gap-2 shadow-md shadow-indigo-500/20"
                    >
                      <Sparkles size={14} />
                      <span>Review & Schedule Deployment</span>
                    </button>
                  )}
                </div>
              ) : (
                filteredDeployments.map(job => {
                  const isExpanded = expandedJobId === job.id;
                  const isRescheduling = reschedulingJobId === job.id;
                  const isExecuting = executingJobId === job.id;

                  return (
                    <div
                      key={job.id}
                      className={cn(
                        "rounded-2xl border transition-all duration-200 overflow-hidden",
                        job.status === 'SCHEDULED' 
                          ? "bg-white dark:bg-zinc-900 border-indigo-200 dark:border-indigo-900/50 shadow-sm"
                          : "bg-zinc-50/60 dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800"
                      )}
                    >
                      {/* Card Header */}
                      <div className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-xs font-bold text-zinc-900 dark:text-white px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                                {job.versionTag}
                              </span>
                              {getStatusBadge(job.status)}
                              {getRiskBadge(job.riskLevel)}
                            </div>
                            <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 mt-1">
                              {job.moduleName}
                            </h4>
                          </div>

                          {job.status === 'SCHEDULED' && (
                            <div className="text-right">
                              <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 justify-end">
                                <Clock size={12} />
                                {formatCountdown(job.scheduledAt)}
                              </span>
                              <span className="text-[10px] text-zinc-400 block mt-0.5">
                                {new Date(job.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Badges & Metrics */}
                        <div className="flex items-center gap-2 flex-wrap text-[11px] text-zinc-500">
                          <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60">
                            {job.changesCount.total} changes ({job.changesCount.added}+, {job.changesCount.modified}~, {job.changesCount.removed}-)
                          </span>
                          {job.maintenanceMode && (
                            <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1">
                              <Lock size={10} /> Maintenance Lock
                            </span>
                          )}
                          {job.notifyUsers && (
                            <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center gap-1">
                              <Bell size={10} /> User Alert
                            </span>
                          )}
                          {job.autoRollback && (
                            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                              <RotateCcw size={10} /> Auto-Rollback
                            </span>
                          )}
                        </div>

                        {/* Reschedule Inline Box */}
                        {isRescheduling && (
                          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl space-y-2 mt-2">
                            <label className="text-xs font-bold text-indigo-950 dark:text-indigo-200 block">
                              Select New Execution Time
                            </label>
                            <input
                              type="datetime-local"
                              value={rescheduleDate}
                              onChange={(e) => setRescheduleDate(e.target.value)}
                              className="w-full px-3 py-1.5 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"
                            />
                            <div className="flex items-center justify-end gap-2 pt-1">
                              <button
                                onClick={() => setReschedulingJobId(null)}
                                className="px-2.5 py-1 text-xs rounded-lg text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleRescheduleSubmit(job.id)}
                                className="px-3 py-1 text-xs font-bold rounded-lg bg-indigo-600 text-white hover:bg-indigo-500"
                              >
                                Confirm Reschedule
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Card Actions */}
                        <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
                          <button
                            onClick={() => setExpandedJobId(isExpanded ? null : job.id)}
                            className="text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 flex items-center gap-1"
                          >
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            <span>{isExpanded ? 'Hide Details & SQL' : 'View SQL & Logs'}</span>
                          </button>

                          <div className="flex items-center gap-1.5">
                            {job.status === 'SCHEDULED' && (
                              <>
                                <button
                                  onClick={() => {
                                    setReschedulingJobId(job.id);
                                    setRescheduleDate(new Date(job.scheduledAt).toISOString().slice(0, 16));
                                  }}
                                  className="px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-800 text-[11px] font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                                >
                                  Reschedule
                                </button>
                                <button
                                  onClick={() => handleCancel(job.id)}
                                  className="px-2.5 py-1 rounded-lg border border-rose-200 dark:border-rose-900/50 text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleExecuteNow(job)}
                                  disabled={isExecuting}
                                  className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-[11px] font-bold text-white transition-all shadow-sm flex items-center gap-1 disabled:opacity-50"
                                >
                                  {isExecuting ? (
                                    <>
                                      <RefreshCw size={11} className="animate-spin" />
                                      <span>Deploying...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Play size={11} />
                                      <span>Deploy Now</span>
                                    </>
                                  )}
                                </button>
                              </>
                            )}

                            {(job.status === 'COMPLETED' || job.status === 'FAILED' || job.status === 'CANCELLED') && (
                              <button
                                onClick={() => handleDeleteRecord(job.id)}
                                className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                                title="Remove Log Record"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Expandable DDL & Execution Logs */}
                      {isExpanded && (
                        <div className="p-4 bg-zinc-950 border-t border-zinc-800 font-mono text-[11px] space-y-3">
                          <div>
                            <div className="flex items-center justify-between text-zinc-400 mb-1.5">
                              <span className="text-[10px] uppercase font-bold text-indigo-400 flex items-center gap-1">
                                <FileCode size={11} /> PostgreSQL DDL Payload
                              </span>
                              <span className="text-[10px] text-zinc-500">
                                {job.generatedSql.split('\n').length} statements
                              </span>
                            </div>
                            <pre className="p-2.5 bg-black/60 rounded-xl text-emerald-400 border border-zinc-800/80 overflow-x-auto max-h-36 overflow-y-auto leading-relaxed whitespace-pre-wrap">
                              {job.generatedSql}
                            </pre>
                          </div>

                          {job.logs && job.logs.length > 0 && (
                            <div>
                              <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-zinc-400 mb-1">
                                <Terminal size={11} /> Audit Trail & Logs
                              </div>
                              <div className="p-2 bg-black/40 rounded-xl border border-zinc-800/60 space-y-1 text-zinc-300 max-h-28 overflow-y-auto">
                                {job.logs.map((log, i) => (
                                  <div key={i} className="leading-snug">{log}</div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/60 flex items-center justify-between text-xs text-zinc-500">
              <span className="flex items-center gap-1.5">
                <Info size={13} className="text-indigo-500" />
                <span>Migrations execute transactionally with rollback safeguards</span>
              </span>
              <button
                onClick={onClose}
                className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
