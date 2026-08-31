import React from 'react';
import { 
  Inbox, 
  Star, 
  Send, 
  FileEdit, 
  Clock, 
  Archive, 
  Trash2, 
  AlertOctagon, 
  Plus, 
  RefreshCw, 
  Settings, 
  Zap, 
  Layers, 
  ChevronDown, 
  Mail, 
  Users, 
  Tag, 
  CheckCircle2, 
  AlertCircle,
  Command,
  PenTool
} from 'lucide-react';
import { EmailAccount, InboxFolder, CustomFolder } from '../../../types/inbox';
import { cn } from '../../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';

interface InboxSidebarProps {
  accounts: EmailAccount[];
  selectedAccountId: string;
  onSelectAccount: (accountId: string) => void;
  selectedFolder: InboxFolder;
  onSelectFolder: (folder: InboxFolder) => void;
  selectedLabel: string | null;
  onSelectLabel: (label: string | null) => void;
  customFolders?: CustomFolder[];
  selectedCustomFolderId?: string | null;
  onSelectCustomFolder?: (folderId: string | null) => void;
  onOpenNewFolder?: () => void;
  onOpenCompose: () => void;
  onOpenAddAccount: () => void;
  onOpenRules: () => void;
  onOpenSnippets?: () => void;
  onOpenSignatures?: () => void;
  onSync: () => void;
  isSyncing: boolean;
  unreadCounts: Record<string, number>;
  onDeleteAccount?: (accountId: string) => void;
  width?: number;
}

