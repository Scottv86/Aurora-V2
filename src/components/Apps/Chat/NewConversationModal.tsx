import React, { useState } from 'react';
import { 
  X, 
  Hash, 
  Lock, 
  MessageSquare, 
  Users, 
  Search, 
  Check 
} from 'lucide-react';
import { motion } from 'motion/react';
import { useChat } from '../../../context/ChatContext';
import { ChatUser } from '../../../types/chat';
import { cn } from '../../../lib/utils';

interface NewConversationModalProps {
  initialType?: 'channel' | 'direct';
  onClose: () => void;
}

export const NewConversationModal: React.FC<NewConversationModalProps> = ({ 
  initialType = 'channel', 
  onClose 
}) => {
  const { createChannel, users } = useChat();
  const [type, setType] = useState<'channel' | 'direct'>(initialType);
  
  // Channel Fields
  const [channelName, setChannelName] = useState('');
  const [channelDescription, setChannelDescription] = useState('');
  const [channelTopic, setChannelTopic] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  
  // DM / Group DM Fields
  const [selectedUsers, setSelectedUsers] = useState<ChatUser[]>([]);
  const [groupName, setGroupName] = useState('');
  const [searchMember, setSearchMember] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchMember.toLowerCase()) ||
    (u.email && u.email.toLowerCase().includes(searchMember.toLowerCase()))
  );

  const handleToggleUser = (user: ChatUser) => {
    if (selectedUsers.some(u => u.id === user.id)) {
      setSelectedUsers(prev => prev.filter(u => u.id !== user.id));
    } else {
      setSelectedUsers(prev => [...prev, user]);
    }
  };

  const handleRemoveUser = (userId: string) => {
    setSelectedUsers(prev => prev.filter(u => u.id !== userId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (type === 'channel') {
        if (!channelName.trim()) return;
        await createChannel({
          name: channelName.trim(),
          description: channelDescription.trim(),
          topic: channelTopic.trim(),
          type: isPrivate ? 'private' : 'public'
        });
      } else {
        if (selectedUsers.length === 0) return;

        if (selectedUsers.length === 1) {
          // 1:1 Direct Message
          const target = selectedUsers[0];
          await createChannel({
            name: target.name,
            type: 'direct',
            memberIds: [target.id],
            dmRecipient: target
          });
        } else {
          // Multi-User Group Chat (without creating a channel)
          const computedName = groupName.trim() || selectedUsers.map(u => u.name.split(' ')[0]).join(', ');
          await createChannel({
            name: computedName,
            type: 'direct', // Stored under conversational DMs
            memberIds: selectedUsers.map(u => u.id),
            dmRecipient: selectedUsers[0]
          });
        }
      }
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isGroupChat = selectedUsers.length > 1;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm">
              {type === 'channel' ? <Hash size={20} /> : (isGroupChat ? <Users size={20} /> : <MessageSquare size={20} />)}
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                {type === 'channel' ? 'Create a Channel' : (isGroupChat ? `New Group Chat (${selectedUsers.length} people)` : 'New Direct Message')}
              </h3>
              <p className="text-xs text-zinc-500">
                {type === 'channel' 
                  ? 'Channels are where team discussions take place.' 
                  : 'Start a 1:1 direct chat or multi-person group conversation without setting up a channel.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-white rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Type Switcher Tabs */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 text-xs font-semibold px-5 pt-3 bg-zinc-50/50 dark:bg-zinc-950/30">
          <button
            type="button"
            onClick={() => setType('channel')}
            className={cn(
              "py-2 px-4 flex items-center gap-2 border-b-2 font-bold transition-all",
              type === 'channel'
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-zinc-500 hover:text-zinc-800"
            )}
          >
            <Hash size={14} />
            <span>Channel</span>
          </button>
          <button
            type="button"
            onClick={() => setType('direct')}
            className={cn(
              "py-2 px-4 flex items-center gap-2 border-b-2 font-bold transition-all",
              type === 'direct'
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-zinc-500 hover:text-zinc-800"
            )}
          >
            <Users size={14} />
            <span>Direct & Group Chat</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {type === 'channel' ? (
            <>
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Channel Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-xs">#</span>
                  <input
                    type="text"
                    required
                    placeholder="e.g. project-apollo, design-sync"
                    value={channelName}
                    onChange={(e) => setChannelName(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                    className="w-full pl-7 pr-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Description <span className="text-zinc-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="What is this channel about?"
                  value={channelDescription}
                  onChange={(e) => setChannelDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Topic / Goal <span className="text-zinc-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sprint goals and daily updates"
                  value={channelTopic}
                  onChange={(e) => setChannelTopic(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                    <Lock size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-zinc-900 dark:text-white">Make Private</h4>
                    <p className="text-[11px] text-zinc-500">Only invited members can view this channel</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
              </div>
            </>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  Select People (Select 1 or multiple)
                </label>
                {selectedUsers.length > 0 && (
                  <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                    {selectedUsers.length} selected
                  </span>
                )}
              </div>

              {/* Selected User Pills */}
              {selectedUsers.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2.5 p-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                  {selectedUsers.map(u => (
                    <div 
                      key={u.id}
                      className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-semibold"
                    >
                      <span>{u.name}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveUser(u.id)}
                        className="p-0.5 hover:bg-indigo-200 dark:hover:bg-indigo-800 rounded-full text-indigo-500 hover:text-indigo-800 transition-colors"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Group Name (when 2+ people selected) */}
              {isGroupChat && (
                <div className="mb-3">
                  <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                    Group Name <span className="text-zinc-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder={`e.g. ${selectedUsers.map(u => u.name.split(' ')[0]).join(', ')}`}
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}

              <div className="relative mb-2.5">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchMember}
                  onChange={(e) => setSearchMember(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                />
              </div>

              <div className="max-h-52 overflow-y-auto custom-scrollbar space-y-1 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-1 bg-zinc-50/50 dark:bg-zinc-950">
                {filteredUsers.map((u) => {
                  const isSelected = selectedUsers.some(sel => sel.id === u.id);
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => handleToggleUser(u)}
                      className={cn(
                        "w-full flex items-center justify-between p-2 rounded-xl text-xs transition-colors",
                        isSelected
                          ? "bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-300 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200 font-semibold"
                          : "hover:bg-zinc-200/60 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={cn(
                          "w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs border shrink-0",
                          isSelected 
                            ? "bg-indigo-600 text-white border-indigo-500 shadow-sm" 
                            : "bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800"
                        )}>
                          {u.avatarUrl ? (
                            <img src={u.avatarUrl} alt={u.name} className="w-full h-full rounded-full object-cover" />
                          ) : (
                            u.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="flex flex-col text-left">
                          <span className="leading-tight">{u.name}</span>
                          <span className="text-[10px] text-zinc-400">
                            {u.role || u.email}
                          </span>
                        </div>
                      </div>
                      <div className={cn(
                        "w-5 h-5 rounded-md border flex items-center justify-center transition-all",
                        isSelected 
                          ? "bg-indigo-600 border-indigo-600 text-white" 
                          : "border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                      )}>
                        {isSelected && <Check size={12} className="stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (type === 'channel' ? !channelName.trim() : selectedUsers.length === 0)}
              className={cn(
                "px-5 py-2 text-xs font-bold rounded-xl text-white transition-all shadow-md",
                (type === 'channel' ? channelName.trim() : selectedUsers.length > 0)
                  ? "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20 cursor-pointer"
                  : "bg-zinc-300 dark:bg-zinc-800 cursor-not-allowed text-zinc-500 shadow-none"
              )}
            >
              {isSubmitting 
                ? 'Creating...' 
                : type === 'channel' 
                ? 'Create Channel' 
                : isGroupChat 
                ? `Start Group Chat (${selectedUsers.length})` 
                : 'Start Direct Chat'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};
