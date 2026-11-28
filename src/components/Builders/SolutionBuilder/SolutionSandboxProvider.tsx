import React, { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';
import { useSolutionStudio } from '../../../context/SolutionStudioContext';
import { SolutionArtifact } from '../../../types/solutions';
import { Module } from '../../../types/platform';
import { normalizeArtifactType } from './solutionComponentCatalog';
import { generateMockDataset } from '../../../utils/mockDataGenerator';
import { API_BASE_URL } from '../../../config';
import { supabase } from '../../../lib/supabase';
import { toast } from 'sonner';

export interface StageTransitionResult {
  ok: boolean;
  errors: string[];
}

export interface SolutionSandboxContextValue {
  draftModules: Module[];
  getModuleById: (moduleId: string, simulatedRoleName?: string) => Module | undefined;
  getRecords: (moduleId: string) => Record<string, any>[];
  updateRecords: (
    moduleId: string,
    updater: (prev: Record<string, any>[]) => Record<string, any>[],
    actionLabel?: string
  ) => void;
  submitFormToSandbox: (formArtifact: SolutionArtifact, formData: Record<string, any>) => void;
  transitionRecordStage: (moduleId: string, recordId: string, nextStage: string) => StageTransitionResult;
  resetSandbox: () => void;
  mutationCount: number;
}

const SolutionSandboxContext = createContext<SolutionSandboxContextValue | null>(null);

const PRESERVED_SANDBOX_FIELD_TYPES = new Set([
  'text', 'longText', 'textarea', 'number', 'currency', 'email', 'phone',
  'address', 'date', 'time', 'select', 'radio', 'checkbox', 'checkboxGroup',
  'boolean', 'toggle', 'slider', 'party', 'user', 'multi_user', 'team_select',
  'position_select', 'global_list', 'lookup', 'file', 'signature', 'url',
  'rating', 'progress', 'tag', 'richtext', 'calculation', 'autonumber',
  'rollup', 'fieldGroup', 'group', 'repeatableGroup', 'sub_module', 'relationship_m2m',
  'booking', 'booking_slot', 'ai_summary', 'connector', 'payment', 'colorpicker',
  'map', 'html', 'qr_scanner', 'canvas', 'chat', 'tabs_nested', 'accordion',
  'datatable', 'stepper', 'timeline', 'duallist', 'treeview', 'button',
  'buttonGroup', 'icon', 'card', 'image', 'video', 'audio', 'heading',
  'divider', 'spacer', 'alert',
]);

function normalizeFieldType(rawType?: string): string {
  const raw = String(rawType || 'text').trim();
  if (PRESERVED_SANDBOX_FIELD_TYPES.has(raw)) return raw;
  const t = raw.toLowerCase();
  if (t.includes('email')) return 'email';
  if (t.includes('phone') || t.includes('tel')) return 'phone';
  if (t.includes('date') && !t.includes('update')) return 'date';
  if (t.includes('num') || t.includes('int') || t.includes('dec') || t.includes('float')) return 'number';
  if (t.includes('curr') || t.includes('money') || t.includes('price') || t.includes('amount')) return 'currency';
  if (t.includes('bool') || t.includes('check')) return 'checkbox';
  if (t.includes('enum') || t.includes('select') || t.includes('picklist')) return 'select';
  if (t.includes('text') && t.includes('area')) return 'textarea';
  if (t.includes('long')) return 'longText';
  return 'text';
}

function artifactToDraftModule(
  art: SolutionArtifact,
  allArtifacts: SolutionArtifact[]
): Module {
  const c = art.content || {};
  const rawFields = Array.isArray(c.layout)
    ? c.layout
    : Array.isArray(c.fields)
    ? c.fields
    : [];

  const layout = rawFields.map((f: any, idx: number) => ({
    id: f.id || `field_${idx}`,
    label: f.label || f.name || `Field ${idx + 1}`,
    type: normalizeFieldType(f.type),
    required: Boolean(f.required),
    options: Array.isArray(f.options)
      ? f.options
      : normalizeFieldType(f.type) === 'select'
      ? ['New', 'In Progress', 'Approved', 'Completed']
      : undefined,
    x: f.x ?? (idx % 2) * 6,
    y: f.y ?? Math.floor(idx / 2) * 2,
    w: f.w ?? 6,
    h: f.h ?? 2,
  }));

  const linkedForms = allArtifacts
    .filter(
      (a) =>
        normalizeArtifactType(a.type) === 'FORM' &&
        (!a.linkedModuleId || a.linkedModuleId === art.id)
    )
    .map((fArt) => {
      const fc = fArt.content || {};
      const fields = Array.isArray(fc.fields)
        ? fc.fields
        : Array.isArray(fc.layout)
        ? fc.layout
        : [];
      return {
        ...fc,
        id: fArt.id,
        name: fArt.name,
        title: fArt.name,
        fields,
        customFields: Array.isArray(fc.customFields) ? fc.customFields : fields,
      };
    });

  const linkedWorkflow = allArtifacts.find(
    (a) =>
      normalizeArtifactType(a.type) === 'WORKFLOW' &&
      (!a.linkedModuleId || a.linkedModuleId === art.id)
  );

  const linkedValidations = allArtifacts
    .filter(
      (a) =>
        normalizeArtifactType(a.type) === 'VALIDATION' &&
        (!a.linkedModuleId || a.linkedModuleId === art.id)
    )
    .flatMap((v) => (Array.isArray(v.content?.rules) ? v.content.rules : []));

  return {
    id: art.id,
    name: art.name,
    slug: art.slug || art.id,
    description: art.description || '',
    category: c.category || 'Solution',
    iconName: c.iconName || 'Layers',
    type: c.type || 'REGISTRY',
    enabled: true,
    status: 'ACTIVE',
    layout,
    forms: linkedForms,
    workflow: linkedWorkflow?.content || undefined,
    validationRules: linkedValidations,
    interfaceSettings: c.interfaceSettings || {
      master: { layoutType: 'table' },
      detail: { layoutType: 'standard' },
    },
  } as unknown as Module;
}

function buildInitialRecordsForModule(mod: Module): Record<string, any>[] {
  const layout = (mod as any)?.layout || [];
  const raw = generateMockDataset(layout, { count: 6, domain: 'general' }) || [];
  const prefix = (mod.name || 'REC').replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'REC';
  return raw.map((rec: any, idx: number) => {
    const key = `${prefix}-${101 + idx}`;
    return {
      ...rec,
      id: rec.id || `sb_${mod.id}_${idx + 1}`,
      moduleId: mod.id,
      _record_key: key,
      status: rec.status || (idx === 0 ? 'New' : idx % 2 === 0 ? 'Approved' : 'In Progress'),
      createdAt: rec.createdAt || new Date(Date.now() - idx * 3600000 * 6).toISOString(),
      updatedAt: rec.updatedAt || new Date(Date.now() - idx * 3600000 * 2).toISOString(),
      data: { ...(rec.data || {}), ...rec, _record_key: key },
    };
  });
}

export const SolutionSandboxProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { artifacts } = useSolutionStudio();

  const draftModules = useMemo<Module[]>(() => {
    return artifacts
      .filter((a) => normalizeArtifactType(a.type) === 'MODULE')
      .map((a) => artifactToDraftModule(a, artifacts));
  }, [artifacts]);

  const [recordsByModule, setRecordsByModule] = useState<Record<string, Record<string, any>[]>>({});
  const [mutationCount, setMutationCount] = useState(0);

  // Seed mock records for any new draft module automatically, and hydrate linked/live modules with anonymized tenant samples
  useEffect(() => {
    setRecordsByModule((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const mod of draftModules) {
        if (!next[mod.id]) {
          next[mod.id] = buildInitialRecordsForModule(mod);
          changed = true;
        }
      }
      return changed ? next : prev;
    });

    // Attempt anonymized live seeding for modules that match or extend a live tenant module
    let cancelled = false;
    const hydrateFromLive = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        const tenantId = localStorage.getItem('aurora_active_tenant_id') || 'default-tenant';
        const headers: Record<string, string> = { 'x-tenant-id': tenantId };
        if (token) headers.Authorization = `Bearer ${token}`;

        for (const mod of draftModules) {
          const seedKey = (mod as any).sourceModuleId || mod.name || mod.id;
          if (!seedKey) continue;
          const res = await fetch(
            `${API_BASE_URL}/api/solutions/sandbox-seed/${encodeURIComponent(seedKey)}`,
            { headers }
          ).catch((): Response | null => null);
          if (!res || !res.ok || cancelled) continue;
          const payload = await res.json().catch((): any => null);
          if (payload?.seededFromLive && Array.isArray(payload.records) && payload.records.length > 0) {
            setRecordsByModule((prev) => {
              const existing = prev[mod.id] || [];
              if (existing.some((r) => r._seededFromLive)) return prev;
              return {
                ...prev,
                [mod.id]: payload.records.map((r: any) => ({ ...r, moduleId: mod.id })),
              };
            });
          }
        }
      } catch {
        // Silent fallback to synthetic mock records
      }
    };
    hydrateFromLive();
    return () => {
      cancelled = true;
    };
  }, [draftModules]);

  const getModuleById = useCallback(
    (moduleId: string, simulatedRoleName?: string): Module | undefined => {
      const baseMod = draftModules.find((m) => m.id === moduleId);
      if (!baseMod || !simulatedRoleName) return baseMod;

      // Apply matching draft RolePolicy (PERMISSION artifact) field visibility & CRUD rules
      const matchingRole = artifacts.find(
        (a) =>
          normalizeArtifactType(a.type) === 'PERMISSION' &&
          a.name.toLowerCase() === simulatedRoleName.toLowerCase()
      );
      if (!matchingRole?.content?.modulePolicies) return baseMod;

      const modPolicy =
        matchingRole.content.modulePolicies[moduleId] ||
        matchingRole.content.modulePolicies[(baseMod as any).slug || ''];
      if (!modPolicy) return baseMod;

      const fieldPolicies = modPolicy.fields || {};
      const filteredLayout = ((baseMod as any).layout || [])
        .filter((f: any) => fieldPolicies[f.id]?.visibility !== 'hidden')
        .map((f: any) => {
          const vis = fieldPolicies[f.id]?.visibility;
          if (vis === 'readonly') return { ...f, readOnly: true };
          if (vis === 'masked') return { ...f, readOnly: true, masked: true };
          return f;
        });

      return {
        ...baseMod,
        layout: filteredLayout,
        accessControl: {
          ...((baseMod as any).accessControl || {}),
          canCreate: modPolicy.create !== false,
          canUpdate: modPolicy.update !== false,
          canDelete: Boolean(modPolicy.delete),
          canExport: Boolean(modPolicy.export),
          rowScope: modPolicy.rowScope || 'ALL',
        },
      } as unknown as Module;
    },
    [draftModules, artifacts]
  );

  const getRecords = useCallback(
    (moduleId: string) => recordsByModule[moduleId] || [],
    [recordsByModule]
  );

  const updateRecords = useCallback(
    (
      moduleId: string,
      updater: (prev: Record<string, any>[]) => Record<string, any>[],
      actionLabel?: string
    ) => {
      setRecordsByModule((prev) => ({
        ...prev,
        [moduleId]: updater(prev[moduleId] || []),
      }));
      setMutationCount((c) => c + 1);
      if (actionLabel) {
        toast.success(`${actionLabel} (Sandbox only)`);
      }
    },
    []
  );

  const submitFormToSandbox = useCallback(
    (formArtifact: SolutionArtifact, formData: Record<string, any>) => {
      const targetMod =
        draftModules.find((m) => m.id === formArtifact.linkedModuleId) || draftModules[0];

      const targetId = targetMod?.id || formArtifact.id;
      const prefix = (targetMod?.name || 'SUB').replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'SUB';
      const newRecord = {
        ...formData,
        id: `sb_sub_${Date.now()}`,
        moduleId: targetId,
        _record_key: `${prefix}-${Math.floor(200 + Math.random() * 800)}`,
        status: formData.status || 'New',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        data: { ...formData },
      };

      setRecordsByModule((prev) => ({
        ...prev,
        [targetId]: [newRecord, ...(prev[targetId] || [])],
      }));
      setMutationCount((c) => c + 1);
      toast.success(
        targetMod
          ? `Submitted to "${targetMod.name}" sandbox (${newRecord._record_key})`
          : `Form submitted to Solution sandbox`
      );
    },
    [draftModules]
  );

  const transitionRecordStage = useCallback(
    (moduleId: string, recordId: string, nextStage: string): StageTransitionResult => {
      const mod = draftModules.find((m) => m.id === moduleId);
      const records = recordsByModule[moduleId] || [];
      const rec = records.find((r) => r.id === recordId);
      if (!rec) return { ok: false, errors: ['Record not found in sandbox.'] };

      // Evaluate any draft VALIDATION rules linked to this module
      const rules: any[] = Array.isArray((mod as any)?.validationRules)
        ? (mod as any).validationRules
        : [];
      const errors: string[] = [];

      for (const rule of rules) {
        if (rule?.enabled === false || rule?.isActive === false) continue;
        // Support both canonical ValidationEngine rules (conditionTree / errorMessage) and legacy flat rules
        const condNode = rule.conditionTree?.type === 'rule' ? rule.conditionTree : null;
        const fieldId = condNode?.fieldId || rule.fieldId || rule.field || rule.targetField || rule.targetFieldIds?.[0];
        const val = fieldId ? (rec[fieldId] ?? rec.data?.[fieldId]) : undefined;
        const ruleType = String(condNode?.operator || rule.type || rule.operator || '').toLowerCase();
        const expected = condNode ? condNode.value : rule.value;
        const label = rule.errorMessage || rule.message || rule.name || `Validation failed on ${fieldId || 'record'}`;

        if (ruleType === 'required' || ruleType === 'not_empty') {
          if (val === undefined || val === null || String(val).trim() === '') {
            errors.push(label);
          }
        } else if ((ruleType === 'regex' || ruleType === 'matches_regex') && (rule.pattern || expected) && val !== undefined) {
          try {
            if (!new RegExp(String(rule.pattern || expected)).test(String(val))) errors.push(label);
          } catch {}
        } else if ((ruleType === 'min' || ruleType === 'greater_or_equal') && expected !== undefined && Number(val) < Number(expected)) {
          errors.push(label);
        } else if (ruleType === 'greater_than' && expected !== undefined && Number(val) <= Number(expected)) {
          errors.push(label);
        } else if ((ruleType === 'max' || ruleType === 'less_or_equal') && expected !== undefined && Number(val) > Number(expected)) {
          errors.push(label);
        } else if (ruleType === 'less_than' && expected !== undefined && Number(val) >= Number(expected)) {
          errors.push(label);
        }
      }

      if (errors.length > 0) {
        toast.error(`Blocked by draft validation: ${errors[0]}`);
        return { ok: false, errors };
      }

      setRecordsByModule((prev) => ({
        ...prev,
        [moduleId]: (prev[moduleId] || []).map((r) =>
          r.id === recordId
            ? {
                ...r,
                status: nextStage,
                updatedAt: new Date().toISOString(),
                data: { ...(r.data || {}), status: nextStage },
              }
            : r
        ),
      }));
      setMutationCount((c) => c + 1);
      toast.success(`Moved to "${nextStage}" (Sandbox)`);
      return { ok: true, errors: [] };
    },
    [draftModules, recordsByModule]
  );

  const resetSandbox = useCallback(() => {
    const fresh: Record<string, Record<string, any>[]> = {};
    for (const mod of draftModules) {
      fresh[mod.id] = buildInitialRecordsForModule(mod);
    }
    setRecordsByModule(fresh);
    setMutationCount(0);
    toast.info('Sandbox sample data reset.');
  }, [draftModules]);

  return (
    <SolutionSandboxContext.Provider
      value={{
        draftModules,
        getModuleById,
        getRecords,
        updateRecords,
        submitFormToSandbox,
        transitionRecordStage,
        resetSandbox,
        mutationCount,
      }}
    >
      {children}
    </SolutionSandboxContext.Provider>
  );
};

export function useSolutionSandbox(): SolutionSandboxContextValue {
  const ctx = useContext(SolutionSandboxContext);
  if (!ctx) {
    throw new Error('useSolutionSandbox must be used within a SolutionSandboxProvider');
  }
  return ctx;
}
