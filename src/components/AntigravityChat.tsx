import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { cn, slugify } from '../lib/utils';
import { motion } from 'motion/react';
import { io, Socket } from 'socket.io-client';
import { Navbar } from './Navigation/Navbar';
import { 
  Sparkles, Bot, Terminal, Play, CheckCircle2, AlertCircle, 
  Loader2, Trash2, Send, Mic, MicOff, Plus, FileText, CheckSquare, 
  Copy, Table, Compass, Layers, 
  Code, Globe, Plug, Paperclip, ChevronDown, 
  Layout, GitBranch,
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
  const location = useLocation();
  let lastPlatformPath = localStorage.getItem('lastPlatformPath') || '/workspace';
  if (lastPlatformPath.includes('/settings')) {
    lastPlatformPath = '/workspace';
  }
  const { tenant } = usePlatform();
  const { session: authSession } = useAuth();
  
  // State
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
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
  
  // Real-time telemetry

  // Streaming thought trace
  const [agentTrace, setAgentTrace] = useState<any[]>([]);
  const [agentThought, setAgentThought] = useState<string | null>(null);

  // Right Panel State
  const [activeTab, setActiveTab] = useState<'plan' | 'tasks' | 'sql' | 'preview' | 'scratchpad' | 'explorer'>('plan');
  const [showRightPanel, setShowRightPanel] = useState(false);
  const [modelName, setModelName] = useState('Gemini 2.5 Flash Lite');
  const [showModelMenu, setShowModelMenu] = useState(false);

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
    if (!tenant?.id) return;
    fetchSessions();
    loadWorkspaceSchema();
  }, [tenant?.id]);

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
    if (sessionId) {
      loadSession(sessionId);
    } else {
      setMessages([]);
      setActiveSession(null);
      setAgentTrace([]);
    }
  }, [sessionId]);

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
    try {
      const token = authSession?.access_token;
      const res = await fetch(`${API_BASE_URL}/sessions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant!.id
        }
      });
      if (!res.ok) throw new Error("Failed to fetch sessions");
      const data = await res.json();
      setSessions(data);
    } catch (error) {
      console.error(error);
    }
  };

  const loadSession = async (id: string) => {
    try {
      const token = authSession?.access_token;
      const res = await fetch(`${API_BASE_URL}/sessions/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant!.id
        }
      });
      if (!res.ok) throw new Error("Failed to load session");
      const data = await res.json();
      setActiveSession(data);
      setMessages(data.messages);
      setAgentTrace([]);
      setAgentThought(null);
    } catch (error) {
      toast.error("Failed to load conversation history.");
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
    if (!inputMessage.trim() || !sessionId) return;
    
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
      const token = authSession?.access_token;
      const res = await fetch(`${API_BASE_URL}/sessions/${sessionId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant!.id
        },
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
      loadSession(sessionId);

    } catch (error: any) {
      toast.error(error?.message || "Agent loop failed to complete.");
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
    return (
      <div className="space-y-3 font-sans">
        {lines.map((line, idx) => {
          const trimmed = line.trim();

          // Headers
          if (trimmed.startsWith('# ')) {
            return (
              <h1 key={idx} className="text-lg font-bold text-zinc-800 dark:text-zinc-200 mt-4 mb-2 pb-1 border-b border-zinc-200/60 dark:border-zinc-800/80">
                {trimmed.replace('# ', '')}
              </h1>
            );
          }
          if (trimmed.startsWith('## ')) {
            return (
              <h2 key={idx} className="text-base font-semibold text-zinc-700 dark:text-zinc-200 mt-3 mb-1.5">
                {trimmed.replace('## ', '')}
              </h2>
            );
          }
          if (trimmed.startsWith('### ')) {
            return (
              <h3 key={idx} className="text-sm font-semibold text-zinc-600 dark:text-zinc-350 mt-2.5 mb-1">
                {trimmed.replace('### ', '')}
              </h3>
            );
          }

          // Lists
          if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            const content = trimmed.substring(2);
            return (
              <ul key={idx} className="list-disc pl-5 my-0.5 text-sm text-zinc-650 dark:text-zinc-400">
                <li>{parseInlineFormatting(content)}</li>
              </ul>
            );
          }

          // Horizontal Rule
          if (trimmed === '---') {
            return <hr key={idx} className="my-3 border-t border-zinc-200 dark:border-zinc-800" />;
          }

          // Empty line
          if (!trimmed) {
            return <div key={idx} className="h-1" />;
          }

          // Normal paragraph
          return (
            <p key={idx} className="text-sm leading-relaxed text-zinc-650 dark:text-zinc-400 my-1 text-justify">
              {parseInlineFormatting(trimmed)}
            </p>
          );
        })}
      </div>
    );
  };

  const parseInlineFormatting = (str: string) => {
    const parts = str.split(/(\*\*.*?\*\*|`.*?`)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-semibold text-zinc-800 dark:text-white">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={i} className="bg-zinc-100 dark:bg-zinc-800/80 px-1 py-0.5 rounded text-xs font-mono text-indigo-650 dark:text-indigo-400 border border-zinc-200/50 dark:border-zinc-700/50">
            {part.slice(1, -1)}
          </code>
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

  const getGroupedSessions = (sessionList: ChatSession[]) => {
    const today: ChatSession[] = [];
    const yesterday: ChatSession[] = [];
    const lastWeek: ChatSession[] = [];
    const older: ChatSession[] = [];

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
    const weekStart = todayStart - 7 * 24 * 60 * 60 * 1000;

    sessionList.forEach(s => {
      const createdTime = new Date(s.createdAt).getTime();
      if (createdTime >= todayStart) {
        today.push(s);
      } else if (createdTime >= yesterdayStart) {
        yesterday.push(s);
      } else if (createdTime >= weekStart) {
        lastWeek.push(s);
      } else {
        older.push(s);
      }
    });

    return { today, yesterday, lastWeek, older };
  };

  const filteredSessions = sessions.filter(s =>
    (s.title || '').toLowerCase().includes(sessionSearch.toLowerCase())
  );
  const groupedSessions = getGroupedSessions(filteredSessions);

  const renderSessionItem = (s: ChatSession) => (
    <div 
      key={s.id}
      onClick={() => navigate(`/workspace/aurora-vibe/${s.id}`)}
      className={`group w-full flex items-center gap-3 px-3 py-1.5 rounded-lg cursor-pointer transition-all border ${
        s.id === sessionId 
          ? 'bg-zinc-100 dark:bg-white/10 border-zinc-200/50 dark:border-zinc-800/40 shadow-sm text-zinc-900 dark:text-white font-semibold' 
          : 'bg-transparent border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100/50 dark:hover:bg-white/5'
      }`}
    >
      <MessageSquare size={18} className={cn("shrink-0", s.id === sessionId ? "text-indigo-600 dark:text-white" : "text-zinc-400 dark:text-zinc-550")} />
      <span className="text-sm font-medium flex-1 text-left truncate">{s.title || 'Untitled Session'}</span>
      <button 
        onClick={(e) => deleteSession(s.id, e)}
        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 dark:text-zinc-555 hover:text-red-500 transition-all flex-shrink-0"
        title="Delete Session"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );

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
            <div className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em] mb-4 px-3 flex items-center gap-2 select-none">
              <div className="w-1 h-1 bg-indigo-500 rounded-full animate-pulse" />
              Pinned Conversations
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-650 px-3 italic pl-6">No pinned conversations yet</div>
          </div>

          {/* Projects Folder Structure */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em] px-3 select-none">
              <div className="flex items-center gap-2">
                <div className="w-1 h-1 bg-indigo-500 rounded-full animate-pulse" />
                <span>Projects</span>
              </div>
              <ChevronDown className="h-3.5 w-3.5" />
            </div>
            
            <div className="pl-3 space-y-1">
              <div className="flex items-center gap-3 px-3 py-2 text-sm font-bold text-zinc-700 dark:text-zinc-300 select-none">
                <Folder size={18} className="shrink-0 text-indigo-500 dark:text-indigo-400" />
                <span>aurora</span>
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

              <div className="pl-6 space-y-3">
                {filteredSessions.length === 0 ? (
                  <div className="p-2 text-xs text-zinc-500 dark:text-zinc-650 italic">No conversations</div>
                ) : (
                  <>
                    {groupedSessions.today.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider px-3 select-none">Today</div>
                        {groupedSessions.today.map(renderSessionItem)}
                      </div>
                    )}
                    {groupedSessions.yesterday.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider px-3 select-none">Yesterday</div>
                        {groupedSessions.yesterday.map(renderSessionItem)}
                      </div>
                    )}
                    {groupedSessions.lastWeek.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider px-3 select-none">Last 7 Days</div>
                        {groupedSessions.lastWeek.map(renderSessionItem)}
                      </div>
                    )}
                    {groupedSessions.older.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider px-3 select-none">Older</div>
                        {groupedSessions.older.map(renderSessionItem)}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

        </div>
        
        {/* Footer info */}
        <div className="p-3 border-t border-zinc-200/50 dark:border-zinc-800/40 bg-zinc-50/50 dark:bg-zinc-900/30 text-[10px] text-zinc-550 dark:text-zinc-500 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Settings className="h-4 w-4 text-zinc-400 dark:text-zinc-550 hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer" />
            <span className="truncate max-w-[120px]">{tenant?.name || 'Local Dev'}</span>
          </div>
          <span className="text-emerald-500 font-medium flex items-center gap-1 shrink-0">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Co-Pilot Live
          </span>
        </div>
      </div>

      {/* 2. Middle Panel: Chat Window */}
      <div className="flex-1 flex flex-col min-w-0 bg-transparent border-r border-zinc-200/50 dark:border-zinc-800/40">
        {/* Top Header telemetry */}
        <div className="h-12 border-b border-zinc-200/50 dark:border-zinc-800/40 px-6 flex items-center justify-between flex-shrink-0 bg-white/70 dark:bg-zinc-950/50 backdrop-blur-xl z-10">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-xs text-zinc-800 dark:text-zinc-200">
              {activeSession ? activeSession.title : 'Aurora'}
            </span>
            {activeSession && (
              <button 
                onClick={handleForkSession}
                className="flex items-center gap-1 px-2 py-1 text-[10px] bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-all shadow-sm"
              >
                <GitBranch className="h-3 w-3" /> Fork
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
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
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto p-4 space-y-4">
              <div className="h-16 w-16 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center shadow-sm">
                <Bot className="h-8 w-8 text-indigo-500 dark:text-indigo-400" />
              </div>
              <div>
                <h3 className="font-semibold text-zinc-800 dark:text-zinc-200">Aurora Unified Builder & Chat</h3>
                <p className="text-xs text-zinc-550 dark:text-zinc-400 mt-1 leading-relaxed">
                  Enter commands to configure forms, inspect workspace components, lookup APIs, or query database records. 
                  Try saying: *"I want to create a lookup to the Australian Business Register API"* or *"Find the 10 most viable open leads."*
                </p>
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
                    {m.steps && m.steps.length > 0 && (
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
                    <div className="text-sm text-zinc-750 dark:text-zinc-300 leading-relaxed font-sans">
                      {renderMarkdown(m.content)}
                    </div>

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
              disabled={loading || !sessionId}
              placeholder={sessionId ? "Ask anything, @ to mention, / for actions" : "Select or start a chat session in the sidebar..."}
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

                {/* Model selector dropdown */}
                <div className="relative">
                  <button 
                    onClick={() => setShowModelMenu(!showModelMenu)}
                    className="flex items-center gap-1 px-2.5 py-1 text-[10.5px] bg-zinc-100 dark:bg-zinc-800/65 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-750 text-zinc-650 dark:text-zinc-350 rounded-lg transition-all font-semibold shadow-sm"
                  >
                    <span>{modelName}</span>
                    <span className="text-[7.5px] text-zinc-400">▲</span>
                  </button>
                  {showModelMenu && (
                    <div className="absolute bottom-full left-0 mb-1 w-44 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl py-1.5 z-50">
                      {['Gemini 2.5 Flash Lite', 'Gemini 2.5 Flash', 'Gemini 2.5 Pro'].map(m => (
                        <button
                          key={m}
                          onClick={() => {
                            setModelName(m);
                            setShowModelMenu(false);
                          }}
                          className="w-full text-left px-3 py-1.5 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-55 dark:hover:bg-zinc-800 transition-all"
                        >
                          {m}
                        </button>
                      ))}
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

                <button 
                  onClick={sendMessage}
                  disabled={loading || !inputMessage.trim() || !sessionId}
                  className="p-1.5 bg-indigo-650 hover:bg-indigo-600 disabled:bg-zinc-100 dark:disabled:bg-zinc-800 disabled:text-zinc-400 text-white rounded-lg transition-all shadow flex items-center justify-center"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
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
      
      </div>
    </div>
  );
};
