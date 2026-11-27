import {
  ModuleVersionSnapshot,
  ModuleVersionSnapshotState,
  VersionFieldDiff,
  Field,
  AICommitResult
} from '../types/versionControl';
import { API_BASE_URL } from '../config';
import { supabase } from '../lib/supabase';

const STORAGE_KEY = 'aurora_module_version_snapshots';
let hasHydratedFromServer = false;

type Listener = (versions: ModuleVersionSnapshot[]) => void;
const listeners = new Set<Listener>();

function notifyListeners(versions: ModuleVersionSnapshot[]) {
  listeners.forEach(fn => {
    try {
      fn(versions);
    } catch (e) {
      console.error('Error notifying version control listener:', e);
    }
  });
}

async function resolveAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  try {
    const { data } = await supabase.auth.getSession();
    const token =
      data?.session?.access_token ||
      (import.meta as any).env?.VITE_DEV_TOKEN ||
      localStorage.getItem('aurora_token') ||
      '';
    if (token) headers['Authorization'] = `Bearer ${token}`;
    let tenantId = localStorage.getItem('aurora_active_tenant_id') || '';
    if (!tenantId) {
      const cacheRaw = localStorage.getItem('aurora_platform_cache');
      if (cacheRaw) {
        const parsed = JSON.parse(cacheRaw);
        tenantId = parsed?.tenant?.id || '';
      }
    }
    if (tenantId) headers['x-tenant-id'] = tenantId;
  } catch (_) {}
  return headers;
}

async function hydrateVersionsFromBackend(): Promise<void> {
  if (typeof window === 'undefined' || hasHydratedFromServer) return;
  hasHydratedFromServer = true;
  try {
    const headers = await resolveAuthHeaders();
    if (!headers['x-tenant-id'] || !headers['Authorization']) return;
    const res = await fetch(`${API_BASE_URL}/api/data/module-versions`, { headers });
    if (res.ok) {
      const serverVersions: ModuleVersionSnapshot[] = await res.json();
      if (Array.isArray(serverVersions) && serverVersions.length > 0) {
        const localRaw = localStorage.getItem(STORAGE_KEY);
        const localVersions: ModuleVersionSnapshot[] = localRaw ? JSON.parse(localRaw) : [];
        const mergedMap = new Map<string, ModuleVersionSnapshot>();
        localVersions.forEach(v => mergedMap.set(v.id, v));
        serverVersions.forEach(v => mergedMap.set(v.id, v));
        const merged = Array.from(mergedMap.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        notifyListeners(merged);
      }
    }
  } catch (_) {}
}

async function syncVersionsToBackend(list: ModuleVersionSnapshot[]): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const headers = await resolveAuthHeaders();
    if (!headers['x-tenant-id'] || !headers['Authorization']) return;
    await fetch(`${API_BASE_URL}/api/data/module-versions`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ versions: list })
    });
  } catch (err) {
    console.warn('[versionControlService] Background server sync warning:', err);
  }
}

export const mapFieldTypeToSql = (type?: string): string => {
  switch (type) {
    case 'number':
    case 'currency':
    case 'rating':
    case 'progress':
      return 'NUMERIC(14, 2)';
    case 'autonumber':
      return 'BIGINT';
    case 'checkbox':
    case 'boolean':
    case 'toggle':
      return 'BOOLEAN DEFAULT FALSE';
    case 'date':
      return 'DATE';
    case 'time':
      return 'TIME';
    case 'longText':
    case 'textarea':
    case 'richtext':
    case 'html':
      return 'TEXT';
    case 'file':
    case 'signature':
    case 'canvas':
      return 'VARCHAR(1024)';
    case 'select':
    case 'radio':
    case 'tag':
    case 'lookup':
    case 'user':
      return 'VARCHAR(255)';
    case 'sub_module':
    case 'relationship_m2m':
    case 'repeatableGroup':
    case 'fieldGroup':
      return 'JSONB';
    default:
      return 'VARCHAR(255)';
  }
};

const CONTAINER_ONLY_TYPES = new Set(['divider', 'spacer', 'heading', 'alert']);
const GROUP_TYPES = new Set(['fieldGroup', 'collapsible_group', 'repeatableGroup', 'section', 'columns', 'card']);

