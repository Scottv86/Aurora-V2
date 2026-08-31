import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Inbox, 
  Mail, 
  Send, 
  Sparkles, 
  Layers, 
  Loader2, 
  PanelRightClose, 
  PanelRightOpen,
  Keyboard
} from 'lucide-react';
import { EmailAccount, EmailThread, EmailMessage, InboxFolder, CustomFolder } from '../../types/inbox';
import { InboxService } from '../../services/inboxService';
import { InboxSidebar } from '../../components/Apps/Inbox/InboxSidebar';
import { InboxThreadList } from '../../components/Apps/Inbox/InboxThreadList';
import { InboxThreadView } from '../../components/Apps/Inbox/InboxThreadView';
import { InboxContextSidebar } from '../../components/Apps/Inbox/InboxContextSidebar';
import { InboxComposerModal } from '../../components/Apps/Inbox/InboxComposerModal';
import { InboxConvertModal } from '../../components/Apps/Inbox/InboxConvertModal';
import { InboxAccountModal } from '../../components/Apps/Inbox/InboxAccountModal';
import { InboxRulesModal } from '../../components/Apps/Inbox/InboxRulesModal';
import { InboxSnippetsModal } from '../../components/Apps/Inbox/InboxSnippetsModal';
import { InboxSignaturesModal } from '../../components/Apps/Inbox/InboxSignaturesModal';
import { InboxNewFolderModal } from '../../components/Apps/Inbox/InboxNewFolderModal';
import { usePlatform } from '../../hooks/usePlatform';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';

const STORAGE_WIDTHS_KEY = 'aurora_inbox_pane_widths_v1';

const DEFAULT_WIDTHS = {
  sidebar: 256,
  threadList: 360,
  contextSidebar: 340,
};

interface ResizeHandleProps {
  onDrag: (delta: number) => void;
  onReset: () => void;
  title?: string;
}

const ResizeHandle: React.FC<ResizeHandleProps> = ({ 
  onDrag, 
  onReset, 
  title = 'Drag to resize (double-click to reset)' 
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    let lastX = e.clientX;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - lastX;
      lastX = moveEvent.clientX;
      onDrag(delta);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div
      onMouseDown={handleMouseDown}
      onDoubleClick={onReset}
      className={cn(
        "w-[3px] hover:w-[4px] active:w-[4px] h-full bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-400 dark:hover:bg-zinc-600 active:bg-zinc-500 transition-all cursor-col-resize z-20 shrink-0 relative group flex items-center justify-center select-none",
        isDragging && "w-[4px] bg-zinc-600 dark:bg-zinc-400"
      )}
      title={title}
    >
      <div className="opacity-0 group-hover:opacity-100 w-[2px] h-6 rounded-full bg-zinc-400 dark:bg-zinc-500 transition-opacity pointer-events-none" />
    </div>
  );
};

