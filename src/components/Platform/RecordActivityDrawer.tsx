import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  History, 
  X, 
  ArrowUpDown, 
  Search, 
  Download, 
  Send, 
  Loader2, 
  Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import { API_BASE_URL } from '../../config';
import { useAuth } from '../../hooks/useAuth';
import { usePlatform } from '../../hooks/usePlatform';
import { ActivityEventCard, ActivityEvent } from './ActivityEventCard';

interface RecordActivityDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  recordId: string;
  recordKey?: string;
  recordTitle?: string;
  moduleName?: string;
  moduleId?: string;
}

type FilterCategory = 'ALL' | 'FIELD' | 'STATUS' | 'ASSIGNMENT' | 'CREATION' | 'COMMENT';

export const RecordActivityDrawer: React.FC<RecordActivityDrawerProps> = ({
  isOpen,
  onClose,
  recordId,
  recordKey,
  recordTitle,
  moduleName,
  moduleId
}) => {
  const { session } = useAuth();
  const { tenant } = usePlatform();
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [selectedCategory, setSelectedCategory] = useState<FilterCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Cache last active record metadata so exit animation displays smoothly without flash of blank text
  const recordInfoRef = useRef({
    recordId,
    recordKey,
    recordTitle,
    moduleName,
    moduleId
  });

  if (recordId) {
    recordInfoRef.current = {
      recordId,
      recordKey,
      recordTitle,
      moduleName,
      moduleId
    };
  }

  const activeRecordId = recordId || recordInfoRef.current.recordId;
  const activeRecordKey = recordKey || recordInfoRef.current.recordKey;
  const activeRecordTitle = recordTitle || recordInfoRef.current.recordTitle;
  const activeModuleName = moduleName || recordInfoRef.current.moduleName;

  // Escape key listener to close drawer smoothly
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll while drawer is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  const fetchEvents = async () => {
    const targetId = activeRecordId;
    if (!targetId || !tenant?.id) return;
    setLoading(true);
    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token || '';
      const res = await fetch(`${API_BASE_URL}/api/audit/${targetId}?order=${sortOrder}`, {
        headers: {
          'x-tenant-id': tenant.id,
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
      } else {
        console.error('Failed to load activity logs:', await res.text());
      }
    } catch (err) {
      console.error('Error fetching activity events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchEvents();
    }
  }, [isOpen, recordId, sortOrder, tenant?.id]);

  // Real-time updates via global socket
  useEffect(() => {
    if (!isOpen || !recordId) return;
    const socket = (window as any)._auroraSocket;
    if (!socket) return;

    const handleNewActivity = (activity: any) => {
      if (activity.resourceId === recordId) {
        setEvents(prev => {
          if (prev.some(e => e.id === activity.id)) return prev;
          return sortOrder === 'desc' ? [activity, ...prev] : [...prev, activity];
        });
      }
    };

    socket.on('RECORD_ACTIVITY', handleNewActivity);
    return () => {
      socket.off('RECORD_ACTIVITY', handleNewActivity);
    };
  }, [isOpen, recordId, sortOrder]);

  // Filtered list
  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      if (selectedCategory !== 'ALL') {
        if (selectedCategory === 'STATUS' && event.category !== 'STATUS' && event.category !== 'WORKFLOW') {
          return false;
        } else if (selectedCategory !== 'STATUS' && event.category !== selectedCategory) {
          return false;
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesDesc = event.description?.toLowerCase().includes(q);
        const matchesActor = event.actor?.name?.toLowerCase().includes(q);
        const matchesAction = event.action?.toLowerCase().includes(q);
        const matchesDiffs = (event.changes || []).some(
          c => c.fieldLabel?.toLowerCase().includes(q) || 
               String(c.newValue)?.toLowerCase().includes(q) || 
               String(c.oldValue)?.toLowerCase().includes(q)
        );
        if (!matchesDesc && !matchesActor && !matchesAction && !matchesDiffs) {
          return false;
        }
      }

      return true;
    });
  }, [events, selectedCategory, searchQuery]);

  const handlePostComment = async () => {
    if (!newComment.trim() || !recordId || !tenant?.id) return;
    setSubmittingComment(true);
    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token || '';
      const res = await fetch(`${API_BASE_URL}/api/audit/${recordId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenant.id,
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          comment: newComment.trim(),
          moduleId,
          moduleName,
          resourceKey: recordKey,
          resourceTitle: recordTitle
        })
      });

      if (res.ok) {
        setNewComment('');
        toast.success('Note posted to activity feed');
        await fetchEvents();
      } else {
        toast.error('Failed to post comment');
      }
    } catch (err) {
      toast.error('Error posting comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleExportCSV = () => {
    if (events.length === 0) {
      toast.error('No activity data to export');
      return;
    }

    const headers = ['Timestamp', 'Actor Name', 'Actor Email', 'Action', 'Category', 'Description', 'Field Changes'];
    const rows = events.map(e => [
      new Date(e.timestamp).toISOString(),
      `"${(e.actor?.name || 'System').replace(/"/g, '""')}"`,
      `"${(e.actor?.email || '').replace(/"/g, '""')}"`,
      `"${e.action}"`,
      `"${e.category}"`,
      `"${(e.description || '').replace(/"/g, '""')}"`,
      `"${(e.changes || []).map(c => `${c.fieldLabel}: ${c.oldValue} -> ${c.newValue}`).join('; ').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Audit_Trail_${recordKey || recordId}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Audit trail exported to CSV');
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="activity-drawer-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          onClick={onClose}
          className="fixed inset-0 z-[99998] bg-zinc-950/60 backdrop-blur-xs cursor-pointer"
        />
      )}
      {isOpen && (
        <motion.div
          key="activity-drawer-panel"
          ref={drawerRef}
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%', transition: { type: 'spring', damping: 30, stiffness: 300 } }}
          transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          className="fixed inset-y-0 right-0 z-[99999] w-full max-w-xl bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col overflow-hidden"
        >
          {/* Header */}
            <div className="p-5 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/50 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20 shrink-0">
                    <History size={18} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                        Activity & Audit Trail
                      </h2>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shrink-0">
                        {events.length} {events.length === 1 ? 'event' : 'events'}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                      {activeModuleName ? `${activeModuleName} • ` : ''}{activeRecordKey || activeRecordTitle || activeRecordId}
                    </p>
                  </div>
                </div>

            <div className="flex items-center gap-1 shrink-0">
              {/* Chronological Sort Toggle */}
              <button
                type="button"
                onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                className="h-8 px-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700/80 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title={sortOrder === 'desc' ? 'Showing Newest First (Click for Oldest First)' : 'Showing Oldest First (Click for Newest First)'}
              >
                <ArrowUpDown size={12} className="text-indigo-500" />
                <span className="hidden sm:inline">{sortOrder === 'desc' ? 'Newest' : 'Oldest'}</span>
              </button>

              {/* CSV Export */}
              <button
                type="button"
                onClick={handleExportCSV}
                className="w-8 h-8 rounded-lg border border-zinc-200 dark:border-zinc-700/80 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                title="Export Audit Trail to CSV"
              >
                <Download size={13} />
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-lg border border-zinc-200 dark:border-zinc-700/80 bg-white dark:bg-zinc-800 text-zinc-400 hover:text-zinc-900 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Search & Category Filter Bar */}
          <div className="space-y-2 pt-1">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Search audit changes, fields, or users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Filter Category Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {[
                { id: 'ALL', label: 'All' },
                { id: 'FIELD', label: 'Fields' },
                { id: 'STATUS', label: 'Status & Workflow' },
                { id: 'ASSIGNMENT', label: 'Assignees' },
                { id: 'CREATION', label: 'Creation' },
                { id: 'COMMENT', label: 'Notes' }
              ].map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id as FilterCategory)}
                  className={cn(
                    "px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border",
                    selectedCategory === cat.id
                      ? "bg-indigo-600 dark:bg-indigo-600 text-white border-indigo-500 shadow-xs"
                      : "bg-zinc-100 dark:bg-zinc-800/70 border-zinc-200/60 dark:border-zinc-700/60 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/80 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-zinc-200"
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Timeline Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3 custom-scrollbar">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-zinc-400">
              <Loader2 size={24} className="animate-spin text-indigo-500" />
              <p className="text-xs font-medium">Loading audit history...</p>
            </div>
          ) : filteredEvents.length > 0 ? (
            <div className="space-y-2.5">
              {filteredEvents.map((ev) => (
                <ActivityEventCard key={ev.id} event={ev} showResourceLink={false} />
              ))}
            </div>
          ) : (
            <div className="py-20 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto text-zinc-400">
                <Clock size={20} />
              </div>
              <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                {searchQuery || selectedCategory !== 'ALL' ? 'No matching activity found' : 'No activity logged yet'}
              </p>
              <p className="text-[11px] text-zinc-400 max-w-xs mx-auto">
                {searchQuery || selectedCategory !== 'ALL'
                  ? 'Try adjusting your search terms or filter selection.'
                  : 'Changes to values, assignees, status transitions, and notes will automatically appear here.'}
              </p>
            </div>
          )}
        </div>

        {/* Bottom Note/Comment Composer */}
        <div className="p-3.5 border-t border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/50">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handlePostComment();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Add an internal audit note or comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="flex-1 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={submittingComment || !newComment.trim()}
              className="h-8 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-40 shadow-xs"
            >
              {submittingComment ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <>
                  <Send size={11} />
                  <span>Post</span>
                </>
              )}
            </button>
          </form>
        </div>
      </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};
