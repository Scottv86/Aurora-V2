import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Star, 
  Archive, 
  Trash2, 
  Mail, 
  MailOpen, 
  Paperclip, 
  CheckSquare, 
  Square, 
  Layers
} from 'lucide-react';
import { EmailThread, InboxFolder, AdvancedSearchFilters } from '../../../types/inbox';
import { cn } from '../../../lib/utils';

interface InboxThreadListProps {
  threads: EmailThread[];
  selectedThreadId: string | null;
  onSelectThread: (thread: EmailThread) => void;
  selectedFolder: InboxFolder;
  selectedLabel: string | null;
  onStarThread: (threadId: string, currentStarred: boolean, e: React.MouseEvent) => void;
  onArchiveThread: (threadId: string) => void;
  onTrashThread: (threadId: string) => void;
  onMarkRead: (threadId: string, isRead: boolean) => void;
  onBatchAction?: (action: string, threadIds: string[]) => void;
  width?: number;
}

function decodeQp(input: string): string {
  const cleaned = input.replace(/=\r?\n/g, '');
  const bytes: number[] = [];
  for (let i = 0; i < cleaned.length; i++) {
    if (cleaned[i] === '=' && i + 2 < cleaned.length) {
      const hex = cleaned.substring(i + 1, i + 3);
      if (/^[0-9A-Fa-f]{2}$/.test(hex)) {
        bytes.push(parseInt(hex, 16));
        i += 2;
        continue;
      }
    }
    bytes.push(cleaned.charCodeAt(i));
  }
  try {
    return new TextDecoder('utf-8').decode(new Uint8Array(bytes));
  } catch (_) {
    return cleaned.replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  }
}

