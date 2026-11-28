import React, { useState, useMemo } from 'react';
import {
  Home,
  Sparkles,
  SlidersHorizontal,
  RotateCcw,
  Boxes,
  Plus,
  ArrowRight,
  CheckCircle2,
  Shield,
  GitBranch,
  Target,
  Globe,
  ListOrdered,
  BarChart2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { useSolutionStudio } from '../../../context/SolutionStudioContext';
import { useSolutionSandbox } from './SolutionSandboxProvider';
import { SolutionArtifact, PinnedChatContext } from '../../../types/solutions';
import {
  getComponentMeta,
  normalizeArtifactType,
} from './solutionComponentCatalog';
import { ModulePreviewConfig } from '../../../types/preview';
import { ModuleView } from '../../../pages/Module/ModuleView';
import { RecordDetailView } from '../../../pages/Record/RecordDetailView';
import { FormRenderer } from '../FormBuilder/FormRenderer';
import { cn } from '../../../lib/utils';

export interface SolutionLivePreviewProps {
  previewMode: 'interact' | 'select';
  simulatedRole: string;
  selectedScreenId: string;
  onSelectScreen: (screenId: string) => void;
  onAskAI: (ctx: PinnedChatContext) => void;
  onEditInBuilder: (artifact: SolutionArtifact) => void;
  onSwitchToComponents: () => void;
}

interface SelectableBlockProps {
  artifact?: SolutionArtifact;
  label: string;
  previewMode: 'interact' | 'select';
  isSelected: boolean;
  onSelect: () => void;
  onAskAI: (subTarget?: { fieldId: string; fieldLabel: string }) => void;
  onEditInBuilder: () => void;
  subFields?: Array<{ id: string; label: string }>;
  className?: string;
  children: React.ReactNode;
}

const SelectablePreviewBlock: React.FC<SelectableBlockProps> = ({
  label,
  previewMode,
  isSelected,
  onSelect,
  onAskAI,
  onEditInBuilder,
  subFields = [],
  className,
  children,
}) => {
  const [selectedSubField, setSelectedSubField] = useState<{ id: string; label: string } | null>(null);

  if (previewMode !== 'select') {
    return <div className={className}>{children}</div>;
  }

  const activePillLabel = selectedSubField ? `${label} → ${selectedSubField.label}` : label;

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        setSelectedSubField(null);
        onSelect();
      }}
      className={cn(
        'relative rounded-xl transition-all cursor-pointer',
        isSelected
          ? 'ring-2 ring-indigo-600 ring-offset-2 ring-offset-zinc-50 dark:ring-offset-zinc-950'
          : 'hover:ring-2 hover:ring-indigo-400/60 hover:ring-offset-1',
        className
      )}
    >
      {/* Floating Action Pill when Selected */}
      {isSelected && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute -top-11 right-2 z-30 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-lg"
        >
          <span className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-100 pr-1.5 border-r border-zinc-200 dark:border-zinc-700 max-w-[220px] truncate">
            {activePillLabel}
          </span>
          <button
            type="button"
            onClick={() => onAskAI(selectedSubField ? { fieldId: selectedSubField.id, fieldLabel: selectedSubField.label } : undefined)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-100 hover:bg-indigo-50 dark:bg-zinc-800 dark:hover:bg-indigo-500/20 text-zinc-700 hover:text-indigo-600 dark:text-zinc-200 dark:hover:text-indigo-300 text-[11px] font-medium transition-colors cursor-pointer"
          >
            <Sparkles size={11} />
            <span>Ask AI</span>
          </button>
          <button
            type="button"
            onClick={onEditInBuilder}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-medium shadow-xs transition-colors cursor-pointer"
          >
            <SlidersHorizontal size={11} />
            <span>Edit in Builder</span>
          </button>
        </div>
      )}

      {/* Sub-Element / Field-Level Targeting Strip when Block is Selected */}
      {isSelected && subFields.length > 0 && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="mb-2 p-2 rounded-xl bg-indigo-50/90 dark:bg-indigo-500/10 border border-indigo-200/80 dark:border-indigo-500/25 flex flex-wrap items-center gap-1.5"
        >
          <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 px-1">
            Target Field:
          </span>
          <button
            type="button"
            onClick={() => setSelectedSubField(null)}
            className={cn(
              'px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors cursor-pointer',
              !selectedSubField
                ? 'bg-indigo-600 text-white'
                : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:border-indigo-400'
            )}
          >
            Whole {label}
          </button>
          {subFields.map((sf) => {
            const active = selectedSubField?.id === sf.id;
            return (
              <button
                key={sf.id}
                type="button"
                onClick={() => setSelectedSubField(sf)}
                className={cn(
                  'px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors cursor-pointer',
                  active
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 hover:border-indigo-400'
                )}
              >
                {sf.label}
              </button>
            );
          })}
        </div>
      )}

      <div className="pointer-events-none select-none">{children}</div>
    </div>
  );
};

