import { createFormulaContext } from './formulaEngine';

export type ValidationOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'matches_regex'
  | 'min_length'
  | 'max_length'
  | 'greater_than'
  | 'greater_or_equal'
  | 'less_than'
  | 'less_or_equal'
  | 'before'
  | 'after'
  | 'on_or_before'
  | 'on_or_after'
  | 'is_empty'
  | 'not_empty'
  | 'is_true'
  | 'is_false'
  | 'is_one_of'
  | 'is_not_one_of';

export interface ValidationConditionNode {
  id: string;
  type: 'rule' | 'group';
  // For 'group'
  logicalOperator?: 'AND' | 'OR';
  rules?: ValidationConditionNode[];
  // For 'rule'
  fieldId?: string; // field.id or field.name
  operator?: ValidationOperator;
  valueType?: 'literal' | 'field' | 'variable';
  value?: any;
}

export interface ValidationTestCase {
  id: string;
  name: string;
  data: Record<string, any>;
  expectedValid: boolean;
}

export interface ValidationRule {
  id: string;
  name: string;
  mode?: 'visual' | 'expression'; // default: 'expression' for backwards compatibility
  conditionTree?: ValidationConditionNode;
  expression: string;
  errorMessage: string;
  isActive: boolean;
  severity?: 'error' | 'warning' | 'info';
  enforcement?: 'block' | 'confirm' | 'allow'; // explicit save behavior
  showBanner?: boolean; // default: true (top of record/modal)
  showInline?: boolean; // default: true (on targetFieldIds)
  showToast?: boolean;  // default: true
  bypassMode?: 'none' | 'confirm'; // legacy fallback for warning confirm
  targetFieldIds?: string[]; // field IDs for inline error highlighting
  triggerOn?: 'always' | 'create' | 'update'; // default: 'always'
  exemptRoles?: string[]; // roles that bypass this rule
  testCases?: ValidationTestCase[]; // saved regression test cases
}

const resolveFieldToken = (fieldId: string | undefined, fields: any[]): string => {
  if (!fieldId) return '""';
  const f = fields.find(item => item.id === fieldId || item.name === fieldId);
  if (!f) return `{${fieldId}}`;
  return f.name ? `{${f.name}}` : `{{${f.id}}}`;
};

