import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Sparkles, 
  Edit3, 
  Tag, 
  UserCheck, 
  GitFork, 
  MessageSquare, 
  Shield, 
  Eye,
  ExternalLink, 
  ChevronDown, 
  ChevronUp, 
  FileText,
  CheckSquare
} from 'lucide-react';
import { cn, formatLocalizedDate } from '../../lib/utils';
import { usePlatform } from '../../hooks/usePlatform';
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
  category: 'CREATION' | 'FIELD' | 'STATUS' | 'ASSIGNMENT' | 'WORKFLOW' | 'AUTOMATION' | 'COMMENT' | 'SECURITY' | 'ACCESS';
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
  showTechnicalMeta?: boolean; // Whether to show IP, client browser, and raw view mode tags (defaults to false)
  members?: any[];
  allFields?: any[];
}

function formatRelativeTime(isoString: string, dateFormat?: string): string {
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
    return formatLocalizedDate(date, dateFormat);
  } catch {
    return 'Recently';
  }
}

function formatUserAgent(ua?: string): string {
  if (!ua) return '';
  let browser = 'Browser';
  if (ua.includes('Edg/')) browser = 'Edge';
  else if (ua.includes('Chrome/')) browser = 'Chrome';
  else if (ua.includes('Safari/') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Firefox/')) browser = 'Firefox';

  let os = '';
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Macintosh') || ua.includes('Mac OS')) os = 'macOS';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('Linux')) os = 'Linux';

  return os ? `${browser} on ${os}` : browser;
}

function parseIfJson(val: any): any {
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        return JSON.parse(trimmed);
      } catch {
        return val;
      }
    }
  }
  return val;
}

function renderValue(
  rawVal: any,
  entityMap?: Map<string, string>,
  fieldDef?: any,
  dateFormat?: string
): string {
  const val = parseIfJson(rawVal);
  if (val === null || val === undefined || val === '') return 'None';
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (val instanceof Date) return formatLocalizedDate(val, dateFormat, false);

  if (typeof val === 'number') {
    if (fieldDef?.type === 'date' || fieldDef?.type === 'datetime') {
      return formatLocalizedDate(val, dateFormat, fieldDef?.type === 'datetime');
    }
    return String(val);
  }

  if (typeof val === 'string') {
    // 1. Check if it matches a known member, user or team ID
    if (entityMap && entityMap.has(val)) {
      return entityMap.get(val)!;
    }
    // 2. Check if field has option choices matching this value
    if (fieldDef?.options && Array.isArray(fieldDef.options)) {
      const opt = fieldDef.options.find((o: any) => o.id === val || o.value === val);
      if (opt?.label || opt?.name) return opt.label || opt.name;
    }
    // 3. Check for dates
    const trimmed = val.trim();
    if (
      fieldDef?.type === 'date' || 
      fieldDef?.type === 'datetime' || 
      /^\d{4}-\d{2}-\d{2}$/.test(trimmed) || 
      /^\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}/.test(trimmed)
    ) {
      const isDateTime = fieldDef?.type === 'datetime' || trimmed.includes('T') || (trimmed.includes(':') && trimmed.includes(' '));
      const formatted = formatLocalizedDate(trimmed, dateFormat, isDateTime);
      if (formatted && formatted !== trimmed) return formatted;
    }
    return val;
  }

  if (typeof val === 'object') {
    if (Array.isArray(val)) {
      if (val.length === 0) return 'None';
      const items = val.map(item => renderValue(item, entityMap, fieldDef, dateFormat)).filter(v => v && v !== 'None');
      return items.length > 0 ? items.join(', ') : 'None';
    }

    // If object with member/user ID
    if (entityMap) {
      if (val.id && entityMap.has(val.id)) return entityMap.get(val.id)!;
      if (val.userId && entityMap.has(val.userId)) return entityMap.get(val.userId)!;
      if (val.memberId && entityMap.has(val.memberId)) return entityMap.get(val.memberId)!;
    }

    // If object with common descriptive fields:
    if (val.name) return String(val.name);
    if (val.label) return String(val.label);
    if (val.title) return String(val.title);
    if (val.value !== undefined) return renderValue(val.value, entityMap, fieldDef, dateFormat);
    
    // If it's a field-values object like { "field-9w2k31wo": "Mr" }
    const values = Object.values(val);
    if (values.length > 0) {
      const cleanValues = values
        .map(v => renderValue(v, entityMap, fieldDef, dateFormat))
        .filter(v => v && v !== 'None');
      if (cleanValues.length > 0) {
        return cleanValues.join(', ');
      }
    }
    return 'None';
  }
  return String(val);
}

