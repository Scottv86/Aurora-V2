import { createFormulaContext } from './formulaEngine';

/**
 * Robust mathematical & business calculation evaluator for Aurora
 */

const baseFormulaContext = createFormulaContext();

export interface ScratchpadLineResult {
  lineNumber: number;
  rawText: string;
  isComment: boolean;
  isAssignment: boolean;
  variableName?: string;
  expression: string;
  result: number | string | null;
  formattedResult: string;
  hasError: boolean;
  errorMessage?: string;
}

/**
 * Format number nicely with commas and reasonable precision
 */
export const formatCalcResult = (num: number): string => {
  if (isNaN(num)) return 'Error';
  if (!isFinite(num)) return num > 0 ? 'Infinity' : '-Infinity';
  
  // Format very small or large numbers
  if (Math.abs(num) > 0 && (Math.abs(num) >= 1e14 || Math.abs(num) < 1e-6)) {
    return num.toExponential(6).replace(/\.?0+e/, 'e');
  }

  // Round floating point inaccuracies (e.g. 0.1 + 0.2 = 0.30000000000000004)
  const precision = 10;
  const factor = Math.pow(10, precision);
  const rounded = Math.round(num * factor) / factor;

  const parts = rounded.toString().split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
};

/**
 * Safe mathematical expression evaluator
 */
