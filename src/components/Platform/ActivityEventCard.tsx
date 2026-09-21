import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Sparkles, 
  Edit3, 
  Tag, 
  UserCheck, 
  GitFork, 
  MessageSquare, 
  Shield, 
  ExternalLink, 
  ChevronDown, 
  ChevronUp, 
  FileText
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { UserAvatarWithPresence } from '../Common/UserPresenceBadge';

export interface ActivityChange {
  fieldId: string;
  fieldLabel: string;
  oldValue: any;
  newValue: any;
  displayType?: string;
}

export interface ActivityEvent {
  id: string;
  tenantId: string;
  timestamp: string;
  action: string;
  category: 'CREATION' | 'FIELD' | 'STATUS' | 'ASSIGNMENT' | 'WORKFLOW' | 'AUTOMATION' | 'COMMENT' | 'SECURITY';
  resourceId: string;
  moduleId?: string;
  moduleName?: string;
  resourceKey?: string;
  resourceTitle?: string;
  actor: {
    id: string;
    name: string;
    email?: string;
    avatarUrl?: string | null;
    type?: string;
    role?: string | null;
  };
  changes?: ActivityChange[];
  metadata?: {
    source?: string;
    formId?: string;
    formTitle?: string;
    comment?: string;
    ip?: string;
    userAgent?: string;
    [key: string]: any;
  };
  description?: string;
}

interface ActivityEventCardProps {
  event: ActivityEvent;
  showResourceLink?: boolean; // True when rendered in tenant-wide 'Feed' App
  onNavigateToRecord?: (moduleId: string, recordId: string) => void;
}

function formatRelativeTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSec < 45) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return 'Recently';
  }
}

function renderValue(val: any): string {
  if (val === null || val === undefined || val === '') return 'None';
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (typeof val === 'object') {
    if (Array.isArray(val)) {
      if (val.length === 0) return 'None';
      return val.map(item => (typeof item === 'object' ? item.name || item.label || item.id || JSON.stringify(item) : String(item))).join(', ');
    }
    return val.name || val.label || val.title || JSON.stringify(val);
  }
  return String(val);
}

