import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Hash, 
  Lock, 
  Plus, 
  Search, 
  ChevronDown, 
  ChevronRight, 
  MessageSquare, 
  Users, 
  Star, 
  X, 
  ArrowLeft 
} from 'lucide-react';
import { useChat } from '../../../context/ChatContext';
import { UserPresenceStatus } from '../../../types/chat';
import { cn } from '../../../lib/utils';

interface ChatSidebarProps {
  onOpenNewModal: (type: 'channel' | 'direct') => void;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({ onOpenNewModal }) => {
  const navigate = useNavigate();
  const { channels, activeChannel, setActiveChannel, userPresence, unreadTotal, users = [], isLoading } = useChat();
  
  const [search, setSearch] = useState('');
  const [isChannelsExpanded, setIsChannelsExpanded] = useState(true);
  const [isDmsExpanded, setIsDmsExpanded] = useState(true);

  const publicChannels = channels.filter(c => c.type === 'public' || c.type === 'private');
  const directMessages = channels.filter(c => c.type === 'direct' || c.type === 'group');

  const filteredChannels = publicChannels.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
  const filteredDms = directMessages.filter(c => {
    const title = c.dmRecipient?.name || c.name;
    return title.toLowerCase().includes(search.toLowerCase());
  });

  const getPresenceColor = (status?: UserPresenceStatus | string) => {
    const s = String(status || '').toUpperCase();
    switch (s) {
      case 'AVAILABLE':
      case 'ONLINE':
        return 'bg-emerald-500 ring-white dark:ring-zinc-900';
      case 'AWAY_TWIN':
      case 'AWAY':
        return 'bg-amber-500 shadow-sm shadow-amber-500/50 ring-white dark:ring-zinc-900';
      case 'DND_INTERCEPT':
      case 'BUSY':
        return 'bg-rose-500 ring-white dark:ring-zinc-900';
      case 'NIGHT_SHIFT':
        return 'bg-purple-600 ring-white dark:ring-zinc-900';
      default:
        return 'bg-zinc-400 ring-white dark:ring-zinc-900';
    }
  };

  return (
    <aside className="w-64 h-full bg-zinc-100/90 dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col select-none shrink-0">
      {/* Header */}
      <div className="h-14 px-4 border-b border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/workspace')}
            title="Back to Workspace"
            className="p-1.5 -ml-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 rounded-xl transition-colors cursor-pointer"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 shrink-0">
            <MessageSquare size={15} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white tracking-tight leading-none">Aurora Chat</h2>
            <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-medium mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
              <span>Full Screen</span>
            </div>
          </div>
        </div>
        
        {unreadTotal > 0 && (
          <span className="px-2 py-0.5 text-[11px] font-bold bg-indigo-600 text-white rounded-full">
            {unreadTotal}
          </span>
        )}
      </div>

      {/* Search & Quick Filter */}
      <div className="p-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search channels & DMs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Loading Skeleton OR Channel & DM Navigation List */}
      {isLoading && channels.length === 0 ? (
        <div className="flex-1 px-3 py-2 space-y-4 animate-pulse">
          <div className="space-y-2">
            <div className="h-3 w-16 bg-zinc-200 dark:bg-zinc-800/80 rounded" />
            <div className="h-7 bg-zinc-200/60 dark:bg-zinc-800/60 rounded-lg w-full" />
            <div className="h-7 bg-zinc-200/60 dark:bg-zinc-800/60 rounded-lg w-full" />
            <div className="h-7 bg-zinc-200/60 dark:bg-zinc-800/60 rounded-lg w-full" />
          </div>
          <div className="space-y-2 pt-2">
            <div className="h-3 w-24 bg-zinc-200 dark:bg-zinc-800/80 rounded" />
            <div className="h-7 bg-zinc-200/60 dark:bg-zinc-800/60 rounded-lg w-full" />
            <div className="h-7 bg-zinc-200/60 dark:bg-zinc-800/60 rounded-lg w-full" />
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-2 space-y-4 custom-scrollbar">
        {/* CHANNELS SECTION */}
        <div>
          <div className="flex items-center justify-between px-2 py-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            <button 
              onClick={() => setIsChannelsExpanded(!isChannelsExpanded)}
              className="flex items-center gap-1 hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              {isChannelsExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <span>Channels ({filteredChannels.length})</span>
            </button>
            <button
              onClick={() => onOpenNewModal('channel')}
              title="Create Channel"
              className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              <Plus size={14} />
            </button>
          </div>

          {isChannelsExpanded && (
            <div className="mt-1 space-y-0.5">
              {filteredChannels.map((channel) => {
                const isActive = activeChannel?.id === channel.id;
                return (
                  <button
                    key={channel.id}
                    onClick={() => setActiveChannel(channel)}
                    className={cn(
                      "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all group",
                      isActive
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-zinc-200"
                    )}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {channel.type === 'private' ? (
                        <Lock size={13} className={isActive ? "text-white/80" : "text-zinc-400 group-hover:text-zinc-600"} />
                      ) : (
                        <Hash size={13} className={isActive ? "text-white/80" : "text-zinc-400 group-hover:text-zinc-600"} />
                      )}
                      <span className="truncate">{channel.name}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {channel.isFavorite && (
                        <Star size={11} className={isActive ? "text-amber-300 fill-amber-300" : "text-amber-400 fill-amber-400"} />
                      )}
                      {channel.unreadCount && channel.unreadCount > 0 ? (
                        <span className={cn(
                          "px-1.5 py-0.2 text-[10px] font-bold rounded-full",
                          isActive ? "bg-white text-indigo-600" : "bg-indigo-600 text-white"
                        )}>
                          {channel.unreadCount}
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* DIRECT MESSAGES SECTION */}
        <div>
          <div className="flex items-center justify-between px-2 py-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            <button 
              onClick={() => setIsDmsExpanded(!isDmsExpanded)}
              className="flex items-center gap-1 hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              {isDmsExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <span>Direct Messages ({filteredDms.length})</span>
            </button>
            <button
              onClick={() => onOpenNewModal('direct')}
              title="New Message"
              className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              <Plus size={14} />
            </button>
          </div>

          {isDmsExpanded && (
            <div className="mt-1 space-y-0.5">
              {filteredDms.map((dm) => {
                const isActive = activeChannel?.id === dm.id;
                const isGroup = dm.type === 'group' || (dm.memberIds && dm.memberIds.length > 2);
                const contact = dm.dmRecipient;
                const matchedUser = contact?.id ? (userPresence[contact.id] || users.find(u => u.id === contact.id)) : users.find(u => u.name === dm.name);
                const avatarUrl = contact?.avatarUrl || matchedUser?.avatarUrl;
                const presence = contact?.presence || matchedUser?.presence || 'offline';
                const displayName = dm.name || contact?.name || matchedUser?.name || 'Direct Chat';
                const initial = displayName.charAt(0).toUpperCase();

                return (
                  <button
                    key={dm.id}
                    onClick={() => setActiveChannel(dm)}
                    className={cn(
                      "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all group",
                      isActive
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-zinc-200"
                    )}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <div className="relative shrink-0">
                        <div className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border overflow-hidden shrink-0",
                          isActive 
                            ? "bg-white/20 border-white/40 text-white" 
                            : isGroup
                            ? "bg-purple-50 dark:bg-purple-950/50 border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400"
                            : "bg-indigo-50 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400"
                        )}>
                          {isGroup ? (
                            <Users size={12} />
                          ) : avatarUrl ? (
                            <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover rounded-full" />
                          ) : (
                            initial
                          )}
                        </div>
                        {!isGroup && (
                          <span className={cn(
                            "absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ring-2",
                            getPresenceColor(presence)
                          )}></span>
                        )}
                      </div>

                      <div className="flex flex-col items-start truncate">
                        <span className="truncate leading-tight">{displayName}</span>
                        {contact?.status?.text && !isGroup && (
                          <span className={cn(
                            "text-[9px] truncate max-w-[120px]",
                            isActive ? "text-white/80" : "text-zinc-400"
                          )}>
                            {contact.status.emoji} {contact.status.text}
                          </span>
                        )}
                        {isGroup && dm.memberIds && (
                          <span className={cn(
                            "text-[9px] truncate",
                            isActive ? "text-white/80" : "text-zinc-400"
                          )}>
                            {dm.memberIds.length} members
                          </span>
                        )}
                      </div>
                    </div>

                    {dm.unreadCount && dm.unreadCount > 0 ? (
                      <span className={cn(
                        "px-1.5 py-0.2 text-[10px] font-bold rounded-full",
                        isActive ? "bg-white text-indigo-600" : "bg-indigo-600 text-white"
                      )}>
                        {dm.unreadCount}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
      )}
    </aside>
  );
};
