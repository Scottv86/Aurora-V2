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
  setYear,
  roundToNearestMinutes
} from 'date-fns';
import { ModuleField } from '../types/platform';

/**
 * Helper to apply offsets to a date.
 */
const applyOffset = (date: Date, offset?: number, unit?: string): Date => {
  if (!offset) return date;
  let result = date;
  switch (unit) {
    case 'days': result = addDays(result, offset); break;
    case 'months': result = addMonths(result, offset); break;
    case 'years': result = addYears(result, offset); break;
    case 'minutes': result = addMinutes(result, offset); break;
    case 'hours': result = addHours(result, offset); break;
    case 'business_days': 
      let daysToAdd = Math.abs(offset);
      const direction = offset > 0 ? 1 : -1;
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
    let baseDate = startOfToday();

    switch (defaultType) {
      case 'today':
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
      case 'relative':
        baseDate = applyOffset(baseDate, defaultOffset, defaultOffsetUnit);
        break;
      case 'field_copy':
        if (field.defaultSourceFieldId && currentData[field.defaultSourceFieldId]) {
          return currentData[field.defaultSourceFieldId];
        }
        return null;
    }
    return format(baseDate, 'yyyy-MM-dd');
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
      case 'relative':
        baseTime = applyOffset(baseTime, defaultOffset, defaultOffsetUnit || 'minutes');
        break;
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

  let baseDate = startOfToday();

  switch (type) {
    case 'static':
      return staticValue;
    case 'today':
      baseDate = startOfToday();
      break;
    case 'relative':
      baseDate = applyOffset(startOfToday(), offset, unit);
      break;
    case 'field_value':
      if (sourceFieldId && currentData[sourceFieldId]) {
        const val = currentData[sourceFieldId];
        const date = new Date(val);
        if (isValid(date)) baseDate = date;
        else return undefined;
      } else {
        return undefined;
      }
      break;
    default:
      return undefined;
  }

  return format(baseDate, 'yyyy-MM-dd');
};
