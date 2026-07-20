import { GoogleGenAI } from '@google/genai';
import { globalPrisma } from '../lib/prisma';
import { decryptSecret } from '../lib/crypto';

export interface ProviderPricing {
  promptPer1M: number;
  completionPer1M: number;
}

export const PROVIDER_PRICING: Record<string, ProviderPricing> = {
  // Google Gemini Models (2026)
  'gemini-3.5-flash': { promptPer1M: 0.15, completionPer1M: 0.60 },
  'gemini-3.1-pro': { promptPer1M: 1.25, completionPer1M: 5.00 },
  'gemini-3.1-flash-lite': { promptPer1M: 0.075, completionPer1M: 0.30 },
  'gemini-2.0-flash': { promptPer1M: 0.10, completionPer1M: 0.40 },

  // OpenAI Models (GPT-5.6 / GPT-5.5 2026)
  'gpt-5.6-sol': { promptPer1M: 3.50, completionPer1M: 14.00 },
  'gpt-5.6-terra': { promptPer1M: 1.20, completionPer1M: 4.80 },
  'gpt-5.6-luna': { promptPer1M: 0.20, completionPer1M: 0.80 },
  'gpt-5.5': { promptPer1M: 2.50, completionPer1M: 10.00 },
  'gpt-5.5-instant': { promptPer1M: 0.30, completionPer1M: 1.20 },
  'gpt-4o': { promptPer1M: 2.50, completionPer1M: 10.00 },
  'o3-mini': { promptPer1M: 1.10, completionPer1M: 4.40 },

  // Anthropic Claude Models (Fable 5 / Sonnet 4.6 2026)
  'claude-fable-5': { promptPer1M: 5.00, completionPer1M: 25.00 },
  'claude-sonnet-4.6': { promptPer1M: 3.00, completionPer1M: 15.00 },
  'claude-3-5-sonnet': { promptPer1M: 3.00, completionPer1M: 15.00 },
  'claude-3-5-haiku': { promptPer1M: 0.80, completionPer1M: 4.00 },

  // DeepSeek Models (V4 2026)
  'deepseek-v4-pro': { promptPer1M: 0.50, completionPer1M: 2.00 },
  'deepseek-v4-flash': { promptPer1M: 0.12, completionPer1M: 0.35 },
  'deepseek-v3': { promptPer1M: 0.14, completionPer1M: 0.28 },
  'deepseek-r1': { promptPer1M: 0.55, completionPer1M: 2.19 },

  // Groq Models
  'llama-3.3-70b-versatile': { promptPer1M: 0.59, completionPer1M: 0.79 },
  'llama-3.1-8b-instant': { promptPer1M: 0.05, completionPer1M: 0.08 },
  'mixtral-8x7b-32768': { promptPer1M: 0.24, completionPer1M: 0.24 },

  // xAI Grok Models
  'grok-4.5': { promptPer1M: 2.00, completionPer1M: 10.00 },
  'grok-2': { promptPer1M: 2.00, completionPer1M: 10.00 },

  // Local AI & Ollama (Llama 4 / Gemma 4 / Qwen 3.6 2026)
  'llama-4-maverick': { promptPer1M: 0.0, completionPer1M: 0.0 },
  'llama-4-scout': { promptPer1M: 0.0, completionPer1M: 0.0 },
  'gemma-4-26b': { promptPer1M: 0.0, completionPer1M: 0.0 },
  'qwen-3.6-35b': { promptPer1M: 0.0, completionPer1M: 0.0 },
  'ollama-local': { promptPer1M: 0.0, completionPer1M: 0.0 },
  'local': { promptPer1M: 0.0, completionPer1M: 0.0 }
};

export interface ResolvedAIClient {
  provider: string;
  model: string;
  apiKey: string;
  baseUrl?: string;
  apiExtraConfig?: any;
  zeroDataRetention: boolean;
  piiRedaction: boolean;
  isBYOK: boolean;
}

/**
 * Calculates estimated cost for token consumption
 */
export function calculateEstimatedCost(model: string, promptTokens: number, completionTokens: number): number {
  const rates = PROVIDER_PRICING[model.toLowerCase()] || { promptPer1M: 1.0, completionPer1M: 3.0 };
  const promptCost = (promptTokens / 1_000_000) * rates.promptPer1M;
  const completionCost = (completionTokens / 1_000_000) * rates.completionPer1M;
  return Number((promptCost + completionCost).toFixed(6));
}

/**
 * Resolves model name and BYOK credentials for a tenant based on requested tier or direct model identifier.
 */
