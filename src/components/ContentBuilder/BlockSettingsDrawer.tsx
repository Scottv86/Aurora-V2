import React, { useState } from 'react';
import { 
  X, 
  Sliders, 
  Type, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  AlignJustify,
  Palette, 
  Maximize, 
  Zap,
  Plus,
  Trash2,
  Sparkles,
  Layers,
  HelpCircle,
  CheckCircle2
} from 'lucide-react';
import { 
  ContentBlock, 
  ContentBlockCondition, 
  ContentBlockRule, 
  ConditionOperator 
} from '../../types/platform';
import { FONT_FAMILIES } from './contentCompiler';
import { cn } from '../../lib/utils';

interface BlockSettingsDrawerProps {
  block: ContentBlock | null;
  onClose: () => void;
  onUpdateStyles: (newStyles: Record<string, any>) => void;
  onUpdateConditions?: (newConditions: ContentBlockCondition) => void;
}

const COMMON_FIELDS = [
  { key: 'account.tier', label: 'Account Tier (e.g. Enterprise, Growth)' },
  { key: 'account.status', label: 'Account Status (Active, Suspended)' },
  { key: 'deal.amount', label: 'Deal / Opportunity Amount' },
  { key: 'deal.stage', label: 'Deal Stage (e.g. Closed Won)' },
  { key: 'contact.role', label: 'Contact Role / Title' },
  { key: 'invoice.status', label: 'Invoice Status (Paid, Overdue)' },
  { key: 'recipient_organization', label: 'Recipient Organization' },
  { key: 'status', label: 'General Record Status' }
];

const OPERATORS: { value: ConditionOperator; label: string; symbol: string }[] = [
  { value: 'equals', label: 'Equals (==)', symbol: '==' },
  { value: 'not_equals', label: 'Does Not Equal (!=)', symbol: '!=' },
  { value: 'contains', label: 'Contains text', symbol: 'contains' },
  { value: 'not_contains', label: 'Does not contain', symbol: '!contains' },
  { value: 'greater_than', label: 'Greater Than (>)', symbol: '>' },
  { value: 'less_than', label: 'Less Than (<)', symbol: '<' },
  { value: 'is_empty', label: 'Is Empty / Blank', symbol: 'is empty' },
  { value: 'is_not_empty', label: 'Is Not Empty', symbol: 'is not empty' }
];

