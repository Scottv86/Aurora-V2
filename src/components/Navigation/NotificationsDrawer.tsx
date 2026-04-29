import { useState } from 'react';
import { 
  Bell, 
  X, 
  Check, 
  MessageSquare, 
  Zap, 
  Shield, 
  UserPlus,
  AlertCircle,
  MoreVertical
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { usePlatform } from '../../hooks/usePlatform';

interface Notification {
  id: string;
  type: 'message' | 'system' | 'security' | 'user' | 'alert';
  title: string;
  content: string;
  timestamp: Date;
  isRead: boolean;
  priority?: 'high' | 'medium' | 'low';
}

const NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    type: 'message',
    title: 'New message from Sarah',
    content: 'Can you review the latest module design for the client onboarding flow?',
    timestamp: new Date(Date.now() - 1000 * 60 * 15),
    isRead: false,
    priority: 'medium'
  },
  {
    id: '2',
    type: 'alert',
    title: 'Deployment Successful',
    content: 'Production environment updated to v2.4.0 successfully.',
    timestamp: new Date(Date.now() - 1000 * 60 * 120),
    isRead: false,
    priority: 'low'
  },
  {
    id: '3',
    type: 'security',
    title: 'Security Alert',
    content: 'New login detected from a new device in London, UK.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5),
    isRead: true,
    priority: 'high'
  },
  {
    id: '4',
    type: 'user',
    title: 'New Team Member',
    content: 'James Wilson has joined the Engineering team.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
    isRead: true,
  },
  {
    id: '5',
    type: 'system',
    title: 'System Maintenance',
    content: 'Scheduled maintenance will occur this Sunday at 2:00 AM UTC.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48),
    isRead: true,
  }
];

export const NotificationsDrawer = () => {
  const { setIsNotificationsOpen } = usePlatform();
  const [notifications, setNotifications] = useState(NOTIFICATIONS);

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'message': return <MessageSquare size={16} className="text-blue-500" />;
      case 'system': return <Zap size={16} className="text-purple-500" />;
      case 'security': return <Shield size={16} className="text-rose-500" />;
      case 'user': return <UserPlus size={16} className="text-emerald-500" />;
      case 'alert': return <Check size={16} className="text-amber-500" />;
      default: return <Bell size={16} className="text-zinc-500" />;
    }
  };

  return (
    <motion.aside
      initial={{ x: 400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 400, opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed right-0 top-16 bottom-0 w-96 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-xl border-l border-zinc-200 dark:border-zinc-800 flex flex-col z-40 shadow-2xl shadow-black/20"
    >
      
      {/* Header */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 dark:bg-amber-500/20 flex items-center justify-center border border-amber-500/20">
              <Bell size={18} className="text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Notifications</h3>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">
                  {notifications.filter(n => !n.isRead).length} Unread
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={markAllAsRead}
              className="p-2 text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              title="Mark all as read"
            >
              <Check size={18} />
            </button>
            <button 
              onClick={() => setIsNotificationsOpen(false)}
              className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {notifications.length > 0 ? (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
            {notifications.map((n) => (
              <div 
                key={n.id}
                className={cn(
                  "p-4 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors relative group/notif",
                  !n.isRead && "bg-indigo-500/[0.02]"
                )}
              >
                {!n.isRead && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500" />
                )}
                
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center shrink-0">
                    {getIcon(n.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h4 className={cn(
                        "text-xs font-bold truncate",
                        n.isRead ? "text-zinc-600 dark:text-zinc-400" : "text-zinc-900 dark:text-white"
                      )}>
                        {n.title}
                      </h4>
                      <span className="text-[10px] text-zinc-400 whitespace-nowrap">
                        {n.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed line-clamp-2">
                      {n.content}
                    </p>
                    
                    <div className="flex items-center gap-3 mt-3">
                      {n.priority === 'high' && (
                        <span className="flex items-center gap-1 text-[9px] font-bold text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                          <AlertCircle size={10} />
                          High Priority
                        </span>
                      )}
                      <button className="text-[10px] font-bold text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300">
                        View Details
                      </button>
                    </div>
                  </div>
                  
                  <div className="opacity-0 group-hover/notif:opacity-100 transition-opacity">
                    <button 
                      onClick={() => deleteNotification(n.id)}
                      className="p-1 text-zinc-400 hover:text-rose-500 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center mb-4 text-zinc-400">
              <Bell size={32} />
            </div>
            <h4 className="text-sm font-bold text-zinc-900 dark:text-white mb-1">No notifications</h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">You're all caught up! New notifications will appear here.</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 flex items-center justify-center">
        <button className="text-[10px] font-bold text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors uppercase tracking-widest">
          View Notification History
        </button>
      </div>
    </motion.aside>
  );
};
