import { 
  add, 
  sub, 
  differenceInDays, 
  differenceInHours, 
  differenceInMinutes, 
  differenceInSeconds, 
  differenceInMilliseconds,
  parseISO
} from 'date-fns';

/**
 * Parses a time span string like '1y 3m 2w 8d 4h 30mi'
 */
export const parseTimeSpan = (span: string) => {
  const units: Record<string, string> = {
    y: 'years',
    m: 'months',
    w: 'weeks',
    d: 'days',
    h: 'hours',
    mi: 'minutes',
    s: 'seconds',
    ms: 'milliseconds'
  };
  
  const result: any = {};
  // Order matters for multi-char units like 'mi', 'ms'
  const regex = /(\d+)\s*(mi|ms|y|m|w|d|h|s)/g;
  let match;
  while ((match = regex.exec(span)) !== null) {
    const value = parseInt(match[1]);
    const unitKey = match[2];
    const unitName = units[unitKey];
    if (unitName) {
      result[unitName] = (result[unitName] || 0) + value;
    }
  }
  return result;
};

/**
 * Centralized Formula Engine for Aurora
 */
export const createFormulaContext = (options: { 
  getGlobalListItems?: (listName: string) => any[] 
} = {}) => {
  return {
    // --- Logic & Control ---
    IF: (c: any, t: any, e: any) => c ? t : e,
    AND: (...args: any[]) => args.every(Boolean),
    OR: (...args: any[]) => args.some(Boolean),
    NOT: (c: any) => !c,
    SWITCH: (val: any, ...args: any[]) => {
      for (let i = 0; i < args.length - 1; i += 2) {
        if (val === args[i]) return args[i + 1];
      }
      return args[args.length - 1];
    },
    COALESCE: (...args: any[]) => args.find(a => a !== null && a !== undefined && a !== ''),
    IS_NULL: (v: any) => v === null || v === undefined || v === '',
    IS_EMPTY: (v: any) => v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0),

    // --- Math ---
    ABS: Math.abs,
    CEIL: Math.ceil,
    FLOOR: Math.floor,
    ROUND: (n: number, d: number = 0) => {
      const num = Number(n);
      return isNaN(num) ? 0 : Number(num.toFixed(d));
    },
    POW: (base: number, exp: number) => Math.pow(Number(base), Number(exp)),
    PERCENT: (v: number, t: number) => (Number(t) === 0) ? 0 : (Number(v) / Number(t)) * 100,
    MAX: (...args: any[]) => Math.max(...args.flat().map(Number)),
    MIN: (...args: any[]) => Math.min(...args.flat().map(Number)),
    SUM: (...args: any[]) => args.flat().reduce((a, b) => Number(a) + (isNaN(Number(b)) ? 0 : Number(b)), 0),
    AVG: (...args: any[]) => {
      const flat = args.flat().map(Number).filter(n => !isNaN(n));
      return flat.length === 0 ? 0 : flat.reduce((a, b) => a + b, 0) / flat.length;
    },

    // --- String ---
    LEN: (s: any) => String(s || '').length,
    CONCAT: (...args: any[]) => args.join(''),
    UPPER: (s: any) => String(s || '').toUpperCase(),
    LOWER: (s: any) => String(s || '').toLowerCase(),
    PROPER: (s: any) => String(s || '').replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()),
    TRIM: (s: any) => String(s || '').trim(),
    SUBSTR: (s: any, start: number, len: number) => String(s || '').substring(start, start + len),
    LEFT: (s: any, n: number) => String(s || '').substring(0, n),
    RIGHT: (s: any, n: number) => {
      const str = String(s || '');
      return str.substring(Math.max(0, str.length - n));
    },
    MID: (s: any, start: number, n: number) => {
      // 1-based indexing for MID as per common spreadsheet standard
      const str = String(s || '');
      return str.substring(Math.max(0, start - 1), Math.max(0, start - 1) + n);
    },
    REPLACE: (s: any, f: any, r: any) => String(s || '').replace(new RegExp(f, 'g'), r),
    CONTAINS: (s: any, q: any) => String(s || '').includes(String(q || '')),
    SEARCH: (s: any, q: any) => String(s || '').toLowerCase().includes(String(q || '').toLowerCase()),
    FIND: (needle: string, haystack: string, start: number = 1) => {
      const pos = String(haystack || '').indexOf(String(needle || ''), Math.max(0, start - 1));
      return pos === -1 ? 0 : pos + 1; // 1-based result
    },

    // --- Date & Time ---
    TODAY: () => new Date().toISOString().split('T')[0],
    NOW: () => new Date().toISOString(),
    YEAR: (d: any) => d ? new Date(d).getFullYear() : null,
    MONTH: (d: any) => d ? new Date(d).getMonth() + 1 : null,
    DAY: (d: any) => d ? new Date(d).getDate() : null,
    DATETIME: (y?: number, m?: number, d?: number, h: number = 0, mi: number = 0, s: number = 0) => {
      if (y === undefined) return new Date().toISOString();
      return new Date(y, (m || 1) - 1, d || 1, h, mi, s).toISOString();
    },
    TIMESPAN: (unit: string, d1: any, d2: any) => {
      if (!d1 || !d2) return 0;
      const start = typeof d1 === 'string' ? parseISO(d1) : new Date(d1);
      const end = typeof d2 === 'string' ? parseISO(d2) : new Date(d2);
      
      switch (unit.toLowerCase()) {
        case 'days': return differenceInDays(end, start);
        case 'hours': return differenceInHours(end, start);
        case 'minutes': return differenceInMinutes(end, start);
        case 'seconds': return differenceInSeconds(end, start);
        case 'milliseconds': return differenceInMilliseconds(end, start);
        default: return differenceInDays(end, start);
      }
    },
    DIFF_DAYS: (d1: any, d2: any) => {
      if (!d1 || !d2) return 0;
      return differenceInDays(parseISO(String(d2)), parseISO(String(d1)));
    },
    ADD_TIME: (date: any, span: string) => {
      if (!date || !span) return date;
      const d = typeof date === 'string' ? parseISO(date) : new Date(date);
      const duration = parseTimeSpan(span);
      return add(d, duration).toISOString();
    },
    SUB_TIME: (date: any, span: string) => {
      if (!date || !span) return date;
      const d = typeof date === 'string' ? parseISO(date) : new Date(date);
      const duration = parseTimeSpan(span);
      return sub(d, duration).toISOString();
    },
    ADD_DAYS: (d: any, days: number) => {
      if (!d) return null;
      return add(parseISO(String(d)), { days: Number(days) }).toISOString().split('T')[0];
    },
    EOMONTH: (d: any, m: number) => {
      if (!d) return null;
      const date = parseISO(String(d));
      const target = add(date, { months: m + 1 });
      target.setDate(0);
      return target.toISOString().split('T')[0];
    },
    WORKDAY: (d: any, days: number) => {
      if (!d) return null;
      let date = parseISO(String(d));
      let count = 0;
      const step = days > 0 ? 1 : -1;
      while (count < Math.abs(days)) {
        date = add(date, { days: step });
        if (date.getDay() !== 0 && date.getDay() !== 6) count++;
      }
      return date.toISOString().split('T')[0];
    },

    // --- Collections ---
    AT: (arr: any, i: number) => Array.isArray(arr) ? arr[i] : (i === 0 ? arr : null),
    INDEX_OF: (arr: any, v: any) => Array.isArray(arr) ? arr.indexOf(v) : (arr === v ? 0 : -1),
    UNIQUE: (arr: any) => Array.isArray(arr) ? [...new Set(arr)] : [arr],
    SORT: (arr: any) => Array.isArray(arr) ? [...arr].sort() : [arr],
    REVERSE: (arr: any) => Array.isArray(arr) ? [...arr].reverse() : [arr],
    FILTER: (val: any, expression: string) => {
      const collection = Array.isArray(val) ? val : [val];
      return collection.filter(item => {
        const subExpr = expression.replace(/\$/g, JSON.stringify(item));
        try {
          return new Function(`return ${subExpr}`)();
        } catch {
          return false;
        }
      });
    },
    MAP: (val: any, expression: string) => {
      const collection = Array.isArray(val) ? val : [val];
      return collection.map(item => {
        const subExpr = expression.replace(/\$/g, JSON.stringify(item));
        try {
          return new Function(`return ${subExpr}`)();
        } catch {
          return item;
        }
      });
    },
    JOIN: (arr: any, s: string) => Array.isArray(arr) ? arr.join(s) : String(arr),
    ROW_INDEX: (arr: any, item: any) => Array.isArray(arr) ? arr.indexOf(item) : 0,

    // --- Data Lookup ---
    VLOOKUP: (lookupValue: any, listNameOrData: string | any[], searchCol: string | number, returnCol: string | number) => {
      let data: any[] = [];
      if (Array.isArray(listNameOrData)) {
        data = listNameOrData;
      } else if (options.getGlobalListItems) {
        data = options.getGlobalListItems(listNameOrData);
      }

      if (!data || !Array.isArray(data)) return null;

      const found = data.find(item => {
        // Handle both object-based items and array-based items
        const val = typeof item === 'object' ? (item[searchCol] || item.data?.[searchCol]) : item;
        if (val === undefined || val === null) return false;
        
        // Case-insensitive and trimmed matching for strings
        return String(val).trim().toLowerCase() === String(lookupValue).trim().toLowerCase();
      });

      if (!found) return null;
      
      // If returnCol is omitted (per multi-lookup spec), return the whole item
      if (returnCol === undefined) return found;

      return typeof found === 'object' ? (found[returnCol] || found.data?.[returnCol]) : found;
    }
  };
};
