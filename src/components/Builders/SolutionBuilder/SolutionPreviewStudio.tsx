import React, { useState } from 'react';
import { 
  GitBranch, 
  ChevronDown, 
  Check, 
  FileText, 
  Layers, 
  ArrowRight,
  Sparkles,
  PanelRightClose,
  ArrowLeft,
  BarChart2,
  Globe,
  CheckCircle2,
  BookOpen,
  Copy,
  HardDrive,
  Trash2,
  Maximize2,
  Zap,
  Plug,
  ShieldCheck,
  Send,
  X
} from 'lucide-react';
import { SolutionArtifact, SavedNote } from '../../../types/solutions';
import { DrivePickerModal } from '../../Drive/DrivePickerModal';
import { DriveService, convertMarkdownToDocumentHtml } from '../../../services/driveService';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';


export interface SolutionPreviewStudioProps {
  artifacts: SolutionArtifact[];
  activeArtifactId?: string;
  onSelectArtifact: (id: string) => void;
  onConvertToSource?: (name: string, content: string) => void;
  savedNotes?: SavedNote[];
  onDeleteNote?: (id: string) => void;
  onToggleCollapse?: () => void;
  onPromptRefine?: (promptText: string) => void;
}

export const SolutionPreviewStudio: React.FC<SolutionPreviewStudioProps> = ({
  artifacts,
  activeArtifactId,
  onSelectArtifact,
  onConvertToSource,
  savedNotes = [],
  onDeleteNote,
  onToggleCollapse,
  onPromptRefine
}) => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'grid' | 'detail'>('grid');
  const [selectedArtifactIdState, setSelectedArtifactIdState] = useState<string | null>(activeArtifactId || null);
  const [tierDropdownValue, setTierDropdownValue] = useState('Standard Support');

  const [isTierOpen, setIsTierOpen] = useState(false);
  const [isDrivePickerOpen, setIsDrivePickerOpen] = useState(false);
  const [isFullModalOpen, setIsFullModalOpen] = useState(false);
  const [floatingPrompt, setFloatingPrompt] = useState('');

  const activeArtifact = artifacts.find(a => a.id === (selectedArtifactIdState || activeArtifactId)) || artifacts[0];

  const handleSaveToDrive = (driveType: any, folderId: string | null, folderName: string) => {
    if (!activeArtifact) return;

    const markdown = activeArtifact.content?.markdown || activeArtifact.content?.text || JSON.stringify(activeArtifact.content, null, 2);
    const htmlContent = convertMarkdownToDocumentHtml(markdown);
    const docName = `${activeArtifact.name}.docx`;

    DriveService.saveDocument(
      null,
      docName,
      htmlContent,
      driveType,
      folderId,
      'Lead Solution Architect'
    );

    setIsDrivePickerOpen(false);
    toast.success(`Saved "${docName}" to Aurora Drive in folder "${folderName}"!`);
  };


  const handleTileClick = (artId: string) => {
    setSelectedArtifactIdState(artId);
    onSelectArtifact(artId);
    setViewMode('detail');
  };

  const handleOpenFullModal = (artId?: string) => {
    if (artId) {
      setSelectedArtifactIdState(artId);
      onSelectArtifact(artId);
    }
    setIsFullModalOpen(true);
  };

  const handleSendFloatingPrompt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!floatingPrompt.trim()) return;
    const promptText = `Refine artifact "${activeArtifact?.name}": ${floatingPrompt}`;
    if (onPromptRefine) {
      onPromptRefine(promptText);
    } else {
      toast.info(`Prompt sent: ${promptText}`);
    }
    setFloatingPrompt('');
  };

  const handleOpenDedicatedBuilder = () => {
    if (!activeArtifact) return;
    switch (activeArtifact.type) {
      case 'FORM':
        navigate('/workspace/settings/platform-modules/forms-library');
        break;
      case 'WORKFLOW':
        navigate('/workspace/settings/platform-modules/workflows-library');
        break;
      case 'NAVIGATION':
        navigate('/workspace/settings/navigation');
        break;
      case 'MODULE':
        navigate('/workspace/settings/platform-modules');
        break;
      case 'AUTOMATION':
        navigate('/workspace/settings/platform-modules/automation-management');
        break;
      case 'INTEGRATION':
        navigate('/workspace/settings/platform-modules/integration-management');
        break;
      case 'VALIDATION':
        navigate('/workspace/settings/platform-modules/validations-library');
        break;
      case 'REPORT':
        navigate('/workspace/settings/platform-modules/report-management');
        break;
      case 'SITE':
        navigate('/workspace/settings/platform-modules/sites');
        break;
      case 'PAGE':
        navigate('/workspace/settings/pages');
        break;
      case 'TEMPLATE':
        navigate('/workspace/settings/platform-modules/document-generation');
        break;
      case 'PERMISSION':
        navigate('/workspace/settings/workforce?tab=groups');
        break;
      default:
        toast.info(`Opening ${activeArtifact.name} in dedicated builder...`);
        break;
    }
  };


  const getArtifactTileTheme = (art: SolutionArtifact) => {
    switch (art.type) {
      case 'PERMISSION':
        return {
          bg: 'bg-rose-500/10 dark:bg-rose-500/15',
          border: 'border-rose-500/30 hover:border-rose-500/60',
          text: 'text-rose-600 dark:text-rose-400',
          badge: 'bg-rose-500/20 text-rose-500',
          icon: ShieldCheck,
          categoryLabel: 'Roles & Permissions Matrix'
        };
      case 'FORM':
        return {
          bg: 'bg-purple-500/10 dark:bg-purple-500/15',
          border: 'border-purple-500/30 hover:border-purple-500/60',
          text: 'text-purple-600 dark:text-purple-400',
          badge: 'bg-purple-500/20 text-purple-500',
          icon: FileText,
          categoryLabel: 'Interactive Form Builder'
        };
      case 'WORKFLOW':
        return {
          bg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
          border: 'border-emerald-500/30 hover:border-emerald-500/60',
          text: 'text-emerald-600 dark:text-emerald-400',
          badge: 'bg-emerald-500/20 text-emerald-500',
          icon: GitBranch,
          categoryLabel: 'Visual Workflow Builder'
        };
      case 'MODULE':
        return {
          bg: 'bg-blue-500/10 dark:bg-blue-500/15',
          border: 'border-blue-500/30 hover:border-blue-500/60',
          text: 'text-blue-600 dark:text-blue-400',
          badge: 'bg-blue-500/20 text-blue-500',
          icon: Layers,
          categoryLabel: 'Data Module Schema'
        };
      case 'NAVIGATION':
        return {
          bg: 'bg-teal-500/10 dark:bg-teal-500/15',
          border: 'border-teal-500/30 hover:border-teal-500/60',
          text: 'text-teal-600 dark:text-teal-400',
          badge: 'bg-teal-500/20 text-teal-500',
          icon: Globe,
          categoryLabel: 'Navigation Tree Builder'
        };
      case 'AUTOMATION':
        return {
          bg: 'bg-amber-500/10 dark:bg-amber-500/15',
          border: 'border-amber-500/30 hover:border-amber-500/60',
          text: 'text-amber-600 dark:text-amber-400',
          badge: 'bg-amber-500/20 text-amber-500',
          icon: Zap,
          categoryLabel: 'Automation Rules Builder'
        };
      case 'INTEGRATION':
      case 'API':
        return {
          bg: 'bg-rose-500/10 dark:bg-rose-500/15',
          border: 'border-rose-500/30 hover:border-rose-500/60',
          text: 'text-rose-600 dark:text-rose-400',
          badge: 'bg-rose-500/20 text-rose-500',
          icon: Plug,
          categoryLabel: 'Integration & API Connector'
        };
      case 'VALIDATION':
        return {
          bg: 'bg-sky-500/10 dark:bg-sky-500/15',
          border: 'border-sky-500/30 hover:border-sky-500/60',
          text: 'text-sky-600 dark:text-sky-400',
          badge: 'bg-sky-500/20 text-sky-500',
          icon: ShieldCheck,
          categoryLabel: 'Validation Rules Builder'
        };
      case 'REPORT':
        return {
          bg: 'bg-indigo-500/10 dark:bg-indigo-500/15',
          border: 'border-indigo-500/30 hover:border-indigo-500/60',
          text: 'text-indigo-600 dark:text-indigo-400',
          badge: 'bg-indigo-500/20 text-indigo-500',
          icon: BarChart2,
          categoryLabel: 'Reports & Analytics Builder'
        };
      case 'SITE':
        return {
          bg: 'bg-teal-500/10 dark:bg-teal-500/15',
          border: 'border-teal-500/30 hover:border-teal-500/60',
          text: 'text-teal-600 dark:text-teal-400',
          badge: 'bg-teal-500/20 text-teal-500',
          icon: Globe,
          categoryLabel: 'Sites & Portal Builder'
        };
      case 'TEMPLATE':
        return {
          bg: 'bg-purple-500/10 dark:bg-purple-500/15',
          border: 'border-purple-500/30 hover:border-purple-500/60',
          text: 'text-purple-600 dark:text-purple-400',
          badge: 'bg-purple-500/20 text-purple-500',
          icon: FileText,
          categoryLabel: 'Document Templates Builder'
        };
      case 'GLOBAL_LIST':
        return {
          bg: 'bg-amber-500/10 dark:bg-amber-500/15',
          border: 'border-amber-500/30 hover:border-amber-500/60',
          text: 'text-amber-600 dark:text-amber-400',
          badge: 'bg-amber-500/20 text-amber-500',
          icon: CheckCircle2,
          categoryLabel: 'Global Picklists Registry'
        };
      case 'PAGE':
        return {
          bg: 'bg-gradient-to-br from-indigo-500/15 via-purple-500/10 to-emerald-500/15',
          border: 'border-indigo-500/40 hover:border-indigo-500/80 ring-1 ring-indigo-500/20',
          text: 'text-indigo-600 dark:text-indigo-400',
          badge: 'bg-indigo-500/20 text-indigo-500 font-black',
          icon: BookOpen,
          categoryLabel: 'Architecture & Vision Plan'
        };
      default:
        return {
          bg: 'bg-zinc-500/10 dark:bg-zinc-500/15',
          border: 'border-zinc-500/30 hover:border-zinc-500/60',
          text: 'text-zinc-600 dark:text-zinc-400',
          badge: 'bg-zinc-500/20 text-zinc-500',
          icon: Sparkles,
          categoryLabel: 'Solution Artifact'
        };
    }
  };

  /* Render Custom Interactive Preview Viewports for all 12 Builders */
  const renderArtifactBodyContent = (art: SolutionArtifact, isFullscreen = false) => {
    if (!art) return null;

    switch (art.type) {
      case 'PAGE':
        /* SOLUTION ARCHITECTURE & VISION SPECIFICATION PREVIEW */
        return (
          <div className={`bg-white/90 dark:bg-zinc-900/90 border border-indigo-500/30 rounded-3xl p-6 shadow-2xl space-y-5 ${isFullscreen ? 'max-w-5xl mx-auto' : ''}`}>
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                  <BookOpen size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-zinc-900 dark:text-white flex items-center gap-2">
                    <span>{art.name}</span>
                  </h3>
                  <p className="text-xs text-zinc-500 font-medium mt-0.5">
                    {art.description || 'Enterprise Solution Architecture Specification'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 text-[10px] font-black rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 uppercase tracking-wider">
                  APPROVED SPEC
                </span>

                <button
                  onClick={() => setIsDrivePickerOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Save this Solution Design document to Aurora Drive"
                >
                  <HardDrive size={14} />
                  <span>Save to Drive</span>
                </button>

                <button
                  onClick={() => {
                    const content = art.content?.markdown || art.content?.text || JSON.stringify(art.content, null, 2);
                    navigator.clipboard.writeText(content);
                    toast.success('Architecture markdown copied to clipboard!');
                  }}
                  className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
                  title="Copy Markdown Spec"
                >
                  <Copy size={14} />
                </button>
              </div>
            </div>

            <div className="p-6 bg-zinc-50 dark:bg-zinc-950 rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 space-y-4 shadow-inner">
              {((art.content?.markdown || art.content?.text || '') as string)
                .split('\n')
                .map((line: string, idx: number) => {
                  const trimmed = line.trim();
                  if (!trimmed) return <div key={idx} className="h-1" />;

                  if (trimmed.startsWith('# ')) {
                    return (
                      <h1 key={idx} className="text-base font-black text-indigo-600 dark:text-indigo-400 border-b border-indigo-500/20 pb-2 mb-3 tracking-tight flex items-center gap-2">
                        <BookOpen size={18} className="text-indigo-500" />
                        <span>{trimmed.replace('# ', '')}</span>
                      </h1>
                    );
                  }

                  if (trimmed.startsWith('## ')) {
                    return (
                      <div key={idx} className="mt-5 mb-2.5 flex items-center gap-2 font-black text-xs uppercase tracking-wider text-zinc-900 dark:text-white bg-indigo-500/10 border-l-4 border-indigo-500 px-3 py-1.5 rounded-r-xl">
                        <FileText size={13} className="text-indigo-500 shrink-0" />
                        <span>{trimmed.replace('## ', '')}</span>
                      </div>
                    );
                  }

                  if (trimmed.startsWith('> ')) {
                    return (
                      <blockquote key={idx} className="p-3 my-2 bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-teal-500/10 border-l-4 border-teal-500 rounded-r-2xl text-xs font-medium text-zinc-700 dark:text-zinc-200 italic shadow-xs">
                        {trimmed.replace('> ', '').replace(/\*\*(.*?)\*\*/g, '$1')}
                      </blockquote>
                    );
                  }

                  if (trimmed === '---') {
                    return <hr key={idx} className="border-zinc-200 dark:border-zinc-800 my-4" />;
                  }

                  const parts = trimmed.split('**');
                  return (
                    <p key={idx} className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed font-medium">
                      {parts.map((part, pIdx) => (
                        pIdx % 2 === 1 ? (
                          <strong key={pIdx} className="font-bold text-zinc-900 dark:text-white">{part}</strong>
                        ) : (
                          <span key={pIdx}>{part}</span>
                        )
                      ))}
                    </p>
                  );
                })}
            </div>
          </div>
        );

      case 'MODULE':
        /* DATA MODULE SCHEMA PREVIEW */
        return (
          <div className={`bg-white/90 dark:bg-zinc-900/90 border border-blue-500/30 rounded-3xl p-6 shadow-2xl space-y-5 ${isFullscreen ? 'max-w-6xl mx-auto' : ''}`}>
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
                  <Layers size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white">{art.name}</h3>
                  <p className="text-xs text-zinc-500">Relational Database Table & Schema Definition</p>
                </div>
              </div>
              <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-blue-500/10 text-blue-500 uppercase">MODULE SCHEMA</span>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800">
              <table className="w-full text-left text-xs font-sans">
                <thead className="bg-zinc-100 dark:bg-zinc-950 text-zinc-500 uppercase text-[10px] tracking-wider border-b border-zinc-200 dark:border-zinc-800">
                  <tr>
                    <th className="p-3 font-bold">Field Key</th>
                    <th className="p-3 font-bold">Display Label</th>
                    <th className="p-3 font-bold">Type</th>
                    <th className="p-3 font-bold">Validation</th>
                    <th className="p-3 font-bold">Sample Record Mockup</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-800 dark:text-zinc-200">
                  {(art.content?.fields || [
                    { id: 'f_id', label: 'Record ID', type: 'UUID', required: true, sample: 'rec_940218' },
                    { id: 'f_subject', label: 'Subject Title', type: 'VARCHAR(255)', required: true, sample: 'Tier-2 Escalation Alert' },
                    { id: 'f_category', label: 'Classification Tier', type: 'ENUM', required: true, sample: 'Tier 1 Standard' },
                    { id: 'f_owner', label: 'Owner Stakeholder Email', type: 'EMAIL', required: true, sample: 'alex@aurora.io' },
                    { id: 'f_created', label: 'Created Timestamp', type: 'DATETIME', required: false, sample: '2026-08-15 10:04' }
                  ]).map((field: any, i: number) => (
                    <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                      <td className="p-3 font-mono text-[11px] text-indigo-500 font-bold">{field.id}</td>
                      <td className="p-3 font-semibold">{field.label}</td>
                      <td className="p-3 font-mono text-[10px] text-purple-400">{field.type}</td>
                      <td className="p-3 text-[10px]">
                        {field.required ? (
                          <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-500 font-bold">Required</span>
                        ) : (
                          <span className="text-zinc-400">Optional</span>
                        )}
                      </td>
                      <td className="p-3 font-mono text-[11px] text-emerald-400">{field.sample || 'Sample Data'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'REPORT':
        /* REPORTS & ANALYTICS DASHBOARD PREVIEW */
        return (
          <div className={`bg-white/90 dark:bg-zinc-900/90 border border-indigo-500/30 rounded-3xl p-6 shadow-2xl space-y-5 ${isFullscreen ? 'max-w-6xl mx-auto' : ''}`}>
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                  <BarChart2 size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white">{art.name}</h3>
                  <p className="text-xs text-zinc-500">Analytics Dashboard & KPI Summary Cards Canvas</p>
                </div>
              </div>
              <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-indigo-500/10 text-indigo-500 uppercase">REPORTS & ANALYTICS</span>
            </div>

            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                <span className="text-[10px] font-bold text-zinc-400 uppercase">Total Submissions</span>
                <div className="text-2xl font-black text-zinc-900 dark:text-white mt-1">1,248</div>
                <span className="text-[10px] text-emerald-500 font-bold">↑ 18.4% vs last month</span>
              </div>
              <div className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                <span className="text-[10px] font-bold text-zinc-400 uppercase">Avg SLA Resolution Time</span>
                <div className="text-2xl font-black text-indigo-500 mt-1">1.8 Hours</div>
                <span className="text-[10px] text-indigo-400 font-bold">Target: &lt; 4.0 Hours</span>
              </div>
              <div className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                <span className="text-[10px] font-bold text-zinc-400 uppercase">SLA Compliance Rate</span>
                <div className="text-2xl font-black text-emerald-500 mt-1">98.2%</div>
                <span className="text-[10px] text-emerald-500 font-bold">Passed Audit Checks</span>
              </div>
            </div>

            {/* Interactive Bar Chart Simulation */}
            <div className="p-5 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-zinc-800 dark:text-zinc-200">
                <span>Monthly Case Volume Breakdown</span>
                <span className="text-[10px] text-zinc-400 font-mono">2026 Q3 Data</span>
              </div>
              <div className="h-32 flex items-end justify-between gap-3 pt-4 border-b border-zinc-200 dark:border-zinc-800 pb-2">
                {[
                  { label: 'Jan', height: '60%', count: 420 },
                  { label: 'Feb', height: '80%', count: 680 },
                  { label: 'Mar', height: '45%', count: 310 },
                  { label: 'Apr', height: '95%', count: 890 },
                  { label: 'May', height: '70%', count: 540 },
                  { label: 'Jun', height: '85%', count: 720 }
                ].map((bar, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1 group">
                    <div className="w-full bg-indigo-500/20 group-hover:bg-indigo-500/40 rounded-t-lg transition-all relative overflow-hidden" style={{ height: bar.height }}>
                      <div className="absolute inset-0 bg-gradient-to-t from-indigo-600 to-teal-400 opacity-80" />
                    </div>
                    <span className="text-[10px] font-bold text-zinc-400">{bar.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'AUTOMATION':
        /* AUTOMATION RULES PIPELINE PREVIEW */
        return (
          <div className={`bg-white/90 dark:bg-zinc-900/90 border border-amber-500/30 rounded-3xl p-6 shadow-2xl space-y-5 ${isFullscreen ? 'max-w-5xl mx-auto' : ''}`}>
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  <Zap size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white">{art.name}</h3>
                  <p className="text-xs text-zinc-500">Automated Workflow Trigger & Action Rules Pipeline</p>
                </div>
              </div>
              <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-amber-500/10 text-amber-500 uppercase">AUTOMATION PIPELINE</span>
            </div>

            <div className="space-y-3">
              <div className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-500 font-bold flex items-center justify-center text-xs">⚡</div>
                  <div>
                    <span className="text-xs font-bold text-zinc-900 dark:text-white">Trigger Event</span>
                    <span className="text-[10px] text-zinc-400 font-mono block">ON_RECORD_SUBMITTED (Intake Form)</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-500">Active Trigger</span>
              </div>

              <div className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-between ml-4 border-l-4 border-l-amber-500">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-500 font-bold flex items-center justify-center text-xs">IF</div>
                  <div>
                    <span className="text-xs font-bold text-zinc-900 dark:text-white">Condition Evaluation Rule</span>
                    <span className="text-[10px] text-zinc-400 font-mono block">IF (tier == &apos;Tier 3 Executive&apos; OR total &gt; 10000)</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-500">Evaluate Formula</span>
              </div>

              <div className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-between ml-8 border-l-4 border-l-emerald-500">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-500 font-bold flex items-center justify-center text-xs">➜</div>
                  <div>
                    <span className="text-xs font-bold text-zinc-900 dark:text-white">Action Execution Sequence</span>
                    <span className="text-[10px] text-zinc-400 font-mono block">DISPATCH_WEBHOOK + ASSIGN_SERVICE_TEAM + START_SLA_TIMER(4H)</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-500">Execute Actions</span>
              </div>
            </div>
          </div>
        );

      case 'INTEGRATION':
      case 'API':
        /* INTEGRATION & API CONNECTOR PREVIEW */
        return (
          <div className={`bg-white/90 dark:bg-zinc-900/90 border border-rose-500/30 rounded-3xl p-6 shadow-2xl space-y-5 ${isFullscreen ? 'max-w-5xl mx-auto' : ''}`}>
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
                  <Plug size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white">{art.name}</h3>
                  <p className="text-xs text-zinc-500">Third-Party Integration Connector & API Mapping Matrix</p>
                </div>
              </div>
              <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-rose-500/10 text-rose-500 uppercase">POST /api/v1/intake</span>
            </div>

            <div className="space-y-3">
              <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800 font-mono text-xs text-emerald-400 overflow-x-auto leading-relaxed">
                <span className="text-zinc-500">// OpenAPI Integration Specification Payload</span><br />
                {JSON.stringify(art.content?.payload || {
                  endpoint: 'https://api.aurora.io/v1/solutions/intake',
                  method: 'POST',
                  authentication: 'Bearer OAuth2_Token',
                  headers: { 'Content-Type': 'application/json', 'x-tenant-id': 'tenant_enterprise_01' },
                  dataSchemaMapping: {
                    subject: '{{form.f_title}}',
                    classification: '{{form.f_category}}',
                    ownerEmail: '{{form.f_owner}}'
                  }
                }, null, 2)}
              </div>
            </div>
          </div>
        );

      case 'VALIDATION':
        /* VALIDATION RULES PREVIEW */
        return (
          <div className={`bg-white/90 dark:bg-zinc-900/90 border border-sky-500/30 rounded-3xl p-6 shadow-2xl space-y-5 ${isFullscreen ? 'max-w-5xl mx-auto' : ''}`}>
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-sky-500/10 text-sky-500 border border-sky-500/20">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white">{art.name}</h3>
                  <p className="text-xs text-zinc-500">Field & Business Data Quality Validation Ruleset</p>
                </div>
              </div>
              <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-sky-500/10 text-sky-500 uppercase">VALIDATION RULEBOOK</span>
            </div>

            <div className="space-y-3">
              <div className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-zinc-900 dark:text-white">
                  <span>Rule: Stakeholder Email Validation</span>
                  <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-500 text-[10px]">BLOCKING ERROR</span>
                </div>
                <div className="p-2.5 bg-zinc-900 rounded-xl font-mono text-[11px] text-indigo-400">
                  {"REGEX_MATCH(f_owner, '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$')"}
                </div>
                <p className="text-xs text-rose-500 font-medium italic">
                  &quot;Please provide a valid stakeholder email address to submit intake.&quot;
                </p>
              </div>
            </div>
          </div>
        );

      case 'TEMPLATE':
        /* DOCUMENT & EMAIL TEMPLATES PREVIEW */
        return (
          <div className={`bg-white/90 dark:bg-zinc-900/90 border border-purple-500/30 rounded-3xl p-6 shadow-2xl space-y-5 ${isFullscreen ? 'max-w-5xl mx-auto' : ''}`}>
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-500 border border-purple-500/20">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white">{art.name}</h3>
                  <p className="text-xs text-zinc-500">WYSIWYG Email & Document Generation Template Canvas</p>
                </div>
              </div>
              <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-purple-500/10 text-purple-500 uppercase">DOCUMENT TEMPLATE</span>
            </div>

            <div className="p-6 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-xs leading-relaxed space-y-3 font-sans">
              <p className="font-bold text-zinc-900 dark:text-white text-sm">Subject: Welcome to Aurora - &#123;&#123;stakeholder_name&#125;&#125;</p>
              <hr className="border-zinc-200 dark:border-zinc-800" />
              <p className="text-zinc-700 dark:text-zinc-300">
                Hello <span className="px-1.5 py-0.5 bg-indigo-500/10 text-indigo-500 font-mono font-bold rounded">&#123;&#123;stakeholder_name&#125;&#125;</span>,<br /><br />
                Your solution request <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-500 font-mono font-bold rounded">&#123;&#123;solution_title&#125;&#125;</span> has been successfully logged under tier <span className="px-1.5 py-0.5 bg-purple-500/10 text-purple-500 font-mono font-bold rounded">&#123;&#123;classification_tier&#125;&#125;</span>.
              </p>
            </div>
          </div>
        );

      case 'NAVIGATION':
        /* NAVIGATION TREE PREVIEW */
        return (
          <div className={`bg-white/90 dark:bg-zinc-900/90 border border-teal-500/30 rounded-3xl p-6 shadow-2xl space-y-5 ${isFullscreen ? 'max-w-5xl mx-auto' : ''}`}>
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-teal-500/10 text-teal-500 border border-teal-500/20">
                  <Globe size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white">{art.name}</h3>
                  <p className="text-xs text-zinc-500">Portal Navigation Tree & Sidebar Route Architect</p>
                </div>
              </div>
              <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-teal-500/10 text-teal-500 uppercase">NAVIGATION TREE</span>
            </div>

            <div className="space-y-2">
              {(art.content?.items || [
                { label: 'Dashboard & Overview', path: '/workspace/dashboard' },
                { label: 'Client Intake Portal', path: '/workspace/intake' },
                { label: 'Service Escalation Triage', path: '/workspace/triage' },
                { label: 'Reports & Analytics', path: '/workspace/reports' }
              ]).map((navItem: any, idx: number) => (
                <div key={idx} className="p-3 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200/60 dark:border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-teal-500/10 text-teal-500 flex items-center justify-center font-bold text-xs">
                      {idx + 1}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-zinc-900 dark:text-white">{navItem.label}</span>
                      <span className="text-[10px] text-zinc-400 font-mono block">{navItem.path}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'GLOBAL_LIST':
        /* GLOBAL LIST PICKLIST PREVIEW */
        return (
          <div className={`bg-white/90 dark:bg-zinc-900/90 border border-amber-500/30 rounded-3xl p-6 shadow-2xl space-y-5 ${isFullscreen ? 'max-w-5xl mx-auto' : ''}`}>
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white">{art.name}</h3>
                  <p className="text-xs text-zinc-500">Shared Dropdown Picklist & Enum Registry</p>
                </div>
              </div>
              <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-amber-500/10 text-amber-500 uppercase">GLOBAL LIST</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {(art.content?.options || [
                'Tier 1 Standard',
                'Tier 2 Escalated',
                'Tier 3 Executive',
                'VIP Concierge'
              ]).map((opt: string, idx: number) => (
                <div key={idx} className="p-3 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200/60 dark:border-zinc-800 flex items-center justify-between text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                  <span>{opt}</span>
                  <Check size={14} className="text-amber-500" />
                </div>
              ))}
            </div>
          </div>
        );

      case 'PERMISSION':
        /* ROLES & PERMISSIONS MATRIX PREVIEW */
        return (
          <div className={`bg-white/90 dark:bg-zinc-900/90 border border-rose-500/30 rounded-3xl p-6 shadow-2xl space-y-6 ${isFullscreen ? 'max-w-6xl mx-auto' : ''}`}>
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-zinc-900 dark:text-white">{art.name}</h3>
                  <p className="text-xs text-zinc-500">Role-Based Access Control (RBAC) & Data Access Scope Matrix</p>
                </div>
              </div>
              <span className="px-3 py-1 text-[10px] font-black tracking-wider rounded-full bg-rose-500/10 text-rose-500 uppercase border border-rose-500/20">
                SECURITY & PERMISSIONS
              </span>
            </div>

            {/* Proposed User Roles Summary Grid */}
            <div className="space-y-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-zinc-400">Proposed Workspace Roles</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {(art.content?.roles || [
                  { name: 'Workspace Admin', level: 'Full Control', description: 'Unrestricted administrative access to all records & configuration.' },
                  { name: 'Department Manager', level: 'Scoped Management', description: 'Can create, edit, & export records within assigned department.' },
                  { name: 'Standard Agent', level: 'Operational Access', description: 'Can view & update assigned cases, submit intake requests.' },
                  { name: 'Client Portal User', level: 'Restricted Self-Service', description: 'Read-only access to own profile & submitted tickets.' }
                ]).map((r: any, idx: number) => (
                  <div key={idx} className="p-3.5 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-zinc-900 dark:text-white">{r.name}</span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border border-indigo-500/20">
                        {r.level}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug">{r.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Capability Matrix Table */}
            <div className="space-y-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-zinc-400">Resource Permission Matrix</h4>
              <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-zinc-100 dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400 text-[10px] font-black uppercase tracking-wider">
                    <tr>
                      <th className="p-3">Resource / Module</th>
                      <th className="p-3 text-center">Read</th>
                      <th className="p-3 text-center">Create</th>
                      <th className="p-3 text-center">Edit</th>
                      <th className="p-3 text-center">Delete</th>
                      <th className="p-3 text-center">Export</th>
                      <th className="p-3">Data Access Scope</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 font-medium">
                    {(art.content?.matrix || [
                      { resource: 'Intake Forms & Records', read: true, create: true, edit: true, delete: true, export: true, scope: 'Workspace-wide' },
                      { resource: 'SLA Escalation Workflows', read: true, create: false, edit: true, delete: false, export: true, scope: 'Department' },
                      { resource: 'Customer PII Data', read: true, create: true, edit: true, delete: false, export: false, scope: 'Record Owner' },
                      { resource: 'Analytics Dashboards', read: true, create: false, edit: false, delete: false, export: true, scope: 'Workspace-wide' }
                    ]).map((row: any, idx: number) => (
                      <tr key={idx} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/60 transition-colors">
                        <td className="p-3 font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-rose-500" />
                          <span>{row.resource}</span>
                        </td>
                        <td className="p-3 text-center">{row.read ? <span className="text-emerald-500 font-bold">✓</span> : <span className="text-zinc-600">✕</span>}</td>
                        <td className="p-3 text-center">{row.create ? <span className="text-emerald-500 font-bold">✓</span> : <span className="text-zinc-600">✕</span>}</td>
                        <td className="p-3 text-center">{row.edit ? <span className="text-emerald-500 font-bold">✓</span> : <span className="text-zinc-600">✕</span>}</td>
                        <td className="p-3 text-center">{row.delete ? <span className="text-emerald-500 font-bold">✓</span> : <span className="text-zinc-600">✕</span>}</td>
                        <td className="p-3 text-center">{row.export ? <span className="text-emerald-500 font-bold">✓</span> : <span className="text-zinc-600">✕</span>}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                            {row.scope}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      default:
        /* DYNAMIC FORM / WORKFLOW PREVIEW (DEFAULT) */
        return (
          <div className={`bg-gradient-to-br from-teal-500/10 via-indigo-500/10 to-purple-500/10 dark:from-teal-500/5 dark:via-indigo-500/5 dark:to-purple-500/5 border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl p-6 shadow-xl relative overflow-hidden ${isFullscreen ? 'max-w-5xl mx-auto' : ''}`}>
            <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 max-w-md mx-auto shadow-2xl space-y-5">
              <div className="text-center space-y-1">
                <h2 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">
                  {art?.content?.title || art?.name || 'Client Intake Form'}
                </h2>
                <p className="text-xs text-zinc-500 font-medium">
                  {art?.content?.subtitle || 'Full screen, well-designed built-in components built.'}
                </p>
              </div>

              <div className="space-y-4 pt-2">
                {Array.isArray(art?.content?.fields) && art.content.fields.length > 0 ? (
                  <div className="grid grid-cols-12 gap-3">
                    {art.content.fields.map((field: any) => {
                      const colSpan = field.colSpan || 12;
                      const spanClass = colSpan === 6 ? 'col-span-6' : 'col-span-12';

                      return (
                        <div key={field.id} className={spanClass}>
                          <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                            {field.label} {field.required && <span className="text-rose-500">*</span>}
                          </label>

                          {field.type === 'select' ? (
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => setIsTierOpen(!isTierOpen)}
                                className="w-full bg-zinc-50 dark:bg-zinc-900 border border-emerald-500/50 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white font-medium flex items-center justify-between outline-none focus:ring-2 focus:ring-emerald-500/40"
                              >
                                <span>{tierDropdownValue || field.options?.[0] || 'Select Option'}</span>
                                <ChevronDown size={14} className="text-zinc-400" />
                              </button>

                              {isTierOpen && field.options && (
                                <div className="absolute top-full left-0 w-full mt-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl z-30 p-1 space-y-0.5">
                                  {field.options.map((opt: string) => (
                                    <button
                                      key={opt}
                                      type="button"
                                      onClick={() => {
                                        setTierDropdownValue(opt);
                                        setIsTierOpen(false);
                                      }}
                                      className="w-full text-left px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"
                                    >
                                      {opt}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            <input
                              type={field.type || 'text'}
                              placeholder={field.placeholder || ''}
                              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white font-medium outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1">First Name *</label>
                        <input type="text" placeholder="First name" className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white font-medium outline-none" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1">Last Name *</label>
                        <input type="text" placeholder="Last name" className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white font-medium outline-none" />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => toast.success('Test form submission successful!')}
                      className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md cursor-pointer"
                    >
                      Submit Test Data
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col h-full bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-zinc-200/60 dark:border-white/10 rounded-3xl overflow-hidden shadow-xl shadow-black/5 dark:shadow-none p-5 relative">
      {viewMode === 'grid' ? (
        /* NotebookLM Studio Tile Grid View */
        <div className="flex-1 flex flex-col min-h-0 space-y-4">
          {/* Top Studio Grid Header */}
          <div className="flex items-center justify-between pb-3 border-b border-zinc-200/60 dark:border-white/5 shrink-0">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-2">
                <span>Solution</span>
                <span className="text-[10px] text-indigo-500 font-bold">({artifacts.length} Artifacts)</span>
              </h3>
            </div>


            {onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
                title="Collapse Studio Pane"
              >
                <PanelRightClose size={16} />
              </button>
            )}
          </div>

          {/* NotebookLM Interactive Artifact Tiles Grid (3x3 Grid) */}
          <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-1">
            {artifacts.length === 0 ? (
              <div className="p-8 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl text-center space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 flex items-center justify-center mx-auto">
                  <Sparkles size={20} />
                </div>
                <h4 className="text-xs font-bold text-zinc-900 dark:text-white">No Solution Artifacts Generated Yet</h4>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto leading-relaxed font-medium">
                  Prompt Aurora in the chat to analyze your requirements and document your custom <span className="font-bold text-indigo-500">Solution Design</span>, forms, workflows, and modules.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {artifacts.map((art) => {
                  const theme = getArtifactTileTheme(art);
                  const IconComponent = theme.icon;

                  return (
                    <div
                      key={art.id}
                      onClick={() => handleTileClick(art.id)}
                      className={`group p-4 rounded-2xl border transition-all cursor-pointer shadow-xs hover:shadow-md flex flex-col justify-between space-y-3 ${theme.bg} ${theme.border}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className={`p-2.5 rounded-xl ${theme.badge} shrink-0`}>
                          <IconComponent size={18} />
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenFullModal(art.id);
                            }}
                            className="p-1 rounded-lg bg-white/80 dark:bg-zinc-900/80 hover:bg-indigo-500/20 text-zinc-500 hover:text-indigo-500 border border-zinc-200/60 dark:border-zinc-800 transition-colors"
                            title="Expand to Full Screen Focus Mode"
                          >
                            <Maximize2 size={12} />
                          </button>
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase bg-white/80 dark:bg-zinc-900/80 text-zinc-600 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-800 shrink-0">
                            {art.type}
                          </span>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-xs font-bold text-zinc-900 dark:text-white group-hover:text-indigo-500 transition-colors line-clamp-1">
                          {art.name}
                        </h4>
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium line-clamp-1 mt-0.5">
                          {art.description || theme.categoryLabel}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-zinc-200/40 dark:border-zinc-800/40 flex items-center justify-between text-[10px] font-bold text-zinc-400 group-hover:text-indigo-500">
                        <span>Click to preview</span>
                        <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}


            {/* Saved Studio Notes Section (NotebookLM Style) */}
            <div className="pt-4 border-t border-zinc-200/60 dark:border-zinc-800/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <FileText size={14} className="text-indigo-500" /> Notes ({savedNotes.length})
                </span>
              </div>


              {savedNotes.length === 0 ? (
                <div className="p-4 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl text-center text-xs text-zinc-400">
                  No saved notes yet. Click <span className="font-bold text-indigo-500">Save to note</span> under any AI response to pin key decisions here!
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {savedNotes.map((note) => (
                    <div
                      key={note.id}
                      className="p-3 bg-white/80 dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl transition-all shadow-xs flex items-center justify-between relative group"
                    >
                      <div className="flex items-start gap-2.5 min-w-0 pr-2">
                        <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 shrink-0 mt-0.5">
                          <FileText size={13} />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-zinc-900 dark:text-white truncate" title={note.title}>
                            {note.title}
                          </h4>
                          <span className="text-[9.5px] text-zinc-400 font-medium block mt-0.5">
                            {note.createdAt}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {onConvertToSource && (
                          <button
                            onClick={() => onConvertToSource(note.title, note.text)}
                            className="p-1 rounded-lg bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20 transition-all text-[10px] font-bold cursor-pointer"
                            title="Convert note into Context Source"
                          >
                            + Context
                          </button>
                        )}
                        {onDeleteNote && (
                          <button
                            onClick={() => onDeleteNote(note.id)}
                            className="p-1 rounded-lg bg-zinc-100 hover:bg-rose-500/10 text-zinc-400 hover:text-rose-500 dark:bg-zinc-800 transition-colors cursor-pointer"
                            title="Delete Note"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>

                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Detailed Interactive Artifact Previewer View */
        <div className="flex-1 flex flex-col min-h-0 space-y-4">
          {/* Header Action Bar with Back to Studio Tiles button & Maximize */}
          <div className="flex items-center justify-between pb-3 border-b border-zinc-200/60 dark:border-white/5 shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>Back to Studio Grid</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleOpenFullModal()}
                className="px-2.5 py-1 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-500 border border-indigo-500/20 text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                title="Expand Preview to Full-Screen Focus Mode"
              >
                <Maximize2 size={13} />
                <span>Full Preview</span>
              </button>

              {onConvertToSource && activeArtifact && (
                <button
                  onClick={() => onConvertToSource(`Artifact Spec: ${activeArtifact.name}`, JSON.stringify(activeArtifact.content, null, 2))}
                  className="px-2.5 py-1 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-600 dark:text-zinc-300 text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                  title="Pin this active artifact spec into Context & Inputs as a Source"
                >
                  <FileText size={12} />
                  <span>Convert to Source</span>
                </button>
              )}

              <button
                onClick={handleOpenDedicatedBuilder}
                className="px-3 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] transition-all flex items-center gap-1 cursor-pointer shadow-sm"
              >
                <span>Open in Dedicated Builder</span>
                <ArrowRight size={12} />
              </button>
            </div>
          </div>

          {/* Detailed Artifact Viewport */}
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-1">
            {renderArtifactBodyContent(activeArtifact)}
          </div>
        </div>
      )}

      {/* FULL-SCREEN FOCUS MODAL (IMMERSIVE CANVAS PREVIEW FOR ALL 12 BUILDERS) */}
      {isFullModalOpen && activeArtifact && (
        <div className="fixed inset-0 z-[10000] bg-zinc-950/95 backdrop-blur-2xl flex flex-col p-6 space-y-4 overflow-hidden font-sans">
          {/* Modal Header Bar */}
          <div className="flex items-center justify-between py-3 px-5 bg-zinc-900/90 border border-zinc-800 rounded-2xl shadow-xl shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                <Sparkles size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-white">{activeArtifact.name}</h3>
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                    {activeArtifact.type} BUILDER
                  </span>
                </div>
                <p className="text-xs text-zinc-400 font-medium">
                  {activeArtifact.description || 'Full-Screen Interactive Preview Canvas'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsDrivePickerOpen(true)}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-500 hover:to-indigo-500 text-white font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <HardDrive size={14} />
                <span>Save to Drive</span>
              </button>

              <button
                onClick={handleOpenDedicatedBuilder}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <span>Open in Dedicated Builder</span>
                <ArrowRight size={14} />
              </button>

              <button
                onClick={() => setIsFullModalOpen(false)}
                className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer ml-2"
                title="Close Full Preview (Esc)"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Full-Bleed Canvas Viewport Area */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 min-h-0">
            {renderArtifactBodyContent(activeArtifact, true)}
          </div>

          {/* Floating AI Prompt Bar at Bottom of Full-Screen Modal */}
          <div className="shrink-0 max-w-2xl mx-auto w-full">
            <form onSubmit={handleSendFloatingPrompt} className="relative flex items-center">
              <Sparkles size={16} className="absolute left-4 text-indigo-400" />
              <input
                type="text"
                value={floatingPrompt}
                onChange={(e) => setFloatingPrompt(e.target.value)}
                placeholder={`Prompt AI to refine or modify "${activeArtifact.name}"...`}
                className="w-full pl-11 pr-24 py-3 bg-zinc-900/90 border border-indigo-500/40 rounded-2xl text-xs text-white placeholder-zinc-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 transition-all shadow-2xl"
              />
              <button
                type="submit"
                className="absolute right-2 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
              >
                <span>Prompt</span>
                <Send size={12} />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Aurora Drive Destination Folder Selection Modal */}
      <DrivePickerModal
        isOpen={isDrivePickerOpen}
        onClose={() => setIsDrivePickerOpen(false)}
        onSelectFolder={handleSaveToDrive}
        title="Save Solution Design to Aurora Drive"
        confirmLabel="Save Document Here"
      />

    </div>
  );
};

