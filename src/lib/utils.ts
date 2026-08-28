import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { createFormulaContext } from './formulaEngine';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(text: string): string {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')          // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-');        // Replace multiple - with single -
}

export function stripUndefined(obj: any) {
  if (!obj || typeof obj !== 'object') return obj || {};
  const newObj: any = {};
  Object.getOwnPropertyNames(obj).forEach(key => {
    if (obj[key] !== undefined) {
      newObj[key] = obj[key];
    }
  });
  return newObj ?? {};
}

/**
 * Resolves a field value from a data object, searching both root level
 * and inside any nested objects (like groups).
 */
export function getFieldValue(data: any, fieldId: string, fieldName?: string): any {
  if (!data || !fieldId) return undefined;
  
  // 1. Try root level first
  if (data[fieldId] !== undefined) return data[fieldId];
  if (fieldName && data[fieldName] !== undefined) return data[fieldName];
  
  // 2. Search inside nested objects (groups)
  for (const key in data) {
    if (data[key] && typeof data[key] === 'object' && !Array.isArray(data[key])) {
      const nestedVal = getFieldValue(data[key], fieldId, fieldName);
      if (nestedVal !== undefined) {
        return nestedVal;
      }
    }
  }
  
  return undefined;
}

export const isFieldVisible = (field: any, data: any, context?: any) => {
  if (field.hidden) return false;
  const rule = field.visibilityRule || field.visibility;
  
  if (!rule) return true;
  return checkCondition(rule, data, context);
};

const resolveVariable = (token: string, context?: any): any => {
  if (!token) return '';
  const cleanToken = token.trim().replace(/[{}]/g, '').trim();
  
  if (cleanToken === 'currentUser.id') {
    const user = context?.user;
    if (!user) return '';
    
    // 1. Check known properties
    const knownId = user.recordId || user.userRecordId || user.platformId || user.cid || user.id;
    if (knownId && String(knownId).startsWith('cmn')) return String(knownId);
    
    // 2. Brute force scan for anything that looks like an Aurora CUID (starts with 'cmn')
    for (const key in user) {
      if (typeof user[key] === 'string' && user[key].startsWith('cmn')) {
        return user[key];
      }
    }
    
    const ids = [user.id, user.memberId, user.userRecordId, user.cuid].filter(Boolean);
    
    // Safety Net: Scan all string properties for CUIDs (cmn...)
    Object.entries(user).forEach(([_, val]) => {
      if (typeof val === 'string' && val.startsWith('cmn') && !ids.includes(val)) {
        ids.push(val);
      }
    });
    
    const finalId = ids[0] || user.email || user.name || '';
    
    return ids.length > 1 ? ids : finalId;
  }
  if (cleanToken === 'currentUser.role') return context?.user?.role || context?.user?.roleId || '';
  if (cleanToken === 'currentUser.teamName') {
    const user = context?.user;
    return user?.team?.name || user?.tenantMember?.team?.name || '';
  }
  if (cleanToken === 'currentUser.teamId') {
    const user = context?.user;
    return user?.teamId || user?.team_id || user?.team?.id || '';
  }
  if (cleanToken === 'currentUser.team') {
    const user = context?.user;
    const ids = [
      user?.teamId, user?.team_id,
      user?.team?.id, user?.team?.recordId,
      user?.team,
      user?.membership?.teamId, user?.membership?.team_id,
      user?.tenantMember?.teamId, user?.tenantMember?.team_id
    ].filter(v => v && typeof v !== 'object').map(v => String(v));
    return Array.from(new Set(ids));
  }
  if (cleanToken === 'currentUser.position') {
    const user = context?.user;
    const ids = [
      user?.positionId, user?.position_id,
      user?.position?.id, user?.position?.recordId,
      user?.position,
      user?.membership?.positionId, user?.membership?.position_id,
      user?.tenantMember?.positionId, user?.tenantMember?.position_id
    ].filter(v => v && typeof v !== 'object').map(v => String(v));
    return Array.from(new Set(ids));
  }
  if (cleanToken === 'currentUser.email') return context?.user?.email || '';
  if (cleanToken === 'currentUser.name') return context?.user?.name || '';
  if (cleanToken === 'today') return new Date().toISOString().split('T')[0];
  if (cleanToken === 'now') return new Date().toISOString();
  return cleanToken;
};

