/**
 * Omni-Router Intent Classifier Service
 * Classifies user prompts into 4 intent buckets: Inform, Retrieve, Build, Operate
 */

export type IntentCategory = 'Inform' | 'Retrieve' | 'Build' | 'Operate';

export interface IntentRoutingResult {
  category: IntentCategory;
  confidence: number;
  allowedTools: string[];
  maxTokensTarget: number;
  reason: string;
}

const INTENT_TOOL_MAPPINGS: Record<IntentCategory, { tools: string[]; maxTokens: number }> = {
  Inform: {
    tools: [],
    maxTokens: 500
  },
  Retrieve: {
    tools: ['execute_read_only_query', 'get_workspace_schema'],
    maxTokens: 2000
  },
  Build: {
    tools: ['create_or_update_module', 'get_workspace_schema', 'manage_module_field', 'manage_module_validation'],
    maxTokens: 3500
  },
  Operate: {
    tools: ['create_or_update_automation', 'create_or_update_connector', 'upsert_record', 'manage_module_workflow'],
    maxTokens: 2500
  }
};

/**
 * Classifies an incoming prompt into one of 4 intent buckets using fast pattern rules.
 */
export function classifyPromptIntent(prompt: string): IntentRoutingResult {
  const text = (prompt || '').trim().toLowerCase();

  // 1. Build Intent heuristics
  if (
    text.includes('create module') || 
    text.includes('build a solution') || 
    text.includes('add field') || 
    text.includes('design form') || 
    text.includes('create form') ||
    text.includes('new module') ||
    text.includes('modify layout')
  ) {
    return {
      category: 'Build',
      confidence: 0.95,
      allowedTools: INTENT_TOOL_MAPPINGS.Build.tools,
      maxTokensTarget: INTENT_TOOL_MAPPINGS.Build.maxTokens,
      reason: 'Matched build/design structural intent patterns'
    };
  }

  // 2. Operate Intent heuristics
  if (
    text.includes('create automation') || 
    text.includes('trigger when') || 
    text.includes('add workflow') || 
    text.includes('setup connector') || 
    text.includes('insert record') ||
    text.includes('update record')
  ) {
    return {
      category: 'Operate',
      confidence: 0.92,
      allowedTools: INTENT_TOOL_MAPPINGS.Operate.tools,
      maxTokensTarget: INTENT_TOOL_MAPPINGS.Operate.maxTokens,
      reason: 'Matched workflow/automation/operation intent patterns'
    };
  }

  // 3. Retrieve Intent heuristics
  if (
    text.includes('how many') || 
    text.includes('find all') || 
    text.includes('count of') || 
    text.includes('list') || 
    text.includes('search for') || 
    text.includes('select ') || 
    text.includes('report') ||
    text.includes('show records')
  ) {
    return {
      category: 'Retrieve',
      confidence: 0.90,
      allowedTools: INTENT_TOOL_MAPPINGS.Retrieve.tools,
      maxTokensTarget: INTENT_TOOL_MAPPINGS.Retrieve.maxTokens,
      reason: 'Matched query/retrieval data patterns'
    };
  }

  // 4. Default Inform Intent (Conceptual Q&A / Guidance)
  return {
    category: 'Inform',
    confidence: 0.85,
    allowedTools: INTENT_TOOL_MAPPINGS.Inform.tools,
    maxTokensTarget: INTENT_TOOL_MAPPINGS.Inform.maxTokens,
    reason: 'Informational or conceptual inquiry'
  };
}
