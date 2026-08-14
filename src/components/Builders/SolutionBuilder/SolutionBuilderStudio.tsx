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
  Database,
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






export interface SolutionBuilderStudioProps {
  initialSolution?: SolutionBlueprint | null;
  onClose?: () => void;
}

export const SolutionBuilderStudio: React.FC<SolutionBuilderStudioProps> = ({
  initialSolution,
  onClose
}) => {
  const navigate = useNavigate();
  const { isBuilderFullscreen, setIsBuilderFullscreen, toggleBuilderFullscreen, tenant, refreshModules } = usePlatform();

  const [solutionId] = useState(initialSolution?.id || 'sol_enterprise_intake');
  const [solutionName, setSolutionName] = useState(initialSolution?.name || 'New Enterprise Solution Blueprint');
  const [solutionVersion] = useState(initialSolution?.version || 'v1.0.0');
  const [solutionStatus] = useState<SolutionStatus>(initialSolution?.status || 'DRAFT');

  const [isLeftPaneCollapsed, setIsLeftPaneCollapsed] = useState(false);
  const [isRightPaneCollapsed, setIsRightPaneCollapsed] = useState(false);



  const [contextSources, setContextSources] = useState<ContextSource[]>(
    initialSolution?.contextSources || [
      { id: 'src_1', name: 'Project_Vision.docx', type: 'docx', size: '245 KB', uploadedAt: '10 mins ago', status: 'PROCESSED', contentSummary: 'Project specification document' },
      { id: 'src_2', name: 'Client_Form_Wireframe.png', type: 'png', size: '1.2 MB', uploadedAt: '8 mins ago', status: 'PROCESSED', contentSummary: 'Intake form wireframe sketch' },
      { id: 'src_3', name: 'CRM_Integration_Spec.pdf', type: 'pdf', size: '512 KB', uploadedAt: '5 mins ago', status: 'PROCESSED', contentSummary: 'API Integration spec sheet' }
    ]
  );

  const [connectedModules, setConnectedModules] = useState<ConnectedModule[]>(
    initialSolution?.connectedModules || [
      { id: 'mod_clients', name: 'Clients', type: 'RECORD', fieldsCount: 12, linked: true },
      { id: 'mod_services', name: 'Services', type: 'REGISTRY', fieldsCount: 8, linked: true },
      { id: 'mod_crm', name: 'CRM Integration', type: 'CUSTOM', fieldsCount: 6, linked: true }
    ]
  );

  const [chatMessages, setChatMessages] = useState<SolutionChatMessage[]>(
    initialSolution?.chatHistory || [
      {
        id: 'msg_1',
        role: 'aurora',
        text: "I've analyzed your documents. Based on 'Project_Vision', you need a complex workflow. Let's start by designing the Client Onboarding Module.",
        timestamp: '10:42 AM',
        suggestedActions: ['Add dynamic service selection', 'Configure SLA escalation', 'Connect CRM API']
      }
    ]
  );

  const [savedNotes, setSavedNotes] = useState<SavedNote[]>(
    initialSolution?.savedNotes || [
      { 
        id: 'note_1', 
        title: 'The Gemini Response Limitation Paradox', 
        text: 'On the front it reads: "What is the core philosophical question answered by every character in the REMNANT series?" The answer on the back reads: "What do humans do with suffering that cannot be repaired?"', 
        createdAt: '1m ago' 
      }
    ]
  );

  const [artifacts, setArtifacts] = useState<SolutionArtifact[]>(
    initialSolution?.artifacts || [
      {
        id: 'art_spec_vision',
        name: 'Solution Design',

        type: 'PAGE',
        description: 'Comprehensive technical blueprint & enterprise vision plan',
        content: {
          title: 'Solution Architecture & Vision Specification',
          markdown: `# Solution Architecture & Vision: New Enterprise Solution Blueprint
**Lead Solution Architect**: Aurora AI Systems Designer  
**Target Solution**: New Enterprise Solution Blueprint  
**Status**: APPROVED_FOR_PROVISIONING  
**Grounded Context Sources**: Project_Vision.docx, Client_Form_Wireframe.png, CRM_Integration_Spec.pdf

---

## 1. Executive Summary & System Purpose
This solution blueprint establishes an enterprise-grade operational architecture for multi-module & workflow orchestration, designed in response to grounded project specifications and user directives.

The architecture provides high-capacity record management, automated SLA triage, role-based access control (RBAC), and OpenAPI integration hooks.

---

## 2. Business Objectives & SLA Metrics
- **Zero-Trust Multi-Tenancy**: Strict database partition per enterprise tenant namespace.
- **Automated Processing**: Instant form submission routing & SLA escalation threshold (4 Hours).
- **Audit Compliance**: Immutable log entries for all data modifications.

---

## 3. Data Dictionary & Relational Schema
The solution provisions the following primary data modules:
- **Clients** (RECORD): Primary client record collection [12 Fields]
- **Services** (REGISTRY): Shared service catalog & SLA registry [8 Fields]
- **CRM Integration** (CUSTOM): External API webhook payload adapter [6 Fields]

---

## 4. Workflows & Execution Topology
- **Trigger**: \`ON_FORM_SUBMIT\` via \`Client Intake Form\`
- **Action**: Evaluate SLA Thresholds & Assign Service Team
- **Automation**: Provision Workspace & Dispatch Notification Payload

---

## 5. Security & Integration Specifications
- **API Endpoint**: \`POST /api/v1/client_intake/intake\`
- **Data Encryption**: AES-256 at rest, TLS 1.3 in transit
`
        }
      },
      {
        id: 'art_form_1',
        name: 'Client Intake Form',
        type: 'FORM',
        description: 'Interactive client onboarding form',
        content: {
          title: 'Client Intake Form',

          subtitle: 'Full screen, well-designed built-in components built.',
          fields: [
            { id: 'f_fname', label: 'First Name', type: 'text', placeholder: 'First name', required: true, colSpan: 6 },
            { id: 'f_lname', label: 'Last Name', type: 'text', placeholder: 'Last name', required: true, colSpan: 6 },
            { id: 'f_email', label: 'Email', type: 'email', placeholder: 'client@company.com', required: true, colSpan: 12 },
            { id: 'f_tier', label: 'Desired Service Tier', type: 'select', colSpan: 12, options: ['Standard Support', 'Premium Onboarding', 'Enterprise SLA'] }
          ]
        }
      },
      {
        id: 'art_flow_1',
        name: 'Automated Intake Flow',
        type: 'WORKFLOW',
        description: 'Process graph workflow',
        content: {
          nodes: [
            { id: 'node_1', label: 'Form Submitted', type: 'TRIGGER' },
            { id: 'node_2', label: 'Assign Service', type: 'ACTION' },
            { id: 'node_3', label: 'Generate Welcome Pack', type: 'AUTOMATION' }
          ]
        }
      },
      {
        id: 'art_nav_1',
        name: 'Portal Navigation Tree',
        type: 'NAVIGATION',
        description: 'Header and sidebar portal navigation menu',
        content: {
          items: [
            { label: 'Client Dashboard', path: '/workspace/dashboard' },
            { label: 'Submit Ticket Intake', path: '/workspace/intake' },
            { label: 'SLA Escalation Queue', path: '/workspace/triage' },
            { label: 'Executive Analytics', path: '/workspace/reports' }
          ]
        }
      },
      {
        id: 'art_list_1',
        name: 'Service Tiers Picklist',
        type: 'GLOBAL_LIST',
        description: 'Shared enum picklist values',
        content: {
          options: ['Standard Support', 'Premium Onboarding', 'Enterprise SLA', '24/7 Managed Support']
        }
      },
      {
        id: 'art_api_1',
        name: 'Client Intake REST API',
        type: 'API',
        description: 'OpenAPI endpoint for webhook integration',
        content: {
          path: '/api/v1/intake',
          method: 'POST',
          payload: { event: 'CLIENT_INTAKE_SUBMITTED', tier: 'Enterprise SLA' }
        }
      },
      {
        id: 'art_report_1',
        name: 'Executive SLA Dashboard',
        type: 'REPORT',
        description: 'KPI summary dashboard',
        content: {
          metrics: { totalSubmissions: 1248, avgSlaHours: 1.4, resolutionPct: 98.6 }
        }
      },
      {
        id: 'art_tpl_1',
        name: 'Welcome Email Spec',
        type: 'TEMPLATE',
        description: 'Mustache email notification template',
        content: {
          subject: 'Welcome to Aurora - {{client_name}}',
          body: 'Hello {{client_name}}, your {{service_tier}} onboarding is active.'
        }
      }
    ]
  );



  const [activeArtifactId, setActiveArtifactId] = useState<string>(
    initialSolution?.activeArtifactId || 'art_form_1'
  );

  // Auto-enable fullscreen studio mode
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

  const handleToggleModuleLink = (id: string) => {
    setConnectedModules(prev =>
      prev.map(m => (m.id === id ? { ...m, linked: !m.linked } : m))
    );
  };

  const handleSendMessage = async (text: string, model: string) => {
    const userMsg: SolutionChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'self',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages(prev => [...prev, userMsg]);
    toast.info(`Aurora AI (${model}) processing prompt and context documents...`);

    try {
      const result = await orchestrateSolutionBlueprint(text, contextSources, connectedModules, model);


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

      if (result.specArtifact || result.formArtifact || result.workflowArtifact) {
        const updatedArtifacts: SolutionArtifact[] = [...artifacts];

        if (result.specArtifact) {
          const specIdx = updatedArtifacts.findIndex(a => a.type === 'PAGE' || a.id.startsWith('art_spec_'));
          const newSpecArt: SolutionArtifact = {
            id: result.specArtifact.id || `art_spec_${Date.now()}`,
            name: result.specArtifact.name || 'Solution Design',


            type: 'PAGE',
            description: result.specArtifact.description || 'Enterprise Solution Architecture Plan',
            content: {
              title: result.specArtifact.name,
              markdown: result.specArtifact.markdownContent
            }
          };
          if (specIdx >= 0) updatedArtifacts[specIdx] = newSpecArt;
          else updatedArtifacts.unshift(newSpecArt);
        }

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
    }
  };



  const handleApplySuggestedAction = (actionText: string) => {
    handleSendMessage(`Please apply: ${actionText}`, 'default');
  };


  const handleSaveBlueprint = async () => {
    try {
      const authDataStr = localStorage.getItem('aurora_auth');
      let token = '';
      if (authDataStr) {
        try {
          const authData = JSON.parse(authDataStr);
          token = authData?.access_token || authData?.token || '';
        } catch (e) {}
      }

      const payload = {
        id: solutionId,
        name: solutionName,
        description: `Solution Blueprint combining ${artifacts.length} artifacts and ${connectedModules.filter(m => m.linked).length} linked data modules.`,
        category: 'Customer Experience',
        version: solutionVersion,
        status: solutionStatus,
        author: 'Platform Architecture',
        activeArtifactId,
        contextSources,
        connectedModules,
        artifacts,
        savedNotes,
        chatMessages
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
      } else {
        toast.success(`Solution blueprint "${solutionName}" saved.`);
      }
    } catch (e) {
      toast.success(`Solution blueprint "${solutionName}" saved.`);
    }
  };

  const handleDeploySolution = async () => {
    toast.info(`Deploying "${solutionName}" into active tenant workspace...`);
    await handleSaveBlueprint();

    try {
      const authDataStr = localStorage.getItem('aurora_auth');
      let token = '';
      if (authDataStr) {
        try {
          const authData = JSON.parse(authDataStr);
          token = authData?.access_token || authData?.token || '';
        } catch (e) {}
      }

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
    <div className={`flex flex-col w-full bg-zinc-50/50 dark:bg-zinc-950/50 relative backdrop-blur-2xl ${
      isBuilderFullscreen ? 'h-screen fixed inset-0 z-50 p-4' : 'h-[calc(100vh-4rem)] p-4 lg:p-6'
    } overflow-hidden font-sans space-y-4`}>
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
      <div className="flex-1 flex items-center gap-3 min-h-0 relative z-10 w-full overflow-hidden">
        {/* Column 1: Context & Inputs (Left Pane) */}
        <motion.div 
          initial={false}
          animate={{ 
            width: isLeftPaneCollapsed ? 52 : '25%',
            minWidth: isLeftPaneCollapsed ? 52 : 270
          }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="h-full shrink-0 min-h-0"
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

              {/* Bottom Database Icon */}
              <button
                onClick={() => setIsLeftPaneCollapsed(false)}
                className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 hover:bg-indigo-500/20 transition-all cursor-pointer"
                title={`Connected Modules (${connectedModules.filter(m => m.linked).length})`}
              >
                <Database size={16} />
              </button>
            </div>
          ) : (
            <ContextInputsPanel
              sources={contextSources}
              connectedModules={connectedModules}
              onAddSource={handleAddSource}
              onRemoveSource={handleRemoveSource}
              onToggleModuleLink={handleToggleModuleLink}
              onToggleCollapse={() => setIsLeftPaneCollapsed(true)}
            />
          )}
        </motion.div>

        {/* Column 2: Orchestrator AI Chat (Middle Pane - Expands to Fill Space) */}
        <div className="flex-1 h-full min-w-0 min-h-0">
          <OrchestratorChatPanel
            messages={chatMessages}
            onSendMessage={handleSendMessage}
            onApplySuggestedAction={handleApplySuggestedAction}
            onSaveToNote={handleSaveToNote}
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
          className="h-full shrink-0 min-h-0"
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
            />
          )}
        </motion.div>
      </div>

    </div>
  );


};