export async function resolveTenantAIClient(
  tenantId: string,
  requestedModelOrTier?: string,
  customDb?: any
): Promise<ResolvedAIClient> {
  const db = customDb || globalPrisma;

  let mapping = {
    lowModel: 'gemini-3.5-flash',
    mediumModel: 'gemini-3.5-flash',
    highModel: 'gemini-3.5-flash',
    zeroDataRetention: true,
    piiRedaction: false
  };

  const getKeyModel = (client: any) => client?.tenantAIKey || client?.tenantAiKey || client?.TenantAIKey;
  const getMappingModel = (client: any) => client?.tenantAIMapping || client?.tenantAiMapping || client?.TenantAIMapping;

  try {
    const mappingModel = getMappingModel(db) || getMappingModel(globalPrisma);
    if (mappingModel) {
      const fetched = await mappingModel.findUnique({
        where: { tenantId }
      });
      if (fetched) {
        mapping = fetched as any;
      }
    }
  } catch (e) {
    console.warn('[AIProviderService] Could not fetch tenantAIMapping, using defaults:', e);
  }

  // 2. Resolve model name from tier or exact model string
  let targetModel = requestedModelOrTier || 'medium';

  if (targetModel.toLowerCase() === 'default' || targetModel.toLowerCase() === 'medium' || targetModel.toLowerCase() === 'balanced' || !targetModel) {
    targetModel = mapping.mediumModel || 'gemini-3.5-flash';
  } else if (targetModel.toLowerCase() === 'low' || targetModel.toLowerCase() === 'fast') {
    targetModel = mapping.lowModel || 'gemini-3.5-flash';
  } else if (targetModel.toLowerCase() === 'high' || targetModel.toLowerCase() === 'pro') {
    targetModel = mapping.highModel || 'gemini-3.5-flash';
  }

  // Determine target provider from model prefix or name
  let targetProvider = 'google';
  const lowerModel = targetModel.toLowerCase();
  if (lowerModel.includes('gpt') || lowerModel.includes('o1') || lowerModel.includes('o3')) {
    targetProvider = 'openai';
  } else if (lowerModel.includes('claude')) {
    targetProvider = 'anthropic';
  } else if (lowerModel.includes('grok')) {
    targetProvider = 'xai';
  } else if (lowerModel.includes('deepseek')) {
    targetProvider = 'deepseek';
  } else if (lowerModel.includes('groq') || lowerModel.includes('llama') || lowerModel.includes('mixtral')) {
    targetProvider = 'groq';
  } else if (lowerModel.includes('openrouter')) {
    targetProvider = 'openrouter';
  } else if (lowerModel.includes('azure')) {
    targetProvider = 'azure_openai';
  } else if (lowerModel.includes('bedrock')) {
    targetProvider = 'aws_bedrock';
  } else if (lowerModel.includes('ollama') || lowerModel.includes('local')) {
    targetProvider = 'ollama';
  }

  // 3. Search for active BYOK Key for this provider
  try {
    const keyModel = getKeyModel(db) || getKeyModel(globalPrisma);
    if (keyModel) {
      let keyRecord = await keyModel.findFirst({
        where: {
          tenantId,
          provider: targetProvider,
          status: 'active'
        },
        orderBy: { isDefault: 'desc' }
      });

      // If no key found for specific provider, try finding any default active BYOK key or active key
      if (!keyRecord) {
        keyRecord = await keyModel.findFirst({
          where: { tenantId, status: 'active', isDefault: true }
        });
      }

      if (!keyRecord) {
        keyRecord = await keyModel.findFirst({
          where: { tenantId, status: 'active' },
          orderBy: { createdAt: 'desc' }
        });
      }

      if (keyRecord) {
        const rawKey = decryptSecret(keyRecord.encryptedKey);
        return {
          provider: keyRecord.provider,
          model: targetModel,
          apiKey: rawKey,
          baseUrl: keyRecord.baseUrl || undefined,
          apiExtraConfig: keyRecord.apiExtraConfig,
          zeroDataRetention: mapping.zeroDataRetention,
          piiRedaction: mapping.piiRedaction,
          isBYOK: true
        };
      }
    }
  } catch (e) {
    console.warn('[AIProviderService] Could not fetch tenantAIKey, using fallback:', e);
  }

  // 4. Fallback to Server Environment Key if no BYOK key present
  const fallbackGeminiKey = process.env.GEMINI_API_KEY || '';
  return {
    provider: 'google',
    model: 'gemini-3.5-flash',
    apiKey: fallbackGeminiKey,
    zeroDataRetention: mapping.zeroDataRetention,
    piiRedaction: mapping.piiRedaction,
    isBYOK: false
  };
}