export const ActivityEventCard: React.FC<ActivityEventCardProps> = ({
  event,
  showResourceLink = false,
  onNavigateToRecord
}) => {
  const [expanded, setExpanded] = useState(false);

  // Category-specific visual icon and accents
  const getCategoryConfig = () => {
    switch (event.category) {
      case 'CREATION':
        return {
          icon: Sparkles,
          color: 'text-emerald-500 dark:text-emerald-400',
          bg: 'bg-emerald-500/10 dark:bg-emerald-500/15 border-emerald-500/20',
          pillBg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
        };
      case 'STATUS':
        return {
          icon: Tag,
          color: 'text-amber-500 dark:text-amber-400',
          bg: 'bg-amber-500/10 dark:bg-amber-500/15 border-amber-500/20',
          pillBg: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
        };
      case 'ASSIGNMENT':
        return {
          icon: UserCheck,
          color: 'text-blue-500 dark:text-blue-400',
          bg: 'bg-blue-500/10 dark:bg-blue-500/15 border-blue-500/20',
          pillBg: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
        };
      case 'WORKFLOW':
        return {
          icon: GitFork,
          color: 'text-purple-500 dark:text-purple-400',
          bg: 'bg-purple-500/10 dark:bg-purple-500/15 border-purple-500/20',
          pillBg: 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300'
        };
      case 'COMMENT':
        return {
          icon: MessageSquare,
          color: 'text-indigo-500 dark:text-indigo-400',
          bg: 'bg-indigo-500/10 dark:bg-indigo-500/15 border-indigo-500/20',
          pillBg: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300'
        };
      case 'SECURITY':
        return {
          icon: Shield,
          color: 'text-rose-500 dark:text-rose-400',
          bg: 'bg-rose-500/10 dark:bg-rose-500/15 border-rose-500/20',
          pillBg: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
        };
      case 'FIELD':
      default:
        return {
          icon: Edit3,
          color: 'text-cyan-500 dark:text-cyan-400',
          bg: 'bg-cyan-500/10 dark:bg-cyan-500/15 border-cyan-500/20',
          pillBg: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300'
        };
    }
  };

  const config = getCategoryConfig();
  const IconComponent = config.icon;
  const changes = event.changes || [];
  const hasDiffs = changes.length > 0;
  const visibleDiffs = expanded ? changes : changes.slice(0, 3);
  const remainingDiffsCount = changes.length - 3;

  return (
    <div className="group relative flex gap-3 p-3.5 rounded-2xl bg-white dark:bg-zinc-900/60 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all shadow-xs">
      {/* Category Icon Badge */}
      <div className={cn(
        "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border mt-0.5",
        config.bg,
        config.color
      )}>
        <IconComponent size={14} />
      </div>

      <div className="flex-1 min-w-0 space-y-1.5">
        {/* Header Row: Actor Info & Timestamp */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 min-w-0">
            {event.actor?.avatarUrl ? (
              <UserAvatarWithPresence
                avatarUrl={event.actor.avatarUrl}
                name={event.actor.name}
                status="AVAILABLE"
                size="xs"
              />
            ) : (
              <div className="w-5 h-5 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-600 dark:text-zinc-300 shrink-0">
                {event.actor?.name ? event.actor.name.charAt(0).toUpperCase() : 'U'}
              </div>
            )}

            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
              {event.actor?.name || 'System'}
            </span>

            {event.actor?.role && (
              <span className="text-[10px] font-medium px-1.5 py-0.2 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                {event.actor.role}
              </span>
            )}

            {event.actor?.type === 'AI_AGENT' && (
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                AI
              </span>
            )}

            {event.actor?.type === 'PUBLIC_FORM' && (
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                External Guest
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-[11px] text-zinc-400 shrink-0">
            <span title={new Date(event.timestamp).toLocaleString()}>
              {formatRelativeTime(event.timestamp)}
            </span>
          </div>
        </div>

        {/* Resource Badge for Tenant-Wide 'Feed' View */}
        {showResourceLink && (event.moduleName || event.resourceKey || event.resourceTitle) && (
          <div className="flex items-center gap-1.5 pt-0.5">
            <Link
              to={event.moduleId && event.resourceId ? `/workspace/modules/${event.moduleId}/records/${event.resourceId}` : '#'}
              onClick={(e) => {
                if (onNavigateToRecord && event.moduleId && event.resourceId) {
                  e.preventDefault();
                  onNavigateToRecord(event.moduleId, event.resourceId);
                }
              }}
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-zinc-100 hover:bg-indigo-50 dark:bg-zinc-800 dark:hover:bg-indigo-950/40 text-[11px] font-semibold text-zinc-700 hover:text-indigo-600 dark:text-zinc-300 dark:hover:text-indigo-400 transition-colors border border-zinc-200/60 dark:border-zinc-700/60"
            >
              <FileText size={11} className="text-zinc-400" />
              <span>{event.moduleName || 'Module'}</span>
              <span className="text-zinc-300 dark:text-zinc-600">•</span>
              <span className="font-bold">{event.resourceKey || event.resourceTitle || 'Record'}</span>
              <ExternalLink size={10} className="opacity-60" />
            </Link>
          </div>
        )}

        {/* Event Main Description */}
        <p className="text-xs text-zinc-700 dark:text-zinc-300 font-medium leading-relaxed">
          {event.description || event.action}
        </p>

        {/* Comment Note Callout */}
        {event.metadata?.comment && (
          <div className="p-2.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 text-xs text-zinc-800 dark:text-zinc-200 italic">
            "{event.metadata.comment}"
          </div>
        )}

        {/* Inception Source Badges */}
        {event.category === 'CREATION' && event.metadata?.source && (
          <div className="flex items-center gap-2 pt-1 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
              Source: <strong className="text-zinc-900 dark:text-white font-semibold">{event.metadata.source}</strong>
            </span>
            {event.metadata?.formTitle && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                Form: <strong>{event.metadata.formTitle}</strong>
              </span>
            )}
          </div>
        )}

        {/* Field Level Value Diffs */}
        {hasDiffs && (
          <div className="pt-1.5 space-y-1.5">
            <div className="space-y-1">
              {visibleDiffs.map((diff, idx) => (
                <div 
                  key={idx}
                  className="flex items-center gap-2 text-[11px] p-2 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200/80 dark:border-zinc-800/80 flex-wrap"
                >
                  <span className="font-semibold text-zinc-600 dark:text-zinc-400 shrink-0">
                    {diff.fieldLabel}:
                  </span>

                  <span className="line-through text-rose-500 dark:text-rose-400/90 font-mono text-[10px] px-1 py-0.2 rounded bg-rose-50 dark:bg-rose-950/30 border border-rose-200/50 dark:border-rose-900/30 max-w-[160px] truncate">
                    {renderValue(diff.oldValue)}
                  </span>

                  <span className="text-zinc-400 text-xs">→</span>

                  <span className="text-emerald-600 dark:text-emerald-400 font-mono text-[10px] font-semibold px-1 py-0.2 rounded bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-900/30 max-w-[180px] truncate">
                    {renderValue(diff.newValue)}
                  </span>
                </div>
              ))}
            </div>

            {remainingDiffsCount > 0 && (
              <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer pt-0.5"
              >
                {expanded ? (
                  <>
                    <span>Show fewer changes</span>
                    <ChevronUp size={12} />
                  </>
                ) : (
                  <>
                    <span>+{remainingDiffsCount} more field {remainingDiffsCount === 1 ? 'change' : 'changes'}</span>
                    <ChevronDown size={12} />
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