const flatten = (fields: Field[]): Array<Field & { _parentGroupLabel?: string }> => {
  const list: Array<Field & { _parentGroupLabel?: string }> = [];
  const walk = (items: Field[], parentGroupLabel?: string) => {
    (items || []).forEach(f => {
      if (!f) return;
      const isGroup = GROUP_TYPES.has(f.type) || Array.isArray(f.fields) || Array.isArray((f as any).children);
      if (!CONTAINER_ONLY_TYPES.has(f.type) && !GROUP_TYPES.has(f.type)) {
        list.push(parentGroupLabel ? { ...f, _parentGroupLabel: parentGroupLabel } : f);
      }
      const nextGroupLabel = isGroup ? (f.label || f.name || parentGroupLabel) : parentGroupLabel;
      if (Array.isArray(f.fields) && f.fields.length > 0) walk(f.fields, nextGroupLabel);
      if (Array.isArray((f as any).children) && (f as any).children.length > 0) walk((f as any).children, nextGroupLabel);
      if (Array.isArray((f as any).subFields) && (f as any).subFields.length > 0) walk((f as any).subFields, nextGroupLabel);
    });
  };
  walk(fields);
  return list;
};

export const countSchemaFields = (fields: Field[] | undefined): number => {
  return flatten(fields || []).length;
};

const safeStringify = (val: any): string => {
  try {
    return JSON.stringify(val ?? null);
  } catch {
    return '';
  }
};

