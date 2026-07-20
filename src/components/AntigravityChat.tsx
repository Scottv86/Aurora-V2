import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { cn, slugify } from '../lib/utils';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { io, Socket } from 'socket.io-client';
import { Navbar } from './Navigation/Navbar';
import { 
  Sparkles, Bot, Terminal, Play, CheckCircle2, AlertCircle, 
  Loader2, Trash2, Send, Mic, MicOff, Plus, FileText, CheckSquare, 
  Copy, Table, Compass, Layers, X,
  Code, Globe, Plug, Paperclip, ChevronDown,
  Layout, GitBranch, Zap, Cpu, Check, Square, Pin, FolderPlus, Edit2,
  History, Calendar, Folder, Settings, MessageSquare
} from 'lucide-react';
import { usePlatform } from '../hooks/usePlatform';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { DeleteConfirmationModal } from './Common/DeleteConfirmationModal';

const API_BASE_URL = 'http://127.0.0.1:3001/api/antigravity';
const WS_BASE_URL = 'http://127.0.0.1:3001';

interface ChatMessage {
  id: string;
  role: 'user' | 'model' | 'system';
  content: string;
  steps?: any;
  createdAt: string;
}

interface ChatSession {
  id: string;
  title: string;
  metadata: any;
  createdAt: string;
  updatedAt: string;
}

