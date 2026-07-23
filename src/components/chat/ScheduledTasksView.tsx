import React, { useState } from 'react';
import { Search, Plus, Clock, Play, Edit2, Trash2, Folder, Sparkles, Loader2, CheckCircle2, AlertCircle, Calendar } from 'lucide-react';
import { ScheduledTaskData, AVAILABLE_SCHEDULE_MODELS } from './NewScheduledTaskModal';

interface ScheduledTasksViewProps {
  tasks: ScheduledTaskData[];
  onOpenNewModal: () => void;
  onEditTask: (task: ScheduledTaskData) => void;
  onDeleteTask: (taskId: string) => Promise<void>;
  onToggleTaskActive: (taskId: string, isActive: boolean) => Promise<void>;
  onRunTaskNow: (taskId: string) => Promise<void>;
  isLoading?: boolean;
}

export const ScheduledTasksView: React.FC<ScheduledTasksViewProps> = ({
  tasks,
  onOpenNewModal,
  onEditTask,
  onDeleteTask,
  onToggleTaskActive,
  onRunTaskNow,
  isLoading = false
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [runningTaskId, setRunningTaskId] = useState<string | null>(null);

  const filteredTasks = tasks.filter((t) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      t.name.toLowerCase().includes(q) ||
      t.prompt.toLowerCase().includes(q) ||
      t.project.toLowerCase().includes(q) ||
      (t.model && t.model.toLowerCase().includes(q))
    );
  });

  const activeRunningCount = tasks.filter(t => t.status === 'running' || runningTaskId === t.id).length;

  const handleRun = async (taskId: string) => {
    try {
      setRunningTaskId(taskId);
      await onRunTaskNow(taskId);
    } finally {
      setRunningTaskId(null);
    }
  };

  const getModelLabel = (modelId: string) => {
    const match = AVAILABLE_SCHEDULE_MODELS.find(
      m => m.id.toLowerCase() === (modelId || '').toLowerCase() || m.value.toLowerCase() === (modelId || '').toLowerCase()
    );
    return match ? match.id : (modelId || 'Default');
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-transparent text-zinc-100 overflow-hidden min-w-0 font-sans">
      {/* Secondary Header Bar (Glassmorphic) */}
      <div className="h-12 border-b border-zinc-200/50 dark:border-zinc-800/40 px-6 flex items-center justify-between flex-shrink-0 bg-white/40 dark:bg-zinc-950/40 backdrop-blur-2xl z-10 shadow-sm">
        {/* Left Side: Title & Badge */}
        <div className="flex items-center gap-3 min-w-0 flex-1 mr-4">
          <span className="font-semibold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 truncate min-w-0 select-none tracking-tight">
            Scheduled Tasks
          </span>
          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 backdrop-blur-md">
            <Sparkles className="h-3 w-3" /> Autonomous Cron
          </span>
          {activeRunningCount > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[11px] font-semibold animate-pulse shadow-sm shadow-purple-500/20">
              <Loader2 className="h-3 w-3 animate-spin text-purple-400" />
              {activeRunningCount} {activeRunningCount === 1 ? 'Task Executing' : 'Tasks Executing'}
            </span>
          )}
        </div>

        {/* Right Side: + New Button */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onOpenNewModal}
            className="flex items-center gap-1.5 bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500 hover:from-indigo-600 hover:via-purple-700 text-white text-xs py-1.5 px-3.5 rounded-xl font-semibold transition-all duration-200 shadow-md shadow-indigo-500/20 hover:shadow-indigo-500/35 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5 text-white" />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center max-w-4xl mx-auto w-full space-y-6 scrollbar-thin">
        {/* Glassmorphic Search Input Bar */}
        <div className="w-full max-w-lg relative group">
          <Search className="absolute left-4 top-3 h-4 w-4 text-zinc-400 dark:text-zinc-500 group-focus-within:text-indigo-500 transition-colors" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search scheduled tasks by name, prompt, folder or model..."
            className="w-full bg-white/40 dark:bg-zinc-900/40 backdrop-blur-2xl border border-zinc-200/60 dark:border-zinc-800/70 rounded-2xl pl-11 pr-4 py-2.5 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 shadow-xl shadow-black/5 focus:outline-none focus:border-indigo-500/70 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-300"
          />
        </div>

        {/* Content Area */}
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-zinc-500 text-xs gap-2">
            <Sparkles className="h-5 w-5 animate-pulse text-indigo-500" />
            <span>Loading scheduled tasks...</span>
          </div>
        ) : filteredTasks.length === 0 ? (
          /* Empty State */
          <div className="flex-1 flex flex-col items-center justify-center py-24 text-center space-y-3 bg-white/30 dark:bg-zinc-900/20 backdrop-blur-xl rounded-3xl border border-zinc-200/40 dark:border-zinc-800/40 p-8 w-full">
            <Clock className="h-10 w-10 text-zinc-400 dark:text-zinc-600 stroke-[1.5]" />
            <p className="text-sm text-zinc-500 font-medium">
              {searchQuery ? 'No matching scheduled tasks found.' : 'No scheduled tasks configured.'}
            </p>
            {!searchQuery && (
              <button
                onClick={onOpenNewModal}
                className="mt-2 flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-xs px-4 py-2.5 rounded-xl font-semibold transition-all shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 cursor-pointer"
              >
                <Plus className="h-4 w-4" /> Create First Task
              </button>
            )}
          </div>
        ) : (
          /* Task List Glass Cards */
          <div className="w-full space-y-3.5">
            {filteredTasks.map((task) => {
              const isRunning = task.status === 'running' || runningTaskId === task.id;
              const isFailed = task.status === 'failed';
              return (
                <div
                  key={task.id || task.name}
                  className={`relative overflow-hidden bg-white/50 dark:bg-zinc-900/40 backdrop-blur-2xl border rounded-2xl p-5 transition-all duration-300 shadow-lg shadow-black/5 hover:shadow-2xl hover:shadow-indigo-500/10 hover:border-indigo-500/40 hover:-translate-y-0.5 group ${
                    isRunning
                      ? 'border-indigo-500/60 ring-2 ring-indigo-500/20'
                      : task.isActive !== false
                      ? 'border-zinc-200/80 dark:border-zinc-800/80'
                      : 'border-zinc-200/40 dark:border-zinc-800/40 opacity-70'
                  }`}
                >
                  {/* Ambient Glass Glow Highlight */}
                  <div className={`absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl transition-all duration-500 pointer-events-none ${isRunning ? 'bg-indigo-500/30' : 'bg-indigo-500/10 dark:bg-indigo-500/15 group-hover:bg-indigo-500/20'}`} />

                  <div className="flex items-start justify-between gap-4 relative z-10">
                    {/* Left Task Details */}
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 truncate tracking-tight">
                          {task.name}
                        </h3>

                        {/* Live Running Badge */}
                        {isRunning && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-[11px] font-semibold animate-pulse shadow-sm shadow-indigo-500/20">
                            <Loader2 className="h-3 w-3 animate-spin" /> Executing Task...
                          </span>
                        )}

                        {/* Failed Badge */}
                        {!isRunning && isFailed && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-rose-500/15 text-rose-400 border border-rose-500/25 text-[11px] font-semibold">
                            <AlertCircle className="h-3 w-3 text-rose-400" /> Execution Failed
                          </span>
                        )}

                        {/* Folder Glass Tag */}
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-indigo-500/10 dark:bg-indigo-500/15 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 backdrop-blur-md shadow-sm">
                          <Folder className="h-3 w-3 text-indigo-500 dark:text-indigo-400" />
                          {task.project}
                        </span>

                        {/* Model Glass Tag */}
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-purple-500/10 dark:bg-purple-500/15 text-[11px] font-semibold text-purple-600 dark:text-purple-400 border border-purple-500/20 backdrop-blur-md shadow-sm">
                          <Sparkles className="h-3 w-3" />
                          {getModelLabel(task.model)}
                        </span>

                        {/* Schedule Time Pill */}
                        {task.frequency === 'Once' || task.scheduleType === 'Once' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-cyan-500/10 dark:bg-cyan-500/15 text-[11px] font-semibold text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 backdrop-blur-md shadow-sm">
                            <Calendar className="h-3 w-3" />
                            Once off on {task.runDate || 'selected date'} at {task.scheduleTime}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-amber-500/10 dark:bg-amber-500/15 text-[11px] font-medium text-amber-600 dark:text-amber-400 border border-amber-500/20 backdrop-blur-md shadow-sm">
                            <Clock className="h-3 w-3" />
                            {task.scheduleType} around {task.scheduleTime}
                            {(task.startDate || task.endDate) && (
                              <span className="text-[10px] opacity-80 font-normal pl-0.5">
                                ({task.startDate ? task.startDate : 'Now'} → {task.endDate ? task.endDate : '∞'})
                              </span>
                            )}
                          </span>
                        )}
                      </div>

                      {/* Prompt Snippet in Glass Container */}
                      <p className="text-xs text-zinc-700 dark:text-zinc-300/90 line-clamp-2 pt-1 font-normal bg-white/40 dark:bg-zinc-950/40 backdrop-blur-md p-3 rounded-xl border border-zinc-200/60 dark:border-zinc-800/60 shadow-inner">
                        "{task.prompt}"
                      </p>

                      {/* Last Executed Timestamp Footer */}
                      {task.lastRunAt && (
                        <div className="flex items-center gap-2 pt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                          <span>Last run: {new Date(task.lastRunAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                          {task.lastResult && <span className="truncate text-zinc-400">({task.lastResult})</span>}
                        </div>
                      )}
                    </div>

                    {/* Right Actions & Toggle */}
                    <div className="flex items-center gap-2.5 shrink-0 pt-0.5">
                      {/* Toggle Switch */}
                      <button
                        onClick={() => task.id && onToggleTaskActive(task.id, !task.isActive)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          task.isActive !== false ? 'bg-indigo-600' : 'bg-zinc-300 dark:bg-zinc-800'
                        }`}
                        title={task.isActive !== false ? 'Disable task' : 'Enable task'}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                            task.isActive !== false ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>

                      {/* Run Now Glass Button */}
                      <button
                        onClick={() => task.id && handleRun(task.id)}
                        disabled={isRunning}
                        className="p-2 rounded-xl bg-white/60 dark:bg-zinc-800/60 hover:bg-indigo-600 hover:text-white text-zinc-700 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700/60 backdrop-blur-md transition-all duration-200 cursor-pointer shadow-sm hover:shadow-indigo-500/30 disabled:opacity-50"
                        title="Run Task Now"
                      >
                        {isRunning ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-400" />
                        ) : (
                          <Play className="h-3.5 w-3.5" />
                        )}
                      </button>

                      {/* Edit Glass Button */}
                      <button
                        onClick={() => onEditTask(task)}
                        className="p-2 rounded-xl bg-white/60 dark:bg-zinc-800/60 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700/60 backdrop-blur-md transition-all duration-200 cursor-pointer shadow-sm"
                        title="Edit Task"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>

                      {/* Delete Glass Button */}
                      <button
                        onClick={() => task.id && onDeleteTask(task.id)}
                        className="p-2 rounded-xl bg-white/60 dark:bg-zinc-800/60 hover:bg-rose-600 hover:text-white text-zinc-700 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700/60 backdrop-blur-md transition-all duration-200 cursor-pointer shadow-sm hover:shadow-rose-500/30"
                        title="Delete Task"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
