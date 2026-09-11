import { ModuleVersionSnapshot, ModuleVersionSnapshotState, VersionFieldDiff, Field } from '../types/versionControl';

const STORAGE_KEY = 'aurora_module_version_snapshots';

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

const mapFieldTypeToSql = (type?: string): string => {
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

const flatten = (fields: Field[]): Field[] => {
  const list: Field[] = [];
  const walk = (items: Field[]) => {
    (items || []).forEach(f => {
      if (!['divider', 'spacer', 'heading', 'alert'].includes(f.type)) {
        list.push(f);
      }
      if (f.fields && Array.isArray(f.fields)) walk(f.fields);
    });
  };
  walk(fields);
  return list;
};

export const versionControlService = {
  getAllVersions(): ModuleVersionSnapshot[] {
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
      .sort((a: ModuleVersionSnapshot, b: ModuleVersionSnapshot) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  getVersionById(versionId: string): ModuleVersionSnapshot | null {
    const list: ModuleVersionSnapshot[] = this.getAllVersions();
    return list.find((v: ModuleVersionSnapshot) => v.id === versionId) || null;
  },

  saveAll(list: ModuleVersionSnapshot[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      notifyListeners(list);
    } catch (e) {
      console.error('Failed to save version snapshots', e);
    }
  },

  computeDiff(baseFields: Field[], compareFields: Field[]): VersionFieldDiff[] {
    const baseList = flatten(baseFields);
    const compareList = flatten(compareFields);

    const baseMap = new Map(baseList.map(f => [f.id, f]));
    const compareMap = new Map(compareList.map(f => [f.id, f]));

    const diffs: VersionFieldDiff[] = [];

    // Check compare against base
    compareList.forEach(curr => {
      const prev = baseMap.get(curr.id);
      if (!prev) {
        diffs.push({
          type: 'added',
          fieldId: curr.id,
          fieldName: curr.name || curr.id,
          fieldLabel: curr.label,
          newField: curr,
          details: 'Field ' + curr.label + ' (' + curr.type + ') added'
        });
      } else {
        const typeDiff = prev.type !== curr.type;
        const nameDiff = prev.name !== curr.name;
        const labelDiff = prev.label !== curr.label;
        const requiredDiff = prev.required !== curr.required;

        if (typeDiff || nameDiff || labelDiff || requiredDiff) {
          const changeReasons: string[] = [];
          if (typeDiff) changeReasons.push('Type: ' + prev.type + ' → ' + curr.type);
          if (nameDiff) changeReasons.push('Identifier: ' + prev.name + ' → ' + curr.name);
          if (labelDiff) changeReasons.push('Label: ' + prev.label + ' → ' + curr.label);
          if (requiredDiff) changeReasons.push(curr.required ? 'Made required' : 'Made optional');

          diffs.push({
            type: 'modified',
            fieldId: curr.id,
            fieldName: curr.name || curr.id,
            fieldLabel: curr.label,
            oldField: prev,
            newField: curr,
            details: changeReasons.join(', ')
          });
        }
      }
    });

    // Check removed in compare
    baseList.forEach(prev => {
      if (!compareMap.has(prev.id)) {
        diffs.push({
          type: 'removed',
          fieldId: prev.id,
          fieldName: prev.name || prev.id,
          fieldLabel: prev.label,
          oldField: prev,
          details: 'Field ' + prev.label + ' removed'
        });
      }
    });

    return diffs;
  },

  generateDownMigrationSql(currentFields: Field[], targetFields: Field[], moduleName: string): string {
    const diffs = this.computeDiff(currentFields, targetFields);
    const tbl = moduleName.toLowerCase().replace(/\s+/g, '_') + '_tbl';
    const lines: string[] = [
      '-- ==========================================================================',
      '-- AURORA ROLLBACK / DOWN-MIGRATION DDL: ' + moduleName,
      '-- Generated at: ' + new Date().toISOString(),
      '-- Total Structural Restorations: ' + diffs.length,
      '-- ==========================================================================',
      '',
      'BEGIN;',
      ''
    ];

    if (diffs.length === 0) {
      lines.push('-- No physical database schema changes required for rollback.');
    } else {
      diffs.forEach((d: VersionFieldDiff) => {
        const col = (d.newField?.name || d.oldField?.name || d.fieldName || 'field').toLowerCase().replace(/\s+/g, '_');
        if (d.type === 'added') {
          lines.push(`-- [RESTORE COLUMN] Recreate '${d.fieldLabel}' column`);
          lines.push(`ALTER TABLE ${tbl} ADD COLUMN IF NOT EXISTS ${col} ${mapFieldTypeToSql(d.newField?.type)};`);
        } else if (d.type === 'removed') {
          lines.push(`-- [ARCHIVE COLUMN] Safely soft-delete newer column '${d.fieldLabel}'`);
          lines.push(`ALTER TABLE ${tbl} RENAME COLUMN ${col} TO _deprecated_${col}_${Date.now().toString(36)};`);
        } else if (d.type === 'modified') {
          if (d.oldField?.type !== d.newField?.type && d.newField?.type) {
            lines.push(`-- [REVERT TYPE] Alter '${col}' type back to ${d.newField.type}`);
            const sqlColType = mapFieldTypeToSql(d.newField.type);
            lines.push(`ALTER TABLE ${tbl} ALTER COLUMN ${col} TYPE ${sqlColType} USING ${col}::${sqlColType.split(' ')[0]};`);
          }
        }
        lines.push('');
      });
    }

    lines.push('COMMIT;');
    return lines.join('\n');
  },

  createSnapshot(params: {
    moduleId: string;
    moduleName: string;
    versionTag: string;
    name: string;
    description?: string;
    author?: string;
    isDeployed?: boolean;
    isRollback?: boolean;
    rollbackFromVersion?: string;
    state: ModuleVersionSnapshotState;
    migrationSql?: string;
    downMigrationSql?: string;
    previousFields?: Field[];
  }): ModuleVersionSnapshot {
    const list: ModuleVersionSnapshot[] = this.getAllVersions();
    const diffs: VersionFieldDiff[] = params.previousFields 
      ? this.computeDiff(params.previousFields, params.state.layout)
      : [];

    const newSnapshot: ModuleVersionSnapshot = {
      id: 'ver_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36),
      moduleId: params.moduleId,
      moduleName: params.moduleName,
      versionTag: params.versionTag.startsWith('v') ? params.versionTag : 'v' + params.versionTag,
      name: params.name,
      description: params.description || 'Snapshot captured',
      author: params.author || 'System Administrator',
      createdAt: new Date().toISOString(),
      isDeployed: params.isDeployed ?? true,
      isRollback: params.isRollback ?? false,
      rollbackFromVersion: params.rollbackFromVersion,
      snapshot: JSON.parse(JSON.stringify(params.state)),
      migrationSql: params.migrationSql,
      downMigrationSql: params.downMigrationSql,
      changesSummary: {
        added: diffs.filter((d: VersionFieldDiff) => d.type === 'added').length,
        removed: diffs.filter((d: VersionFieldDiff) => d.type === 'removed').length,
        modified: diffs.filter((d: VersionFieldDiff) => d.type === 'modified').length,
        total: diffs.length
      }
    };

    const updated = [newSnapshot, ...list];
    this.saveAll(updated);
    return newSnapshot;
  },

  seedInitialVersionIfEmpty(moduleId: string, moduleName: string, state: ModuleVersionSnapshotState): ModuleVersionSnapshot {
    const existing = this.getVersions(moduleId);
    if (existing.length > 0) {
      return existing[0];
    }

    return this.createSnapshot({
      moduleId,
      moduleName,
      versionTag: 'v1.0',
      name: 'Initial Production Baseline',
      description: 'Initial module architecture and schema baseline.',
      author: 'System',
      isDeployed: true,
      state
    });
  },

  rollbackToVersion(
    moduleId: string,
    targetVersionId: string,
    currentState: ModuleVersionSnapshotState,
    currentVersionTag: string,
    author: string = 'Developer / Admin'
  ): { restoredSnapshot: ModuleVersionSnapshotState; newVersion: ModuleVersionSnapshot; downSql: string } | null {
    const targetVersion = this.getVersionById(targetVersionId);
    if (!targetVersion) return null;

    const restoredSnapshot: ModuleVersionSnapshotState = JSON.parse(JSON.stringify(targetVersion.snapshot));
    const downSql = this.generateDownMigrationSql(currentState.layout, restoredSnapshot.layout, targetVersion.moduleName);

    const currentTagNum = parseFloat(currentVersionTag.replace('v', '')) || 1.0;
    const nextTag = 'v' + (currentTagNum + 0.1).toFixed(1);

    const newVersion = this.createSnapshot({
      moduleId,
      moduleName: targetVersion.moduleName,
      versionTag: nextTag,
      name: 'Rollback to ' + targetVersion.versionTag,
      description: 'Compensating rollback restoring schema and AST layout to snapshot ' + targetVersion.versionTag + ' (' + targetVersion.name + ').',
      author,
      isDeployed: true,
      isRollback: true,
      rollbackFromVersion: currentVersionTag,
      state: restoredSnapshot,
      migrationSql: downSql,
      previousFields: currentState.layout
    });

    return {
      restoredSnapshot,
      newVersion,
      downSql
    };
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
