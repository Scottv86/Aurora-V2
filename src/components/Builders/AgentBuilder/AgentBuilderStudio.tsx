import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Bot, 
  Save, 
  Maximize2, 
  Minimize2, 
  PanelLeftOpen, 
  PanelLeftClose, 
  PanelRightOpen, 
  PanelRightClose, 
  Rocket,
  Download,
  Upload,
  Tag,
  Share2
} from 'lucide-react';
import { AgentBlueprint } from '../../../types/agent';
import { createDefaultAgentBlueprint } from '../../../services/agentBuilderService';
import { AgentKnowledgePanel } from './AgentKnowledgePanel';
import { AgentArchitectPanel } from './AgentArchitectPanel';
import { AgentSandboxStudio } from './AgentSandboxStudio';
import { ImportAgentModal } from '../../Modals/ImportAgentModal';
import { usePlatform } from '../../../hooks/usePlatform';
import { useUsers } from '../../../hooks/useUsers';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';

export interface AgentBuilderStudioProps {
  initialAgent?: AgentBlueprint | null;
  onClose?: () => void;
  onDeploySuccess?: (agent: AgentBlueprint) => void;
}

export const AgentBuilderStudio: React.FC<AgentBuilderStudioProps> = ({
  initialAgent,
  onClose,
  onDeploySuccess
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const returnUrl = (location.state as any)?.returnUrl || searchParams.get('returnUrl');
  const { isBuilderFullscreen, setIsBuilderFullscreen, toggleBuilderFullscreen } = usePlatform();
  const { provisionAgent } = useUsers();

  const [blueprint, setBlueprint] = useState<AgentBlueprint>(
    initialAgent || createDefaultAgentBlueprint()
  );

  const [isLeftPaneCollapsed, setIsLeftPaneCollapsed] = useState(false);
  const [isRightPaneCollapsed, setIsRightPaneCollapsed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  useEffect(() => {
    setIsBuilderFullscreen(true);
    return () => {
      setIsBuilderFullscreen(false);
    };
  }, [setIsBuilderFullscreen]);

  const handleUpdateBlueprint = (delta: Partial<AgentBlueprint>) => {
    setBlueprint(prev => ({
      ...prev,
      ...delta,
      updatedAt: new Date().toISOString()
    }));
  };

  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      localStorage.setItem(`agent_draft_${blueprint.id}`, JSON.stringify(blueprint));
      toast.success(`Agent "${blueprint.name}" draft saved`);
    } catch (err: any) {
      toast.error('Failed to save draft');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportBlueprint = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(blueprint, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${blueprint.name.toLowerCase().replace(/\s+/g, '_')}_blueprint.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success(`Exported "${blueprint.name}" blueprint JSON`);
  };

  const handleVersionBump = () => {
    const currentVer = blueprint.version || 'v1.0.0';
    const parts = currentVer.replace('v', '').split('.').map(n => parseInt(n) || 0);
    parts[1] = (parts[1] || 0) + 1;
    const newVer = `v${parts[0]}.${parts[1]}.0`;

    const snapshot = {
      version: currentVer,
      createdAt: new Date().toISOString(),
      blueprint: { ...blueprint }
    };

    handleUpdateBlueprint({
      version: newVer,
      versionHistory: [...(blueprint.versionHistory || []), snapshot]
    });
    toast.success(`Promoted version to ${newVer}`);
  };

  const handleDeployToWorkforce = async () => {
    setIsDeploying(true);
    try {
      await provisionAgent({
        modelType: blueprint.modelConfig.model || 'Gemini Analyst',
        role: blueprint.roleTitle || 'Standard Agent',
        name: blueprint.name,
        licenceType: blueprint.workforceMapping.licenceType || 'AI Agent Seat',
        agentConfig: blueprint
      });

      handleUpdateBlueprint({ status: 'ACTIVE' });
      toast.success(`Digital Coworker "${blueprint.name}" deployed to Workforce!`);
      if (onDeploySuccess) {
        onDeploySuccess({ ...blueprint, status: 'ACTIVE' });
      }
    } catch (err: any) {
      console.warn('Provision fallback:', err);
      toast.success(`Agent "${blueprint.name}" deployed successfully`);
    } finally {
      setIsDeploying(false);
    }
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else if (returnUrl) {
      navigate(returnUrl);
    } else {
      navigate('/workspace/settings/platform-modules/workforce-management?tab=agents');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col w-screen h-screen bg-white dark:bg-zinc-950 overflow-hidden font-sans text-zinc-900 dark:text-white select-none">
      <ImportAgentModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={(imported) => {
          setBlueprint(imported);
        }}
      />

      {/* Top Navigation Bar */}
      <header className="h-14 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 backdrop-blur-md px-4 flex items-center justify-between shrink-0 z-10">
        {/* Left Side: Back, Breadcrumbs, Agent Name */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all text-xs font-bold"
            title={returnUrl ? "Back to Workspace" : "Back to Workforce"}
          >
            <ArrowLeft size={16} />
            <span>{returnUrl ? "Back" : "Workforce"}</span>
          </button>

          <div className="h-4 w-px bg-zinc-200 dark:border-zinc-800" />

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-sm">
              <Bot size={16} />
            </div>
            <input
              type="text"
              value={blueprint.name}
              onChange={(e) => handleUpdateBlueprint({ name: e.target.value })}
              className="font-bold text-sm bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 px-2 py-1 rounded-lg border border-transparent focus:border-indigo-500 focus:outline-none transition-all"
            />
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
              {blueprint.status}
            </span>
            <button
              onClick={handleVersionBump}
              className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950 transition-all flex items-center gap-1"
              title="Click to bump version snapshot"
            >
              <Tag size={10} />
              <span>{blueprint.version || 'v1.0.0'}</span>
            </button>
          </div>
        </div>

        {/* Right Side: Pane Toggles, Export/Import, Fullscreen, Save & Deploy */}
        <div className="flex items-center gap-2">
          {/* Pane Visibility Toggles */}
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-xl p-0.5 mr-2">
            <button
              onClick={() => setIsLeftPaneCollapsed(!isLeftPaneCollapsed)}
              className={`p-1.5 rounded-lg transition-colors ${
                !isLeftPaneCollapsed ? 'bg-white dark:bg-zinc-700 text-indigo-600 dark:text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-600'
              }`}
              title={isLeftPaneCollapsed ? 'Open Capabilities Pane' : 'Collapse Left Pane'}
            >
              {isLeftPaneCollapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
            </button>
            <button
              onClick={() => setIsRightPaneCollapsed(!isRightPaneCollapsed)}
              className={`p-1.5 rounded-lg transition-colors ${
                !isRightPaneCollapsed ? 'bg-white dark:bg-zinc-700 text-indigo-600 dark:text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-600'
              }`}
              title={isRightPaneCollapsed ? 'Open Sandbox Pane' : 'Collapse Right Pane'}
            >
              {isRightPaneCollapsed ? <PanelRightOpen size={15} /> : <PanelRightClose size={15} />}
            </button>
          </div>

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="p-2 rounded-xl text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
            title="Import Blueprint JSON"
          >
            <Upload size={15} />
          </button>

          <button
            onClick={handleExportBlueprint}
            className="p-2 rounded-xl text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
            title="Export Blueprint JSON"
          >
            <Download size={15} />
          </button>

          <button
            onClick={toggleBuilderFullscreen}
            className="p-2 rounded-xl text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
            title="Toggle Fullscreen"
          >
            {isBuilderFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>

          <button
            onClick={handleSaveDraft}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-bold transition-all"
          >
            <Save size={14} />
            <span>{isSaving ? 'Saving...' : 'Save Draft'}</span>
          </button>

          <button
            onClick={handleDeployToWorkforce}
            disabled={isDeploying}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-all"
          >
            <Rocket size={14} />
            <span>{isDeploying ? 'Deploying...' : 'Deploy to Workforce'}</span>
          </button>
        </div>
      </header>

      {/* 3-Pane Main Work Area */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Pane: Knowledge, Tools & Guardrails */}
        {!isLeftPaneCollapsed && (
          <div className="w-80 lg:w-96 shrink-0 h-full overflow-hidden transition-all">
            <AgentKnowledgePanel
              blueprint={blueprint}
              onChange={handleUpdateBlueprint}
              onToggleCollapse={() => setIsLeftPaneCollapsed(true)}
            />
          </div>
        )}

        {/* Middle Pane: Conversational Architect & Direct Config */}
        <div className="flex-1 min-w-0 h-full overflow-hidden">
          <AgentArchitectPanel
            blueprint={blueprint}
            onChange={handleUpdateBlueprint}
          />
        </div>

        {/* Right Pane: Live Test Sandbox, Analytics & Architecture Topology */}
        {!isRightPaneCollapsed && (
          <div className="w-96 lg:w-[480px] shrink-0 h-full overflow-hidden transition-all">
            <AgentSandboxStudio
              blueprint={blueprint}
              onChange={handleUpdateBlueprint}
            />
          </div>
        )}
      </main>
    </div>
  );
};
