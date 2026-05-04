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
  if (field.hidden) return false;
  if (!field.visibilityRule) return true;
  return checkCondition(field.visibilityRule, data);
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
      const actualValue = data?.[actualFieldId];
      let compareValue = value;

      // If comparing against another field, fetch its value from data
      if (valueType === 'field' && value) {
        const compareFieldId = value === '_record_key' ? (data?.key ? 'key' : 'id') : value;
        compareValue = data?.[compareFieldId];
      }
      
      const isEmpty = (val: any) => val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0);

      switch (operator) {
        case 'equals':
          isMet = String(actualValue) === String(compareValue); break;
        case 'not_equals':
          isMet = String(actualValue) !== String(compareValue); break;
        case 'contains':
          isMet = String(actualValue || '').toLowerCase().includes(String(compareValue || '').toLowerCase()); break;
        case 'greater_than':
          isMet = Number(actualValue) > Number(compareValue); break;
        case 'less_than':
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


export const calculateHeight = (field: any) => {
  if (!field) return 1;
  const type = field.type;
  // Containers need a bit more space for their label and drop zone
  if (type === 'repeatableGroup' || type === 'fieldGroup' || type === 'group') return 2;
  // All other fields default to a single row unit (120px)
  return 1;
};
