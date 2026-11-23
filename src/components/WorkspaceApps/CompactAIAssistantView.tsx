import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Send,
  Sparkles,
  Bot,
  User as UserIcon,
  Plus,
  Loader2,
  Square,
  ExternalLink,
  Wrench,
  CheckCircle2,
  History,
  ShieldAlert,
  Pin,
  X,
  Copy,
  Check,
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { cn, slugify } from '../../lib/utils';
import { API_BASE_URL } from '../../config';
import { usePlatform } from '../../hooks/usePlatform';
import { useAuth } from '../../hooks/useAuth';
import { useActiveEntityContext } from '../../context/ActiveEntityContext';
import { DriveService } from '../../services/driveService';
import { AgentExecutionTrace } from '../AI/AgentExecutionTrace';
import {
  InlineChartRenderer,
  InlineMapRenderer,
  WorkflowDAGRenderer,
} from '../chat';

export interface CompactAIAssistantViewProps {
  compactLevel?: 'side' | 'bottom';
  onClose?: () => void;
}

const ANTIGRAVITY_API = `${API_BASE_URL}/api/antigravity`;

interface AntigravitySession {
  id: string;
  title: string;
  userId?: string | null;
  updatedAt?: string;
}

interface AntigravityMessage {
  id: string;
  role: 'user' | 'model' | 'system';
  content: string;
  steps?: any[];
  userId?: string | null;
  authorName?: string;
  authorAvatar?: string;
  createdAt?: string;
  timestamp?: Date;
}

const CompactUserAvatar: React.FC<{
  avatarUrl?: string;
  displayName?: string;
}> = ({ avatarUrl, displayName }) => {
  const [imgFailed, setImgFailed] = useState(false);

  if (avatarUrl && !imgFailed) {
    return (
      <img
        src={avatarUrl}
        alt={displayName || 'User'}
        title={displayName || undefined}
        onError={() => setImgFailed(true)}
        className="w-6 h-6 rounded-full object-cover shrink-0 mt-0.5 border border-zinc-200 dark:border-zinc-700"
      />
    );
  }

  const initials = (displayName || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

  return (
    <div
      title={displayName || undefined}
      className="w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-semibold border border-zinc-200 dark:border-zinc-700"
    >
      {initials || <UserIcon className="w-3.5 h-3.5" />}
    </div>
  );
};

interface AgentToolTrace {
  name: string;
  arguments?: any;
  result?: any;
  status: 'running' | 'done';
}

const renderInlineMarkdown = (text: string) => {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*\n]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g);
  return parts.map((part, pIdx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={pIdx} className="font-semibold text-zinc-900 dark:text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2 && !part.startsWith('**')) {
      return (
        <em key={pIdx} className="italic">
          {part.slice(1, -1)}
        </em>
      );
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code
          key={pIdx}
          className="px-1 py-0.5 rounded bg-zinc-200/70 dark:bg-zinc-800 text-indigo-600 dark:text-indigo-300 font-mono text-[11px]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      const [, label, href] = linkMatch;
      const isSafe = href.startsWith('http://') || href.startsWith('https://') || href.startsWith('/');
      if (isSafe) {
        return (
          <a
            key={pIdx}
            href={href}
            target={href.startsWith('http') ? '_blank' : undefined}
            rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
            className="text-indigo-600 dark:text-indigo-400 underline underline-offset-2 hover:text-indigo-500"
          >
            {label}
          </a>
        );
      }
    }
    return <React.Fragment key={pIdx}>{part}</React.Fragment>;
  });
};