const GmailEnvelopeIcon = ({ className = "w-3.5 h-3.5 shrink-0" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24">
    <path fill="#4285F4" d="M1.5 5.5v13a1 1 0 0 0 1 1h3v-10l6.5 4.875L18.5 9.5v10h3a1 1 0 0 0 1-1v-13a1 1 0 0 0-1.6-.8L12 12.1 2.1 4.7a1 1 0 0 0-1.6.8z"/>
    <path fill="#34A853" d="M18.5 19.5h3a1 1 0 0 0 1-1V9.5l-4 3v7z"/>
    <path fill="#FBBC04" d="M1.5 6.5l4 3v10h-3a1 1 0 0 1-1-1v-12z"/>
    <path fill="#EA4335" d="M21.5 4.7a1 1 0 0 0-1.1-.1L12 10.9 3.6 4.6a1 1 0 0 0-1.1.1 1 1 0 0 0-.5.8v1l10 7.5 10-7.5v-1a1 1 0 0 0-.5-.8z"/>
  </svg>
);

const OutlookIcon = ({ className = "w-3.5 h-3.5 shrink-0" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path d="M14.5 3H21a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1h-6.5V3z" fill="#0078D4"/>
    <path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h10v14h-10A1.5 1.5 0 0 1 3 17.5v-11z" fill="#106EBE"/>
    <path d="M9.5 9a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z" fill="#fff"/>
  </svg>
);

const AppleMailIcon = ({ className = "w-3.5 h-3.5 shrink-0" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.61-.75 1.04-1.8 0.92-2.87-.9.04-2 .6-2.63 1.34-.55.63-1.03 1.68-.9 2.71 1.01.08 2.01-.43 2.61-1.18z"/>
  </svg>
);

const YahooIcon = ({ className = "w-3.5 h-3.5 shrink-0" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="#6001D2">
    <path d="M12 14.5l4.5-9.5h3L14 15.5V21h-3v-5.5L5.5 5h3L12 14.5z"/>
  </svg>
);

function renderAccountProviderIcon(acc: EmailAccount, sizeClass = "w-4 h-4 shrink-0") {
  const email = (acc.email || '').toLowerCase();
  const provider = (acc.provider || '').toLowerCase();
  const name = (acc.name || '').toLowerCase();

  if (email.includes('gmail.com') || email.includes('googlemail.com') || provider.includes('google') || provider.includes('gmail') || name.includes('google') || name.includes('gmail')) {
    return <GmailEnvelopeIcon className={sizeClass} />;
  }

  if (email.includes('outlook.com') || email.includes('hotmail.com') || email.includes('live.com') || email.includes('office365.com') || provider.includes('outlook') || provider.includes('microsoft')) {
    return <OutlookIcon className={sizeClass} />;
  }

  if (email.includes('yahoo.com') || provider.includes('yahoo')) {
    return <YahooIcon className={sizeClass} />;
  }

  if (email.includes('icloud.com') || email.includes('me.com') || email.includes('mac.com') || provider.includes('apple') || provider.includes('icloud')) {
    return <AppleMailIcon className={cn(sizeClass, "text-zinc-700 dark:text-zinc-300")} />;
  }

  if (acc.type === 'SHARED' || acc.isShared) {
    return (
      <div className="w-4 h-4 rounded-md bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center text-[9px] font-bold shrink-0">
        <Users size={10} />
      </div>
    );
  }

  return (
    <div 
      className="w-3.5 h-3.5 rounded-full shrink-0 flex items-center justify-center shadow-xs" 
      style={{ backgroundColor: acc.color || '#6366F1' }} 
    >
      <Mail size={8} className="text-white" />
    </div>
  );
}

export const InboxSidebar: React.FC<InboxSidebarProps> = ({
  accounts,
  selectedAccountId,
  onSelectAccount,
  selectedFolder,
  onSelectFolder,
  selectedLabel,
  onSelectLabel,
  customFolders = [],
  selectedCustomFolderId = null,
  onSelectCustomFolder,
  onOpenNewFolder,
  onOpenCompose,
  onOpenAddAccount,
  onOpenRules,
  onOpenSnippets,
  onOpenSignatures,
  onSync,
  isSyncing,
  unreadCounts,
  onDeleteAccount,
  width = 256
}) => {
  const folders: { id: InboxFolder; label: string; icon: any }[] = [
    { id: 'inbox', label: 'Inbox', icon: Inbox },
    { id: 'starred', label: 'Starred', icon: Star },
    { id: 'sent', label: 'Sent', icon: Send },
    { id: 'drafts', label: 'Drafts', icon: FileEdit },
    { id: 'snoozed', label: 'Snoozed', icon: Clock },
    { id: 'archive', label: 'Archive', icon: Archive },
    { id: 'trash', label: 'Trash', icon: Trash2 },
    { id: 'spam', label: 'Spam', icon: AlertOctagon },
  ];

  const labels = [
    { name: 'High Priority', color: 'bg-rose-500' },
    { name: 'Enterprise', color: 'bg-indigo-500' },
    { name: 'Sales Deal', color: 'bg-emerald-500' },
    { name: 'Customer Care', color: 'bg-amber-500' },
    { name: 'Converted to Record', color: 'bg-purple-500' }
  ];

  const personalAccounts = accounts.filter(a => a.type === 'PERSONAL');
  const sharedAccounts = accounts.filter(a => a.type === 'SHARED');

  const [accountToDisconnect, setAccountToDisconnect] = React.useState<EmailAccount | null>(null);

  return (
    <div 
      style={{ width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` }}
      className="h-full bg-white/70 dark:bg-zinc-900/80 backdrop-blur-xl flex flex-col justify-between shrink-0 select-none overflow-hidden"
    >
      
      {/* Top Header & Compose Button */}
      <div className="p-3.5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center border border-zinc-200 dark:border-zinc-700/80 shadow-sm">
              <Inbox size={15} />
            </div>
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white tracking-tight">Inbox</h2>
          </div>
          
          <button
            onClick={onSync}
            disabled={isSyncing}
            className={cn(
              "p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer",
              isSyncing && "animate-spin text-zinc-900 dark:text-white"
            )}
            title="Sync inboxes"
          >
            <RefreshCw size={13} />
          </button>
        </div>

        {/* Primary Compose Button */}
        <button
          onClick={onOpenCompose}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-semibold border border-zinc-200 dark:border-zinc-700/80 text-xs shadow-sm transition-all cursor-pointer"
        >
          <Plus size={14} />
          <span>New Message</span>
          <kbd className="ml-auto text-[10px] bg-zinc-200 dark:bg-zinc-700/80 px-1.5 py-0.2 rounded font-mono text-zinc-500 dark:text-zinc-400">C</kbd>
        </button>
      </div>

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto px-3 space-y-5 custom-scrollbar text-xs">
        
        {/* Accounts Picker */}
        <div className="space-y-1">
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
              Mailboxes
            </span>
            <button
              onClick={onOpenAddAccount}
              className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Plus size={11} /> Add
            </button>
          </div>

          {/* All Inboxes Aggregator */}
          <button
            onClick={() => {
              onSelectAccount('all');
              onSelectLabel(null);
            }}
            className={cn(
              "w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-left font-medium transition-all cursor-pointer",
              selectedAccountId === 'all'
                ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white font-bold"
                : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
            )}
          >
            <Layers size={14} className="text-zinc-400" />
            <span className="truncate flex-1">All Inboxes</span>
            {unreadCounts['all'] > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200">
                {unreadCounts['all']}
              </span>
            )}
          </button>

          {/* Personal Accounts */}
          {personalAccounts.map(acc => (
            <div
              key={acc.id}
              className={cn(
                "group/acc w-full flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-xl text-left transition-all cursor-pointer",
                selectedAccountId === acc.id
                  ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white font-bold"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
              )}
            >
              <button
                onClick={() => {
                  onSelectAccount(acc.id);
                  onSelectLabel(null);
                }}
                className="flex-1 flex items-center gap-2.5 min-w-0 text-left cursor-pointer"
              >
                {renderAccountProviderIcon(acc)}
                <div className="flex-1 min-w-0">
                  <p className="truncate text-xs font-semibold leading-tight">{acc.name}</p>
                  <p className="truncate text-[10px] text-zinc-400">{acc.email}</p>
                </div>
              </button>

              <div className="flex items-center gap-1">
                {unreadCounts[acc.id] > 0 && (
                  <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200">
                    {unreadCounts[acc.id]}
                  </span>
                )}
                {onDeleteAccount && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setAccountToDisconnect(acc);
                    }}
                    title="Disconnect Mailbox"
                    className="p-1 rounded-lg text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 opacity-0 group-hover/acc:opacity-100 transition-opacity cursor-pointer"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Shared Inboxes */}
          {sharedAccounts.length > 0 && (
            <div className="pt-2">
              <div className="px-2 py-1 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                <Users size={11} /> Shared Inboxes
              </div>
              {sharedAccounts.map(acc => (
                <div
                  key={acc.id}
                  className={cn(
                    "group/acc w-full flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-xl text-left transition-all cursor-pointer",
                    selectedAccountId === acc.id
                      ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white font-bold"
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                  )}
                >
                  <button
                    onClick={() => {
                      onSelectAccount(acc.id);
                      onSelectLabel(null);
                    }}
                    className="flex-1 flex items-center gap-2.5 min-w-0 text-left cursor-pointer"
                  >
                    {renderAccountProviderIcon(acc)}
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-xs font-semibold leading-tight">{acc.name}</p>
                      <p className="truncate text-[10px] text-zinc-400">{acc.email}</p>
                    </div>
                  </button>

                  <div className="flex items-center gap-1">
                    {unreadCounts[acc.id] > 0 && (
                      <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400">
                        {unreadCounts[acc.id]}
                      </span>
                    )}
                    {onDeleteAccount && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAccountToDisconnect(acc);
                        }}
                        title="Disconnect Mailbox"
                        className="p-1 rounded-lg text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 opacity-0 group-hover/acc:opacity-100 transition-opacity cursor-pointer"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Standard Folders */}
        <div className="space-y-0.5">
          <span className="px-2 py-1 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">
            Folders
          </span>
          {folders.map(folder => {
            const Icon = folder.icon;
            const isSelected = selectedFolder === folder.id && !selectedLabel;
            return (
              <button
                key={folder.id}
                onClick={() => {
                  onSelectFolder(folder.id);
                  onSelectLabel(null);
                }}
                className={cn(
                  "w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-left transition-all cursor-pointer",
                  isSelected
                    ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white font-bold"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                )}
              >
                <Icon size={15} className={isSelected ? "text-zinc-900 dark:text-white" : "text-zinc-400"} />
                <span className="flex-1">{folder.label}</span>
                {folder.id === 'inbox' && unreadCounts['inbox'] > 0 && (
                  <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200">
                    {unreadCounts['inbox']}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Custom User Folders */}
        <div className="space-y-0.5">
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">
              Custom Folders
            </span>
            <button
              onClick={onOpenNewFolder}
              className="p-1 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
              title="Create Custom Folder"
            >
              <Plus size={13} />
            </button>
          </div>

          {customFolders.length === 0 ? (
            <button
              onClick={onOpenNewFolder}
              className="w-full text-left px-2.5 py-1.5 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 text-xs italic hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors cursor-pointer"
            >
              + Create first folder...
            </button>
          ) : (
            customFolders.map(cf => {
              const isSelected = selectedCustomFolderId === cf.id;
              return (
                <button
                  key={cf.id}
                  onClick={() => {
                    if (onSelectCustomFolder) {
                      onSelectCustomFolder(isSelected ? null : cf.id);
                    }
                  }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-left transition-all cursor-pointer",
                    isSelected
                      ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white font-bold"
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                  )}
                >
                  <span className={cn("w-2 h-2 rounded-full", cf.color || "bg-blue-500")} />
                  <span className="truncate flex-1">{cf.name}</span>
                </button>
              );
            })
          )}
        </div>

        {/* Labels / Tags */}
        <div className="space-y-1">
          <span className="px-2 py-1 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider flex items-center gap-1">
            <Tag size={11} /> Labels
          </span>
          {labels.map(lbl => {
            const isSelected = selectedLabel === lbl.name;
            return (
              <button
                key={lbl.name}
                onClick={() => onSelectLabel(isSelected ? null : lbl.name)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-left transition-all cursor-pointer",
                  isSelected
                    ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-white font-bold"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/40"
                )}
              >
                <span className={cn("w-2 h-2 rounded-full", lbl.color)} />
                <span className="truncate flex-1">{lbl.name}</span>
              </button>
            );
          })}
        </div>

      </div>

      {/* Bottom Footer Actions (Compact, Clean Toolbar) */}
      <div className="p-2 border-t border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30 flex items-center justify-around">
        <button
          onClick={onOpenSnippets}
          className="p-2 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          title="Canned Snippets (/)"
        >
          <Command size={15} />
        </button>

        <button
          onClick={onOpenSignatures}
          className="p-2 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          title="Email Signatures"
        >
          <PenTool size={15} />
        </button>

        <button
          onClick={onOpenRules}
          className="p-2 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          title="Automations & Rules"
        >
          <Zap size={15} className="text-amber-500" />
        </button>

        <button
          onClick={onOpenAddAccount}
          className="p-2 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          title="Account Settings & Add Mailbox"
        >
          <Settings size={15} />
        </button>
      </div>

      {/* Premium Aurora Custom Disconnect Account Modal Portal */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {accountToDisconnect && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setAccountToDisconnect(null)}
                className="fixed inset-0 bg-zinc-950/70 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.94, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: 15 }}
                className="relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden p-6 z-[10000] space-y-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-500/20">
                    <Trash2 size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Disconnect Mailbox</h3>
                    <p className="text-xs text-zinc-500">Are you sure you want to remove this account?</p>
                  </div>
                </div>

                <div className="p-3.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-2xl flex items-center gap-3">
                  {renderAccountProviderIcon(accountToDisconnect, "w-5 h-5 shrink-0")}
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-xs text-zinc-900 dark:text-white truncate">{accountToDisconnect.name}</p>
                    <p className="text-[11px] text-zinc-400 truncate">{accountToDisconnect.email}</p>
                  </div>
                </div>

                <p className="text-xs text-zinc-500 leading-relaxed">
                  Disconnecting this account will remove its live synchronization from Aurora. You can reconnect it anytime.
                </p>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setAccountToDisconnect(null)}
                    className="px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (onDeleteAccount) {
                        onDeleteAccount(accountToDisconnect.id);
                      }
                      setAccountToDisconnect(null);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all"
                  >
                    <Trash2 size={13} />
                    <span>Disconnect Mailbox</span>
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

    </div>
  );
};
