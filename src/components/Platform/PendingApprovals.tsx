import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Building2,
  User,
  ArrowRight
} from 'lucide-react';
import { motion } from 'motion/react';
import { usePlatform } from '../../hooks/usePlatform';
import { toast } from 'sonner';

interface PendingApprovalsProps {
  onRefresh: () => void;
}

export const PendingApprovals = ({ onRefresh }: PendingApprovalsProps) => {
  const { tenant } = usePlatform();
  const [pendingItems, setPendingItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPending();
  }, []);

  const fetchPending = async () => {
    try {
      const res = await fetch('/api/people-organisations/approvals', {
        headers: { 'x-tenant-id': tenant?.id || '' }
      });
      const data = await res.json();
      setPendingItems(data);
    } catch (err) {
      console.error('Failed to fetch pending approvals:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const res = await fetch(`/api/people-organisations/${id}/approve`, {
        method: 'PATCH',
        headers: { 'x-tenant-id': tenant?.id || '' }
      });
      if (res.ok) {
        toast.success('Record approved and activated');
        fetchPending();
        onRefresh();
      }
    } catch (err) {
      toast.error('Failed to approve record');
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-3 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
        <p className="text-sm font-medium text-zinc-500 text-center">Scanning swarm payloads for review...</p>
      </div>
    );
  }

  if (pendingItems.length === 0) {
    return (
      <div className="py-24 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl bg-zinc-50/50 dark:bg-zinc-900/50">
        <div className="max-w-xs mx-auto space-y-3">
          <div className="w-16 h-16 bg-white dark:bg-zinc-900 rounded-3xl flex items-center justify-center mx-auto text-emerald-500 border border-emerald-500/20 shadow-xl shadow-emerald-500/5">
            <CheckCircle2 size={32} />
          </div>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white">All caught up!</h3>
          <p className="text-sm text-zinc-500">There are no people or organisations awaiting swarm-to-human approval at this time.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      {pendingItems.map((entity, i) => (
        <motion.div
          key={entity.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.1 }}
          className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${
                entity.partyType === 'PERSON' 
                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-600' 
                  : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-600'
              }`}>
                {entity.partyType === 'PERSON' ? <User size={24} /> : <Building2 size={24} />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                    {entity.partyType === 'PERSON' 
                      ? `${entity.person?.firstName} ${entity.person?.lastName}`
                      : entity.organization?.legalName}
                  </h3>
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-500 text-[10px] font-bold uppercase tracking-wider">
                    Review Required
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-zinc-500">Proposed by</span>
                  <div className="flex items-center gap-1.5 px-2 py-0.5 bg-purple-500/10 border border-purple-500/20 rounded-lg text-purple-600 dark:text-purple-400">
                    <ShieldCheck size={12} />
                    <span className="text-[10px] font-bold">SWARM::AUTONOMOUS</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
               <button className="p-2 text-zinc-400 hover:text-red-500 transition-colors">
                  <XCircle size={18} />
               </button>
            </div>
          </div>

          <div className="mt-6 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-200 dark:border-zinc-700/50">
            <div className="flex items-start gap-3">
              <AlertCircle size={16} className="text-zinc-400 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Creation Context</p>
                <p className="text-sm text-zinc-600 dark:text-zinc-300 mt-1 italic">
                  "{entity.creationContextLog || 'No context log provided by autonomous swarm.'}"
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between gap-4">
            <button className="text-sm font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white flex items-center gap-1.5 transition-colors">
              <ExternalLink size={14} />
              View Full Profile
            </button>
            <div className="flex items-center gap-3">
              <button className="px-4 py-2 text-sm font-bold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
                Request Clarification
              </button>
              <button 
                onClick={() => handleApprove(entity.id)}
                className="px-6 py-2 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-500 transition-all shadow-xl shadow-emerald-500/20 flex items-center gap-2"
              >
                <CheckCircle2 size={16} />
                <span>Verify & Activate</span>
              </button>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};
