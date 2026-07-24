import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  X, 
  Check, 
  MessageSquare, 
  Zap, 
  Shield, 
  UserPlus,
  AlertCircle,
  Clock,
  Loader2,
  ExternalLink,
  Trash2
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { usePlatform } from '../../hooks/usePlatform';
import { NotificationItem } from '../../context/PlatformContext';

export const NotificationsDrawer = () => {
  const navigate = useNavigate();
  const { 
    user,
    isDeveloper,
    notifications = [], 
    markNotificationAsRead, 
    markAllNotificationsAsRead, 
    deleteNotification, 
    clearNotifications, 
    setIsNotificationsOpen 
  } = usePlatform();

  const isDevUser = isDeveloper || user?.licenceType === 'Developer';
  const safeNotifications = (Array.isArray(notifications) ? notifications : []).filter(n => {
    if (!n) return false;
    const aud = n.audience || (n.type === 'scheduled_task' ? 'developer' : 'all');
    if (aud === 'developer' && !isDevUser) return false;
    return true;
  });
  const unreadCount = safeNotifications.filter(n => !n.isRead).length;

  const getIcon = (type: NotificationItem['type'], status?: NotificationItem['status']) => {
    if (type === 'scheduled_task') {
      if (status === 'running') return <Loader2 size={16} className="text-amber-500 animate-spin" />;
      if (status === 'completed') return <Check size={16} className="text-emerald-500" />;
      if (status === 'failed') return <AlertCircle size={16} className="text-rose-500" />;
      return <Clock size={16} className="text-indigo-500" />;
    }
    switch (type) {
      case 'message': return <MessageSquare size={16} className="text-blue-500" />;
      case 'system': return <Zap size={16} className="text-purple-500" />;
      case 'security': return <Shield size={16} className="text-rose-500" />;
      case 'user': return <UserPlus size={16} className="text-emerald-500" />;
      case 'alert': return <AlertCircle size={16} className="text-amber-500" />;
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
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 dark:bg-indigo-500/20 flex items-center justify-center border border-indigo-500/20">
              <Bell size={18} className="text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Notifications</h3>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">
                  {unreadCount} Unread
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button 
                onClick={markAllNotificationsAsRead}
                className="p-2 text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
                title="Mark all as read"
              >
                <Check size={18} />
              </button>
            )}
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
        {safeNotifications.length > 0 ? (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
            {safeNotifications.map((n) => (
              <div 
                key={n.id}
                onClick={() => !n.isRead && markNotificationAsRead(n.id)}
                className={cn(
                  "p-4 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors relative group/notif cursor-pointer",
                  !n.isRead && "bg-indigo-500/[0.03]"
                )}
              >
                {!n.isRead && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500" />
                )}
                
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center shrink-0">
                    {getIcon(n.type, n.status)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h4 className={cn(
                        "text-xs font-bold truncate",
                        n.isRead ? "text-zinc-600 dark:text-zinc-400" : "text-zinc-900 dark:text-white"
                      )}>
                        {n.title}
                      </h4>
                      <span className="text-[10px] text-zinc-400 whitespace-nowrap shrink-0">
                        {n.timestamp instanceof Date ? n.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed line-clamp-2">
                      {n.content}
                    </p>
                    
                    <div className="flex items-center justify-between gap-2 mt-3">
                      <div className="flex items-center gap-2">
                        {n.status === 'running' && (
                          <span className="flex items-center gap-1 text-[9px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded uppercase tracking-tighter border border-amber-500/20">
                            <Loader2 size={9} className="animate-spin" />
                            Running...
                          </span>
                        )}
                        {n.status === 'completed' && (
                          <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded uppercase tracking-tighter border border-emerald-500/20">
                            <Check size={9} />
                            Completed
                          </span>
                        )}
                        {n.status === 'failed' && (
                          <span className="flex items-center gap-1 text-[9px] font-bold text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded uppercase tracking-tighter border border-rose-500/20">
                            <AlertCircle size={9} />
                            Failed
                          </span>
                        )}
                        {n.priority === 'high' && !n.status && (
                          <span className="flex items-center gap-1 text-[9px] font-bold text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                            <AlertCircle size={10} />
                            High Priority
                          </span>
                        )}
                      </div>

                      {n.sessionId && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markNotificationAsRead(n.id);
                            setIsNotificationsOpen(false);
                            navigate(`/workspace/aurora-vibe/${n.sessionId}`);
                          }}
                          className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 px-2.5 py-1 rounded-md transition-all shadow-sm"
                        >
                          <span>Open</span>
                          <ExternalLink size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="opacity-0 group-hover/notif:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(n.id);
                      }}
                      className="p-1 text-zinc-400 hover:text-rose-500 transition-colors"
                      title="Delete notification"
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
      {safeNotifications.length > 0 && (
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 flex items-center justify-between">
          <button 
            onClick={clearNotifications}
            className="flex items-center gap-1 text-[10px] font-bold text-zinc-400 hover:text-rose-500 transition-colors uppercase tracking-widest"
          >
            <Trash2 size={12} />
            Clear All
          </button>
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
            {safeNotifications.length} Total
          </span>
        </div>
      )}
    </motion.aside>
  );
};

