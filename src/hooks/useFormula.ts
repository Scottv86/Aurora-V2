import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { createFormulaContext } from '../lib/formulaEngine';

/**
 * Hook to evaluate formulas with support for Global List VLOOKUPs.
 * Used in FieldInput for live previews in record views.
 */
export const useFormula = (formula: string, recordData: Record<string, any>, fields: any[] = []) => {
  const [listDataCache, setListDataCache] = useState<Record<string, any[]>>({});
  const [isFetching, setIsFetching] = useState(false);

  // Map labels to IDs for field resolution (case-insensitive & trimmed)
  const labelMap = useMemo(() => {
    const map: Record<string, string> = {};
    fields.forEach(f => {
      if (f.label) {
        const normalized = f.label.toLowerCase().trim();
        map[normalized] = f.id;
      }
    });
    return map;
  }, [fields]);

  // 1. Detect VLOOKUP lists in formula
  const listNames = useMemo(() => {
    const names = new Set<string>();
    let match;
    const regex = /VLOOKUP\s*\(\s*[\s\S]*?\s*,\s*['"]([^'"]+)['"]/gi;
    while ((match = regex.exec(formula)) !== null) {
      names.add(match[1]);
    }
    return Array.from(names);
  }, [formula]);

  // 2. Fetch missing lists
  useEffect(() => {
    const fetchMissing = async () => {
      const missing = listNames.filter(name => !listDataCache[name]);
      if (missing.length === 0) return;

      setIsFetching(true);
      try {
        for (const name of missing) {
          const { data: lists } = await supabase
            .from('global_lists')
            .select('id, columns')
            .ilike('name', name);
          
          if (lists && lists.length > 0) {
            const { data: items } = await supabase
              .from('global_list_items')
              .select('data')
              .eq('list_id', lists[0].id)
              .eq('is_active', true);
            
            if (items) {
              const columns = lists[0].columns || [];
              const idToName: Record<string, string> = {};
              columns.forEach((c: any) => { idToName[c.id] = c.name; });

              const transformed = items.map(i => {
                const row: Record<string, any> = {};
                const itemData = i.data || {};
                Object.entries(itemData).forEach(([id, val]) => {
                  const colName = idToName[id] || id;
                  row[colName] = val;
                });
                return row;
              });

              setListDataCache(prev => ({ ...prev, [name]: transformed }));
            }
          }
        }
      } catch (err) {
        console.error('[useFormula] Fetch Error:', err);
      } finally {
        setIsFetching(false);
      }
    };

    fetchMissing();
  }, [listNames, listDataCache]);

  // 3. Evaluate Formula
  const result = useMemo(() => {
    if (!formula) return null;
    
    // Check if we have all needed lists in cache
    const hasAllLists = listNames.every(name => !!listDataCache[name]);
    if (!hasAllLists) return null;

    try {
      // Prepare executable expression (substitute variables)
      let executable = formula.replace(/\{([^{}]+)\}/g, (_match, label) => {
        const normalizedLabel = label.toLowerCase().trim();
        const fieldId = labelMap[normalizedLabel] || label;
        
        // Try to get value by ID, then by normalized label, then by raw label
        const val = recordData[fieldId] ?? recordData[normalizedLabel] ?? recordData[label];
        
        if (val === undefined || val === null) return 'null';
        return isNaN(Number(val)) ? `"${val.toString().replace(/"/g, '\\"')}"` : val;
      });

      // Logical operators fix
      executable = executable.replace(/==/g, '===');

      const context = createFormulaContext({
        getGlobalListItems: (name) => listDataCache[name] || []
      });

      // eslint-disable-next-line no-new-func
      const func = new Function(...Object.keys(context), `return ${executable}`);
      const evalResult = func(...Object.values(context));
      
      return evalResult;
    } catch (err) {
      console.error('[useFormula] Eval Error:', err);
      return null;
    }
  }, [formula, recordData, listNames, listDataCache, labelMap]);

  return {
    result,
    isFetching,
    hasAllData: listNames.every(name => !!listDataCache[name])
  };
};
