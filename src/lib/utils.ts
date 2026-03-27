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
  const { fieldId, operator, value } = field.visibilityRule;
  if (!fieldId) return true;
  
  const actualValue = data?.[fieldId];
  
  switch (operator) {
    case 'equals':
      return String(actualValue) === value;
    case 'not_equals':
      return String(actualValue) !== value;
    default:
      return true;
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

