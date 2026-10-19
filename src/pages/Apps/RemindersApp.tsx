import React, { useState, useEffect, useMemo } from 'react';
import { 
  Bell, 
  CheckCircle2, 
  Circle, 
  Calendar, 
  Clock, 
  AlertCircle, 
  Flag, 
  Plus, 
  Search, 
  Trash2, 
  ExternalLink, 
  Layers
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { usePlatform } from '../../hooks/usePlatform';
import { RemindersClientService } from '../../services/remindersService';
import { UniversalReminder, ReminderSmartView } from '../../types/reminders';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export const RemindersApp: React.FC = () => {
  const { session } = useAuth();
  const { tenant, modules } = usePlatform();
  const navigate = useNavigate();
  const token = session?.access_token;
  const tenantId = tenant?.id;

  const [reminders, setReminders] = useState<UniversalReminder[]>([]);
  const [activeView, setActiveView] = useState<ReminderSmartView>('today');
  const [selectedModuleId, setSelectedModuleId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Fast Creation Form States
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPriority, setNewPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [newDuePreset, setNewDuePreset] = useState<'today_eod' | 'tomorrow_9am' | 'next_week' | 'custom'>('tomorrow_9am');
  const [customDueDate, setCustomDueDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const fetchReminders = async () => {
    if (!tenantId) return;
    try {
      setLoading(true);
      const data = await RemindersClientService.getReminders({}, token, tenantId);
      setReminders(data);
    } catch (err) {
      console.error('Failed to load reminders:', err);
      toast.error('Failed to load reminders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReminders();
  }, [tenantId, token]);

  const handleToggleComplete = async (id: string, currentStatus: string) => {
    if (!tenantId) return;
    try {
      const nextStatus = currentStatus === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
      setReminders(prev => prev.map(r => r.id === id ? { ...r, status: nextStatus, completedAt: nextStatus === 'COMPLETED' ? new Date().toISOString() : undefined } : r));
      await RemindersClientService.toggleComplete(id, token, tenantId);
      toast.success(nextStatus === 'COMPLETED' ? 'Reminder completed!' : 'Reminder reopened');
    } catch (err) {
      console.error('Failed to update status:', err);
      toast.error('Failed to update reminder');
      fetchReminders();
    }
  };

  const handleSnooze = async (id: string, minutes: number) => {
    if (!tenantId) return;
    try {
      await RemindersClientService.snoozeReminder(id, minutes, token, tenantId);
      toast.success(`Snoozed for ${minutes >= 60 ? `${minutes / 60} hour(s)` : `${minutes} minutes`}`);
      fetchReminders();
    } catch (err) {
      console.error('Failed to snooze reminder:', err);
      toast.error('Failed to snooze reminder');
    }
  };

  const handleDelete = async (id: string) => {
    if (!tenantId) return;
    try {
      await RemindersClientService.deleteReminder(id, token, tenantId);
      setReminders(prev => prev.filter(r => r.id !== id));
      toast.success('Reminder deleted');
    } catch (err) {
      console.error('Failed to delete reminder:', err);
      toast.error('Failed to delete reminder');
    }
  };

  const calculateDueDate = (): string => {
    const now = new Date();
    if (newDuePreset === 'today_eod') {
      now.setHours(17, 0, 0, 0);
      return now.toISOString();
    }
    if (newDuePreset === 'tomorrow_9am') {
      now.setDate(now.getDate() + 1);
      now.setHours(9, 0, 0, 0);
      return now.toISOString();
    }
    if (newDuePreset === 'next_week') {
      now.setDate(now.getDate() + 7);
      now.setHours(9, 0, 0, 0);
      return now.toISOString();
    }
    if (newDuePreset === 'custom' && customDueDate) {
      return new Date(customDueDate).toISOString();
    }
    now.setDate(now.getDate() + 1);
    now.setHours(9, 0, 0, 0);
    return now.toISOString();
  };

  const handleCreateReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId || !newTitle.trim()) return;

    try {
      setIsSubmitting(true);
      const dueAt = calculateDueDate();
      const created = await RemindersClientService.createReminder({
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
        dueAt,
        priority: newPriority,
      }, token, tenantId);

      setReminders([created, ...reminders]);
      setNewTitle('');
      setNewDescription('');
      setShowAddForm(false);
      toast.success('Reminder scheduled');
    } catch (err) {
      console.error('Failed to schedule reminder:', err);
      toast.error('Failed to schedule reminder');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Smart View Categorisation
  const { counts, filteredReminders } = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    let todayCount = 0;
    let scheduledCount = 0;
    let overdueCount = 0;
    let flaggedCount = 0;
    let completedCount = 0;

    reminders.forEach(r => {
      const isPending = r.status === 'PENDING' || r.status === 'SNOOZED';
      const due = new Date(r.dueAt);

      if (r.status === 'COMPLETED') {
        completedCount++;
      } else if (isPending) {
        if (due < startOfToday) overdueCount++;
        else if (due <= endOfToday) todayCount++;
        else scheduledCount++;

        if (r.priority === 'HIGH' || r.priority === 'URGENT') flaggedCount++;
      }
    });

    const filtered = reminders.filter(r => {
      const isPending = r.status === 'PENDING' || r.status === 'SNOOZED';
      const due = new Date(r.dueAt);

      if (selectedModuleId !== 'all' && r.moduleId !== selectedModuleId) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = r.title.toLowerCase().includes(q);
        const matchesDesc = (r.description || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc) return false;
      }

      switch (activeView) {
        case 'today':
          return isPending && due >= startOfToday && due <= endOfToday;
        case 'scheduled':
          return isPending && due > endOfToday;
        case 'overdue':
          return isPending && due < startOfToday;
        case 'flagged':
          return isPending && (r.priority === 'HIGH' || r.priority === 'URGENT');
        case 'completed':
          return r.status === 'COMPLETED';
        case 'all':
        default:
          return true;
      }
    });

    return {
      counts: {
        today: todayCount,
        scheduled: scheduledCount,
        overdue: overdueCount,
        flagged: flaggedCount,
        completed: completedCount,
        all: reminders.length
      },
      filteredReminders: filtered
    };
  }, [reminders, activeView, selectedModuleId, searchQuery]);

  return (
    <div className="h-full flex flex-col bg-zinc-50 dark:bg-zinc-950 overflow-hidden">
      
      {/* Top Header */}
      <div className="h-14 px-6 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
            <Bell size={18} />
          </div>
          <div>
            <h1 className="text-sm font-bold text-zinc-900 dark:text-white">Aurora Reminders</h1>
            <p className="text-[10px] text-zinc-400">Scheduled tasks, follow-ups, and operational alerts</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer"
          >
            <Plus size={14} />
            <span>Schedule Task</span>
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden">

        {/* Sidebar Views */}
        <div className="w-64 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-100/50 dark:bg-zinc-900/30 flex flex-col p-3 shrink-0">
          <div className="space-y-1 mb-6">
            <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider px-2 mb-2">Smart Views</p>
            {[
              { id: 'today', label: 'Today', icon: Calendar, count: counts.today, color: 'text-amber-500' },
              { id: 'scheduled', label: 'Scheduled', icon: Clock, count: counts.scheduled, color: 'text-blue-500' },
              { id: 'overdue', label: 'Overdue', icon: AlertCircle, count: counts.overdue, color: 'text-rose-500' },
              { id: 'flagged', label: 'High Priority', icon: Flag, count: counts.flagged, color: 'text-purple-500' },
              { id: 'completed', label: 'Completed', icon: CheckCircle2, count: counts.completed, color: 'text-emerald-500' },
              { id: 'all', label: 'All Reminders', icon: Layers, count: counts.all, color: 'text-zinc-500' },
            ].map(v => {
              const Icon = v.icon;
              const isActive = activeView === v.id;
              return (
                <button
                  key={v.id}
                  onClick={() => setActiveView(v.id as any)}
                  className={cn(
                    "w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer",
                    isActive
                      ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm font-semibold"
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-white/50 dark:hover:bg-zinc-800/50"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon size={15} className={v.color} />
                    <span>{v.label}</span>
                  </div>
                  {v.count > 0 && (
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-bold",
                      isActive
                        ? "bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-white"
                        : "bg-zinc-200/60 dark:bg-zinc-800 text-zinc-500"
                    )}>
                      {v.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Module Filter */}
          {modules && modules.length > 0 && (
            <div className="space-y-1 mt-auto pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider px-2 mb-2">Module Filter</p>
              <select
                value={selectedModuleId}
                onChange={(e) => setSelectedModuleId(e.target.value)}
                className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none cursor-pointer"
              >
                <option value="all">All Modules</option>
                {modules.map((m: any) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Reminders Feed */}
        <div className="flex-1 flex flex-col bg-white dark:bg-zinc-950 overflow-hidden">
          
          {/* Search & Fast Input */}
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex flex-col gap-3">
            <div className="relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Search reminders or descriptions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500/50"
              />
            </div>

            {/* Quick Add Form Drawer */}
            {showAddForm && (
              <form onSubmit={handleCreateReminder} className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-3">
                <input
                  type="text"
                  placeholder="Task title (e.g. Follow up on Q4 renewal)..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full text-sm font-semibold bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  autoFocus
                />

                <textarea
                  placeholder="Add details, contact notes or instructions..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={2}
                  className="w-full text-xs bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-2">
                    {[
                      { id: 'today_eod', label: 'Today (5 PM)' },
                      { id: 'tomorrow_9am', label: 'Tomorrow (9 AM)' },
                      { id: 'next_week', label: 'In 1 Week' },
                      { id: 'custom', label: 'Custom Date' }
                    ].map(preset => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setNewDuePreset(preset.id as any)}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer",
                          newDuePreset === preset.id
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100"
                        )}
                      >
                        {preset.label}
                      </button>
                    ))}

                    {newDuePreset === 'custom' && (
                      <input
                        type="datetime-local"
                        value={customDueDate}
                        onChange={(e) => setCustomDueDate(e.target.value)}
                        className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2 py-1 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none cursor-pointer"
                      />
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={newPriority}
                      onChange={(e) => setNewPriority(e.target.value as any)}
                      className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2 py-1 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none cursor-pointer"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>

                    <button
                      type="submit"
                      disabled={isSubmitting || !newTitle.trim()}
                      className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {isSubmitting ? 'Scheduling...' : 'Save Task'}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>

          {/* List Cards */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
            {loading ? (
              <div className="py-12 text-center text-xs text-zinc-400">Loading reminders...</div>
            ) : filteredReminders.length === 0 ? (
              <div className="py-16 text-center">
                <CheckCircle2 size={32} className="mx-auto text-emerald-500 mb-2 opacity-50" />
                <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">All caught up!</p>
                <p className="text-xs text-zinc-400 mt-1">No reminders pending in this view.</p>
              </div>
            ) : (
              filteredReminders.map(rem => {
                const isCompleted = rem.status === 'COMPLETED';
                const due = new Date(rem.dueAt);
                const isOverdue = !isCompleted && due < new Date();

                return (
                  <div
                    key={rem.id}
                    className={cn(
                      "p-3.5 rounded-2xl border transition-all flex items-start justify-between gap-3 group",
                      isCompleted
                        ? "bg-zinc-50/50 dark:bg-zinc-900/30 border-zinc-200 dark:border-zinc-800 opacity-60"
                        : isOverdue
                        ? "bg-rose-500/5 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900/50"
                        : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                    )}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      {/* Completion Checkbox */}
                      <button
                        onClick={() => handleToggleComplete(rem.id, rem.status)}
                        className="mt-0.5 text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer shrink-0"
                      >
                        {isCompleted ? (
                          <CheckCircle2 size={18} className="text-emerald-500 fill-emerald-500/10" />
                        ) : (
                          <Circle size={18} />
                        )}
                      </button>

                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className={cn(
                            "text-xs font-bold text-zinc-900 dark:text-white truncate",
                            isCompleted && "line-through text-zinc-400"
                          )}>
                            {rem.title}
                          </h4>

                          {/* Priority Badge */}
                          {rem.priority === 'URGENT' && (
                            <span className="px-1.5 py-0.2 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[9px] font-black uppercase">
                              Urgent
                            </span>
                          )}
                          {rem.priority === 'HIGH' && (
                            <span className="px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[9px] font-black uppercase">
                              High
                            </span>
                          )}
                        </div>

                        {rem.description && (
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                            {rem.description}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-2 pt-1 text-[10px] text-zinc-400">
                          {/* Due Date Indicator */}
                          <span className={cn(
                            "flex items-center gap-1 font-semibold",
                            isOverdue ? "text-rose-600 dark:text-rose-400" : "text-zinc-500 dark:text-zinc-400"
                          )}>
                            <Clock size={11} />
                            {due.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>

                          {/* Snooze Count */}
                          {rem.snoozeCount > 0 && (
                            <span className="text-amber-600 dark:text-amber-400 font-medium">
                              (Snoozed {rem.snoozeCount}x)
                            </span>
                          )}

                          {/* Linked Record Pill */}
                          {rem.record && rem.module && (
                            <button
                              onClick={() => navigate(`/workspace/module/${rem.module?.id}/record/${rem.record?.id}`)}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 font-semibold hover:underline cursor-pointer"
                            >
                              <span>{rem.module.name} Record</span>
                              <ExternalLink size={9} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions Menu */}
                    <div className="flex items-center gap-1 shrink-0">
                      {!isCompleted && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleSnooze(rem.id, 15)}
                            className="px-2 py-1 text-[10px] rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                            title="Snooze 15 minutes"
                          >
                            +15m
                          </button>
                          <button
                            onClick={() => handleSnooze(rem.id, 60)}
                            className="px-2 py-1 text-[10px] rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                            title="Snooze 1 hour"
                          >
                            +1h
                          </button>
                        </div>
                      )}

                      <button
                        onClick={() => handleDelete(rem.id)}
                        className="p-1.5 text-zinc-400 hover:text-rose-500 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Delete reminder"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