export const ActivityEventCard: React.FC<ActivityEventCardProps> = ({
  event,
  showResourceLink = false,
  onNavigateToRecord,
  showTechnicalMeta = false,
  members: propMembers,
  allFields: propAllFields
}) => {
  const [expanded, setExpanded] = useState(false);
  const { members: platformMembers, teams: platformTeams, tenant } = usePlatform();
  const dateFormat = tenant?.localization?.dateFormat || 'DD/MM/YYYY';

  // Unified lookup map for users/members and teams
  const entityMap = useMemo(() => {
    const map = new Map<string, string>();
    const membersList = [...(propMembers || []), ...(platformMembers || [])];

    for (const m of membersList) {
      const name = m?.name || (m?.firstName && m?.familyName ? `${m.firstName} ${m.familyName}` : m?.firstName || m?.email);
      if (name) {
        if (m.id) map.set(m.id, name);
        if (m.userId) map.set(m.userId, name);
        if (m.cuid) map.set(m.cuid, name);
        if (m.memberId) map.set(m.memberId, name);
        if (m.user?.id) map.set(m.user.id, name);
        if (m.user?.email) map.set(m.user.email, name);
      }
    }

    // Teams
    for (const t of (platformTeams || [])) {
      if (t?.id && t?.name) map.set(t.id, t.name);
    }

    // Event actor
    if (event.actor?.id && event.actor?.name) {
      map.set(event.actor.id, event.actor.name);
    }

    return map;
  }, [propMembers, platformMembers, platformTeams, event.actor]);

  // Fields lookup map for options / types
  const fieldMap = useMemo(() => {
    const map = new Map<string, any>();
    if (Array.isArray(propAllFields)) {
      for (const f of propAllFields) {
        if (f?.id) map.set(f.id, f);
      }
    }
    return map;
  }, [propAllFields]);

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
          icon: event.action?.includes('SUBSTEP') ? CheckSquare : GitFork,
          color: event.action?.includes('SUBSTEP') ? 'text-emerald-500 dark:text-emerald-400' : 'text-purple-500 dark:text-purple-400',
          bg: event.action?.includes('SUBSTEP') ? 'bg-emerald-500/10 dark:bg-emerald-500/15 border-emerald-500/20' : 'bg-purple-500/10 dark:bg-purple-500/15 border-purple-500/20',
          pillBg: event.action?.includes('SUBSTEP') ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300'
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
      case 'ACCESS':
        return {
          icon: Eye,
          color: 'text-sky-500 dark:text-sky-400',
          bg: 'bg-sky-500/10 dark:bg-sky-500/15 border-sky-500/20',
          pillBg: 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300'
        };
      case 'FIELD':
      default:
        if (event.action?.includes('SUBSTEP')) {
          return {
            icon: CheckSquare,
            color: 'text-emerald-500 dark:text-emerald-400',
            bg: 'bg-emerald-500/10 dark:bg-emerald-500/15 border-emerald-500/20',
            pillBg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
          };
        }
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
  // Filter out changes where old and new values are effectively identical,
  // and eliminate redundant parent group/container changes when child field changes exist
  const changes = useMemo(() => {
    const valid = (event.changes || []).filter(c => {
      // Hide internal workflow/substep metadata from field diff badges
      if (
        c.fieldId.startsWith('_') ||
        c.fieldId === 'completedSubstepIds' ||
        c.fieldId === 'bypassedSubstepIds' ||
        c.fieldId === 'bypassedSubstepLabels' ||
        c.fieldId === 'overrideReason' ||
        c.fieldId === 'substeps' ||
        c.fieldLabel?.toLowerCase().includes('substep')
      ) {
        return false;
      }
      const fDef = fieldMap.get(c.fieldId);
      const oldVal = renderValue(c.oldValue, entityMap, fDef, dateFormat);
      const newVal = renderValue(c.newValue, entityMap, fDef, dateFormat);
      return oldVal !== newVal;
    });

    if (valid.length <= 1) return valid;

    return valid.filter(c => {
      const isGroupType = c.displayType === 'group' || c.displayType === 'fieldGroup' || c.displayType === 'section' || c.displayType === 'card';
      if (isGroupType) return false;

      const rawVal = c.newValue !== null && c.newValue !== undefined ? c.newValue : c.oldValue;
      const parsed = parseIfJson(rawVal);

      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const parsedKeys = Object.keys(parsed);
        const hasChildDiff = valid.some(other => other !== c && parsedKeys.includes(other.fieldId));
        if (hasChildDiff) return false;

        const renderedThis = renderValue(rawVal, entityMap, undefined, dateFormat);
        const otherRendered = valid.filter(other => other !== c).map(o => renderValue(o.newValue || o.oldValue, entityMap, undefined, dateFormat));
        const matchesOther = otherRendered.some(ov => ov !== 'None' && renderedThis.includes(ov));
        if (matchesOther && parsedKeys.length > 1) return false;
      }

      return true;
    });
  }, [event.changes, entityMap, fieldMap, dateFormat]);

  // Dynamic description that reflects only actual visible changes
  const displayDescription = useMemo(() => {
    let desc = event.description || event.action;
    if (desc && (desc.includes('CompletedSubstepIds') || desc.includes('bypassedSubstepIds') || desc.includes('sub_'))) {
      desc = 'Completed workflow checklist items';
    }
    if (event.category === 'FIELD' && changes.length > 0 && changes.length !== (event.changes?.length || 0)) {
      if (changes.length === 1) {
        return `Updated ${changes[0].fieldLabel}`;
      }
      return `Updated ${changes.length} fields (${changes.map(c => c.fieldLabel).slice(0, 3).join(', ')}${changes.length > 3 ? '...' : ''})`;
    }
    return desc;
  }, [event.description, event.action, event.category, event.changes, changes]);

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
            <span title={formatLocalizedDate(event.timestamp, dateFormat, true)}>
              {formatRelativeTime(event.timestamp, dateFormat)}
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
          {displayDescription}
        </p>

        {/* Comment Note Callout */}
        {event.metadata?.comment && (
          <div className="p-2.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 text-xs text-zinc-800 dark:text-zinc-200 italic">
            "{event.metadata.comment}"
          </div>
        )}

        {/* Access Audit Trail (IP, Client, Access Method) - only displayed when technical metadata is explicitly requested */}
        {showTechnicalMeta && (event.category === 'ACCESS' || event.metadata?.ip || event.metadata?.userAgent) && (
          <div className="flex items-center gap-1.5 pt-0.5 flex-wrap text-[10px] text-zinc-500 dark:text-zinc-400">
            {event.metadata?.source && (
              <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-medium border border-zinc-200/50 dark:border-zinc-700/50">
                {event.metadata.source.replace(/_/g, ' ')}
              </span>
            )}
            {event.metadata?.ip && (
              <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 font-mono text-[9px] border border-zinc-200/60 dark:border-zinc-700/60 text-zinc-700 dark:text-zinc-300">
                IP: {event.metadata.ip}
              </span>
            )}
            {event.metadata?.userAgent && (
              <span 
                className="px-1.5 py-0.5 rounded bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-300 border border-sky-500/20 truncate max-w-[240px]"
                title={event.metadata.userAgent}
              >
                {formatUserAgent(event.metadata.userAgent)}
              </span>
            )}
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
              {visibleDiffs.map((diff, idx) => {
                const fDef = fieldMap.get(diff.fieldId);
                const oldDisplay = renderValue(diff.oldValue, entityMap, fDef, dateFormat);
                const newDisplay = renderValue(diff.newValue, entityMap, fDef, dateFormat);

                return (
                  <div 
                    key={idx}
                    className="flex items-center gap-2 text-[11px] p-2 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200/80 dark:border-zinc-800/80 flex-wrap"
                  >
                    <span className="font-semibold text-zinc-600 dark:text-zinc-400 shrink-0">
                      {diff.fieldLabel}:
                    </span>

                    <span className="line-through text-rose-500 dark:text-rose-400/90 font-mono text-[10px] px-1 py-0.2 rounded bg-rose-50 dark:bg-rose-950/30 border border-rose-200/50 dark:border-rose-900/30 max-w-[160px] truncate">
                      {oldDisplay}
                    </span>

                    <span className="text-zinc-400 text-xs">→</span>

                    <span className="text-emerald-600 dark:text-emerald-400 font-mono text-[10px] font-semibold px-1 py-0.2 rounded bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-900/30 max-w-[180px] truncate">
                      {newDisplay}
                    </span>
                  </div>
                );
              })}
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
