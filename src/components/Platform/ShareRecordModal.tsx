import React, { useState, useEffect, useMemo } from 'react';
import { 
  Share2, 
  Search, 
  X, 
  UserCheck, 
  UserPlus, 
  Copy, 
  Check, 
  MessageSquare, 
  Users, 
  Send,
  Loader2,
  FileText,
  Building
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { usePlatform } from '../../hooks/usePlatform';
import { useAuth } from '../../hooks/useAuth';
import { UserAvatarWithPresence } from '../Common/UserPresenceBadge';
import { DATA_API_URL } from '../../config';
import { cn } from '../../lib/utils';

export interface ShareRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: any;
  moduleId?: string;
  moduleName?: string;
  recordTitle?: string;
  onShared?: (recipientIds: string[]) => void;
}

export const ShareRecordModal: React.FC<ShareRecordModalProps> = ({
  isOpen,
  onClose,
  record,
  moduleId: explicitModuleId,
  moduleName: explicitModuleName,
  recordTitle: explicitRecordTitle,
  onShared
}) => {
  const { members = [], tenant, user: platformUser, modules = [] } = usePlatform();
  const { session } = useAuth();
  
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [message, setMessage] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const recordId = record?.id || (typeof record === 'string' ? record : '');
  const resolvedModuleId = explicitModuleId || record?.moduleId || '';
  
  const resolvedModule = useMemo(() => {
    return modules.find(m => m.id === resolvedModuleId);
  }, [modules, resolvedModuleId]);

  const moduleName = explicitModuleName || resolvedModule?.name || 'Record';

  const recordTitle = useMemo(() => {
    if (explicitRecordTitle) return explicitRecordTitle;
    if (!record) return 'Record';
    return (
      record.name ||
      record.title ||
      record.subject ||
      record.ticketNumber ||
      record.caseNumber ||
      record.displayName ||
      record._record_key ||
      `Record #${String(recordId).slice(-6)}`
    );
  }, [explicitRecordTitle, record, recordId]);

  const directUrl = useMemo(() => {
    const origin = window.location.origin;
    if (resolvedModuleId && recordId) {
      return `${origin}/workspace/modules/${resolvedModuleId}/records/${recordId}`;
    }
    return `${origin}/workspace`;
  }, [resolvedModuleId, recordId]);

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setSelectedMemberIds([]);
      setSearchQuery('');
      setMessage('');
      setIsSharing(false);
      setCopiedLink(false);
    }
  }, [isOpen]);

  const currentMemberId = platformUser?.memberId || platformUser?.cuid;
  const currentUserId = platformUser?.id;

  // Filter valid human members
  const eligibleMembers = useMemo(() => {
    return (members || []).filter(m => !m.isSynthetic);
  }, [members]);

  const filteredMembers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return eligibleMembers;
    return eligibleMembers.filter(m => 
      m.name?.toLowerCase().includes(query) ||
      m.email?.toLowerCase().includes(query) ||
      (m.position && m.position.toLowerCase().includes(query)) ||
      (m.team && m.team.toLowerCase().includes(query))
    );
  }, [eligibleMembers, searchQuery]);

  const handleToggleMember = (memberId: string) => {
    setSelectedMemberIds(prev => 
      prev.includes(memberId) ? prev.filter(id => id !== memberId) : [...prev, memberId]
    );
  };

  const handleSelectAllFiltered = () => {
    const ids = filteredMembers.map(m => m.id);
    const allSelected = ids.every(id => selectedMemberIds.includes(id));
    if (allSelected) {
      setSelectedMemberIds(prev => prev.filter(id => !ids.includes(id)));
    } else {
      setSelectedMemberIds(prev => Array.from(new Set([...prev, ...ids])));
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(directUrl);
      setCopiedLink(true);
      toast.success('Record link copied to clipboard');
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (err) {
      toast.error('Failed to copy link');
    }
  };

  const handleShare = async () => {
    if (selectedMemberIds.length === 0) {
      toast.error('Please select at least one team member to share with');
      return;
    }

    if (!tenant?.id || !recordId) {
      toast.error('Missing tenant or record ID');
      return;
    }

    try {
      setIsSharing(true);
      const token = session?.access_token || (import.meta as any).env.VITE_DEV_TOKEN || '';
      
      const selectedMembers = members.filter(m => selectedMemberIds.includes(m.id));
      const recipientUserIds = selectedMembers.map(m => m.userId).filter(Boolean);
      const recipientEmails = selectedMembers.map(m => m.email).filter(Boolean);

      const senderName = platformUser 
        ? `${platformUser.firstName || ''} ${platformUser.lastName || ''}`.trim() || platformUser.name || 'Team Member'
        : 'Team Member';

      const payload = {
        recipientMemberIds: selectedMemberIds,
        recipientUserIds,
        recipientEmails,
        message: message.trim(),
        moduleId: resolvedModuleId,
        moduleName,
        recordTitle,
        sharedBy: {
          id: currentUserId || currentMemberId,
          name: senderName,
          email: platformUser?.email,
          avatarUrl: platformUser?.avatarUrl
        }
      };

      const res = await fetch(`${DATA_API_URL}/records/${recordId}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenant.id,
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to share record');
      }

      const names = selectedMembers.map(m => m.name).join(', ');
      toast.success(`Record shared with ${selectedMembers.length === 1 ? names : `${selectedMembers.length} team members`}`);
      
      onShared?.(selectedMemberIds);
      onClose();
    } catch (err: any) {
      console.error('[ShareRecordModal] Error sharing record:', err);
      toast.error(err.message || 'Failed to share record');
    } finally {
      setIsSharing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                <Share2 className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100 truncate">
                  Share Record
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate max-w-[280px] sm:max-w-sm">
                  {recordTitle} • {moduleName}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
            {/* Direct Link Box */}
            <div className="p-3 bg-zinc-50 dark:bg-zinc-950/60 rounded-xl border border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
                <span className="text-xs text-zinc-600 dark:text-zinc-300 font-mono truncate select-all">
                  {directUrl}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3 py-1.5 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-200 rounded-lg shadow-xs transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                {copiedLink ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
              </button>
            </div>

            {/* Member Picker Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" /> Share with Team Members
                </label>
                <div className="flex items-center gap-2">
                  {filteredMembers.length > 0 && (
                    <button
                      type="button"
                      onClick={handleSelectAllFiltered}
                      className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                    >
                      {filteredMembers.every(m => selectedMemberIds.includes(m.id)) ? 'Deselect All' : 'Select All'}
                    </button>
                  )}
                  <span className="text-xs text-zinc-400 font-medium">
                    ({selectedMemberIds.length} selected)
                  </span>
                </div>
              </div>

              {/* Search input */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search members by name, email, role, or team..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>

              {/* Members List */}
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                {filteredMembers.length === 0 ? (
                  <div className="py-6 text-center text-xs text-zinc-400 italic">
                    No matching team members found.
                  </div>
                ) : (
                  filteredMembers.map((member) => {
                    const isSelected = selectedMemberIds.includes(member.id);
                    const isSelf = member.id === currentMemberId || (!!member.userId && member.userId === currentUserId);

                    return (
                      <div
                        key={member.id}
                        onClick={() => handleToggleMember(member.id)}
                        className={cn(
                          "flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer",
                          isSelected
                            ? "bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/80 shadow-xs"
                            : "bg-white dark:bg-zinc-900/60 border-zinc-200/70 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <UserAvatarWithPresence
                            avatarUrl={member.avatarUrl}
                            name={member.name}
                            status={(member as any).status || (member as any).presenceStatus || 'AVAILABLE'}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate flex items-center gap-1.5">
                              <span>{member.name}</span>
                              {isSelf && (
                                <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 px-1.5 py-0.5 rounded font-normal">
                                  You
                                </span>
                              )}
                              {member.team && (
                                <span className="text-[10px] text-zinc-400 truncate font-normal">
                                  • {member.team}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                              {member.email}
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 ml-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleMember(member.id);
                            }}
                            className={cn(
                              "px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer",
                              isSelected
                                ? "bg-indigo-600 text-white shadow-xs"
                                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                            )}
                          >
                            {isSelected ? (
                              <>
                                <UserCheck size={13} /> Selected
                              </>
                            ) : (
                              <>
                                <UserPlus size={13} /> Add
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Optional Personal Note */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5" /> Optional Note
              </label>
              <textarea
                rows={2}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Add a context note or instructions (will be included in notification)..."
                className="w-full bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none transition-all"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
            <div className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
              <Building size={14} className="text-indigo-500" />
              <span>Sends instant in-app & drawer notifications</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSharing}
                className="px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleShare}
                disabled={isSharing || selectedMemberIds.length === 0}
                className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {isSharing ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Sharing...</span>
                  </>
                ) : (
                  <>
                    <Send size={13} />
                    <span>Share ({selectedMemberIds.length})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
