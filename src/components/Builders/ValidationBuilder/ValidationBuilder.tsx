import React, { useState, useEffect } from 'react';
import { ShieldCheck, Save } from 'lucide-react';
import { StandaloneBuilderContext, ValidationRulesetEntity } from '../../../types/platform';
import { ValidationsTab } from '../../Builder/ValidationsTab';
import { Button } from '../../UI/Primitives';
import { API_BASE_URL } from '../../../config';
import { usePlatform } from '../../../hooks/usePlatform';
import { useAuth } from '../../../hooks/useAuth';
import { PLATFORM_MODULES } from '../../../config/platformModules';
import { toast } from 'sonner';

export interface ValidationBuilderProps {
  initialRuleset?: Partial<ValidationRulesetEntity>;
  builderContext: StandaloneBuilderContext;
  fields?: any[];
  validationRules?: any[];
  setValidationRules?: React.Dispatch<React.SetStateAction<any[]>>;
  onDirtyChange?: (isDirty: boolean) => void;
  draftMode?: boolean;
  onSave?: (ruleset: any) => void;
}

export const ValidationBuilder: React.FC<ValidationBuilderProps> = ({
  initialRuleset,
  builderContext,
  fields = [],
  validationRules,
  setValidationRules,
  onDirtyChange,
  draftMode = false,
  onSave
}) => {
  const { tenant, modules } = usePlatform();
  const { session } = useAuth();
  const token = session?.access_token;
  const [name, setName] = useState(initialRuleset?.name || 'Untitled Validation Ruleset');
  const [description, setDescription] = useState(initialRuleset?.description || '');
  const [associatedModuleId, setAssociatedModuleId] = useState<string>(
    initialRuleset?.moduleId ||
    builderContext.parentModuleId ||
    (builderContext.hostType === 'module' ? builderContext.hostId || '' : '')
  );
  const [localRules, setLocalRules] = useState<any[]>(initialRuleset?.rules || validationRules || []);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialRuleset) {
      setName(initialRuleset.name || 'Untitled Validation Ruleset');
      setDescription(initialRuleset.description || '');
      setAssociatedModuleId(
        initialRuleset.moduleId ||
        builderContext.parentModuleId ||
        (builderContext.hostType === 'module' ? builderContext.hostId || '' : '')
      );
      setLocalRules(initialRuleset.rules || []);
    }
  }, [initialRuleset, builderContext.parentModuleId, builderContext.hostId, builderContext.hostType]);

  const activeRules = validationRules !== undefined ? validationRules : localRules;

  const handleSetValidationRules: React.Dispatch<React.SetStateAction<any[]>> = (updater) => {
    onDirtyChange?.(true);
    if (setValidationRules) {
      setValidationRules(updater);
    } else {
      setLocalRules(updater);
    }
  };

  const effectiveFields = React.useMemo(() => {
    if (fields && fields.length > 0) return fields;
    if (associatedModuleId) {
      const mod = (modules || []).find(m => m.id === associatedModuleId);
      if (mod?.layout && Array.isArray(mod.layout)) {
        const flat: any[] = [];
        const walk = (items: any[]) => {
          items.forEach((item) => {
            if (!item || typeof item !== 'object') return;
            if (Array.isArray(item.children)) walk(item.children);
            if (Array.isArray(item.fields)) walk(item.fields);
            if (Array.isArray(item.tabs)) {
              item.tabs.forEach((t: any) => {
                if (Array.isArray(t?.children)) walk(t.children);
                if (Array.isArray(t?.fields)) walk(t.fields);
              });
            }
            if (item.id && !['container', 'section', 'tabs', 'columns', 'grid'].includes(item.type)) {
              flat.push(item);
            }
          });
        };
        walk(mod.layout);
        if (flat.length > 0) return flat;
      }
    }
    return [
      { id: 'name', label: 'Name / Title', type: 'text' },
      { id: 'status', label: 'Status', type: 'select' },
      { id: 'email', label: 'Email', type: 'email' },
      { id: 'amount', label: 'Amount', type: 'number' }
    ];
  }, [fields, associatedModuleId, modules]);

  const handleSaveRuleset = async () => {
    setSaving(true);
    try {
      const effectiveModuleId =
        associatedModuleId ||
        builderContext.parentModuleId ||
        (builderContext.hostType === 'module' ? builderContext.hostId : undefined) ||
        undefined;
      const isExistingPersistedId = Boolean(initialRuleset?.id && !initialRuleset.id.startsWith('val_'));

      const payload = {
        id: initialRuleset?.id || `val_${Date.now()}`,
        name,
        description,
        scope: effectiveModuleId ? 'MODULE' : 'GLOBAL',
        moduleId: effectiveModuleId || null,
        rules: activeRules
      };

      if (draftMode) {
        onDirtyChange?.(false);
        onSave?.(payload);
        builderContext.onSaveSuccess?.(payload.id, payload);
        return;
      }

      const res = await fetch(`${API_BASE_URL}/api/validations${isExistingPersistedId ? `/${initialRuleset!.id}` : ''}`, {
        method: isExistingPersistedId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenant?.id || '',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const saved = await res.json();
        onDirtyChange?.(false);
        if (builderContext.onSaveSuccess) builderContext.onSaveSuccess(saved.id, saved);
      } else {
        toast.error('Failed to save validation ruleset');
      }
    } catch (err) {
      toast.error('Failed to save validation ruleset');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-full w-full bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col overflow-hidden">

      <div className="h-12 px-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-7 h-7 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 rounded-lg flex items-center justify-center shrink-0">
            <ShieldCheck size={15} />
          </div>
          <div className="min-w-0 flex-1 flex items-center gap-2">
            {builderContext.mode === 'global' ? (
              <>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => { setName(e.target.value); onDirtyChange?.(true); }}
                  className="font-semibold text-sm bg-transparent border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 focus:border-indigo-500 focus:outline-none rounded-lg px-2 py-1 text-zinc-900 dark:text-zinc-100 min-w-[180px]"
                  placeholder="Ruleset Name..."
                />
                <span className="text-zinc-300 dark:text-zinc-700 hidden sm:inline">·</span>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => { setDescription(e.target.value); onDirtyChange?.(true); }}
                  className="text-xs text-zinc-500 dark:text-zinc-400 bg-transparent border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 focus:border-indigo-500 focus:outline-none rounded-lg px-2 py-1 flex-1 min-w-0 hidden sm:block"
                  placeholder="Describe what this ruleset validates..."
                />
              </>
            ) : (
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Validation Ruleset</h3>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  {builderContext.hostType?.toUpperCase()}
                </span>
              </div>
            )}
          </div>
        </div>

        {builderContext.mode === 'global' && (
          <div className="flex items-center gap-2 shrink-0">
            <select
              value={associatedModuleId}
              onChange={(e) => { setAssociatedModuleId(e.target.value); onDirtyChange?.(true); }}
              className="h-8 px-2.5 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 focus:outline-none focus:border-indigo-500"
              title="Scope Ruleset Globally or Associate with a Module"
            >
              <option value="">Global (All Modules)</option>
              <optgroup label="Custom Modules">
                {(modules || []).filter(m => (m as any).type !== 'PAGE').map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </optgroup>
              <optgroup label="Platform Modules">
                {PLATFORM_MODULES.map(pm => (
                  <option key={pm.id} value={pm.id}>{pm.name}</option>
                ))}
              </optgroup>
            </select>

            <Button
              onClick={handleSaveRuleset}
              disabled={saving}
              className="h-8 flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 rounded-lg font-medium shadow-sm transition-all"
            >
              <Save size={13} />
              <span>{saving ? 'Saving...' : 'Save Ruleset'}</span>
            </Button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-hidden">
        <ValidationsTab
          fields={effectiveFields}
          validationRules={activeRules}
          setValidationRules={handleSetValidationRules}
          showAiAssist={builderContext.mode === 'global'}
        />
      </div>
    </div>
  );
};

