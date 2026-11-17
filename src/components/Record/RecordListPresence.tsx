import React, { useState, useRef, useEffect } from 'react';
import { Bot, Pencil, Eye, Users, Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';
import { RecordCollaborator } from '../../hooks/useRecordPresence';

interface RecordListPresenceProps {
  collaborators?: RecordCollaborator[];
  compact?: boolean;
  className?: string;
}

export const RecordListPresence: React.FC<RecordListPresenceProps> = ({
  collaborators = [],
  compact = false,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  if (!collaborators || collaborators.length === 0) {
    return null;
  }

  const maxVisible = compact ? 2 : 3;
  const visible = collaborators.slice(0, maxVisible);
  const overflowCount = Math.max(0, collaborators.length - maxVisible);
  const isAnyEditing = collaborators.some((c) => c.status === 'editing' || Boolean(c.activeFieldId));

  return (
    <div
      ref={containerRef}
      className={cn("relative inline-flex items-center shrink-0 select-none", className)}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        onMouseEnter={() => setIsOpen(true)}
        className={cn(
          "flex items-center -space-x-1.5 hover:space-x-0.5 transition-all p-0.5 rounded-full cursor-pointer group",
          isAnyEditing
            ? "bg-amber-500/10 hover:bg-amber-500/20 ring-1 ring-amber-500/30"
            : "bg-emerald-500/10 hover:bg-emerald-500/20 ring-1 ring-emerald-500/20"
        )}
        title={
          isAnyEditing
            ? `${collaborators.length} active (someone is editing)`
            : `${collaborators.length} viewing this record`
        }
      >
        {visible.map((collab) => {
          const isAgent = collab.role === 'agent';
          const isEditing = collab.status === 'editing' || Boolean(collab.activeFieldId);
          const avatarSize = compact ? "w-4 h-4 text-[8px]" : "w-5 h-5 text-[9px]";

          return (
            <div
              key={collab.socketId || collab.userId}
              className="relative transition-transform group-hover:scale-105"
            >
              {isAgent ? (
                <div
                  className={cn(
                    "rounded-full bg-indigo-600 text-white flex items-center justify-center border shadow-2xs",
                    avatarSize
                  )}
                  style={{ borderColor: collab.color || '#6366f1' }}
                  title={`${collab.name} (AI Co-Pilot)`}
                >
                  <Bot size={compact ? 8 : 10} className="animate-pulse" />
                </div>
              ) : collab.avatarUrl ? (
                <img
                  src={collab.avatarUrl}
                  alt={collab.name}
                  className={cn(
                    "rounded-full object-cover border shadow-2xs bg-zinc-200 dark:bg-zinc-700",
                    avatarSize
                  )}
                  style={{ borderColor: collab.color || '#6366f1' }}
                />
              ) : (
                <div
                  className={cn(
                    "rounded-full flex items-center justify-center font-bold text-white border shadow-2xs",
                    avatarSize
                  )}
                  style={{ backgroundColor: collab.color || '#6366f1', borderColor: '#ffffff' }}
                >
                  {collab.name
                    ? collab.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()
                    : 'U'}
                </div>
              )}

              {/* Status Indicator Dot */}
              <span
                className={cn(
                  "absolute -bottom-0.5 -right-0.5 rounded-full border border-white dark:border-zinc-900 shadow-2xs",
                  compact ? "w-1.5 h-1.5" : "w-2 h-2",
                  isEditing ? "bg-amber-500 animate-pulse" : "bg-emerald-500"
                )}
              />
            </div>
          );
        })}

        {overflowCount > 0 && (
          <div
            className={cn(
              "rounded-full bg-zinc-200 dark:bg-zinc-800 border border-white dark:border-zinc-900 flex items-center justify-center font-bold text-zinc-700 dark:text-zinc-200 shadow-2xs",
              compact ? "w-4 h-4 text-[8px]" : "w-5 h-5 text-[9px]"
            )}
          >
            +{overflowCount}
          </div>
        )}
      </button>

      {/* Popover Card */}
      {isOpen && (
        <div
          onMouseLeave={() => setIsOpen(false)}
          className="absolute left-0 top-full mt-1.5 w-64 p-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100 space-y-2"
        >
          <div className="flex items-center justify-between pb-1.5 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-zinc-900 dark:text-zinc-100">
              <Users size={12} className="text-indigo-600 dark:text-indigo-400" />
              <span>Active on this record</span>
            </div>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono">
              {collaborators.length}
            </span>
          </div>

          <div className="max-h-48 overflow-y-auto space-y-1.5 custom-scrollbar pr-0.5">
            {collaborators.map((c) => {
              const isAgent = c.role === 'agent';
              const isEditing = c.status === 'editing' || Boolean(c.activeFieldId);

              return (
                <div
                  key={c.socketId || c.userId}
                  className="flex items-center gap-2 p-1 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                >
                  <div className="relative shrink-0">
                    {isAgent ? (
                      <div
                        className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center border"
                        style={{ borderColor: c.color }}
                      >
                        <Bot size={11} />
                      </div>
                    ) : c.avatarUrl ? (
                      <img
                        src={c.avatarUrl}
                        alt={c.name}
                        className="w-6 h-6 rounded-full object-cover border"
                        style={{ borderColor: c.color }}
                      />
                    ) : (
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white border"
                        style={{ backgroundColor: c.color, borderColor: '#ffffff' }}
                      >
                        {c.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                    )}
                    <span
                      className={cn(
                        "absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white dark:border-zinc-900",
                        isEditing ? "bg-amber-500 animate-pulse" : "bg-emerald-500"
                      )}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                        {c.name}
                      </span>
                      {isAgent && (
                        <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded-full text-[8px] font-bold uppercase bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                          <Sparkles size={7} /> AI
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-[10px] mt-0.5">
                      {isEditing ? (
                        <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium truncate">
                          <Pencil size={9} className="shrink-0" />
                          <span>Editing {c.activeFieldId || 'field'}</span>
                        </span>
                      ) : (
                        <span className="text-zinc-400 dark:text-zinc-500 flex items-center gap-1 truncate">
                          <Eye size={9} className="shrink-0" />
                          <span>Viewing</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
