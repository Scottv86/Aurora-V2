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

export const isFieldVisible = (field: any, data: any) => {
  if (!field.visibilityRule) return true;
  return checkCondition(field.visibilityRule, data);
};

const checkCondition = (condition: any, data: any): boolean => {
  if (!condition) return true;

  // Handle nested group
  if (condition.type === 'group') {
    const { logicalOperator, rules } = condition;
    if (!rules || rules.length === 0) return true;
    
    if (logicalOperator === 'AND') {
      return rules.every((r: any) => checkCondition(r, data));
    } else {
      return rules.some((r: any) => checkCondition(r, data));
    }
  }

  // Handle single rule (new or old format)
  const { fieldId, operator, value, valueType } = condition;
  if (!fieldId) return true;
  
  const actualValue = data?.[fieldId];
  let compareValue = value;

  // If comparing against another field, fetch its value from data
  if (valueType === 'field' && value) {
    compareValue = data?.[value];
  }
  
  switch (operator) {
    case 'equals':
      return String(actualValue) === String(compareValue);
    case 'not_equals':
      return String(actualValue) !== String(compareValue);
    case 'contains':
      return String(actualValue).toLowerCase().includes(String(compareValue || '').toLowerCase());
    case 'greater_than':
      return Number(actualValue) > Number(compareValue);
    case 'less_than':
      return Number(actualValue) < Number(compareValue);
    case 'is_empty':
      return !actualValue || String(actualValue).trim() === '';
    case 'not_empty':
      return !!actualValue && String(actualValue).trim() !== '';
    default:
      return true;
  }
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

export const flattenFields = (fields: any[]): any[] => {
  const result: any[] = [];
  if (!fields) return result;
  fields.forEach(f => {
    result.push(f);
    if (f.fields && f.fields.length > 0) {
      result.push(...flattenFields(f.fields));
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


