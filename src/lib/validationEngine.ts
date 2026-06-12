import { createFormulaContext } from './formulaEngine';

export interface ValidationRule {
  id: string;
  name: string;
  expression: string;
  errorMessage: string;
  isActive: boolean;
  severity?: 'error' | 'warning';
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

    // 1. Sort fields by label length descending to prevent partial replacements (e.g. "{Total Budget}" vs "{Total}")
    const sortedFields = [...fields].sort((a, b) => b.label.length - a.label.length);

    // 2. Replace placeholders (both {Field Label} and {{field_id}}) with actual values
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

      const escapedLabel = f.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const labelRegex = new RegExp(`\\{${escapedLabel}\\}`, 'gi');
      const idRegex = new RegExp(`\\{\\{${f.id}\\}\\}`, 'g');

      const safeReplacement = typeof value === 'number' ? value.toString() : `"${value.toString().replace(/"/g, '\\"')}"`;

      logic = logic.replace(idRegex, safeReplacement).replace(labelRegex, safeReplacement);
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
    // Compilation or runtime error in the formula means validation fails (constraint violated)
    return false;
  }
};

/**
 * Validates a record against an array of validation rules.
 * Returns a list of failed rules (their error messages).
 */
export const validateRecordRules = (
  data: Record<string, any>,
  rules: ValidationRule[] | undefined,
  fields: any[],
  globalListData: Record<string, any[]> = {}
): string[] => {
  if (!rules || !Array.isArray(rules)) return [];

  const errors: string[] = [];
  rules.forEach(rule => {
    if (rule.isActive && rule.expression) {
      const isValid = evaluateRuleExpression(rule.expression, data, fields, globalListData);
      if (!isValid) {
        errors.push(rule.errorMessage || `Validation rule '${rule.name}' failed.`);
      }
    }
  });

  return errors;
};
