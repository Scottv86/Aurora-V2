import { createFormulaContext } from './formulaEngine';

export interface ValidationRule {
  id: string;
  name: string;
  expression: string;
  errorMessage: string;
  isActive: boolean;
  severity?: 'error' | 'warning';
  showInline?: boolean; // default: true
  showToast?: boolean;  // default: true
  bypassMode?: 'none' | 'confirm'; // default: 'none'
}

/**
 * Evaluates a validation rule expression against record data.
 * The expression should evaluate to true when valid, and false when it violates the constraint.
 */
export const evaluateRuleExpression = (
  expression: string,
  data: Record<string, any>,
  fields: any[],
  globalListData: Record<string, any[]> = {}
): boolean => {
  if (!expression || expression.trim() === '') return true;

  try {
    let logic = expression;

    // Replace single '=' (equality check) with '==' to prevent assignment syntax error
    // We only replace '=' if it is not preceded by '<', '>', '!', or '=' and not followed by '='.
    logic = logic.replace(/(?<![<>!=])=(?!=)/g, '==');

    // 1. Sort fields by max of label or slug length descending to prevent partial replacements (e.g. "{Total Budget}" vs "{Total}")
    const sortedFields = [...fields].sort((a, b) => {
      const lenA = Math.max(a.label?.length || 0, a.name?.length || 0);
      const lenB = Math.max(b.label?.length || 0, b.name?.length || 0);
      return lenB - lenA;
    });

    // 2. Replace placeholders (both {Field Label}, {{field_id}}, {field_slug}, and {{field_slug}}) with actual values
    sortedFields.forEach(f => {
      let value = data[f.id];

      // Handle nested fields in container structures
      if (value === undefined || value === null) {
        for (const key in data) {
          if (data[key] && typeof data[key] === 'object' && !Array.isArray(data[key])) {
            if (data[key][f.id] !== undefined) {
              value = data[key][f.id];
              break;
            }
          }
        }
      }

      // Default values based on field type to prevent undefined failures in operations
      if (value === undefined || value === null || value === '') {
        const numericTypes = ['number', 'currency', 'calculation'];
        value = numericTypes.includes(f.type) ? 0 : "";
      }

      const idRegex = new RegExp(`\\{\\{${f.id}\\}\\}`, 'g');

      const safeReplacement = typeof value === 'number' ? value.toString() : `"${value.toString().replace(/"/g, '\\"')}"`;

      logic = logic.replace(idRegex, safeReplacement);

      if (f.name) {
        const escapedSlug = f.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const slugRegex1 = new RegExp(`\\{${escapedSlug}\\}`, 'gi');
        const slugRegex2 = new RegExp(`\\{\\{${escapedSlug}\\}\\}`, 'g');
        logic = logic.replace(slugRegex1, safeReplacement).replace(slugRegex2, safeReplacement);
      }

      if (f.label) {
        const escapedLabel = f.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const labelRegex1 = new RegExp(`\\{${escapedLabel}\\}`, 'gi');
        const labelRegex2 = new RegExp(`\\{\\{${escapedLabel}\\}\\}`, 'g');
        logic = logic.replace(labelRegex1, safeReplacement).replace(labelRegex2, safeReplacement);
      }
    });

    // 3. Replace system fields
    const recordKey = data._record_key || data.id || "";
    logic = logic.replace(/\{Record Key\}/gi, `"${recordKey.replace(/"/g, '\\"')}"`);
    logic = logic.replace(/\{\{_record_key\}\}/g, `"${recordKey.replace(/"/g, '\\"')}"`);

    // 4. Create centralized formula context
    const context = createFormulaContext({
      getGlobalListItems: (name) => globalListData[name] || []
    });

    // 5. Evaluate expression
    const func = new Function(...Object.keys(context), `return ${logic}`);
    const result = func(...Object.values(context));

    return !!result;
  } catch (error) {
    console.error("Error evaluating validation rule:", expression, error);
    // Return true on evaluation or compilation error to avoid blocking record saves due to configuration issues.
    return true;
  }
};

export interface ValidationError {
  message: string;
  severity: 'error' | 'warning';
  ruleId?: string;
}

/**
 * Validates a record against an array of validation rules.
 * Returns a list of failed rules.
 */
export const validateRecordRules = (
  data: Record<string, any>,
  rules: ValidationRule[] | undefined,
  fields: any[],
  globalListData: Record<string, any[]> = {},
  bypassedRuleIds?: Set<string>
): ValidationError[] => {
  if (!rules || !Array.isArray(rules)) return [];

  const errors: ValidationError[] = [];
  rules.forEach(rule => {
    if (bypassedRuleIds?.has(rule.id)) return;
    if (rule.isActive && rule.expression) {
      const isValid = evaluateRuleExpression(rule.expression, data, fields, globalListData);
      if (!isValid) {
        errors.push({
          message: rule.errorMessage || `Validation rule '${rule.name}' failed.`,
          severity: rule.severity || 'error',
          ruleId: rule.id
        });
      }
    }
  });

  return errors;
};
