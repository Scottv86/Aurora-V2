import React, { useState, useEffect } from 'react';
import { Share2, Lock, Users, Building, Search, X, UserPlus, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { usePlatform } from '../../hooks/usePlatform';
import { useAuth } from '../../hooks/useAuth';

interface TenantMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  role?: string;
  position?: string;
  avatarUrl?: string;
  isSynthetic?: boolean;
}

interface ChatSession {
  id: string;
  title: string;
  userId?: string | null;
  isSharedWithTenant?: boolean;
  sharedWithUserIds?: string[] | any;
  metadata: any;
  createdAt: string;
  updatedAt: string;
}

interface ShareChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: ChatSession | null;
  onUpdateSession: (updated: ChatSession) => void;
  currentUserId?: string;
}

export const ShareChatModal: React.FC<ShareChatModalProps> = ({
  isOpen,
  onClose,
  session,
  onUpdateSession,
  currentUserId
}) => {
  const { members: platformMembers, tenant } = usePlatform();
  const { session: authSession } = useAuth();
  const [members, setMembers] = useState<TenantMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSharedWithTenant, setIsSharedWithTenant] = useState(false);
  const [sharedWithUserIds, setSharedWithUserIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (session && isOpen) {
      setIsSharedWithTenant(!!session.isSharedWithTenant);
      let initialShared: string[] = [];
      if (Array.isArray(session.sharedWithUserIds)) {
        initialShared = session.sharedWithUserIds;
      } else if (typeof session.sharedWithUserIds === 'string') {
        try { initialShared = JSON.parse(session.sharedWithUserIds); } catch (e) {}
      }
      setSharedWithUserIds(initialShared);

      if (platformMembers && platformMembers.length > 0) {
        const humanMembers = platformMembers.filter((m: any) => !m.isSynthetic);
        setMembers(humanMembers as any[]);
      }
      fetchMembers();
    }
  }, [session, isOpen, platformMembers]);

  const fetchMembers = async () => {
    try {
      setLoadingMembers(true);
      const activeTenantId = tenant?.id || localStorage.getItem('aurora_tenant_id') || 'default-tenant';
      const token = authSession?.access_token || (import.meta as any).env.VITE_DEV_TOKEN || localStorage.getItem('aurora_token') || '';
      const res = await fetch('http://127.0.0.1:3001/api/members', {
        headers: {
          'x-tenant-id': activeTenantId,
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        const humanMembers = Array.isArray(data) ? data.filter((m: TenantMember) => !m.isSynthetic) : [];
        if (humanMembers.length > 0) {
          setMembers(humanMembers);
        }
      }
    } catch (err) {
      console.error('[ShareChatModal] Failed to fetch members:', err);
    } finally {
      setLoadingMembers(false);
    }
  };

  if (!isOpen || !session) return null;

  const isOwner = !session.userId || session.userId === currentUserId;

  const handleToggleUser = (userId: string) => {
    if (!isOwner) return;
    if (sharedWithUserIds.includes(userId)) {
      setSharedWithUserIds(sharedWithUserIds.filter(id => id !== userId));
    } else {
      setSharedWithUserIds([...sharedWithUserIds, userId]);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const activeTenantId = tenant?.id || localStorage.getItem('aurora_tenant_id') || 'default-tenant';
      const token = authSession?.access_token || (import.meta as any).env.VITE_DEV_TOKEN || localStorage.getItem('aurora_token') || '';
      const res = await fetch(`http://127.0.0.1:3001/api/antigravity/sessions/${session.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': activeTenantId,
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          isSharedWithTenant,
          sharedWithUserIds
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update sharing settings');
      }

      const updated = await res.json();
      onUpdateSession(updated);
      toast.success(
        isSharedWithTenant
          ? 'Chat shared with entire organization'
          : sharedWithUserIds.length > 0
          ? `Chat shared with ${sharedWithUserIds.length} team member(s)`
          : 'Chat is now private to you'
      );
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update sharing settings');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredMembers = members.filter(m =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Share2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                Share Conversation
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate max-w-[280px]">
                {session.title || 'Untitled Session'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Shared with Organization Toggle */}
          <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Building className="h-4 w-4 text-indigo-500" />
                <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Share with Entire Organization
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isSharedWithTenant}
                  disabled={!isOwner}
                  onChange={(e) => setIsSharedWithTenant(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:after:border-zinc-600 peer-checked:bg-indigo-600"></div>
              </label>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              When enabled, any member of your organization can search, view, and read this chat history.
            </p>
          </div>

          {/* Specific Members Section */}
          {!isSharedWithTenant && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" /> Share with Specific Members
                </label>
                <span className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
                  {sharedWithUserIds.length} selected
                </span>
              </div>

              {/* Search input */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search team members by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Members List */}
              <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                {loadingMembers ? (
                  <div className="py-6 text-center text-xs text-zinc-400">Loading team members...</div>
                ) : filteredMembers.length === 0 ? (
                  <div className="py-6 text-center text-xs text-zinc-400">No matching team members found.</div>
                ) : (
                  filteredMembers.map((member) => {
                    const isSelected = sharedWithUserIds.includes(member.userId);
                    const isSelf = member.userId === currentUserId;

                    return (
                      <div
                        key={member.id}
                        onClick={() => !isSelf && handleToggleUser(member.userId)}
                        className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                          isSelf
                            ? 'opacity-60 bg-zinc-100 dark:bg-zinc-800/30 border-transparent cursor-default'
                            : isSelected
                            ? 'bg-indigo-50/60 dark:bg-indigo-950/40 border-indigo-200/80 dark:border-indigo-800/80 cursor-pointer'
                            : 'bg-white dark:bg-zinc-900 border-zinc-200/60 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {member.avatarUrl ? (
                            <img src={member.avatarUrl} alt={member.name} className="w-7 h-7 rounded-full object-cover shrink-0" />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center justify-center shrink-0">
                              {member.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate flex items-center gap-1.5">
                              {member.name}
                              {isSelf && (
                                <span className="text-[10px] bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-1.5 py-0.2 rounded font-normal">
                                  Owner
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                              {member.email}
                            </div>
                          </div>
                        </div>

                        {!isSelf && (
                          <button
                            type="button"
                            disabled={!isOwner}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleUser(member.userId);
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                              isSelected
                                ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
                                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                            }`}
                          >
                            {isSelected ? (
                              <>
                                <UserCheck size={13} /> Shared
                              </>
                            ) : (
                              <>
                                <UserPlus size={13} /> Share
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
            {isSharedWithTenant ? (
              <>
                <Building size={14} className="text-indigo-500" /> Accessible by entire org
              </>
            ) : sharedWithUserIds.length > 0 ? (
              <>
                <Users size={14} className="text-indigo-500" /> Shared with {sharedWithUserIds.length} team member(s)
              </>
            ) : (
              <>
                <Lock size={14} className="text-amber-500" /> Private conversation
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !isOwner}
              className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl shadow-md transition-all flex items-center gap-1.5"
            >
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