export const BlockSettingsDrawer: React.FC<BlockSettingsDrawerProps> = ({
  block,
  onClose,
  onUpdateStyles,
  onUpdateConditions
}) => {
  const [activeTab, setActiveTab] = useState<'styles' | 'conditions'>('styles');

  if (!block) return null;

  const styles = block.styles || {};
  const conditions: ContentBlockCondition = block.conditions || {
    enabled: false,
    conjunction: 'AND',
    rules: []
  };

  const isConditionActive = conditions.enabled && (
    (conditions.rules && conditions.rules.length > 0) || !!conditions.field
  );

  const handleToggleConditions = (enabled: boolean) => {
    if (!onUpdateConditions) return;
    const existingRules = conditions.rules || [];
    if (enabled && existingRules.length === 0 && !conditions.field) {
      onUpdateConditions({
        enabled: true,
        conjunction: 'AND',
        rules: [
          {
            id: `rule_${Date.now()}`,
            field: 'account.tier',
            operator: 'equals',
            value: 'Enterprise'
          }
        ]
      });
    } else {
      onUpdateConditions({
        ...conditions,
        enabled
      });
    }
  };

  const handleSetConjunction = (conjunction: 'AND' | 'OR') => {
    if (!onUpdateConditions) return;
    onUpdateConditions({
      ...conditions,
      conjunction
    });
  };

  const handleAddRule = () => {
    if (!onUpdateConditions) return;
    const newRule: ContentBlockRule = {
      id: `rule_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      field: 'deal.amount',
      operator: 'greater_than',
      value: '10000'
    };
    const updatedRules = [...(conditions.rules || []), newRule];
    onUpdateConditions({
      ...conditions,
      enabled: true,
      rules: updatedRules
    });
  };

  const handleUpdateRule = (ruleId: string, updates: Partial<ContentBlockRule>) => {
    if (!onUpdateConditions) return;
    const updatedRules = (conditions.rules || []).map(r => 
      r.id === ruleId ? { ...r, ...updates } : r
    );
    onUpdateConditions({
      ...conditions,
      rules: updatedRules
    });
  };

  const handleRemoveRule = (ruleId: string) => {
    if (!onUpdateConditions) return;
    const updatedRules = (conditions.rules || []).filter(r => r.id !== ruleId);
    onUpdateConditions({
      ...conditions,
      rules: updatedRules,
      enabled: updatedRules.length > 0
    });
  };

  const handleApplyPreset = (field: string, operator: ConditionOperator, value: string) => {
    if (!onUpdateConditions) return;
    const newRule: ContentBlockRule = {
      id: `rule_${Date.now()}`,
      field,
      operator,
      value
    };
    onUpdateConditions({
      ...conditions,
      enabled: true,
      rules: [...(conditions.rules || []), newRule]
    });
  };

  return (
    <div className="w-84 border-l border-zinc-800 bg-zinc-950 overflow-y-auto p-5 space-y-5 shrink-0 z-30 animate-in slide-in-from-right-10 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Sliders size={14} />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white tracking-tight">Block Settings</h3>
            <span className="text-[10px] text-zinc-500 font-mono uppercase">{block.type.replace('_', ' ')}</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
        >
          <X size={14} />
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="grid grid-cols-2 p-1 bg-zinc-900 rounded-xl border border-zinc-800 text-xs">
        <button
          onClick={() => setActiveTab('styles')}
          className={cn(
            "py-1.5 px-3 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer",
            activeTab === 'styles'
              ? "bg-zinc-800 text-white shadow-sm"
              : "text-zinc-400 hover:text-zinc-200"
          )}
        >
          <Type size={12} className="text-indigo-400" />
          <span>Style & Font</span>
        </button>
        <button
          onClick={() => setActiveTab('conditions')}
          className={cn(
            "py-1.5 px-3 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer relative",
            activeTab === 'conditions'
              ? "bg-zinc-800 text-white shadow-sm"
              : "text-zinc-400 hover:text-zinc-200"
          )}
        >
          <Zap size={12} className={cn(isConditionActive ? "text-amber-400" : "text-zinc-400")} />
          <span>Rules</span>
          {isConditionActive && (
            <span className="w-2 h-2 rounded-full bg-amber-500 absolute top-1.5 right-1.5 ring-2 ring-zinc-900" />
          )}
        </button>
      </div>

      {/* TAB 1: STYLE & TYPOGRAPHY */}
      {activeTab === 'styles' && (
        <div className="space-y-5">
          {/* Typography Controls */}
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block flex items-center gap-1.5">
              <Type size={12} className="text-indigo-400" />
              <span>Typography & Font</span>
            </label>

            {/* Font Family */}
            <div>
              <span className="text-[10px] text-zinc-500 font-semibold block mb-1">Font Family</span>
              <select
                value={styles.fontFamily || ''}
                onChange={(e) => onUpdateStyles({ fontFamily: e.target.value || undefined })}
                className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs rounded-xl p-2 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="">Inherit Global Document Font</option>
                {FONT_FAMILIES.map(f => (
                  <option key={f.id} value={f.id}>{f.label}</option>
                ))}
              </select>
            </div>

            {/* Font Sizing & Weight */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-zinc-500 font-semibold block mb-1">Font Size</span>
                <select
                  value={styles.fontSize || '14px'}
                  onChange={(e) => onUpdateStyles({ fontSize: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs rounded-xl p-2 focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  {['11px', '12px', '13px', '14px', '16px', '18px', '20px', '24px', '28px', '32px'].map(sz => (
                    <option key={sz} value={sz}>{sz}</option>
                  ))}
                </select>
              </div>

              <div>
                <span className="text-[10px] text-zinc-500 font-semibold block mb-1">Weight</span>
                <select
                  value={styles.fontWeight || '400'}
                  onChange={(e) => onUpdateStyles({ fontWeight: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs rounded-xl p-2 focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="400">Regular (400)</option>
                  <option value="500">Medium (500)</option>
                  <option value="600">Semibold (600)</option>
                  <option value="700">Bold (700)</option>
                  <option value="800">Black (800)</option>
                </select>
              </div>
            </div>

            {/* Alignment */}
            <div>
              <span className="text-[10px] text-zinc-500 font-semibold block mb-1">Alignment</span>
              <div className="grid grid-cols-4 gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
                {[
                  { id: 'left', icon: AlignLeft },
                  { id: 'center', icon: AlignCenter },
                  { id: 'right', icon: AlignRight },
                  { id: 'justify', icon: AlignJustify }
                ].map(a => {
                  const Icon = a.icon;
                  const isActive = (styles.align || 'left') === a.id;
                  return (
                    <button
                      key={a.id}
                      onClick={() => onUpdateStyles({ align: a.id })}
                      className={cn(
                        "p-1.5 rounded-lg flex items-center justify-center transition-colors cursor-pointer",
                        isActive ? "bg-indigo-600 text-white" : "text-zinc-400 hover:text-zinc-200"
                      )}
                    >
                      <Icon size={14} />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Color & Visual Styling */}
          <div className="space-y-3 pt-3 border-t border-zinc-800">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block flex items-center gap-1.5">
              <Palette size={12} className="text-indigo-400" />
              <span>Colors & Background</span>
            </label>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-zinc-500 font-semibold block mb-1">Text Color</span>
                <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 p-1.5 rounded-xl">
                  <input
                    type="color"
                    value={styles.textColor || '#18181b'}
                    onChange={(e) => onUpdateStyles({ textColor: e.target.value })}
                    className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                  />
                  <span className="text-[11px] font-mono text-zinc-300 truncate">
                    {styles.textColor || '#18181b'}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[10px] text-zinc-500 font-semibold block mb-1">Background</span>
                <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 p-1.5 rounded-xl">
                  <input
                    type="color"
                    value={styles.bgColor || '#ffffff'}
                    onChange={(e) => onUpdateStyles({ bgColor: e.target.value })}
                    className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                  />
                  <span className="text-[11px] font-mono text-zinc-300 truncate">
                    {styles.bgColor || 'None'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Spacing & Borders */}
          <div className="space-y-3 pt-3 border-t border-zinc-800">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block flex items-center gap-1.5">
              <Maximize size={12} className="text-indigo-400" />
              <span>Spacing & Borders</span>
            </label>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-zinc-500 font-semibold block mb-1">Padding</span>
                <select
                  value={styles.padding || 'default'}
                  onChange={(e) => onUpdateStyles({ padding: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs rounded-xl p-2 focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="default">Default</option>
                  <option value="0px">None (0px)</option>
                  <option value="8px">Compact (8px)</option>
                  <option value="16px">Normal (16px)</option>
                  <option value="24px">Spacious (24px)</option>
                  <option value="36px">Hero (36px)</option>
                </select>
              </div>

              <div>
                <span className="text-[10px] text-zinc-500 font-semibold block mb-1">Border Radius</span>
                <select
                  value={styles.borderRadius || 'default'}
                  onChange={(e) => onUpdateStyles({ borderRadius: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs rounded-xl p-2 focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="default">Default</option>
                  <option value="0px">Sharp (0px)</option>
                  <option value="8px">Small (8px)</option>
                  <option value="12px">Medium (12px)</option>
                  <option value="16px">Large (16px)</option>
                  <option value="9999px">Pill / Full</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CONDITIONAL DISPLAY RULES */}
      {activeTab === 'conditions' && (
        <div className="space-y-4">
          {/* Master Enable Switch */}
          <div className="p-3 bg-zinc-900/80 rounded-xl border border-zinc-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap size={14} className={cn(conditions.enabled ? "text-amber-400" : "text-zinc-500")} />
                <span className="text-xs font-bold text-white">Enable Condition Rules</span>
              </div>
              <input
                type="checkbox"
                checked={conditions.enabled || false}
                onChange={(e) => handleToggleConditions(e.target.checked)}
                className="w-4 h-4 rounded border-zinc-700 bg-zinc-950 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
            </div>
            <p className="text-[10px] text-zinc-400 leading-relaxed">
              Show or hide this block based on dynamic record fields or CRM criteria during document generation.
            </p>
          </div>

          {conditions.enabled && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Conjunction Selector (if multiple rules) */}
              {(conditions.rules || []).length > 1 && (
                <div className="flex items-center justify-between bg-zinc-900/60 p-2 rounded-xl border border-zinc-800">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Match Logic:</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleSetConjunction('AND')}
                      className={cn(
                        "px-2.5 py-1 text-[10px] font-bold rounded-lg transition-colors cursor-pointer",
                        conditions.conjunction !== 'OR' 
                          ? "bg-indigo-600 text-white shadow-sm" 
                          : "bg-zinc-800 text-zinc-400 hover:text-white"
                      )}
                    >
                      ALL Rules (AND)
                    </button>
                    <button
                      onClick={() => handleSetConjunction('OR')}
                      className={cn(
                        "px-2.5 py-1 text-[10px] font-bold rounded-lg transition-colors cursor-pointer",
                        conditions.conjunction === 'OR' 
                          ? "bg-indigo-600 text-white shadow-sm" 
                          : "bg-zinc-800 text-zinc-400 hover:text-white"
                      )}
                    >
                      ANY Rule (OR)
                    </button>
                  </div>
                </div>
              )}

              {/* Rules List */}
              <div className="space-y-2.5">
                {(conditions.rules || []).map((rule, idx) => (
                  <div key={rule.id} className="p-3 bg-zinc-900 rounded-xl border border-zinc-800 space-y-2 relative group">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase">
                        Rule #{idx + 1}
                      </span>
                      <button
                        onClick={() => handleRemoveRule(rule.id)}
                        className="p-1 text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 rounded transition-colors cursor-pointer"
                        title="Remove Rule"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>

                    {/* Field Key */}
                    <div>
                      <span className="text-[10px] text-zinc-500 font-semibold block mb-0.5">Field / Variable Key</span>
                      <input
                        type="text"
                        value={rule.field}
                        onChange={(e) => handleUpdateRule(rule.id, { field: e.target.value })}
                        placeholder="e.g. account.tier or deal.amount"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-zinc-200 font-mono focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    {/* Operator */}
                    <div>
                      <span className="text-[10px] text-zinc-500 font-semibold block mb-0.5">Operator</span>
                      <select
                        value={rule.operator}
                        onChange={(e) => handleUpdateRule(rule.id, { operator: e.target.value as ConditionOperator })}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
                      >
                        {OPERATORS.map(op => (
                          <option key={op.value} value={op.value}>
                            {op.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Target Value (unless is_empty / is_not_empty) */}
                    {rule.operator !== 'is_empty' && rule.operator !== 'is_not_empty' && (
                      <div>
                        <span className="text-[10px] text-zinc-500 font-semibold block mb-0.5">Target Match Value</span>
                        <input
                          type="text"
                          value={rule.value}
                          onChange={(e) => handleUpdateRule(rule.id, { value: e.target.value })}
                          placeholder="e.g. Enterprise or 10000"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-zinc-200 font-mono focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Add Rule Button */}
              <button
                onClick={handleAddRule}
                className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 border border-dashed border-zinc-700 hover:border-indigo-500 text-zinc-300 hover:text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus size={13} className="text-indigo-400" />
                <span>Add Additional Rule</span>
              </button>

              {/* Quick Presets */}
              <div className="pt-2">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">
                  Quick Presets
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => handleApplyPreset('account.tier', 'equals', 'Enterprise')}
                    className="px-2 py-1 bg-zinc-900 border border-zinc-800 hover:border-indigo-500/50 rounded-lg text-[10px] text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                  >
                    Tier == Enterprise
                  </button>
                  <button
                    onClick={() => handleApplyPreset('deal.amount', 'greater_than', '10000')}
                    className="px-2 py-1 bg-zinc-900 border border-zinc-800 hover:border-indigo-500/50 rounded-lg text-[10px] text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                  >
                    Amount &gt; $10k
                  </button>
                  <button
                    onClick={() => handleApplyPreset('status', 'equals', 'Active')}
                    className="px-2 py-1 bg-zinc-900 border border-zinc-800 hover:border-indigo-500/50 rounded-lg text-[10px] text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                  >
                    Status == Active
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Done Button */}
      <div className="pt-2 border-t border-zinc-800">
        <button
          onClick={onClose}
          className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-indigo-600/30 cursor-pointer"
        >
          Done
        </button>
      </div>
    </div>
  );
};