export const checkCondition = (condition: any, data: any, context?: any): boolean => {
  if (!condition) return true;

  const action = condition.action || 'show';
  let isMet = false;

  // Handle nested group
  if (condition.type === 'group') {
    const { logicalOperator, rules } = condition;
    if (!rules || rules.length === 0) {
      isMet = true;
    } else if (logicalOperator === 'AND') {
      isMet = rules.every((r: any) => checkCondition(r, data, context));
    } else {
      isMet = rules.some((r: any) => checkCondition(r, data, context));
    }
  } else {
    // Handle single rule (new or old format)
    const { fieldId, fieldType = 'field', operator, value, valueType = 'literal' } = condition;
    if (!fieldId) {
      isMet = true;
    } else {
      // 1. Resolve Target (Left Side)
      let actualValue: any;
      if (fieldType === 'variable') {
        actualValue = resolveVariable(fieldId, context);
      } else {
        const actualFieldId = fieldId === '_record_key' ? (data?.key ? 'key' : 'id') : fieldId;
        actualValue = getFieldValue(data, actualFieldId);
      }

      // 2. Resolve Comparison (Right Side)
      let compareValue = value;
      if (valueType === 'field' && value) {
        const compareFieldId = value === '_record_key' ? (data?.key ? 'key' : 'id') : value;
        compareValue = getFieldValue(data, compareFieldId);
      } else if (valueType === 'variable' && value) {
        compareValue = resolveVariable(value, context);
      }
      
      const isEmpty = (val: any) => val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0);
      
      // Robust value normalization
      const normalize = (val: any): string[] => {
        if (val === undefined || val === null) return [];
        if (Array.isArray(val)) return val.map(v => normalize(v)).flat();
        if (typeof val === 'object') {
          return [
            val.id, val.recordId, val.teamId, val.team_id, val.positionId, val.position_id, 
            val.key, val.value, val.name, val.email
          ].filter(Boolean).map(v => String(v).toLowerCase());
        }
        return [String(val).toLowerCase()];
      };

      const actuals = normalize(actualValue);
      const compares = normalize(compareValue);

      switch (operator) {
        case 'equals':
        case 'eq':
          isMet = actuals.length > 0 && compares.length > 0 && actuals.some(a => compares.includes(a));
          // Direct string fallback for simple primitives
          if (!isMet && typeof actualValue !== 'object' && typeof compareValue !== 'object') {
             isMet = String(actualValue).toLowerCase() === String(compareValue).toLowerCase();
          }
          // If both are empty, they are equal
          if (!isMet && isEmpty(actualValue) && isEmpty(compareValue)) {
            isMet = true;
          }
          break;
        case 'not_equals':
        case 'neq':
          isMet = !actuals.some(a => compares.includes(a));
          // If both are empty, they are equal (not unequal)
          if (isEmpty(actualValue) && isEmpty(compareValue)) {
            isMet = false;
          }
          break;
        case 'contains':
          isMet = actuals.some(a => compares.some(c => a.includes(c)));
          break;
        case 'greater_than':
        case 'gt':
          isMet = Number(actualValue) > Number(compareValue); break;
        case 'less_than':
        case 'lt':
          isMet = Number(actualValue) < Number(compareValue); break;
        case 'is_empty':
          isMet = isEmpty(actualValue); break;
        case 'not_empty':
          isMet = !isEmpty(actualValue); break;
        default:
          isMet = true;
      }
    }
  }

  return action === 'hide' ? !isMet : isMet;
};

/**
 * Basic formula evaluator for calculation fields
 * Supported format: {fieldId} + {fieldId} * 10
 */
export const evaluateFormula = (formula: string, data: any): string | number => {
  if (!formula) return '';
  
  try {
    // Replace {fieldId} with actual values from data
    const expression = formula.replace(/\{(\w+)\}/g, (_, fieldId) => {
      const val = data?.[fieldId];
      return val !== undefined ? (isNaN(Number(val)) ? `"${val}"` : val) : '0';
    });
    
    // Use centralized formula engine
    const context = createFormulaContext();
    const func = new Function(...Object.keys(context), `return ${expression}`);
    const result = func(...Object.values(context));
    
    if (typeof result === 'number') {
      return Number.isInteger(result) ? result : Number(result.toFixed(2));
    }
    return result ?? '';
  } catch (err) {
    console.error("Formula Eval Error:", err);
    return '#ERROR!';
  }
};

