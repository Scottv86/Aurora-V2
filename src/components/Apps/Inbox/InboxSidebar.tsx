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
  width?: number;
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

  return (
    <div 
      style={{ width: `${width}px` }}
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
            <button
              key={acc.id}
              onClick={() => {
                onSelectAccount(acc.id);
                onSelectLabel(null);
              }}
              className={cn(
                "w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-left transition-all cursor-pointer group",
                selectedAccountId === acc.id
                  ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white font-bold"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
              )}
            >
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: acc.color }} />
              <div className="flex-1 min-w-0">
                <p className="truncate text-xs font-semibold leading-tight">{acc.name}</p>
                <p className="truncate text-[10px] text-zinc-400">{acc.email}</p>
              </div>
              {unreadCounts[acc.id] > 0 && (
                <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200">
                  {unreadCounts[acc.id]}
                </span>
              )}
            </button>
          ))}

          {/* Shared Inboxes */}
          {sharedAccounts.length > 0 && (
            <div className="pt-2">
              <div className="px-2 py-1 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                <Users size={11} /> Shared Inboxes
              </div>
              {sharedAccounts.map(acc => (
                <button
                  key={acc.id}
                  onClick={() => {
                    onSelectAccount(acc.id);
                    onSelectLabel(null);
                  }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-left transition-all cursor-pointer group",
                    selectedAccountId === acc.id
                      ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white font-bold"
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                  )}
                >
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: acc.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-xs font-semibold leading-tight">{acc.name}</p>
                    <p className="truncate text-[10px] text-zinc-400">{acc.email}</p>
                  </div>
                  {unreadCounts[acc.id] > 0 && (
                    <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400">
                      {unreadCounts[acc.id]}
                    </span>
                  )}
                </button>
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

    </div>
  );
};