/**
 * Log usage metrics after an AI invocation
 */
export async function logAIUsageMetric(params: {
  tenantId: string;
  userId?: string;
  provider: string;
  model: string;
  tier?: string;
  feature?: string;
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
}) {
  try {
    const db = globalPrisma;
    const getMetricModel = (client: any) => client?.aiUsageMetric || client?.aIUsageMetric || client?.AIUsageMetric;
    const metricModel = getMetricModel(db);
    if (!metricModel) return;

    const totalTokens = params.promptTokens + params.completionTokens;
    const estimatedCost = calculateEstimatedCost(params.model, params.promptTokens, params.completionTokens);

    await metricModel.create({
      data: {
        tenantId: params.tenantId,
        userId: params.userId,
        provider: params.provider,
        model: params.model,
        tier: params.tier || 'custom',
        feature: params.feature || 'chat',
        promptTokens: params.promptTokens,
        completionTokens: params.completionTokens,
        totalTokens,
        estimatedCost,
        latencyMs: params.latencyMs
      }
    });
  } catch (err: any) {
    console.error('[AIProviderService] Error logging usage metric:', err.message);
  }
}

/**
 * Universal execution runner supporting Google, xAI (Grok), Groq, OpenAI, Anthropic, DeepSeek, OpenRouter, and Ollama.
 */