export const evaluateExpression = (expr: string, data: any, context?: any): any => {
  if (!expr) return '';
  try {
    // 1. First interpolate variables like {currentUser.email}, {today}, {now}
    let interpolated = expr;
    
    // Replace {currentUser.xxx} or other custom context variables
    interpolated = interpolated.replace(/\{currentUser\.(id|role|team|position|email|name)\}/g, (match) => {
      const val = resolveVariable(match.slice(1, -1), context);
      return typeof val === 'string' ? `"${val}"` : JSON.stringify(val);
    });

    // Replace standard layout field references {fieldId}
    interpolated = interpolated.replace(/\{(\w+)\}/g, (_, fieldId) => {
      const val = getFieldValue(data, fieldId);
      if (val === undefined || val === null) return '""';
      if (typeof val === 'number' || typeof val === 'boolean') return String(val);
      return `"${String(val).replace(/"/g, '\\"')}"`;
    });

    // 2. Evaluate using the centralized formula engine context
    const formulaContext = createFormulaContext();
    const func = new Function(...Object.keys(formulaContext), `return ${interpolated}`);
    const result = func(...Object.values(formulaContext));
    
    if (typeof result === 'number') {
      return Number.isInteger(result) ? result : Number(result.toFixed(2));
    }
    return result ?? '';
  } catch (err) {
    console.error("Expression Evaluation Error:", err);
    return expr; // Fallback to raw string if evaluation fails
  }
};

export const flattenFields = (fields: any[], parentTabId?: string): any[] => {
  const result: any[] = [];
  if (!fields) return result;
  fields.forEach(f => {
    // Ensure field has the tabId of its parent if it doesn't have one
    const currentField = { ...f, tabId: f.tabId || parentTabId };
    result.push(currentField);
    if (f.fields && f.fields.length > 0) {
      result.push(...flattenFields(f.fields, currentField.tabId));
    }
  });
  return result;
};

export const generateDefaultLayout = (fields: any[]): any[] => {
  let rowIndex = 0;
  let isLeft = true;
  
  return fields.map((f) => {
    const layoutField = {
      ...f,
      id: f.id || `f_${Math.random().toString(36).substr(2, 6)}`,
      label: f.label || f.name,
      colSpan: 6,
      startCol: isLeft ? 1 : 7,
      rowIndex: rowIndex
    };
    
    if (!isLeft) rowIndex++;
    isLeft = !isLeft;
    
    return layoutField;
  });
};


export const isContainerField = (type: string): boolean => {
  return ['group', 'fieldGroup', 'repeatableGroup', 'card', 'accordion', 'tabs_nested', 'stepper', 'timeline'].includes(type);
};

