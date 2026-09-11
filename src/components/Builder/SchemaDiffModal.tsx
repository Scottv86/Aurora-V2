import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Database, 
  AlertTriangle, 
  CheckCircle2, 
  Plus, 
  Minus, 
  RefreshCw, 
  ShieldAlert, 
  FileCode, 
  Copy, 
  Download, 
  ArrowRight, 
  Layers, 
  Sparkles,
  History,
  Archive,
  Lock,
  Terminal,
  Check,
  Calendar,
  Clock,
  Bell,
  RotateCcw,
  Sliders,
  FileText,
  Wand2
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import { Field } from '../../types/versionControl';
import { deploymentQueueService } from '../../utils/deploymentQueueService';
import { ScheduledDeployment } from '../../types/deployments';
import { releaseNotesGenerator } from '../../utils/releaseNotesGenerator';

export interface SchemaChange {
  id: string;
  fieldId: string;
  fieldName: string;
  fieldLabel: string;
  type: 'added' | 'removed' | 'modified' | 'renamed';
  oldField?: Partial<Field>;
  newField?: Partial<Field>;
  riskLevel: 'safe' | 'warning' | 'critical';
  riskMessage?: string;
  suggestedSql: string;
}

interface SchemaDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeploy: (options: { createSnapshot: boolean; softDeleteDropped: boolean; versionTag: string; releaseNotes: string }) => Promise<void> | void;
  onScheduled?: (deployment: ScheduledDeployment) => void;
  onOpenQueue?: () => void;
  currentFields: Field[];
  persistedFields: Field[];
  moduleName: string;
  moduleId: string;
  currentVersion?: string;
  forms?: any[];
  validationRules?: any[];
  connectorMappings?: Record<string, Record<string, string>>;
  dataPopulationRules?: any[];
  fieldSecurity?: Record<string, Record<string, any>>;
  tabs?: any[];
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

