import React, { useState, useEffect } from 'react';
import { 
  X, 
  Layers, 
  Palette, 
  Check, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Flame, 
  ShieldAlert, 
  Star, 
  Zap, 
  XCircle, 
  Info,
  Sliders,
  Table as TableIcon
} from 'lucide-react';
import { cn, PRESET_FORMATTING_MAP } from '../../lib/utils';
import { ConditionalFormattingRule, FormattingPreset, VisibilityRule } from '../../types/platform';
import { ConditionModal } from './ConditionModal';

export interface ConditionalFormattingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (rule: ConditionalFormattingRule) => void;
  initialRule?: ConditionalFormattingRule | null;
  availableFields: { id: string; label: string; type?: string; category?: string }[];
  tabs?: { id: string; label: string }[];
  allowedTargetTypes?: ('row' | 'column' | 'field')[];
  availableColumns?: { id: string; label: string; group?: string }[];
  title?: string;
}

const AVAILABLE_ICONS = [
  { name: 'AlertTriangle', label: 'Alert', icon: AlertTriangle },
  { name: 'CheckCircle2', label: 'Check', icon: CheckCircle2 },
  { name: 'Flame', label: 'Flame / Hot', icon: Flame },
  { name: 'ShieldAlert', label: 'Shield Warning', icon: ShieldAlert },
  { name: 'Clock', label: 'Time / Clock', icon: Clock },
  { name: 'Star', label: 'Star', icon: Star },
  { name: 'Zap', label: 'Lightning', icon: Zap },
  { name: 'XCircle', label: 'Stop / Error', icon: XCircle },
  { name: 'Info', label: 'Info', icon: Info },
];