export async function executeAICompletion(
  client: ResolvedAIClient,
  params: {
    contents: any[];
    systemInstruction?: string;
    tools?: any[];
  }
): Promise<{ candidates: any[] }> {
  // If provider is Google or fallback Gemini key is used
  if (client.provider === 'google' || !client.provider) {
    const ai = new GoogleGenAI({ apiKey: client.apiKey });
    let apiModel = 'gemini-2.0-flash';
    if (client.model && client.model.toLowerCase().includes('pro')) {
      apiModel = 'gemini-1.5-pro';
    }
    const response = await ai.models.generateContent({
      model: apiModel,
      contents: params.contents,
      config: {
        systemInstruction: params.systemInstruction,
        tools: params.tools
      }
    });
    return response as any;
  }

  // Non-Google provider (xAI Grok, Groq, OpenAI, DeepSeek, OpenRouter, Anthropic, Ollama, etc.)
  const provider = client.provider.toLowerCase();

  // Resolve base endpoint
  let endpoint = client.baseUrl;
  if (!endpoint) {
    if (provider === 'xai') endpoint = 'https://api.x.ai/v1';
    else if (provider === 'groq') endpoint = 'https://api.groq.com/openai/v1';
    else if (provider === 'deepseek') endpoint = 'https://api.deepseek.com/v1';
    else if (provider === 'openrouter') endpoint = 'https://openrouter.ai/api/v1';
    else if (provider === 'ollama') endpoint = 'http://localhost:11434/v1';
    else if (provider === 'anthropic') endpoint = 'https://api.anthropic.com/v1';
    else endpoint = 'https://api.openai.com/v1';
  }

  // Resolve model string
  let modelStr = client.model;
  if (provider === 'xai') {
    modelStr = client.model && client.model.includes('grok-2') ? client.model : 'grok-2-latest';
  } else if (provider === 'groq') {
    modelStr = client.model && (client.model.includes('llama') || client.model.includes('mixtral') || client.model.includes('deepseek')) 
      ? client.model 
      : 'llama-3.3-70b-versatile';
  } else if (provider === 'deepseek') {
    modelStr = client.model && client.model.includes('r1') ? 'deepseek-reasoner' : 'deepseek-chat';
  } else if (provider === 'openai') {
    modelStr = client.model || 'gpt-4o';
  } else if (provider === 'anthropic') {
    modelStr = client.model || 'claude-3-5-sonnet-latest';
  }

  // Convert contents + systemInstruction to OpenAI messages format
  const messages: any[] = [];
  if (params.systemInstruction) {
    messages.push({ role: 'system', content: params.systemInstruction });
  }

  for (const item of params.contents) {
    if (typeof item === 'string') {
      messages.push({ role: 'user', content: item });
      continue;
    }

    const isModel = item.role === 'model';
    let itemText = '';
    const toolCalls: any[] = [];
    const toolResponses: any[] = [];

    if (Array.isArray(item.parts)) {
      for (const part of item.parts) {
        if (part.text) {
          if (itemText) itemText += '\n';
          itemText += part.text;
        }
        if (part.functionCall) {
          const callId = part.functionCall.id || `call_${part.functionCall.name}`;
          toolCalls.push({
            id: callId,
            type: 'function',
            function: {
              name: part.functionCall.name,
              arguments: typeof part.functionCall.args === 'string'
                ? part.functionCall.args
                : JSON.stringify(part.functionCall.args || {})
            }
          });
        }
        if (part.functionResponse) {
          const callId = part.functionResponse.id || `call_${part.functionResponse.name}`;
          toolResponses.push({
            role: 'tool',
            tool_call_id: callId,
            name: part.functionResponse.name,
            content: typeof part.functionResponse.response === 'string'
              ? part.functionResponse.response
              : JSON.stringify(part.functionResponse.response || {})
          });
        }
      }
    } else if (typeof item.parts === 'string') {
      itemText = item.parts;
    } else if (item.text) {
      itemText = item.text;
    }

    if (isModel) {
      const msgObj: any = { role: 'assistant' };
      if (itemText) msgObj.content = itemText;
      if (toolCalls.length > 0) {
        msgObj.tool_calls = toolCalls;
        if (!itemText) msgObj.content = null;
      }
      if (itemText || toolCalls.length > 0) {
        messages.push(msgObj);
      }
    } else {
      if (toolResponses.length > 0) {
        for (const tr of toolResponses) {
          messages.push(tr);
        }
      } else if (itemText) {
        messages.push({ role: 'user', content: itemText });
      }
    }
  }

function normalizeJsonSchema(schema: any): any {
  if (!schema || typeof schema !== 'object') return schema;

  const newSchema: any = Array.isArray(schema) ? [] : {};
  for (const key of Object.keys(schema)) {
    let val = schema[key];
    if (key === 'type' && typeof val === 'string') {
      newSchema[key] = val.toLowerCase();
    } else if (typeof val === 'object' && val !== null) {
      newSchema[key] = normalizeJsonSchema(val);
    } else {
      newSchema[key] = val;
    }
  }

  if (newSchema.type === 'object' && !newSchema.properties) {
    newSchema.properties = {};
  }
  if (newSchema.type === 'array' && !newSchema.items) {
    newSchema.items = { type: 'string' };
  }

  return newSchema;
}

  // Convert tools to OpenAI format
  let openAiTools: any[] | undefined = undefined;
  if (params.tools && params.tools.length > 0 && params.tools[0].functionDeclarations) {
    openAiTools = params.tools[0].functionDeclarations.map((fn: any) => ({
      type: 'function',
      function: {
        name: fn.name,
        description: fn.description,
        parameters: normalizeJsonSchema(fn.parameters) || { type: 'object', properties: {} }
      }
    }));
  }

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  if (provider === 'anthropic') {
    requestHeaders['x-api-key'] = client.apiKey;
    requestHeaders['anthropic-version'] = '2023-06-01';
  } else {
    requestHeaders['Authorization'] = `Bearer ${client.apiKey}`;
  }

  const url = provider === 'anthropic' ? `${endpoint}/messages` : `${endpoint}/chat/completions`;
  const bodyPayload: any = {
    model: modelStr,
    messages
  };

  if (openAiTools && openAiTools.length > 0) {
    bodyPayload.tools = openAiTools;
    bodyPayload.tool_choice = 'auto';
  }

  let response: any;
  let data: any;
  let attempt = 0;
  const maxRetries = 3;

  while (attempt <= maxRetries) {
    response = await fetch(url, {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify(bodyPayload)
    });

    data = await response.json();

    if (response.ok) {
      break;
    }

    const errorMsg = data?.error?.message || data?.error || response.statusText;
    const failedGen = data?.error?.failed_generation;

    if (typeof errorMsg === 'string' && (errorMsg.includes('Failed to call a function') || errorMsg.includes('failed_generation'))) {
      if (failedGen && typeof failedGen === 'string') {
        console.warn(`[AIProviderService] Recovering from Groq failed_generation:`, failedGen);
        
        let fnName = '';
        let fnArgs: any = {};
        let isFnCall = false;

        const match1 = failedGen.match(/<function\((\w+)\)\s*(\{[\s\S]*?\})\s*>(?:<\/function>)?/i);
        const match2 = failedGen.match(/<function[= ]"?(\w+)"?>\s*(\{[\s\S]*?\})\s*(?:<\/function>)?/i);
        const match3 = failedGen.match(/<tool_call>\s*(\{[\s\S]*?\})\s*<\/tool_call>/i);
        const match4 = failedGen.match(/(\w+)\s*\(\s*(\{[\s\S]*?\})\s*\)/i);

        if (match1) {
          fnName = match1[1];
          try { fnArgs = JSON.parse(match1[2]); } catch (e) {}
          isFnCall = true;
        } else if (match2) {
          fnName = match2[1];
          try { fnArgs = JSON.parse(match2[2]); } catch (e) {}
          isFnCall = true;
        } else if (match3) {
          try {
            const parsed = JSON.parse(match3[1]);
            fnName = parsed.name || parsed.function || '';
            fnArgs = parsed.arguments || parsed.args || {};
            if (fnName) isFnCall = true;
          } catch (e) {}
        } else if (match4) {
          fnName = match4[1];
          try { fnArgs = JSON.parse(match4[2]); } catch (e) {}
          if (fnName) isFnCall = true;
        }

        if (isFnCall && fnName) {
          return {
            candidates: [{
              content: {
                parts: [{
                  functionCall: {
                    id: `call_${fnName}_${Math.random().toString(36).substring(2, 7)}`,
                    name: fnName,
                    args: fnArgs
                  }
                }]
              }
            }]
          };
        }

        if (failedGen.trim()) {
          return {
            candidates: [{
              content: {
                parts: [{
                  text: failedGen
                }]
              }
            }]
          };
        }
      }

      if (bodyPayload.tools && attempt < maxRetries) {
        console.warn(`[AIProviderService] Groq failed to call function. Retrying prompt without native tool binding...`);
        delete bodyPayload.tools;
        delete bodyPayload.tool_choice;
        attempt++;
        continue;
      }
    }

    const is429 = response.status === 429 || (typeof errorMsg === 'string' && (errorMsg.includes('429') || errorMsg.includes('Rate limit') || errorMsg.includes('TPM')));

    if (is429 && attempt < maxRetries) {
      attempt++;
      let delayMs = attempt * 3000;
      const match = typeof errorMsg === 'string' && errorMsg.match(/try again in ([\d\.]+)s/i);
      if (match && match[1]) {
        delayMs = Math.ceil(parseFloat(match[1]) * 1000) + 500;
      }
      console.warn(`[AIProviderService] ${provider.toUpperCase()} 429 rate limit hit. Auto-retrying in ${(delayMs / 1000).toFixed(1)}s (Attempt ${attempt}/${maxRetries})...`);
      await new Promise(r => setTimeout(r, delayMs));
      continue;
    }

    throw new Error(`[${provider.toUpperCase()} API Error ${response.status}]: ${errorMsg}`);
  }

  // Map response back to candidate structure
  const choice = data.choices?.[0];
  const parts: any[] = [];

  let rawContent = choice?.message?.content || "";

  // Check for inline function call syntax like <function(name){json}></function> or <function(name){json}/>
  const fnMatch = rawContent && rawContent.match(/<function\((\w+)\)\s*(\{[\s\S]*?\})\s*>(?:\s*<\/function>)?/i);
  if (fnMatch) {
    const fnName = fnMatch[1];
    let fnArgs = {};
    try {
      fnArgs = JSON.parse(fnMatch[2]);
    } catch (e) {}

    parts.push({
      functionCall: {
        id: `call_${fnName}_${Math.random().toString(36).substring(2, 7)}`,
        name: fnName,
        args: fnArgs
      }
    });
  }

  // Strip all <function(...)>...</function> XML tags from rawContent
  if (rawContent) {
    rawContent = rawContent
      .replace(/<function\([\s\S]*?<\/function>/gi, '')
      .replace(/<function\([\s\S]*$/gi, '')
      .replace(/<\/function>/gi, '')
      .trim();

    if (rawContent) {
      parts.unshift({ text: rawContent });
    }
  }

  if (choice?.message?.tool_calls) {
    for (const tc of choice.message.tool_calls) {
      let parsedArgs = {};
      try {
        parsedArgs = typeof tc.function.arguments === 'string' ? JSON.parse(tc.function.arguments) : tc.function.arguments;
      } catch (e) {}
      parts.push({
        functionCall: {
          id: tc.id,
          name: tc.function.name,
          args: parsedArgs
        }
      });
    }
  }

  if (parts.length === 0) {
    parts.push({ text: "Aurora is an enterprise operating platform with AI-driven workflow automations, custom modules, data analytics, and BYOK capabilities." });
  }

  return {
    candidates: [{
      content: { parts }
    }]
  };
}