const formatLiteralForExpression = (val: any, field?: any): string => {
  if (val === undefined || val === null) return '""';
  const isNumericField = field && ['number', 'currency', 'calculation', 'rating', 'progress', 'slider'].includes(field.type);
  if (typeof val === 'number' || (isNumericField && val !== '' && !isNaN(Number(val)))) {
    return String(Number(val));
  }
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  return `"${String(val).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
};

const resolveVariableToken = (varKey: string): string => {
  if (varKey === '{{today}}') return 'TODAY()';
  if (varKey === '{{now}}') return 'NOW()';
  return `"${String(varKey)}"`;
};

/**
 * Compiles a structured visual ValidationConditionNode tree into a readable expression string
 * compatible with evaluateRuleExpression().
 */
export const compileConditionTreeToExpression = (
  node: ValidationConditionNode | undefined,
  fields: any[]
): string => {
  if (!node) return '';

  if (node.type === 'group') {
    const children = (node.rules || [])
      .map(child => compileConditionTreeToExpression(child, fields))
      .filter(Boolean);
    if (children.length === 0) return '';
    if (children.length === 1) return children[0];
    const fn = node.logicalOperator === 'OR' ? 'OR' : 'AND';
    return `${fn}(${children.join(', ')})`;
  }

  if (!node.fieldId) return '';
  const field = fields.find(f => f.id === node.fieldId || f.name === node.fieldId);
  const lhs = resolveFieldToken(node.fieldId, fields);
  const op = node.operator || 'equals';

  if (op === 'is_empty') return `IS_NULL(${lhs})`;
  if (op === 'not_empty') return `NOT(IS_NULL(${lhs}))`;
  if (op === 'is_true') return `${lhs} == true`;
  if (op === 'is_false') return `${lhs} == false`;

  const rhs =
    node.valueType === 'field'
      ? resolveFieldToken(node.value, fields)
      : node.valueType === 'variable'
        ? resolveVariableToken(String(node.value || ''))
        : formatLiteralForExpression(node.value, field);

  switch (op) {
    case 'equals':
      return `${lhs} == ${rhs}`;
    case 'not_equals':
      return `${lhs} != ${rhs}`;
    case 'greater_than':
    case 'after':
      return `${lhs} > ${rhs}`;
    case 'greater_or_equal':
    case 'on_or_after':
      return `${lhs} >= ${rhs}`;
    case 'less_than':
    case 'before':
      return `${lhs} < ${rhs}`;
    case 'less_or_equal':
    case 'on_or_before':
      return `${lhs} <= ${rhs}`;
    case 'contains':
      return `String(${lhs} ?? "").toLowerCase().includes(String(${rhs} ?? "").toLowerCase())`;
    case 'not_contains':
      return `!String(${lhs} ?? "").toLowerCase().includes(String(${rhs} ?? "").toLowerCase())`;
    case 'starts_with':
      return `String(${lhs} ?? "").toLowerCase().startsWith(String(${rhs} ?? "").toLowerCase())`;
    case 'ends_with':
      return `String(${lhs} ?? "").toLowerCase().endsWith(String(${rhs} ?? "").toLowerCase())`;
    case 'matches_regex':
      return `new RegExp(${rhs}).test(String(${lhs} ?? ""))`;
    case 'min_length':
      return `String(${lhs} ?? "").length >= ${Number(node.value || 0)}`;
    case 'max_length':
      return `String(${lhs} ?? "").length <= ${Number(node.value || 0)}`;
    case 'is_one_of': {
      const list = Array.isArray(node.value)
        ? node.value
        : String(node.value || '').split(',').map(s => s.trim()).filter(Boolean);
      const formatted = `[${list.map(v => formatLiteralForExpression(v, field)).join(', ')}]`;
      return `${formatted}.includes(${lhs})`;
    }
    case 'is_not_one_of': {
      const list = Array.isArray(node.value)
        ? node.value
        : String(node.value || '').split(',').map(s => s.trim()).filter(Boolean);
      const formatted = `[${list.map(v => formatLiteralForExpression(v, field)).join(', ')}]`;
      return `!${formatted}.includes(${lhs})`;
    }
    default:
      return `${lhs} == ${rhs}`;
  }
};

export interface ExpressionDiagnostic {
  valid: boolean;
  warnings: string[];
  errors: string[];
}

/**
 * Validates formula syntax and field references for live editor feedback.
 */
export const validateExpressionSyntax = (expression: string, fields: any[]): ExpressionDiagnostic => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!expression || !expression.trim()) {
    return { valid: true, warnings, errors };
  }

  // Check balanced parentheses & braces
  let parens = 0;
  let braces = 0;
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < expression.length; i++) {
    const ch = expression[i];
    const prev = i > 0 ? expression[i - 1] : '';
    if (ch === "'" && !inDouble && prev !== '\\') inSingle = !inSingle;
    else if (ch === '"' && !inSingle && prev !== '\\') inDouble = !inDouble;
    if (inSingle || inDouble) continue;
    if (ch === '(') parens++;
    else if (ch === ')') parens--;
    else if (ch === '{') braces++;
    else if (ch === '}') braces--;
    if (parens < 0) {
      errors.push('Unexpected closing parenthesis ")"');
      break;
    }
    if (braces < 0) {
      errors.push('Unexpected closing brace "}"');
      break;
    }
  }
  if (inSingle || inDouble) errors.push('Unclosed string literal');
  if (parens > 0) errors.push('Unclosed parenthesis "("');
  if (braces > 0) errors.push('Unclosed field brace "{"');

  // Check field references
  const singleBraceRegex = /(?<!\{)\{([^{}]+)\}(?!\})/g;
  let match;
  while ((match = singleBraceRegex.exec(expression)) !== null) {
    const token = match[1];
    if (token.toLowerCase() === 'record key') continue;
    const exists = fields.some(f => f.name === token || f.label === token || f.id === token);
    if (!exists && fields.length > 0) {
      warnings.push(`Unknown field reference: {${token}}`);
    }
  }

  // Check JS compilation safety by substituting dummy values
  if (errors.length === 0) {
    try {
      let testLogic = replaceSingleEqualsOutsideStrings(expression);
      testLogic = testLogic.replace(/\{\{[^{}]+\}\}/g, '0').replace(/\{[^{}]+\}/g, '0');
      const context = createFormulaContext({ getGlobalListItems: () => [] });
      new Function(...Object.keys(context), `return ${testLogic}`);
    } catch (e: any) {
      errors.push(e?.message || 'Invalid expression syntax');
    }
  }

  return { valid: errors.length === 0, warnings, errors };
};

/**
 * Replaces single '=' equality checks with '==' only outside quoted string literals.
 */
const replaceSingleEqualsOutsideStrings = (expr: string): string => {
  return expr.replace(/("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|(?<![<>!=])=(?!=)/g, (m, str) => {
    if (str) return str;
    return '==';
  });
};

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
    let logic = replaceSingleEqualsOutsideStrings(expression);

    // 1. Sort fields by max of label or slug length descending to prevent partial replacements
    const sortedFields = [...fields].sort((a, b) => {
      const lenA = Math.max(a.label?.length || 0, a.name?.length || 0);
      const lenB = Math.max(b.label?.length || 0, b.name?.length || 0);
      return lenB - lenA;
    });

    // 2. Replace placeholders ({Field Label}, {{field_id}}, {field_slug}, {{field_slug}}) with actual values
    sortedFields.forEach(f => {
      let value = data[f.id];
      if ((value === undefined || value === null) && f.name) {
        value = data[f.name];
      }

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

      const safeReplacement =
        typeof value === 'number'
          ? value.toString()
          : typeof value === 'boolean'
            ? (value ? 'true' : 'false')
            : `"${value.toString().replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

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
    logic = logic.replace(/\{Record Key\}/gi, `"${String(recordKey).replace(/"/g, '\\"')}"`);
    logic = logic.replace(/\{\{_record_key\}\}/g, `"${String(recordKey).replace(/"/g, '\\"')}"`);

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
  severity: 'error' | 'warning' | 'info';
  enforcement: 'block' | 'confirm' | 'allow';
  showBanner: boolean;
  showInline: boolean;
  showToast: boolean;
  ruleId?: string;
  ruleName?: string;
  targetFieldIds?: string[];
}

