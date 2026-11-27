import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  ArrowLeft,
  Monitor,
  Tablet,
  Smartphone,
  RotateCcw,
  RefreshCw,
  ShieldCheck,
  ChevronDown,
  Check,
  Database,
  Sparkles,
  Globe,
  Layout,
  Loader2,
  Search,
  Users
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import { Module } from '../../types/platform';
import { ModulePreviewConfig, PreviewDataSource } from '../../types/preview';
import { ModuleView } from '../../pages/Module/ModuleView';
import { RecordDetailView } from '../../pages/Record/RecordDetailView';
import { FormRenderer } from '../Builders/FormBuilder/FormRenderer';
import { generateMockDataset } from '../../utils/mockDataGenerator';
import { fetchRecords } from '../../services/dataService';
import { usePlatform } from '../../hooks/usePlatform';
import { useAuth } from '../../hooks/useAuth';

interface ModulePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Live in-memory draft module object directly from ModuleEditor */
  draftModule: Module;
  /** Tenant permission groups for Role Simulator */
  permissionGroups?: Array<{ id: string; name: string }>;
  /** If opened from Forms tab, pass the currently selected form ID */
  initialFormId?: string | null;
  /** Whether preview was opened from the Forms tab */
  openedFromFormsTab?: boolean;
  /** Current version tag being previewed (e.g. v1.2) */
  versionTag?: string;
  /** Whether the builder canvas has unsaved edits on top of versionTag */
  isDirty?: boolean;
  /** Whether the previewed version matches live production */
  isLiveVersion?: boolean;
  /** Optional handler to open the Versions & Releases modal when clicking the version pill */
  onOpenVersions?: () => void;
}

const PUBLIC_FORM_USAGES = new Set(['public_link', 'portal', 'site', 'embed', 'standalone']);

function isPublicOrPortalForm(form: any): boolean {
  if (!form) return false;
  if (form.isPublic || form.published) return true;
  return PUBLIC_FORM_USAGES.has(String(form.usage || '').toLowerCase());
}