export const calculateHeight = (field: any, placeholder?: { index: number, span?: number, rowSpan?: number } | null): number => {
  if (!field) return 2;
  
  const type = field.type;
  
  if (type === 'placeholder') return field.rowSpan || 2;
  if (type === 'sub_module') return Math.max(4, field.rowSpan || 4);
  if (type === 'textarea' || type === 'rich_text') return Math.max(2, field.rowSpan || 3);
  
  if (isContainerField(type)) {
    // If collapsed, return 2 units to match standard field height
    if (field.isCollapsed) return 2;
    
    const fields = field.fields || [];
    if (fields.length === 0 && !placeholder) return 3;
    
    const rowHeight = 50;
    const gap = 20;
    const gridToPx = (units: number) => units * rowHeight + Math.max(0, units - 1) * gap;
    const pxToGrid = (px: number) => Math.max(2, Math.ceil((px + gap) / (rowHeight + gap)));

    if (type === 'accordion') {
      if (fields.length === 0 && !placeholder) return 3;
      
      // Outer accordion header (64px) + card padding (32px) + top margin (12px) = 108px
      let neededPx = 108;
      
      fields.forEach((section: any, idx: number) => {
        if (idx > 0) neededPx += 16; // gap-4 between sections
        
        if (section.isCollapsed) {
          neededPx += 60; // collapsed section header
        } else {
          const sFields = section.fields || [];
          if (sFields.length === 0) {
            neededPx += 75 + 24 + 70; // section header (75px) + padding (24px) + empty drop zone (70px) = 169px
          } else {
            const childBottoms = sFields.map((f: any) => {
              const h = calculateHeight(f);
              const r = typeof f.rowIndex === 'number' ? f.rowIndex : 0;
              return r + h;
            });
            const maxBottom = Math.max(1, ...childBottoms);
            const innerGridPx = gridToPx(maxBottom);
            neededPx += 75 + 24 + innerGridPx; // header + padding + inner fields grid
          }
        }
      });

      if (fields.length > 0) {
        neededPx += 48; // Add Subsection button (32px) + gap (16px)
      }

      if (placeholder) {
        neededPx += gridToPx(placeholder.rowSpan || 2) + 16;
      }

      return pxToGrid(neededPx);
    }

    const childHeights = fields.map((f: any) => {
      const h = calculateHeight(f);
      const r = typeof f.rowIndex === 'number' ? f.rowIndex : 0;
      return r + h;
    });

    if (placeholder) {
      const pHeight = placeholder.rowSpan || 2;
      childHeights.push(placeholder.index + pHeight);
    }
    
    const maxChildBottom = Math.max(0, ...childHeights);
    const innerGridPx = gridToPx(maxChildBottom);
    const totalGroupPx = 120 + innerGridPx;
    
    return pxToGrid(totalGroupPx);
  }
  
  return 2;
};

// --- Conditional Formatting Utilities ---

export const PRESET_FORMATTING_MAP: Record<string, {
  name: string;
  rowClass: string;
  cellBadgeClass: string;
  borderClass: string;
  textClass: string;
  accentBg: string;
  iconColor: string;
}> = {
  danger: {
    name: 'Critical / Danger',
    rowClass: 'bg-rose-500/5 hover:bg-rose-500/10 border-l-4 border-l-rose-500 dark:bg-rose-950/20 dark:hover:bg-rose-950/30',
    cellBadgeClass: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/30 shadow-sm',
    borderClass: 'border-rose-500 ring-2 ring-rose-500/20',
    textClass: 'text-rose-600 dark:text-rose-400 font-semibold',
    accentBg: 'bg-rose-500/10',
    iconColor: 'text-rose-500'
  },
  warning: {
    name: 'Warning / Attention',
    rowClass: 'bg-amber-500/5 hover:bg-amber-500/10 border-l-4 border-l-amber-500 dark:bg-amber-950/20 dark:hover:bg-amber-950/30',
    cellBadgeClass: 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/30 shadow-sm',
    borderClass: 'border-amber-500 ring-2 ring-amber-500/20',
    textClass: 'text-amber-700 dark:text-amber-400 font-semibold',
    accentBg: 'bg-amber-500/10',
    iconColor: 'text-amber-500'
  },
  success: {
    name: 'Success / Completed',
    rowClass: 'bg-emerald-500/5 hover:bg-emerald-500/10 border-l-4 border-l-emerald-500 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/30',
    cellBadgeClass: 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 shadow-sm',
    borderClass: 'border-emerald-500 ring-2 ring-emerald-500/20',
    textClass: 'text-emerald-700 dark:text-emerald-400 font-semibold',
    accentBg: 'bg-emerald-500/10',
    iconColor: 'text-emerald-500'
  },
  info: {
    name: 'Info / Primary',
    rowClass: 'bg-indigo-500/5 hover:bg-indigo-500/10 border-l-4 border-l-indigo-500 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/30',
    cellBadgeClass: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 shadow-sm',
    borderClass: 'border-indigo-500 ring-2 ring-indigo-500/20',
    textClass: 'text-indigo-600 dark:text-indigo-400 font-semibold',
    accentBg: 'bg-indigo-500/10',
    iconColor: 'text-indigo-500'
  },
  purple: {
    name: 'Special / Violet',
    rowClass: 'bg-purple-500/5 hover:bg-purple-500/10 border-l-4 border-l-purple-500 dark:bg-purple-950/20 dark:hover:bg-purple-950/30',
    cellBadgeClass: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/30 shadow-sm',
    borderClass: 'border-purple-500 ring-2 ring-purple-500/20',
    textClass: 'text-purple-600 dark:text-purple-400 font-semibold',
    accentBg: 'bg-purple-500/10',
    iconColor: 'text-purple-500'
  },
  slate: {
    name: 'Neutral / Slate',
    rowClass: 'bg-zinc-500/5 hover:bg-zinc-500/10 border-l-4 border-l-zinc-400 dark:bg-zinc-800/30 dark:hover:bg-zinc-800/50',
    cellBadgeClass: 'bg-zinc-200/60 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700 shadow-sm',
    borderClass: 'border-zinc-400 dark:border-zinc-600 ring-2 ring-zinc-400/20',
    textClass: 'text-zinc-600 dark:text-zinc-400 font-medium',
    accentBg: 'bg-zinc-500/10',
    iconColor: 'text-zinc-500'
  }
};

