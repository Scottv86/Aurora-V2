import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
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
  Table as TableIcon,
  ChevronDown,
  GitBranch
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
  { name: 'Flame', label: 'Urgent', icon: Flame },
  { name: 'ShieldAlert', label: 'Warning', icon: ShieldAlert },
  { name: 'Clock', label: 'Overdue', icon: Clock },
  { name: 'Star', label: 'Star', icon: Star },
  { name: 'Zap', label: 'Active', icon: Zap },
  { name: 'XCircle', label: 'Error', icon: XCircle },
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
  title = 'Conditional Formatting'
}) => {
  const [name, setName] = useState(initialRule?.name || '');
  const [targetType, setTargetType] = useState<'row' | 'column' | 'field'>(
    initialRule?.targetType || allowedTargetTypes[0] || 'row'
  );
  const [targetId, setTargetId] = useState(
    initialRule?.targetId || availableColumns[0]?.id || availableFields[0]?.id || ''
  );
  const [enabled, setEnabled] = useState(initialRule?.enabled ?? true);

  // Style states
  const [preset, setPreset] = useState<FormattingPreset>(initialRule?.style?.preset || 'danger');
  const [isBold, setIsBold] = useState(initialRule?.style?.isBold ?? false);
  const [isItalic, setIsItalic] = useState(initialRule?.style?.isItalic ?? false);
  const [isStrikethrough, setIsStrikethrough] = useState(initialRule?.style?.isStrikethrough ?? false);
  const [selectedIcon, setSelectedIcon] = useState<string | undefined>(initialRule?.style?.iconName);
  const [badgeLabel, setBadgeLabel] = useState(initialRule?.style?.badgeLabel || '');

  // Custom column picker state
  const [isColPickerOpen, setIsColPickerOpen] = useState(false);
  const colPickerRef = useRef<HTMLDivElement>(null);

  // Condition state
  const [condition, setCondition] = useState<VisibilityRule>(() => {
    if (initialRule?.condition) return initialRule.condition;
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

  // Sync initial rule when modal opens
  useEffect(() => {
    if (!isOpen) return;
    setName(initialRule?.name || '');
    setTargetType(initialRule?.targetType || allowedTargetTypes[0] || 'row');
    setTargetId(initialRule?.targetId || availableColumns[0]?.id || availableFields[0]?.id || '');
    setEnabled(initialRule?.enabled ?? true);
    setPreset(initialRule?.style?.preset || 'danger');
    setIsBold(initialRule?.style?.isBold ?? false);
    setIsItalic(initialRule?.style?.isItalic ?? false);
    setIsStrikethrough(initialRule?.style?.isStrikethrough ?? false);
    setSelectedIcon(initialRule?.style?.iconName);
    setBadgeLabel(initialRule?.style?.badgeLabel || '');
    setIsColPickerOpen(false);
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
  }, [isOpen, initialRule]);

  // Escape & click-outside handlers
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isColPickerOpen) setIsColPickerOpen(false);
        else if (!showConditionEditor) onClose();
      }
    };
    const handleOutside = (e: MouseEvent) => {
      if (colPickerRef.current && !colPickerRef.current.contains(e.target as Node)) {
        setIsColPickerOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleOutside);
    };
  }, [isOpen, isColPickerOpen, showConditionEditor, onClose]);

  const activePresetConfig = PRESET_FORMATTING_MAP[preset] || PRESET_FORMATTING_MAP.danger;

  const resolveFieldLabel = (fieldId?: string) => {
    if (!fieldId) return 'Field';
    const found = availableFields.find(f => f.id === fieldId);
    return found?.label || fieldId;
  };

  const selectedColumn = availableColumns.find(c => c.id === targetId) || availableColumns[0];

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

  if (typeof document === 'undefined') return null;

  return createPortal(
    <>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Calm Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16 }}
              onClick={onClose}
              className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            />

            {/* Google-Style Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 8 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
              className="relative z-10 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]"
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    <Palette size={18} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm font-semibold text-zinc-900 dark:text-white truncate">{title}</h2>
                    <p className="text-xs text-zinc-500 truncate">
                      Highlight rows, columns, or fields dynamically when conditions match
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                  title="Close (Esc)"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
                {/* Rule Name & Target Scope */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block">
                      Rule name <span className="text-zinc-400 font-normal">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      onKeyDown={(e) => e.stopPropagation()}
                      placeholder="e.g. Overdue request highlight"
                      className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block">
                      Apply formatting to
                    </label>
                    <div className="flex bg-zinc-100 dark:bg-zinc-800/80 p-0.5 rounded-xl">
                      {allowedTargetTypes.includes('row') && (
                        <button
                          type="button"
                          onClick={() => setTargetType('row')}
                          className={cn(
                            'flex-1 py-1.5 px-2.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer',
                            targetType === 'row'
                              ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                              : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                          )}
                        >
                          <TableIcon size={13} />
                          <span>Row</span>
                        </button>
                      )}
                      {allowedTargetTypes.includes('column') && (
                        <button
                          type="button"
                          onClick={() => setTargetType('column')}
                          className={cn(
                            'flex-1 py-1.5 px-2.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer',
                            targetType === 'column'
                              ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                              : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                          )}
                        >
                          <Layers size={13} />
                          <span>Column</span>
                        </button>
                      )}
                      {allowedTargetTypes.includes('field') && (
                        <button
                          type="button"
                          onClick={() => setTargetType('field')}
                          className={cn(
                            'flex-1 py-1.5 px-2.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer',
                            targetType === 'field'
                              ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                              : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                          )}
                        >
                          <Sliders size={13} />
                          <span>Field</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Custom Target Column Combobox */}
                {targetType === 'column' && availableColumns.length > 0 && (
                  <div className="space-y-1.5 relative" ref={colPickerRef}>
                    <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block">
                      Target column
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsColPickerOpen(v => !v)}
                      className={cn(
                        'w-full px-3.5 py-2 rounded-xl border bg-white dark:bg-zinc-950 text-left flex items-center justify-between gap-2 text-xs font-medium text-zinc-900 dark:text-white transition-all cursor-pointer',
                        isColPickerOpen
                          ? 'border-indigo-500 ring-2 ring-indigo-500/20'
                          : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
                      )}
                    >
                      <span className="truncate">
                        {selectedColumn?.label || 'Select column'}
                        {selectedColumn?.group && (
                          <span className="text-zinc-400 font-normal ml-1.5">({selectedColumn.group})</span>
                        )}
                      </span>
                      <ChevronDown
                        size={14}
                        className={cn('text-zinc-400 shrink-0 transition-transform', isColPickerOpen && 'rotate-180')}
                      />
                    </button>

                    {isColPickerOpen && (
                      <div className="absolute left-0 right-0 mt-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl py-1 z-50 max-h-52 overflow-y-auto custom-scrollbar">
                        {availableColumns.map(col => (
                          <button
                            key={col.id}
                            type="button"
                            onClick={() => {
                              setTargetId(col.id);
                              setIsColPickerOpen(false);
                            }}
                            className={cn(
                              'w-full px-3.5 py-2 text-left text-xs font-medium flex items-center justify-between transition-colors cursor-pointer',
                              targetId === col.id
                                ? 'bg-indigo-50/70 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                                : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                            )}
                          >
                            <span className="truncate">
                              {col.label}
                              {col.group && <span className="text-zinc-400 font-normal ml-1.5">({col.group})</span>}
                            </span>
                            {targetId === col.id && <Check size={13} className="shrink-0" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Condition Trigger Card */}
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/40 p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                      <GitBranch size={13} className="text-indigo-500" />
                      <span>When condition matches</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowConditionEditor(true)}
                      className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                    >
                      Edit condition
                    </button>
                  </div>

                  <div
                    onClick={() => setShowConditionEditor(true)}
                    className="px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-indigo-300 dark:hover:border-indigo-500/40 rounded-xl flex items-center justify-between gap-3 cursor-pointer transition-colors"
                  >
                    <span className="text-xs text-zinc-800 dark:text-zinc-200 truncate">
                      {condition.type === 'group' ? (
                        <>
                          Match <strong className="font-semibold">{condition.logicalOperator || 'AND'}</strong> group ({condition.rules?.length || 0} conditions)
                        </>
                      ) : (
                        <>
                          <strong className="font-semibold">{resolveFieldLabel(condition.fieldId)}</strong>{' '}
                          <span className="text-zinc-500">{String(condition.operator || 'equals').replace(/_/g, ' ')}</span>{' '}
                          {condition.value !== undefined && condition.value !== '' && (
                            <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
                              {String(condition.value)}
                            </span>
                          )}
                        </>
                      )}
                    </span>
                    <span className="text-[11px] font-medium text-zinc-400 shrink-0">Configure →</span>
                  </div>
                </div>

                {/* Appearance Section */}
                <div className="space-y-4">
                  {/* Color Presets */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block">
                      Color theme
                    </label>
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
                              'py-2 px-2 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 cursor-pointer',
                              isSel
                                ? 'ring-2 ring-indigo-500/30 border-indigo-500 bg-indigo-50/30 dark:bg-indigo-500/10'
                                : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900'
                            )}
                          >
                            <div className={cn('w-5 h-5 rounded-full border flex items-center justify-center', cfg.cellBadgeClass)}>
                              {isSel && <Check size={11} className={cfg.iconColor} />}
                            </div>
                            <span className="text-[11px] font-medium capitalize text-zinc-700 dark:text-zinc-300">
                              {pKey}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Text Style & Badge Label */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block">
                        Text emphasis
                      </label>
                      <div className="flex bg-zinc-100 dark:bg-zinc-800/80 p-0.5 rounded-xl">
                        <button
                          type="button"
                          onClick={() => setIsBold(!isBold)}
                          className={cn(
                            'flex-1 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer',
                            isBold
                              ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                              : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                          )}
                        >
                          B
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsItalic(!isItalic)}
                          className={cn(
                            'flex-1 py-1.5 rounded-lg italic font-serif text-xs transition-all cursor-pointer',
                            isItalic
                              ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                              : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                          )}
                        >
                          I
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsStrikethrough(!isStrikethrough)}
                          className={cn(
                            'flex-1 py-1.5 rounded-lg line-through text-xs transition-all cursor-pointer',
                            isStrikethrough
                              ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                              : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                          )}
                        >
                          S
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block">
                        Badge pill <span className="text-zinc-400 font-normal">(optional)</span>
                      </label>
                      <input
                        type="text"
                        value={badgeLabel}
                        onChange={(e) => setBadgeLabel(e.target.value)}
                        onKeyDown={(e) => e.stopPropagation()}
                        placeholder="e.g. Overdue, High Priority"
                        className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Status Icon Picker */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                        Status icon <span className="text-zinc-400 font-normal">(optional)</span>
                      </label>
                      {selectedIcon && (
                        <button
                          type="button"
                          onClick={() => setSelectedIcon(undefined)}
                          className="text-[11px] font-medium text-zinc-400 hover:text-rose-500 transition-colors cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {AVAILABLE_ICONS.map((ico) => {
                        const IconComp = ico.icon;
                        const isSel = selectedIcon === ico.name;
                        return (
                          <button
                            key={ico.name}
                            type="button"
                            onClick={() => setSelectedIcon(isSel ? undefined : ico.name)}
                            className={cn(
                              'px-2.5 py-1.5 rounded-lg border transition-colors flex items-center gap-1.5 text-xs font-medium cursor-pointer',
                              isSel
                                ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-300 dark:border-indigo-500/40'
                                : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                            )}
                          >
                            <IconComp size={13} />
                            <span>{ico.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Live Preview */}
                  <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/50 p-3.5 space-y-2">
                    <span className="text-[11px] font-medium text-zinc-500 block">Live preview</span>
                    <div
                      className={cn(
                        'px-3.5 py-2.5 rounded-xl border transition-all flex items-center justify-between',
                        targetType === 'row'
                          ? activePresetConfig.rowClass
                          : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {selectedIcon && (
                          <div className={cn('shrink-0', activePresetConfig.iconColor)}>
                            {React.createElement(
                              AVAILABLE_ICONS.find(i => i.name === selectedIcon)?.icon || AlertTriangle,
                              { size: 15 }
                            )}
                          </div>
                        )}
                        <span
                          className={cn(
                            'text-xs',
                            targetType === 'row' || targetType === 'field'
                              ? activePresetConfig.textClass
                              : 'text-zinc-800 dark:text-zinc-200',
                            isBold && 'font-bold',
                            isItalic && 'italic',
                            isStrikethrough && 'line-through opacity-70'
                          )}
                        >
                          Sample Record Title
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {badgeLabel && (
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded-full text-[10px] font-semibold',
                              activePresetConfig.cellBadgeClass
                            )}
                          >
                            {badgeLabel}
                          </span>
                        )}
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded-full text-[10px] font-medium border',
                            targetType === 'column'
                              ? activePresetConfig.cellBadgeClass
                              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700'
                          )}
                        >
                          {targetType === 'column' ? 'Formatted cell' : 'Standard cell'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-3.5 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50 shrink-0">
                <label className="flex items-center gap-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => setEnabled(e.target.checked)}
                    className="rounded border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Rule active</span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3.5 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check size={14} />
                    <span>Save Rule</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Submodal for Condition Logic Builder */}
      {showConditionEditor && (
        <ConditionModal
          isOpen={showConditionEditor}
          onClose={() => setShowConditionEditor(false)}
          onSave={(newRule) => {
            if (newRule) setCondition(newRule);
            setShowConditionEditor(false);
          }}
          initialRule={condition}
          availableFields={availableFields as any}
          tabs={tabs as any}
          targetLabel={name || 'Conditional Formatting'}
          title="Formatting Trigger Condition"
          hideActionSelector={true}
        />
      )}
    </>,
    document.body
  );
};