function getCleanSnippet(snippet?: string, messages?: any[]): string {
  const firstMsg = messages && messages[0];
  const source = (firstMsg?.bodyText || firstMsg?.bodyHtml || snippet || '');
  if (!source) return '';

  let boundary = '';
  const bMatch = source.match(/boundary=["']?([^"';\r\n]+)["']?/i);
  if (bMatch) {
    boundary = bMatch[1].trim();
  } else {
    const lineMatch = source.match(/--([A-Za-z0-9_=-]{6,})(?:\r?\n|$)/);
    if (lineMatch) {
      boundary = lineMatch[1].trim();
    }
  }

  if (boundary && (source.includes('Content-Type:') || source.startsWith('--'))) {
    const boundaryEscaped = boundary.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = source.split(new RegExp(`--${boundaryEscaped}(?:--)?`));

    for (const p of parts) {
      const trimmed = p.trim();
      if (!trimmed || trimmed === '--') continue;

      const splitIdx = trimmed.search(/\r?\n\r?\n/);
      const headers = splitIdx !== -1 ? trimmed.substring(0, splitIdx) : '';
      const body = splitIdx !== -1 ? trimmed.substring(splitIdx).replace(/^\r?\n\r?\n/, '') : trimmed;

      const isPlain = /Content-Type:\s*text\/plain/i.test(headers);
      const isHtml = /Content-Type:\s*text\/html/i.test(headers);

      let decoded = decodeQp(body);
      if (isPlain && decoded.trim()) {
        return decoded.replace(/\s+/g, ' ').substring(0, 140).trim();
      }
      if (isHtml && decoded.trim()) {
        const clean = decoded.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                             .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                             .replace(/<[^>]+>/g, ' ')
                             .replace(/\s+/g, ' ')
                             .trim();
        if (clean) return clean.substring(0, 140).trim();
      }
    }
  }

  let text = decodeQp(source)
    .replace(/--[A-Za-z0-9_-]+/g, '')
    .replace(/Content-Type:[^\r\n]+/gi, '')
    .replace(/Content-Transfer-Encoding:[^\r\n]+/gi, '')
    .replace(/charset=[^\r\n]+/gi, '')
    .replace(/boundary=[^\r\n]+/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[A-Za-z0-9+/=]{40,}/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return text.substring(0, 140).trim();
}

export const InboxThreadList: React.FC<InboxThreadListProps> = ({
  threads,
  selectedThreadId,
  onSelectThread,
  selectedFolder: _selectedFolder,
  selectedLabel: _selectedLabel,
  onStarThread,
  onArchiveThread,
  onTrashThread,
  onMarkRead,
  onBatchAction: _onBatchAction,
  width = 360
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'starred' | 'attachments' | 'records'>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Advanced Search Modal / Dropdown State
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [advFilters, setAdvFilters] = useState<AdvancedSearchFilters>({
    from: '',
    to: '',
    subject: '',
    hasAttachments: false,
    dateRange: 'all',
    status: 'ALL',
    hasLinkedRecord: false
  });

  const handleResetFilters = () => {
    setAdvFilters({
      from: '',
      to: '',
      subject: '',
      hasAttachments: false,
      dateRange: 'all',
      status: 'ALL',
      hasLinkedRecord: false
    });
  };

  const activeAdvFilterCount = useMemo(() => {
    let count = 0;
    if (advFilters.from?.trim()) count++;
    if (advFilters.to?.trim()) count++;
    if (advFilters.subject?.trim()) count++;
    if (advFilters.hasAttachments) count++;
    if (advFilters.dateRange && advFilters.dateRange !== 'all') count++;
    if (advFilters.status && advFilters.status !== 'ALL') count++;
    if (advFilters.hasLinkedRecord) count++;
    return count;
  }, [advFilters]);

  // Filtered threads
  const filteredThreads = useMemo(() => {
    return threads.filter(t => {
      // 1. Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches = 
          (t.subject || '').toLowerCase().includes(q) ||
          (t.from?.name || '').toLowerCase().includes(q) ||
          (t.from?.address || '').toLowerCase().includes(q) ||
          (t.snippet || '').toLowerCase().includes(q);
        if (!matches) return false;
      }

      // 2. Advanced Search Filters
      if (advFilters.from?.trim()) {
        const f = advFilters.from.toLowerCase();
        if (!(t.from?.name || '').toLowerCase().includes(f) && !(t.from?.address || '').toLowerCase().includes(f)) {
          return false;
        }
      }

      if (advFilters.to?.trim()) {
        const toVal = advFilters.to.toLowerCase();
        const matchesTo = (t.to || []).some(rcpt => (rcpt?.name || '').toLowerCase().includes(toVal) || (rcpt?.address || '').toLowerCase().includes(toVal));
        if (!matchesTo) return false;
      }

      if (advFilters.subject?.trim()) {
        if (!(t.subject || '').toLowerCase().includes(advFilters.subject.toLowerCase())) {
          return false;
        }
      }

      if (advFilters.hasAttachments) {
        const hasAtt = t.messages.some(m => m.attachments && m.attachments.length > 0);
        if (!hasAtt) return false;
      }

      if (advFilters.hasLinkedRecord) {
        if (!t.linkedRecords || t.linkedRecords.length === 0) return false;
      }

      if (advFilters.status && advFilters.status !== 'ALL') {
        if ((t.status || 'OPEN') !== advFilters.status) return false;
      }

      if (advFilters.dateRange && advFilters.dateRange !== 'all') {
        const msgTime = new Date(t.timestamp).getTime();
        const now = Date.now();
        if (advFilters.dateRange === '24h' && now - msgTime > 86400000) return false;
        if (advFilters.dateRange === '7d' && now - msgTime > 7 * 86400000) return false;
        if (advFilters.dateRange === '30d' && now - msgTime > 30 * 86400000) return false;
      }

      // 3. Tab Filter
      if (activeFilter === 'unread' && t.isRead) return false;
      if (activeFilter === 'starred' && !t.isStarred) return false;
      if (activeFilter === 'attachments') {
        const hasAtt = t.messages.some(m => m.attachments && m.attachments.length > 0);
        if (!hasAtt) return false;
      }
      if (activeFilter === 'records') {
        if (!t.linkedRecords || t.linkedRecords.length === 0) return false;
      }

      return true;
    });
  }, [threads, searchQuery, activeFilter, advFilters]);

  const handleToggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredThreads.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredThreads.map(t => t.id));
    }
  };

  const formatEmailDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const isToday = date.toDateString() === now.toDateString();
      if (isToday) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch (_) {
      return '';
    }
  };

  return (
    <div 
      style={{ width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` }}
      className="h-full bg-white dark:bg-zinc-950 flex flex-col shrink-0 select-none overflow-hidden"
    >
      
      {/* Search Header */}
      <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 space-y-2.5">
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
            <input
              type="text"
              placeholder="Search email, sender, subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-100 dark:bg-zinc-900 border border-transparent focus:border-blue-500/40 rounded-xl pl-9 pr-7 py-2 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition-all"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-zinc-600"
              >
                ×
              </button>
            )}
          </div>
          <button
            onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
            className={cn(
              "p-2 rounded-xl border text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer",
              showAdvancedSearch || activeAdvFilterCount > 0
                ? "bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 border-zinc-300 dark:border-zinc-600 shadow-sm"
                : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            )}
            title="Advanced Search Filters"
          >
            <Filter size={14} />
            {activeAdvFilterCount > 0 && (
              <span className="text-[10px] font-bold px-1 py-0.2 rounded-full bg-zinc-300 dark:bg-zinc-600 text-zinc-900 dark:text-zinc-100">
                {activeAdvFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Expandable Advanced Filters Drawer */}
        {showAdvancedSearch && (
          <div className="p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-3 text-xs animate-in fade-in slide-in-from-top-2 duration-150 shadow-inner">
            <div className="flex items-center justify-between">
              <span className="font-bold text-zinc-700 dark:text-zinc-300 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                <Filter size={12} />
                Advanced Search Filters
              </span>
              <button
                onClick={handleResetFilters}
                className="text-[11px] text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 underline cursor-pointer"
              >
                Reset All
              </button>
            </div>

            {/* Inputs Grid */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-semibold text-zinc-500 block mb-1">From (Sender)</label>
                <input
                  type="text"
                  placeholder="sender@domain.com"
                  value={advFilters.from || ''}
                  onChange={(e) => setAdvFilters(prev => ({ ...prev, from: e.target.value }))}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-zinc-500 block mb-1">Subject Contains</label>
                <input
                  type="text"
                  placeholder="Invoice, Urgent, etc."
                  value={advFilters.subject || ''}
                  onChange={(e) => setAdvFilters(prev => ({ ...prev, subject: e.target.value }))}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs focus:outline-none"
                />
              </div>
            </div>

            {/* Selects Row */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-semibold text-zinc-500 block mb-1">Date Range</label>
                <select
                  value={advFilters.dateRange || 'all'}
                  onChange={(e) => setAdvFilters(prev => ({ ...prev, dateRange: e.target.value as any }))}
                  className="w-full px-2 py-1.5 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs focus:outline-none cursor-pointer"
                >
                  <option value="all">Any time</option>
                  <option value="24h">Past 24 hours</option>
                  <option value="7d">Past 7 days</option>
                  <option value="30d">Past 30 days</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-zinc-500 block mb-1">Status</label>
                <select
                  value={advFilters.status || 'ALL'}
                  onChange={(e) => setAdvFilters(prev => ({ ...prev, status: e.target.value as any }))}
                  className="w-full px-2 py-1.5 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="OPEN">Open</option>
                  <option value="PENDING">Pending</option>
                  <option value="RESOLVED">Resolved</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-4 pt-1">
              <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                <input
                  type="checkbox"
                  checked={advFilters.hasAttachments || false}
                  onChange={(e) => setAdvFilters(prev => ({ ...prev, hasAttachments: e.target.checked }))}
                  className="rounded text-zinc-600"
                />
                <span>Has Files</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                <input
                  type="checkbox"
                  checked={advFilters.hasLinkedRecord || false}
                  onChange={(e) => setAdvFilters(prev => ({ ...prev, hasLinkedRecord: e.target.checked }))}
                  className="rounded text-zinc-600"
                />
                <span>Module Linked</span>
              </label>
            </div>
          </div>
        )}

        {/* Quick Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-0.5 text-[11px]">
          {[
            { id: 'all', label: 'All' },
            { id: 'unread', label: 'Unread' },
            { id: 'starred', label: 'Starred' },
            { id: 'attachments', label: 'Has Files' },
            { id: 'records', label: 'Module Linked' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id as any)}
              className={cn(
                "px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition-all cursor-pointer text-xs",
                activeFilter === tab.id
                  ? "bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-600 font-bold shadow-sm"
                  : "bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-transparent"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Batch Actions Bar (when selected) */}
      {selectedIds.length > 0 ? (
        <div className="px-3 py-2 bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-900 dark:text-zinc-100">
          <div className="flex items-center gap-2">
            <button onClick={handleSelectAll} className="cursor-pointer">
              <CheckSquare size={16} className="text-zinc-900 dark:text-white" />
            </button>
            <span className="font-bold">{selectedIds.length} selected</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                selectedIds.forEach(id => onArchiveThread(id));
                setSelectedIds([]);
              }}
              className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer text-zinc-600 dark:text-zinc-300"
              title="Archive Selected"
            >
              <Archive size={14} />
            </button>
            <button
              onClick={() => {
                selectedIds.forEach(id => onTrashThread(id));
                setSelectedIds([]);
              }}
              className="p-1.5 hover:bg-rose-100 dark:hover:bg-rose-950/50 text-rose-600 rounded-lg transition-colors cursor-pointer"
              title="Delete Selected"
            >
              <Trash2 size={14} />
            </button>
            <button
              onClick={() => {
                selectedIds.forEach(id => onMarkRead(id, true));
                setSelectedIds([]);
              }}
              className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer text-zinc-600 dark:text-zinc-300"
              title="Mark as Read"
            >
              <MailOpen size={14} />
            </button>
          </div>
        </div>
      ) : (
        <div className="px-4 py-2 border-b border-zinc-100 dark:border-zinc-900/60 flex items-center justify-between text-[11px] text-zinc-400 font-semibold">
          <span>{filteredThreads.length} Conversations</span>
          <button 
            onClick={handleSelectAll}
            className="hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer flex items-center gap-1"
          >
            <Square size={12} /> Select All
          </button>
        </div>
      )}

      {/* Threads List Items */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {filteredThreads.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center mx-auto text-zinc-400">
              <Mail size={22} />
            </div>
            <div>
              <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">No conversations</p>
              <p className="text-[11px] text-zinc-400 mt-0.5">Nothing matches your search or filter.</p>
            </div>
          </div>
        ) : (
          filteredThreads.map(thread => {
            const isSelected = selectedThreadId === thread.id;
            const isChecked = selectedIds.includes(thread.id);
            const hasAttachments = thread.messages.some(m => m.attachments && m.attachments.length > 0);
            const hasLinkedRecords = thread.linkedRecords && thread.linkedRecords.length > 0;

            return (
              <div
                key={thread.id}
                onClick={() => onSelectThread(thread)}
                className={cn(
                  "p-3.5 flex items-start gap-3 transition-colors cursor-pointer relative group border-b border-zinc-200/50 dark:border-zinc-800/50 last:border-b-0",
                  isSelected
                    ? "bg-zinc-100 dark:bg-zinc-800/70"
                    : "hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                )}
              >
                {/* Active Indicator Bar */}
                {isSelected && (
                  <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-zinc-900 dark:bg-white" />
                )}
                {/* Left Select & Star */}
                <div className="flex flex-col items-center gap-2 pt-0.5" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={(e) => handleToggleSelect(thread.id, e)}
                    className="text-zinc-300 dark:text-zinc-700 hover:text-zinc-900 dark:hover:text-white transition-colors"
                  >
                    {isChecked ? (
                      <CheckSquare size={15} className="text-zinc-900 dark:text-white" />
                    ) : (
                      <Square size={15} />
                    )}
                  </button>

                  <button
                    onClick={(e) => onStarThread(thread.id, thread.isStarred, e)}
                    className={cn(
                      "transition-colors",
                      thread.isStarred
                        ? "text-amber-400 fill-amber-400"
                        : "text-zinc-300 dark:text-zinc-700 hover:text-amber-400"
                    )}
                  >
                    <Star size={15} className={thread.isStarred ? "fill-amber-400" : ""} />
                  </button>
                </div>

                {/* Main Content */}
                <div className="flex-1 min-w-0 space-y-1">
                  
                  {/* Sender & Timestamp */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className={cn(
                        "text-xs truncate",
                        !thread.isRead ? "font-black text-zinc-900 dark:text-white" : "font-semibold text-zinc-700 dark:text-zinc-300"
                      )}>
                        {thread.from.name || thread.from.address}
                      </span>
                      {thread.messages.length > 1 && (
                        <span className="text-[10px] px-1 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-500 font-bold">
                          {thread.messages.length}
                        </span>
                      )}
                    </div>

                    <span className="text-[10px] text-zinc-400 font-medium shrink-0">
                      {formatEmailDate(thread.timestamp)}
                    </span>
                  </div>

                  {/* Subject Line */}
                  <h4 className={cn(
                    "text-xs truncate",
                    !thread.isRead ? "font-bold text-zinc-900 dark:text-zinc-100" : "font-medium text-zinc-800 dark:text-zinc-300"
                  )}>
                    {thread.subject || '(No Subject)'}
                  </h4>

                  {/* Snippet Preview */}
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed font-normal">
                    {getCleanSnippet(thread.snippet, thread.messages)}
                  </p>

                  {/* Badges / Chips */}
                  <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
                    {thread.sharedStatus && thread.sharedStatus !== 'RESOLVED' && (
                      <span className={cn(
                        "text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded",
                        thread.sharedStatus === 'OPEN' ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
                        "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      )}>
                        {thread.sharedStatus}
                      </span>
                    )}

                    {hasLinkedRecords && (
                      <span className="text-[9px] font-medium px-1.5 py-0.2 rounded bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-200/40 dark:border-purple-800/40 flex items-center gap-1">
                        <Layers size={9} />
                        {thread.linkedRecords![0].recordKey || 'Record'}
                      </span>
                    )}

                    {thread.labels && thread.labels.length > 0 && (
                      <span className="text-[9px] font-medium px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800/80 text-zinc-500 dark:text-zinc-400 truncate max-w-[120px]">
                        {thread.labels[0]}
                      </span>
                    )}

                    {thread.assignedTo && (
                      <span className="text-[9px] font-medium px-1.5 py-0.2 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200/40 dark:border-blue-800/40 flex items-center gap-1 truncate max-w-[140px]">
                        {thread.assignedTo.startsWith('AI') || thread.assignedTo.includes('Bot') || thread.assignedTo.includes('Agent') ? '🤖' : '👤'} {thread.assignedTo}
                      </span>
                    )}
                    {thread.labels && thread.labels.length > 1 && (
                      <span className="text-[9px] text-zinc-400 font-medium">
                        +{thread.labels.length - 1}
                      </span>
                    )}

                    {hasAttachments && (
                      <span className="text-[10px] text-zinc-400 flex items-center gap-0.5 ml-auto">
                        <Paperclip size={11} />
                      </span>
                    )}
                  </div>

                </div>

                {/* Quick Row Hover Actions */}
                <div className="absolute right-3 top-3 hidden group-hover:flex items-center gap-1 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm p-1 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-md">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onArchiveThread(thread.id);
                    }}
                    className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
                    title="Archive"
                  >
                    <Archive size={13} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onTrashThread(thread.id);
                    }}
                    className="p-1 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded text-zinc-500 hover:text-rose-600 transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={13} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onMarkRead(thread.id, !thread.isRead);
                    }}
                    className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
                    title={thread.isRead ? 'Mark as Unread' : 'Mark as Read'}
                  >
                    {thread.isRead ? <Mail size={13} /> : <MailOpen size={13} />}
                  </button>
                </div>

              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
