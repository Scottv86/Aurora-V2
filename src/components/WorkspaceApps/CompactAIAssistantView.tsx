import React, { useState, useEffect, useRef, useCallback } from 'react';
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
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { cn, slugify } from '../../lib/utils';
import { API_BASE_URL } from '../../config';
import { usePlatform } from '../../hooks/usePlatform';
import { useAuth } from '../../hooks/useAuth';
import { DriveService } from '../../services/driveService';

export interface CompactAIAssistantViewProps {
  compactLevel?: 'side' | 'bottom';
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
        className="w-6 h-6 rounded-full object-cover shrink-0 mt-0.5 border border-zinc-700"
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
      className="w-6 h-6 rounded-full bg-zinc-800 text-zinc-200 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-semibold border border-zinc-700"
    >
      {initials || <UserIcon className="w-3.5 h-3.5" />}
    </div>
  );
};

interface AgentToolTrace {
  name: string;
  status: 'running' | 'done';
}

const CompactMarkdown: React.FC<{ text: string }> = ({ text }) => {
  if (!text) return null;
  const blocks = text.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-1.5 text-xs leading-relaxed break-words">
      {blocks.map((block, i) => {
        if (block.startsWith('```') && block.endsWith('```')) {
          const inner = block.slice(3, -3).replace(/^[a-zA-Z0-9_-]*\n/, '');
          return (
            <pre
              key={i}
              className="p-2 rounded-lg bg-zinc-950/80 border border-zinc-800 text-[11px] font-mono text-zinc-200 overflow-x-auto whitespace-pre-wrap"
            >
              {inner.trim()}
            </pre>
          );
        }
        return (
          <div key={i} className="whitespace-pre-wrap">
            {block.split('\n').map((line, lineIdx) => {
              const parts = line.split(/(\*\*.*?\*\*|`[^`]+`)/g);
              return (
                <div key={lineIdx} className={line.trim() === '' ? 'h-1.5' : undefined}>
                  {parts.map((part, pIdx) => {
                    if (part.startsWith('**') && part.endsWith('**')) {
                      return (
                        <strong key={pIdx} className="font-semibold text-white">
                          {part.slice(2, -2)}
                        </strong>
                      );
                    }
                    if (part.startsWith('`') && part.endsWith('`')) {
                      return (
                        <code
                          key={pIdx}
                          className="px-1 py-0.5 rounded bg-zinc-800 text-indigo-300 font-mono text-[11px]"
                        >
                          {part.slice(1, -1)}
                        </code>
                      );
                    }
                    return <React.Fragment key={pIdx}>{part}</React.Fragment>;
                  })}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

export const CompactAIAssistantView: React.FC<CompactAIAssistantViewProps> = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { tenant, modules, user: platformUser, members: platformMembers } = usePlatform();
  const { session: authSession, user: authUser } = useAuth();

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
        setAgentTrace((prev) => [...prev, { name: step.name, status: 'running' }]);
      } else if (step.type === 'tool_result') {
        setAgentTrace((prev) =>
          prev.map((t) => (t.name === step.name ? { ...t, status: 'done' } : t))
        );
      } else if (step.type === 'stream_start') {
        setStreamingText('');
        setAgentThought(null);
      } else if (step.type === 'chunk') {
        setStreamingText((prev) => prev + (step.content || ''));
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
          context: buildRouteContext(),
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
      abortControllerRef.current = null;
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

  return (
    <div className="h-full flex flex-col bg-zinc-950 text-zinc-100">
      {/* Session & Action Strip */}
      <div className="px-2.5 py-1.5 border-b border-zinc-800/80 bg-zinc-900/60 flex items-center justify-between gap-1.5 shrink-0">
        <div className="flex items-center gap-1 min-w-0">
          <button
            type="button"
            onClick={() => setShowSessions((v) => !v)}
            className={cn(
              'inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer',
              showSessions
                ? 'bg-indigo-600 text-white'
                : 'text-zinc-300 hover:bg-zinc-800'
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
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors cursor-pointer"
            title="New AI Conversation"
          >
            <Plus className="w-3 h-3" />
            New
          </button>
        </div>

        <button
          type="button"
          onClick={() =>
            navigate(
              activeSessionId
                ? `/workspace/aurora-vibe/${activeSessionId}`
                : '/workspace/aurora-vibe'
            )
          }
          className="inline-flex items-center gap-1 text-[10px] font-medium text-indigo-400 hover:text-indigo-300 cursor-pointer shrink-0"
          title="Open conversation in Aurora Vibe"
        >
          Full Canvas
          <ExternalLink className="w-3 h-3" />
        </button>
      </div>

      {/* Session Picker Drawer OR Active Chat */}
      {showSessions ? (
        <div className="flex-1 overflow-y-auto p-2.5 space-y-1">
          {sessionsLoading ? (
            <div className="h-32 flex items-center justify-center text-zinc-500">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center text-center text-zinc-500 px-4">
              <Sparkles className="w-6 h-6 mb-2 opacity-40" />
              <p className="text-xs text-zinc-300 font-medium">No conversations yet</p>
              <p className="text-[11px] mt-0.5">Send a prompt below to start one.</p>
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
                    ? 'bg-indigo-600/20 border border-indigo-500/40 text-white'
                    : 'hover:bg-zinc-900 text-zinc-300 border border-transparent'
                )}
              >
                <span className="truncate font-medium">{s.title || 'Untitled Chat'}</span>
                {s.updatedAt && (
                  <span className="text-[10px] text-zinc-500 shrink-0">
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
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
          {messagesLoading ? (
            <div className="h-32 flex items-center justify-center text-zinc-500">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          ) : messages.length === 0 && !sending ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-4 py-6">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-3">
                <Sparkles className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold text-zinc-200">Aurora AI Co-Pilot</p>
              <p className="text-[11px] text-zinc-400 mt-1 max-w-[260px]">
                Connected to live workspace tools, records, and modules on your current route.
              </p>
            </div>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={cn('flex gap-2', m.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                {m.role !== 'user' && (
                  <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}
                <div
                  className={cn(
                    'max-w-[85%] rounded-xl px-3 py-2',
                    m.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-none text-xs leading-relaxed whitespace-pre-wrap'
                      : 'bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-bl-none'
                  )}
                >
                  {m.role === 'user' ? (
                    m.content
                  ) : (
                    <CompactMarkdown text={getDisplayContent(m)} />
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
          {(sending || streamingText || agentTrace.length > 0) && (
            <div className="flex gap-2 justify-start">
              <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <div className="max-w-[85%] rounded-xl rounded-bl-none px-3 py-2 bg-zinc-900 border border-zinc-800 text-zinc-200 space-y-1.5">
                {agentTrace.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {agentTrace.map((t, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-300"
                      >
                        {t.status === 'running' ? (
                          <Wrench className="w-2.5 h-2.5 animate-pulse text-amber-400" />
                        ) : (
                          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                        )}
                        {t.name}
                      </span>
                    ))}
                  </div>
                )}

                {streamingText ? (
                  <CompactMarkdown text={streamingText} />
                ) : (
                  <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                    <Loader2 className="w-3 h-3 animate-spin text-indigo-400" />
                    <span>{agentThought || 'Processing...'}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {approvalRequired && (
            <div className="p-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
                <ShieldAlert className="w-4 h-4" />
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
                  className="px-2.5 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-medium cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Composer */}
      <form onSubmit={handleSend} className="p-2.5 border-t border-zinc-800 flex items-center gap-2 shrink-0">
        <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Aurora AI..."
          disabled={sending}
          className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-zinc-500 outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-60"
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
