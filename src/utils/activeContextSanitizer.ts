import { isFieldHiddenBySecurity, isFieldMaskedBySecurity, formatMaskedFieldValue } from './fieldSecurity';

export interface SanitizeOptions {
  user?: any;
  module?: any;
  maxFields?: number;
}

/**
 * Cleanly extracts and sanitizes key attributes from raw record data
 * for inclusion in LLM prompt context, respecting field security and token budgets.
 */
export function sanitizeRecordKeyAttributes(
  data: Record<string, any> | null | undefined,
  fields?: any[],
  options?: SanitizeOptions
): Record<string, string | number | boolean | null> {
  if (!data || typeof data !== 'object') return {};

  const maxFields = options?.maxFields ?? 18;
  const user = options?.user;
  const moduleOrConfig = options?.module;
  const fieldMap = new Map<string, any>();

  if (Array.isArray(fields)) {
    fields.forEach((f) => {
      if (f?.id) fieldMap.set(f.id, f);
      if (f?.key) fieldMap.set(f.key, f);
    });
  }

  const result: Record<string, string | number | boolean | null> = {};
  let count = 0;

  for (const [key, value] of Object.entries(data)) {
    if (count >= maxFields) break;
    // Skip internal/meta fields
    if (key.startsWith('_') || key === 'id' || key === 'tenantId' || key === 'tenant_id') {
      continue;
    }

    // Check field-level security
    if (user && moduleOrConfig) {
      if (isFieldHiddenBySecurity(key, moduleOrConfig, user)) {
        continue;
      }
      if (isFieldMaskedBySecurity(key, moduleOrConfig, user)) {
        const fieldMeta = fieldMap.get(key);
        result[fieldMeta?.name || fieldMeta?.label || key] = formatMaskedFieldValue(value);
        count++;
        continue;
      }
    }

    const fieldMeta = fieldMap.get(key);
    const label = fieldMeta?.name || fieldMeta?.label || key;

    if (value === null || value === undefined) {
      continue;
    }

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      const strVal = String(value).trim();
      if (strVal.length > 0) {
        // Truncate long strings to keep token budget bounded
        result[label] = strVal.length > 200 ? strVal.slice(0, 197) + '...' : value;
        count++;
      }
    } else if (Array.isArray(value)) {
      if (value.length > 0) {
        if (typeof value[0] === 'string' || typeof value[0] === 'number') {
          result[label] = value.slice(0, 5).join(', ') + (value.length > 5 ? ` (+${value.length - 5} more)` : '');
        } else {
          result[label] = `[${value.length} items]`;
        }
        count++;
      }
    } else if (typeof value === 'object') {
      // Small object (like { city, state } or { label, value })
      if (value.label) {
        result[label] = String(value.label);
        count++;
      } else if (value.name) {
        result[label] = String(value.name);
        count++;
      } else {
        const subKeys = Object.keys(value);
        if (subKeys.length <= 3) {
          result[label] = JSON.stringify(value);
          count++;
        } else {
          result[label] = `{${subKeys.length} properties}`;
          count++;
        }
      }
    }
  }

  return result;
}

/**
 * Resolves a human-friendly display title for a module record
 */
export function resolveRecordTitle(
  record: any,
  module?: any,
  fields?: any[]
): string {
  if (!record) return 'Untitled Record';

  const data = record.data || record;
  const recKey =
    record._record_key ||
    data._record_key ||
    record.recordKey ||
    data.recordKey ||
    record.record_key ||
    data.record_key ||
    record.key ||
    data.key;

  // 1. Check primary display field from module configuration
  const displayField =
    module?.config?.primaryDisplayField ||
    module?.primaryDisplayField ||
    module?.config?.titleFieldId ||
    module?.titleFieldId;

  if (displayField && displayField !== '_record_key') {
    const val = data[displayField] ?? record[displayField];
    if (val && typeof val === 'string' && val.trim()) {
      return val.trim();
    }
  }

  // 2. Common title/name fields
  const candidates = [
    'title',
    'name',
    'full_name',
    'fullName',
    'premises_name',
    'premisesName',
    'company_name',
    'companyName',
    'subject',
    'label',
    'code',
    'record_number',
    'recordNumber',
    'lead_name',
  ];

  for (const c of candidates) {
    const val = data[c] ?? record[c];
    if (val && typeof val === 'string' && val.trim()) {
      return val.trim();
    }
  }

  // 3. Fall back to first non-empty text field in fields schema
  if (Array.isArray(fields)) {
    for (const f of fields) {
      if (
        (f.type === 'text' || f.type === 'string') &&
        f.id !== '_record_key' &&
        f.id !== 'id'
      ) {
        const val = data[f.id] ?? record[f.id];
        if (val && typeof val === 'string' && val.trim()) {
          return val.trim();
        }
      }
    }
  }

  // 4. Return record key if available
  if (recKey && typeof recKey === 'string' && recKey.trim()) {
    return recKey.trim();
  }

  return record.id ? `Record #${record.id.slice(0, 8)}` : 'Record';
}
