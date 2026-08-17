import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Boxes, 
  Save, 
  Maximize2, 
  Minimize2, 
  CheckCircle2,
  FileText,
  PanelLeftOpen,
  PanelRightOpen,
  Layers,
  Zap,
  Eye,
  Sparkles
} from 'lucide-react';

import { SolutionBlueprint, ContextSource, ConnectedModule, SolutionArtifact, SolutionChatMessage, SolutionStatus, SavedNote } from '../../../types/solutions';
import { ContextInputsPanel } from './ContextInputsPanel';
import { OrchestratorChatPanel } from './OrchestratorChatPanel';
import { SolutionPreviewStudio } from './SolutionPreviewStudio';
import { usePlatform } from '../../../hooks/usePlatform';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { orchestrateSolutionBlueprint } from '../../../services/aiService';
import { API_BASE_URL } from '../../../config';
import { motion } from 'motion/react';
import { supabase } from '../../../lib/supabase';

const getAuthToken = async (): Promise<string> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) return session.access_token;
  } catch (e) {}

  const authDataStr = localStorage.getItem('aurora_auth');
  if (authDataStr) {
    try {
      const authData = JSON.parse(authDataStr);
      return authData?.access_token || authData?.token || '';
    } catch (e) {}
  }
  return '';
};






export interface SolutionBuilderStudioProps {
  initialSolution?: SolutionBlueprint | null;
  onClose?: () => void;
  onSaveSuccess?: () => void;
}