export const SchemaDiffModal: React.FC<SchemaDiffModalProps> = ({
  isOpen,
  onClose,
  onDeploy,
  onScheduled,
  onOpenQueue,
  currentFields,
  persistedFields,
  moduleName,
  moduleId,
  currentVersion = '1.0',
  forms = [],
  validationRules = [],
  connectorMappings = {},
  dataPopulationRules = [],
  fieldSecurity = {},
  tabs = []
}) => {
  const [activeTab, setActiveTab] = useState<'diff' | 'notes' | 'schedule' | 'sql' | 'safety'>('diff');
  const [deploymentStrategy, setDeploymentStrategy] = useState<'immediate' | 'scheduled'>('immediate');
  const [createSnapshot, setCreateSnapshot] = useState(true);
  const [softDeleteDropped, setSoftDeleteDropped] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(true);
  const [notifyUsers, setNotifyUsers] = useState(true);
  const [autoRollback, setAutoRollback] = useState(true);
  const [isDeploying, setIsDeploying] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedNotes, setCopiedNotes] = useState(false);
  const [customReleaseNotes, setCustomReleaseNotes] = useState('');
  const [isNotesUserEdited, setIsNotesUserEdited] = useState(false);

  // Scheduled date configuration
  const [schedulePreset, setSchedulePreset] = useState<'tonight' | 'tomorrow' | 'weekend' | 'custom'>('tonight');
  const [customDateTime, setCustomDateTime] = useState<string>(() => {
    const d = new Date();
    d.setHours(d.getHours() + 4);
    return d.toISOString().slice(0, 16);
  });

  const flatten = (fields: Field[]): Field[] => {
    const list: Field[] = [];
    const walk = (items: Field[]) => {
      items.forEach(f => {
        if (!['divider', 'spacer', 'heading', 'alert'].includes(f.type)) {
          list.push(f);
        }
        if (f.fields && Array.isArray(f.fields)) {
          walk(f.fields);
        }
      });
    };
    walk(fields);
    return list;
  };

  const currentFlattened = useMemo(() => flatten(currentFields), [currentFields]);
  const persistedFlattened = useMemo(() => flatten(persistedFields), [persistedFields]);

  // Compute diffs
  const changes = useMemo<SchemaChange[]>(() => {
    const list: SchemaChange[] = [];
    const persistedMap = new Map(persistedFlattened.map(f => [f.id, f]));
    const currentMap = new Map(currentFlattened.map(f => [f.id, f]));

    // Check for added & modified
    currentFlattened.forEach(curr => {
      const prev = persistedMap.get(curr.id);
      if (!prev) {
        const sql = `ALTER TABLE ${moduleName.toLowerCase().replace(/\s+/g, '_')}_tbl ADD COLUMN ${curr.name.toLowerCase().replace(/\s+/g, '_')} ${mapFieldTypeToSql(curr.type)};`;
        list.push({
          id: `add_${curr.id}`,
          fieldId: curr.id,
          fieldName: curr.name,
          fieldLabel: curr.label,
          type: 'added',
          newField: curr,
          riskLevel: 'safe',
          riskMessage: 'Non-destructive column addition. Safe for live database execution.',
          suggestedSql: sql
        });
      } else {
        const typeChanged = prev.type !== curr.type;
        const nameChanged = prev.name !== curr.name;
        const requiredChanged = prev.required !== curr.required;

        if (typeChanged || nameChanged || requiredChanged) {
          let risk: 'safe' | 'warning' | 'critical' = 'safe';
          let message = 'Safe metadata modification';
          let sql = '';
          const tbl = `${moduleName.toLowerCase().replace(/\s+/g, '_')}_tbl`;
          const col = curr.name.toLowerCase().replace(/\s+/g, '_');

          if (typeChanged) {
            risk = 'critical';
            message = `Data type changed from '${prev.type}' to '${curr.type}'. May cause data loss or lock table during conversion.`;
            sql = `ALTER TABLE ${tbl} ALTER COLUMN ${col} TYPE ${mapFieldTypeToSql(curr.type)} USING ${col}::${mapFieldTypeToSql(curr.type).split(' ')[0]};`;
          } else if (nameChanged) {
            risk = 'warning';
            message = `Physical column renamed from '${prev.name}' to '${curr.name}'. Dependent integrations may fail.`;
            sql = `ALTER TABLE ${tbl} RENAME COLUMN ${prev.name.toLowerCase().replace(/\s+/g, '_')} TO ${col};`;
          } else if (requiredChanged && curr.required) {
            risk = 'warning';
            message = 'Column made mandatory (NOT NULL). May fail if null values already exist in table.';
            sql = `ALTER TABLE ${tbl} ALTER COLUMN ${col} SET NOT NULL;`;
          }

          list.push({
            id: `mod_${curr.id}`,
            fieldId: curr.id,
            fieldName: curr.name,
            fieldLabel: curr.label,
            type: nameChanged ? 'renamed' : 'modified',
            oldField: prev,
            newField: curr,
            riskLevel: risk,
            riskMessage: message,
            suggestedSql: sql
          });
        }
      }
    });

    // Check for removed
    persistedFlattened.forEach(prev => {
      if (!currentMap.has(prev.id)) {
        const tbl = `${moduleName.toLowerCase().replace(/\s+/g, '_')}_tbl`;
        const col = prev.name.toLowerCase().replace(/\s+/g, '_');
        const sql = softDeleteDropped 
          ? `ALTER TABLE ${tbl} RENAME COLUMN ${col} TO _deprecated_${col}_${Date.now().toString(36)};`
          : `ALTER TABLE ${tbl} DROP COLUMN ${col} CASCADE;`;

        list.push({
          id: `del_${prev.id}`,
          fieldId: prev.id,
          fieldName: prev.name,
          fieldLabel: prev.label,
          type: 'removed',
          oldField: prev,
          riskLevel: softDeleteDropped ? 'warning' : 'critical',
          riskMessage: softDeleteDropped
            ? 'Column will be safely archived with prefix (_deprecated_*) without purging data.'
            : 'Destructive DROP COLUMN. All column data will be permanently purged from database.',
          suggestedSql: sql
        });
      }
    });

    return list;
  }, [currentFlattened, persistedFlattened, moduleName, softDeleteDropped]);

  const overallRisk = useMemo<'safe' | 'warning' | 'critical'>(() => {
    if (changes.some(c => c.riskLevel === 'critical')) return 'critical';
    if (changes.some(c => c.riskLevel === 'warning')) return 'warning';
    return 'safe';
  }, [changes]);

  const nextVersion = useMemo(() => {
    const parts = currentVersion.split('.').map(n => parseInt(n, 10) || 0);
    if (overallRisk === 'critical') {
      return `${(parts[0] || 1) + 1}.0`;
    }
    return `${parts[0] || 1}.${(parts[1] || 0) + 1}`;
  }, [currentVersion, overallRisk]);

  // Auto-generate release notes when changes or version updates
  useEffect(() => {
    if (!isNotesUserEdited && isOpen) {
      const generated = releaseNotesGenerator.generate({
        moduleName,
        fromVersion: currentVersion,
        toVersion: nextVersion,
        changes,
        riskLevel: overallRisk,
        softDeleteDropped,
        forms,
        validationRules,
        connectorMappings,
        dataPopulationRules,
        fieldSecurity,
        tabs
      });
      setCustomReleaseNotes(generated);
    }
  }, [isOpen, moduleName, currentVersion, nextVersion, changes, overallRisk, softDeleteDropped, isNotesUserEdited, forms, validationRules, connectorMappings, dataPopulationRules, fieldSecurity, tabs]);

  // Generate full executable SQL migration
  const fullMigrationSql = useMemo(() => {
    const lines = [
      `-- ==========================================================================`,
      `-- AURORA DDL SCHEMA MIGRATION: ${moduleName} (v${currentVersion} -> v${nextVersion})`,
      `-- Generated at: ${new Date().toISOString()}`,
      `-- Risk Classification: ${overallRisk.toUpperCase()}`,
      `-- Total Structural Changes: ${changes.length}`,
      `-- ==========================================================================`,
      ``,
      `BEGIN;`,
      ``,
      `-- 1. Checkpoint version schema metadata`,
      `INSERT INTO _aurora_schema_versions (module_id, version_tag, applied_at, risk_level)`,
      `VALUES ('${moduleId}', 'v${nextVersion}', NOW(), '${overallRisk}')`,
      `ON CONFLICT (module_id, version_tag) DO NOTHING;`,
      ``,
      `-- 2. Execute table alterations`
    ];

    if (changes.length === 0) {
      lines.push(`-- No structural schema differences detected. Metadata in sync.`);
    } else {
      changes.forEach(c => {
        lines.push(`-- [${c.type.toUpperCase()}] ${c.fieldLabel} (${c.fieldName}) - Risk: ${c.riskLevel.toUpperCase()}`);
        lines.push(c.suggestedSql);
        lines.push(``);
      });
    }

    lines.push(`COMMIT;`);
    return lines.join('\n');
  }, [moduleName, currentVersion, nextVersion, overallRisk, changes, moduleId]);

  const calculateTargetDate = (): Date => {
    const now = new Date();
    if (schedulePreset === 'tonight') {
      const d = new Date(now);
      d.setHours(26, 0, 0, 0); // 2:00 AM next day
      return d;
    }
    if (schedulePreset === 'tomorrow') {
      const d = new Date(now);
      d.setDate(d.getDate() + 1);
      d.setHours(4, 0, 0, 0);
      return d;
    }
    if (schedulePreset === 'weekend') {
      const d = new Date(now);
      const day = d.getDay();
      const diff = (7 - day) % 7 || 7;
      d.setDate(d.getDate() + diff);
      d.setHours(1, 0, 0, 0);
      return d;
    }
    return new Date(customDateTime);
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(fullMigrationSql);
    setCopiedSql(true);
    toast.success('PostgreSQL migration script copied to clipboard');
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const handleCopyNotes = () => {
    navigator.clipboard.writeText(customReleaseNotes);
    setCopiedNotes(true);
    toast.success('Release notes copied to clipboard');
    setTimeout(() => setCopiedNotes(false), 2000);
  };

  const handleRegenerateNotes = () => {
    const generated = releaseNotesGenerator.generate({
      moduleName,
      fromVersion: currentVersion,
      toVersion: nextVersion,
      changes,
      riskLevel: overallRisk,
      softDeleteDropped,
      forms,
      validationRules,
      connectorMappings,
      dataPopulationRules,
      fieldSecurity,
      tabs
    });
    setCustomReleaseNotes(generated);
    setIsNotesUserEdited(false);
    toast.success('Release notes regenerated from live module state');
  };

  const handleAIPolishNotes = () => {
    const polished = releaseNotesGenerator.polishWithExecutiveTone(
      customReleaseNotes,
      moduleName,
      nextVersion
    );
    setCustomReleaseNotes(polished);
    setIsNotesUserEdited(true);
    toast.success('Release notes polished with executive tone');
  };

  const handleDownloadSql = () => {
    const blob = new Blob([fullMigrationSql], { type: 'text/sql;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `migration_${moduleName.toLowerCase().replace(/\s+/g, '_')}_v${nextVersion}.sql`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Migration SQL file downloaded');
  };

  const executeDeployImmediate = async () => {
    setIsDeploying(true);
    try {
      await onDeploy({
        createSnapshot,
        softDeleteDropped,
        versionTag: nextVersion,
        releaseNotes: customReleaseNotes
      });
      toast.success(`Schema successfully deployed and upgraded to v${nextVersion}!`);
      onClose();
    } catch (e: any) {
      toast.error(`Deployment failed: ${e?.message || 'Database error'}`);
    } finally {
      setIsDeploying(false);
    }
  };

  const executeScheduleDeployment = () => {
    const targetDate = calculateTargetDate();
    if (isNaN(targetDate.getTime()) || targetDate.getTime() <= Date.now()) {
      toast.error('Please choose a valid future date/time for scheduled deployment');
      return;
    }

    const added = changes.filter(c => c.type === 'added').length;
    const removed = changes.filter(c => c.type === 'removed').length;
    const modified = changes.filter(c => c.type === 'modified').length;
    const renamed = changes.filter(c => c.type === 'renamed').length;

    const scheduled = deploymentQueueService.scheduleDeployment({
      moduleId,
      moduleName,
      versionTag: `v${nextVersion}`,
      fromVersion: `v${currentVersion}`,
      riskLevel: overallRisk,
      changesCount: {
        added,
        removed,
        modified,
        renamed,
        total: changes.length
      },
      generatedSql: fullMigrationSql,
      scheduledAt: targetDate.toISOString(),
      maintenanceMode,
      notifyUsers,
      autoRollback,
      softDeleteDropped,
      createSnapshot,
      author: 'Current Developer / Admin'
    });

    toast.success(`Deployment scheduled for ${targetDate.toLocaleString()} (v${nextVersion})`);
    if (onScheduled) {
      onScheduled(scheduled);
    }
    onClose();
  };

  const criticalCount = changes.filter(c => c.riskLevel === 'critical').length;
  const warningCount = changes.filter(c => c.riskLevel === 'warning').length;
  const safeCount = changes.filter(c => c.riskLevel === 'safe').length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
      />

      {/* Modal Dialog */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        className="relative w-full max-w-4xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] z-10"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/60 dark:bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-2xl flex items-center justify-center border",
              overallRisk === 'critical'
                ? "bg-rose-500/10 text-rose-600 border-rose-500/20"
                : overallRisk === 'warning'
                ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
            )}>
              <Database size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  Database Schema Diff & Deployment
                </h3>
                <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                  v{currentVersion} → v{nextVersion}
                </span>
              </div>
              <p className="text-xs text-zinc-500">
                {moduleName} &bull; Review structural modifications, automated release notes, and deployment strategy
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenQueue && (
              <button
                onClick={onOpenQueue}
                className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1.5"
              >
                <Calendar size={13} className="text-indigo-500" />
                <span>View Queue</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Risk Summary Banner */}
        <div className={cn(
          "px-6 py-3 border-b flex items-center justify-between text-xs font-medium",
          overallRisk === 'critical'
            ? "bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-400"
            : overallRisk === 'warning'
            ? "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400"
            : "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400"
        )}>
          <div className="flex items-center gap-2">
            {overallRisk === 'critical' ? (
              <ShieldAlert size={16} className="shrink-0 text-rose-600" />
            ) : overallRisk === 'warning' ? (
              <AlertTriangle size={16} className="shrink-0 text-amber-600" />
            ) : (
              <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
            )}
            <span>
              {overallRisk === 'critical'
                ? 'High Risk: Schema includes destructive drops or lossy type conversions. Off-peak scheduled deployment recommended.'
                : overallRisk === 'warning'
                ? 'Moderate Risk: Renamed columns or constraint updates may impact external integrations.'
                : 'Safe Migration: Additive non-breaking changes. Safe for live database deployment.'}
            </span>
          </div>

          <div className="flex items-center gap-2 font-mono text-[11px]">
            {criticalCount > 0 && <span className="px-2 py-0.5 bg-rose-500/20 rounded-md text-rose-600 dark:text-rose-300 font-bold">{criticalCount} Critical</span>}
            {warningCount > 0 && <span className="px-2 py-0.5 bg-amber-500/20 rounded-md text-amber-600 dark:text-amber-300 font-bold">{warningCount} Warning</span>}
            {safeCount > 0 && <span className="px-2 py-0.5 bg-emerald-500/20 rounded-md text-emerald-600 dark:text-emerald-300 font-bold">{safeCount} Safe</span>}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/30 dark:bg-zinc-900/30">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('diff')}
              className={cn(
                "py-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2",
                activeTab === 'diff'
                  ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                  : "border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              )}
            >
              <Layers size={14} />
              <span>Structural Diff ({changes.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('notes')}
              className={cn(
                "py-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2",
                activeTab === 'notes'
                  ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                  : "border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              )}
            >
              <FileText size={14} />
              <span>Release Notes</span>
            </button>
            <button
              onClick={() => setActiveTab('schedule')}
              className={cn(
                "py-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2",
                activeTab === 'schedule'
                  ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                  : "border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              )}
            >
              <Calendar size={14} />
              <span>Deployment Schedule</span>
            </button>
            <button
              onClick={() => setActiveTab('sql')}
              className={cn(
                "py-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2",
                activeTab === 'sql'
                  ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                  : "border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              )}
            >
              <FileCode size={14} />
              <span>PostgreSQL DDL</span>
            </button>
            <button
              onClick={() => setActiveTab('safety')}
              className={cn(
                "py-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2",
                activeTab === 'safety'
                  ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                  : "border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              )}
            >
              <Sliders size={14} />
              <span>Safeguards</span>
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* TAB 1: Structural Diff */}
          {activeTab === 'diff' && (
            <div className="space-y-3">
              {changes.length === 0 ? (
                <div className="text-center py-12 px-4 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
                  <CheckCircle2 size={32} className="mx-auto text-emerald-500 mb-2" />
                  <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Schema In Full Sync</h4>
                  <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1">
                    No structural changes detected between staged layout and the live database schema.
                  </p>
                </div>
              ) : (
                changes.map(c => (
                  <div
                    key={c.id}
                    className={cn(
                      "p-4 rounded-2xl border transition-all",
                      c.riskLevel === 'critical'
                        ? "bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40"
                        : c.riskLevel === 'warning'
                        ? "bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40"
                        : "bg-zinc-50/50 dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800"
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                            c.type === 'added' ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
                            c.type === 'removed' ? "bg-rose-500/10 text-rose-600 dark:text-rose-400" :
                            "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          )}>
                            {c.type}
                          </span>
                          <span className="font-bold text-xs text-zinc-900 dark:text-white">
                            {c.fieldLabel}
                          </span>
                          <code className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                            {c.fieldName}
                          </code>
                        </div>

                        {c.riskMessage && (
                          <p className="text-xs text-zinc-600 dark:text-zinc-400 pt-1">
                            {c.riskMessage}
                          </p>
                        )}
                      </div>

                      <div className="shrink-0 text-right">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                          c.riskLevel === 'critical' ? "bg-rose-500 text-white" :
                          c.riskLevel === 'warning' ? "bg-amber-500 text-white" :
                          "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                        )}>
                          {c.riskLevel} Risk
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 p-2.5 bg-zinc-950 rounded-xl font-mono text-[11px] text-emerald-400 border border-zinc-800/80 overflow-x-auto">
                      <code>{c.suggestedSql}</code>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 2: Automated Release Notes */}
          {activeTab === 'notes' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-tight">
                    Automated Release Notes & Changelog
                  </h4>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Synthesized from your structural AST changes. Review, edit, or AI-polish before deploying.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRegenerateNotes}
                    className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1.5"
                    title="Reset to freshly synthesized AST notes"
                  >
                    <RefreshCw size={12} />
                    <span>Reset</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleAIPolishNotes}
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 text-xs font-bold hover:bg-indigo-500/20 transition-all flex items-center gap-1.5 shadow-sm"
                    title="Polish for executive and business stakeholders"
                  >
                    <Wand2 size={12} />
                    <span>✨ AI Polish</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyNotes}
                    className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1.5"
                  >
                    {copiedNotes ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                    <span>{copiedNotes ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <div className="relative">
                <textarea
                  rows={14}
                  value={customReleaseNotes}
                  onChange={(e) => {
                    setCustomReleaseNotes(e.target.value);
                    setIsNotesUserEdited(true);
                  }}
                  placeholder="Release notes will be automatically generated from schema differences..."
                  className="w-full p-4 text-xs font-mono rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 leading-relaxed outline-none resize-none"
                />
              </div>
            </div>
          )}

          {/* TAB 3: Schedule Configuration */}
          {activeTab === 'schedule' && (
            <div className="space-y-6">
              {/* Strategy Selector */}
              <div className="grid grid-cols-2 gap-4">
                <div
                  onClick={() => setDeploymentStrategy('immediate')}
                  className={cn(
                    "p-4 rounded-2xl border-2 cursor-pointer transition-all",
                    deploymentStrategy === 'immediate'
                      ? "border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/30"
                      : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                      <Sparkles size={18} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-zinc-900 dark:text-white">Deploy Immediately (Now)</h4>
                      <p className="text-[11px] text-zinc-500 mt-0.5">Instant live database upgrade</p>
                    </div>
                  </div>
                </div>

                <div
                  onClick={() => setDeploymentStrategy('scheduled')}
                  className={cn(
                    "p-4 rounded-2xl border-2 cursor-pointer transition-all",
                    deploymentStrategy === 'scheduled'
                      ? "border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/30"
                      : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                      <Calendar size={18} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-zinc-900 dark:text-white">Schedule for Maintenance Window</h4>
                      <p className="text-[11px] text-zinc-500 mt-0.5">Automated off-peak execution</p>
                    </div>
                  </div>
                </div>
              </div>

              {deploymentStrategy === 'scheduled' && (
                <div className="p-5 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-4">
                  <div>
                    <label className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-tight block mb-2">
                      Select Maintenance Window Preset
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { id: 'tonight', label: 'Tonight @ 02:00 UTC', desc: 'Next off-peak cycle' },
                        { id: 'tomorrow', label: 'Tomorrow @ 04:00 UTC', desc: 'Early morning slot' },
                        { id: 'weekend', label: 'Weekend Maintenance', desc: 'Upcoming Sunday 01:00 UTC' }
                      ].map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setSchedulePreset(p.id as any)}
                          className={cn(
                            "p-3 rounded-xl border text-left transition-all",
                            schedulePreset === p.id
                              ? "border-indigo-600 bg-white dark:bg-zinc-800 shadow-sm"
                              : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                          )}
                        >
                          <div className="text-xs font-bold text-zinc-900 dark:text-white">{p.label}</div>
                          <div className="text-[10px] text-zinc-500 mt-0.5">{p.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-tight block mb-2">
                      Or Pick Custom Date & Time
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="datetime-local"
                        value={customDateTime}
                        onChange={(e) => {
                          setCustomDateTime(e.target.value);
                          setSchedulePreset('custom');
                        }}
                        className="px-3.5 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                      />
                      <span className="text-xs text-zinc-500">
                        Will execute on {calculateTargetDate().toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: SQL Payload */}
          {activeTab === 'sql' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Terminal size={14} />
                  <span>Transactional PostgreSQL DDL</span>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopySql}
                    className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1.5"
                  >
                    {copiedSql ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                    <span>{copiedSql ? 'Copied' : 'Copy SQL'}</span>
                  </button>
                  <button
                    onClick={handleDownloadSql}
                    className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1.5"
                  >
                    <Download size={13} />
                    <span>Download .sql</span>
                  </button>
                </div>
              </div>

              <pre className="p-4 bg-zinc-950 text-emerald-400 font-mono text-xs rounded-2xl border border-zinc-800 overflow-x-auto max-h-96 leading-relaxed">
                {fullMigrationSql}
              </pre>
            </div>
          )}

          {/* TAB 5: Safety & Safeguards */}
          {activeTab === 'safety' && (
            <div className="space-y-4">
              <div className="p-5 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-500/20">
                    <History size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-tight">
                      Automated Pre-Execution Snapshot (Rollback Checkpoint)
                    </h4>
                    <p className="text-xs text-zinc-500 mt-1">
                      Saves an immutable snapshot of schema v{currentVersion} immediately before migration. If DDL fails, automatic rollback restores the prior state instantly.
                    </p>
                  </div>
                </div>

                <label className="flex items-center gap-3 pt-2 cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={createSnapshot}
                    onChange={(e) => setCreateSnapshot(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                    Create version checkpoint snapshot before migration
                  </span>
                </label>
              </div>

              <div className="p-5 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0 border border-amber-500/20">
                    <Archive size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-tight">
                      Soft-Delete Safety Policy (Recommended)
                    </h4>
                    <p className="text-xs text-zinc-500 mt-1">
                      Retains underlying database columns when deleted from canvas and archives them as <code className="text-indigo-500 font-mono">_deprecated_column</code> to prevent data loss.
                    </p>
                  </div>
                </div>

                <label className="flex items-center gap-3 pt-2 cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={softDeleteDropped}
                    onChange={(e) => setSoftDeleteDropped(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                    Enable column archiving instead of hard DDL <code className="text-rose-500 font-mono">DROP COLUMN</code>
                  </span>
                </label>
              </div>

              <div className="p-5 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0 border border-purple-500/20">
                    <Lock size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-tight">
                      Maintenance Mode Lock & User Alert
                    </h4>
                    <p className="text-xs text-zinc-500 mt-1">
                      Places module in read-only mode during DDL execution and broadcasts a warning banner to active users.
                    </p>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={maintenanceMode}
                      onChange={(e) => setMaintenanceMode(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                      Lock module in Read-Only Maintenance during deployment
                    </span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={notifyUsers}
                      onChange={(e) => setNotifyUsers(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                      Broadcast pre-flight countdown alert to active users
                    </span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={autoRollback}
                      onChange={(e) => setAutoRollback(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                      Auto-rollback transaction on error
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('notes')}
              className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1.5"
            >
              <FileText size={14} />
              <span>Release Notes</span>
            </button>

            {deploymentStrategy === 'scheduled' ? (
              <button
                onClick={executeScheduleDeployment}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2"
              >
                <Calendar size={14} />
                <span>Schedule Deployment ({calculateTargetDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })})</span>
              </button>
            ) : (
              <button
                onClick={executeDeployImmediate}
                disabled={isDeploying}
                className={cn(
                  "px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-lg flex items-center gap-2",
                  criticalCount > 0
                    ? "bg-rose-600 hover:bg-rose-500 shadow-rose-500/20"
                    : "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20",
                  isDeploying && "opacity-75 cursor-not-allowed"
                )}
              >
                {isDeploying ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Deploying Schema...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    <span>Deploy Now (v{nextVersion})</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