export const ModulePreviewModal: React.FC<ModulePreviewModalProps> = ({
  isOpen,
  onClose,
  draftModule,
  permissionGroups = [],
  initialFormId = null,
  openedFromFormsTab = false,
  versionTag,
  isDirty = false,
  isLiveVersion = false,
  onOpenVersions
}) => {
  const { tenant, members = [] } = usePlatform();
  const { session } = useAuth();

  const moduleForms: any[] = useMemo(
    () => (Array.isArray((draftModule as any)?.forms) ? (draftModule as any).forms : []),
    [draftModule]
  );

  const publicForms = useMemo(
    () => moduleForms.filter(isPublicOrPortalForm),
    [moduleForms]
  );

  // Surface mode: 'workspace' (real ModuleView / RecordDetailView) vs 'public_form' (real FormRenderer)
  const [surface, setSurface] = useState<'workspace' | 'public_form'>('workspace');
  const [activePublicFormId, setActivePublicFormId] = useState<string>('');
  const [initialCreateFormId, setInitialCreateFormId] = useState<string | null>(null);

  // Sandbox data state
  const [dataSource, setDataSource] = useState<PreviewDataSource>('actual');
  const [isLoadingActual, setIsLoadingActual] = useState(false);
  const [actualSnapshot, setActualSnapshot] = useState<Record<string, any>[]>([]);
  const [sandboxRecords, setSandboxRecords] = useState<Record<string, any>[]>([]);
  const [sandboxMutationCount, setSandboxMutationCount] = useState(0);

  // Drilled-in record detail inside modal
  const [activeRecordId, setActiveRecordId] = useState<string | null>(null);

  // Viewport & Role / User Impersonation
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [simulatedRole, setSimulatedRole] = useState<string>('admin');
  const [simulatedUserId, setSimulatedUserId] = useState<string | null>(null);
  const [impersonateSearch, setImpersonateSearch] = useState('');
  const [impersonateTab, setImpersonateTab] = useState<'users' | 'roles'>('users');
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
  const [isFormMenuOpen, setIsFormMenuOpen] = useState(false);
  const roleMenuRef = useRef<HTMLDivElement>(null);
  const formMenuRef = useRef<HTMLDivElement>(null);

  // Escape key & outside clicks
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isRoleMenuOpen) setIsRoleMenuOpen(false);
        else if (isFormMenuOpen) setIsFormMenuOpen(false);
        else if (activeRecordId) setActiveRecordId(null);
        else onClose();
      }
    };
    const handleOutside = (e: MouseEvent) => {
      if (roleMenuRef.current && !roleMenuRef.current.contains(e.target as Node)) {
        setIsRoleMenuOpen(false);
      }
      if (formMenuRef.current && !formMenuRef.current.contains(e.target as Node)) {
        setIsFormMenuOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleOutside);
    };
  }, [isOpen, isRoleMenuOpen, isFormMenuOpen, activeRecordId, onClose]);

  const generateDummyRecords = useCallback(() => {
    const layout = (draftModule as any)?.layout || [];
    const raw = generateMockDataset(layout, { count: 12, domain: 'general' }) || [];
    const rawPrefix = (draftModule as any)?.recordKeyPrefix || 'REC';
    const prefix = rawPrefix.endsWith('-') ? rawPrefix.slice(0, -1) : rawPrefix;
    const suffix = (draftModule as any)?.recordKeySuffix || '';
    const startNum = Number((draftModule as any)?.nextKeyNumber) || 1;
    return raw.map((rec: any, idx: number) => {
      const recordKey = `${prefix}-${startNum + idx}${suffix}`;
      return {
        ...rec,
        id: rec.id || `mock_${idx + 1}_${Date.now()}`,
        moduleId: draftModule.id,
        _record_key: recordKey,
        status: rec.status || 'Open',
        createdAt: rec.createdAt || new Date(Date.now() - idx * 86400000).toISOString(),
        updatedAt: rec.updatedAt || new Date(Date.now() - idx * 43200000).toISOString(),
        data: { ...(rec.data || {}), ...rec, _record_key: recordKey }
      };
    });
  }, [draftModule]);

  // Initialize surface & load actual data snapshot (read-only clone) on modal open
  useEffect(() => {
    if (!isOpen) return;

    setActiveRecordId(null);
    setSandboxMutationCount(0);
    setViewport('desktop');

    // Determine initial surface (Workspace vs Public/Portal Form)
    if (openedFromFormsTab && initialFormId) {
      const targetForm = moduleForms.find(f => f.id === initialFormId);
      if (targetForm && isPublicOrPortalForm(targetForm)) {
        setSurface('public_form');
        setActivePublicFormId(targetForm.id);
        setInitialCreateFormId(null);
      } else {
        setSurface('workspace');
        setInitialCreateFormId(targetForm?.id || initialFormId);
        if (publicForms[0]) setActivePublicFormId(publicForms[0].id);
      }
    } else {
      setSurface('workspace');
      setInitialCreateFormId(null);
      if (publicForms[0]) setActivePublicFormId(publicForms[0].id);
    }

    // Fetch read-only clone of actual records if module exists; fallback to dummy data if empty
    let cancelled = false;
    const loadActualData = async () => {
      const modId = draftModule?.id;
      const token = (import.meta as any).env?.VITE_DEV_TOKEN || session?.access_token;
      if (!modId || modId === 'new' || !tenant?.id || !token) {
        const mocks = generateDummyRecords();
        if (!cancelled) {
          setActualSnapshot([]);
          setDataSource('mock');
          setSandboxRecords(mocks);
        }
        return;
      }

      setIsLoadingActual(true);
      try {
        const res = await fetchRecords(modId, tenant.id, token, 1, 50);
        const recs = Array.isArray(res?.records) ? res.records : [];
        if (cancelled) return;
        if (recs.length > 0) {
          const cloned = JSON.parse(JSON.stringify(recs));
          setActualSnapshot(cloned);
          setDataSource('actual');
          setSandboxRecords(JSON.parse(JSON.stringify(cloned)));
        } else {
          const mocks = generateDummyRecords();
          setActualSnapshot([]);
          setDataSource('mock');
          setSandboxRecords(mocks);
        }
      } catch {
        if (!cancelled) {
          const mocks = generateDummyRecords();
          setActualSnapshot([]);
          setDataSource('mock');
          setSandboxRecords(mocks);
        }
      } finally {
        if (!cancelled) setIsLoadingActual(false);
      }
    };

    loadActualData();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const handleSwitchDataSource = (next: PreviewDataSource) => {
    if (next === dataSource) return;
    setActiveRecordId(null);
    setSandboxMutationCount(0);
    setDataSource(next);
    if (next === 'actual') {
      if (actualSnapshot.length > 0) {
        setSandboxRecords(JSON.parse(JSON.stringify(actualSnapshot)));
      } else {
        setSandboxRecords([]);
        toast.info('No live records exist in this module yet — you can create test records in the sandbox.');
      }
    } else {
      setSandboxRecords(generateDummyRecords());
    }
  };

  const handleResetSandbox = () => {
    setActiveRecordId(null);
    setSandboxMutationCount(0);
    if (dataSource === 'actual') {
      setSandboxRecords(JSON.parse(JSON.stringify(actualSnapshot)));
      toast.success('Sandbox reset to clean copy of actual data');
    } else {
      setSandboxRecords(generateDummyRecords());
      toast.success('Generated fresh dummy dataset');
    }
  };

  const handleSandboxRecordsChange = useCallback(
    (updater: (prev: Record<string, any>[]) => Record<string, any>[]) => {
      setSandboxRecords(prev => updater(prev));
      setSandboxMutationCount(c => c + 1);
    },
    []
  );

  const simulatedUser = useMemo(() => {
    if (!simulatedUserId) return null;
    const m: any = (members || []).find((item: any) => item.id === simulatedUserId);
    if (!m) return null;
    const rawGroups = Array.isArray(m.permissionGroupIds)
      ? m.permissionGroupIds
      : Array.isArray(m.permissionGroups)
      ? m.permissionGroups.map((g: any) => (typeof g === 'string' ? g : g.id || g.permissionGroupId))
      : [];
    const roleVal = m.role || m.roleId || 'staff';
    return {
      id: m.id,
      userId: m.userId || m.id,
      name: m.name || m.email || 'User',
      email: m.email,
      avatarUrl: m.avatarUrl,
      role: roleVal,
      roleId: m.roleId || roleVal,
      isSuperAdmin: Boolean(m.isSuperAdmin || String(roleVal).toLowerCase().includes('admin')),
      permissionGroupIds: rawGroups,
      teamId: m.teamId,
      positionId: m.positionId
    };
  }, [simulatedUserId, members]);

  const previewConfig: ModulePreviewConfig = useMemo(
    () => ({
      enabled: true,
      moduleOverride: draftModule,
      dataSource,
      records: sandboxRecords,
      onRecordsChange: handleSandboxRecordsChange,
      simulatedRole: simulatedUser ? simulatedUser.role : simulatedRole,
      simulatedUser,
      onOpenRecord: (rec) => setActiveRecordId(rec.id),
      initialCreateFormId
    }),
    [
      draftModule,
      dataSource,
      sandboxRecords,
      handleSandboxRecordsChange,
      simulatedRole,
      simulatedUser,
      initialCreateFormId
    ]
  );

  const activeRecord = useMemo(
    () => (activeRecordId ? sandboxRecords.find(r => r.id === activeRecordId) || null : null),
    [activeRecordId, sandboxRecords]
  );

  const activePublicForm = useMemo(
    () => publicForms.find(f => f.id === activePublicFormId) || publicForms[0] || null,
    [publicForms, activePublicFormId]
  );

  const roleOptions = useMemo(() => {
    const base = [
      { id: 'admin', label: 'Administrator', group: 'Standard Roles' },
      { id: 'manager', label: 'Department Manager', group: 'Standard Roles' },
      { id: 'staff', label: 'Standard Staff', group: 'Standard Roles' },
      { id: 'guest', label: 'External Guest', group: 'Standard Roles' }
    ];
    const custom = (permissionGroups || []).map(g => ({
      id: g.id,
      label: g.name,
      group: 'Security Groups'
    }));
    return [...base, ...custom];
  }, [permissionGroups]);

  const activeRoleLabel = simulatedUser
    ? simulatedUser.name
    : roleOptions.find(r => r.id === simulatedRole)?.label || 'Administrator';

  const filteredMembers = useMemo(() => {
    const q = impersonateSearch.trim().toLowerCase();
    const list = (members || []).filter((m: any) => m && (m.name || m.email));
    if (!q) return list;
    return list.filter(
      (m: any) =>
        String(m.name || '').toLowerCase().includes(q) ||
        String(m.email || '').toLowerCase().includes(q) ||
        String(m.role || m.roleId || '').toLowerCase().includes(q)
    );
  }, [members, impersonateSearch]);

  const filteredRoles = useMemo(() => {
    const q = impersonateSearch.trim().toLowerCase();
    if (!q) return roleOptions;
    return roleOptions.filter(r => r.label.toLowerCase().includes(q));
  }, [roleOptions, impersonateSearch]);

  const handlePublicFormSubmit = async (values: Record<string, any>) => {
    const rawPrefix = (draftModule as any)?.recordKeyPrefix || 'REC';
    const prefix = rawPrefix.endsWith('-') ? rawPrefix.slice(0, -1) : rawPrefix;
    const suffix = (draftModule as any)?.recordKeySuffix || '';
    const baseNext = Number((draftModule as any)?.nextKeyNumber) || 1;
    const maxExistingNum = sandboxRecords.reduce((max: number, r: any) => {
      const match = String(r?._record_key || '').match(/(\d+)/);
      const n = match ? parseInt(match[1], 10) : 0;
      return n > max ? n : max;
    }, 0);
    const nextNum = Math.max(baseNext, maxExistingNum + 1);
    const recordKey = `${prefix}-${nextNum}${suffix}`;
    const now = new Date().toISOString();
    const newRec: Record<string, any> = {
      id: `sandbox_form_${Date.now()}`,
      moduleId: draftModule.id,
      _record_key: recordKey,
      status: values.status || 'Open',
      createdAt: now,
      updatedAt: now,
      createdBy: 'Public Form Submission',
      ...values,
      data: { ...values, _record_key: recordKey }
    };
    handleSandboxRecordsChange(prev => [newRec, ...prev]);
    toast.success(`Submitted ${newRec._record_key} to Sandbox`, {
      action: {
        label: 'View in Workspace',
        onClick: () => {
          setSurface('workspace');
          setActiveRecordId(newRec.id);
        }
      }
    });
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
          />

          {/* Large Full-Studio Preview Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="relative w-[96vw] max-w-[1720px] h-[93vh] bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col z-10"
          >
            {/* Top 48px Sandbox Chrome Bar */}
            <div className="h-12 px-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between gap-3 shrink-0 relative z-[60]">
              {/* Left: Sandbox Pill + Back / Surface Switcher */}
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 shrink-0"
                  title="Changes made here stay in-memory and never affect your live database"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Sandbox Preview
                </span>

                {versionTag && (
                  <button
                    type="button"
                    onClick={onOpenVersions}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold border shrink-0 transition-colors',
                      onOpenVersions && 'cursor-pointer hover:brightness-95',
                      isLiveVersion
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700'
                    )}
                    title={
                      isDirty
                        ? `Previewing unsaved working edits on top of ${versionTag} — Click to view Versions`
                        : isLiveVersion
                        ? `Previewing live production version ${versionTag} — Click to view Versions`
                        : `Previewing saved draft version ${versionTag} — Click to view Versions`
                    }
                  >
                    <span>{versionTag.startsWith('v') ? versionTag : `v${versionTag}`}</span>
                    <span className="font-sans font-medium text-[10px] opacity-80">
                      {isDirty ? '· Unsaved' : isLiveVersion ? '· Live' : '· Draft'}
                    </span>
                  </button>
                )}

                {activeRecord && surface === 'workspace' ? (
                  <button
                    type="button"
                    onClick={() => setActiveRecordId(null)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  >
                    <ArrowLeft size={13} />
                    <span>Back to {draftModule.name}</span>
                    {activeRecord._record_key && (
                      <span className="font-mono text-[11px] text-zinc-400">
                        ({activeRecord._record_key})
                      </span>
                    )}
                  </button>
                ) : (
                  <div className="flex items-center gap-2 min-w-0">
                    {publicForms.length > 0 && (
                      <div className="flex items-center bg-zinc-100 dark:bg-zinc-800/80 p-0.5 rounded-lg shrink-0">
                        <button
                          type="button"
                          onClick={() => setSurface('workspace')}
                          className={cn(
                            'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer',
                            surface === 'workspace'
                              ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                              : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                          )}
                        >
                          <Layout size={12} />
                          <span>Workspace</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSurface('public_form');
                            setActiveRecordId(null);
                          }}
                          className={cn(
                            'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer',
                            surface === 'public_form'
                              ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                              : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                          )}
                        >
                          <Globe size={12} />
                          <span>Public / Portal Form</span>
                        </button>
                      </div>
                    )}

                    {/* Custom Public Form Selector when multiple public/portal forms exist */}
                    {surface === 'public_form' && publicForms.length > 1 && (
                      <div className="relative" ref={formMenuRef}>
                        <button
                          type="button"
                          onClick={() => setIsFormMenuOpen(v => !v)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer"
                        >
                          <span className="truncate max-w-[160px]">{activePublicForm?.name || 'Select form'}</span>
                          <ChevronDown size={13} className="text-zinc-400" />
                        </button>
                        {isFormMenuOpen && (
                          <div className="absolute left-0 mt-1.5 w-56 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl py-1 z-50">
                            {publicForms.map(f => (
                              <button
                                key={f.id}
                                type="button"
                                onClick={() => {
                                  setActivePublicFormId(f.id);
                                  setIsFormMenuOpen(false);
                                }}
                                className={cn(
                                  'w-full px-3 py-2 text-left text-xs font-medium flex items-center justify-between transition-colors cursor-pointer',
                                  f.id === activePublicForm?.id
                                    ? 'bg-indigo-50/70 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                                )}
                              >
                                <span className="truncate">{f.name}</span>
                                {f.id === activePublicForm?.id && <Check size={13} />}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Center: Data Source Switcher (Actual Data vs Dummy Data) + Reset */}
              {surface === 'workspace' && (
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center bg-zinc-100 dark:bg-zinc-800/80 p-0.5 rounded-lg">
                    <button
                      type="button"
                      onClick={() => handleSwitchDataSource('actual')}
                      className={cn(
                        'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer',
                        dataSource === 'actual'
                          ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                          : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                      )}
                      title="Play safely with a read-only clone of your real records"
                    >
                      <Database size={12} className={dataSource === 'actual' ? 'text-emerald-500' : ''} />
                      <span>Actual Data</span>
                      {actualSnapshot.length > 0 && (
                        <span className="text-[10px] font-mono text-zinc-400">({actualSnapshot.length})</span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSwitchDataSource('mock')}
                      className={cn(
                        'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer',
                        dataSource === 'mock'
                          ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                          : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                      )}
                      title="Test with generated dummy records"
                    >
                      <Sparkles size={12} className={dataSource === 'mock' ? 'text-indigo-500' : ''} />
                      <span>Dummy Data</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleResetSandbox}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer',
                      sandboxMutationCount > 0
                        ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30 hover:bg-amber-100/80'
                        : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    )}
                    title={dataSource === 'actual' ? 'Reset sandbox edits back to clean data' : 'Generate fresh dummy records'}
                  >
                    {sandboxMutationCount > 0 ? <RotateCcw size={12} /> : <RefreshCw size={12} />}
                    <span className="hidden md:inline">
                      {sandboxMutationCount > 0
                        ? `Reset (${sandboxMutationCount})`
                        : dataSource === 'mock'
                        ? 'Randomize'
                        : 'Reset'}
                    </span>
                  </button>
                </div>
              )}

              {/* Right: Role Simulator + Viewport Switcher + Close */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Custom User & Role Impersonation Dropdown */}
                {surface === 'workspace' && (
                  <div className="relative" ref={roleMenuRef}>
                    <button
                      type="button"
                      onClick={() => setIsRoleMenuOpen(v => !v)}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors cursor-pointer',
                        simulatedUser
                          ? 'border-indigo-300 dark:border-indigo-500/40 bg-indigo-50/70 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300'
                          : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                      )}
                      title="Impersonate an actual workspace user or role to test permissions, views, and field security"
                    >
                      {simulatedUser?.avatarUrl ? (
                        <img
                          src={simulatedUser.avatarUrl}
                          alt={simulatedUser.name}
                          className="w-4 h-4 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <ShieldCheck size={13} className="text-indigo-500 shrink-0" />
                      )}
                      <span className="hidden xl:inline text-zinc-400 font-normal">View as:</span>
                      <span className="hidden lg:inline max-w-[140px] truncate">{activeRoleLabel}</span>
                      <ChevronDown size={12} className="text-zinc-400" />
                    </button>

                    {isRoleMenuOpen && (
                      <div className="absolute right-0 mt-1.5 w-80 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden z-[70] flex flex-col">
                        {/* Search Input */}
                        <div className="p-2.5 border-b border-zinc-100 dark:border-zinc-800 space-y-2">
                          <div className="relative">
                            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                            <input
                              type="text"
                              value={impersonateSearch}
                              onChange={e => setImpersonateSearch(e.target.value)}
                              placeholder="Search by name, email, or role..."
                              className="w-full pl-8 pr-7 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                              autoFocus
                            />
                            {impersonateSearch && (
                              <button
                                type="button"
                                onClick={() => setImpersonateSearch('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                              >
                                <X size={12} />
                              </button>
                            )}
                          </div>

                          {/* Scalable Users vs Roles & Groups Segmented Tabs */}
                          <div className="grid grid-cols-2 gap-1 p-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800/80">
                            <button
                              type="button"
                              onClick={() => setImpersonateTab('users')}
                              className={cn(
                                'py-1 px-2 rounded-md text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer',
                                impersonateTab === 'users'
                                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                              )}
                            >
                              <Users size={11} />
                              <span>Users</span>
                              <span className="font-mono text-[10px] text-zinc-400">({filteredMembers.length})</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setImpersonateTab('roles')}
                              className={cn(
                                'py-1 px-2 rounded-md text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer',
                                impersonateTab === 'roles'
                                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                              )}
                            >
                              <ShieldCheck size={11} />
                              <span>Roles &amp; Groups</span>
                              <span className="font-mono text-[10px] text-zinc-400">({filteredRoles.length})</span>
                            </button>
                          </div>
                        </div>

                        {/* Results List (Windowed to top 30 for instant performance at 1,000+ users) */}
                        <div className="overflow-y-auto max-h-72 py-1 custom-scrollbar">
                          {impersonateTab === 'users' ? (
                            filteredMembers.length === 0 ? (
                              <div className="py-8 px-4 text-center text-xs text-zinc-400">
                                {impersonateSearch
                                  ? `No users matching "${impersonateSearch}"`
                                  : 'No workspace users found'}
                              </div>
                            ) : (
                              <>
                                {filteredMembers.slice(0, 30).map((member: any) => {
                                  const isSelected = simulatedUserId === member.id;
                                  const initials = String(member.name || member.email || 'U')
                                    .split(' ')
                                    .map((p: string) => p[0])
                                    .join('')
                                    .slice(0, 2)
                                    .toUpperCase();
                                  return (
                                    <button
                                      key={member.id}
                                      type="button"
                                      onClick={() => {
                                        setSimulatedUserId(member.id);
                                        setIsRoleMenuOpen(false);
                                        setImpersonateSearch('');
                                        toast.info(`Impersonating ${member.name || member.email} in sandbox`);
                                      }}
                                      className={cn(
                                        'w-full px-3 py-2 text-left flex items-center justify-between gap-2.5 transition-colors cursor-pointer',
                                        isSelected
                                          ? 'bg-indigo-50/70 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                                          : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/70'
                                      )}
                                    >
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        {member.avatarUrl ? (
                                          <img
                                            src={member.avatarUrl}
                                            alt={member.name}
                                            className="w-6 h-6 rounded-full object-cover shrink-0"
                                          />
                                        ) : (
                                          <span className="w-6 h-6 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-semibold flex items-center justify-center shrink-0">
                                            {initials}
                                          </span>
                                        )}
                                        <div className="min-w-0">
                                          <div className="text-xs font-medium text-zinc-900 dark:text-white truncate">
                                            {member.name || member.email}
                                          </div>
                                          <div className="text-[11px] text-zinc-400 truncate flex items-center gap-1.5">
                                            {member.email && <span className="truncate">{member.email}</span>}
                                            {(member.role || member.roleId) && (
                                              <span className="px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-[10px] text-zinc-500 dark:text-zinc-400 shrink-0">
                                                {member.role || member.roleId}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                      {isSelected && <Check size={14} className="text-indigo-600 dark:text-indigo-400 shrink-0" />}
                                    </button>
                                  );
                                })}
                                {filteredMembers.length > 30 && (
                                  <div className="px-3 py-2 text-center text-[11px] text-zinc-400 border-t border-zinc-100 dark:border-zinc-800">
                                    Showing 30 of {filteredMembers.length} users — type to filter
                                  </div>
                                )}
                              </>
                            )
                          ) : filteredRoles.length === 0 ? (
                            <div className="py-8 px-4 text-center text-xs text-zinc-400">
                              No roles or groups matching "{impersonateSearch}"
                            </div>
                          ) : (
                            <>
                              {['Standard Roles', 'Security Groups'].map(groupName => {
                                const groupItems = filteredRoles.filter(r => r.group === groupName);
                                if (groupItems.length === 0) return null;
                                return (
                                  <div key={groupName} className="mb-1 last:mb-0">
                                    <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                                      {groupName}
                                    </div>
                                    {groupItems.map(role => {
                                      const isSelected = !simulatedUserId && simulatedRole === role.id;
                                      return (
                                        <button
                                          key={role.id}
                                          type="button"
                                          onClick={() => {
                                            setSimulatedUserId(null);
                                            setSimulatedRole(role.id);
                                            setIsRoleMenuOpen(false);
                                            setImpersonateSearch('');
                                            toast.info(`Viewing sandbox as ${role.label}`);
                                          }}
                                          className={cn(
                                            'w-full px-3 py-2 text-left text-xs font-medium flex items-center justify-between transition-colors cursor-pointer',
                                            isSelected
                                              ? 'bg-indigo-50/70 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                                              : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/70'
                                          )}
                                        >
                                          <span className="truncate">{role.label}</span>
                                          {isSelected && <Check size={14} className="shrink-0" />}
                                        </button>
                                      );
                                    })}
                                  </div>
                                );
                              })}
                            </>
                          )}
                        </div>

                        {/* Quick Reset Footer when impersonating */}
                        {(simulatedUserId || simulatedRole !== 'admin') && (
                          <div className="px-3 py-2 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/50 flex items-center justify-between">
                            <span className="text-[11px] text-zinc-500 truncate">
                              Viewing as <strong className="text-zinc-800 dark:text-zinc-200">{activeRoleLabel}</strong>
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setSimulatedUserId(null);
                                setSimulatedRole('admin');
                                setImpersonateSearch('');
                                setIsRoleMenuOpen(false);
                                toast.info('Reset view to Administrator');
                              }}
                              className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline shrink-0 cursor-pointer"
                            >
                              Reset
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Responsive Viewport Switcher */}
                <div className="hidden sm:flex items-center bg-zinc-100 dark:bg-zinc-800/80 p-0.5 rounded-lg">
                  {([
                    { id: 'desktop', icon: Monitor, label: 'Desktop' },
                    { id: 'tablet', icon: Tablet, label: 'Tablet (768px)' },
                    { id: 'mobile', icon: Smartphone, label: 'Mobile (390px)' }
                  ] as const).map(v => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setViewport(v.id)}
                      className={cn(
                        'p-1.5 rounded-md transition-colors cursor-pointer',
                        viewport === v.id
                          ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                          : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                      )}
                      title={v.label}
                    >
                      <v.icon size={14} />
                    </button>
                  ))}
                </div>

                <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800" />

                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  title="Close Preview (Esc)"
                >
                  <X size={15} />
                  <span className="hidden sm:inline">Close</span>
                </button>
              </div>
            </div>

            {/* Modal Body: Real Workspace UI or Real Public/Portal FormRenderer */}
            <div className="flex-1 min-h-0 flex justify-center overflow-hidden bg-zinc-100/70 dark:bg-zinc-950">
              {isLoadingActual ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 text-zinc-500">
                  <Loader2 size={24} className="animate-spin text-indigo-500" />
                  <p className="text-xs font-medium">Loading sandbox snapshot...</p>
                </div>
              ) : (
                <div
                  className={cn(
                    'h-full flex flex-col overflow-hidden transition-all duration-200 bg-white dark:bg-zinc-950',
                    viewport === 'desktop' && 'w-full',
                    viewport === 'tablet' && 'w-[768px] max-w-full my-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl',
                    viewport === 'mobile' && 'w-[390px] max-w-full my-4 rounded-[2rem] border-4 border-zinc-300 dark:border-zinc-700 shadow-2xl'
                  )}
                >
                  {surface === 'public_form' && activePublicForm ? (
                    <div className="flex-1 overflow-y-auto p-6 sm:p-10 bg-zinc-50 dark:bg-zinc-950 custom-scrollbar flex flex-col items-center">
                      <div className="w-full max-w-2xl">
                        <div className="mb-4 flex items-center justify-between text-xs text-zinc-500">
                          <span className="inline-flex items-center gap-1.5">
                            <Globe size={13} className="text-indigo-500" />
                            <span>
                              {activePublicForm.usage === 'portal' || activePublicForm.usage === 'site'
                                ? 'Portal / Site Form Preview'
                                : 'Standalone Public Form Preview'}
                            </span>
                          </span>
                          <span className="text-[11px] text-zinc-400">
                            Submissions save to Sandbox only
                          </span>
                        </div>
                        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm p-6 sm:p-8">
                          <FormRenderer
                            form={activePublicForm}
                            moduleLayout={(draftModule as any)?.layout || []}
                            workflow={(draftModule as any)?.workflow}
                            tabs={(draftModule as any)?.tabs || []}
                            isPreviewMode={true}
                            disableAutoBackendSubmit={true}
                            viewport={viewport}
                            onSubmit={handlePublicFormSubmit}
                          />
                        </div>
                      </div>
                    </div>
                  ) : activeRecord ? (
                    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                      <RecordDetailView
                        key={`sandbox_detail_${activeRecord.id}`}
                        moduleIdProp={draftModule.id}
                        recordIdProp={activeRecord.id}
                        initialRecordProp={activeRecord}
                        isEmbedded={true}
                        previewConfig={previewConfig}
                        onClose={() => setActiveRecordId(null)}
                      />
                    </div>
                  ) : (
                    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                      <ModuleView
                        key={`sandbox_module_${draftModule.id}_${dataSource}`}
                        previewConfig={previewConfig}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