const QueryResultVisualizer = ({ result }: { result: any[] }) => {
  const [view, setView] = useState<'table' | 'chart'>('table');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const pageSize = 5;
  const [pageIndex, setPageIndex] = useState(0);

  if (!Array.isArray(result) || result.length === 0) return null;

  const sample = result[0];
  if (typeof sample !== 'object' || sample === null) return null;

  const keys = Object.keys(sample);
  const numericKeys = keys.filter(k => typeof sample[k] === 'number' || (!isNaN(Number(sample[k])) && typeof sample[k] !== 'boolean'));
  const stringKeys = keys.filter(k => typeof sample[k] === 'string');

  const canShowChart = numericKeys.length > 0 && keys.length > 1;

  // Sorting
  let sortedData = [...result];
  if (sortKey) {
    sortedData.sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];
      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
  }

  // Pagination
  const pageData = sortedData.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);
  const maxPages = Math.ceil(sortedData.length / pageSize);

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  return (
    <div className="mt-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-3 max-w-full">
      <div className="flex items-center justify-between border-b border-zinc-250/30 dark:border-zinc-800/40 pb-2">
        <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 select-none">
          <Table size={12} /> SQL Query Results ({result.length} rows)
        </span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setView('table')}
            className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
              view === 'table'
                ? 'bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300'
                : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-white/5'
            }`}
          >
            Table view
          </button>
          {canShowChart && (
            <button
              onClick={() => setView('chart')}
              className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                view === 'chart'
                  ? 'bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300'
                  : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-white/5'
              }`}
            >
              Chart view
            </button>
          )}
        </div>
      </div>

      {view === 'table' ? (
        <div className="space-y-2">
          <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800 max-w-full">
            <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800 text-left text-xs font-sans">
              <thead className="bg-zinc-100 dark:bg-zinc-950/50 text-[10px] text-zinc-500 uppercase tracking-wider font-bold select-none">
                <tr>
                  {keys.map(k => (
                    <th
                      key={k}
                      onClick={() => toggleSort(k)}
                      className="px-3 py-2 cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-900 transition-all active:scale-[0.98]"
                    >
                      <div className="flex items-center gap-1">
                        {k}
                        {sortKey === k && (sortAsc ? ' ▴' : ' ▾')}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 bg-transparent text-zinc-700 dark:text-zinc-300">
                {pageData.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-zinc-100/30 dark:hover:bg-white/2 cursor-default transition-all">
                    {keys.map(k => (
                      <td key={k} className="px-3 py-1.5 font-mono text-[11px] max-w-xs truncate" title={String(row[k])}>
                        {typeof row[k] === 'object' ? JSON.stringify(row[k]) : String(row[k])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {maxPages > 1 && (
            <div className="flex items-center justify-between text-[10px] text-zinc-550 select-none pt-1">
              <span>Page {pageIndex + 1} of {maxPages}</span>
              <div className="flex items-center gap-1">
                <button
                  disabled={pageIndex === 0}
                  onClick={() => setPageIndex(p => p - 1)}
                  className="px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-800 disabled:opacity-50 hover:bg-zinc-100 dark:hover:bg-white/5 transition-all text-[9px] font-bold"
                >
                  Prev
                </button>
                <button
                  disabled={pageIndex >= maxPages - 1}
                  onClick={() => setPageIndex(p => p + 1)}
                  className="px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-800 disabled:opacity-50 hover:bg-zinc-100 dark:hover:bg-white/5 transition-all text-[9px] font-bold"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="w-full pt-1">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={result} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey={stringKeys[0] || keys[0]} stroke="#888888" fontSize={9} tickLine={false} />
              <YAxis stroke="#888888" fontSize={9} tickLine={false} />
              <Tooltip
                contentStyle={{
                  fontSize: '11px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Bar dataKey={numericKeys[0]} fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={45} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export const AntigravityChat = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  let lastPlatformPath = localStorage.getItem('lastPlatformPath') || '/workspace';
  if (lastPlatformPath.includes('/settings')) {
    lastPlatformPath = '/workspace';
  }
  const { tenant, user: platformUser } = usePlatform();
  const { session: authSession, user: authUser } = useAuth();
  
  const getFirstName = (): string => {
    const rawName = (platformUser as any)?.firstName || (platformUser as any)?.name || authUser?.user_metadata?.full_name || authUser?.user_metadata?.name || authUser?.user_metadata?.first_name;
    if (rawName && typeof rawName === 'string') {
      const firstWord = rawName.trim().split(/\s+/)[0];
      if (firstWord && !firstWord.includes('@') && !firstWord.includes('.')) {
        return firstWord;
      }
    }
    const emailPrefix = authUser?.email?.split('@')[0] || '';
    const nameParts = emailPrefix.split(/[._-]/).filter(Boolean);
    if (nameParts.length > 0 && isNaN(Number(nameParts[0]))) {
      return nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1);
    }
    return 'Kenny';
  };

  const userName = getFirstName();
  
  // State
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionSearch, setSessionSearch] = useState('');
  const [streamingText, setStreamingText] = useState('');
  const [attachments, setAttachments] = useState<{ name: string; type: string; base64: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionType, setSuggestionType] = useState<'mention' | 'command' | null>(null);
  const [suggestionFilter, setSuggestionFilter] = useState('');
  const [selectedSuggestionIdx, setSelectedSuggestionIdx] = useState(0);
  const [deleteSessionId, setDeleteSessionId] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modelMenuRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Folder Management State
  const [folders, setFolders] = useState<{ id: string; name: string }[]>(() => {
    try {
      const saved = localStorage.getItem('aurora_chat_folders');
      return saved ? JSON.parse(saved) : [{ id: 'aurora', name: 'aurora' }];
    } catch {
      return [{ id: 'aurora', name: 'aurora' }];
    }
  });
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState('');
  const [movingSessionId, setMovingSessionId] = useState<string | null>(null);
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});

  const toggleFolderCollapse = (folderId: string) => {
    setCollapsedFolders(prev => ({ ...prev, [folderId]: !prev[folderId] }));
  };

  const saveFolders = (updatedFolders: { id: string; name: string }[]) => {
    setFolders(updatedFolders);
    localStorage.setItem('aurora_chat_folders', JSON.stringify(updatedFolders));
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    const folderId = slugify(newFolderName.trim());
    if (folders.some(f => f.id === folderId)) {
      toast.error("A folder with this name already exists.");
      return;
    }
    const updated = [...folders, { id: folderId, name: newFolderName.trim() }];
    saveFolders(updated);
    setNewFolderName('');
    setIsCreatingFolder(false);
    toast.success(`Folder "${newFolderName.trim()}" created`);
  };

  const handleRenameFolder = (folderId: string) => {
    if (!editingFolderName.trim()) return;
    const updated = folders.map(f => f.id === folderId ? { ...f, name: editingFolderName.trim() } : f);
    saveFolders(updated);
    setEditingFolderId(null);
    setEditingFolderName('');
    toast.success("Folder renamed");
  };

  const handleDeleteFolder = (folderId: string) => {
    if (folderId === 'aurora') {
      toast.error("The root 'aurora' folder cannot be deleted.");
      return;
    }
    const updated = folders.filter(f => f.id !== folderId);
    saveFolders(updated);
    setSessions(prev => prev.map(s => s.metadata?.folderId === folderId ? { ...s, metadata: { ...s.metadata, folderId: 'aurora' } } : s));
    toast.success("Folder deleted");
  };

  const handleTogglePinSession = async (s: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    const currentPinned = !!s.metadata?.isPinned;
    const nextPinned = !currentPinned;

    setSessions(prev => prev.map(item => item.id === s.id ? { ...item, metadata: { ...(item.metadata || {}), isPinned: nextPinned } } : item));
    if (activeSession?.id === s.id) {
      setActiveSession(prev => prev ? { ...prev, metadata: { ...(prev.metadata || {}), isPinned: nextPinned } } : null);
    }

    try {
      const token = authSession?.access_token;
      await fetch(`${API_BASE_URL}/sessions/${s.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant!.id
        },
        body: JSON.stringify({
          metadata: { isPinned: nextPinned }
        })
      });
      toast.success(nextPinned ? "Conversation pinned" : "Conversation unpinned");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update pin status");
    }
  };

  const handleMoveSessionToFolder = async (sessionIdToMove: string, targetFolderId: string) => {
    setMovingSessionId(null);
    setSessions(prev => prev.map(item => item.id === sessionIdToMove ? { ...item, metadata: { ...(item.metadata || {}), folderId: targetFolderId } } : item));
    if (activeSession?.id === sessionIdToMove) {
      setActiveSession(prev => prev ? { ...prev, metadata: { ...(prev.metadata || {}), folderId: targetFolderId } } : null);
    }

    try {
      const token = authSession?.access_token;
      await fetch(`${API_BASE_URL}/sessions/${sessionIdToMove}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant!.id
        },
        body: JSON.stringify({
          metadata: { folderId: targetFolderId }
        })
      });
      toast.success("Conversation moved");
    } catch (err) {
      console.error(err);
      toast.error("Failed to move conversation");
    }
  };
  
  // Real-time telemetry

  // Streaming thought trace
  const [agentTrace, setAgentTrace] = useState<any[]>([]);
  const [agentThought, setAgentThought] = useState<string | null>(null);

  // Right Panel State
  const [activeTab, setActiveTab] = useState<'plan' | 'tasks' | 'sql' | 'preview' | 'scratchpad' | 'explorer'>('plan');
  const [showRightPanel, setShowRightPanel] = useState(false);
  const [modelName, setModelName] = useState(() => localStorage.getItem('aurora_selected_ai_model') || 'default');
  const [showModelMenu, setShowModelMenu] = useState(false);

  // Click-outside listener for model menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modelMenuRef.current && !modelMenuRef.current.contains(event.target as Node)) {
        setShowModelMenu(false);
      }
    };
    if (showModelMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showModelMenu]);

  const handleSelectModel = (name: string) => {
    setModelName(name);
    localStorage.setItem('aurora_selected_ai_model', name);
    setShowModelMenu(false);
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
    setStreamingText('');
    setAgentThought(null);
    setAgentTrace([]);
    toast.info("Generation stopped.");
  };

  // Quick BYOK Key Modal State
  const [showQuickKeyModal, setShowQuickKeyModal] = useState(false);
  const [quickApiKey, setQuickApiKey] = useState('');
  const [savingQuickKey, setSavingQuickKey] = useState(false);

  const handleSaveQuickKey = async () => {
    if (!quickApiKey.trim()) return;
    setSavingQuickKey(true);
    try {
      const token = authSession?.access_token;
      const res = await fetch('http://localhost:3001/api/ai/keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant!.id
        },
        body: JSON.stringify({
          provider: 'google',
          keyName: 'Google Free Tier Key',
          apiKey: quickApiKey.trim(),
          isDefault: true
        })
      });
      if (!res.ok) throw new Error("Failed to save key");
      toast.success("API key saved! Resuming chat without limits...");
      setShowQuickKeyModal(false);
      setQuickApiKey('');
    } catch (e: any) {
      toast.error(e.message || "Could not save API key");
    } finally {
      setSavingQuickKey(false);
    }
  };

  // Resizable left sidebar state
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('sidebarWidth');
    return saved ? parseInt(saved, 10) : 256;
  });
  const isResizingRef = useRef(false);

  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = true;
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizingRef.current) return;
      const newWidth = Math.max(200, Math.min(480, moveEvent.clientX));
      setSidebarWidth(newWidth);
      localStorage.setItem('sidebarWidth', newWidth.toString());
    };

    const stopResizing = () => {
      isResizingRef.current = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', stopResizing);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', stopResizing);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  useEffect(() => {
    const planText = activeSession?.metadata?.plan;
    const tasksArr = activeSession?.metadata?.tasks;
    if ((typeof planText === 'string' && planText.trim().length > 0) || (Array.isArray(tasksArr) && tasksArr.length > 0)) {
      setShowRightPanel(true);
    } else {
      setShowRightPanel(false);
    }
  }, [activeSession?.id, activeSession?.metadata?.plan, activeSession?.metadata?.tasks]);

  useEffect(() => {
    // Snap scroll to (0, 0) on mount
    window.scrollTo(0, 0);

    // Prevent any browser viewport scrolling dynamically
    const handleScroll = () => {
      if (window.scrollY > 0 || window.scrollX > 0) {
        window.scrollTo(0, 0);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);
  
  // SQL Runner state
  const [sqlQuery, setSqlQuery] = useState("SELECT * FROM records LIMIT 5;");
  const [sqlResults, setSqlResults] = useState<any[]>([]);
  const [sqlLoading, setSqlLoading] = useState(false);
  const [sqlError, setSqlError] = useState<string | null>(null);

  // Scratchpad state
  const [scratchCode, setScratchCode] = useState(`// Write script here to test endpoints\nfetch('http://localhost:3001/health')\n  .then(res => res.json())\n  .then(data => console.log(data));`);
  const [scratchOutput, setScratchOutput] = useState('');
  const [scratchLoading, setScratchLoading] = useState(false);

  // Explorer workspace items
  const [explorerData, setExplorerData] = useState<{ modules: any[], connectors: any[], automations: any[] }>({
    modules: [],
    connectors: [],
    automations: []
  });

  const chatEndRef = useRef<HTMLDivElement>(null);
  const messageAreaRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const recognitionRef = useRef<any>(null);

  // Load chat sessions on mount
  useEffect(() => {
    if (!tenant?.id || !authSession?.access_token) return;
    fetchSessions();
    loadWorkspaceSchema();
  }, [tenant?.id, authSession?.access_token]);

  // Handle socket setup
  useEffect(() => {
    if (!tenant?.id || !authSession?.access_token) return;

    const socket = io(WS_BASE_URL, {
      auth: { token: authSession.access_token }
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join_tenant', tenant.id);
      console.log('[Socket] Connected to Antigravity socket');
    });

    socket.on('antigravity_step', (step: any) => {
      if (step.type === 'thought') {
        setAgentThought(step.content);
      } else if (step.type === 'tool_call') {
        setAgentTrace(prev => [...prev, { name: step.name, arguments: step.arguments, status: 'running' }]);
      } else if (step.type === 'tool_result') {
        setAgentTrace(prev => prev.map(t => t.name === step.name ? { ...t, result: step.result, status: 'done' } : t));
        // Refresh workspace schema if builder tool is called
        if (step.name.includes('module') || step.name.includes('automation') || step.name.includes('connector')) {
          loadWorkspaceSchema();
        }
      } else if (step.type === 'stream_start') {
        setStreamingText('');
        setAgentThought(null);
      } else if (step.type === 'chunk') {
        setStreamingText(prev => prev + step.content);
      } else if (step.type === 'approval_required') {
        setLoading(false);
        setAgentThought(null);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [tenant?.id, authSession?.access_token]);

  // Load session details when URL sessionId changes
  useEffect(() => {
    if (sessionId && tenant?.id && authSession?.access_token) {
      loadSession(sessionId);
    } else if (!sessionId) {
      setMessagesLoading(false);
      setMessages([]);
      setActiveSession(null);
      setAgentTrace([]);
    }
  }, [sessionId, tenant?.id, authSession?.access_token]);

  // Scroll to bottom on new message
  useEffect(() => {
    if (messageAreaRef.current) {
      messageAreaRef.current.scrollTo({
        top: messageAreaRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, agentThought, agentTrace, streamingText]);

  const fetchSessions = async () => {
    if (!tenant?.id || !authSession?.access_token) return;
    try {
      setSessionsLoading(true);
      const token = authSession.access_token;
      const res = await fetch(`${API_BASE_URL}/sessions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant.id
        }
      });
      if (!res.ok) throw new Error("Failed to fetch sessions");
      const data = await res.json();
      setSessions(data);
    } catch (error) {
      console.error(error);
    } finally {
      setSessionsLoading(false);
    }
  };

  const loadSession = async (id: string) => {
    if (!tenant?.id || !authSession?.access_token) return;
    try {
      setMessagesLoading(true);
      const token = authSession.access_token;
      const res = await fetch(`${API_BASE_URL}/sessions/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant.id
        }
      });
      if (!res.ok) throw new Error("Failed to load session");
      const data = await res.json();
      setActiveSession(data);

      const sanitizedMessages = (data.messages || []).map((m: any) => {
        let stepsArr = [];
        if (Array.isArray(m.steps)) {
          stepsArr = m.steps;
        } else if (typeof m.steps === 'string') {
          try { stepsArr = JSON.parse(m.steps); } catch { stepsArr = []; }
        }
        return {
          ...m,
          steps: stepsArr
        };
      });

      setMessages(sanitizedMessages);
      setAgentTrace([]);
      setAgentThought(null);
    } catch (error) {
      console.error("[loadSession Error]", error);
      toast.error("Failed to load conversation history.");
    } finally {
      setMessagesLoading(false);
    }
  };

  const createSession = async () => {
    try {
      const token = authSession?.access_token;
      const res = await fetch(`${API_BASE_URL}/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant!.id
        },
        body: JSON.stringify({ title: 'New Vibe Chat' })
      });
      if (!res.ok) throw new Error("Failed to create session");
      const data = await res.json();
      setSessions(prev => [data, ...prev]);
      navigate(`/workspace/aurora-vibe/${data.id}`);
      toast.success("New agent session initialized.");
    } catch (error) {
      toast.error("Could not start session.");
    }
  };

  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteSessionId(id);
  };

  const confirmDeleteSession = async () => {
    if (!deleteSessionId) return;
    try {
      const token = authSession?.access_token;
      const res = await fetch(`${API_BASE_URL}/sessions/${deleteSessionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant!.id
        }
      });
      if (!res.ok) throw new Error("Failed to delete session");
      setSessions(prev => prev.filter(s => s.id !== deleteSessionId));
      if (sessionId === deleteSessionId) navigate('/workspace/aurora-vibe');
      toast.success("Session deleted successfully.");
    } catch (error) {
      toast.error("Could not delete session.");
    } finally {
      setDeleteSessionId(null);
    }
  };

  const loadWorkspaceSchema = async () => {
    try {
      const token = authSession?.access_token;
      // Re-use data endpoints or general schema fetches
      const res = await fetch('http://localhost:3001/api/data/modules', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant!.id
        }
      });
      if (res.ok) {
        const data = await res.json();
        // Categorize into modules and page modules
        setExplorerData(prev => ({
          ...prev,
          modules: data.filter((m: any) => m.type !== 'PAGE'),
          workspace: data.filter((m: any) => m.type === 'PAGE')
        }));
      }

      const resAutos = await fetch('http://localhost:3001/api/automations', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant!.id
        }
      });
      if (resAutos.ok) {
        const data = await resAutos.json();
        setExplorerData(prev => ({ ...prev, automations: data }));
      }

      const resConns = await fetch('http://localhost:3001/api/connectors', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant!.id
        }
      });
      if (resConns.ok) {
        const data = await resConns.json();
        setExplorerData(prev => ({ ...prev, connectors: data.active || [] }));
      }
    } catch (error) {
      console.error("Failed to load workspace schema", error);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    let activeSessionId = sessionId;

    // Auto-create session on the fly if no session is active
    if (!activeSessionId) {
      try {
        const token = authSession?.access_token;
        const res = await fetch(`${API_BASE_URL}/sessions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'x-tenant-id': tenant!.id
          },
          body: JSON.stringify({ title: inputMessage.trim().substring(0, 30) || 'New Vibe Chat' })
        });
        if (!res.ok) throw new Error("Failed to initialize session");
        const newSession = await res.json();
        setSessions(prev => [newSession, ...prev]);
        setActiveSession(newSession);
        activeSessionId = newSession.id;
        window.history.replaceState(null, '', `/workspace/aurora-vibe/${newSession.id}`);
      } catch (e: any) {
        toast.error("Could not start conversation.");
        return;
      }
    }
    
    const userMsg = inputMessage;
    const userAttachments = [...attachments];
    setInputMessage('');
    setAttachments([]);
    setLoading(true);
    setAgentTrace([]);
    setAgentThought("Queued...");

    // Optimistically add user message with files description
    const fileNamesList = userAttachments.map(a => `[Attached File: ${a.name} (${a.type})]`).join('\n');
    const displayMsgContent = fileNamesList ? `${userMsg}\n\n${fileNamesList}` : userMsg;

    const tempUserMessage: ChatMessage = {
      id: Math.random().toString(),
      role: 'user',
      content: displayMsgContent,
      createdAt: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMessage]);

    const lastPlatformPath = localStorage.getItem('lastPlatformPath');
    let contextObj = null;
    if (lastPlatformPath) {
      const parts = lastPlatformPath.split('/').filter(Boolean);
      let contextType = 'Platform Path';
      let contextName = '';
      let contextId = '';

      if (parts[0] === 'workspace') {
        if (parts[1] === 'settings' && parts[2] === 'builder' && parts[3]) {
          contextId = parts[3];
          contextType = 'Module Builder';
          const matched = explorerData.modules.find((m: any) => m.id === contextId || slugify(m.name) === contextId);
          contextName = matched?.name || '';
        } else if (parts[1] === 'modules' && parts[2]) {
          contextId = parts[2];
          const matched = explorerData.modules.find((m: any) => m.id === contextId || slugify(m.name) === contextId);
          contextName = matched?.name || '';
          if (parts[3] === 'records' && parts[4]) {
            contextType = 'Record Detail View';
            contextId = parts[4];
          } else {
            contextType = 'Module Records List';
          }
        } else if (parts[1] === 'pages' && parts[2]) {
          contextId = parts[2];
          contextType = 'Page View';
          const matched = (explorerData as any).workspace?.find((m: any) => m.type === 'PAGE' && (m.id === contextId || slugify(m.name) === contextId));
          contextName = matched?.name || '';
        } else if (parts[1] === 'platform') {
          contextType = `Platform ${parts[2] ? parts[2].replace(/-/g, ' ') : 'Operations'}`;
        }
      }

      contextObj = {
        path: lastPlatformPath,
        type: contextType,
        id: contextId,
        name: contextName
      };
    }

    try {
      abortControllerRef.current = new AbortController();
      const token = authSession?.access_token;
      const res = await fetch(`${API_BASE_URL}/sessions/${activeSessionId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant!.id
        },
        signal: abortControllerRef.current.signal,
        body: JSON.stringify({
          message: userMsg,
          socketId: socketRef.current?.id,
          context: contextObj,
          model: modelName,
          attachments: userAttachments
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to process request");
      }

      const data = await res.json();
      
      // Update with final response
      setMessages(prev => [
        ...prev.filter(m => m.id !== tempUserMessage.id),
        tempUserMessage,
        {
          id: Math.random().toString(),
          role: 'model',
          content: data.text,
          steps: data.steps,
          createdAt: new Date().toISOString()
        }
      ]);
      
      // Refresh session plan metadata
      fetchSessions();
      if (activeSessionId) loadSession(activeSessionId);

    } catch (error: any) {
      const msg = error?.message || "Agent loop failed to complete.";
      if (msg.includes('rate limit') || msg.includes('429') || msg.includes('quota')) {
        setShowQuickKeyModal(true);
      }
      toast.error(msg);
    } finally {
      setLoading(false);
      setAgentThought(null);
      setAgentTrace([]);
      setStreamingText('');
      setAttachments([]);
    }
  };

  const handleActionApproval = async (action: 'approve' | 'reject') => {
    if (!sessionId) return;
    setLoading(true);
    setAgentThought(action === 'approve' ? "Executing action..." : "Cancelling action...");
    setStreamingText('');

    try {
      const token = authSession?.access_token;
      const res = await fetch(`${API_BASE_URL}/sessions/${sessionId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant!.id
        },
        body: JSON.stringify({
          action,
          socketId: socketRef.current?.id,
          model: modelName
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to process approval");
      }

      // Refresh session
      loadSession(sessionId);
      fetchSessions();

    } catch (err: any) {
      toast.error(err.message || "Failed to submit action approval");
    } finally {
      setLoading(false);
      setAgentThought(null);
    }
  };

  const handleExecuteSQL = async () => {
    if (!sqlQuery.trim()) return;
    setSqlLoading(true);
    setSqlError(null);
    setSqlResults([]);
    try {
      const token = authSession?.access_token;
      const res = await fetch(`http://localhost:3001/api/query-explorer/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant!.id
        },
        body: JSON.stringify({ query: sqlQuery })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Query failed");
      }
      setSqlResults(data.rows || []);
      toast.success(`Query succeeded: ${data.rows?.length || 0} rows returned.`);
    } catch (error: any) {
      setSqlError(error.message);
      toast.error("SQL query execution failed.");
    } finally {
      setSqlLoading(false);
    }
  };

  const handleRunScratchScript = async () => {
    if (!scratchCode.trim()) return;
    setScratchLoading(true);
    setScratchOutput('Running script...');
    try {
      const token = authSession?.access_token;
      // We run scratch scripts using the agent's execute script API endpoint
      const res = await fetch(`${API_BASE_URL}/sessions/${sessionId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant!.id
        },
        body: JSON.stringify({
          message: `Run this scratch script:\n\`\`\`javascript\n${scratchCode}\n\`\`\``
        })
      });
      const data = await res.json();
      if (data.steps && data.steps.length > 0) {
        const lastScriptStep = data.steps.find((s: any) => s.name === 'execute_scratch_script');
        if (lastScriptStep?.result) {
          const { stdout, stderr, exitCode } = lastScriptStep.result;
          setScratchOutput(`Exit Code: ${exitCode}\n\n[STDOUT]\n${stdout || '(no output)'}\n\n[STDERR]\n${stderr || '(no errors)'}`);
        }
      }
      toast.success("Script executed successfully.");
    } catch (error: any) {
      setScratchOutput(`Error: ${error.message}`);
      toast.error("Script execution failed.");
    } finally {
      setScratchLoading(false);
    }
  };

  const toggleVoiceListen = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Speech recognition is not supported in this browser.");
      return;
    }

    const recObj = new SpeechRecognition();
    recObj.continuous = false;
    recObj.interimResults = false;
    recObj.lang = 'en-US';

    recObj.onstart = () => setIsListening(true);
    recObj.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      setInputMessage(prev => prev + ' ' + text);
    };
    recObj.onerror = () => setIsListening(false);
    recObj.onend = () => setIsListening(false);

    recognitionRef.current = recObj;
    recObj.start();
  };

  const handleForkSession = async () => {
    if (!activeSession) return;
    try {
      const token = authSession?.access_token;
      // Fork copies message history to a new session
      const res = await fetch(`${API_BASE_URL}/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant!.id
        },
        body: JSON.stringify({ title: `Fork of ${activeSession.title}` })
      });
      const newSess = await res.json();
      
      // Copy messages
      for (const msg of messages) {
        await fetch(`${API_BASE_URL}/sessions/${newSess.id}/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'x-tenant-id': tenant!.id
          },
          body: JSON.stringify({ message: msg.content })
        });
      }
      
      fetchSessions();
      navigate(`/workspace/aurora-vibe/${newSess.id}`);
      toast.success("Conversation forked to new branch.");
    } catch (error) {
      toast.error("Could not fork conversation.");
    }
  };

  const renderMarkdown = (text: string) => {
    if (!text) return <p className="text-zinc-400 italic">No plan compiled yet.</p>;

    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeBlockLines: string[] = [];
    let codeBlockLang = '';

    lines.forEach((line, idx) => {
      const trimmed = line.trim();

      if (trimmed.startsWith('```')) {
        if (inCodeBlock) {
          elements.push(
            <div key={`code-${idx}`} className="my-2.5 p-3.5 bg-zinc-900 text-zinc-100 rounded-xl font-mono text-xs overflow-x-auto border border-zinc-800 shadow-sm">
              {codeBlockLang && <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5 font-bold">{codeBlockLang}</div>}
              <pre className="whitespace-pre-wrap leading-relaxed">{codeBlockLines.join('\n')}</pre>
            </div>
          );
          codeBlockLines = [];
          codeBlockLang = '';
          inCodeBlock = false;
        } else {
          inCodeBlock = true;
          codeBlockLang = trimmed.replace('```', '').trim();
        }
        return;
      }

      if (inCodeBlock) {
        codeBlockLines.push(line);
        return;
      }

      // Headers
      if (trimmed.startsWith('# ')) {
        elements.push(
          <h1 key={idx} className="text-lg font-bold text-zinc-800 dark:text-zinc-200 mt-4 mb-2 pb-1 border-b border-zinc-200/60 dark:border-zinc-800/80">
            {trimmed.replace('# ', '')}
          </h1>
        );
        return;
      }
      if (trimmed.startsWith('## ')) {
        elements.push(
          <h2 key={idx} className="text-base font-semibold text-zinc-700 dark:text-zinc-200 mt-3 mb-1.5">
            {trimmed.replace('## ', '')}
          </h2>
        );
        return;
      }
      if (trimmed.startsWith('### ')) {
        elements.push(
          <h3 key={idx} className="text-sm font-semibold text-zinc-600 dark:text-zinc-350 mt-2.5 mb-1">
            {trimmed.replace('### ', '')}
          </h3>
        );
        return;
      }

      // Numbered Lists (e.g. "1. ")
      if (/^\d+\.\s+/.test(trimmed)) {
        const num = trimmed.match(/^(\d+)\./)?.[1] || '1';
        const content = trimmed.replace(/^\d+\.\s+/, '');
        elements.push(
          <div key={idx} className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300 my-1">
            <span className="font-semibold text-indigo-600 dark:text-indigo-400 shrink-0 select-none">{num}.</span>
            <div className="flex-1">{parseInlineFormatting(content)}</div>
          </div>
        );
        return;
      }

      // Bullet Lists
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const content = trimmed.substring(2);
        elements.push(
          <div key={idx} className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300 my-1 pl-1">
            <span className="text-indigo-500 shrink-0 select-none">•</span>
            <div className="flex-1">{parseInlineFormatting(content)}</div>
          </div>
        );
        return;
      }

      // Blockquotes
      if (trimmed.startsWith('> ')) {
        elements.push(
          <blockquote key={idx} className="pl-3 border-l-2 border-indigo-500 text-sm text-zinc-600 dark:text-zinc-400 italic my-2">
            {parseInlineFormatting(trimmed.substring(2))}
          </blockquote>
        );
        return;
      }

      // Horizontal Rule
      if (trimmed === '---') {
        elements.push(<hr key={idx} className="my-3 border-t border-zinc-200 dark:border-zinc-800" />);
        return;
      }

      // Empty line
      if (!trimmed) {
        elements.push(<div key={idx} className="h-1" />);
        return;
      }

      // Normal paragraph
      elements.push(
        <p key={idx} className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300 my-1">
          {parseInlineFormatting(trimmed)}
        </p>
      );
    });

    if (inCodeBlock && codeBlockLines.length > 0) {
      elements.push(
        <div key="code-eof" className="my-2.5 p-3.5 bg-zinc-900 text-zinc-100 rounded-xl font-mono text-xs overflow-x-auto border border-zinc-800 shadow-sm">
          <pre className="whitespace-pre-wrap leading-relaxed">{codeBlockLines.join('\n')}</pre>
        </div>
      );
    }

    return <div className="space-y-1.5 font-sans">{elements}</div>;
  };

  const parseInlineFormatting = (str: string) => {
    const parts = str.split(/(\*\*.*?\*\*|`.*?`|\*.*?\*|\[.*?\]\(.*?\))/g);
    return parts.map((part, i) => {
      if (!part) return null;
      if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
        return <strong key={i} className="font-semibold text-zinc-800 dark:text-white">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('*') && part.endsWith('*') && part.length >= 2 && !part.startsWith('**')) {
        return <em key={i} className="italic text-zinc-700 dark:text-zinc-300">{part.slice(1, -1)}</em>;
      }
      if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
        return (
          <code key={i} className="bg-zinc-100 dark:bg-zinc-800/80 px-1.5 py-0.5 rounded text-xs font-mono text-indigo-650 dark:text-indigo-400 border border-zinc-200/50 dark:border-zinc-700/50">
            {part.slice(1, -1)}
          </code>
        );
      }
      const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
      if (linkMatch) {
        return (
          <a key={i} href={linkMatch[2]} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 underline hover:text-indigo-500">
            {linkMatch[1]}
          </a>
        );
      }
      return part;
    });
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputMessage(val);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;

    // Autocomplete triggers detection
    const selectionEnd = e.target.selectionEnd;
    const textBeforeCursor = val.substring(0, selectionEnd);
    const slashMatch = textBeforeCursor.match(/\/(\w*)$/);
    const atMatch = textBeforeCursor.match(/@(\w*)$/);

    if (slashMatch) {
      setShowSuggestions(true);
      setSuggestionType('command');
      setSuggestionFilter(slashMatch[1]);
      setSelectedSuggestionIdx(0);
    } else if (atMatch) {
      setShowSuggestions(true);
      setSuggestionType('mention');
      setSuggestionFilter(atMatch[1]);
      setSelectedSuggestionIdx(0);
    } else {
      setShowSuggestions(false);
      setSuggestionType(null);
      setSuggestionFilter('');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setAttachments(prev => [
          ...prev,
          {
            name: file.name,
            type: file.type,
            base64: base64String.split(',')[1]
          }
        ]);
      };
      reader.readAsDataURL(file);
    });
    if (e.target) e.target.value = '';
  };

  const getSuggestions = () => {
    if (suggestionType === 'command') {
      const allCommands = [
        { name: '/sql', desc: 'Construct and run SELECT SQL queries' },
        { name: '/test-connector', desc: 'Simulate custom Nexus Connector dry-runs' },
        { name: '/clear', desc: 'Clear the current chat history' },
        { name: '/help', desc: 'Show co-pilot guidelines & available tools' }
      ];
      return allCommands.filter(c => c.name.toLowerCase().includes('/' + suggestionFilter.toLowerCase()));
    } else if (suggestionType === 'mention') {
      const allMentions = [
        ...explorerData.modules.map((m: any) => ({ name: `@${m.name}`, desc: 'Database Module' })),
        ...explorerData.connectors.map((c: any) => ({ name: `@${c.name}`, desc: 'Integration Connector' }))
      ];
      return allMentions.filter(m => m.name.toLowerCase().includes('@' + suggestionFilter.toLowerCase()));
    }
    return [];
  };

  const handleSelectSuggestion = (suggestion: any) => {
    if (!textareaRef.current) return;
    const selectionEnd = textareaRef.current.selectionEnd;
    const textBeforeCursor = inputMessage.substring(0, selectionEnd);
    const textAfterCursor = inputMessage.substring(selectionEnd);

    let regex = suggestionType === 'command' ? /\/(\w*)$/ : /@(\w*)$/;
    const replacement = suggestion.name + ' ';
    const newTextBeforeCursor = textBeforeCursor.replace(regex, replacement);

    setInputMessage(newTextBeforeCursor + textAfterCursor);
    setShowSuggestions(false);
    setSuggestionType(null);
    setSuggestionFilter('');

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const cursorPosition = newTextBeforeCursor.length;
        textareaRef.current.setSelectionRange(cursorPosition, cursorPosition);
      }
    }, 10);
  };

  const filteredSessions = sessions.filter(s =>
    (s.title || '').toLowerCase().includes(sessionSearch.toLowerCase())
  );

  const renderSessionItem = (s: ChatSession) => {
    const isPinned = !!s.metadata?.isPinned;
    const currentFolderId = s.metadata?.folderId || 'aurora';

    return (
      <div 
        key={s.id}
        onClick={() => navigate(`/workspace/aurora-vibe/${s.id}`)}
        className={`group relative w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer transition-all border ${
          s.id === sessionId 
            ? 'bg-zinc-100 dark:bg-white/10 border-zinc-200/50 dark:border-zinc-800/40 shadow-sm text-zinc-900 dark:text-white font-semibold' 
            : 'bg-transparent border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100/50 dark:hover:bg-white/5'
        }`}
      >
        <MessageSquare size={16} className={cn("shrink-0", s.id === sessionId ? "text-indigo-600 dark:text-white" : "text-zinc-400 dark:text-zinc-550")} />
        <span className="text-xs font-medium flex-1 text-left truncate">{s.title || 'Untitled Session'}</span>
        
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Pin Toggle */}
          <button 
            onClick={(e) => handleTogglePinSession(s, e)}
            className={cn(
              "p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all cursor-pointer",
              isPinned ? "text-amber-500 opacity-100" : "text-zinc-400 hover:text-amber-500"
            )}
            title={isPinned ? "Unpin Conversation" : "Pin Conversation"}
          >
            <Pin className={cn("h-3 w-3", isPinned && "fill-amber-500")} />
          </button>

          {/* Move to Folder */}
          <div className="relative">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setMovingSessionId(movingSessionId === s.id ? null : s.id);
              }}
              className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 hover:text-indigo-500 transition-all cursor-pointer"
              title="Move to Folder"
            >
              <FolderPlus className="h-3 w-3" />
            </button>
            {movingSessionId === s.id && (
              <div 
                onClick={(e) => e.stopPropagation()} 
                className="absolute left-0 top-full mt-1 w-40 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl p-1 z-50 text-xs"
              >
                <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider px-2 py-1">Move to Folder</div>
                {folders.map(f => (
                  <button
                    key={f.id}
                    onClick={() => handleMoveSessionToFolder(s.id, f.id)}
                    className={cn(
                      "w-full text-left px-2 py-1 rounded-md transition-all truncate flex items-center gap-1.5 cursor-pointer",
                      currentFolderId === f.id ? "font-bold text-indigo-600 dark:text-indigo-400" : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    )}
                  >
                    <Folder className="h-3 w-3" />
                    <span className="truncate">{f.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Delete Session */}
          <button 
            onClick={(e) => deleteSession(s.id, e)}
            className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 hover:text-red-500 transition-all cursor-pointer"
            title="Delete Session"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
    );
  };

  const getActiveTasks = () => activeSession?.metadata?.tasks || [];

  return (
    <div 
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, height: '100vh', width: '100vw' }}
      className="flex flex-col bg-zinc-50 dark:bg-zinc-950 font-sans text-zinc-800 dark:text-zinc-100 antialiased overflow-hidden"
    >
      <Navbar />
      
      <div className="flex-1 flex min-h-0 relative z-10">
      {/* Background glow effects matching Aurora PlatformShell */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 opacity-40 dark:opacity-20">
        <motion.div 
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 50, 0],
            y: [0, 30, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-indigo-500/20 dark:bg-indigo-500/40 blur-[120px] rounded-full" 
        />
        <motion.div 
          animate={{
            scale: [1.2, 1, 1.2],
            x: [0, -40, 0],
            y: [0, -20, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-teal-500/20 dark:bg-teal-500/30 blur-[120px] rounded-full" 
        />
        <motion.div 
          animate={{
            scale: [1, 1.3, 1],
            x: [0, 30, 0],
            y: [0, -40, 0],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute top-[20%] right-[10%] w-[40%] h-[40%] bg-purple-500/10 dark:bg-purple-500/20 blur-[120px] rounded-full" 
        />
        <motion.div 
          animate={{
            scale: [1.3, 1, 1.3],
            x: [0, -20, 0],
            y: [0, 50, 0],
          }}
          transition={{
            duration: 22,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute bottom-[10%] left-[20%] w-[35%] h-[35%] bg-emerald-500/10 dark:bg-emerald-500/20 blur-[120px] rounded-full" 
        />
      </div>

      <div 
        style={{ width: `${sidebarWidth}px` }}
        className="relative bg-white/60 dark:bg-zinc-950/65 backdrop-blur-xl border-r border-zinc-200/50 dark:border-zinc-800/40 flex flex-col flex-shrink-0 z-10"
      >
        <div 
          onMouseDown={startResizing}
          className="absolute top-0 right-0 w-[4px] h-full cursor-col-resize hover:bg-zinc-300/45 dark:hover:bg-zinc-700/45 active:bg-zinc-400 dark:active:bg-zinc-600 transition-all z-20"
        />

        {/* Explorer links & sessions */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin">
          {/* New Conversation Button */}
          <button 
            onClick={createSession}
            className="w-full bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-650 hover:from-indigo-600 hover:via-purple-600 hover:to-purple-700 text-white text-xs py-2 px-3.5 rounded-lg flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-[0_0_12px_rgba(99,102,241,0.3)] font-semibold border-none outline-none cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5 text-white" /> New Conversation
          </button>

          {/* Core Explorer Items */}
          <div className="space-y-1">
            <div className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 cursor-pointer transition-all">
              <History size={18} className="shrink-0 text-zinc-400 dark:text-zinc-500" />
              <span>Conversation History</span>
            </div>
            <div className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 cursor-pointer transition-all">
              <Calendar size={18} className="shrink-0 text-zinc-400 dark:text-zinc-500" />
              <span>Scheduled Tasks</span>
            </div>
          </div>

          {/* Pinned Conversations */}
          <div>
            <div className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em] mb-2 px-3 flex items-center justify-between select-none">
              <div className="flex items-center gap-2">
                <Pin className="h-3 w-3 text-amber-500 fill-amber-500" />
                <span>Pinned Conversations</span>
              </div>
              {sessions.filter(s => s.metadata?.isPinned).length > 0 && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 font-bold">
                  {sessions.filter(s => s.metadata?.isPinned).length}
                </span>
              )}
            </div>
            {sessions.filter(s => s.metadata?.isPinned).length === 0 ? (
              <div className="text-xs text-zinc-500 dark:text-zinc-650 px-3 italic pl-6">No pinned conversations yet</div>
            ) : (
              <div className="space-y-1">
                {sessions.filter(s => s.metadata?.isPinned).map(renderSessionItem)}
              </div>
            )}
          </div>

          {/* Folders Structure */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em] px-3 select-none">
              <div className="flex items-center gap-2">
                <Folder className="h-3.5 w-3.5 text-indigo-500" />
                <span>Folders</span>
              </div>
              <button 
                onClick={() => setIsCreatingFolder(true)}
                className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 hover:text-indigo-500 transition-all cursor-pointer"
                title="Create New Folder"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Search Box */}
            <div className="px-3 mb-2">
              <input 
                type="text"
                placeholder="Search chats..."
                value={sessionSearch}
                onChange={(e) => setSessionSearch(e.target.value)}
                className="w-full text-xs bg-zinc-100 dark:bg-zinc-800/40 border border-zinc-200/50 dark:border-zinc-800 rounded-lg px-2 py-1.5 text-zinc-700 dark:text-zinc-300 placeholder-zinc-500 outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
              />
            </div>

            {/* Folder List & Sessions */}
            <div className="space-y-3">
              {folders.map(folder => {
                const folderSessions = filteredSessions.filter(s => (s.metadata?.folderId || 'aurora') === folder.id);
                const isEditing = editingFolderId === folder.id;
                const isCollapsed = !!collapsedFolders[folder.id];

                return (
                  <div key={folder.id} className="space-y-1">
                    <div 
                      onClick={() => toggleFolderCollapse(folder.id)}
                      className="group flex items-center justify-between px-2.5 py-1.5 text-xs font-bold text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-100/60 dark:hover:bg-zinc-800/40 transition-all select-none cursor-pointer"
                    >
                      <div className="flex items-center gap-2 truncate flex-1">
                        <ChevronDown className={cn("h-3.5 w-3.5 text-zinc-400 transition-transform duration-200 shrink-0", isCollapsed && "-rotate-90")} />
                        <Folder className="h-4 w-4 shrink-0 text-indigo-500 dark:text-indigo-400" />
                        {isEditing ? (
                          <input 
                            type="text"
                            value={editingFolderName}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => setEditingFolderName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleRenameFolder(folder.id);
                              if (e.key === 'Escape') setEditingFolderId(null);
                            }}
                            autoFocus
                            className="bg-white dark:bg-zinc-900 border border-indigo-500 rounded px-1.5 py-0.5 text-xs outline-none"
                          />
                        ) : (
                          <span className="truncate">{folder.name}</span>
                        )}
                        <span className="text-[10px] text-zinc-400 font-mono">({folderSessions.length})</span>
                      </div>

                      {folder.id !== 'aurora' && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingFolderId(folder.id);
                              setEditingFolderName(folder.name);
                            }}
                            className="p-1 text-zinc-400 hover:text-indigo-500 transition-all cursor-pointer"
                            title="Rename Folder"
                          >
                            <Edit2 className="h-3 w-3" />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteFolder(folder.id);
                            }}
                            className="p-1 text-zinc-400 hover:text-red-500 transition-all cursor-pointer"
                            title="Delete Folder"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Folder Sessions */}
                    {!isCollapsed && (
                      <div className="pl-4 space-y-1">
                        {sessionsLoading ? (
                          <div className="space-y-1.5 pr-2 py-1">
                            {[1, 2, 3].map(n => (
                              <div key={n} className="h-6 w-full bg-zinc-200/60 dark:bg-zinc-800/60 animate-pulse rounded-md" />
                            ))}
                          </div>
                        ) : folderSessions.length === 0 ? (
                          <div className="p-1.5 text-[11px] text-zinc-400 dark:text-zinc-600 italic">No conversations</div>
                        ) : (
                          folderSessions.map(renderSessionItem)
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>

      {/* 2. Middle Panel: Chat Window */}
      <div className="flex-1 flex flex-col min-w-0 bg-transparent border-r border-zinc-200/50 dark:border-zinc-800/40">
        {/* Top Header telemetry */}
        <div className="h-12 border-b border-zinc-200/50 dark:border-zinc-800/40 px-6 flex items-center justify-between flex-shrink-0 bg-white/70 dark:bg-zinc-950/50 backdrop-blur-xl z-10">
          <div className="flex items-center gap-3">
            {activeSession && (
              <>
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-semibold text-xs text-zinc-800 dark:text-zinc-200">
                  {activeSession.title}
                </span>
                <button 
                  onClick={handleForkSession}
                  className="flex items-center gap-1 px-2 py-1 text-[10px] bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-all shadow-sm"
                >
                  <GitBranch className="h-3 w-3" /> Fork
                </button>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            {/* Real-Time Rolling Gauge Indicator */}
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800 text-[10px] font-mono font-bold text-zinc-600 dark:text-zinc-300 shadow-sm" title="Real-time rolling capacity limits (5-hour and 7-day windows)">
              <span className="text-amber-500">⚡ 5h: 0%</span>
              <span className="text-zinc-400">|</span>
              <span className="text-purple-400">7d: 0%</span>
            </div>

            <button 
              onClick={() => setShowRightPanel(!showRightPanel)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-all font-semibold shadow-sm"
            >
              <Layout className="h-3.5 w-3.5" /> 
              {showRightPanel ? 'Hide Workspace Previews' : 'Show Workspace Previews'}
            </button>
          </div>
        </div>

        {/* Message Area */}
        <div ref={messageAreaRef} className="flex-1 overflow-y-auto px-4 py-8 space-y-8 scrollbar-thin z-10">
          {messagesLoading ? (
            <div className="max-w-3xl mx-auto w-full space-y-6 pt-4">
              <div className="h-12 w-2/3 ml-auto bg-zinc-200/50 dark:bg-zinc-800/40 animate-pulse rounded-2xl" />
              <div className="h-28 w-full bg-zinc-200/30 dark:bg-zinc-900/30 animate-pulse rounded-2xl" />
              <div className="h-12 w-1/2 ml-auto bg-zinc-200/50 dark:bg-zinc-800/40 animate-pulse rounded-2xl" />
            </div>
          ) : !sessionId && messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto p-6 space-y-8 animate-in fade-in zoom-in-95 duration-500">
              <div className="space-y-3">
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 font-sans">
                  Hi {userName}, what's the move?
                </h1>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium max-w-md mx-auto">
                  Ask Aurora to build database modules, automate workflows, connect APIs, or analyze enterprise data.
                </p>
              </div>

              {/* Quick Start Prompt Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl text-left">
                {[
                  { title: "Australian Business Register API", desc: "Create an ABN lookup connector for lead enrichment", prompt: "Create a lookup to the Australian Business Register API" },
                  { title: "Audit & Score Open Leads", desc: "Query top 10 viable leads and summarize high-value opportunities", prompt: "Find the 10 most viable open leads and summarize them" },
                  { title: "Customer Onboarding Workflow", desc: "Build an automated multi-step verification pipeline", prompt: "Build an automated customer onboarding verification workflow" },
                  { title: "Platform Architecture Plan", desc: "Draft a dynamic schema & task checklist for a new module", prompt: "Draft a dynamic module schema and architecture plan for Inventory Management" }
                ].map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setInputMessage(item.prompt);
                      if (textareaRef.current) textareaRef.current.focus();
                    }}
                    className="p-4 rounded-2xl bg-white/80 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800 hover:border-indigo-500/40 dark:hover:border-indigo-500/40 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 transition-all text-left group shadow-sm flex flex-col justify-between cursor-pointer"
                  >
                    <div>
                      <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {item.title}
                      </div>
                      <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                        {item.desc}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto w-full space-y-8">
              {messages.map((m, idx) => {
                if (m.role === 'user') {
                  return (
                    <div key={m.id || idx} className="w-full flex justify-end animate-fade-in">
                      <div className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-4 shadow-sm relative">
                        <div className="text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed font-sans">{m.content}</div>
                        <span className="absolute bottom-2 right-3 text-[9px] text-zinc-400 font-mono">
                          {m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                    </div>
                  );
                }

                // Assistant/Model message: Flat text direct on page (no container border!)
                return (
                  <div key={m.id || idx} className="w-full space-y-3 py-2 border-b border-zinc-200/50 dark:border-zinc-900/50 pb-6 animate-fade-in">
                    {/* Collapsible Steps Trace */}
                    {Array.isArray(m.steps) && m.steps.length > 0 && (
                      <details className="group mb-3">
                        <summary className="flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-455 font-medium cursor-pointer hover:text-zinc-700 dark:hover:text-zinc-200 select-none">
                          <span className="transition-transform group-open:rotate-90">▸</span>
                          <span>Worked for a few seconds</span>
                        </summary>
                        <div className="mt-2 pl-3 space-y-1.5 border-l border-zinc-200 dark:border-zinc-800">
                          {m.steps.map((st: any, sidx: number) => (
                            <div key={sidx} className="flex items-center justify-between text-xs py-1">
                              <span className="font-mono text-zinc-550 dark:text-zinc-400 pr-4">{st.name}</span>
                              <span className="flex items-center gap-1 text-[10px] text-zinc-500">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> completed
                              </span>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}

                    {/* Agent Response Markdown */}
                    {(() => {
                      let displayContent = (m.content || '')
                        .replace(/<function\([\s\S]*?<\/function>/gi, '')
                        .replace(/<function\([\s\S]*$/gi, '')
                        .replace(/<\/function>/gi, '')
                        .trim();

                      // If displayContent is empty, check if m.content has embedded pseudo-function call
                      if (!displayContent && m.content && m.content.includes('<function(')) {
                        const match = m.content.match(/<function\(\w+\)\s*(\{[\s\S]*?\})\s*(?:<\/function>|$)/i) || m.content.match(/<function\(\w+\)([\s\S]*?)(?:<\/function>|$)/i);
                        if (match && match[1]) {
                          try {
                            const parsed = JSON.parse(match[1].trim());
                            if (parsed.planMarkdown) {
                              displayContent = parsed.planMarkdown;
                            } else if (typeof parsed === 'string') {
                              displayContent = parsed;
                            }
                          } catch {
                            displayContent = match[1].trim();
                          }
                        }
                      }

                      // Also check steps if displayContent is still empty
                      if (!displayContent && Array.isArray(m.steps)) {
                        const planStep = m.steps.find((st: any) => st.name === 'write_agent_plan');
                        if (planStep?.arguments?.planMarkdown) {
                          displayContent = planStep.arguments.planMarkdown;
                        }
                      }

                      if (displayContent) {
                        return (
                          <div className="text-sm text-zinc-750 dark:text-zinc-300 leading-relaxed font-sans">
                            {renderMarkdown(displayContent)}
                          </div>
                        );
                      }
                      if (Array.isArray(m.steps) && m.steps.length > 0) {
                        return (
                          <div className="text-xs text-zinc-400 dark:text-zinc-500 italic">
                            Action completed successfully. See workspace side panel for details.
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {/* Action Approval Card */}
                    {(() => {
                      const pendingStep = m.steps?.find((st: any) => st.status === 'pending_approval');
                      if (!pendingStep) return null;
                      return (
                        <div className="mt-3 p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 dark:bg-amber-500/10 dark:border-amber-500/20 space-y-3 max-w-lg shadow-sm">
                          <div className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5 select-none">
                            <AlertCircle size={14} className="text-amber-500 animate-pulse" />
                            Action Approval Required
                          </div>
                          <div className="text-xs text-zinc-700 dark:text-zinc-300">
                            Aurora requires authorization to execute a configuration mutation:
                            <div className="mt-2 p-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 rounded font-mono text-[10.5px] overflow-x-auto text-left">
                              <strong>Tool:</strong> {pendingStep.name}<br />
                              <strong>Arguments:</strong> {JSON.stringify(pendingStep.arguments, null, 2)}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              onClick={() => handleActionApproval('approve')}
                              disabled={loading}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center gap-1 shadow-sm disabled:opacity-50 cursor-pointer"
                            >
                              <CheckCircle2 size={13} /> Approve & Continue
                            </button>
                            <button
                              onClick={() => handleActionApproval('reject')}
                              disabled={loading}
                              className="px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 dark:hover:text-red-400 text-zinc-700 dark:text-zinc-300 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer border border-zinc-200 dark:border-zinc-700"
                            >
                              Reject Request
                            </button>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Interactive Query Visualizer (Table & Chart) */}
                    {m.steps && m.steps.filter((st: any) => 
                      ['execute_read_only_query', 'query_explain_and_assist'].includes(st.name) && 
                      st.result && 
                      (Array.isArray(st.result) || (st.result.dryRunResults && Array.isArray(st.result.dryRunResults)))
                    ).map((st: any, sidx: number) => {
                      const rawData = Array.isArray(st.result) ? st.result : st.result.dryRunResults;
                      return <QueryResultVisualizer key={sidx} result={rawData} />;
                    })}

                    {/* Dynamic Action Redirect Cards based on tool executions */}
                    {m.steps && m.steps.some((st: any) => 
                      ['create_or_update_module', 'create_or_update_automation', 'create_or_update_connector'].includes(st.name) && st.result && !st.result.error
                    ) && (
                      <div className="mt-3 p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/10 dark:bg-indigo-500/10 dark:border-indigo-500/20 space-y-2 max-w-md">
                        <div className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Sparkles size={11} className="animate-pulse" />
                          Aurora Platform Action
                        </div>
                        <div className="flex flex-col gap-1.5">
                          {m.steps.map((st: any, sidx: number) => {
                            if (st.name === 'create_or_update_module' && st.result && !st.result.error) {
                              const moduleName = st.arguments.name;
                              const moduleId = st.result.id;
                              const isPage = st.arguments.type === 'PAGE';
                              const builderPath = isPage 
                                ? `/workspace/settings/builder/page/${moduleId}` 
                                : `/workspace/settings/builder/${moduleId}`;
                              const viewPath = isPage 
                                ? `/workspace/pages/${slugify(moduleName)}` 
                                : `/workspace/modules/${slugify(moduleName)}`;
                              return (
                                <div key={sidx} className="flex flex-wrap items-center gap-2 text-xs">
                                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">Module: "{moduleName}"</span>
                                  <div className="flex items-center gap-2 ml-auto">
                                    <Link 
                                      to={builderPath}
                                      className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-sm flex items-center gap-1"
                                    >
                                      <Code size={11} /> Open in Builder
                                    </Link>
                                    <Link 
                                      to={viewPath}
                                      className="px-2.5 py-1 rounded bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-750 dark:text-zinc-300 font-bold transition-all shadow-sm"
                                    >
                                      View Page
                                    </Link>
                                  </div>
                                </div>
                              );
                            }
                            if (st.name === 'create_or_update_automation' && st.result && !st.result.error) {
                              const autoName = st.arguments.name;
                              return (
                                <div key={sidx} className="flex flex-wrap items-center gap-2 text-xs">
                                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">Automation: "{autoName}"</span>
                                  <Link 
                                    to="/workspace/settings/automations"
                                    className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-sm ml-auto flex items-center gap-1"
                                  >
                                    <Settings size={11} /> Configure Automations
                                  </Link>
                                </div>
                              );
                            }
                            if (st.name === 'create_or_update_connector' && st.result && !st.result.error) {
                              const connName = st.arguments.name;
                              return (
                                <div key={sidx} className="flex flex-wrap items-center gap-2 text-xs">
                                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">Connector: "{connName}"</span>
                                  <Link 
                                    to="/workspace/settings/integrations"
                                    className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-sm ml-auto flex items-center gap-1"
                                  >
                                    <Plug size={11} /> Configure Integrations
                                  </Link>
                                </div>
                              );
                            }
                            return null;
                          })}
                        </div>
                      </div>
                    )}

                    {/* Actions and feedback links */}
                    <div className="flex items-center justify-between mt-4 pt-2 text-[11px] text-zinc-450 dark:text-zinc-500">
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(m.content);
                            toast.success("Response copied to clipboard");
                          }}
                          className="hover:text-zinc-755 dark:hover:text-zinc-350 flex items-center gap-1.5"
                        >
                          <Copy className="h-3.5 w-3.5" /> Copy
                        </button>
                        <button className="hover:text-zinc-755 dark:hover:text-zinc-350">👍</button>
                        <button className="hover:text-zinc-755 dark:hover:text-zinc-350">👎</button>
                      </div>
                      <span className="font-mono text-[9px]">
                        {m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Streaming Assistant reply */}
              {streamingText && (
                <div className="w-full space-y-3 py-2 border-b border-zinc-250/20 dark:border-zinc-800/30 pb-6">
                  <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-450 font-medium select-none">
                    <Loader2 className="h-3 w-3 animate-spin text-indigo-500" />
                    <span>Streaming response...</span>
                  </div>
                  <div className="text-sm text-zinc-750 dark:text-zinc-300 leading-relaxed font-sans">
                    {renderMarkdown(streamingText)}
                  </div>
                </div>
              )}

              {/* Active agent streaming logs */}
              {loading && (agentThought || agentTrace.length > 0) && (
                <div className="w-full space-y-3 py-2">
                  <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-450">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-500 dark:text-indigo-400" />
                    <span>{agentThought || 'Executing steps...'}</span>
                  </div>
                  
                  {agentTrace.length > 0 && (
                    <div className="pl-3.5 space-y-1 border-l border-zinc-205 dark:border-zinc-800">
                      {agentTrace.map((t, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs py-1">
                          <span className="font-mono text-zinc-500 dark:text-zinc-400 pr-4">{t.name}</span>
                          <span className="flex items-center gap-1.5 text-[10px] text-zinc-550">
                            {t.status === 'running' ? (
                              <>
                                <Loader2 className="h-3 w-3 animate-spin text-indigo-500 dark:text-indigo-400" /> running...
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> completed
                              </>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input Area: Centered, floating card box like Antigravity */}
        <div className="p-4 bg-transparent flex flex-col items-center justify-center w-full z-20 relative shrink-0">
          <div className="w-full max-w-3xl bg-white/90 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-3 shadow-xl backdrop-blur-xl flex flex-col gap-2.5">
            {/* Live steps running indicators inside input card */}
            {loading && (
              <div className="border-b border-zinc-200/50 dark:border-zinc-800/40 pb-2 mb-1">
                <div className="flex items-center gap-1.5 text-[11px] text-zinc-550 dark:text-zinc-400 font-semibold">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-500" /> Co-Pilot Pipeline Running...
                </div>
              </div>
            )}

            {/* Suggestions Popover */}
            {showSuggestions && getSuggestions().length > 0 && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl p-1.5 z-50 max-h-52 overflow-y-auto animate-fade-in flex flex-col gap-0.5">
                {getSuggestions().map((item, idx) => (
                  <div
                    key={item.name}
                    onClick={() => handleSelectSuggestion(item)}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-xs transition-all ${
                      idx === selectedSuggestionIdx
                        ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold'
                        : 'text-zinc-650 dark:text-zinc-400 hover:bg-zinc-55 dark:hover:bg-white/5'
                    }`}
                  >
                    <span className="font-mono">{item.name}</span>
                    <span className="text-[10px] text-zinc-450 dark:text-zinc-550">{item.desc}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Attachments Preview Row */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 pb-2 mb-1 border-b border-zinc-200/50 dark:border-zinc-800/40">
                {attachments.map((file, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 px-2.5 py-1 rounded-lg text-xs text-zinc-700 dark:text-zinc-300">
                    {file.type.startsWith('image/') ? (
                      <img src={`data:${file.type};base64,${file.base64}`} alt="preview" className="h-5 w-5 rounded object-cover" />
                    ) : (
                      <FileText className="h-4 w-4 text-indigo-500" />
                    )}
                    <span className="truncate max-w-[120px] font-medium">{file.name}</span>
                    <button
                      onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                      className="text-zinc-450 dark:text-zinc-550 hover:text-red-500 transition-all font-bold ml-1"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Hidden File Input */}
            <input 
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              multiple
              accept="image/*,text/*,application/json,text/csv"
              className="hidden"
            />

            {/* Expanding Textarea */}
            <textarea 
              ref={textareaRef}
              rows={1}
              value={inputMessage}
              onChange={handleTextareaChange}
              onKeyDown={(e) => {
                if (showSuggestions) {
                  const suggestionsList = getSuggestions();
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setSelectedSuggestionIdx(prev => (prev + 1) % Math.max(1, suggestionsList.length));
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setSelectedSuggestionIdx(prev => (prev - 1 + suggestionsList.length) % Math.max(1, suggestionsList.length));
                  } else if (e.key === 'Enter' || e.key === 'Tab') {
                    e.preventDefault();
                    if (suggestionsList[selectedSuggestionIdx]) {
                      handleSelectSuggestion(suggestionsList[selectedSuggestionIdx]);
                    }
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    setShowSuggestions(false);
                  }
                } else {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }
              }}
              disabled={loading}
              placeholder="Ask anything, @ to mention, / for actions"
              className="w-full bg-transparent border-none outline-none resize-none text-sm text-zinc-800 dark:text-zinc-200 placeholder-zinc-500 py-1 scrollbar-none"
              style={{ minHeight: '24px', maxHeight: '180px' }}
            />

            {/* Bottom Toolbar inside card */}
            <div className="flex items-center justify-between border-t border-zinc-200 dark:border-zinc-800/60 pt-2.5 mt-1">
              <div className="flex items-center gap-2">
                <button className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 transition-all">
                  <Plus className="h-4 w-4" />
                </button>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 transition-all"
                  title="Attach file or image"
                >
                  <Paperclip className="h-4 w-4" />
                </button>

                {/* Single Consolidated Model & Tier Selector Dropdown */}
                <div className="relative" ref={modelMenuRef}>
                  <button 
                    onClick={() => setShowModelMenu(!showModelMenu)}
                    className="flex items-center gap-1.5 px-3 py-1 text-[11px] bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-lg transition-all font-bold shadow-sm"
                  >
                    <Sparkles className="h-3 w-3 text-indigo-500" />
                    <span>
                      {modelName === 'default' ? 'Default (Gemini 2.0 Flash)' : 
                       modelName === 'low' ? 'Low Tier (Fast)' : 
                       modelName === 'medium' ? 'Medium Tier (Balanced)' : 
                       modelName === 'high' ? 'High Tier (Pro)' : modelName}
                    </span>
                    <span className="text-[8px] text-zinc-400">▲</span>
                  </button>
                  {showModelMenu && (
                    <div className="absolute bottom-full left-0 mb-2 w-72 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl p-2 z-50 space-y-2.5">
                      {/* Platform Default Section */}
                      <div>
                        <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider px-2.5 py-1">Platform Default Model</div>
                        <button
                          onClick={() => handleSelectModel('default')}
                          className={cn(
                            "w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-semibold transition-all text-left border",
                            modelName === 'default'
                              ? "bg-indigo-50 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-300"
                              : "bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200/60 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-indigo-500 shrink-0" />
                            <div>
                              <div className="font-bold flex items-center gap-1.5">
                                Gemini 2.0 Flash
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300 font-extrabold uppercase">Free Default</span>
                              </div>
                              <div className="text-[9.5px] text-zinc-400 font-normal">Built-in Aurora platform default</div>
                            </div>
                          </div>
                          {modelName === 'default' && <Check className="h-4 w-4 text-indigo-500 shrink-0" />}
                        </button>
                      </div>

                      {/* Presets */}
                      <div className="border-t border-zinc-100 dark:border-zinc-800/80 pt-2">
                        <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider px-2.5 py-1">Preset Capability Tiers</div>
                        <div className="space-y-0.5">
                          {[
                            { id: 'low', label: 'Low (Fast / Budget)', icon: Zap, color: 'text-green-500' },
                            { id: 'medium', label: 'Medium (Balanced Workhorse)', icon: Cpu, color: 'text-blue-500' },
                            { id: 'high', label: 'High (Pro Reasoning)', icon: Sparkles, color: 'text-purple-500' },
                          ].map(t => (
                            <button
                              key={t.id}
                              onClick={() => handleSelectModel(t.id)}
                              className={cn(
                                "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all text-left",
                                modelName === t.id
                                  ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-300"
                                  : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                              )}
                            >
                              <span className="flex items-center gap-2">
                                <t.icon className={cn("h-3.5 w-3.5", t.color)} />
                                {t.label}
                              </span>
                              {modelName === t.id && <Check className="h-3.5 w-3.5 text-indigo-500" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={toggleVoiceListen}
                  className={`p-1.5 rounded-lg transition-all ${
                    isListening 
                      ? 'bg-red-500/20 text-red-400 animate-pulse' 
                      : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-650 dark:hover:text-zinc-300'
                  }`}
                  title="Voice Input"
                >
                  {isListening ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                </button>

                {loading ? (
                  <button 
                    onClick={handleStopGeneration}
                    className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all shadow flex items-center gap-1.5 text-[11px] font-bold animate-pulse cursor-pointer"
                    title="Stop response generation"
                  >
                    <Square className="h-3 w-3 fill-current" />
                    <span>Stop</span>
                  </button>
                ) : (
                  <button 
                    onClick={sendMessage}
                    disabled={!inputMessage.trim()}
                    className="p-1.5 bg-indigo-650 hover:bg-indigo-600 disabled:bg-zinc-100 dark:disabled:bg-zinc-800 disabled:text-zinc-400 text-white rounded-lg transition-all shadow flex items-center justify-center cursor-pointer"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Right Panel: Artifacts & Previews */}
      {showRightPanel && (
        <div className="w-[500px] bg-white/70 dark:bg-zinc-900/60 border-l border-zinc-200/50 dark:border-zinc-800/40 backdrop-blur-xl flex flex-col flex-shrink-0 overflow-hidden">
        {/* Tabs header */}
        <div className="flex border-b border-zinc-200/50 dark:border-zinc-800/40 bg-zinc-50/50 dark:bg-zinc-950/40 p-1 flex-shrink-0 overflow-x-auto">
          {[
            { id: 'plan', label: 'Plan', icon: FileText },
            { id: 'tasks', label: 'Tasks', icon: CheckSquare },
            { id: 'sql', label: 'SQL Runner', icon: Table },
            { id: 'preview', label: 'Form Preview', icon: Layout },
            { id: 'scratchpad', label: 'Scratchpad', icon: Code },
            { id: 'explorer', label: 'Explorer', icon: Compass }
          ].map(t => (
            <button 
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center gap-1.5 px-3 py-2 text-[10.5px] font-medium border-b-2 transition-all ${
                activeTab === t.id 
                  ? 'border-indigo-500 dark:border-indigo-400 text-indigo-650 dark:text-white bg-zinc-100 dark:bg-zinc-900 rounded-t-lg font-semibold' 
                  : 'border-transparent text-zinc-550 dark:text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <t.icon className="h-3.5 w-3.5" />
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-5 scrollbar-thin">
          
          {/* PLAN */}
          {activeTab === 'plan' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800/80 pb-2 mb-2">
                <span className="font-semibold text-xs tracking-wide">Implementation Plan</span>
                <span className="text-[10px] text-zinc-500 font-mono">plan.md</span>
              </div>
              <div className="bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800/80 rounded-xl p-5 text-xs leading-relaxed font-sans shadow-inner overflow-y-auto max-h-[60vh]">
                {renderMarkdown(activeSession?.metadata?.plan || '')}
              </div>
            </div>
          )}

          {/* TASKS */}
          {activeTab === 'tasks' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800/80 pb-2 mb-2">
                <span className="font-semibold text-xs tracking-wide">Tasks Checklist</span>
                <span className="text-[10px] text-zinc-500 font-mono">task.md</span>
              </div>
              {getActiveTasks().length === 0 ? (
                <div className="p-4 text-center text-xs text-zinc-500">No tasks generated. Create a plan first.</div>
              ) : (
                <div className="space-y-2">
                  {getActiveTasks().map((task: string, idx: number) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-950/20 border border-zinc-200 dark:border-zinc-800/80 rounded-xl">
                      <input 
                        type="checkbox" 
                        defaultChecked={false}
                        className="h-4.5 w-4.5 rounded border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-indigo-650 focus:ring-0 focus:ring-offset-0" 
                      />
                      <span className="text-xs text-zinc-755 dark:text-zinc-300">{task}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SQL RUNNER */}
          {activeTab === 'sql' && (
            <div className="space-y-4 flex flex-col h-full">
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800/80 pb-2">
                <span className="font-semibold text-xs tracking-wide">Data Query Runner</span>
                <button 
                  onClick={handleExecuteSQL}
                  disabled={sqlLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-200 dark:disabled:bg-zinc-800 disabled:text-zinc-450 dark:disabled:text-zinc-500 text-white rounded-lg text-[10.5px] transition-all font-semibold shadow-sm"
                >
                  {sqlLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3 w-3" />} Execute
                </button>
              </div>
              
              <textarea 
                value={sqlQuery}
                onChange={(e) => setSqlQuery(e.target.value)}
                className="w-full h-32 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 font-mono text-[10.5px] focus:outline-none focus:border-zinc-350 dark:focus:border-zinc-700 text-indigo-650 dark:text-indigo-400"
              />

              {sqlError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-xl text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  <span>{sqlError}</span>
                </div>
              )}

              {/* SQL Output table */}
              <div className="flex-1 min-h-[200px] overflow-auto border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-950/40">
                {sqlResults.length === 0 ? (
                  <div className="p-8 text-center text-xs text-zinc-500">Run query to view results.</div>
                ) : (
                  <table className="w-full text-left border-collapse text-[10.5px]">
                    <thead>
                      <tr className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-450">
                        {Object.keys(sqlResults[0]).map((key, i) => (
                          <th key={i} className="p-2.5 font-medium">{key}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/55">
                      {sqlResults.map((row, idx) => (
                        <tr key={idx} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/20">
                          {Object.values(row).map((val: any, i) => (
                            <td key={i} className="p-2.5 font-mono text-zinc-700 dark:text-zinc-300 max-w-[200px] truncate">
                              {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* FORM PREVIEW */}
          {activeTab === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800/80 pb-2 mb-2">
                <span className="font-semibold text-xs tracking-wide">Interactive Form Preview</span>
                <span className="text-[10px] text-zinc-500 font-mono">Form Builder</span>
              </div>
              <div className="p-4 bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800/80 rounded-xl space-y-4">
                {explorerData.modules.length === 0 ? (
                  <div className="text-center text-xs text-zinc-500">Create a dynamic module to preview.</div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-2">Select Module Form to render:</div>
                    <select className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-zinc-350 dark:focus:border-zinc-700">
                      {explorerData.modules.map((m: any) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>

                    <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex flex-col gap-3.5">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10.5px] text-zinc-500 dark:text-zinc-400">Full Name</label>
                        <input type="text" placeholder="John Doe" className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2 text-xs text-zinc-800 dark:text-zinc-100" />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10.5px] text-zinc-500 dark:text-zinc-400">Email Address</label>
                        <input type="email" placeholder="john@example.com" className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2 text-xs text-zinc-800 dark:text-zinc-100" />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10.5px] text-zinc-500 dark:text-zinc-400">Description</label>
                        <textarea placeholder="Enter details..." className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2 text-xs h-20 text-zinc-800 dark:text-zinc-100" />
                      </div>
                      <button className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow">
                        Test Submission
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SCRATCHPAD */}
          {activeTab === 'scratchpad' && (
            <div className="space-y-4 flex flex-col h-full">
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800/80 pb-2">
                <span className="font-semibold text-xs tracking-wide">Developer Scratchpad Script</span>
                <button 
                  onClick={handleRunScratchScript}
                  disabled={scratchLoading || !sessionId}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-200 dark:disabled:bg-zinc-800 disabled:text-zinc-450 dark:disabled:text-zinc-500 text-white rounded-lg text-[10.5px] transition-all font-semibold shadow-sm"
                >
                  {scratchLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3 w-3" />} Run Script
                </button>
              </div>

              <textarea 
                value={scratchCode}
                onChange={(e) => setScratchCode(e.target.value)}
                className="w-full h-44 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 font-mono text-[10.5px] focus:outline-none focus:border-zinc-350 dark:focus:border-zinc-700 text-emerald-650 dark:text-emerald-400"
              />

              <div className="flex-1 min-h-[150px] bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 overflow-auto">
                <div className="text-[10px] text-zinc-550 dark:text-zinc-500 border-b border-zinc-200 dark:border-zinc-800 pb-1 mb-2 font-mono flex items-center gap-1.5">
                  <Terminal className="h-3 w-3" /> Console Output stdout/stderr
                </div>
                <pre className="font-mono text-[10px] text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">{scratchOutput || '(no script output yet)'}</pre>
              </div>
            </div>
          )}

          {/* EXPLORER */}
          {activeTab === 'explorer' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800/80 pb-2 mb-2">
                <span className="font-semibold text-xs tracking-wide">Workspace Object Explorer</span>
                <span className="text-[10px] text-zinc-500 font-mono">Schema Tree</span>
              </div>
              <div className="space-y-4">
                
                {/* Modules */}
                <div>
                  <div className="flex items-center gap-1.5 text-zinc-550 dark:text-zinc-400 font-semibold text-[10.5px] mb-2">
                    <Layers className="h-4 w-4 text-blue-500 dark:text-blue-400" /> Dynamic Database Modules ({explorerData.modules.length})
                  </div>
                  <div className="pl-4 space-y-1.5">
                    {explorerData.modules.map((m: any) => (
                      <div key={m.id} className="flex items-center justify-between text-xs p-2 bg-zinc-50 dark:bg-zinc-950/20 border border-zinc-200 dark:border-zinc-950 rounded-lg">
                        <span className="text-zinc-700 dark:text-zinc-300 font-mono flex items-center gap-1.5">
                          <Table className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" /> {m.name}
                        </span>
                        <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 font-mono">{m.type}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Automations */}
                <div>
                  <div className="flex items-center gap-1.5 text-zinc-550 dark:text-zinc-400 font-semibold text-[10.5px] mb-2">
                    <Globe className="h-4 w-4 text-amber-500 dark:text-amber-400" /> Workflow Automations ({explorerData.automations.length})
                  </div>
                  <div className="pl-4 space-y-1.5">
                    {explorerData.automations.map((a: any) => (
                      <div key={a.id} className="flex items-center justify-between text-xs p-2 bg-zinc-50 dark:bg-zinc-950/20 border border-zinc-200 dark:border-zinc-950 rounded-lg">
                        <span className="text-zinc-700 dark:text-zinc-300 font-mono flex items-center gap-1.5">
                          <Bot className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" /> {a.name}
                        </span>
                        <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 font-mono">Active</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Connectors */}
                <div>
                  <div className="flex items-center gap-1.5 text-zinc-550 dark:text-zinc-400 font-semibold text-[10.5px] mb-2">
                    <Plug className="h-4 w-4 text-indigo-500 dark:text-indigo-400" /> API Integration Connectors ({explorerData.connectors.length})
                  </div>
                  <div className="pl-4 space-y-1.5">
                    {explorerData.connectors.map((c: any) => (
                      <div key={c.id} className="flex items-center justify-between text-xs p-2 bg-zinc-50 dark:bg-zinc-950/20 border border-zinc-200 dark:border-zinc-950 rounded-lg">
                        <span className="text-zinc-700 dark:text-zinc-300 font-mono flex items-center gap-1.5">
                          <Code className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" /> {c.displayName}
                        </span>
                        <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 font-mono">Linked</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>
      </div>
      )}
      
      <DeleteConfirmationModal
        isOpen={deleteSessionId !== null}
        onClose={() => setDeleteSessionId(null)}
        onConfirm={confirmDeleteSession}
        title="Delete Conversation"
        description="Are you sure you want to delete this session? All message history will be permanently lost."
      />

      {showQuickKeyModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-amber-500">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">Free Tier Traffic Limit Reached</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">The shared fallback demo key reached Google's 10 req/min limit.</p>
              </div>
            </div>

            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/60 rounded-xl text-xs space-y-1">
              <div className="font-bold text-indigo-700 dark:text-indigo-300">Get your personal 100% Free Key (15 RPM):</div>
              <p className="text-zinc-600 dark:text-zinc-400">
                Generate a free key instantly at <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="underline font-semibold text-indigo-600 dark:text-indigo-400">aistudio.google.com/apikey</a> (no credit card required).
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Paste Your Google AI API Key</label>
              <input 
                type="password"
                placeholder="AIzaSy..."
                value={quickApiKey}
                onChange={(e) => setQuickApiKey(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowQuickKeyModal(false)}
                className="px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all"
              >
                Dismiss
              </button>
              <button
                onClick={handleSaveQuickKey}
                disabled={!quickApiKey.trim() || savingQuickKey}
                className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl shadow-md transition-all flex items-center gap-1.5"
              >
                {savingQuickKey ? 'Saving...' : 'Save & Bypass Limit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Premium Aurora Create Folder Modal */}
      {createPortal(
        <AnimatePresence>
          {isCreatingFolder && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsCreatingFolder(false)}
                className="absolute inset-0 bg-white/60 dark:bg-black/65 backdrop-blur-md"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="relative w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 rounded-3xl shadow-2xl overflow-hidden z-10"
              >
                {/* Header */}
                <div className="p-5 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-xl">
                      <FolderPlus size={20} />
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-zinc-900 dark:text-white">Create New Folder</h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">Organize your co-pilot conversations</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsCreatingFolder(false)}
                    className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Form Body */}
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
                      Folder Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Sales Automations, Finance, Marketing..."
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCreateFolder();
                        if (e.key === 'Escape') setIsCreatingFolder(false);
                      }}
                      autoFocus
                      className="w-full px-4 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                    />
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 bg-zinc-50/80 dark:bg-zinc-900/80 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-end gap-2">
                  <button
                    onClick={() => setIsCreatingFolder(false)}
                    className="px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/50 dark:hover:bg-zinc-800 rounded-xl transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateFolder}
                    disabled={!newFolderName.trim()}
                    className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-xl transition-all shadow-md shadow-indigo-500/20 cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus size={14} /> Create Folder
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
      
      </div>
    </div>
  );
};
