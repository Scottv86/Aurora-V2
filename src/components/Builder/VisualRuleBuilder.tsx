import React, { useMemo } from 'react';
import { Plus, Trash2, Layers, ArrowRightLeft } from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  ValidationConditionNode,
  ValidationOperator
} from '../../lib/validationEngine';

interface VisualRuleBuilderProps {
  conditionTree: ValidationConditionNode;
  onChange: (nextTree: ValidationConditionNode) => void;
  fields: any[];
}

const generateNodeId = () => `cond_${Math.random().toString(36).substring(2, 9)}`;

export const createDefaultConditionRule = (fields: any[] = []): ValidationConditionNode => {
  const firstField = fields.find(f => !['heading', 'divider', 'spacer', 'container', 'section'].includes(f.type));
  return {
    id: generateNodeId(),
    type: 'rule',
    fieldId: firstField?.id || firstField?.name || '',
    operator: 'not_empty',
    valueType: 'literal',
    value: ''
  };
};

export const createDefaultConditionGroup = (fields: any[] = []): ValidationConditionNode => ({
  id: generateNodeId(),
  type: 'group',
  logicalOperator: 'AND',
  rules: [createDefaultConditionRule(fields)]
});

const UNARY_OPERATORS: ValidationOperator[] = ['is_empty', 'not_empty', 'is_true', 'is_false'];

const NUMERIC_TYPES = ['number', 'currency', 'calculation', 'rating', 'progress', 'slider'];
const DATE_TYPES = ['date', 'datetime', 'time'];
const BOOLEAN_TYPES = ['checkbox', 'boolean', 'toggle'];
const SELECT_TYPES = ['select', 'radio', 'buttonGroup'];

const OPERATOR_LABELS: Record<ValidationOperator, string> = {
  equals: 'equals',
  not_equals: 'does not equal',
  contains: 'contains',
  not_contains: 'does not contain',
  starts_with: 'starts with',
  ends_with: 'ends with',
  matches_regex: 'matches pattern (regex)',
  min_length: 'min length >=',
  max_length: 'max length <=',
  greater_than: 'is greater than (>)',
  greater_or_equal: 'is at least (>=)',
  less_than: 'is less than (<)',
  less_or_equal: 'is at most (<=)',
  before: 'is before',
  after: 'is after',
  on_or_before: 'is on or before',
  on_or_after: 'is on or after',
  is_empty: 'is empty',
  not_empty: 'is not empty',
  is_true: 'is checked (true)',
  is_false: 'is unchecked (false)',
  is_one_of: 'is one of',
  is_not_one_of: 'is not one of'
};

const getOperatorsForField = (field?: any): ValidationOperator[] => {
  const type = field?.type || 'text';
  if (NUMERIC_TYPES.includes(type)) {
    return ['equals', 'not_equals', 'greater_than', 'greater_or_equal', 'less_than', 'less_or_equal', 'is_empty', 'not_empty'];
  }
  if (DATE_TYPES.includes(type)) {
    return ['on_or_after', 'after', 'on_or_before', 'before', 'equals', 'not_equals', 'is_empty', 'not_empty'];
  }
  if (BOOLEAN_TYPES.includes(type)) {
    return ['is_true', 'is_false'];
  }
  if (SELECT_TYPES.includes(type)) {
    return ['equals', 'not_equals', 'is_one_of', 'is_not_one_of', 'is_empty', 'not_empty'];
  }
  return [
    'not_empty',
    'is_empty',
    'equals',
    'not_equals',
    'contains',
    'not_contains',
    'starts_with',
    'ends_with',
    'matches_regex',
    'min_length',
    'max_length'
  ];
};