export const ConditionalFormattingModal: React.FC<ConditionalFormattingModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialRule,
  availableFields,
  tabs = [],
  allowedTargetTypes = ['row', 'column'],
  availableColumns = [],
  title = "Conditional Formatting Rule"
}) => {
  const [name, setName] = useState(initialRule?.name || '');
  const [targetType, setTargetType] = useState<'row' | 'column' | 'field'>(
    initialRule?.targetType || allowedTargetTypes[0] || 'row'
  );
  const [targetId, setTargetId] = useState(initialRule?.targetId || (availableColumns[0]?.id || availableFields[0]?.id || ''));
  const [enabled, setEnabled] = useState(initialRule?.enabled ?? true);
  
  // Style states
  const [preset, setPreset] = useState<FormattingPreset>(initialRule?.style?.preset || 'danger');
  const [isBold, setIsBold] = useState(initialRule?.style?.isBold ?? false);
  const [isItalic, setIsItalic] = useState(initialRule?.style?.isItalic ?? false);
  const [isStrikethrough, setIsStrikethrough] = useState(initialRule?.style?.isStrikethrough ?? false);
  const [selectedIcon, setSelectedIcon] = useState<string | undefined>(initialRule?.style?.iconName);
  const [badgeLabel, setBadgeLabel] = useState(initialRule?.style?.badgeLabel || '');
  
  // Condition state
  const [condition, setCondition] = useState<VisibilityRule>(() => {
    if (initialRule?.condition) {
      return initialRule.condition;
    }
    return {
      id: `rule-${Math.random().toString(36).substring(2, 9)}`,
      type: 'rule',
      fieldId: availableFields[0]?.id || 'status',
      operator: 'equals',
      value: '',
      valueType: 'literal'
    };
  });

  const [showConditionEditor, setShowConditionEditor] = useState(false);

  // Sync initial rule when modal opens or initialRule changes
  useEffect(() => {
    if (isOpen) {
      setName(initialRule?.name || '');
      setTargetType(initialRule?.targetType || allowedTargetTypes[0] || 'row');
      setTargetId(initialRule?.targetId || (availableColumns[0]?.id || availableFields[0]?.id || ''));
      setEnabled(initialRule?.enabled ?? true);
      setPreset(initialRule?.style?.preset || 'danger');
      setIsBold(initialRule?.style?.isBold ?? false);
      setIsItalic(initialRule?.style?.isItalic ?? false);
      setIsStrikethrough(initialRule?.style?.isStrikethrough ?? false);
      setSelectedIcon(initialRule?.style?.iconName);
      setBadgeLabel(initialRule?.style?.badgeLabel || '');
      if (initialRule?.condition) {
        setCondition(initialRule.condition);
      } else {
        setCondition({
          id: `rule-${Math.random().toString(36).substring(2, 9)}`,
          type: 'rule',
          fieldId: availableFields[0]?.id || 'status',
          operator: 'equals',
          value: '',
          valueType: 'literal'
        });
      }
    }
  }, [isOpen, initialRule]);

  const activePresetConfig = PRESET_FORMATTING_MAP[preset] || PRESET_FORMATTING_MAP.danger;

  const handleSave = () => {
    const rule: ConditionalFormattingRule = {
      id: initialRule?.id || `fmt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: name.trim() || undefined,
      enabled,
      targetType,
      targetId: targetType === 'row' ? undefined : targetId,
      condition,
      style: {
        preset,
        isBold: isBold || undefined,
        isItalic: isItalic || undefined,
        isStrikethrough: isStrikethrough || undefined,
        iconName: selectedIcon || undefined,
        badgeLabel: badgeLabel.trim() || undefined
      }
    };
    onSave(rule);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-950/30">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20">
              <Palette size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-900 dark:text-white">{title}</h2>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Configure trigger conditions and dynamic styling</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar text-xs">
          
          {/* Rule Name & Target Scope */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">Rule Name (Optional)</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                placeholder="e.g. Overdue Case Highlight"
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">Target Scope</label>
              <div className="flex gap-2">
                {allowedTargetTypes.includes('row') && (
                  <button
                    type="button"
                    onClick={() => setTargetType('row')}
                    className={cn(
                      "flex-1 py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all",
                      targetType === 'row'
                        ? "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 text-indigo-600 dark:text-indigo-400 shadow-sm"
                        : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400"
                    )}
                  >
                    <TableIcon size={13} />
                    Entire Row
                  </button>
                )}

                {allowedTargetTypes.includes('column') && (
                  <button
                    type="button"
                    onClick={() => setTargetType('column')}
                    className={cn(
                      "flex-1 py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all",
                      targetType === 'column'
                        ? "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 text-indigo-600 dark:text-indigo-400 shadow-sm"
                        : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400"
                    )}
                  >
                    <Layers size={13} />
                    Specific Column
                  </button>
                )}

                {allowedTargetTypes.includes('field') && (
                  <button
                    type="button"
                    onClick={() => setTargetType('field')}
                    className={cn(
                      "flex-1 py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all",
                      targetType === 'field'
                        ? "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 text-indigo-600 dark:text-indigo-400 shadow-sm"
                        : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400"
                    )}
                  >
                    <Sliders size={13} />
                    Current Field
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Target Column Selector if Column Scope */}
          {targetType === 'column' && availableColumns.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">Target Column</label>
              <select
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white outline-none focus:border-indigo-500"
              >
                {availableColumns.map(col => (
                  <option key={col.id} value={col.id}>
                    {col.label} {col.group ? `(${col.group})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Condition Trigger Summary / Trigger Action */}
          <div className="bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-indigo-500" />
                <span className="font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider text-[10px]">
                  Condition Logic
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowConditionEditor(true)}
                className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                Configure Condition →
              </button>
            </div>

            <div className="p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-zinc-500 text-[10px] block">Trigger when condition is met:</span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200 font-mono text-[11px]">
                  {condition.type === 'group' 
                    ? `Group (${condition.rules?.length || 0} conditions, ${condition.logicalOperator || 'AND'})`
                    : `${condition.fieldId || 'Field'} ${condition.operator || 'equals'} "${condition.value ?? ''}"`
                  }
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowConditionEditor(true)}
                className="px-2.5 py-1 text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg transition-colors cursor-pointer"
              >
                Edit Logic
              </button>
            </div>
          </div>

          {/* Style Configuration Section */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Palette size={14} className="text-indigo-500" />
              Style & Appearance
            </h3>

            {/* Color Presets */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400">Color Palette Preset</label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {(['danger', 'warning', 'success', 'info', 'purple', 'slate'] as FormattingPreset[]).map((pKey) => {
                  const cfg = PRESET_FORMATTING_MAP[pKey];
                  const isSel = preset === pKey;
                  return (
                    <button
                      key={pKey}
                      type="button"
                      onClick={() => setPreset(pKey)}
                      className={cn(
                        "p-2.5 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 cursor-pointer relative",
                        isSel 
                          ? "ring-2 ring-indigo-500 border-indigo-500 shadow-sm" 
                          : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                      )}
                    >
                      <div className={cn("w-5 h-5 rounded-full border flex items-center justify-center", cfg.cellBadgeClass)}>
                        {isSel && <Check size={11} className={cfg.iconColor} />}
                      </div>
                      <span className="text-[10px] font-bold capitalize text-zinc-700 dark:text-zinc-300">
                        {pKey}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Typography & Badge Customization */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Typography toggles */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400">Text Style</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsBold(!isBold)}
                    className={cn(
                      "flex-1 py-2 px-3 rounded-xl border font-bold text-xs transition-colors cursor-pointer",
                      isBold 
                        ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-transparent shadow-sm" 
                        : "border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                    )}
                  >
                    B
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsItalic(!isItalic)}
                    className={cn(
                      "flex-1 py-2 px-3 rounded-xl border italic font-serif text-xs transition-colors cursor-pointer",
                      isItalic 
                        ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-transparent shadow-sm" 
                        : "border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                    )}
                  >
                    I
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsStrikethrough(!isStrikethrough)}
                    className={cn(
                      "flex-1 py-2 px-3 rounded-xl border line-through text-xs transition-colors cursor-pointer",
                      isStrikethrough 
                        ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-transparent shadow-sm" 
                        : "border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                    )}
                  >
                    S
                  </button>
                </div>
              </div>

              {/* Custom Badge Pill Label */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400">Custom Badge Tag (Optional)</label>
                <input
                  type="text"
                  value={badgeLabel}
                  onChange={(e) => setBadgeLabel(e.target.value)}
                  onKeyDown={(e) => e.stopPropagation()}
                  placeholder="e.g. OVERDUE, HIGH PRIORITY"
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Status Icon Picker */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400">Status Icon Indicator</label>
                {selectedIcon && (
                  <button
                    type="button"
                    onClick={() => setSelectedIcon(undefined)}
                    className="text-[10px] text-zinc-400 hover:text-rose-500 transition-colors cursor-pointer"
                  >
                    Clear icon
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_ICONS.map((ico) => {
                  const IconComp = ico.icon;
                  const isSel = selectedIcon === ico.name;
                  return (
                    <button
                      key={ico.name}
                      type="button"
                      onClick={() => setSelectedIcon(isSel ? undefined : ico.name)}
                      className={cn(
                        "p-2 rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer",
                        isSel
                          ? "bg-indigo-500 text-white border-indigo-400 shadow-sm"
                          : "bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700"
                      )}
                      title={ico.label}
                    >
                      <IconComp size={14} />
                      <span className="text-[10px] font-medium">{ico.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Live Visual Preview */}
            <div className="bg-zinc-100 dark:bg-zinc-950 rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800 space-y-2">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Live Visual Preview</span>
              <div className={cn(
                "p-3 rounded-xl border transition-all flex items-center justify-between",
                targetType === 'row' ? activePresetConfig.rowClass : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
              )}>
                <div className="flex items-center gap-2.5">
                  {selectedIcon && (
                    <div className={cn("shrink-0", activePresetConfig.iconColor)}>
                      {React.createElement(
                        AVAILABLE_ICONS.find(i => i.name === selectedIcon)?.icon || AlertTriangle,
                        { size: 16 }
                      )}
                    </div>
                  )}
                  <span className={cn(
                    "text-xs",
                    targetType === 'row' || targetType === 'field' ? activePresetConfig.textClass : "text-zinc-800 dark:text-zinc-200",
                    isBold && "font-bold",
                    isItalic && "italic",
                    isStrikethrough && "line-through opacity-70"
                  )}>
                    Sample Record / Item Title
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {badgeLabel && (
                    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider", activePresetConfig.cellBadgeClass)}>
                      {badgeLabel}
                    </span>
                  )}
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-bold border",
                    targetType === 'column' ? activePresetConfig.cellBadgeClass : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700"
                  )}>
                    {targetType === 'column' ? 'Formatted Cell' : 'Normal Cell'}
                  </span>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-950/30">
          <label className="flex items-center gap-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="rounded border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-indigo-500"
            />
            Rule is active
          </label>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Check size={14} />
              Save Formatting Rule
            </button>
          </div>
        </div>

      </div>

      {/* Submodal for Condition Logic Builder */}
      {showConditionEditor && (
        <ConditionModal
          isOpen={showConditionEditor}
          onClose={() => setShowConditionEditor(false)}
          onSave={(newRule) => {
            if (newRule) {
              setCondition(newRule);
            }
            setShowConditionEditor(false);
          }}
          initialRule={condition}
          availableFields={availableFields as any}
          tabs={tabs as any}
          targetLabel={name || "Conditional Formatting Rule"}
          title="Configure Trigger Condition"
        />
      )}
    </div>
  );
};