export interface FormattedResult {
  hasMatch: boolean;
  matchedRules: any[];
  rowClassName: string;
  cellBadgeClassName: string;
  borderClassName: string;
  textClassName: string;
  customStyle: React.CSSProperties;
  badgeLabel?: string;
  iconName?: string;
  iconColor?: string;
}

export const evaluateFormattingRules = (
  rules: any[] | undefined,
  data: any,
  context?: any,
  filterTarget?: { targetType?: 'row' | 'column' | 'field'; targetId?: string }
): FormattedResult => {
  const defaultResult: FormattedResult = {
    hasMatch: false,
    matchedRules: [],
    rowClassName: '',
    cellBadgeClassName: '',
    borderClassName: '',
    textClassName: '',
    customStyle: {},
    badgeLabel: undefined,
    iconName: undefined,
    iconColor: undefined
  };

  if (!Array.isArray(rules) || rules.length === 0 || !data) {
    return defaultResult;
  }

  const activeRules = rules.filter(r => {
    if (r.enabled === false) return false;
    if (filterTarget?.targetType && r.targetType && r.targetType !== filterTarget.targetType) {
      return false;
    }
    if (filterTarget?.targetId && r.targetId && r.targetId !== filterTarget.targetId) {
      return false;
    }
    return true;
  });

  if (activeRules.length === 0) return defaultResult;

  const matchedRules: any[] = [];

  for (const rule of activeRules) {
    const isMet = checkCondition(rule.condition, data, context);
    if (isMet) {
      matchedRules.push(rule);
    }
  }

  if (matchedRules.length === 0) return defaultResult;

  // Aggregate styles from matched rules (last rule takes precedence for specific overrides)
  let rowClasses: string[] = [];
  let cellBadgeClasses: string[] = [];
  let borderClasses: string[] = [];
  let textClasses: string[] = [];
  let customStyle: React.CSSProperties = {};
  let badgeLabel: string | undefined = undefined;
  let iconName: string | undefined = undefined;
  let iconColor: string | undefined = undefined;

  for (const rule of matchedRules) {
    const style = rule.style || {};
    const presetKey = style.preset || 'danger';
    const preset = PRESET_FORMATTING_MAP[presetKey];

    if (preset) {
      if (preset.rowClass) rowClasses.push(preset.rowClass);
      if (preset.cellBadgeClass) cellBadgeClasses.push(preset.cellBadgeClass);
      if (preset.borderClass) borderClasses.push(preset.borderClass);
      if (preset.textClass) textClasses.push(preset.textClass);
      iconColor = preset.iconColor;
    }

    if (style.isBold) textClasses.push('font-bold');
    if (style.isItalic) textClasses.push('italic');
    if (style.isStrikethrough) textClasses.push('line-through opacity-70');

    if (style.badgeLabel) badgeLabel = style.badgeLabel;
    if (style.iconName) iconName = style.iconName;

    if (style.textColor) customStyle.color = style.textColor;
    if (style.backgroundColor) customStyle.backgroundColor = style.backgroundColor;
    if (style.borderColor) customStyle.borderColor = style.borderColor;
  }

  return {
    hasMatch: true,
    matchedRules,
    rowClassName: cn(...rowClasses),
    cellBadgeClassName: cn(...cellBadgeClasses),
    borderClassName: cn(...borderClasses),
    textClassName: cn(...textClasses),
    customStyle,
    badgeLabel,
    iconName,
    iconColor
  };
};

