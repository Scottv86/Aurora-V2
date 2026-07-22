/**
 * Bi-directional JSON Schema Minifier & Expander
 * Compresses JSON schema keys prior to LLM transmission for aggressive token reduction,
 * and uncompresses generated JSON manifests upon receipt.
 */

// Key mapping dictionaries
const KEY_MAP_FORWARD: Record<string, string> = {
  // Common Module properties
  name: 'n',
  description: 'd',
  category: 'c',
  type: 't',
  icon: 'i',
  isCustom: 'ic',
  tabs: 'tb',
  layout: 'l',
  fields: 'f',
  
  // Field properties
  label: 'lbl',
  required: 'req',
  placeholder: 'ph',
  helperText: 'ht',
  options: 'opts',
  
  // Workflow / Automation properties
  workflows: 'wf',
  automations: 'auto',
  nodes: 'nd',
  edges: 'ed',
  triggers: 'tr',
  conditions: 'cond',
  actions: 'act',
  targetModuleId: 'tm'
};

// Generate inverse reverse map
const KEY_MAP_REVERSE: Record<string, string> = Object.entries(KEY_MAP_FORWARD).reduce(
  (acc, [k, v]) => {
    acc[v] = k;
    return acc;
  },
  {} as Record<string, string>
);

/**
 * Minifies a JSON object or array by replacing verbose keys with shortened aliases.
 */
export function minifySchemaPayload(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(minifySchemaPayload);
  }

  const minified: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const minKey = KEY_MAP_FORWARD[key] || key;
    minified[minKey] = minifySchemaPayload(value);
  }
  return minified;
}

/**
 * Expands a minified JSON object or array back to full schema property names.
 */
export function expandSchemaPayload(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(expandSchemaPayload);
  }

  const expanded: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = KEY_MAP_REVERSE[key] || key;
    expanded[fullKey] = expandSchemaPayload(value);
  }
  return expanded;
}
