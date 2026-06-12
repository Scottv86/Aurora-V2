import { 
  addDays, 
  addMonths, 
  addYears, 
  addMinutes, 
  addHours,
  startOfMonth, 
  endOfMonth, 
  startOfWeek,
  endOfWeek,
  startOfToday,
  format,
  parse,
  isValid,
  roundToNearestMinutes
} from 'date-fns';
import { ModuleField } from '../types/platform';

/**
 * Helper to apply offsets to a date.
 */
const applyOffset = (date: Date | null | undefined, offset?: number | string, unit?: string): Date | null => {
  if (!date || !isValid(date)) return null;
  const numericOffset = typeof offset === 'string' ? parseInt(offset) : (offset || 0);
  if (isNaN(numericOffset)) return new Date(date);
  
  let result = new Date(date);
  switch (unit) {
    case 'days': result = addDays(result, numericOffset); break;
    case 'months': result = addMonths(result, numericOffset); break;
    case 'years': result = addYears(result, numericOffset); break;
    case 'minutes': result = addMinutes(result, numericOffset); break;
    case 'hours': result = addHours(result, numericOffset); break;
    case 'business_days': 
      let daysToAdd = Math.abs(numericOffset);
      const direction = numericOffset > 0 ? 1 : -1;
      while (daysToAdd > 0) {
        result = addDays(result, direction);
        const day = result.getDay();
        if (day !== 0 && day !== 6) daysToAdd--;
      }
      break;
  }
  return result;
};

/**
 * Calculates the default value for a field based on its configuration.
 */
export const calculateDefaultValue = (field: ModuleField, currentData: Record<string, any> = {}): any => {
  const { type, defaultType, defaultOffset, defaultOffsetUnit, defaultRounding, defaultValue } = field;

  if (!defaultType || defaultType === 'static') {
    return defaultValue;
  }

  const now = new Date();

  if (type === 'date') {
    let baseDate: Date | null = null;

    switch (defaultType) {
      case 'today':
      case 'relative': // 'relative' is now treated as 'today' with an offset
        baseDate = startOfToday();
        break;
      case 'start_of_week':
        baseDate = startOfWeek(now);
        break;
      case 'end_of_week':
        baseDate = endOfWeek(now);
        break;
      case 'start_of_month':
        baseDate = startOfMonth(now);
        break;
      case 'end_of_month':
        baseDate = endOfMonth(now);
        break;
      case 'start_of_year':
        baseDate = parse(`${now.getFullYear()}-01-01`, 'yyyy-MM-dd', new Date());
        break;
      case 'end_of_year':
        baseDate = parse(`${now.getFullYear()}-12-31`, 'yyyy-MM-dd', new Date());
        break;
      case 'field_copy':
        if (field.defaultSourceFieldId && currentData[field.defaultSourceFieldId]) {
          const val = currentData[field.defaultSourceFieldId];
          const parsed = new Date(val);
          if (isValid(parsed)) {
            baseDate = parsed;
          }
        }
        break;
    }

    if (!baseDate) return null;

    // Apply offset if configured
    if (defaultOffset) {
      baseDate = applyOffset(baseDate, defaultOffset, defaultOffsetUnit || 'days');
    }

    return baseDate ? format(baseDate, 'yyyy-MM-dd') : null;
  }

  if (type === 'time') {
    let baseTime = now;

    switch (defaultType) {
      case 'now':
        baseTime = now;
        break;
      case 'rounded_now':
        baseTime = roundToNearestMinutes(now, { nearestTo: (defaultRounding || 15) as any });
        break;
      case 'field_copy':
        if (field.defaultSourceFieldId && currentData[field.defaultSourceFieldId]) {
          const val = currentData[field.defaultSourceFieldId];
          // Try parsing as HH:mm or full ISO
          const parsed = parse(val, 'HH:mm', new Date());
          if (isValid(parsed)) {
            baseTime = parsed;
          } else {
            const isoParsed = new Date(val);
            if (isValid(isoParsed)) baseTime = isoParsed;
          }
        }
        break;
      case 'relative':
        baseTime = now;
        break;
    }

    if (defaultOffset) {
      baseTime = applyOffset(baseTime, defaultOffset, defaultOffsetUnit || 'minutes') || baseTime;
    }

    return format(baseTime, 'HH:mm');
  }

  return defaultValue;
};

/**
 * Resolves min/max constraints for date/time fields.
 */
export const resolveConstraint = (
  field: ModuleField, 
  constraintType: 'min' | 'max', 
  currentData: Record<string, any> = {}
): string | undefined => {
  const typeKey = constraintType === 'min' ? 'minDateType' : 'maxDateType';
  const fieldIdKey = constraintType === 'min' ? 'minDateFieldId' : 'maxDateFieldId';
  const valueKey = constraintType === 'min' ? 'minDateValue' : 'maxDateValue';
  const offsetKey = constraintType === 'min' ? 'minDateOffset' : 'maxDateOffset';
  const unitKey = constraintType === 'min' ? 'minDateOffsetUnit' : 'maxDateOffsetUnit';

  const type = (field as any)[typeKey];
  const sourceFieldId = (field as any)[fieldIdKey];
  const staticValue = (field as any)[valueKey];
  const offset = (field as any)[offsetKey];
  const unit = (field as any)[unitKey];

  if (!type || type === 'none') return undefined;

  const isTimeField = field.type === 'time';
  let baseDate = isTimeField ? new Date() : startOfToday();

  switch (type) {
    case 'static':
      return staticValue;
    case 'today':
      baseDate = startOfToday();
      break;
    case 'now':
      baseDate = new Date();
      break;
    case 'field_value':
      if (sourceFieldId && currentData[sourceFieldId]) {
        const val = currentData[sourceFieldId];
        if (isTimeField) {
          const parsed = parse(val, 'HH:mm', new Date());
          if (isValid(parsed)) {
            baseDate = parsed;
          } else {
            const isoParsed = new Date(val);
            if (isValid(isoParsed)) baseDate = isoParsed;
          }
        } else {
          baseDate = new Date(val);
        }
      }
      break;
    case 'relative':
      baseDate = isTimeField ? new Date() : startOfToday();
      break;
  }

  if (offset) {
    baseDate = applyOffset(baseDate, offset, unit || (isTimeField ? 'minutes' : 'days')) || baseDate;
  }

  return format(baseDate, isTimeField ? 'HH:mm' : 'yyyy-MM-dd');
};
