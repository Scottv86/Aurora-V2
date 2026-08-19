import React, { useState, useRef } from 'react';
import { 
  BookOpen, 
  Wrench, 
  ShieldAlert, 
  Trash2, 
  FileText, 
  UploadCloud, 
  Search, 
  Database, 
  GitFork, 
  CreditCard, 
  MessageSquare, 
  Users, 
  Lock, 
  ShieldCheck, 
  Globe, 
  HardDrive, 
  BarChart2, 
  Plus, 
  Link2,
  FileCheck,
  Image as ImageIcon,
  FileCode,
  CheckCircle2,
  Bot,
  Zap,
  ListOrdered,
  Brain,
  Bookmark
} from 'lucide-react';
import { AgentBlueprint, AgentGuardrails, AgentToolBinding, AgentMemoryEntry, AgentMemoryConfig } from '../../../types/agent';
import { ContextSource } from '../../../types/solutions';
import { AddContextSourceModal } from '../../Modals/AddContextSourceModal';
import { AddCustomToolModal } from '../../Modals/AddCustomToolModal';
import { useUsers } from '../../../hooks/useUsers';
import { toast } from 'sonner';

export interface AgentKnowledgePanelProps {
  blueprint: AgentBlueprint;
  onChange: (updated: Partial<AgentBlueprint>) => void;
  onToggleCollapse?: () => void;
}