export interface ValidateRecordOptions {
  isNewRecord?: boolean;
  userRole?: string;
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
  bypassedRuleIds?: Set<string>,
  options?: ValidateRecordOptions
): ValidationError[] => {
  if (!rules || !Array.isArray(rules)) return [];

  const errors: ValidationError[] = [];
  rules.forEach(rule => {
    if (bypassedRuleIds?.has(rule.id)) return;
    if (!rule.isActive) return;

    // Respect role exemptions
    if (options?.userRole && rule.exemptRoles && rule.exemptRoles.length > 0) {
      const normalizedUserRole = options.userRole.toLowerCase();
      if (rule.exemptRoles.some(r => r.toLowerCase() === normalizedUserRole)) {
        return;
      }
    }

    // Respect triggerOn scope if specified
    if (rule.triggerOn === 'create' && options?.isNewRecord === false) return;
    if (rule.triggerOn === 'update' && options?.isNewRecord === true) return;

    const effectiveExpression =
      rule.mode === 'visual' && rule.conditionTree
        ? compileConditionTreeToExpression(rule.conditionTree, fields) || rule.expression
        : rule.expression;

    if (effectiveExpression) {
      const isValid = evaluateRuleExpression(effectiveExpression, data, fields, globalListData);
      if (!isValid) {
        const sev = rule.severity || 'error';
        const enforcement: 'block' | 'confirm' | 'allow' =
          rule.enforcement ||
          (sev === 'error'
            ? 'block'
            : sev === 'warning' && rule.bypassMode === 'confirm'
              ? 'confirm'
              : 'allow');
        errors.push({
          message: rule.errorMessage || `Validation rule '${rule.name}' failed.`,
          severity: sev,
          enforcement,
          showBanner: rule.showBanner !== false,
          showInline: rule.showInline !== false,
          showToast: rule.showToast !== false,
          ruleId: rule.id,
          ruleName: rule.name,
          targetFieldIds: rule.targetFieldIds
        });
      }
    }
  });

  return errors;
};

const rulesetsCache = new Map<string, { fetchedAt: number; rulesets: any[] }>();

/**
 * Fetches Global and Module-bound validation rulesets from /api/validations (with 60s in-memory cache).
 */
export const fetchExternalValidationRulesets = async (
  apiBaseUrl: string,
  tenantId?: string,
  token?: string
): Promise<any[]> => {
  if (!tenantId) return [];
  const cached = rulesetsCache.get(tenantId);
  if (cached && Date.now() - cached.fetchedAt < 60_000) {
    return cached.rulesets;
  }
  try {
    const res = await fetch(`${apiBaseUrl}/api/validations`, {
      headers: {
        'x-tenant-id': tenantId,
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });
    if (!res.ok) return cached?.rulesets || [];
    const data = await res.json();
    const rulesets = Array.isArray(data) ? data : [];
    rulesetsCache.set(tenantId, { fetchedAt: Date.now(), rulesets });
    return rulesets;
  } catch {
    return cached?.rulesets || [];
  }
};

/**
 * Merges module-embedded validationRules with matching Global & Module-bound rulesets.
 */
export const mergeValidationRulesForModule = (
  moduleId: string | undefined,
  moduleRules: ValidationRule[] = [],
  externalRulesets: any[] = []
): ValidationRule[] => {
  const merged = [...(moduleRules || [])];
  const seenIds = new Set(merged.map(r => r.id));

  externalRulesets.forEach(rs => {
    const appliesGlobally = rs?.scope === 'GLOBAL' || !rs?.moduleId;
    const appliesToModule = moduleId && rs?.moduleId === moduleId;
    if ((appliesGlobally || appliesToModule) && Array.isArray(rs?.rules)) {
      rs.rules.forEach((r: ValidationRule) => {
        if (r && r.id && !seenIds.has(r.id)) {
          seenIds.add(r.id);
          merged.push(r);
        }
      });
    }
  });

  return merged;
};

/**
 * Resolves a dot-notation path (e.g. "customer.address.city") from an API response object.
 */
export const resolveDotPathValue = (obj: any, path: string): any => {
  if (!obj || typeof obj !== 'object' || !path) return undefined;
  if (obj[path] !== undefined) return obj[path];
  return path.split('.').reduce((acc, part) => (acc && typeof acc === 'object' ? acc[part] : undefined), obj);
};

/**
 * Evaluates a VisualRuleBuilder condition tree against record data.
 */
export const evaluateVisualCondition = (
  condition: ValidationConditionNode | undefined,
  data: Record<string, any>,
  fields: any[]
): boolean => {
  if (!condition) return true;
  const expr = compileConditionTreeToExpression(condition, fields);
  if (!expr) return true;
  return evaluateRuleExpression(expr, data, fields);
};