export const InboxApp: React.FC = () => {
  const { tenant } = usePlatform();
  const { user } = useAuth();

  // Pane Widths State
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_WIDTHS_KEY);
      if (saved) return JSON.parse(saved).sidebar || DEFAULT_WIDTHS.sidebar;
    } catch (_) {}
    return DEFAULT_WIDTHS.sidebar;
  });

  const [threadListWidth, setThreadListWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_WIDTHS_KEY);
      if (saved) return JSON.parse(saved).threadList || DEFAULT_WIDTHS.threadList;
    } catch (_) {}
    return DEFAULT_WIDTHS.threadList;
  });

  const [contextSidebarWidth, setContextSidebarWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_WIDTHS_KEY);
      if (saved) return JSON.parse(saved).contextSidebar || DEFAULT_WIDTHS.contextSidebar;
    } catch (_) {}
    return DEFAULT_WIDTHS.contextSidebar;
  });

  // Persist Widths
  const persistWidths = useCallback((sidebar: number, threadList: number, contextSidebar: number) => {
    try {
      localStorage.setItem(STORAGE_WIDTHS_KEY, JSON.stringify({ sidebar, threadList, contextSidebar }));
    } catch (_) {}
  }, []);

  const handleResizeSidebar = (delta: number) => {
    setSidebarWidth(prev => {
      const next = Math.max(180, Math.min(450, prev + delta));
      persistWidths(next, threadListWidth, contextSidebarWidth);
      return next;
    });
  };

  const handleResizeThreadList = (delta: number) => {
    setThreadListWidth(prev => {
      const next = Math.max(260, Math.min(650, prev + delta));
      persistWidths(sidebarWidth, next, contextSidebarWidth);
      return next;
    });
  };

  const handleResizeContextSidebar = (delta: number) => {
    setContextSidebarWidth(prev => {
      // Dragging left increases width, dragging right decreases width
      const next = Math.max(260, Math.min(550, prev - delta));
      persistWidths(sidebarWidth, threadListWidth, next);
      return next;
    });
  };

  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');
  const [selectedFolder, setSelectedFolder] = useState<InboxFolder>('inbox');
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);

  // Custom Folders State
  const [customFolders, setCustomFolders] = useState<CustomFolder[]>([]);
  const [selectedCustomFolderId, setSelectedCustomFolderId] = useState<string | null>(null);

  const [threads, setThreads] = useState<EmailThread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Right Context Sidebar Visibility Toggle
  const [showContextSidebar, setShowContextSidebar] = useState<boolean>(true);

  // Modals
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composerContext, setComposerContext] = useState<{
    accountId?: string;
    to?: string[];
    subject?: string;
    body?: string;
    threadId?: string;
  }>({});
  
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isSnippetsOpen, setIsSnippetsOpen] = useState(false);
  const [isSignaturesOpen, setIsSignaturesOpen] = useState(false);
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [threadToConvert, setThreadToConvert] = useState<EmailThread | null>(null);

  // 1. Initial Load of Accounts & Threads & Custom Folders
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const accs = await InboxService.getAccounts(tenant?.id);
      setAccounts(accs);

      const cFolders = await InboxService.getCustomFolders(tenant?.id);
      setCustomFolders(cFolders);

      const ths = await InboxService.getThreads({
        accountId: selectedAccountId !== 'all' ? selectedAccountId : undefined,
        folder: (selectedLabel || selectedCustomFolderId) ? undefined : selectedFolder,
        label: selectedLabel || undefined,
        tenantId: tenant?.id
      });

      // If a custom folder is selected, filter by folder's name or custom folder logic
      if (selectedCustomFolderId) {
        const folderObj = cFolders.find(f => f.id === selectedCustomFolderId);
        const folderName = folderObj?.name.toLowerCase() || '';
        const filtered = ths.filter(t => 
          (t.folder === selectedCustomFolderId) || 
          (t.labels && t.labels.some(l => l.toLowerCase() === folderName)) ||
          t.subject.toLowerCase().includes(folderName) ||
          t.snippet.toLowerCase().includes(folderName)
        );
        setThreads(filtered);
      } else {
        setThreads(ths);
      }

      // Auto-select first thread if none selected on desktop
      if (ths.length > 0 && !selectedThreadId) {
        setSelectedThreadId(ths[0].id);
      }
    } catch (err) {
      console.error('[InboxApp] Load error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [tenant?.id, selectedAccountId, selectedFolder, selectedLabel, selectedCustomFolderId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Selected thread object
  const selectedThread = useMemo(() => {
    return threads.find(t => t.id === selectedThreadId) || null;
  }, [threads, selectedThreadId]);

  // Compute Unread Counts
  const unreadCounts = useMemo(() => {
    const counts: Record<string, number> = { all: 0, inbox: 0 };
    threads.forEach(t => {
      if (!t.isRead) {
        counts['all'] = (counts['all'] || 0) + 1;
        if (t.folder === 'inbox') {
          counts['inbox'] = (counts['inbox'] || 0) + 1;
        }
        counts[t.accountId] = (counts[t.accountId] || 0) + 1;
      }
    });
    return counts;
  }, [threads]);

  // Actions
  const handleSelectThread = async (thread: EmailThread) => {
    setSelectedThreadId(thread.id);
    if (!thread.isRead) {
      // Mark read locally and on server
      setThreads(prev => prev.map(t => t.id === thread.id ? { ...t, isRead: true } : t));
      await InboxService.threadAction(thread.id, 'markRead', true, undefined, tenant?.id);
    }
  };

  const handleStarThread = async (threadId: string, currentStarred: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextVal = !currentStarred;
    setThreads(prev => prev.map(t => t.id === threadId ? { ...t, isStarred: nextVal } : t));
    await InboxService.threadAction(threadId, 'star', nextVal, undefined, tenant?.id);
  };

  const handleArchiveThread = async (threadId: string) => {
    setThreads(prev => prev.filter(t => t.id !== threadId));
    if (selectedThreadId === threadId) setSelectedThreadId(null);
    await InboxService.threadAction(threadId, 'archive', true, undefined, tenant?.id);
    toast.success('Conversation archived');
  };

  const handleTrashThread = async (threadId: string) => {
    setThreads(prev => prev.filter(t => t.id !== threadId));
    if (selectedThreadId === threadId) setSelectedThreadId(null);
    await InboxService.threadAction(threadId, 'trash', true, undefined, tenant?.id);
    toast.success('Moved to Trash');
  };

  const handleMarkRead = async (threadId: string, isRead: boolean) => {
    setThreads(prev => prev.map(t => t.id === threadId ? { ...t, isRead } : t));
    await InboxService.threadAction(threadId, 'markRead', isRead, undefined, tenant?.id);
  };

  const handleSyncAll = async () => {
    try {
      setIsSyncing(true);
      for (const acc of accounts) {
        await InboxService.syncAccount(acc.id, tenant?.id);
      }
      await loadData();
      toast.success('Mailboxes updated!');
    } catch (err: any) {
      toast.error('Sync completed with warnings');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleOpenComposerWithContext = (mode: 'reply' | 'replyAll' | 'forward', message: EmailMessage) => {
    const isReply = mode === 'reply' || mode === 'replyAll';
    const to = mode === 'reply' ? [message.from.address] :
               mode === 'replyAll' ? [message.from.address, ...message.to.map(t => t.address).filter(a => a !== user?.email)] : [];
    
    setComposerContext({
      accountId: selectedThread?.accountId || accounts[0]?.id,
      to,
      subject: selectedThread?.subject.startsWith('Re:') || selectedThread?.subject.startsWith('Fwd:') 
        ? selectedThread.subject 
        : `${mode === 'forward' ? 'Fwd:' : 'Re:'} ${selectedThread?.subject || ''}`,
      body: `\n\n---------- Original Message ----------\nFrom: ${message.from.name} <${message.from.address}>\nDate: ${message.date}\nSubject: ${message.subject}\n\n${message.bodyText}`,
      threadId: isReply ? selectedThread?.id : undefined
    });
    setIsComposeOpen(true);
  };

  const handleQuickReply = (text: string) => {
    if (!selectedThread) return;
    const lastMsg = selectedThread.messages[selectedThread.messages.length - 1];
    setComposerContext({
      accountId: selectedThread.accountId,
      to: [lastMsg.from.address],
      subject: selectedThread.subject.startsWith('Re:') ? selectedThread.subject : `Re: ${selectedThread.subject}`,
      body: text,
      threadId: selectedThread.id
    });
    setIsComposeOpen(true);
  };

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      // Don't intercept if user is typing in any input, textarea, contentEditable editor, or if a modal is open
      if (
        isComposeOpen ||
        isAddAccountOpen ||
        isRulesOpen ||
        isSnippetsOpen ||
        isSignaturesOpen ||
        isNewFolderOpen ||
        isConvertModalOpen ||
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName) ||
        target?.isContentEditable ||
        target?.closest('[contenteditable="true"]')
      ) {
        return;
      }

      if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        setComposerContext({});
        setIsComposeOpen(true);
      } else if (e.key === 'e' && selectedThreadId) {
        e.preventDefault();
        handleArchiveThread(selectedThreadId);
      } else if (e.key === '#' && selectedThreadId) {
        e.preventDefault();
        handleTrashThread(selectedThreadId);
      } else if (e.key === 'r' && selectedThread) {
        e.preventDefault();
        const lastMsg = selectedThread.messages[selectedThread.messages.length - 1];
        handleOpenComposerWithContext('reply', lastMsg);
      } else if (e.key === 'j') { // Next thread
        const currentIdx = threads.findIndex(t => t.id === selectedThreadId);
        if (currentIdx >= 0 && currentIdx < threads.length - 1) {
          handleSelectThread(threads[currentIdx + 1]);
        }
      } else if (e.key === 'k') { // Previous thread
        const currentIdx = threads.findIndex(t => t.id === selectedThreadId);
        if (currentIdx > 0) {
          handleSelectThread(threads[currentIdx - 1]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedThreadId, 
    threads, 
    selectedThread, 
    isComposeOpen, 
    isAddAccountOpen, 
    isRulesOpen, 
    isSnippetsOpen, 
    isSignaturesOpen, 
    isNewFolderOpen, 
    isConvertModalOpen
  ]);

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full bg-white dark:bg-zinc-950 overflow-hidden relative">
      
      {/* Column 1: Mailbox & Folder Sidebar */}
      <InboxSidebar
        accounts={accounts}
        selectedAccountId={selectedAccountId}
        onSelectAccount={setSelectedAccountId}
        selectedFolder={selectedFolder}
        onSelectFolder={(folder) => {
          setSelectedFolder(folder);
          setSelectedLabel(null);
          setSelectedCustomFolderId(null);
        }}
        selectedLabel={selectedLabel}
        onSelectLabel={(label) => {
          setSelectedLabel(label);
          setSelectedCustomFolderId(null);
        }}
        customFolders={customFolders}
        selectedCustomFolderId={selectedCustomFolderId}
        onSelectCustomFolder={(folderId) => {
          setSelectedCustomFolderId(folderId);
          setSelectedLabel(null);
        }}
        onOpenNewFolder={() => setIsNewFolderOpen(true)}
        onOpenCompose={() => {
          setComposerContext({});
          setIsComposeOpen(true);
        }}
        onOpenAddAccount={() => setIsAddAccountOpen(true)}
        onOpenRules={() => setIsRulesOpen(true)}
        onOpenSnippets={() => setIsSnippetsOpen(true)}
        onOpenSignatures={() => setIsSignaturesOpen(true)}
        onSync={handleSyncAll}
        isSyncing={isSyncing}
        unreadCounts={unreadCounts}
        width={sidebarWidth}
      />

      {/* Resize Handle 1: Sidebar <-> ThreadList */}
      <ResizeHandle
        onDrag={handleResizeSidebar}
        onReset={() => {
          setSidebarWidth(DEFAULT_WIDTHS.sidebar);
          persistWidths(DEFAULT_WIDTHS.sidebar, threadListWidth, contextSidebarWidth);
        }}
        title="Resize Mailbox Sidebar (double-click to reset)"
      />

      {/* Column 2: Thread List */}
      <InboxThreadList
        threads={threads}
        selectedThreadId={selectedThreadId}
        onSelectThread={handleSelectThread}
        selectedFolder={selectedFolder}
        selectedLabel={selectedLabel}
        onStarThread={handleStarThread}
        onArchiveThread={handleArchiveThread}
        onTrashThread={handleTrashThread}
        onMarkRead={handleMarkRead}
        width={threadListWidth}
      />

      {/* Resize Handle 2: ThreadList <-> ThreadView */}
      <ResizeHandle
        onDrag={handleResizeThreadList}
        onReset={() => {
          setThreadListWidth(DEFAULT_WIDTHS.threadList);
          persistWidths(sidebarWidth, DEFAULT_WIDTHS.threadList, contextSidebarWidth);
        }}
        title="Resize Thread List (double-click to reset)"
      />

      {/* Column 3: Thread Viewer */}
      {selectedThread ? (
        <div className="flex-1 flex flex-col min-w-0 h-full relative overflow-hidden">
          
          {/* Top Context Pane Toggle Button */}
          <div className="absolute top-4 right-4 z-10">
            <button
              onClick={() => setShowContextSidebar(!showContextSidebar)}
              className="p-1.5 rounded-xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white shadow-sm transition-all cursor-pointer"
              title={showContextSidebar ? 'Hide Aurora Integration Pane' : 'Show Aurora Integration Pane'}
            >
              {showContextSidebar ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
            </button>
          </div>

          <InboxThreadView
            thread={selectedThread}
            onStarThread={handleStarThread}
            onArchiveThread={handleArchiveThread}
            onTrashThread={handleTrashThread}
            onOpenConvertModal={(t) => {
              setThreadToConvert(t);
              setIsConvertModalOpen(true);
            }}
            onQuickReply={handleQuickReply}
            onOpenComposerWithContext={handleOpenComposerWithContext}
          />
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-zinc-50/50 dark:bg-zinc-950 overflow-hidden">
          <div className="w-16 h-16 rounded-3xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4 shadow-sm border border-blue-500/20">
            <Mail size={28} />
          </div>
          <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">No Conversation Selected</h3>
          <p className="text-xs text-zinc-400 mt-1 max-w-sm">
            Select an email thread from the list on the left to read messages, draft AI replies, or convert to an Aurora module record.
          </p>
        </div>
      )}

      {/* Column 4: Aurora Ecosystem Integration Pane with Resize Handle */}
      <AnimatePresence initial={false}>
        {selectedThread && showContextSidebar && (
          <motion.div
            key="inbox-context-pane-wrapper"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: contextSidebarWidth, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="h-full flex shrink-0 overflow-hidden relative"
          >
            <ResizeHandle
              onDrag={handleResizeContextSidebar}
              onReset={() => {
                setContextSidebarWidth(DEFAULT_WIDTHS.contextSidebar);
                persistWidths(sidebarWidth, threadListWidth, DEFAULT_WIDTHS.contextSidebar);
              }}
              title="Resize Aurora Context Pane (double-click to reset)"
            />
            <div style={{ width: `${contextSidebarWidth}px` }} className="h-full shrink-0">
              <InboxContextSidebar
                thread={selectedThread}
                onOpenConvertModal={(t) => {
                  setThreadToConvert(t);
                  setIsConvertModalOpen(true);
                }}
                onThreadUpdated={loadData}
                width={contextSidebarWidth}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Rich Email Composer */}
      <InboxComposerModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        accounts={accounts}
        initialAccountId={composerContext.accountId}
        initialTo={composerContext.to}
        initialSubject={composerContext.subject}
        initialBody={composerContext.body}
        threadId={composerContext.threadId}
        onSentSuccess={loadData}
      />

      {/* Convert to Record Modal */}
      <InboxConvertModal
        isOpen={isConvertModalOpen}
        onClose={() => {
          setIsConvertModalOpen(false);
          setThreadToConvert(null);
        }}
        thread={threadToConvert}
        onConvertedSuccess={loadData}
      />

      {/* Add Email Account Modal */}
      <InboxAccountModal
        isOpen={isAddAccountOpen}
        onClose={() => setIsAddAccountOpen(false)}
        onAccountAdded={loadData}
      />

      {/* Automations & Rules Modal */}
      <InboxRulesModal
        isOpen={isRulesOpen}
        onClose={() => setIsRulesOpen(false)}
      />

      {/* Canned Snippets & Slash Shortcuts Modal */}
      <InboxSnippetsModal
        isOpen={isSnippetsOpen}
        onClose={() => setIsSnippetsOpen(false)}
      />

      {/* Email Signatures Modal */}
      <InboxSignaturesModal
        isOpen={isSignaturesOpen}
        onClose={() => setIsSignaturesOpen(false)}
        accounts={accounts}
      />

      {/* Custom Folder Creator Modal */}
      <InboxNewFolderModal
        isOpen={isNewFolderOpen}
        onClose={() => setIsNewFolderOpen(false)}
        onFolderCreated={loadData}
      />

    </div>
  );
};