export const evaluateExpression = (
  expr: string,
  variables: Record<string, number> = {}
): { value: number; formatted: string; error?: string } => {
  try {
    if (!expr || !expr.trim()) {
      return { value: 0, formatted: '0' };
    }

    let cleaned = expr.trim();

    // Replace display symbols with JavaScript math operators
    cleaned = cleaned
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/−/g, '-')
      .replace(/π/g, 'Math.PI')
      .replace(/\bpi\b/gi, 'Math.PI')
      .replace(/\be\b/g, 'Math.E');

    // Handle percentage add/subtract e.g. "100 + 15%" => "115"
    cleaned = cleaned.replace(/([\d.]+|\([^\(\)]+\))\s*\+\s*([\d.]+)%/g, '($1 * (1 + ($2 / 100)))');
    cleaned = cleaned.replace(/([\d.]+|\([^\(\)]+\))\s*-\s*([\d.]+)%/g, '($1 * (1 - ($2 / 100)))');

    // Handle percent multiplication / standalone e.g. "50 * 20%" => "50 * 0.20"
    cleaned = cleaned.replace(/(\d+(\.\d+)?)%/g, '($1/100)');

    // Scientific function mappings
    cleaned = cleaned
      .replace(/\bsin\(/gi, 'Math.sin(')
      .replace(/\bcos\(/gi, 'Math.cos(')
      .replace(/\btan\(/gi, 'Math.tan(')
      .replace(/\basin\(/gi, 'Math.asin(')
      .replace(/\bacos\(/gi, 'Math.acos(')
      .replace(/\batan\(/gi, 'Math.atan(')
      .replace(/\bsqrt\(/gi, 'Math.sqrt(')
      .replace(/\bcbrt\(/gi, 'Math.cbrt(')
      .replace(/\bln\(/gi, 'Math.log(')
      .replace(/\blog10\(/gi, 'Math.log10(')
      .replace(/\blog\(/gi, 'Math.log10(')
      .replace(/\babs\(/gi, 'Math.abs(')
      .replace(/\bfloor\(/gi, 'Math.floor(')
      .replace(/\bceil\(/gi, 'Math.ceil(')
      .replace(/\bround\(/gi, 'Math.round(');

    // Power operator `2 ^ 3` => `Math.pow(2, 3)`
    // Replace `a ^ b` using regex for simple terms
    while (cleaned.includes('^')) {
      const match = cleaned.match(/([a-zA-Z0-9_.]+|\([^\(\)]+\))\s*\^\s*([a-zA-Z0-9_.]+|\([^\(\)]+\))/);
      if (!match) break;
      cleaned = cleaned.replace(match[0], `Math.pow(${match[1]}, ${match[2]})`);
    }

    // Replace variables (e.g. `@subtotal`, `subtotal`, `{subtotal}`)
    for (const [key, val] of Object.entries(variables)) {
      if (typeof val === 'number' && !isNaN(val)) {
        // match @var, {var}, or standalone word var
        const sanitizedKey = key.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
        const pattern = new RegExp(`(@|\\{)?\\b${sanitizedKey}\\b(\\})?`, 'g');
        cleaned = cleaned.replace(pattern, String(val));
      }
    }

    // Strip out remaining unwanted characters for safety
    // Allowed: 0-9, Math, arithmetic, parens, commas, spaces, dot
    const isSafe = /^[\d\s+\-*/%(),.eE]|(Math\.[a-zA-Z0-9]+)+$/.test(
      cleaned.replace(/Math\.[a-zA-Z0-9]+/g, '1')
    );

    if (!isSafe) {
      // Check if it's using formula context functions like SUM, AVG, IF
      const contextKeys = Object.keys(baseFormulaContext);
      const funcNames = contextKeys.join('|');
      const safeFormulaPattern = new RegExp(`^([\\d\\s+\\-*/%(),.eE]|Math\\.[a-zA-Z0-9]+|${funcNames})+$`);
      if (!safeFormulaPattern.test(cleaned)) {
        return { value: 0, formatted: 'Error', error: 'Invalid expression character' };
      }
    }

    // Execute in sandboxed Function with Math & baseFormulaContext
    const context = { ...Math, ...baseFormulaContext };
    const funcArgs = Object.keys(context);
    const funcValues = Object.values(context);

    // eslint-disable-next-line no-new-func
    const fn = new Function(...funcArgs, `return (${cleaned});`);
    const rawResult = fn(...funcValues);

    const numResult = Number(rawResult);
    if (isNaN(numResult)) {
      return { value: 0, formatted: 'NaN', error: 'Result is not a number' };
    }

    return {
      value: numResult,
      formatted: formatCalcResult(numResult),
    };
  } catch (err: any) {
    return {
      value: 0,
      formatted: 'Error',
      error: err.message || 'Syntax error',
    };
  }
};

/**
 * Soulver / Calca style Multi-line Scratchpad Evaluator
 */
export const evaluateScratchpad = (
  text: string,
  externalVariables: Record<string, number> = {}
): {
  lines: ScratchpadLineResult[];
  variables: Record<string, number>;
  total: number;
  formattedTotal: string;
} => {
  const rawLines = text.split('\n');
  const variables: Record<string, number> = { ...externalVariables };
  const lines: ScratchpadLineResult[] = [];
  let runningTotal = 0;
  let lastNumericResult = 0;

  rawLines.forEach((raw, idx) => {
    const trimmed = raw.trim();
    const lineNum = idx + 1;

    // Empty line
    if (!trimmed) {
      lines.push({
        lineNumber: lineNum,
        rawText: raw,
        isComment: false,
        isAssignment: false,
        expression: '',
        result: null,
        formattedResult: '',
        hasError: false,
      });
      return;
    }

    // Comment line
    if (trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('/*')) {
      lines.push({
        lineNumber: lineNum,
        rawText: raw,
        isComment: true,
        isAssignment: false,
        expression: trimmed,
        result: null,
        formattedResult: '',
        hasError: false,
      });
      return;
    }

    // Check for variable assignment e.g. "Tax Rate = 0.15" or "deal_size: 45000" or "margin = 25%"
    let expr = trimmed;
    let varName: string | undefined;
    let isAssignment = false;

    // Check "var = expr" or "var : expr"
    const assignMatch = trimmed.match(/^([a-zA-Z_][a-zA-Z0-9_\s]*?)\s*(=|:)\s*(.*)$/);
    if (assignMatch && !assignMatch[1].toLowerCase().startsWith('if')) {
      varName = assignMatch[1].trim().replace(/\s+/g, '_');
      expr = assignMatch[3].trim();
      isAssignment = true;
    }

    // Strip inline comments e.g. "500 * 3 # materials"
    const inlineCommentIndex = expr.search(/[#\/]{2}/);
    if (inlineCommentIndex !== -1) {
      expr = expr.substring(0, inlineCommentIndex).trim();
    }

    // Support reference to 'prev' or 'last' or 'total'
    const scopeVariables: Record<string, number> = {
      ...variables,
      prev: lastNumericResult,
      last: lastNumericResult,
      total: runningTotal,
    };

    const evalResult = evaluateExpression(expr, scopeVariables);

    if (evalResult.error) {
      lines.push({
        lineNumber: lineNum,
        rawText: raw,
        isComment: false,
        isAssignment,
        variableName: varName,
        expression: expr,
        result: null,
        formattedResult: 'Error',
        hasError: true,
        errorMessage: evalResult.error,
      });
    } else {
      const val = evalResult.value;
      lastNumericResult = val;
      runningTotal += val;

      if (varName) {
        variables[varName] = val;
      }

      lines.push({
        lineNumber: lineNum,
        rawText: raw,
        isComment: false,
        isAssignment,
        variableName: varName,
        expression: expr,
        result: val,
        formattedResult: evalResult.formatted,
        hasError: false,
      });
    }
  });

  return {
    lines,
    variables,
    total: runningTotal,
    formattedTotal: formatCalcResult(runningTotal),
  };
};