const REGEX_PRESETS = [
  { label: 'Email', pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$' },
  { label: 'URL', pattern: '^https?:\\/\\/.+' },
  { label: 'Digits only', pattern: '^\\d+$' },
  { label: 'Alphanumeric', pattern: '^[a-zA-Z0-9]+$' }
];

export const summarizeConditionTree = (
  node: ValidationConditionNode | undefined,
  fields: any[]
): string => {
  if (!node) return 'No conditions configured';
  if (node.type === 'group') {
    const parts = (node.rules || [])
      .map(r => summarizeConditionTree(r, fields))
      .filter(Boolean);
    if (parts.length === 0) return 'No conditions configured';
    const joiner = node.logicalOperator === 'OR' ? ' OR ' : ' AND ';
    return parts.length > 1 ? `(${parts.join(joiner)})` : parts[0];
  }

  const field = fields.find(f => f.id === node.fieldId || f.name === node.fieldId);
  const fieldLabel = field?.label || field?.name || node.fieldId || 'Field';
  const op = node.operator || 'equals';
  const opLabel = OPERATOR_LABELS[op] || op;

  if (UNARY_OPERATORS.includes(op)) {
    return `${fieldLabel} ${opLabel}`;
  }

  let rhsLabel = String(node.value ?? '""');
  if (node.valueType === 'field') {
    const rhsField = fields.find(f => f.id === node.value || f.name === node.value);
    rhsLabel = rhsField?.label || rhsField?.name || String(node.value || 'Field');
  } else if (node.valueType === 'variable') {
    rhsLabel = node.value === '{{today}}' ? 'Today' : node.value === '{{now}}' ? 'Now' : String(node.value || '');
  }

  return `${fieldLabel} ${opLabel} ${rhsLabel}`;
};

export const VisualRuleBuilder: React.FC<VisualRuleBuilderProps> = ({
  conditionTree,
  onChange,
  fields
}) => {
  const dataFields = useMemo(
    () => fields.filter(f => !['heading', 'divider', 'spacer', 'container', 'section'].includes(f.type)),
    [fields]
  );

  const updateNode = (
    targetId: string,
    updater: (node: ValidationConditionNode) => ValidationConditionNode,
    current: ValidationConditionNode
  ): ValidationConditionNode => {
    if (current.id === targetId) return updater(current);
    if (current.type === 'group' && current.rules) {
      return {
        ...current,
        rules: current.rules.map(r => updateNode(targetId, updater, r))
      };
    }
    return current;
  };

  const removeNode = (targetId: string, current: ValidationConditionNode): ValidationConditionNode => {
    if (current.type === 'group' && current.rules) {
      return {
        ...current,
        rules: current.rules
          .filter(r => r.id !== targetId)
          .map(r => removeNode(targetId, r))
      };
    }
    return current;
  };

  const handleAddRule = (groupId: string) => {
    onChange(
      updateNode(
        groupId,
        g => ({ ...g, rules: [...(g.rules || []), createDefaultConditionRule(dataFields)] }),
        conditionTree
      )
    );
  };

  const handleAddGroup = (groupId: string) => {
    onChange(
      updateNode(
        groupId,
        g => ({ ...g, rules: [...(g.rules || []), createDefaultConditionGroup(dataFields)] }),
        conditionTree
      )
    );
  };

  const renderNode = (node: ValidationConditionNode, depth: number, isRoot: boolean) => {
    if (node.type === 'group') {
      const rules = node.rules || [];
      return (
        <div
          key={node.id}
          className={cn(
            "rounded-xl border p-3 space-y-2.5",
            depth === 0
              ? "bg-zinc-50/70 dark:bg-zinc-950/60 border-zinc-200 dark:border-zinc-800"
              : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 ml-3"
          )}
        >
          {/* Group Header */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                Match
              </span>
              <div className="inline-flex p-0.5 bg-zinc-200/70 dark:bg-zinc-800 rounded-md">
                <button
                  type="button"
                  onClick={() =>
                    onChange(updateNode(node.id, g => ({ ...g, logicalOperator: 'AND' }), conditionTree))
                  }
                  className={cn(
                    "px-2 py-0.5 text-[11px] font-medium rounded transition-colors cursor-pointer",
                    (node.logicalOperator || 'AND') === 'AND'
                      ? "bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                  )}
                >
                  ALL (AND)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onChange(updateNode(node.id, g => ({ ...g, logicalOperator: 'OR' }), conditionTree))
                  }
                  className={cn(
                    "px-2 py-0.5 text-[11px] font-medium rounded transition-colors cursor-pointer",
                    node.logicalOperator === 'OR'
                      ? "bg-white dark:bg-zinc-900 text-amber-600 dark:text-amber-400 shadow-xs"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                  )}
                >
                  ANY (OR)
                </button>
              </div>
              <span className="text-[11px] text-zinc-400">to be valid</span>
            </div>

            {!isRoot && (
              <button
                type="button"
                onClick={() => onChange(removeNode(node.id, conditionTree))}
                className="p-1 text-zinc-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                title="Remove group"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>

          {/* Child Conditions */}
          <div className="space-y-2">
            {rules.map(child => renderNode(child, depth + 1, false))}
            {rules.length === 0 && (
              <p className="text-xs text-zinc-400 py-2 text-center">
                No conditions in this group. Add one below.
              </p>
            )}
          </div>

          {/* Group Actions */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => handleAddRule(node.id)}
              className="h-7 px-2.5 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-950/70 rounded-md flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Plus size={12} />
              <span>Add condition</span>
            </button>
            {depth < 2 && (
              <button
                type="button"
                onClick={() => handleAddGroup(node.id)}
                className="h-7 px-2.5 text-[11px] font-medium text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-md flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Layers size={11} />
                <span>Add group</span>
              </button>
            )}
          </div>
        </div>
      );
    }

    // Leaf Rule Row
    const selectedField = dataFields.find(f => f.id === node.fieldId || f.name === node.fieldId);
    const operators = getOperatorsForField(selectedField);
    const activeOperator = operators.includes(node.operator || 'equals')
      ? (node.operator || 'equals')
      : operators[0];
    const isUnary = UNARY_OPERATORS.includes(activeOperator);
    const valueType = node.valueType || 'literal';

    return (
      <div
        key={node.id}
        className="flex flex-wrap items-center gap-2 p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg"
      >
        {/* Field Select */}
        <select
          value={node.fieldId || ''}
          onChange={(e) => {
            const nextField = dataFields.find(f => f.id === e.target.value || f.name === e.target.value);
            const nextOps = getOperatorsForField(nextField);
            const nextOp = nextOps.includes(activeOperator) ? activeOperator : nextOps[0];
            onChange(
              updateNode(
                node.id,
                r => ({ ...r, fieldId: e.target.value, operator: nextOp }),
                conditionTree
              )
            );
          }}
          className="h-8 min-w-[140px] flex-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md px-2 text-xs font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-indigo-500"
        >
          <option value="" disabled>Select field...</option>
          {dataFields.map(f => (
            <option key={f.id} value={f.id}>
              {f.label || f.name || f.id}
            </option>
          ))}
        </select>

        {/* Operator Select */}
        <select
          value={activeOperator}
          onChange={(e) => {
            const nextOp = e.target.value as ValidationOperator;
            onChange(
              updateNode(
                node.id,
                r => ({ ...r, operator: nextOp }),
                conditionTree
              )
            );
          }}
          className="h-8 min-w-[140px] bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md px-2 text-xs text-zinc-700 dark:text-zinc-200 focus:outline-none focus:border-indigo-500"
        >
          {operators.map(op => (
            <option key={op} value={op}>
              {OPERATOR_LABELS[op]}
            </option>
          ))}
        </select>

        {/* RHS Value / Field / Variable */}
        {!isUnary && (
          <div className="flex items-center gap-1.5 flex-[1.4] min-w-[180px]">
            {/* Mode cycle button: Value <-> Field <-> Variable */}
            <button
              type="button"
              onClick={() => {
                const order: ('literal' | 'field' | 'variable')[] = ['literal', 'field', 'variable'];
                const nextType = order[(order.indexOf(valueType) + 1) % order.length];
                onChange(
                  updateNode(
                    node.id,
                    r => ({
                      ...r,
                      valueType: nextType,
                      value: nextType === 'variable' ? '{{today}}' : ''
                    }),
                    conditionTree
                  )
                );
              }}
              className={cn(
                "h-8 px-2 rounded-md border text-[10px] font-semibold uppercase tracking-wide flex items-center gap-1 shrink-0 transition-colors cursor-pointer",
                valueType === 'field'
                  ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/60"
                  : valueType === 'variable'
                    ? "bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800/60"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700"
              )}
              title="Click to switch between Value, Another Field, or System Variable"
            >
              <ArrowRightLeft size={10} />
              <span>{valueType === 'literal' ? 'Val' : valueType === 'field' ? 'Field' : 'Var'}</span>
            </button>

            {valueType === 'field' ? (
              <select
                value={node.value || ''}
                onChange={(e) =>
                  onChange(updateNode(node.id, r => ({ ...r, value: e.target.value }), conditionTree))
                }
                className="h-8 flex-1 min-w-0 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md px-2 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-indigo-500"
              >
                <option value="">Compare to field...</option>
                {dataFields.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.label || f.name || f.id}
                  </option>
                ))}
              </select>
            ) : valueType === 'variable' ? (
              <select
                value={node.value || '{{today}}'}
                onChange={(e) =>
                  onChange(updateNode(node.id, r => ({ ...r, value: e.target.value }), conditionTree))
                }
                className="h-8 flex-1 min-w-0 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md px-2 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-indigo-500"
              >
                <option value="{{today}}">Today&apos;s Date</option>
                <option value="{{now}}">Current Timestamp</option>
              </select>
            ) : selectedField?.options?.length && !['is_one_of', 'is_not_one_of'].includes(activeOperator) ? (
              <select
                value={node.value ?? ''}
                onChange={(e) =>
                  onChange(updateNode(node.id, r => ({ ...r, value: e.target.value }), conditionTree))
                }
                className="h-8 flex-1 min-w-0 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md px-2 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-indigo-500"
              >
                <option value="">Select option...</option>
                {selectedField.options.map((opt: any) => {
                  const val = typeof opt === 'string' ? opt : opt.value || opt.label;
                  const lbl = typeof opt === 'string' ? opt : opt.label || opt.value;
                  return (
                    <option key={val} value={val}>
                      {lbl}
                    </option>
                  );
                })}
              </select>
            ) : (
              <input
                type={
                  NUMERIC_TYPES.includes(selectedField?.type) || ['min_length', 'max_length'].includes(activeOperator)
                    ? 'number'
                    : DATE_TYPES.includes(selectedField?.type)
                      ? 'date'
                      : 'text'
                }
                value={node.value ?? ''}
                onChange={(e) =>
                  onChange(updateNode(node.id, r => ({ ...r, value: e.target.value }), conditionTree))
                }
                placeholder={
                  activeOperator === 'matches_regex'
                    ? 'Regex pattern...'
                    : ['is_one_of', 'is_not_one_of'].includes(activeOperator)
                      ? 'Comma-separated values...'
                      : 'Enter value...'
                }
                className="h-8 flex-1 min-w-0 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md px-2.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-indigo-500"
              />
            )}
          </div>
        )}

        {/* Delete Condition */}
        <button
          type="button"
          onClick={() => onChange(removeNode(node.id, conditionTree))}
          className="p-1.5 text-zinc-400 hover:text-rose-600 rounded-md transition-colors cursor-pointer shrink-0"
          title="Remove condition"
        >
          <Trash2 size={13} />
        </button>

        {/* Quick Regex Presets when matches_regex is active */}
        {activeOperator === 'matches_regex' && valueType === 'literal' && (
          <div className="w-full flex flex-wrap items-center gap-1.5 pt-1 pl-1">
            <span className="text-[10px] text-zinc-400">Presets:</span>
            {REGEX_PRESETS.map(preset => (
              <button
                key={preset.label}
                type="button"
                onClick={() =>
                  onChange(updateNode(node.id, r => ({ ...r, value: preset.pattern }), conditionTree))
                }
                className="px-1.5 py-0.5 text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-zinc-600 dark:text-zinc-300 hover:text-indigo-600 rounded border border-zinc-200 dark:border-zinc-700 transition-colors cursor-pointer"
              >
                {preset.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-2.5">
      {renderNode(conditionTree, 0, true)}
      <div className="px-3 py-2 bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200/80 dark:border-zinc-800 rounded-lg text-[11px] text-zinc-600 dark:text-zinc-400">
        <span className="font-semibold text-emerald-600 dark:text-emerald-400">Valid when: </span>
        <span>{summarizeConditionTree(conditionTree, dataFields)}</span>
      </div>
    </div>
  );
};