export const versionControlService = {
  getAllVersions(): ModuleVersionSnapshot[] {
    hydrateVersionsFromBackend();
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  getVersions(moduleId: string): ModuleVersionSnapshot[] {
    const list: ModuleVersionSnapshot[] = this.getAllVersions();
    return list
      .filter((v: ModuleVersionSnapshot) => v.moduleId === moduleId)
      .sort(
        (a: ModuleVersionSnapshot, b: ModuleVersionSnapshot) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  },

  getLiveVersion(moduleId: string): ModuleVersionSnapshot | null {
    const list: ModuleVersionSnapshot[] = this.getVersions(moduleId);
    return list.find((v: ModuleVersionSnapshot) => v.isDeployed) || list[0] || null;
  },

  getVersionById(versionId: string): ModuleVersionSnapshot | null {
    const list: ModuleVersionSnapshot[] = this.getAllVersions();
    return list.find((v: ModuleVersionSnapshot) => v.id === versionId) || null;
  },

  getNextVersionTag(moduleId: string, isMajor = false): string {
    const list: ModuleVersionSnapshot[] = this.getVersions(moduleId);
    if (list.length === 0) return 'v1.0';
    let maxMajor = 1;
    let maxMinor = 0;
    list.forEach((v: ModuleVersionSnapshot) => {
      const clean = (v.versionTag || 'v1.0').replace(/^v/, '');
      const [majStr, minStr] = clean.split('.');
      const maj = parseInt(majStr, 10) || 1;
      const min = parseInt(minStr, 10) || 0;
      if (maj > maxMajor || (maj === maxMajor && min > maxMinor)) {
        maxMajor = maj;
        maxMinor = min;
      }
    });
    return isMajor ? `v${maxMajor + 1}.0` : `v${maxMajor}.${maxMinor + 1}`;
  },

  saveAll(list: ModuleVersionSnapshot[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      notifyListeners(list);
      syncVersionsToBackend(list);
    } catch (e) {
      console.error('Failed to save version snapshots', e);
    }
  },

  updateSnapshot(versionId: string, patch: Partial<ModuleVersionSnapshot>): ModuleVersionSnapshot | null {
    const list: ModuleVersionSnapshot[] = this.getAllVersions();
    let updatedItem: ModuleVersionSnapshot | null = null;
    const updated = list.map((v: ModuleVersionSnapshot) => {
      if (v.id === versionId) {
        updatedItem = { ...v, ...patch };
        return updatedItem;
      }
      return v;
    });
    if (updatedItem) {
      this.saveAll(updated);
    }
    return updatedItem;
  },

  markVersionLive(moduleId: string, versionId: string, author = 'Admin'): ModuleVersionSnapshot | null {
    const list: ModuleVersionSnapshot[] = this.getAllVersions();
    let promoted: ModuleVersionSnapshot | null = null;
    const now = new Date().toISOString();
    const updated = list.map((v: ModuleVersionSnapshot) => {
      if (v.moduleId !== moduleId) return v;
      if (v.id === versionId) {
        promoted = {
          ...v,
          isDeployed: true,
          deployedAt: now,
          promotedBy: author
        };
        return promoted;
      }
      return v.isDeployed ? { ...v, isDeployed: false } : v;
    });
    this.saveAll(updated);
    return promoted;
  },

  computeDiff(
    baseFields: Field[],
    compareFields: Field[],
    options?: { moduleName?: string; softDeleteDropped?: boolean }
  ): VersionFieldDiff[] {
    const baseList = flatten(baseFields);
    const compareList = flatten(compareFields);
    const softDelete = options?.softDeleteDropped ?? true;
    const safeModuleName = String(options?.moduleName || 'module');
    const tbl = `${safeModuleName.toLowerCase().replace(/\s+/g, '_')}_tbl`;

    const baseMap = new Map(baseList.map(f => [f.id, f]));
    const compareMap = new Map(compareList.map(f => [f.id, f]));

    const diffs: VersionFieldDiff[] = [];

    compareList.forEach(curr => {
      const prev = baseMap.get(curr.id);
      const currName = String(curr.name || curr.label || curr.id || 'column');
      const col = currName.toLowerCase().replace(/\s+/g, '_');

      if (!prev) {
        const groupSuffix = curr._parentGroupLabel ? ` in "${curr._parentGroupLabel}"` : '';
        diffs.push({
          type: 'added',
          fieldId: curr.id,
          fieldName: currName,
          fieldLabel: curr.label || currName,
          newField: curr,
          details: `Added ${curr.type} field${groupSuffix}${curr.required ? ' (required)' : ''}`,
          riskLevel: 'safe',
          riskMessage: 'Non-breaking addition.',
          suggestedSql: `ALTER TABLE ${tbl} ADD COLUMN IF NOT EXISTS ${col} ${mapFieldTypeToSql(curr.type)};`
        });
      } else {
        const prevName = String(prev.name || prev.label || prev.id || 'column');
        const prevCol = prevName.toLowerCase().replace(/\s+/g, '_');
        const typeDiff = prev.type !== curr.type;
        const nameDiff = prevName !== currName;
        const labelDiff = prev.label !== curr.label;
        const requiredDiff = Boolean(prev.required) !== Boolean(curr.required);
        const optionsDiff = safeStringify(prev.options) !== safeStringify(curr.options);
        const defaultDiff = safeStringify(prev.defaultValue) !== safeStringify(curr.defaultValue);
        const hiddenDiff = Boolean(prev.hidden) !== Boolean(curr.hidden);
        const groupDiff = (prev._parentGroupLabel || '') !== (curr._parentGroupLabel || '');

        if (typeDiff || nameDiff || labelDiff || requiredDiff || optionsDiff || defaultDiff || hiddenDiff || groupDiff) {
          const changeReasons: string[] = [];
          if (typeDiff) changeReasons.push(`Type: ${prev.type} → ${curr.type}`);
          if (nameDiff) changeReasons.push(`Key: ${prevName} → ${currName}`);
          if (labelDiff) changeReasons.push(`Label: "${prev.label}" → "${curr.label}"`);
          if (requiredDiff) changeReasons.push(curr.required ? 'Made required' : 'Made optional');
          if (optionsDiff) changeReasons.push('Dropdown options updated');
          if (defaultDiff) changeReasons.push('Default value updated');
          if (hiddenDiff) changeReasons.push(curr.hidden ? 'Hidden by default' : 'Shown by default');
          if (groupDiff && curr._parentGroupLabel) changeReasons.push(`Moved to "${curr._parentGroupLabel}"`);

          let riskLevel: 'safe' | 'warning' | 'critical' = 'safe';
          let riskMessage = 'Safe configuration update.';
          let suggestedSql = `-- Metadata update for ${col}`;

          if (typeDiff) {
            riskLevel = 'critical';
            riskMessage = `Data type changed from ${prev.type} to ${curr.type}. Existing values may need conversion.`;
            const sqlType = mapFieldTypeToSql(curr.type);
            suggestedSql = `ALTER TABLE ${tbl} ALTER COLUMN ${col} TYPE ${sqlType} USING ${col}::${sqlType.split(' ')[0]};`;
          } else if (nameDiff) {
            riskLevel = 'warning';
            riskMessage = `Column key renamed from ${prevName} to ${currName}.`;
            suggestedSql = `ALTER TABLE ${tbl} RENAME COLUMN ${prevCol} TO ${col};`;
          } else if (requiredDiff && curr.required) {
            riskLevel = 'warning';
            riskMessage = 'Field made required. Existing empty records should be reviewed.';
            suggestedSql = `ALTER TABLE ${tbl} ALTER COLUMN ${col} SET NOT NULL;`;
          }

          diffs.push({
            type: nameDiff ? 'renamed' : 'modified',
            fieldId: curr.id,
            fieldName: currName,
            fieldLabel: curr.label || currName,
            oldField: prev,
            newField: curr,
            details: changeReasons.join(', '),
            riskLevel,
            riskMessage,
            suggestedSql
          });
        }
      }
    });

    baseList.forEach(prev => {
      if (!compareMap.has(prev.id)) {
        const prevName = String(prev.name || prev.label || prev.id || 'column');
        const col = prevName.toLowerCase().replace(/\s+/g, '_');
        diffs.push({
          type: 'removed',
          fieldId: prev.id,
          fieldName: prevName,
          fieldLabel: prev.label || prevName,
          oldField: prev,
          details: `Removed ${prev.type} field`,
          riskLevel: softDelete ? 'warning' : 'critical',
          riskMessage: softDelete
            ? 'Data will be safely archived (_deprecated_*) without permanent loss.'
            : 'Column and its stored data will be permanently dropped.',
          suggestedSql: softDelete
            ? `ALTER TABLE ${tbl} RENAME COLUMN ${col} TO _deprecated_${col}_${Date.now().toString(36)};`
            : `ALTER TABLE ${tbl} DROP COLUMN IF EXISTS ${col} CASCADE;`
        });
      }
    });

    return diffs;
  },

  computeSectionChanges(
    prevState: Partial<ModuleVersionSnapshotState> | null | undefined,
    nextState: Partial<ModuleVersionSnapshotState> | null | undefined
  ): string[] {
    if (!prevState || !nextState) return [];
    const changes: string[] = [];

    // 1. Tabs diff (specific)
    if (Array.isArray(prevState.tabs) && Array.isArray(nextState.tabs)) {
      const prevMap = new Map(prevState.tabs.map((t: any) => [t.id, t]));
      const nextMap = new Map(nextState.tabs.map((t: any) => [t.id, t]));
      nextState.tabs.forEach((t: any) => {
        const p = prevMap.get(t.id);
        if (!p) changes.push(`Added tab "${t.label || t.name || t.id}"`);
        else if ((p.label || p.name) !== (t.label || t.name)) {
          changes.push(`Renamed tab "${p.label || p.name}" to "${t.label || t.name}"`);
        }
      });
      prevState.tabs.forEach((t: any) => {
        if (!nextMap.has(t.id)) changes.push(`Removed tab "${t.label || t.name || t.id}"`);
      });
    }

    // 2. Forms diff (specific)
    if (Array.isArray(prevState.forms) && Array.isArray(nextState.forms)) {
      const prevMap = new Map(prevState.forms.map((f: any) => [f.id, f]));
      const nextMap = new Map(nextState.forms.map((f: any) => [f.id, f]));
      nextState.forms.forEach((f: any) => {
        const p = prevMap.get(f.id);
        if (!p) {
          changes.push(`Added form "${f.name || 'Untitled Form'}"`);
        } else if (safeStringify(p) !== safeStringify(f)) {
          changes.push(`Updated form "${f.name || 'Untitled Form'}"`);
        }
      });
      prevState.forms.forEach((f: any) => {
        if (!nextMap.has(f.id)) changes.push(`Removed form "${f.name || f.id}"`);
      });
    }

    // 3. Validation rules diff (specific)
    if (Array.isArray(prevState.validationRules) && Array.isArray(nextState.validationRules)) {
      const prevMap = new Map(prevState.validationRules.map((r: any) => [r.id, r]));
      const nextMap = new Map(nextState.validationRules.map((r: any) => [r.id, r]));
      nextState.validationRules.forEach((r: any) => {
        const p = prevMap.get(r.id);
        if (!p) changes.push(`Added validation rule "${r.name || r.title || 'Rule'}"`);
        else if (safeStringify(p) !== safeStringify(r)) {
          changes.push(`Updated validation rule "${r.name || r.title || 'Rule'}"`);
        }
      });
      prevState.validationRules.forEach((r: any) => {
        if (!nextMap.has(r.id)) changes.push(`Removed validation rule "${r.name || r.title || r.id}"`);
      });
    }

    // 4. Workflows diff (only if both snapshots actually tracked workflows)
    if (Array.isArray(prevState.workflows) && Array.isArray(nextState.workflows)) {
      if (safeStringify(prevState.workflows) !== safeStringify(nextState.workflows)) {
        const prevNodes = prevState.workflows[0]?.nodes || [];
        const nextNodes = nextState.workflows[0]?.nodes || [];
        const prevNodeIds = new Set(prevNodes.map((n: any) => n.id));
        const nextNodeIds = new Set(nextNodes.map((n: any) => n.id));
        const addedStages = nextNodes.filter((n: any) => !prevNodeIds.has(n.id)).map((n: any) => n.label || n.data?.label).filter(Boolean);
        const removedStages = prevNodes.filter((n: any) => !nextNodeIds.has(n.id)).map((n: any) => n.label || n.data?.label).filter(Boolean);
        if (addedStages.length > 0) changes.push(`Added workflow stage${addedStages.length > 1 ? 's' : ''}: ${addedStages.join(', ')}`);
        if (removedStages.length > 0) changes.push(`Removed workflow stage${removedStages.length > 1 ? 's' : ''}: ${removedStages.join(', ')}`);
        if (addedStages.length === 0 && removedStages.length === 0) changes.push('Updated workflow transitions or stage settings');
      }
    }

    // 5. Module settings diff (only meaningful keys)
    if (prevState.moduleSettings && nextState.moduleSettings) {
      const p = prevState.moduleSettings;
      const n = nextState.moduleSettings;
      if (p.name !== n.name) changes.push(`Renamed module from "${p.name}" to "${n.name}"`);
      if ((p.recordKeyPrefix || '') !== (n.recordKeyPrefix || '')) {
        changes.push(`Changed record key prefix to "${n.recordKeyPrefix || 'none'}"`);
      }
      if ((p.type || '') !== (n.type || '')) changes.push(`Changed module classification to ${n.type}`);
      if ((p.status || '') !== (n.status || '')) changes.push(`Changed module status to ${n.status}`);
    }

    // 6. Interface settings diff (specific layout changes)
    if (prevState.interfaceSettings && nextState.interfaceSettings) {
      const pm = prevState.interfaceSettings.master || {};
      const nm = nextState.interfaceSettings.master || {};
      const pd = prevState.interfaceSettings.detail || {};
      const nd = nextState.interfaceSettings.detail || {};
      if (pm.layoutType !== nm.layoutType) changes.push(`Changed list view layout from ${pm.layoutType} to ${nm.layoutType}`);
      if (pd.layoutType !== nd.layoutType) changes.push(`Changed detail view layout from ${pd.layoutType} to ${nd.layoutType}`);
      if (safeStringify(pm.formattingRules) !== safeStringify(nm.formattingRules)) {
        changes.push('Updated conditional formatting rules');
      }
    }

    // 7. Field security diff
    if (prevState.fieldSecurity && nextState.fieldSecurity) {
      if (safeStringify(prevState.fieldSecurity) !== safeStringify(nextState.fieldSecurity)) {
        changes.push('Updated field-level permissions & masking');
      }
    }

    return changes;
  },

  generateForwardMigrationSql(
    baseFields: Field[],
    targetFields: Field[],
    moduleName: string,
    moduleId: string,
    fromVersion: string,
    toVersion: string,
    softDeleteDropped = true
  ): string {
    const diffs = this.computeDiff(baseFields, targetFields, { moduleName, softDeleteDropped });
    const lines: string[] = [
      `-- AURORA SCHEMA MIGRATION: ${moduleName} (${fromVersion} -> ${toVersion})`,
      `-- Generated: ${new Date().toISOString()}`,
      `-- Changes: ${diffs.length}`,
      ``,
      `BEGIN;`,
      ``,
      `INSERT INTO _aurora_schema_versions (module_id, version_tag, applied_at)`,
      `VALUES ('${moduleId}', '${toVersion}', NOW())`,
      `ON CONFLICT (module_id, version_tag) DO NOTHING;`,
      ``
    ];

    if (diffs.length === 0) {
      lines.push(`-- No structural table alterations required (metadata/UI update only).`);
    } else {
      diffs.forEach((d: VersionFieldDiff) => {
        if (d.suggestedSql) {
          lines.push(`-- [${d.type.toUpperCase()}] ${d.fieldLabel} (${d.fieldName})`);
          lines.push(d.suggestedSql);
          lines.push(``);
        }
      });
    }

    lines.push(`COMMIT;`);
    return lines.join('\n');
  },

  generateDownMigrationSql(currentFields: Field[], targetFields: Field[], moduleName: string): string {
    const diffs = this.computeDiff(currentFields, targetFields, { moduleName, softDeleteDropped: true });
    const tbl = String(moduleName || 'module').toLowerCase().replace(/\s+/g, '_') + '_tbl';
    const lines: string[] = [
      `-- AURORA ROLLBACK MIGRATION: ${moduleName}`,
      `-- Generated: ${new Date().toISOString()}`,
      `-- Restorations: ${diffs.length}`,
      ``,
      `BEGIN;`,
      ``
    ];

    if (diffs.length === 0) {
      lines.push('-- No physical database schema changes required for rollback.');
    } else {
      diffs.forEach((d: VersionFieldDiff) => {
        const col = (d.newField?.name || d.oldField?.name || d.fieldName || 'field')
          .toLowerCase()
          .replace(/\s+/g, '_');
        if (d.type === 'added') {
          lines.push(`-- Restore '${d.fieldLabel}'`);
          lines.push(`ALTER TABLE ${tbl} ADD COLUMN IF NOT EXISTS ${col} ${mapFieldTypeToSql(d.newField?.type)};`);
        } else if (d.type === 'removed') {
          lines.push(`-- Archive newer column '${d.fieldLabel}'`);
          lines.push(`ALTER TABLE ${tbl} RENAME COLUMN ${col} TO _deprecated_${col}_${Date.now().toString(36)};`);
        } else if (d.type === 'modified' && d.oldField?.type !== d.newField?.type && d.newField?.type) {
          const sqlColType = mapFieldTypeToSql(d.newField.type);
          lines.push(`-- Revert '${col}' type to ${d.newField.type}`);
          lines.push(`ALTER TABLE ${tbl} ALTER COLUMN ${col} TYPE ${sqlColType} USING ${col}::${sqlColType.split(' ')[0]};`);
        }
        lines.push('');
      });
    }

    lines.push('COMMIT;');
    return lines.join('\n');
  },

  buildLocalCommitSummary(params: {
    moduleName: string;
    diffs: VersionFieldDiff[];
    sectionChanges?: string[];
    isRollback?: boolean;
    rollbackTargetVersion?: string;
  }): AICommitResult {
    const { moduleName, diffs, sectionChanges = [], isRollback, rollbackTargetVersion } = params;
    if (isRollback && rollbackTargetVersion) {
      return {
        title: `Rollback to ${rollbackTargetVersion}`,
        summary: [`Restored ${moduleName} to snapshot ${rollbackTargetVersion}.`],
        releaseNotes: `Rolled back ${moduleName} to ${rollbackTargetVersion}.`,
        aiGenerated: false
      };
    }

    const added = diffs.filter(d => d.type === 'added');
    const modified = diffs.filter(d => d.type === 'modified' || d.type === 'renamed');
    const removed = diffs.filter(d => d.type === 'removed');

    const titleParts: string[] = [];
    if (added.length === 1) titleParts.push(`Add ${added[0].fieldLabel}`);
    else if (added.length > 1) titleParts.push(`Add ${added.length} fields`);
    if (modified.length === 1) titleParts.push(`update ${modified[0].fieldLabel}`);
    else if (modified.length > 1) titleParts.push(`update ${modified.length} fields`);
    if (removed.length === 1) titleParts.push(`remove ${removed[0].fieldLabel}`);
    else if (removed.length > 1) titleParts.push(`remove ${removed.length} fields`);
    if (titleParts.length === 0 && sectionChanges.length > 0) {
      titleParts.push(`Update ${sectionChanges.slice(0, 2).join(' & ')}`);
    }

    const rawTitle = titleParts.length > 0 ? titleParts.join(', ') : `Update ${moduleName}`;
    const title = rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1);

    const summary: string[] = [];
    if (added.length > 0) {
      summary.push(`Added ${added.map(d => d.fieldLabel).slice(0, 4).join(', ')}${added.length > 4 ? ` and ${added.length - 4} more` : ''}.`);
    }
    if (modified.length > 0) {
      summary.push(`Updated ${modified.map(d => d.fieldLabel).slice(0, 4).join(', ')}.`);
    }
    if (removed.length > 0) {
      summary.push(`Removed ${removed.map(d => d.fieldLabel).slice(0, 4).join(', ')}.`);
    }
    if (sectionChanges.length > 0) {
      summary.push(`Updated ${sectionChanges.join(', ').toLowerCase()}.`);
    }
    if (summary.length === 0) {
      summary.push(`Saved current ${moduleName} layout and configuration.`);
    }

    return {
      title: title.slice(0, 72),
      summary,
      releaseNotes: summary.join(' '),
      aiGenerated: false
    };
  },

  async generateAICommit(params: {
    moduleId: string;
    moduleName: string;
    fromVersion: string;
    toVersion: string;
    mode?: 'commit' | 'release';
    diffs: VersionFieldDiff[];
    sectionChanges?: string[];
    isRollback?: boolean;
    rollbackTargetVersion?: string;
  }): Promise<AICommitResult> {
    const fallback = this.buildLocalCommitSummary(params);
    try {
      const headers = await resolveAuthHeaders();
      if (!headers['x-tenant-id'] || !headers['Authorization']) {
        return fallback;
      }
      const res = await fetch(`${API_BASE_URL}/api/data/modules/${params.moduleId}/generate-commit`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          moduleName: params.moduleName,
          fromVersion: params.fromVersion,
          toVersion: params.toVersion,
          mode: params.mode || 'commit',
          diffs: params.diffs.map(d => ({
            type: d.type,
            fieldName: d.fieldName,
            fieldLabel: d.fieldLabel,
            details: d.details
          })),
          sectionChanges: params.sectionChanges || [],
          isRollback: params.isRollback || false,
          rollbackTargetVersion: params.rollbackTargetVersion || ''
        })
      });
      if (!res.ok) return fallback;
      const data = await res.json();
      if (data && data.title) {
        return {
          title: data.title,
          summary: Array.isArray(data.summary) ? data.summary : fallback.summary,
          releaseNotes: data.releaseNotes || fallback.releaseNotes,
          aiGenerated: Boolean(data.aiGenerated)
        };
      }
      return fallback;
    } catch {
      return fallback;
    }
  },

  async saveDraftToBackend(params: {
    moduleId: string;
    draftConfig: ModuleVersionSnapshotState;
    versionId?: string;
    versionTag?: string;
  }): Promise<boolean> {
    try {
      const headers = await resolveAuthHeaders();
      if (!headers['x-tenant-id'] || !headers['Authorization']) return false;
      const res = await fetch(`${API_BASE_URL}/api/data/modules/${params.moduleId}/draft`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          draftConfig: params.draftConfig,
          versionId: params.versionId,
          versionTag: params.versionTag
        })
      });
      return res.ok;
    } catch (err) {
      console.warn('[versionControlService] saveDraftToBackend error:', err);
      return false;
    }
  },

  async promoteVersionToBackend(params: {
    moduleId: string;
    snapshot: ModuleVersionSnapshotState;
    versionId: string;
    versionTag: string;
    syncDraft?: boolean;
  }): Promise<{ success: boolean; module?: any; error?: string }> {
    try {
      const headers = await resolveAuthHeaders();
      const res = await fetch(`${API_BASE_URL}/api/data/modules/${params.moduleId}/promote`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          snapshot: params.snapshot,
          versionId: params.versionId,
          versionTag: params.versionTag,
          syncDraft: params.syncDraft ?? true
        })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        return { success: false, error: errData.error || 'Failed to promote version' };
      }
      const data = await res.json();
      return { success: true, module: data.module };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error promoting version' };
    }
  },

  createSnapshot(params: {
    moduleId: string;
    moduleName: string;
    versionTag: string;
    name: string;
    description?: string;
    commitSummary?: string[];
    aiGenerated?: boolean;
    isGeneratingAI?: boolean;
    author?: string;
    authorId?: string;
    isDeployed?: boolean;
    isRollback?: boolean;
    rollbackFromVersion?: string;
    rollbackTargetVersion?: string;
    state: ModuleVersionSnapshotState;
    migrationSql?: string;
    downMigrationSql?: string;
    previousFields?: Field[];
    sectionChanges?: string[];
  }): ModuleVersionSnapshot {
    const list: ModuleVersionSnapshot[] = this.getAllVersions();
    const diffs: VersionFieldDiff[] = params.previousFields
      ? this.computeDiff(params.previousFields, params.state.layout)
      : [];

    const isDeployed = params.isDeployed ?? false;
    const now = new Date().toISOString();

    const newSnapshot: ModuleVersionSnapshot = {
      id: 'ver_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36),
      moduleId: params.moduleId,
      moduleName: params.moduleName,
      versionTag: params.versionTag.startsWith('v') ? params.versionTag : 'v' + params.versionTag,
      name: params.name,
      description: params.description || '',
      commitSummary: params.commitSummary || [],
      aiGenerated: params.aiGenerated ?? false,
      isGeneratingAI: params.isGeneratingAI ?? false,
      author: params.author || 'Admin',
      authorId: params.authorId,
      createdAt: now,
      isDeployed,
      deployedAt: isDeployed ? now : undefined,
      isRollback: params.isRollback ?? false,
      rollbackFromVersion: params.rollbackFromVersion,
      rollbackTargetVersion: params.rollbackTargetVersion,
      snapshot: JSON.parse(JSON.stringify(params.state)),
      migrationSql: params.migrationSql,
      downMigrationSql: params.downMigrationSql,
      sectionChanges: params.sectionChanges || [],
      changesSummary: {
        added: diffs.filter((d: VersionFieldDiff) => d.type === 'added').length,
        removed: diffs.filter((d: VersionFieldDiff) => d.type === 'removed').length,
        modified: diffs.filter((d: VersionFieldDiff) => d.type === 'modified' || d.type === 'renamed').length,
        total: diffs.length
      }
    };

    const normalizedList = isDeployed
      ? list.map(v => (v.moduleId === params.moduleId && v.isDeployed ? { ...v, isDeployed: false } : v))
      : list;

    const updated = [newSnapshot, ...normalizedList];
    this.saveAll(updated);
    return newSnapshot;
  },

  seedInitialVersionIfEmpty(
    moduleId: string,
    moduleName: string,
    state: ModuleVersionSnapshotState,
    initialTag = 'v1.0'
  ): ModuleVersionSnapshot {
    const existing = this.getVersions(moduleId);
    if (existing.length > 0) {
      return existing[0];
    }

    return this.createSnapshot({
      moduleId,
      moduleName,
      versionTag: initialTag,
      name: 'Initial module baseline',
      description: 'Initial live module schema and configuration.',
      commitSummary: [`Captured initial baseline for ${moduleName}.`],
      aiGenerated: false,
      author: 'System',
      isDeployed: true,
      state
    });
  },

  deleteVersion(versionId: string): boolean {
    const list: ModuleVersionSnapshot[] = this.getAllVersions();
    const updated = list.filter((v: ModuleVersionSnapshot) => v.id !== versionId);
    this.saveAll(updated);
    return true;
  },

  subscribe(callback: Listener): () => void {
    listeners.add(callback);
    return () => {
      listeners.delete(callback);
    };
  }
};