export const AgentKnowledgePanel: React.FC<AgentKnowledgePanelProps> = ({
  blueprint,
  onChange,
  onToggleCollapse
}) => {
  const [activeTab, setActiveTab] = useState<'knowledge' | 'tools' | 'memory' | 'guardrails' | 'autopilot'>('knowledge');
  const [toolSearch, setToolSearch] = useState('');
  const [memorySearch, setMemorySearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCustomToolModalOpen, setIsCustomToolModalOpen] = useState(false);
  const [isNewMemoryOpen, setIsNewMemoryOpen] = useState(false);
  const [newMemKey, setNewMemKey] = useState('');
  const [newMemVal, setNewMemVal] = useState('');
  const [newMemCategory, setNewMemCategory] = useState<'PREFERENCE' | 'FACT' | 'ACCOUNT_STATE'>('PREFERENCE');
  const [newMemUser, setNewMemUser] = useState('Alex Mercer');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { members } = useUsers();

  const memory: AgentMemoryConfig = blueprint.memory || {
    enabled: true,
    memoryType: 'FULL_HYBRID',
    retentionDays: 90,
    autoExtractEntities: true,
    maxMemoriesInjected: 5,
    entries: []
  };

  // File upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newSources: ContextSource[] = Array.from(files).map((file, i) => {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      let type: ContextSource['type'] = 'other';
      if (ext === 'docx' || ext === 'doc') type = 'docx';
      else if (ext === 'pdf') type = 'pdf';
      else if (ext === 'png' || ext === 'jpg' || ext === 'jpeg') type = 'png';
      else if (ext === 'txt' || ext === 'md') type = 'txt';
      else if (ext === 'json') type = 'json';

      return {
        id: `src_${Date.now()}_${i}`,
        name: file.name,
        type,
        size: `${Math.round(file.size / 1024)} KB`,
        uploadedAt: 'Just now',
        status: 'PROCESSED',
        contentSummary: `Knowledge document for ${blueprint.name}: ${file.name}`,
        sourceOrigin: 'LOCAL_FILE'
      };
    });

    onChange({
      knowledgeSources: [...blueprint.knowledgeSources, ...newSources]
    });
    toast.success(`Attached ${newSources.length} knowledge source(s)`);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAddContextSource = (source: ContextSource) => {
    onChange({
      knowledgeSources: [...blueprint.knowledgeSources, source]
    });
  };

  const handleAddCustomTool = (tool: AgentToolBinding) => {
    onChange({
      tools: [...blueprint.tools, tool]
    });
  };

  const removeKnowledgeSource = (id: string) => {
    onChange({
      knowledgeSources: blueprint.knowledgeSources.filter(s => s.id !== id)
    });
    toast.info('Knowledge source removed');
  };

  const toggleTool = (toolId: string) => {
    const updated = blueprint.tools.map(t => 
      t.id === toolId ? { ...t, enabled: !t.enabled } : t
    );
    onChange({ tools: updated });
  };

  const toggleToolApproval = (toolId: string) => {
    const updated = blueprint.tools.map(t => 
      t.id === toolId ? { ...t, requiresApproval: !t.requiresApproval } : t
    );
    onChange({ tools: updated });
  };

  const updateGuardrails = (delta: Partial<AgentGuardrails>) => {
    onChange({
      guardrails: {
        ...blueprint.guardrails,
        ...delta
      }
    });
  };

  const updateMemory = (delta: Partial<AgentMemoryConfig>) => {
    onChange({
      memory: {
        ...memory,
        ...delta
      }
    });
  };

  const handleAddMemoryEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemKey.trim() || !newMemVal.trim()) {
      toast.error('Please enter a memory key and value');
      return;
    }

    const newEntry: AgentMemoryEntry = {
      id: `mem_${Date.now()}`,
      userName: newMemUser.trim() || 'Global Workspace',
      category: newMemCategory,
      key: newMemKey.trim(),
      value: newMemVal.trim(),
      confidence: 0.98,
      createdAt: new Date().toISOString()
    };

    updateMemory({
      entries: [newEntry, ...memory.entries]
    });
    setNewMemKey('');
    setNewMemVal('');
    setIsNewMemoryOpen(false);
    toast.success(`Remembered "${newEntry.key}"!`);
  };

  const handleRemoveMemory = (id: string) => {
    updateMemory({
      entries: memory.entries.filter(m => m.id !== id)
    });
    toast.info('Memory entry forgotten');
  };

  // Other agents in workspace for sub-agent delegation
  const otherCoworkers = (members || []).filter(m => m.isSynthetic && m.name !== blueprint.name);

  const toggleSubAgentTool = (coworker: any) => {
    const subAgentToolId = `tool_sub_${coworker.id}`;
    const existing = blueprint.tools.find(t => t.id === subAgentToolId);

    if (existing) {
      onChange({
        tools: blueprint.tools.map(t => t.id === subAgentToolId ? { ...t, enabled: !t.enabled } : t)
      });
    } else {
      const newSubTool: AgentToolBinding = {
        id: subAgentToolId,
        name: `Delegate: ${coworker.name}`,
        type: 'SUB_AGENT',
        description: `Sub-agent delegate. Invokes ${coworker.name} (${coworker.role || 'Specialist'}) to execute subtasks.`,
        enabled: true,
        requiresApproval: false,
        icon: 'Bot',
        subAgentConfig: {
          targetAgentId: coworker.id,
          targetAgentName: coworker.name,
          targetAgentRole: coworker.role
        }
      };
      onChange({
        tools: [...blueprint.tools, newSubTool]
      });
      toast.success(`Enabled ${coworker.name} as a sub-agent delegate!`);
    }
  };

  const getSourceIcon = (src: ContextSource) => {
    if (src.sourceOrigin === 'WEBSITE') {
      return (
        <div className="p-2 rounded-lg bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 shrink-0">
          <Globe size={16} />
        </div>
      );
    }
    if (src.sourceOrigin === 'KNOWLEDGE_BASE') {
      return (
        <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 shrink-0">
          <BookOpen size={16} />
        </div>
      );
    }
    if (src.sourceOrigin === 'DRIVE') {
      return (
        <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 shrink-0">
          <HardDrive size={16} />
        </div>
      );
    }
    if (src.sourceOrigin === 'APP' || src.sourceOrigin === 'REPORT') {
      return (
        <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 shrink-0">
          <BarChart2 size={16} />
        </div>
      );
    }

    switch (src.type) {
      case 'pdf':
        return (
          <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 shrink-0">
            <FileCheck size={16} />
          </div>
        );
      case 'docx':
        return (
          <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 shrink-0">
            <FileText size={16} />
          </div>
        );
      case 'png':
        return (
          <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 shrink-0">
            <ImageIcon size={16} />
          </div>
        );
      default:
        return (
          <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 shrink-0">
            <FileText size={16} />
          </div>
        );
    }
  };

  const getOriginBadge = (src: ContextSource) => {
    switch (src.sourceOrigin) {
      case 'WEBSITE':
        return <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 uppercase shrink-0">URL</span>;
      case 'KNOWLEDGE_BASE':
        return <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 uppercase shrink-0">KB</span>;
      case 'DRIVE':
        return <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 uppercase shrink-0">Drive</span>;
      default:
        return <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 uppercase shrink-0">File</span>;
    }
  };

  const getToolIcon = (iconName?: string) => {
    switch (iconName) {
      case 'Database': return <Database size={16} className="text-blue-500" />;
      case 'FileText': return <FileText size={16} className="text-emerald-500" />;
      case 'GitFork': return <GitFork size={16} className="text-purple-500" />;
      case 'CreditCard': return <CreditCard size={16} className="text-amber-500" />;
      case 'MessageSquare': return <MessageSquare size={16} className="text-pink-500" />;
      case 'Users': return <Users size={16} className="text-cyan-500" />;
      case 'Bot': return <Bot size={16} className="text-indigo-500" />;
      default: return <Wrench size={16} className="text-zinc-400" />;
    }
  };

  const filteredTools = blueprint.tools.filter(t => 
    t.name.toLowerCase().includes(toolSearch.toLowerCase()) || 
    t.description.toLowerCase().includes(toolSearch.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col bg-zinc-50 dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 select-none">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        multiple
        onChange={handleFileUpload}
        className="hidden"
        accept=".pdf,.docx,.doc,.txt,.md,.json,.csv"
      />

      {/* Add Context Source Modal */}
      <AddContextSourceModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddLocalFiles={(files) => {
          const fakeEvent = { target: { files } } as any;
          handleFileUpload(fakeEvent);
        }}
        onAddContextSource={handleAddContextSource}
      />

      {/* Add Custom Tool Modal */}
      <AddCustomToolModal
        isOpen={isCustomToolModalOpen}
        onClose={() => setIsCustomToolModalOpen(false)}
        onAddTool={handleAddCustomTool}
      />

      {/* Panel Navigation Header */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Agent Capabilities & Policies
            </span>
          </div>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
            {blueprint.knowledgeSources.length} Docs • {blueprint.tools.filter(t => t.enabled).length} Tools
          </span>
        </div>

        {/* 5 Inner Navigation Tabs */}
        <div className="grid grid-cols-5 gap-1 bg-zinc-200/70 dark:bg-zinc-800/80 p-1 rounded-xl text-[10px] font-semibold">
          <button
            onClick={() => setActiveTab('knowledge')}
            className={`flex items-center justify-center gap-1 py-1.5 rounded-lg transition-all ${
              activeTab === 'knowledge'
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm font-bold'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
            }`}
          >
            <BookOpen size={11} />
            <span>Docs</span>
          </button>
          <button
            onClick={() => setActiveTab('tools')}
            className={`flex items-center justify-center gap-1 py-1.5 rounded-lg transition-all ${
              activeTab === 'tools'
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm font-bold'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
            }`}
          >
            <Wrench size={11} />
            <span>Tools</span>
          </button>
          <button
            onClick={() => setActiveTab('memory')}
            className={`flex items-center justify-center gap-1 py-1.5 rounded-lg transition-all ${
              activeTab === 'memory'
                ? 'bg-white dark:bg-zinc-700 text-purple-600 dark:text-purple-300 shadow-sm font-bold'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
            }`}
          >
            <Brain size={11} />
            <span>Memory</span>
          </button>
          <button
            onClick={() => setActiveTab('guardrails')}
            className={`flex items-center justify-center gap-1 py-1.5 rounded-lg transition-all ${
              activeTab === 'guardrails'
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm font-bold'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
            }`}
          >
            <ShieldAlert size={11} />
            <span>Safety</span>
          </button>
          <button
            onClick={() => setActiveTab('autopilot')}
            className={`flex items-center justify-center gap-1 py-1.5 rounded-lg transition-all ${
              activeTab === 'autopilot'
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm font-bold'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
            }`}
          >
            <Zap size={11} />
            <span>Pilot</span>
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Tab 1: Knowledge & Context Docs */}
        {activeTab === 'knowledge' && (
          <div className="space-y-4">
            <div
              onClick={() => setIsAddModalOpen(true)}
              className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-indigo-500 rounded-2xl p-5 text-center cursor-pointer transition-all bg-white/50 dark:bg-zinc-800/40 hover:bg-indigo-50/20 group"
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="h-9 w-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                  <UploadCloud size={18} />
                </div>
                <div className="h-9 w-9 rounded-xl bg-sky-50 dark:bg-sky-950/50 flex items-center justify-center text-sky-600 dark:text-sky-400 group-hover:scale-110 transition-transform">
                  <Globe size={18} />
                </div>
                <div className="h-9 w-9 rounded-xl bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
                  <BookOpen size={18} />
                </div>
              </div>
              <h4 className="text-xs font-bold text-zinc-900 dark:text-white">Add Knowledge Grounding</h4>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                Upload files, add website URLs, or link KB articles
              </p>
            </div>

            {/* List of Attached Sources */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                <span>Attached Knowledge Sources</span>
                <span>{blueprint.knowledgeSources.length} sources</span>
              </div>

              {blueprint.knowledgeSources.length === 0 ? (
                <div className="p-4 rounded-xl bg-zinc-100/80 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 text-center">
                  <p className="text-xs text-zinc-400">No knowledge sources attached yet.</p>
                </div>
              ) : (
                blueprint.knowledgeSources.map((source) => (
                  <div
                    key={source.id}
                    className="p-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/60 flex items-center justify-between group shadow-sm hover:border-zinc-300 dark:hover:border-zinc-600 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {getSourceIcon(source)}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">
                            {source.name}
                          </p>
                          {getOriginBadge(source)}
                        </div>
                        <p className="text-[10px] text-zinc-400 truncate">
                          {source.size} • {source.status}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeKnowledgeSource(source.id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-all shrink-0 ml-2"
                      title="Remove source"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Tools, Custom APIs & Sub-Agents */}
        {activeTab === 'tools' && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={13} className="absolute left-3 top-2.5 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search tools & connectors..."
                  value={toolSearch}
                  onChange={(e) => setToolSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <button
                onClick={() => setIsCustomToolModalOpen(true)}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow-sm shrink-0"
              >
                <Plus size={13} />
                <span>Custom API</span>
              </button>
            </div>

            {/* Sub-Agent Delegations */}
            {otherCoworkers.length > 0 && (
              <div className="space-y-2 pt-1 pb-2 border-b border-zinc-200 dark:border-zinc-800">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                  Sub-Agent Coworker Delegations
                </span>
                {otherCoworkers.map(coworker => {
                  const subToolId = `tool_sub_${coworker.id}`;
                  const isEnabled = blueprint.tools.some(t => t.id === subToolId && t.enabled);

                  return (
                    <div key={coworker.id} className="p-2.5 rounded-xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-800/40 flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <Bot size={15} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">{coworker.name}</p>
                          <p className="text-[10px] text-indigo-600 dark:text-indigo-400 truncate">{coworker.role || 'Specialist'}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleSubAgentTool(coworker)}
                        className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
                          isEnabled
                            ? 'bg-indigo-600 text-white'
                            : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
                        }`}
                      >
                        {isEnabled ? 'Enabled' : 'Disabled'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Standard & Custom Tools List */}
            <div className="space-y-2.5">
              {filteredTools.map((tool) => (
                <div
                  key={tool.id}
                  className={`p-3 rounded-xl border transition-all ${
                    tool.enabled
                      ? 'bg-white dark:bg-zinc-800 border-indigo-200 dark:border-indigo-800/80 shadow-sm'
                      : 'bg-zinc-100/60 dark:bg-zinc-800/30 border-zinc-200 dark:border-zinc-800/80 opacity-70'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-700 shrink-0 mt-0.5">
                        {getToolIcon(tool.icon)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-bold text-zinc-900 dark:text-white">
                            {tool.name}
                          </h4>
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300">
                            {tool.type}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-snug">
                          {tool.description}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => toggleTool(tool.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 ${
                        tool.enabled
                          ? 'bg-indigo-600 text-white shadow-sm hover:bg-indigo-700'
                          : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300'
                      }`}
                    >
                      {tool.enabled ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>

                  {tool.enabled && (
                    <div className="mt-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-700/60 flex items-center justify-between text-[10px] text-zinc-500 dark:text-zinc-400">
                      <span>Require Human-in-the-Loop Sign-off</span>
                      <button
                        onClick={() => toggleToolApproval(tool.id)}
                        className={`px-2 py-0.5 rounded font-bold transition-all ${
                          tool.requiresApproval
                            ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                            : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400'
                        }`}
                      >
                        {tool.requiresApproval ? 'Required' : 'Auto-execute'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Long-Term Memory & User Profiles */}
        {activeTab === 'memory' && (
          <div className="space-y-4 text-xs">
            {/* Memory Master Switch & Configuration */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/60 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
                    <Brain size={16} />
                  </div>
                  <div>
                    <h4 className="font-bold text-zinc-900 dark:text-white">Long-Term Memory</h4>
                    <p className="text-[10px] text-zinc-400">Remember facts, preferences, & account history</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={memory.enabled}
                  onChange={(e) => updateMemory({ enabled: e.target.checked })}
                  className="w-4 h-4 accent-purple-600"
                />
              </div>

              {memory.enabled && (
                <div className="space-y-3 pt-2 border-t border-zinc-100 dark:border-zinc-700/60">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Memory Architecture</label>
                    <select
                      value={memory.memoryType}
                      onChange={(e) => updateMemory({ memoryType: e.target.value as any })}
                      className="w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-semibold"
                    >
                      <option value="FULL_HYBRID">Full Hybrid (Episodic + User Entity Profiles)</option>
                      <option value="SEMANTIC_USER_PROFILES">User Profiles & Preferences Only</option>
                      <option value="EPISODIC">Episodic Conversation Recall Only</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-zinc-800 dark:text-zinc-200">Auto-Extract Entities</span>
                      <p className="text-[10px] text-zinc-400">Learn user traits during conversations</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={memory.autoExtractEntities}
                      onChange={(e) => updateMemory({ autoExtractEntities: e.target.checked })}
                      className="w-4 h-4 accent-purple-600"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Remembered Entries List */}
            {memory.enabled && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                    Remembered Facts ({memory.entries.length})
                  </span>
                  <button
                    onClick={() => setIsNewMemoryOpen(true)}
                    className="text-[11px] font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1 hover:underline"
                  >
                    <Plus size={12} /> Add Memory
                  </button>
                </div>

                {isNewMemoryOpen && (
                  <form onSubmit={handleAddMemoryEntry} className="p-3.5 bg-purple-50/40 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/60 rounded-2xl space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Key (e.g. Preferred Tone)"
                        value={newMemKey}
                        onChange={(e) => setNewMemKey(e.target.value)}
                        className="flex-1 px-2.5 py-1.5 bg-white dark:bg-zinc-800 border border-purple-200 dark:border-purple-800 rounded-lg text-xs font-bold"
                      />
                      <select
                        value={newMemCategory}
                        onChange={(e) => setNewMemCategory(e.target.value as any)}
                        className="px-2 py-1.5 bg-white dark:bg-zinc-800 border border-purple-200 dark:border-purple-800 rounded-lg text-xs"
                      >
                        <option value="PREFERENCE">Preference</option>
                        <option value="FACT">Fact</option>
                        <option value="ACCOUNT_STATE">Account State</option>
                      </select>
                    </div>
                    <textarea
                      rows={2}
                      placeholder="Value (e.g. Wants short answers with tabular outputs)..."
                      value={newMemVal}
                      onChange={(e) => setNewMemVal(e.target.value)}
                      className="w-full p-2 bg-white dark:bg-zinc-800 border border-purple-200 dark:border-purple-800 rounded-lg text-xs"
                    />
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsNewMemoryOpen(false)}
                        className="px-3 py-1 rounded-lg text-zinc-500 hover:bg-zinc-100 text-[11px]"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-3.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[11px] font-bold"
                      >
                        Save Memory
                      </button>
                    </div>
                  </form>
                )}

                {memory.entries.length === 0 ? (
                  <div className="p-4 rounded-xl bg-zinc-100/80 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 text-center text-zinc-400">
                    No long-term memories stored yet.
                  </div>
                ) : (
                  memory.entries.map(entry => (
                    <div
                      key={entry.id}
                      className="p-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/60 shadow-sm flex items-start justify-between group"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-1.5">
                          <Bookmark size={12} className="text-purple-500 shrink-0" />
                          <span className="font-bold text-zinc-900 dark:text-white truncate">{entry.key}</span>
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
                            {entry.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-600 dark:text-zinc-300">{entry.value}</p>
                        {entry.userName && (
                          <span className="text-[9px] text-zinc-400 block font-mono">Scope: {entry.userName}</span>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemoveMemory(entry.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-red-500 transition-opacity ml-2 shrink-0"
                        title="Forget Memory"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Guardrails & Policies */}
        {activeTab === 'guardrails' && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  Confidence Threshold
                </span>
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded">
                  {(blueprint.guardrails.confidenceThreshold * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min="0.5"
                max="0.99"
                step="0.01"
                value={blueprint.guardrails.confidenceThreshold}
                onChange={(e) => updateGuardrails({ confidenceThreshold: parseFloat(e.target.value) })}
                className="w-full accent-indigo-600"
              />
            </div>

            <div className="p-3.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/60 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  Human Supervisor Sign-off
                </h4>
                <p className="text-[10px] text-zinc-400">Escalate destructive/refund actions</p>
              </div>
              <input
                type="checkbox"
                checked={blueprint.guardrails.requireHumanApproval}
                onChange={(e) => updateGuardrails({ requireHumanApproval: e.target.checked })}
                className="w-4 h-4 accent-indigo-600"
              />
            </div>

            <div className="p-3.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/60 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                  <Lock size={12} className="text-amber-500" />
                  Read-Only Mode
                </h4>
                <p className="text-[10px] text-zinc-400">Block database mutations</p>
              </div>
              <input
                type="checkbox"
                checked={blueprint.guardrails.readOnlyMode}
                onChange={(e) => updateGuardrails({ readOnlyMode: e.target.checked })}
                className="w-4 h-4 accent-amber-600"
              />
            </div>
          </div>
        )}

        {/* Tab 4: Queue Auto-Pilot Worker */}
        {activeTab === 'autopilot' && (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/60 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                    <ListOrdered size={16} />
                  </div>
                  <div>
                    <h4 className="font-bold text-zinc-900 dark:text-white">Queue Auto-Pilot</h4>
                    <p className="text-[10px] text-zinc-400">Continuously pull & resolve queue items 24/7</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={blueprint.queueAutoPilot?.enabled || false}
                  onChange={(e) => onChange({
                    queueAutoPilot: {
                      enabled: e.target.checked,
                      autoProcessNewItems: true,
                      pollingIntervalMinutes: 5,
                      autoResolveConfidenceThreshold: 0.90,
                      ...blueprint.queueAutoPilot
                    }
                  })}
                  className="w-4 h-4 accent-indigo-600"
                />
              </div>

              {blueprint.queueAutoPilot?.enabled && (
                <div className="space-y-3 pt-3 border-t border-zinc-100 dark:border-zinc-700/60">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Target Work Queue</label>
                    <select
                      value={blueprint.queueAutoPilot?.queueId || 'queue_global_triage'}
                      onChange={(e) => onChange({
                        queueAutoPilot: { ...blueprint.queueAutoPilot!, queueId: e.target.value, queueName: e.target.options[e.target.selectedIndex].text }
                      })}
                      className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl font-bold"
                    >
                      <option value="queue_global_triage">Global Support & Triage Queue</option>
                      <option value="queue_billing_disputes">Financial Disputes & Invoicing Queue</option>
                      <option value="queue_compliance_review">Compliance & Record Audits Queue</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Polling Cadence</label>
                    <select
                      value={blueprint.queueAutoPilot?.pollingIntervalMinutes || 5}
                      onChange={(e) => onChange({
                        queueAutoPilot: { ...blueprint.queueAutoPilot!, pollingIntervalMinutes: parseInt(e.target.value) }
                      })}
                      className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl"
                    >
                      <option value="1">Every 1 minute (Real-time Stream)</option>
                      <option value="5">Every 5 minutes (Standard)</option>
                      <option value="15">Every 15 minutes (Batched)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