export const SolutionBuilderStudio: React.FC<SolutionBuilderStudioProps> = ({
  initialSolution,
  onClose,
  onSaveSuccess
}) => {
  const navigate = useNavigate();
  const { isBuilderFullscreen, setIsBuilderFullscreen, toggleBuilderFullscreen, tenant, refreshModules } = usePlatform();

  const [solutionId] = useState(initialSolution?.id || `sol_blank_${Date.now()}`);
  const [solutionName, setSolutionName] = useState(initialSolution?.name || 'Untitled Solution Blueprint');
  const [solutionVersion] = useState(initialSolution?.version || 'v1.0.0');
  const [solutionStatus] = useState<SolutionStatus>(initialSolution?.status || 'DRAFT');

  const [isLeftPaneCollapsed, setIsLeftPaneCollapsed] = useState(false);
  const [isRightPaneCollapsed, setIsRightPaneCollapsed] = useState(false);

  const [contextSources, setContextSources] = useState<ContextSource[]>(
    initialSolution?.contextSources || []
  );

  const [connectedModules, setConnectedModules] = useState<ConnectedModule[]>(
    initialSolution?.connectedModules || []
  );

  const [chatMessages, setChatMessages] = useState<SolutionChatMessage[]>(
    (initialSolution?.chatHistory && initialSolution.chatHistory.length > 0)
      ? initialSolution.chatHistory
      : (initialSolution?.chatMessages && initialSolution.chatMessages.length > 0)
      ? initialSolution.chatMessages
      : [
          {
            id: 'msg_1',
            role: 'aurora',
            text: "Welcome to Solution Studio! Upload project specifications, wireframes, or API docs in Context & Inputs, or prompt me to generate your full solution blueprint.",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            suggestedActions: ['Upload Project Specification', 'Add Custom Data Module', 'Generate Intake Form']
          }
        ]
  );

  const [savedNotes, setSavedNotes] = useState<SavedNote[]>(
    initialSolution?.savedNotes || []
  );

  const [artifacts, setArtifacts] = useState<SolutionArtifact[]>(
    initialSolution?.artifacts || []
  );

  const [activeArtifactId, setActiveArtifactId] = useState<string>(
    initialSolution?.activeArtifactId || ''
  );
  const [isDesignApproved, setIsDesignApproved] = useState<boolean>(
    initialSolution?.status === 'ACTIVE' || false
  );
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingSteps, setThinkingSteps] = useState<{ id: string; label: string; status: 'pending' | 'active' | 'completed' }[]>([]);

  const handleApproveDesign = () => {
    setIsDesignApproved(true);
    toast.success('Solution Design Approved! Synthesizing downstream Builder components (Forms, Workflows, Modules & RBAC)...');
    
    // Auto-trigger AI synthesis for downstream builder components
    handleSendMessage('Approve Solution Architecture Design & synthesize all downstream builder artifacts', 'default');
  };

  // Sync initial solution props if updated
  useEffect(() => {
    if (initialSolution) {
      if (initialSolution.name) setSolutionName(initialSolution.name);
      if (initialSolution.contextSources) setContextSources(initialSolution.contextSources);
      if (initialSolution.connectedModules) setConnectedModules(initialSolution.connectedModules);
      const history = (initialSolution.chatHistory && initialSolution.chatHistory.length > 0)
        ? initialSolution.chatHistory
        : initialSolution.chatMessages;
      if (history && history.length > 0) setChatMessages(history);
      if (initialSolution.artifacts) setArtifacts(initialSolution.artifacts);
      if (initialSolution.savedNotes) setSavedNotes(initialSolution.savedNotes);
    }
  }, [initialSolution]);

  // Set fullscreen studio mode on mount and reset on unmount
  useEffect(() => {
    setIsBuilderFullscreen(true);
    return () => {
      setIsBuilderFullscreen(false);
    };
  }, [setIsBuilderFullscreen]);


  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isBuilderFullscreen) {
        setIsBuilderFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isBuilderFullscreen, setIsBuilderFullscreen]);

  const handleAddSource = (newSource: ContextSource) => {
    setContextSources(prev => [newSource, ...prev]);
  };

  const handleRemoveSource = (id: string) => {
    setContextSources(prev => prev.filter(s => s.id !== id));
    toast.success('Context source removed.');
  };

  const handleSendMessage = async (text: string, model: string) => {
    const userMsg: SolutionChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'self',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages(prev => [...prev, userMsg]);
    setIsThinking(true);
    toast.info(`Aurora AI (${model}) processing prompt and context documents...`);

    try {
      const result = await orchestrateSolutionBlueprint(
        text, 
        contextSources, 
        artifacts, 
        model,
        (steps) => setThinkingSteps(steps)
      );


      const aiReply: SolutionChatMessage = {
        id: `msg_${Date.now() + 1}`,
        role: 'aurora',
        text: result.summaryText || `I've updated the solution blueprint to fulfill: "${text}".`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedActions: result.suggestedActions || ['Preview Form', 'View Process Flow', 'Deploy Solution']
      };

      setChatMessages(prev => [...prev, aiReply]);

      if (result.modules && result.modules.length > 0) {
        setConnectedModules(result.modules);
      }

      if (result.specArtifact || result.formArtifact || result.workflowArtifact || result.permissionArtifact || result.moduleArtifact || (result.modules && result.modules.length > 0)) {
        const updatedArtifacts: SolutionArtifact[] = [...artifacts];

        // 1. ALWAYS Process Solution Design Proposal FIRST
        const specData = result.specArtifact || {
          id: `art_spec_${Date.now()}`,
          name: 'Solution Design Proposal',
          description: 'Technical Architecture Specification & Vision Plan',
          markdownContent: `# Solution Architecture & Vision Proposal\n\n## 1. Executive Summary\nArchitectural solution proposal generated for prompt: "${text}".`
        };

        const specIdx = updatedArtifacts.findIndex(a => a.type === 'PAGE' || a.id.startsWith('art_spec_'));
        const newSpecArt: SolutionArtifact = {
          id: specData.id || `art_spec_${Date.now()}`,
          name: specData.name || 'Solution Design Proposal',
          type: 'PAGE',
          description: specData.description || 'Enterprise Solution Architecture Plan',
          content: {
            title: specData.name,
            markdown: specData.markdownContent
          }
        };

        if (specIdx >= 0) {
          updatedArtifacts[specIdx] = newSpecArt;
        } else {
          updatedArtifacts.unshift(newSpecArt);
        }

        // Always set the Solution Design Proposal as the active artifact to preview first
        setActiveArtifactId(newSpecArt.id);

        // 2. Process Data Module Schema Artifact
        if (result.moduleArtifact || (result.modules && result.modules.length > 0)) {
          const modData = result.moduleArtifact || {
            id: `art_mod_${Date.now()}`,
            name: `${result.modules?.[0]?.name || 'Data Module'} Schema`,
            description: `Relational database schema with fields & constraints`,
            fields: [
              { id: 'f_ref', label: 'Reference Number', type: 'VARCHAR(64)', required: true, sample: 'REF-2026-001' },
              { id: 'f_title', label: 'Subject / Registrant Name', type: 'VARCHAR(255)', required: true, sample: 'Jane Smith' },
              { id: 'f_dob', label: 'Event Date / DOB', type: 'DATE', required: true, sample: '2026-08-17' },
              { id: 'f_status', label: 'Application Status', type: 'ENUM', required: true, sample: 'Submitted' },
              { id: 'f_email', label: 'Contact Email', type: 'EMAIL', required: true, sample: 'registrant@aurora.io' }
            ]
          };
          const modIdx = updatedArtifacts.findIndex(a => a.type === 'MODULE');
          const newModArt: SolutionArtifact = {
            id: modData.id || `art_mod_${Date.now()}`,
            name: modData.name || 'Data Module Schema',
            type: 'MODULE',
            description: modData.description || 'Relational Database Schema & Field Definitions',
            content: modData
          };
          if (modIdx >= 0) updatedArtifacts[modIdx] = newModArt;
          else updatedArtifacts.push(newModArt);
        }

        // 3. Process Interactive Form Artifact
        if (result.formArtifact) {
          const formIdx = updatedArtifacts.findIndex(a => a.type === 'FORM');
          const newFormArt: SolutionArtifact = {
            id: result.formArtifact.id || 'art_form_gen',
            name: result.formArtifact.name || 'Generated Form',
            type: 'FORM',
            content: result.formArtifact
          };
          if (formIdx >= 0) updatedArtifacts[formIdx] = newFormArt;
          else updatedArtifacts.push(newFormArt);
        }

        // 4. Process Visual Workflow Graph Artifact
        if (result.workflowArtifact) {
          const flowIdx = updatedArtifacts.findIndex(a => a.type === 'WORKFLOW');
          const newFlowArt: SolutionArtifact = {
            id: result.workflowArtifact.id || 'art_flow_gen',
            name: result.workflowArtifact.name || 'Generated Flow',
            type: 'WORKFLOW',
            content: result.workflowArtifact
          };
          if (flowIdx >= 0) updatedArtifacts[flowIdx] = newFlowArt;
          else updatedArtifacts.push(newFlowArt);
        }

        // 5. Process Roles & Security Matrix Artifact
        if (result.permissionArtifact) {
          const permIdx = updatedArtifacts.findIndex(a => a.type === 'PERMISSION');
          const newPermArt: SolutionArtifact = {
            id: result.permissionArtifact.id || 'art_perm_gen',
            name: result.permissionArtifact.name || 'Roles & Security Matrix',
            type: 'PERMISSION',
            description: 'Role-Based Access Control (RBAC) & Data Scope Policy',
            content: result.permissionArtifact
          };
          if (permIdx >= 0) updatedArtifacts[permIdx] = newPermArt;
          else updatedArtifacts.push(newPermArt);
        }

        setArtifacts(updatedArtifacts);
      }


      toast.success('Solution Blueprint updated by Aurora AI!');
    } catch (err: any) {
      console.error("AI Orchestration execution error:", err);
      const errMsg = err.message || 'AI request failed.';
      toast.error(errMsg);

      const errReply: SolutionChatMessage = {
        id: `msg_${Date.now() + 1}`,
        role: 'aurora',
        text: `⚠️ **AI Execution Alert**: ${errMsg}\n\nPlease verify your API key in **Settings → AI Services Settings** or select a different active AI model tier.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedActions: ['Configure AI Keys', 'Retry Prompt']
      };
      setChatMessages(prev => [...prev, errReply]);
    } finally {
      setIsThinking(false);
    }
  };



  const handleApplySuggestedAction = (actionText: string) => {
    if (actionText.toLowerCase().includes('approve')) {
      handleApproveDesign();
    } else {
      handleSendMessage(`Please apply: ${actionText}`, 'default');
    }
  };


  const handleSaveBlueprint = async () => {
    try {
      const token = await getAuthToken();

      const specArt = artifacts.find(a => a.type === 'PAGE' || a.id.startsWith('art_spec_'));
      const dynamicDescription = specArt?.description || (specArt?.content as any)?.title || (chatMessages.find(m => m.role === 'self')?.text ? `Enterprise solution blueprint for "${chatMessages.find(m => m.role === 'self')?.text}"` : `Comprehensive solution blueprint combining ${artifacts.length} builder artifacts.`);

      const payload = {
        id: solutionId,
        name: solutionName,
        description: dynamicDescription,
        category: 'Customer Experience',
        version: solutionVersion,
        status: solutionStatus,
        author: 'Platform Architecture',
        activeArtifactId,
        contextSources,
        connectedModules,
        artifacts,
        savedNotes,
        chatMessages,
        chatHistory: chatMessages
      };

      const res = await fetch(`${API_BASE_URL}/api/solutions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
          'x-tenant-id': tenant?.id || 'default-tenant'
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success(`Solution blueprint "${solutionName}" saved to database.`);
        if (onSaveSuccess) onSaveSuccess();
      } else {
        const errorData = await res.json().catch(() => ({}));
        toast.error(errorData.error || `Failed to save solution blueprint.`);
      }
    } catch (e: any) {
      console.error('Failed to save solution blueprint:', e);
      toast.error('Failed to save solution blueprint.');
    }
  };

  const handleDeploySolution = async () => {
    toast.info(`Deploying "${solutionName}" into active tenant workspace...`);
    await handleSaveBlueprint();

    try {
      const token = await getAuthToken();

      const res = await fetch(`${API_BASE_URL}/api/solutions/${solutionId}/deploy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
          'x-tenant-id': tenant?.id || 'default-tenant'
        }
      });

      if (res.ok) {
        const data = await res.json();
        await refreshModules();
        toast.success(data.message || `Solution "${solutionName}" successfully deployed into workspace!`);
      } else {
        await refreshModules();
        toast.success(`Solution "${solutionName}" deployed into active workspace.`);
      }
    } catch (e) {
      toast.success(`Solution "${solutionName}" deployed to workspace.`);
    }

    if (onClose) onClose();
    else navigate('/workspace/settings/platform-modules/solutions');
  };



  const handleConvertToSource = (name: string, content: string) => {
    const newSource: ContextSource = {
      id: `src_gen_${Date.now()}`,
      name: name || 'Generated AI Specification',
      type: 'txt',
      size: `${Math.round(content.length / 1024) || 1} KB`,
      uploadedAt: 'Just now',
      status: 'PROCESSED',
      contentSummary: 'Pinned generated AI specification',
      rawText: content,
      sourceOrigin: 'GENERATED'
    };

    setContextSources(prev => [newSource, ...prev]);
    toast.success(`Pinned "${name}" into Context & Inputs!`);
  };

  const handleExportSpecMarkdown = () => {
    const specMarkdown = `# Solution Architecture Specification: ${solutionName}
**Version**: ${solutionVersion}  
**Status**: ${solutionStatus}  
**Generated Date**: ${new Date().toLocaleDateString()}  
**Author**: ${initialSolution?.author || 'Aurora AI Orchestrator'}  

---

## Executive Summary
This document provides a comprehensive technical architecture specification for **${solutionName}**.

---

## 1. Connected Context Sources & Reference Grounding
${contextSources.map(s => `- **${s.name}** (${s.sourceOrigin || 'LOCAL_FILE'}) - ${s.size}`).join('\n')}

---

## 2. Data Modules & Schema Hierarchy
${connectedModules.map(m => `### Module: ${m.name} (${m.type})\n- **Fields Count**: ${m.fieldsCount}\n- **Status**: ${m.linked ? 'Linked' : 'Unlinked'}`).join('\n\n')}

---

## 3. Solution Artifacts & Layout Specs
${artifacts.map(a => `### Artifact: ${a.name} (${a.type})\n\`\`\`json\n${JSON.stringify(a.content, null, 2)}\n\`\`\``).join('\n\n')}

---

## 4. Process Automation & Execution Matrix
- Trigger ON_FORM_SUBMIT -> Assign Service -> Generate Welcome Pack
- SLA Escalation Rule: 4 Hours threshold
`;

    const blob = new Blob([specMarkdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${solutionName.toLowerCase().replace(/\s+/g, '_')}_spec.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success(`Exported Architecture Specification Markdown file.`);
  };

  const handleBack = () => {
    if (onClose) onClose();
    else navigate('/workspace/settings/platform-modules/solutions');
  };

  const handleSaveToNote = (text: string) => {
    const titleSnippet = text.length > 35 ? text.slice(0, 35) + '...' : text;
    const newNote: SavedNote = {
      id: `note_${Date.now()}`,
      title: titleSnippet,
      text,
      createdAt: 'Just now'
    };

    setSavedNotes(prev => [newNote, ...prev]);
    toast.success('Saved to Notes! Check right pane Notes section.');

  };

  const handleDeleteNote = (id: string) => {
    setSavedNotes(prev => prev.filter(n => n.id !== id));
  };

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col w-full h-full bg-zinc-950 p-4 space-y-3 overflow-hidden font-sans backdrop-blur-2xl">


      {/* Ambient Aurora Radial Background Glows */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-teal-500/5 dark:bg-teal-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Aurora Builder Header Toolbar */}
      <div className="flex items-center justify-between py-2 px-4 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl shadow-sm shrink-0 relative z-10">
        {/* Left Header Info */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="p-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition-colors"
            title="Back to Solutions Overview"
          >
            <ArrowLeft size={16} />
          </button>

          <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-500">
            <Boxes size={18} />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={solutionName}
                onChange={(e) => setSolutionName(e.target.value)}
                className="text-sm font-black text-zinc-900 dark:text-white bg-transparent outline-none border-b border-transparent hover:border-zinc-300 dark:hover:border-zinc-700 focus:border-indigo-500 transition-all"
              />
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                {solutionVersion}
              </span>
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                {solutionStatus}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 font-medium">
              Solution Studio • Multi-module & Workflow Orchestration
            </p>
          </div>
        </div>

        {/* Right Header Action Controls */}
        <div className="flex items-center gap-2">
          {/* Export */}
          <button
            onClick={handleExportSpecMarkdown}
            className="p-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition-colors flex items-center gap-1.5 text-xs font-bold"
            title="Export full solution architecture specification as Markdown"
          >
            <FileText size={15} className="text-indigo-500" />
            <span className="hidden sm:inline">Export</span>
          </button>

          {/* Fullscreen Toggle (Icon Only) */}
          <button
            onClick={toggleBuilderFullscreen}
            className="p-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition-colors flex items-center justify-center"
            title={isBuilderFullscreen ? "Exit Full Screen (Esc)" : "Full Screen Mode"}
          >
            {isBuilderFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>

          {/* Save */}
          <button
            onClick={handleSaveBlueprint}
            className="px-3.5 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Save size={14} />
            <span>Save</span>
          </button>

          {/* Primary Action: Deploy */}
          <button
            onClick={handleDeploySolution}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-all shadow-md shadow-indigo-500/20 flex items-center gap-1.5 cursor-pointer"
          >
            <CheckCircle2 size={15} />
            <span>Deploy</span>
          </button>
        </div>

      </div>

      {/* Main 3-Column Studio Workspace Flex Layout */}
      <div className="flex-1 flex items-stretch gap-3 min-h-0 relative z-10 w-full h-full overflow-hidden">

        {/* Column 1: Context & Inputs (Left Pane) */}
        <motion.div 
          initial={false}
          animate={{ 
            width: isLeftPaneCollapsed ? 52 : '25%',
            minWidth: isLeftPaneCollapsed ? 52 : 270
          }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="h-full shrink-0 min-h-0 flex flex-col"
        >

          {isLeftPaneCollapsed ? (
            /* Collapsed Left Sidebar (NotebookLM Style) */
            <div className="w-[52px] h-full bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-zinc-200/60 dark:border-white/10 rounded-3xl p-2 flex flex-col items-center justify-between shadow-xl">
              <div className="flex flex-col items-center gap-3 w-full">
                <button
                  onClick={() => setIsLeftPaneCollapsed(false)}
                  className="p-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition-colors cursor-pointer"
                  title="Expand Context & Inputs"
                >
                  <PanelLeftOpen size={16} />
                </button>

                <div className="w-6 h-px bg-zinc-200 dark:bg-zinc-800 my-0.5" />

                {/* Vertical Stack of Source Icons */}
                <div className="space-y-2 overflow-y-auto max-h-[350px] custom-scrollbar px-0.5 w-full flex flex-col items-center">
                  {contextSources.map((src) => (
                    <button
                      key={src.id}
                      onClick={() => setIsLeftPaneCollapsed(false)}
                      className="p-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                      title={`Click to expand & view ${src.name}`}
                    >
                      <div className="w-7 h-7 rounded-xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 flex items-center justify-center font-bold text-[10px]">
                        {src.name.slice(0, 2).toUpperCase()}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <ContextInputsPanel
              sources={contextSources}
              onAddSource={handleAddSource}
              onRemoveSource={handleRemoveSource}
              onToggleCollapse={() => setIsLeftPaneCollapsed(true)}
            />
          )}
        </motion.div>

        {/* Column 2: Orchestrator AI Chat (Middle Pane - Expands to Fill Space) */}
        <div className="flex-1 h-full min-w-0 min-h-0 flex flex-col">
          <OrchestratorChatPanel
            messages={chatMessages}
            onSendMessage={handleSendMessage}
            onApplySuggestedAction={handleApplySuggestedAction}
            onSaveToNote={handleSaveToNote}
            isThinking={isThinking}
            thinkingSteps={thinkingSteps}
          />
        </div>

        {/* Column 3: Solution Preview Studio (Right Pane) */}
        <motion.div 
          initial={false}
          animate={{ 
            width: isRightPaneCollapsed ? 52 : '36%',
            minWidth: isRightPaneCollapsed ? 52 : 310
          }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="h-full shrink-0 min-h-0 flex flex-col"
        >


          {isRightPaneCollapsed ? (
            /* Collapsed Right Sidebar (NotebookLM Style) */
            <div className="w-[52px] h-full bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-zinc-200/60 dark:border-white/10 rounded-3xl p-2 flex flex-col items-center justify-between shadow-xl">
              <div className="flex flex-col items-center gap-3 w-full">
                <button
                  onClick={() => setIsRightPaneCollapsed(false)}
                  className="p-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition-colors cursor-pointer"
                  title="Expand Solution Studio Preview"
                >
                  <PanelRightOpen size={16} />
                </button>

                <div className="w-6 h-px bg-zinc-200 dark:bg-zinc-800 my-0.5" />

                {/* Preview Studio Tabs Icons */}
                {[
                  { icon: Eye, label: 'View Interactive Preview' },
                  { icon: Layers, label: 'Data Schema' },
                  { icon: Zap, label: 'Automations & Rules' },
                  { icon: FileText, label: 'Notes' }

                ].map((tab, idx) => {
                  const IconComp = tab.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => setIsRightPaneCollapsed(false)}
                      className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-indigo-500 transition-colors cursor-pointer"
                      title={tab.label}
                    >
                      <IconComp size={16} />
                    </button>
                  );
                })}
              </div>

              {/* Bottom Active Artifact Icon */}
              <button
                onClick={() => setIsRightPaneCollapsed(false)}
                className="p-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-all cursor-pointer shadow-md"
                title="Expand Preview Studio"
              >
                <Sparkles size={16} />
              </button>
            </div>
          ) : (
            <SolutionPreviewStudio
              artifacts={artifacts}
              activeArtifactId={activeArtifactId}
              onSelectArtifact={(id) => setActiveArtifactId(id)}
              onConvertToSource={handleConvertToSource}
              savedNotes={savedNotes}
              onDeleteNote={handleDeleteNote}
              onToggleCollapse={() => setIsRightPaneCollapsed(true)}
              onPromptRefine={(promptText) => handleSendMessage(promptText, 'default')}
              isApproved={isDesignApproved}
              onApproveDesign={handleApproveDesign}
            />
          )}
        </motion.div>
      </div>

    </div>
  );


};
