import React, { useState } from 'react';
import { 
  GitBranch, 
  ChevronDown, 
  Check, 
  FileText, 
  Layers, 
  ArrowRight,
  Code,
  Sparkles,
  PanelRightClose,
  ArrowLeft,
  BarChart2,
  Globe,
  CheckCircle2,
  BookOpen,
  Copy,
  HardDrive,
  Trash2
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
}

export const SolutionPreviewStudio: React.FC<SolutionPreviewStudioProps> = ({
  artifacts,
  activeArtifactId,
  onSelectArtifact,
  onConvertToSource,
  savedNotes = [],
  onDeleteNote,
  onToggleCollapse
}) => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'grid' | 'detail'>('grid');
  const [selectedArtifactIdState, setSelectedArtifactIdState] = useState<string | null>(activeArtifactId || null);
  const [tierDropdownValue, setTierDropdownValue] = useState('Standard Support');

  const [isTierOpen, setIsTierOpen] = useState(false);
  const [isDrivePickerOpen, setIsDrivePickerOpen] = useState(false);

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
        navigate('/workspace/settings/menu-config');
        break;
      case 'MODULE':
        navigate('/workspace/settings/platform-modules');
        break;
      default:
        toast.info(`Opening ${activeArtifact.name} in dedicated builder...`);
        break;
    }
  };


  const getArtifactTileTheme = (art: SolutionArtifact) => {
    switch (art.type) {
      case 'FORM':
        return {
          bg: 'bg-purple-500/10 dark:bg-purple-500/15',
          border: 'border-purple-500/30 hover:border-purple-500/60',
          text: 'text-purple-600 dark:text-purple-400',
          badge: 'bg-purple-500/20 text-purple-500',
          icon: FileText,
          categoryLabel: 'Interactive Form'
        };
      case 'WORKFLOW':
        return {
          bg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
          border: 'border-emerald-500/30 hover:border-emerald-500/60',
          text: 'text-emerald-600 dark:text-emerald-400',
          badge: 'bg-emerald-500/20 text-emerald-500',
          icon: GitBranch,
          categoryLabel: 'Process Execution Graph'
        };
      case 'MODULE':
        return {
          bg: 'bg-blue-500/10 dark:bg-blue-500/15',
          border: 'border-blue-500/30 hover:border-blue-500/60',
          text: 'text-blue-600 dark:text-blue-400',
          badge: 'bg-blue-500/20 text-blue-500',
          icon: Layers,
          categoryLabel: 'Data Record Module'
        };
      case 'NAVIGATION':
        return {
          bg: 'bg-teal-500/10 dark:bg-teal-500/15',
          border: 'border-teal-500/30 hover:border-teal-500/60',
          text: 'text-teal-600 dark:text-teal-400',
          badge: 'bg-teal-500/20 text-teal-500',
          icon: Globe,
          categoryLabel: 'Portal Navigation Tree'
        };
      case 'GLOBAL_LIST':
        return {
          bg: 'bg-amber-500/10 dark:bg-amber-500/15',
          border: 'border-amber-500/30 hover:border-amber-500/60',
          text: 'text-amber-600 dark:text-amber-400',
          badge: 'bg-amber-500/20 text-amber-500',
          icon: CheckCircle2,
          categoryLabel: 'Shared Picklist Enum'
        };
      case 'API':
      case 'INTEGRATION':
        return {
          bg: 'bg-rose-500/10 dark:bg-rose-500/15',
          border: 'border-rose-500/30 hover:border-rose-500/60',
          text: 'text-rose-600 dark:text-rose-400',
          badge: 'bg-rose-500/20 text-rose-500',
          icon: Code,
          categoryLabel: 'OpenAPI Integration'
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
      case 'REPORT':

        return {
          bg: 'bg-indigo-500/10 dark:bg-indigo-500/15',
          border: 'border-indigo-500/30 hover:border-indigo-500/60',
          text: 'text-indigo-600 dark:text-indigo-400',
          badge: 'bg-indigo-500/20 text-indigo-500',
          icon: BarChart2,
          categoryLabel: 'Analytics Dashboard'
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
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase bg-white/80 dark:bg-zinc-900/80 text-zinc-600 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-800 shrink-0">
                        {art.type}
                      </span>
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
          {/* Header Action Bar with Back to Studio Tiles button */}
          <div className="flex items-center justify-between pb-3 border-b border-zinc-200/60 dark:border-white/5 shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>Back to Studio Grid</span>
            </button>

            <div className="flex items-center gap-2">
              {onConvertToSource && activeArtifact && (
                <button
                  onClick={() => onConvertToSource(`Artifact Spec: ${activeArtifact.name}`, JSON.stringify(activeArtifact.content, null, 2))}
                  className="px-2.5 py-1 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer"
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
            {activeArtifact?.type === 'PAGE' ? (
              /* SOLUTION ARCHITECTURE & VISION SPECIFICATION PREVIEW */
              <div className="bg-white/90 dark:bg-zinc-900/90 border border-indigo-500/30 rounded-3xl p-6 shadow-2xl space-y-5">
                <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                      <BookOpen size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-zinc-900 dark:text-white flex items-center gap-2">
                        <span>{activeArtifact.name}</span>
                      </h3>
                      <p className="text-xs text-zinc-500 font-medium mt-0.5">
                        {activeArtifact.description || 'Enterprise Solution Architecture Specification'}
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
                        const content = activeArtifact.content?.markdown || activeArtifact.content?.text || JSON.stringify(activeArtifact.content, null, 2);
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

                {/* Executive Formatted Architecture Document View */}
                <div className="p-6 bg-zinc-50 dark:bg-zinc-950 rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 space-y-4 shadow-inner">
                  {((activeArtifact.content?.markdown || activeArtifact.content?.text || '') as string)
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

                      if (trimmed.startsWith('- ')) {
                        const content = trimmed.replace('- ', '');
                        const parts = content.split('**');
                        return (
                          <div key={idx} className="flex items-start gap-2.5 my-1.5 text-xs text-zinc-700 dark:text-zinc-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 mt-1.5" />
                            <div>
                              {parts.map((part, pIdx) => (
                                pIdx % 2 === 1 ? (
                                  <strong key={pIdx} className="font-bold text-zinc-900 dark:text-white">{part}</strong>
                                ) : (
                                  <span key={pIdx}>{part}</span>
                                )
                              ))}
                            </div>
                          </div>
                        );
                      }

                      // Standard paragraph line with bold parsing
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

            ) : activeArtifact?.type === 'NAVIGATION' ? (

              /* NAVIGATION PREVIEW */
              <div className="bg-white/80 dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                      <Globe size={16} className="text-teal-500" /> {activeArtifact.name}
                    </h3>
                    <p className="text-xs text-zinc-500">Sidebar & Header Portal Navigation Structure</p>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-teal-500/10 text-teal-500 uppercase">NAVIGATION</span>
                </div>

                <div className="space-y-2">
                  {(activeArtifact.content?.items || [
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
            ) : activeArtifact?.type === 'GLOBAL_LIST' ? (
              /* GLOBAL LIST PREVIEW */
              <div className="bg-white/80 dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-amber-500" /> {activeArtifact.name}
                    </h3>
                    <p className="text-xs text-zinc-500">Shared Dropdown Picklist & Enum Registry</p>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-500/10 text-amber-500">GLOBAL LIST</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {(activeArtifact.content?.options || [
                    'Standard Support',
                    'Premium Onboarding',
                    'Enterprise SLA',
                    'VIP Concierge'
                  ]).map((opt: string, idx: number) => (
                    <div key={idx} className="p-3 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200/60 dark:border-zinc-800 flex items-center justify-between text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                      <span>{opt}</span>
                      <Check size={14} className="text-amber-500" />
                    </div>
                  ))}
                </div>
              </div>
            ) : activeArtifact?.type === 'API' || activeArtifact?.type === 'INTEGRATION' ? (
              /* API INTEGRATION PREVIEW */
              <div className="bg-white/80 dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                      <Code size={16} className="text-rose-500" /> {activeArtifact.name}
                    </h3>
                    <p className="text-xs text-zinc-500">OpenAPI Endpoint & Webhook Payload Tester</p>
                  </div>
                  <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-rose-500/10 text-rose-500 uppercase">POST /api/v1/intake</span>
                </div>

                <div className="space-y-3">
                  <div className="p-3 bg-zinc-950 rounded-2xl border border-zinc-800 font-mono text-xs text-emerald-400 overflow-x-auto">
                    <span className="text-zinc-500">// Sample Request Payload</span><br />
                    {JSON.stringify(activeArtifact.content?.payload || {
                      event: 'CLIENT_INTAKE_SUBMITTED',
                      tenantId: 'tenant_enterprise_01',
                      data: { firstName: 'Alex', email: 'alex@company.com', tier: 'Enterprise SLA' }
                    }, null, 2)}
                  </div>
                </div>
              </div>
            ) : activeArtifact?.type === 'TEMPLATE' ? (

              /* TEMPLATE PREVIEW */
              <div className="bg-white/80 dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                      <FileText size={16} className="text-rose-500" /> {activeArtifact.name}
                    </h3>
                    <p className="text-xs text-zinc-500">Email & Document Template with Mustache Placeholders</p>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-500/10 text-rose-500">TEMPLATE</span>
                </div>

                <div className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200/60 dark:border-zinc-800 text-xs leading-relaxed space-y-2">
                  <p className="font-bold text-zinc-900 dark:text-white">Subject: Welcome to Aurora Enterprise - &#123;&#123;client_name&#125;&#125;</p>
                  <hr className="border-zinc-200 dark:border-zinc-800" />
                  <p className="text-zinc-600 dark:text-zinc-300">
                    Hello <span className="px-1.5 py-0.5 bg-indigo-500/10 text-indigo-500 font-mono font-bold rounded">&#123;&#123;client_name&#125;&#125;</span>,<br /><br />
                    Thank you for selecting the <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-500 font-mono font-bold rounded">&#123;&#123;service_tier&#125;&#125;</span> onboarding plan. Your account has been provisioned under tenant <span className="px-1.5 py-0.5 bg-purple-500/10 text-purple-500 font-mono font-bold rounded">&#123;&#123;tenant_id&#125;&#125;</span>.
                  </p>
                </div>
              </div>
            ) : (
              /* DYNAMIC FORM / WORKFLOW PREVIEW (DEFAULT) */
              <div className="bg-gradient-to-br from-teal-500/10 via-indigo-500/10 to-purple-500/10 dark:from-teal-500/5 dark:via-indigo-500/5 dark:to-purple-500/5 border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl p-6 shadow-xl relative overflow-hidden">
                <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 max-w-md mx-auto shadow-2xl space-y-5">
                  <div className="text-center space-y-1">
                    <h2 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">
                      {activeArtifact?.content?.title || activeArtifact?.name || 'Client Intake Form'}
                    </h2>
                    <p className="text-xs text-zinc-500 font-medium">
                      {activeArtifact?.content?.subtitle || 'Full screen, well-designed built-in components built.'}
                    </p>
                  </div>

                  <div className="space-y-4 pt-2">
                    {/* Render Fields Dynamically */}
                    {Array.isArray(activeArtifact?.content?.fields) && activeArtifact.content.fields.length > 0 ? (
                      <div className="grid grid-cols-12 gap-3">
                        {activeArtifact.content.fields.map((field: any) => {
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
            )}
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

