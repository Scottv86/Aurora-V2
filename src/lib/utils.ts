import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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
export function getFieldValue(data: any, fieldId: string): any {
  if (!data || !fieldId) return undefined;
  
  // 1. Try root level first
  if (data[fieldId] !== undefined) return data[fieldId];
  
// 2. Search inside nested objects (groups)
  for (const key in data) {
    if (data[key] && typeof data[key] === 'object' && !Array.isArray(data[key])) {
      const nestedVal = getFieldValue(data[key], fieldId);
      if (nestedVal !== undefined) {
        return nestedVal;
      }
    }
  }
  
  return undefined;
}

export const isFieldVisible = (field: any, data: any) => {
  if (field.hidden) return false;
  const rule = field.visibilityRule || field.visibility;
  if (!rule) return true;
  return checkCondition(rule, data);
};

const checkCondition = (condition: any, data: any): boolean => {
  if (!condition) return true;

  const action = condition.action || 'show';
  let isMet = false;

  // Handle nested group
  if (condition.type === 'group') {
    const { logicalOperator, rules } = condition;
    if (!rules || rules.length === 0) {
      isMet = true;
    } else if (logicalOperator === 'AND') {
      isMet = rules.every((r: any) => checkCondition(r, data));
    } else {
      isMet = rules.some((r: any) => checkCondition(r, data));
    }
  } else {
    // Handle single rule (new or old format)
    const { fieldId, operator, value, valueType } = condition;
    if (!fieldId) {
      isMet = true;
    } else {
      const actualFieldId = fieldId === '_record_key' ? (data?.key ? 'key' : 'id') : fieldId;
      const actualValue = getFieldValue(data, actualFieldId);
      let compareValue = value;

      // If comparing against another field, fetch its value from data
      if (valueType === 'field' && value) {
        const compareFieldId = value === '_record_key' ? (data?.key ? 'key' : 'id') : value;
        compareValue = getFieldValue(data, compareFieldId);
      }
      
      const isEmpty = (val: any) => val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0);
      const safeString = (val: any) => (val === undefined || val === null) ? '' : String(val);

      switch (operator) {
        case 'equals':
        case 'eq':
          isMet = safeString(actualValue) === safeString(compareValue); break;
        case 'not_equals':
        case 'neq':
          isMet = safeString(actualValue) !== safeString(compareValue); break;
        case 'contains':
          isMet = safeString(actualValue).toLowerCase().includes(safeString(compareValue).toLowerCase()); break;
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
      console.log(`[checkCondition Debug] Evaluated rule for field ${actualFieldId}:`, {
        operator,
        actualValue,
        compareValue,
        safeActual: safeString(actualValue),
        safeCompare: safeString(compareValue),
        isMet,
        action
      });
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
    const expression = formula.replace(/\{(\w+)\}/g, (match, fieldId) => {
      const val = data?.[fieldId];
      return val !== undefined ? (isNaN(Number(val)) ? `"${val}"` : val) : '0';
    });
    
    // Use Function constructor for a safe-ish sandbox evaluation of simple math
    // In a production app, use a dedicated library like mathjs
    const result = new Function(`return ${expression}`)();
    
    if (typeof result === 'number') {
      return Number.isInteger(result) ? result : Number(result.toFixed(2));
    }
    return result ?? '';
  } catch (err) {
    console.error("Formula Eval Error:", err);
    return '#ERROR!';
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
  
  // Use rowSpan if explicitly set (e.g. for placeholders)
  if (field.rowSpan) return field.rowSpan;
  
  const type = field.type;
  
  if (isContainerField(type)) {
    // If collapsed, return 2 units to match standard field height (120px)
    if (field.isCollapsed) return 2;
    
    const fields = field.fields || [];
    if (fields.length === 0 && !placeholder) return 4;
    
    const childHeights = fields.map((f: any) => {
      const h = calculateHeight(f);
      const r = typeof f.rowIndex === 'number' ? f.rowIndex : 0;
      return r + h;
    });

    if (placeholder) {
      // Use the rowSpan of the placeholder if provided, otherwise default to 2
      const pHeight = placeholder.rowSpan || 2;
      childHeights.push(placeholder.index + pHeight);
    }
    
    const maxChildBottom = Math.max(0, ...childHeights);
    
    // Ensure container is at least 4 units high and has some padding at the bottom
    return Math.max(4, maxChildBottom + 2);
  }
  
  return 2;
};
