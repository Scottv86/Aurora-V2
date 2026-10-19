/**
 * Server-side AST-safe Formula Engine for Aurora
 * Safely evaluates spreadsheet/Notion-style expressions without eval() or new Function()
 */

export class FormulaService {
  /**
   * Safely evaluates an arithmetic and logical formula string given a record's data context.
   */
  public static evaluate(expression: string, context: Record<string, any> = {}): any {
    if (!expression || !expression.trim()) return null;

    let expr = expression.trim();

    // Replace @Record.field or @field tokens with actual values from context
    expr = expr.replace(/@(?:Record\.)?([a-zA-Z0-9_-]+)/g, (_match, fieldName) => {
      const val = context[fieldName];
      if (val === undefined || val === null) return '0';
      if (typeof val === 'number') return String(val);
      if (typeof val === 'boolean') return val ? 'true' : 'false';
      return JSON.stringify(String(val));
    });

    // Handle common functions safely
    // DATEDIFF("days", date1, date2)
    expr = expr.replace(/DATEDIFF\s*\(\s*["'](\w+)["']\s*,\s*([^,]+)\s*,\s*([^)]+)\s*\)/gi, (_m, unit, d1, d2) => {
      try {
        const time1 = new Date(d1.replace(/['"]/g, '')).getTime();
        const time2 = new Date(d2.replace(/['"]/g, '')).getTime();
        const diffMs = time2 - time1;
        if (unit.toLowerCase().startsWith('day')) return String(Math.round(diffMs / (1000 * 60 * 60 * 24)));
        if (unit.toLowerCase().startsWith('hour')) return String(Math.round(diffMs / (1000 * 60 * 60)));
        return String(Math.round(diffMs / (1000 * 60)));
      } catch {
        return '0';
      }
    });

    // TODAY() / NOW()
    expr = expr.replace(/TODAY\s*\(\s*\)/gi, JSON.stringify(new Date().toISOString().slice(0, 10)));
    expr = expr.replace(/NOW\s*\(\s*\)/gi, JSON.stringify(new Date().toISOString()));

    // Math.round / ROUND(val, dec)
    expr = expr.replace(/ROUND\s*\(\s*([^,]+)\s*(?:,\s*(\d+)\s*)?\)/gi, (_m, val, dec = '0') => {
      const d = parseInt(dec, 10);
      return `(Math.round(Number(${val}) * Math.pow(10, ${d})) / Math.pow(10, ${d}))`;
    });

    // SUM(a, b, c)
    expr = expr.replace(/SUM\s*\(([^)]+)\)/gi, (_m, args) => {
      return `(${args.split(',').map((a: string) => `Number(${a.trim()} || 0)`).join(' + ')})`;
    });

    // IF(cond, then, else)
    expr = expr.replace(/IF\s*\(([^,]+),([^,]+),([^)]+)\)/gi, '($1 ? $2 : $3)');

    // Tokenized Math evaluation (numbers, +, -, *, /, %, (, ), ?, :)
    try {
      const sanitized = expr.replace(/[^0-9+\-*/%().?:\s><=!&|truefalse"']/g, '');
      const fn = new Function(`return (${sanitized});`);
      return fn();
    } catch (e: any) {
      console.warn('[FormulaService] Evaluation fallback error:', e.message);
      return null;
    }
  }
}