export const SolutionLivePreview: React.FC<SolutionLivePreviewProps> = ({
  previewMode,
  simulatedRole,
  selectedScreenId,
  onSelectScreen,
  onAskAI,
  onEditInBuilder,
  onSwitchToComponents,
}) => {
  const { solutionName, artifacts } = useSolutionStudio();
  const {
    draftModules,
    getModuleById,
    getRecords,
    updateRecords,
    submitFormToSandbox,
    transitionRecordStage,
    resetSandbox,
    mutationCount,
  } = useSolutionSandbox();

  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [activeRecordId, setActiveRecordId] = useState<string | null>(null);
  const [stageErrors, setStageErrors] = useState<string[]>([]);

  // Extract draft brand primary color if present
  const brandArtifact = useMemo(
    () => artifacts.find((a) => normalizeArtifactType(a.type) === 'BRAND'),
    [artifacts]
  );
  const brandPrimary = brandArtifact?.content?.colors?.primary || '#4f46e5';

  // Categorized artifacts for the Live App Shell
  const moduleArtifacts = useMemo(
    () => artifacts.filter((a) => normalizeArtifactType(a.type) === 'MODULE'),
    [artifacts]
  );
  const formArtifacts = useMemo(
    () => artifacts.filter((a) => normalizeArtifactType(a.type) === 'FORM'),
    [artifacts]
  );
  const kpiArtifacts = useMemo(
    () => artifacts.filter((a) => normalizeArtifactType(a.type) === 'KPI'),
    [artifacts]
  );
  const workflowArtifacts = useMemo(
    () => artifacts.filter((a) => normalizeArtifactType(a.type) === 'WORKFLOW'),
    [artifacts]
  );
  const roleArtifacts = useMemo(
    () => artifacts.filter((a) => normalizeArtifactType(a.type) === 'PERMISSION'),
    [artifacts]
  );
  const navArtifact = useMemo(
    () => artifacts.find((a) => normalizeArtifactType(a.type) === 'NAVIGATION'),
    [artifacts]
  );

  // Navigable screens (filtering out legacy "Solution Design" markdown spec docs)
  const navItems = useMemo(() => {
    const items: Array<{
      id: string;
      label: string;
      kind: 'home' | 'artifact';
      artifact?: SolutionArtifact;
    }> = [{ id: '__home__', label: 'Home Overview', kind: 'home' }];

    // If a real Menus (NAVIGATION) artifact defines explicit items, render those first
    const menuItems = Array.isArray(navArtifact?.content?.items) ? navArtifact.content.items : [];
    if (menuItems.length > 0) {
      const resolved: typeof items = [];
      for (const m of menuItems) {
        if (m.targetId === '__home__' || m.id === '__home__') {
          resolved.push({ id: '__home__', label: m.label || 'Home Overview', kind: 'home' });
        } else {
          const target = artifacts.find((a) => a.id === (m.targetId || m.id));
          if (target) {
            resolved.push({ id: target.id, label: m.label || target.name, kind: 'artifact', artifact: target });
          }
        }
      }
      if (resolved.length > 0) return resolved;
    }

    const navigableTypes = new Set(['MODULE', 'FORM', 'PAGE', 'QUEUE', 'REPORT', 'SITE']);
    artifacts.forEach((art) => {
      if (!navigableTypes.has(normalizeArtifactType(art.type))) return;
      // Exclude legacy Solution Design markdown spec docs from live app navigation
      if (art.id.startsWith('art_spec_') || art.name.toLowerCase() === 'solution design') return;
      items.push({
        id: art.id,
        label: art.name,
        kind: 'artifact',
        artifact: art,
      });
    });
    return items;
  }, [artifacts, navArtifact]);

  const effectiveScreenId =
    selectedScreenId && navItems.some((i) => i.id === selectedScreenId)
      ? selectedScreenId
      : '__home__';

  const activeNavItem = navItems.find((i) => i.id === effectiveScreenId) || navItems[0];
  const activeArtifact = activeNavItem?.artifact;

  // Empty state when a brand-new blank Solution has no components yet
  if (artifacts.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 text-center shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200/70 dark:border-indigo-500/25 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4">
          <Boxes size={22} />
        </div>
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
          Your live app preview will appear here
        </h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mt-1.5 leading-relaxed">
          Describe the workflow, portal, or operational system you need in <strong>Solution Chat</strong> on
          the left, or add components manually to start testing in this sandbox.
        </p>
        <button
          type="button"
          onClick={onSwitchToComponents}
          className="mt-4 h-8 px-3.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium inline-flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
        >
          <Plus size={14} />
          <span>Add Components</span>
        </button>
      </div>
    );
  }

  // Render a real ModuleView / RecordDetailView in sandbox mode (with draft RolePolicy enforcement)
  const renderModuleScreen = (modArt: SolutionArtifact) => {
    const draftMod = getModuleById(modArt.id, simulatedRole);
    if (!draftMod) return null;
    const records = getRecords(draftMod.id);
    const activeRecord = activeRecordId ? records.find((r) => r.id === activeRecordId) : null;

    const previewConfig: ModulePreviewConfig = {
      enabled: true,
      moduleOverride: draftMod,
      dataSource: 'mock',
      records,
      onRecordsChange: (updater, label) => updateRecords(draftMod.id, updater, label),
      simulatedRole,
      onOpenRecord: (rec) => setActiveRecordId(rec.id),
      designMode: previewMode === 'select',
      onSelectDesignTarget: () => setSelectedBlockId(modArt.id),
    };

    return (
      <SelectablePreviewBlock
        artifact={modArt}
        label={modArt.name}
        previewMode={previewMode}
        isSelected={selectedBlockId === modArt.id}
        onSelect={() => setSelectedBlockId(modArt.id)}
        subFields={((draftMod as any)?.layout || []).map((f: any) => ({
          id: f.id,
          label: f.label || f.name || f.id,
        }))}
        onAskAI={(sub) =>
          onAskAI({
            artifactId: modArt.id,
            artifactName: modArt.name,
            artifactType: modArt.type,
            targetPath: sub ? `layout.${sub.fieldId}` : undefined,
            label: sub ? `${modArt.name} → ${sub.fieldLabel}` : modArt.name,
          })
        }
        onEditInBuilder={() => onEditInBuilder(modArt)}
        className="h-full flex flex-col min-h-0"
      >
        <div className="h-full flex flex-col min-h-0 bg-white dark:bg-zinc-950 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
          {activeRecord ? (
            <div className="flex flex-col h-full min-h-0">
              {(() => {
                const wfStages: string[] = Array.isArray((draftMod as any)?.workflow?.nodes)
                  ? (draftMod as any).workflow.nodes
                      .map((n: any) => n.name || n.label)
                      .filter((s: any) => typeof s === 'string' && s.trim().length > 0)
                  : [];
                if (wfStages.length === 0) return null;
                const currentStage = String(activeRecord.status || wfStages[0]);
                return (
                  <div className="px-4 py-2.5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/60 shrink-0 space-y-1.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                        Workflow Stage (Sandbox)
                      </span>
                      <div className="flex items-center gap-1 flex-wrap">
                        {wfStages.map((stage) => {
                          const isCurrent = stage.toLowerCase() === currentStage.toLowerCase();
                          return (
                            <button
                              key={stage}
                              type="button"
                              onClick={() => {
                                if (isCurrent) return;
                                const res = transitionRecordStage(draftMod.id, activeRecord.id, stage);
                                setStageErrors(res.ok ? [] : res.errors);
                              }}
                              className={cn(
                                'px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors border cursor-pointer',
                                isCurrent
                                  ? 'bg-indigo-600 border-indigo-600 text-white'
                                  : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:border-indigo-300 hover:text-indigo-600'
                              )}
                            >
                              {stage}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    {stageErrors.length > 0 && (
                      <div className="px-2.5 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-[11px] text-rose-700 dark:text-rose-300">
                        Validation blocked transition: {stageErrors.join(' · ')}
                      </div>
                    )}
                  </div>
                );
              })()}
              <div className="flex-1 min-h-0 overflow-hidden">
                <RecordDetailView
                  key={`sol_detail_${activeRecord.id}`}
                  moduleIdProp={draftMod.id}
                  recordIdProp={activeRecord.id}
                  initialRecordProp={activeRecord}
                  isEmbedded={true}
                  previewConfig={previewConfig}
                  onClose={() => {
                    setStageErrors([]);
                    setActiveRecordId(null);
                  }}
                />
              </div>
            </div>
          ) : (
            <ModuleView
              key={`sol_mod_${draftMod.id}_${simulatedRole}`}
              previewConfig={previewConfig}
            />
          )}
        </div>
      </SelectablePreviewBlock>
    );
  };

  // Render a real FormRenderer in sandbox mode
  const renderFormScreen = (formArt: SolutionArtifact) => {
    const fc = formArt.content || {};
    const fields = Array.isArray(fc.fields)
      ? fc.fields
      : Array.isArray(fc.layout)
      ? fc.layout
      : [];
    const normalizedForm = {
      ...fc,
      id: formArt.id,
      name: formArt.name,
      title: formArt.name,
      fields,
      customFields: Array.isArray(fc.customFields) ? fc.customFields : fields,
    };

    const linkedMod =
      draftModules.find((m) => m.id === formArt.linkedModuleId) || draftModules[0];

    return (
      <div className="h-full overflow-y-auto p-6 custom-scrollbar">
        <div className="max-w-2xl mx-auto">
          <SelectablePreviewBlock
            artifact={formArt}
            label={formArt.name}
            previewMode={previewMode}
            isSelected={selectedBlockId === formArt.id}
            onSelect={() => setSelectedBlockId(formArt.id)}
            subFields={fields.map((f: any) => ({ id: f.id, label: f.label || f.name || f.id }))}
            onAskAI={(sub) =>
              onAskAI({
                artifactId: formArt.id,
                artifactName: formArt.name,
                artifactType: formArt.type,
                targetPath: sub ? `fields.${sub.fieldId}` : undefined,
                label: sub ? `${formArt.name} → ${sub.fieldLabel}` : formArt.name,
              })
            }
            onEditInBuilder={() => onEditInBuilder(formArt)}
          >
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs">
              <div className="mb-4 pb-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
                    {formArt.name}
                  </h3>
                  {formArt.description && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      {formArt.description}
                    </p>
                  )}
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/20">
                  Sandbox Interactive
                </span>
              </div>

              <FormRenderer
                form={normalizedForm}
                moduleLayout={(linkedMod as any)?.layout || []}
                workflow={(linkedMod as any)?.workflow}
                isPreviewMode={true}
                disableAutoBackendSubmit={true}
                onSubmit={(data) => submitFormToSandbox(formArt, data)}
              />
            </div>
          </SelectablePreviewBlock>
        </div>
      </div>
    );
  };

  // Render the default Live Home Overview (Intake Form + Recent Intakes + KPIs)
  const renderHomeOverview = () => {
    const primaryForm = formArtifacts[0];
    const primaryModuleArt = moduleArtifacts[0];
    const primaryRecords = primaryModuleArt ? getRecords(primaryModuleArt.id) : [];

    return (
      <div className="h-full overflow-y-auto p-5 space-y-5 custom-scrollbar">
        {/* Live Computed KPI Strip (updates in real time when sandbox records change) */}
        {kpiArtifacts.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {kpiArtifacts.slice(0, 3).map((kpi) => {
              const allSandboxRecs = primaryRecords;
              const approvedCount = allSandboxRecs.filter(
                (r) => String(r.status || '').toLowerCase() === 'approved' || String(r.status || '').toLowerCase() === 'completed'
              ).length;
              const isPct =
                kpi.content?.format === 'percentage' ||
                kpi.name.toLowerCase().includes('rate') ||
                kpi.name.toLowerCase().includes('sla');
              const computedValue =
                allSandboxRecs.length === 0
                  ? '0'
                  : isPct
                  ? `${Math.round((approvedCount / allSandboxRecs.length) * 100)}%`
                  : `${allSandboxRecs.length}`;
              const target = kpi.content?.targetValue;
              const numericVal = isPct
                ? allSandboxRecs.length > 0
                  ? Math.round((approvedCount / allSandboxRecs.length) * 100)
                  : 0
                : allSandboxRecs.length;
              const meetsTarget = typeof target === 'number' ? numericVal >= target : true;

              return (
                <SelectablePreviewBlock
                  key={kpi.id}
                  artifact={kpi}
                  label={kpi.name}
                  previewMode={previewMode}
                  isSelected={selectedBlockId === kpi.id}
                  onSelect={() => setSelectedBlockId(kpi.id)}
                  onAskAI={() =>
                    onAskAI({
                      artifactId: kpi.id,
                      artifactName: kpi.name,
                      artifactType: kpi.type,
                      label: kpi.name,
                    })
                  }
                  onEditInBuilder={() => onEditInBuilder(kpi)}
                >
                  <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
                    <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                      <span className="truncate font-medium">{kpi.name}</span>
                      <Target size={13} className="text-indigo-500 shrink-0" />
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-xl font-bold text-zinc-900 dark:text-white">
                        {computedValue}
                      </span>
                      <span
                        className={cn(
                          'text-[11px] font-medium',
                          meetsTarget
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-amber-600 dark:text-amber-400'
                        )}
                      >
                        {typeof target === 'number' ? `Target: ${target}${isPct ? '%' : ''}` : 'Live Sandbox'}
                      </span>
                    </div>
                  </div>
                </SelectablePreviewBlock>
              );
            })}
          </div>
        )}

        {/* Primary Working Split: Real Intake Form + Live Recent Records */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
          {primaryForm && (
            <div className={primaryModuleArt ? 'xl:col-span-7' : 'xl:col-span-12'}>
              <SelectablePreviewBlock
                artifact={primaryForm}
                label={primaryForm.name}
                previewMode={previewMode}
                isSelected={selectedBlockId === primaryForm.id}
                onSelect={() => setSelectedBlockId(primaryForm.id)}
                subFields={(primaryForm.content?.fields || primaryForm.content?.layout || []).map((f: any) => ({
                  id: f.id,
                  label: f.label || f.name || f.id,
                }))}
                onAskAI={(sub) =>
                  onAskAI({
                    artifactId: primaryForm.id,
                    artifactName: primaryForm.name,
                    artifactType: primaryForm.type,
                    targetPath: sub ? `fields.${sub.fieldId}` : undefined,
                    label: sub ? `${primaryForm.name} → ${sub.fieldLabel}` : primaryForm.name,
                  })
                }
                onEditInBuilder={() => onEditInBuilder(primaryForm)}
              >
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs">
                  <div className="mb-3 pb-2.5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-zinc-900 dark:text-white">
                      {primaryForm.name}
                    </h4>
                    <span className="text-[11px] text-zinc-400">Live Form</span>
                  </div>
                  <FormRenderer
                    form={{
                      ...(primaryForm.content || {}),
                      id: primaryForm.id,
                      name: primaryForm.name,
                      title: primaryForm.name,
                      fields: primaryForm.content?.fields || primaryForm.content?.layout || [],
                      customFields:
                        primaryForm.content?.customFields ||
                        primaryForm.content?.fields ||
                        primaryForm.content?.layout ||
                        [],
                    }}
                    moduleLayout={(draftModules[0] as any)?.layout || []}
                    isPreviewMode={true}
                    disableAutoBackendSubmit={true}
                    onSubmit={(data) => submitFormToSandbox(primaryForm, data)}
                  />
                </div>
              </SelectablePreviewBlock>
            </div>
          )}

          {primaryModuleArt && (
            <div className={primaryForm ? 'xl:col-span-5' : 'xl:col-span-12'}>
              <SelectablePreviewBlock
                artifact={primaryModuleArt}
                label={primaryModuleArt.name}
                previewMode={previewMode}
                isSelected={selectedBlockId === primaryModuleArt.id}
                onSelect={() => setSelectedBlockId(primaryModuleArt.id)}
                onAskAI={() =>
                  onAskAI({
                    artifactId: primaryModuleArt.id,
                    artifactName: primaryModuleArt.name,
                    artifactType: primaryModuleArt.type,
                    label: primaryModuleArt.name,
                  })
                }
                onEditInBuilder={() => onEditInBuilder(primaryModuleArt)}
              >
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-semibold text-zinc-900 dark:text-white">
                        Recent {primaryModuleArt.name}
                      </h4>
                      <p className="text-[11px] text-zinc-400">
                        {primaryRecords.length} sandbox records
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onSelectScreen(primaryModuleArt.id)}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                    >
                      <span>Open Full View</span>
                      <ArrowRight size={11} />
                    </button>
                  </div>

                  <div className="space-y-2">
                    {primaryRecords.slice(0, 5).map((rec) => {
                      const titleVal =
                        rec.full_name ||
                        rec.name ||
                        rec.title ||
                        rec.subject ||
                        rec.requester_email ||
                        rec._record_key ||
                        'Record';
                      const subVal = rec.email || rec.company || rec.category || rec._record_key;
                      return (
                        <button
                          key={rec.id}
                          type="button"
                          onClick={() => {
                            setActiveRecordId(rec.id);
                            onSelectScreen(primaryModuleArt.id);
                          }}
                          className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 hover:bg-indigo-50/40 dark:hover:bg-indigo-500/10 border border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between gap-2 text-left transition-colors cursor-pointer"
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate">
                              {String(titleVal)}
                            </div>
                            <div className="text-[11px] text-zinc-400 truncate">
                              {String(subVal)}
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 shrink-0">
                            {rec.status || 'New'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </SelectablePreviewBlock>
            </div>
          )}
        </div>

        {/* Active Workflows & Roles Summary Strip */}
        {(workflowArtifacts.length > 0 || roleArtifacts.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {workflowArtifacts.slice(0, 1).map((wf) => (
              <SelectablePreviewBlock
                key={wf.id}
                artifact={wf}
                label={wf.name}
                previewMode={previewMode}
                isSelected={selectedBlockId === wf.id}
                onSelect={() => setSelectedBlockId(wf.id)}
                onAskAI={() =>
                  onAskAI({
                    artifactId: wf.id,
                    artifactName: wf.name,
                    artifactType: wf.type,
                    label: wf.name,
                  })
                }
                onEditInBuilder={() => onEditInBuilder(wf)}
              >
                <div className="p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <GitBranch size={14} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                        {wf.name}
                      </div>
                      <div className="text-[11px] text-zinc-400 truncate">
                        {(wf.content?.nodes || []).length} workflow stages active in sandbox
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onEditInBuilder(wf)}
                    className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline shrink-0 cursor-pointer"
                  >
                    Edit Flow
                  </button>
                </div>
              </SelectablePreviewBlock>
            ))}

            {roleArtifacts.slice(0, 1).map((role) => (
              <SelectablePreviewBlock
                key={role.id}
                artifact={role}
                label={role.name}
                previewMode={previewMode}
                isSelected={selectedBlockId === role.id}
                onSelect={() => setSelectedBlockId(role.id)}
                onAskAI={() =>
                  onAskAI({
                    artifactId: role.id,
                    artifactName: role.name,
                    artifactType: role.type,
                    label: role.name,
                  })
                }
                onEditInBuilder={() => onEditInBuilder(role)}
              >
                <div className="p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                      <Shield size={14} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                        {role.name}
                      </div>
                      <div className="text-[11px] text-zinc-400 truncate">
                        Simulating as: {simulatedRole}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onEditInBuilder(role)}
                    className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline shrink-0 cursor-pointer"
                  >
                    Edit Role
                  </button>
                </div>
              </SelectablePreviewBlock>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Live Interactive Renderers for Report, Queue, Site, and Page screens
  const renderGenericScreen = (art: SolutionArtifact) => {
    const normType = normalizeArtifactType(art.type);
    const meta = getComponentMeta(art.type);
    const Icon = meta.icon;
    const primaryMod =
      moduleArtifacts.find((m) => m.id === (art.content?.sourceModuleId || art.linkedModuleId)) ||
      moduleArtifacts[0];
    const sandboxRecs = primaryMod ? getRecords(primaryMod.id) : [];

    // 1. REAL REPORT CHART (Recharts computed live from sandbox records — supports canonical ReportConfig.widgets)
    if (normType === 'REPORT') {
      const firstWidget = Array.isArray(art.content?.widgets) ? art.content.widgets[0] : null;
      const groupField = firstWidget?.properties?.xAxisKey || art.content?.groupBy || 'status';
      const chartType = firstWidget?.type || art.content?.chartType || 'bar';
      const counts = new Map<string, number>();
      sandboxRecs.forEach((r) => {
        const key = String(r[groupField] || r.status || 'Uncategorized');
        counts.set(key, (counts.get(key) || 0) + 1);
      });
      const chartData = Array.from(counts.entries()).map(([name, value]) => ({ name, value }));
      const palette = [brandPrimary, '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6'];

      return (
        <div className="h-full overflow-y-auto p-6 custom-scrollbar">
          <div className="max-w-4xl mx-auto">
            <SelectablePreviewBlock
              artifact={art}
              label={art.name}
              previewMode={previewMode}
              isSelected={selectedBlockId === art.id}
              onSelect={() => setSelectedBlockId(art.id)}
              onAskAI={() => onAskAI({ artifactId: art.id, artifactName: art.name, artifactType: art.type, label: art.name })}
              onEditInBuilder={() => onEditInBuilder(art)}
            >
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 flex items-center justify-center"><BarChart2 size={16} /></div>
                    <div>
                      <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">{art.name}</h3>
                      <p className="text-xs text-zinc-400">Live from {primaryMod?.name || 'Sandbox'} ({sandboxRecs.length} records grouped by {groupField})</p>
                    </div>
                  </div>
                </div>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    {chartType === 'line' ? (
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Line type="monotone" dataKey="value" stroke={brandPrimary} strokeWidth={2.5} />
                      </LineChart>
                    ) : chartType === 'pie' ? (
                      <PieChart>
                        <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                          {chartData.map((_, i) => <Cell key={i} fill={palette[i % palette.length]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    ) : (
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="value" fill={brandPrimary} radius={[6, 6, 0, 0]} />
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>
            </SelectablePreviewBlock>
          </div>
        </div>
      );
    }

    // 2. REAL INTERACTIVE WORK QUEUE
    if (normType === 'QUEUE') {
      const stages = ['New', 'In Progress', 'Approved', 'Completed'];
      return (
        <div className="h-full overflow-y-auto p-6 custom-scrollbar">
          <div className="max-w-4xl mx-auto">
            <SelectablePreviewBlock
              artifact={art}
              label={art.name}
              previewMode={previewMode}
              isSelected={selectedBlockId === art.id}
              onSelect={() => setSelectedBlockId(art.id)}
              onAskAI={() => onAskAI({ artifactId: art.id, artifactName: art.name, artifactType: art.type, label: art.name })}
              onEditInBuilder={() => onEditInBuilder(art)}
            >
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-500/15 text-amber-600 flex items-center justify-center"><ListOrdered size={16} /></div>
                    <div>
                      <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">{art.name}</h3>
                      <p className="text-xs text-zinc-400">{sandboxRecs.length} items in active sandbox queue</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  {sandboxRecs.map((rec) => {
                    const curIdx = stages.indexOf(rec.status || 'New');
                    const nextStage = stages[Math.min(stages.length - 1, (curIdx >= 0 ? curIdx : 0) + 1)];
                    return (
                      <div key={rec.id} className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                            {rec.full_name || rec.name || rec.title || rec._record_key}
                          </div>
                          <div className="text-[11px] text-zinc-400">{rec._record_key} · {rec.email || rec.site_address || 'Active work item'}</div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700">{rec.status || 'New'}</span>
                          {primaryMod && rec.status !== 'Completed' && (
                            <button
                              type="button"
                              onClick={() =>
                                updateRecords(
                                  primaryMod.id,
                                  (prev) => prev.map((r) => (r.id === rec.id ? { ...r, status: nextStage } : r)),
                                  `Moved to ${nextStage}`
                                )
                              }
                              className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-medium cursor-pointer"
                            >
                              Advance → {nextStage}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </SelectablePreviewBlock>
          </div>
        </div>
      );
    }

    // 3. REAL FRAMED SITE / EXTERNAL PORTAL PREVIEW
    if (normType === 'SITE') {
      const embeddedForm =
        formArtifacts.find((f) => f.id === art.content?.linkedFormId) || formArtifacts[0];
      return (
        <div className="h-full overflow-y-auto p-6 custom-scrollbar">
          <div className="max-w-3xl mx-auto">
            <SelectablePreviewBlock
              artifact={art}
              label={art.name}
              previewMode={previewMode}
              isSelected={selectedBlockId === art.id}
              onSelect={() => setSelectedBlockId(art.id)}
              onAskAI={() => onAskAI({ artifactId: art.id, artifactName: art.name, artifactType: art.type, label: art.name })}
              onEditInBuilder={() => onEditInBuilder(art)}
            >
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs">
                {/* Browser URL Bar */}
                <div className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800/80 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-[11px] text-zinc-500">
                  <span className="inline-flex items-center gap-1.5 font-mono">
                    <Globe size={12} className="text-indigo-500" />
                    https://{art.content?.domain || `${art.slug || 'portal'}.aurora.app`}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-[10px]">
                    {art.content?.access || 'Public'} Portal
                  </span>
                </div>
                <div className="p-6 space-y-5">
                  <div className="p-5 rounded-xl text-white" style={{ backgroundColor: brandPrimary }}>
                    <h3 className="text-base font-bold">{art.name}</h3>
                    <p className="text-xs opacity-90 mt-1">{art.description || 'Self-service customer portal'}</p>
                  </div>
                  {embeddedForm ? (
                    <FormRenderer
                      form={{
                        ...(embeddedForm.content || {}),
                        id: embeddedForm.id,
                        name: embeddedForm.name,
                        title: embeddedForm.name,
                        fields: embeddedForm.content?.fields || embeddedForm.content?.layout || [],
                        customFields: embeddedForm.content?.customFields || embeddedForm.content?.fields || embeddedForm.content?.layout || [],
                      }}
                      moduleLayout={(draftModules[0] as any)?.layout || []}
                      isPreviewMode={true}
                      disableAutoBackendSubmit={true}
                      onSubmit={(data) => submitFormToSandbox(embeddedForm, data)}
                    />
                  ) : (
                    <p className="text-xs text-zinc-500">Link a Form in Site Builder to embed live intake here.</p>
                  )}
                </div>
              </div>
            </SelectablePreviewBlock>
          </div>
        </div>
      );
    }

    // 4. PAGE (Configured Widgets or Markdown)
    return (
      <div className="h-full overflow-y-auto p-6 custom-scrollbar">
        <div className="max-w-3xl mx-auto">
          <SelectablePreviewBlock
            artifact={art}
            label={art.name}
            previewMode={previewMode}
            isSelected={selectedBlockId === art.id}
            onSelect={() => setSelectedBlockId(art.id)}
            onAskAI={() =>
              onAskAI({
                artifactId: art.id,
                artifactName: art.name,
                artifactType: art.type,
                label: art.name,
              })
            }
            onEditInBuilder={() => onEditInBuilder(art)}
          >
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <Icon size={17} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
                      {art.name}
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {art.description || meta.description}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onEditInBuilder(art)}
                  className="h-8 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <SlidersHorizontal size={12} />
                  <span>Edit in Builder</span>
                </button>
              </div>

              {Array.isArray(art.content?.widgets) && art.content.widgets.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {art.content.widgets.map((w: any, i: number) => (
                    <div key={w.id || i} className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                      <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-100">{w.title || w.type || 'Widget'}</div>
                      <div className="text-[11px] text-zinc-500 mt-1">{w.content || w.description || 'Configured page widget'}</div>
                    </div>
                  ))}
                </div>
              ) : art.content?.markdown ? (
                <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
                  {art.content.markdown}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                  <span>
                    Ready in draft state. Open <strong>Edit in Builder</strong> to drag widgets onto this page.
                  </span>
                </div>
              )}
            </div>
          </SelectablePreviewBlock>
        </div>
      </div>
    );
  };

  return (
    <div
      onClick={() => setSelectedBlockId(null)}
      className="h-full flex flex-col bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs overflow-hidden"
    >
      {/* Framed Live App Top Bar */}
      <div className="h-11 px-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center text-white text-[11px] font-bold shrink-0"
            style={{ backgroundColor: brandPrimary }}
          >
            {(solutionName || 'A').slice(0, 1).toUpperCase()}
          </div>
          <span className="text-xs font-semibold text-zinc-900 dark:text-white truncate">
            {solutionName}
          </span>
          {/* Compact screen switcher when no NAVIGATION (Menus) artifact is present */}
          {!navArtifact && navItems.length > 1 && (
            <div className="flex items-center gap-1.5 pl-2 border-l border-zinc-200 dark:border-zinc-800">
              <select
                value={effectiveScreenId}
                onChange={(e) => {
                  setActiveRecordId(null);
                  onSelectScreen(e.target.value);
                }}
                className="text-xs font-medium bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md px-2 py-0.5 text-zinc-700 dark:text-zinc-200 outline-none cursor-pointer max-w-[200px]"
                title="Switch active preview screen"
              >
                {navItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
            Role: {simulatedRole}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {mutationCount > 0 && (
            <button
              type="button"
              onClick={resetSandbox}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Reset in-memory sandbox records"
            >
              <RotateCcw size={11} />
              <span>Reset Data ({mutationCount})</span>
            </button>
          )}
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Draft Sandbox</span>
          </span>
        </div>
      </div>

      {/* Framed Live App Body: Menu Sidebar (only when NAVIGATION artifact exists) + Active Screen */}
      <div className="flex-1 flex min-h-0 overflow-hidden bg-zinc-50/70 dark:bg-zinc-950">
        {navArtifact && (
          <SelectablePreviewBlock
            artifact={navArtifact}
            label={navArtifact.name}
            previewMode={previewMode}
            isSelected={selectedBlockId === navArtifact.id}
            onSelect={() => setSelectedBlockId(navArtifact.id)}
            onAskAI={() =>
              onAskAI({
                artifactId: navArtifact.id,
                artifactName: navArtifact.name,
                artifactType: navArtifact.type,
                label: navArtifact.name,
              })
            }
            onEditInBuilder={() => onEditInBuilder(navArtifact)}
            className="w-48 shrink-0 hidden sm:flex flex-col border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60"
          >
            <aside className="flex-1 p-2.5 space-y-1 overflow-y-auto">
              <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 truncate">
                {navArtifact.name}
              </div>

              {navItems.map((item) => {
                const isActive = item.id === effectiveScreenId;
                const Icon = item.kind === 'home' ? Home : getComponentMeta(item.artifact!.type).icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveRecordId(null);
                      onSelectScreen(item.id);
                    }}
                    className={cn(
                      'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer text-left',
                      isActive
                        ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400'
                        : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100'
                    )}
                  >
                    <Icon size={13} className="shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </aside>
          </SelectablePreviewBlock>
        )}

        {/* Active Screen Viewport */}
        <div className="flex-1 min-w-0 min-h-0 overflow-hidden">
          {effectiveScreenId === '__home__' || !activeArtifact
            ? renderHomeOverview()
            : normalizeArtifactType(activeArtifact.type) === 'MODULE'
            ? renderModuleScreen(activeArtifact)
            : normalizeArtifactType(activeArtifact.type) === 'FORM'
            ? renderFormScreen(activeArtifact)
            : renderGenericScreen(activeArtifact)}
        </div>
      </div>
    </div>
  );
};