const highlightCodeLine = (line: string): React.ReactNode => {
  const tokenRegex =
    /(\/\/.*$|--.*$|"(?:[^"\\]|\\.)*"\s*:|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\b(?:true|false|null|undefined|const|let|var|function|return|async|await|import|from|export|if|else|for|while|switch|case|break|new|typeof|interface|type|SELECT|FROM|WHERE|AND|OR|INSERT|INTO|VALUES|UPDATE|SET|DELETE|ORDER BY|GROUP BY|LIMIT)\b|-?\b\d+(?:\.\d+)?\b)/g;

  const parts = line.split(tokenRegex);
  return parts.map((part, idx) => {
    if (!part) return null;
    if (part.startsWith('//') || part.startsWith('--')) {
      return (
        <span key={idx} className="text-zinc-500 italic">
          {part}
        </span>
      );
    }
    if (/^"(?:[^"\\]|\\.)*"\s*:$/.test(part)) {
      const colonIdx = part.lastIndexOf(':');
      return (
        <React.Fragment key={idx}>
          <span className="text-sky-300">{part.slice(0, colonIdx)}</span>
          <span className="text-zinc-400">{part.slice(colonIdx)}</span>
        </React.Fragment>
      );
    }
    if (
      (part.startsWith('"') && part.endsWith('"')) ||
      (part.startsWith("'") && part.endsWith("'"))
    ) {
      return (
        <span key={idx} className="text-emerald-400">
          {part}
        </span>
      );
    }
    if (
      /^(?:true|false|null|undefined|const|let|var|function|return|async|await|import|from|export|if|else|for|while|switch|case|break|new|typeof|interface|type|SELECT|FROM|WHERE|AND|OR|INSERT|INTO|VALUES|UPDATE|SET|DELETE|ORDER BY|GROUP BY|LIMIT)$/.test(
        part
      )
    ) {
      return (
        <span key={idx} className="text-violet-400 font-medium">
          {part}
        </span>
      );
    }
    if (/^-?\d+(?:\.\d+)?$/.test(part)) {
      return (
        <span key={idx} className="text-amber-300">
          {part}
        </span>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
};

const CodeSnippetBlock: React.FC<{ language: string; code: string }> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);
  const lines = code.split('\n');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error('Failed to copy code');
    }
  };

  return (
    <div className="my-1.5 rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 shadow-xs">
      <div className="px-3 py-1.5 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between gap-2">
        <span className="text-[10px] font-mono font-medium uppercase tracking-wider text-zinc-400">
          {language || 'code'}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          title="Copy code"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <div className="overflow-x-auto py-2.5 font-mono text-[11px] leading-5 text-zinc-100">
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((line, idx) => (
              <tr key={idx} className="hover:bg-zinc-900/60">
                <td className="select-none text-right pl-3 pr-3 text-[10px] text-zinc-600 border-r border-zinc-800/80 w-8 align-top">
                  {idx + 1}
                </td>
                <td className="pl-3 pr-4 whitespace-pre">{highlightCodeLine(line)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const CompactMarkdown: React.FC<{ text: string }> = ({ text }) => {
  if (!text) return null;
  const blocks = text.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-1.5 text-xs leading-relaxed break-words">
      {blocks.map((block, i) => {
        if (block.startsWith('```') && block.endsWith('```')) {
          const langMatch = block.slice(3, -3).match(/^([a-zA-Z0-9_:-]*)\n([\s\S]*)$/);
          const language = langMatch ? langMatch[1] : '';
          const inner = (langMatch ? langMatch[2] : block.slice(3, -3)).trim();
          const lang = language.toLowerCase().trim();

          if (lang === 'chart' || lang.startsWith('chart:') || lang === 'recharts') {
            try {
              const parsed = JSON.parse(inner);
              return (
                <InlineChartRenderer
                  key={i}
                  title={parsed.title || 'Data Visualisation'}
                  type={parsed.type || 'bar'}
                  data={parsed.data || []}
                  dataKeys={parsed.dataKeys || [{ key: 'value', name: 'Value' }]}
                  xAxisKey={parsed.xAxisKey || 'name'}
                  height={220}
                />
              );
            } catch {
              return <CodeSnippetBlock key={i} language={language} code={inner} />;
            }
          }

          if (lang === 'map' || lang === 'leaflet') {
            try {
              const parsed = JSON.parse(inner);
              return (
                <InlineMapRenderer
                  key={i}
                  title={parsed.title}
                  center={parsed.center}
                  zoom={parsed.zoom}
                  markers={parsed.markers || []}
                  height={220}
                />
              );
            } catch {
              return <CodeSnippetBlock key={i} language={language} code={inner} />;
            }
          }

          if (lang === 'workflow' || lang === 'dag') {
            try {
              const parsed = JSON.parse(inner);
              if (Array.isArray(parsed.nodes) || Array.isArray(parsed.edges)) {
                return (
                  <WorkflowDAGRenderer
                    key={i}
                    title={parsed.title}
                    nodes={parsed.nodes}
                    edges={parsed.edges}
                    height={220}
                  />
                );
              }
            } catch {
              // fallback to code snippet
            }
          }

          return <CodeSnippetBlock key={i} language={language} code={inner} />;
        }

        const lines = block.split('\n');
        const elements: React.ReactNode[] = [];

        for (let idx = 0; idx < lines.length; idx++) {
          const rawLine = lines[idx];
          const trimmed = rawLine.trim();

          if (!trimmed) {
            elements.push(<div key={idx} className="h-1" />);
            continue;
          }

          // Markdown Table detection
          if (trimmed.startsWith('|') && trimmed.endsWith('|') && idx + 1 < lines.length) {
            const nextTrimmed = lines[idx + 1].trim();
            if (/^\|[\s:|-]+\|$/.test(nextTrimmed)) {
              const parseRow = (r: string) =>
                r
                  .slice(1, -1)
                  .split('|')
                  .map((c) => c.trim());
              const headers = parseRow(trimmed);
              const rows: string[][] = [];
              let j = idx + 2;
              while (j < lines.length && lines[j].trim().startsWith('|') && lines[j].trim().endsWith('|')) {
                rows.push(parseRow(lines[j].trim()));
                j++;
              }
              elements.push(
                <div
                  key={idx}
                  className="my-1.5 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800"
                >
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
                      <tr>
                        {headers.map((h, hIdx) => (
                          <th key={hIdx} className="px-2.5 py-1.5 font-semibold text-zinc-700 dark:text-zinc-200">
                            {renderInlineMarkdown(h)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200/70 dark:divide-zinc-800/70">
                      {rows.map((row, rIdx) => (
                        <tr key={rIdx} className="bg-white dark:bg-zinc-950/50">
                          {row.map((cell, cIdx) => (
                            <td key={cIdx} className="px-2.5 py-1.5 text-zinc-600 dark:text-zinc-300">
                              {renderInlineMarkdown(cell)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
              idx = j - 1;
              continue;
            }
          }

          if (/^(-{3,}|\*{3,})$/.test(trimmed)) {
            elements.push(<hr key={idx} className="my-2 border-zinc-200 dark:border-zinc-800" />);
            continue;
          }

          const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
          if (headingMatch) {
            const level = headingMatch[1].length;
            const headingText = headingMatch[2];
            elements.push(
              <div
                key={idx}
                className={cn(
                  'font-semibold text-zinc-900 dark:text-white pt-1.5',
                  level === 1 && 'text-sm font-bold',
                  level === 2 && 'text-[13px]',
                  level >= 3 && 'text-xs'
                )}
              >
                {renderInlineMarkdown(headingText)}
              </div>
            );
            continue;
          }

          const blockquoteMatch = trimmed.match(/^>\s?(.*)$/);
          if (blockquoteMatch) {
            elements.push(
              <div
                key={idx}
                className="pl-2.5 border-l-2 border-indigo-400/60 text-zinc-600 dark:text-zinc-300 italic"
              >
                {renderInlineMarkdown(blockquoteMatch[1])}
              </div>
            );
            continue;
          }

          const bulletMatch = rawLine.match(/^(\s*)[*-]\s+(.+)$/);
          if (bulletMatch) {
            const indent = bulletMatch[1].length >= 2 ? 'pl-3' : '';
            elements.push(
              <div key={idx} className={cn('flex items-start gap-2', indent)}>
                <span className="mt-1.5 w-1 h-1 rounded-full bg-zinc-400 dark:bg-zinc-500 shrink-0" />
                <span className="flex-1 min-w-0">{renderInlineMarkdown(bulletMatch[2])}</span>
              </div>
            );
            continue;
          }

          const orderedMatch = rawLine.match(/^(\s*)(\d+)\.\s+(.+)$/);
          if (orderedMatch) {
            const indent = orderedMatch[1].length >= 2 ? 'pl-3' : '';
            elements.push(
              <div key={idx} className={cn('flex items-start gap-1.5', indent)}>
                <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 shrink-0 min-w-[14px]">
                  {orderedMatch[2]}.
                </span>
                <span className="flex-1 min-w-0">{renderInlineMarkdown(orderedMatch[3])}</span>
              </div>
            );
            continue;
          }

          elements.push(<div key={idx}>{renderInlineMarkdown(rawLine)}</div>);
        }

        return (
          <div key={i} className="space-y-1">
            {elements}
          </div>
        );
      })}
    </div>
  );
};

export const CompactAIAssistantView: React.FC<CompactAIAssistantViewProps> = ({
  compactLevel = 'side',
  onClose,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { tenant, modules, user: platformUser, members: platformMembers } = usePlatform();
  const { session: authSession, user: authUser } = useAuth();
  const { activeContext, rawActiveContext, isPinned, isDetached, setIsPinned, setIsDetached } = useActiveEntityContext();

  const token =
    authSession?.access_token ||
    localStorage.getItem('aurora_token') ||
    (import.meta as any).env?.VITE_DEV_TOKEN ||
    '';
  const tenantId = tenant?.id || '';

  const [sessions, setSessions] = useState<AntigravitySession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AntigravityMessage[]>([]);
  const [showSessions, setShowSessions] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);

  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [agentThought, setAgentThought] = useState<string | null>(null);
  const [agentTrace, setAgentTrace] = useState<AgentToolTrace[]>([]);
  const [approvalRequired, setApprovalRequired] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const activeSessionRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    activeSessionRef.current = activeSessionId;
  }, [activeSessionId]);

  const scrollToBottom = useCallback(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText, agentThought, agentTrace, scrollToBottom]);

  const fetchSessions = useCallback(async () => {
    if (!tenantId || !token) return;
    setSessionsLoading(true);
    try {
      const res = await fetch(`${ANTIGRAVITY_API}/sessions`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-tenant-id': tenantId,
        },
      });
      if (!res.ok) throw new Error('Failed to load AI sessions');
      const data = await res.json();
      if (Array.isArray(data)) {
        setSessions(data);
      }
    } catch (err) {
      console.error('[CompactAIAssistantView] fetchSessions error:', err);
    } finally {
      setSessionsLoading(false);
    }
  }, [tenantId, token]);

  const loadSession = useCallback(
    async (id: string, isSilent = false) => {
      if (!tenantId || !token) return;
      if (!isSilent) setMessagesLoading(true);
      try {
        const res = await fetch(`${ANTIGRAVITY_API}/sessions/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'x-tenant-id': tenantId,
          },
        });
        if (!res.ok) throw new Error('Failed to load AI conversation');
        const data = await res.json();
        setActiveSessionId(data.id || id);
        const sanitized: AntigravityMessage[] = (data.messages || []).map((m: any) => {
          let stepsArr: any[] = [];
          if (Array.isArray(m.steps)) stepsArr = m.steps;
          else if (typeof m.steps === 'string') {
            try {
              stepsArr = JSON.parse(m.steps);
            } catch {
              stepsArr = [];
            }
          }
          return {
            id: m.id,
            role: (m.role || 'model') as 'user' | 'model' | 'system',
            content: m.content || '',
            steps: stepsArr,
            userId: m.userId || data.userId,
            authorName: m.authorName || m.userName,
            authorAvatar: m.authorAvatar || m.avatarUrl,
            createdAt: m.createdAt,
          };
        });
        setMessages(sanitized);
        setShowSessions(false);
      } catch (err) {
        console.error('[CompactAIAssistantView] loadSession error:', err);
        toast.error('Could not load AI session');
      } finally {
        if (!isSilent) setMessagesLoading(false);
      }
    },
    [tenantId, token]
  );

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Connect live Antigravity WebSocket for streaming thoughts, tool calls, and chunks
  useEffect(() => {
    if (!tenantId || !token) return;

    const socket = io(API_BASE_URL, {
      auth: { token },
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join_tenant', tenantId);
    });

    socket.on('antigravity_step', (step: any) => {
      if (step.type === 'thought') {
        setAgentThought(step.content);
      } else if (step.type === 'tool_call') {
        setAgentTrace((prev) => [...prev, { name: step.name, arguments: step.arguments, status: 'running' }]);
        if (step.name === 'upsert_record' && step.arguments) {
          // If recordId is provided, an existing record is being modified.
          // If recordId is omitted, a NEW record is being created; do NOT flag the current active record.
          const targetRecId = step.arguments.recordId;
          const rawData = step.arguments.data || {};
          const fieldKeys = Object.keys(rawData.data && typeof rawData.data === 'object' ? rawData.data : rawData);
          if (targetRecId && fieldKeys.length > 0) {
            window.dispatchEvent(
              new CustomEvent('aurora:ai-field-modifying', {
                detail: {
                  recordId: targetRecId,
                  fields: fieldKeys,
                  data: rawData,
                  source: 'ai',
                },
              })
            );
          }
        }
      } else if (step.type === 'tool_result') {
        setAgentTrace((prev) =>
          prev.map((t) => (t.name === step.name ? { ...t, result: step.result, status: 'done' } : t))
        );
        if (step.name === 'upsert_record') {
          const rec = step.result?.record || step.result;
          const targetRecId = step.result?.recordId || rec?.id;
          const updatedFields = step.result?.updatedFields || (rec ? Object.keys(rec.data || rec) : []);
          if (targetRecId) {
            window.dispatchEvent(
              new CustomEvent('aurora:ai-field-updated', {
                detail: {
                  recordId: targetRecId,
                  fields: updatedFields,
                  record: rec,
                  data: rec?.data || rec,
                  source: 'ai',
                },
              })
            );
          }
        }
      } else if (step.type === 'ai_field_modifying') {
        window.dispatchEvent(
          new CustomEvent('aurora:ai-field-modifying', {
            detail: step,
          })
        );
      } else if (step.type === 'ai_field_updated') {
        window.dispatchEvent(
          new CustomEvent('aurora:ai-field-updated', {
            detail: step,
          })
        );
      } else if (step.type === 'stream_start') {
        setStreamingText('');
        setAgentThought(null);
      } else if (step.type === 'chunk') {
        setStreamingText((prev) => prev + (step.content || ''));
      } else if (step.type === 'stream_end' || step.type === 'done') {
        window.dispatchEvent(new CustomEvent('aurora:ai-modifying-ended'));
      } else if (step.type === 'approval_required') {
        setSending(false);
        setAgentThought(null);
        setApprovalRequired(true);
      }
    });

    socket.on('scheduled_task_completed', (data: any) => {
      if (data.sessionId && activeSessionRef.current === data.sessionId) {
        setSending(false);
        setStreamingText('');
        loadSession(data.sessionId, true);
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [tenantId, token, loadSession]);

  const buildRouteContext = () => {
    const parts = location.pathname.split('/').filter(Boolean);
    const searchParams = new URLSearchParams(location.search);
    const selectedRecordId = searchParams.get('recordId') || searchParams.get('id') || '';
    let contextType = 'Platform Path';
    let contextName = '';
    let contextId = '';

    if (parts[0] === 'workspace') {
      if (parts[1] === 'modules' && parts[2]) {
        contextId = parts[2];
        const matched = modules.find(
          (m: any) => m.id === contextId || slugify(m.name) === contextId
        );
        contextName = matched?.name || '';
        if (parts[3] === 'records' && parts[4]) {
          contextType = 'Record Detail View';
          contextId = parts[4];
        } else if (selectedRecordId) {
          contextType = 'Module Split Record View';
          contextId = selectedRecordId;
        } else {
          contextType = 'Module Records List';
        }
      } else if (parts[1] === 'apps' && parts[2]) {
        contextType = 'Workspace App';
        contextId = parts[2];
      }
    }

    return {
      path: `${location.pathname}${location.search}`,
      type: contextType,
      id: contextId,
      name: contextName,
    };
  };

  const resolveUserProfile = (m: AntigravityMessage) => {
    const activeSessionObj = sessions.find((s) => s.id === activeSessionId);
    const targetUserId = m.userId || activeSessionObj?.userId;
    const memberMatch =
      targetUserId && Array.isArray(platformMembers)
        ? platformMembers.find((mem: any) => mem.userId === targetUserId || mem.id === targetUserId)
        : undefined;

    const platformFullName =
      platformUser?.firstName || platformUser?.lastName
        ? `${platformUser.firstName || ''} ${platformUser.lastName || ''}`.trim()
        : (platformUser as any)?.name;

    const memberName = memberMatch
      ? (memberMatch as any).name ||
        `${(memberMatch as any).firstName || ''} ${(memberMatch as any).lastName || ''}`.trim()
      : undefined;

    const displayName =
      m.authorName ||
      memberName ||
      platformFullName ||
      (authUser?.user_metadata?.full_name as string | undefined) ||
      (authUser?.user_metadata?.name as string | undefined) ||
      authUser?.email?.split('@')[0];

    const avatarUrl =
      m.authorAvatar ||
      (memberMatch as any)?.avatarUrl ||
      platformUser?.avatarUrl ||
      (authUser?.user_metadata?.avatar_url as string | undefined);

    return { displayName, avatarUrl };
  };

  const handleStop = () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setSending(false);
    setAgentThought(null);
    setStreamingText('');
  };

  const handleNewChat = () => {
    handleStop();
    setActiveSessionId(null);
    setMessages([]);
    setAgentTrace([]);
    setApprovalRequired(false);
    setShowSessions(false);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const userMsg = input.trim();
    if (!userMsg || sending) return;

    if (!tenantId || !token) {
      toast.error('Sign in to chat with Aurora AI');
      return;
    }

    let targetSessionId = activeSessionId;
    if (!targetSessionId) {
      try {
        const res = await fetch(`${ANTIGRAVITY_API}/sessions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            'x-tenant-id': tenantId,
          },
          body: JSON.stringify({ title: userMsg.slice(0, 48) || 'New Vibe Chat' }),
        });
        if (!res.ok) throw new Error('Failed to create session');
        const created = await res.json();
        targetSessionId = created.id;
        setActiveSessionId(created.id);
        setSessions((prev) => [created, ...prev]);
      } catch (err: any) {
        toast.error(err?.message || 'Could not start AI conversation');
        return;
      }
    }

    const tempUserMessage: AntigravityMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: userMsg,
      userId: platformUser?.id || authUser?.id,
      authorAvatar:
        platformUser?.avatarUrl ||
        (authUser?.user_metadata?.avatar_url as string | undefined),
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMessage]);
    setInput('');
    setSending(true);
    setStreamingText('');
    setAgentTrace([]);
    setApprovalRequired(false);
    setAgentThought('Thinking...');

    const modelName = localStorage.getItem('aurora_selected_ai_model') || 'default';

    try {
      abortControllerRef.current = new AbortController();
      const res = await fetch(`${ANTIGRAVITY_API}/sessions/${targetSessionId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-tenant-id': tenantId,
        },
        signal: abortControllerRef.current.signal,
        body: JSON.stringify({
          message: userMsg,
          socketId: socketRef.current?.id,
          context: {
            ...buildRouteContext(),
            activeEntity: activeContext,
          },
          model: modelName,
          attachments: [],
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const errMsg =
          errData?.error?.message ||
          errData?.error?.title ||
          errData?.message ||
          `Server returned status ${res.status}`;
        throw new Error(errMsg);
      }

      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          id: `m-${Date.now()}`,
          role: 'model',
          content: data.text || '',
          steps: data.steps,
          createdAt: new Date().toISOString(),
        },
      ]);

      if (Array.isArray(data.steps)) {
        data.steps.forEach((st: any) => {
          if (st?.result?.driveItem) {
            try {
              DriveService.syncDriveItem(st.result.driveItem);
            } catch {}
          }
          if (st?.name === 'upsert_record' && st?.result) {
            const rec = st.result.record || st.result;
            const targetRecId = st.result.recordId || rec?.id;
            const updatedFields = st.result.updatedFields || (rec ? Object.keys(rec.data || rec) : []);
            if (targetRecId) {
              window.dispatchEvent(
                new CustomEvent('aurora:ai-field-updated', {
                  detail: {
                    recordId: targetRecId,
                    fields: updatedFields,
                    record: rec,
                    data: rec?.data || rec,
                    source: 'ai',
                  },
                })
              );
            }
          }
        });
      }

      fetchSessions();
      if (targetSessionId) loadSession(targetSessionId, true);
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        const msg = err?.message || 'Aurora AI request failed';
        toast.error(msg);
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: 'model',
            content: `Error: ${msg}`,
          },
        ]);
      }
    } finally {
      setSending(false);
      setStreamingText('');
      setAgentThought(null);
      setAgentTrace([]);
      abortControllerRef.current = null;
      window.dispatchEvent(new CustomEvent('aurora:ai-modifying-ended'));
    }
  };

  const handleApproval = async (action: 'approve' | 'reject') => {
    if (!activeSessionId || !tenantId || !token) return;
    setApprovalRequired(false);
    setSending(true);
    setAgentThought(action === 'approve' ? 'Executing action...' : 'Cancelling...');
    const modelName = localStorage.getItem('aurora_selected_ai_model') || 'default';
    try {
      const res = await fetch(`${ANTIGRAVITY_API}/sessions/${activeSessionId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-tenant-id': tenantId,
        },
        body: JSON.stringify({
          action,
          socketId: socketRef.current?.id,
          model: modelName,
        }),
      });
      if (!res.ok) throw new Error('Failed to submit approval');
      await loadSession(activeSessionId, true);
      fetchSessions();
    } catch (err: any) {
      toast.error(err?.message || 'Approval failed');
    } finally {
      setSending(false);
      setAgentThought(null);
      setAgentTrace([]);
    }
  };

  const getDisplayContent = (m: AntigravityMessage) => {
    let text = m.content || '';
    if (text.trim().startsWith('{') && text.includes('"planMarkdown"')) {
      try {
        const parsed = JSON.parse(text);
        if (parsed.planMarkdown) text = parsed.planMarkdown;
      } catch {}
    }
    return text;
  };

  const domainStarters = useMemo(() => {
    if (!activeContext) {
      return [
        "What are the latest records in this workspace?",
        "How do I set up an automated email rule?",
        "Summarize tenant system load",
      ];
    }
    const targetName = activeContext.recordKey || activeContext.title;
    switch (activeContext.domain) {
      case 'module_builder': {
        const tab = (activeContext.activeTab || '').toLowerCase();
        if (tab === 'workflow') {
          return [
            `Design an approval & SLA workflow for ${activeContext.title}`,
            "Add a Wait / SLA timer and escalation alert",
            "Audit workflow transitions for dead ends",
          ];
        }
        if (tab === 'rules') {
          return [
            `Suggest Error & Warning validation rules for ${activeContext.title}`,
            "Add required-if conditional rules based on status",
            "Audit existing rules for conflicts",
          ];
        }
        if (tab === 'integrations') {
          return [
            `Suggest API integrations for ${activeContext.title}`,
            "Design a custom REST endpoint & I/O schema",
            "Recommend output-to-field mappings",
          ];
        }
        if (tab === 'automations') {
          return [
            `Create a When → If → Then automation for ${activeContext.title}`,
            "Set up an SLA age alert & notification rule",
            "Add an outbound webhook on record creation",
          ];
        }
        return [
          `Audit ${activeContext.title}'s schema & 12-column layout`,
          "Add a financial calculation block (Subtotal, Tax, Total)",
          "Suggest missing fields, rules, and automations",
        ];
      }
      case 'module_record':
        return [
          `Summarize ${targetName}`,
          "What are the missing fields or validation gaps?",
          "Draft a follow-up email for this record",
          "Suggest next workflow stage action",
        ];
      case 'directory_person':
        return [
          `Draft an intro email to ${activeContext.title}`,
          "Show organizational relationships & manager",
          "Check linked open deals & support tickets",
        ];
      case 'directory_org':
        return [
          `Summarize ${activeContext.title}'s company profile`,
          "Show associated contacts & decision makers",
          "Review financial history & lifetime value",
        ];
      case 'workforce_member':
        return [
          `Show ${activeContext.title}'s team & manager hierarchy`,
          "Review access privileges & role permissions",
          "Draft a team communication / update",
        ];
      case 'triage_submission':
        return [
          "Recommend destination module & mapping",
          "Check if this submitter already exists in directory",
          "Summarize SLA urgency & deadline risk",
        ];
      case 'approval_item':
        return [
          "Audit financial risks & quorum requirements",
          "Check whether this expense is within budget",
          "Summarize request justification",
        ];
      case 'service_ticket':
        return [
          "Draft a helpful resolution response for customer",
          "Analyze customer sentiment and escalation risk",
          "Search knowledge base for matching solutions",
        ];
      case 'document':
        return [
          `Proofread and polish "${activeContext.title}"`,
          "Draft an executive summary of this document",
          "Check legal hold & records retention status",
        ];
      default:
        return [
          `Summarize ${activeContext.title}`,
          "What actions can I take on this entity?",
        ];
    }
  }, [activeContext]);

  return (
    <div className="h-full flex flex-col bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      {/* Session & Action Strip */}
      <div className="px-2.5 py-1.5 border-b border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-zinc-900/60 flex items-center justify-between gap-1.5 shrink-0">
        <div className="flex items-center gap-1 min-w-0">
          <button
            type="button"
            onClick={() => setShowSessions((v) => !v)}
            className={cn(
              'inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer',
              showSessions
                ? 'bg-indigo-600 text-white'
                : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white'
            )}
            title="Switch AI conversation"
          >
            <History className="w-3 h-3" />
            <span className="truncate max-w-[130px]">
              {activeSessionId
                ? sessions.find((s) => s.id === activeSessionId)?.title || 'Current Chat'
                : 'Recent Chats'}
            </span>
          </button>
          <button
            type="button"
            onClick={handleNewChat}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
            title="New AI Conversation"
          >
            <Plus className="w-3 h-3" />
            New
          </button>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() =>
              navigate(
                activeSessionId
                  ? `/workspace/aurora-vibe/${activeSessionId}`
                  : '/workspace/aurora-vibe'
              )
            }
            className="inline-flex items-center gap-1 text-[10px] font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 cursor-pointer shrink-0"
            title="Open conversation in Aurora Vibe"
          >
            Full Canvas
            <ExternalLink className="w-3 h-3" />
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Close AI Assistant"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Session Picker Drawer OR Active Chat */}
      {showSessions ? (
        <div className="flex-1 overflow-y-auto p-2.5 space-y-1 bg-white dark:bg-zinc-950">
          {sessionsLoading ? (
            <div className="h-32 flex items-center justify-center text-zinc-400 dark:text-zinc-500">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center text-center text-zinc-400 dark:text-zinc-500 px-4">
              <Sparkles className="w-6 h-6 mb-2 opacity-40" />
              <p className="text-xs text-zinc-700 dark:text-zinc-300 font-medium">No conversations yet</p>
              <p className="text-[11px] mt-0.5 text-zinc-500 dark:text-zinc-400">Send a prompt below to start one.</p>
            </div>
          ) : (
            sessions.slice(0, 25).map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => loadSession(s.id)}
                className={cn(
                  'w-full text-left px-2.5 py-2 rounded-lg text-xs transition-colors flex items-center justify-between gap-2 cursor-pointer',
                  s.id === activeSessionId
                    ? 'bg-indigo-50 dark:bg-indigo-600/20 border border-indigo-200 dark:border-indigo-500/40 text-indigo-900 dark:text-white font-medium'
                    : 'hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-transparent'
                )}
              >
                <span className="truncate font-medium">{s.title || 'Untitled Chat'}</span>
                {s.updatedAt && (
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 shrink-0">
                    {new Date(s.updatedAt).toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      ) : (
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 bg-white dark:bg-zinc-950">
          {messagesLoading ? (
            <div className="h-32 flex items-center justify-center text-zinc-400 dark:text-zinc-500">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          ) : messages.length === 0 && !sending ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-4 py-6">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-3 shadow-sm">
                <Sparkles className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-200">Aurora AI Co-Pilot</p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 max-w-[260px]">
                {activeContext
                  ? `Active context: ${activeContext.recordKey ? `${activeContext.recordKey}${activeContext.title && activeContext.title !== activeContext.recordKey ? ` (${activeContext.title})` : ''}` : activeContext.title}`
                  : 'Connected to live workspace tools, records, and modules on your current route.'}
              </p>
              <div className="mt-4 w-full max-w-[280px] space-y-1.5 text-left">
                <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider text-center mb-1">
                  Suggested Prompts
                </p>
                {domainStarters.map((starter: string, sIdx: number) => (
                  <button
                    key={sIdx}
                    type="button"
                    onClick={() => setInput(starter)}
                    className="w-full text-left text-[11px] px-2.5 py-1.5 rounded-lg bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-all cursor-pointer truncate shadow-sm"
                  >
                    💡 {starter}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={cn('flex gap-2', m.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                {m.role !== 'user' && (
                  <div className="w-6 h-6 rounded-full bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5 border border-indigo-100 dark:border-transparent">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}
                <div
                  className={cn(
                    'max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed',
                    m.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-none whitespace-pre-wrap shadow-sm'
                      : 'bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-bl-none shadow-sm'
                  )}
                >
                  {m.role === 'user' ? (
                    m.content
                  ) : (
                    <div className="space-y-1.5">
                      {Array.isArray(m.steps) && m.steps.filter((s: any) => s.name && !s._meta).length > 0 && (
                        <div className="mb-2 pb-1.5 border-b border-zinc-200/60 dark:border-zinc-800/60">
                          <AgentExecutionTrace steps={m.steps} compact={true} />
                        </div>
                      )}
                      <CompactMarkdown text={getDisplayContent(m)} />
                    </div>
                  )}
                </div>
                {m.role === 'user' && (() => {
                  const profile = resolveUserProfile(m);
                  return (
                    <CompactUserAvatar
                      avatarUrl={profile.avatarUrl}
                      displayName={profile.displayName}
                    />
                  );
                })()}
              </div>
            ))
          )}

          {/* Live tool trace & streaming output */}
          {(sending || streamingText) && (
            <div className="flex gap-2 justify-start">
              <div className="w-6 h-6 rounded-full bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5 border border-indigo-100 dark:border-transparent">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <div className="max-w-[85%] rounded-xl rounded-bl-none px-3 py-2 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 space-y-1.5 shadow-sm">
                {(agentTrace.length > 0 || (sending && !streamingText)) && (
                  <div className={cn(streamingText ? 'pb-1.5 border-b border-zinc-200/60 dark:border-zinc-800/60' : '')}>
                    <AgentExecutionTrace
                      liveTrace={agentTrace}
                      thought={agentThought || 'Assistant is thinking...'}
                      isLive={true}
                      compact={true}
                    />
                  </div>
                )}

                {streamingText && (
                  <CompactMarkdown text={streamingText} />
                )}
              </div>
            </div>
          )}

          {approvalRequired && (
            <div className="p-2.5 rounded-xl border border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300">
                <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                Action requires your approval
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleApproval('approve')}
                  className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold cursor-pointer"
                >
                  Approve & Execute
                </button>
                <button
                  type="button"
                  onClick={() => handleApproval('reject')}
                  className="px-2.5 py-1 rounded-md bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-[11px] font-medium cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Active Context Pill & Controls */}
      {activeContext ? (
        <div
          className="px-2.5 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 border-t border-indigo-100 dark:border-indigo-900/60 flex items-center justify-between gap-1.5 shrink-0 text-xs"
          title={[
            activeContext.recordKey,
            activeContext.title && activeContext.title !== activeContext.recordKey ? activeContext.title : null,
            activeContext.subtitle ? `(${activeContext.subtitle})` : null,
            activeContext.status ? `[${activeContext.status}]` : null,
          ].filter(Boolean).join(' • ')}
        >
          <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400 animate-pulse shrink-0" />
            <span className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400 tracking-wider shrink-0">
              In Context:
            </span>
            {activeContext.recordKey && (
              <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80 shrink-0 select-all shadow-2xs">
                {activeContext.recordKey}
              </span>
            )}
            {(() => {
              const key = activeContext.recordKey;
              let t = activeContext.title || '';
              if (key && t.startsWith(key)) {
                t = t.slice(key.length).replace(/^[\s•:-]+/, '').trim();
              }
              if (!t || t === key) return null;
              return (
                <span className="font-semibold text-zinc-800 dark:text-zinc-100 truncate">
                  {t}
                </span>
              );
            })()}
            {compactLevel === 'bottom' && activeContext.subtitle && (
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                ({activeContext.subtitle})
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setIsPinned(!isPinned)}
              title={isPinned ? 'Unpin context (follows active view)' : 'Pin context (persists across navigation)'}
              className={cn(
                'p-1 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors cursor-pointer',
                isPinned ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
              )}
            >
              <Pin size={12} className={cn(isPinned && 'fill-current text-indigo-600 dark:text-indigo-400')} />
            </button>
            <button
              type="button"
              onClick={() => setIsDetached(true)}
              title="Detach context for this query"
              className="p-1 rounded text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors cursor-pointer"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      ) : isDetached && rawActiveContext ? (
        <div className="px-2.5 py-1 bg-zinc-100 dark:bg-zinc-900/60 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 shrink-0">
          <span className="italic truncate">Context detached</span>
          <button
            type="button"
            onClick={() => setIsDetached(false)}
            className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold text-[11px] cursor-pointer"
          >
            Re-attach {(rawActiveContext.recordKey || rawActiveContext.title).slice(0, 18)}...
          </button>
        </div>
      ) : null}

      {/* Composer */}
      <form onSubmit={handleSend} className="p-2.5 border-t border-zinc-200 dark:border-zinc-800 flex items-center gap-2 shrink-0 bg-white dark:bg-zinc-950">
        <Sparkles className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 shrink-0" />
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Aurora AI..."
          disabled={sending}
          className="flex-1 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-60"
        />
        {sending ? (
          <button
            type="button"
            onClick={handleStop}
            className="p-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white shrink-0 cursor-pointer"
            title="Stop generating"
          >
            <Square className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!input.trim()}
            className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 shrink-0 cursor-pointer"
            title="Send"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        )}
      </form>
    </div>
  );
};
