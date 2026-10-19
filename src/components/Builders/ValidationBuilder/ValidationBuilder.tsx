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
}

export const ValidationBuilder: React.FC<ValidationBuilderProps> = ({
  initialRuleset,
  builderContext,
  fields = [],
  validationRules,
  setValidationRules,
  onDirtyChange
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
      if (mod?.layout) return mod.layout;
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
        name,
        description,
        scope: effectiveModuleId ? 'MODULE' : 'GLOBAL',
        moduleId: effectiveModuleId || null,
        rules: activeRules
      };

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
    <div className="h-full w-full bg-zinc-950 flex flex-col overflow-hidden">

      <div className="px-6 py-3 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-950/80 text-emerald-400 border border-emerald-800/50 rounded-lg">
            <ShieldCheck size={18} />
          </div>
          <div>
            {builderContext.mode === 'global' ? (
              <>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => { setName(e.target.value); onDirtyChange?.(true); }}
                  className="font-bold text-base bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded px-1 text-white"
                  placeholder="Ruleset Name..."
                />
                <input
                  type="text"
                  value={description}
                  onChange={(e) => { setDescription(e.target.value); onDirtyChange?.(true); }}
                  className="text-xs text-zinc-400 bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded px-1 block w-full"
                  placeholder="Describe what this ruleset validates..."
                />
              </>
            ) : (
              <>
                <h3 className="text-sm font-bold text-white">Validation Ruleset Studio</h3>
                <p className="text-xs text-zinc-400">
                  {`In-Context Validation Rules for [${builderContext.hostType?.toUpperCase()}]`}
                </p>
              </>
            )}
          </div>
        </div>

        {builderContext.mode === 'global' && (
          <div className="flex items-center gap-3">
            <select
              value={associatedModuleId}
              onChange={(e) => { setAssociatedModuleId(e.target.value); onDirtyChange?.(true); }}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
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
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-4 py-2 rounded-lg font-semibold shadow-sm transition-all"
            >
              <Save size={14} />
              <span>{saving ? 'Saving...' : 'Save Ruleset'}</span>
            </Button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        <ValidationsTab
          fields={effectiveFields}
          validationRules={activeRules}
          setValidationRules={handleSetValidationRules}
        />
      </div>
    </div>
  );
};

