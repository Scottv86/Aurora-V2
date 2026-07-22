import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-tenant-id',
}

// Global In-Memory Request Queue for Rate Limiting / Debouncing (5 RPM Protection)
interface QueuedRequest {
  id: string;
  execute: () => Promise<Response>;
}

const requestQueue: QueuedRequest[] = [];
let isProcessingQueue = false;
const MIN_REQUEST_INTERVAL_MS = 12000; // 12 seconds per request = max 5 RPM

async function processQueue() {
  if (isProcessingQueue) return;
  isProcessingQueue = true;

  while (requestQueue.length > 0) {
    const item = requestQueue.shift();
    if (item) {
      try {
        await item.execute();
      } catch (err) {
        console.error('[AI Gateway Queue] Execution Error:', err);
      }
    }
    if (requestQueue.length > 0) {
      await new Promise((res) => setTimeout(res, MIN_REQUEST_INTERVAL_MS));
    }
  }

  isProcessingQueue = false;
}

/**
 * Standardized Error Response Contract Mapping ("Mullet" UI Backend Contract)
 */
function buildStandardErrorResponse(status: number, rawError: any): Response {
  let code = "INTERNAL_ERROR";
  let title = "AI System Error";
  let message = "An unexpected error occurred while communicating with the AI Gateway.";

  const rawJsonStr = typeof rawError === 'string' 
    ? rawError 
    : JSON.stringify(rawError, null, 2);

  if (status === 429 || rawJsonStr.includes("429") || rawJsonStr.includes("RESOURCE_EXHAUSTED") || rawJsonStr.includes("quota")) {
    status = 429;
    code = "RATE_LIMIT_EXCEEDED";
    title = "AI Quota Reached";
    message = "The AI is currently processing too many requests. Please wait a moment.";
  } else if (status === 401 || status === 403 || rawJsonStr.includes("INVALID_ARGUMENT") || rawJsonStr.includes("unauthorized") || rawJsonStr.includes("API key")) {
    code = "INVALID_KEY";
    title = "Invalid AI Gateway Key";
    message = "Your AI Gateway key is invalid or lacks proper permission.";
  } else if (status >= 500 || rawJsonStr.includes("503") || rawJsonStr.includes("UNAVAILABLE")) {
    code = "SERVICE_UNAVAILABLE";
    title = "AI Provider Unavailable";
    message = "The upstream AI provider service is currently unavailable. Please try again shortly.";
  }

  const payload = {
    success: false,
    error: {
      code,
      title,
      message,
      technical_details: rawJsonStr
    }
  };

  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

serve(async (req) => {
  // Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const tenantId = req.headers.get('x-tenant-id') || 'default-tenant';
    const body = await req.json();
    const { model, prompt, contents, systemInstruction, tierOverride, connectorConfig } = body;

    // Supabase Admin Client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch Tenant AI Credentials / Mappings
    let tier = tierOverride || 'tier1';
    let targetModel = model || 'gemini-3.1-flash-lite'; // Default: Free tier model

    // -------------------------------------------------------------
    // 4-Tier Architecture Resolution
    // -------------------------------------------------------------
    let endpointUrl = '';
    let apiKey = '';
    let customHeaders: Record<string, string> = {};
    let providerType = 'google';

    if (tier === 'tier2') {
      // Tier 2: Tenant-Hosted Native AI (Enterprise VPC Endpoint)
      endpointUrl = connectorConfig?.vpcEndpoint || Deno.env.get('ENTERPRISE_VPC_AI_URL') || '';
      apiKey = connectorConfig?.authToken || Deno.env.get('ENTERPRISE_VPC_AUTH_TOKEN') || '';
      providerType = 'custom_vpc';
    } else if (tier === 'tier3') {
      // Tier 3: OpenRouter & BYOK (Supabase Vault Encrypted Keys)
      const { data: keyRecord } = await supabase
        .from('tenant_ai_keys')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('status', 'active')
        .order('is_default', { ascending: false })
        .maybeSingle();

      if (keyRecord) {
        apiKey = keyRecord.decrypted_key || keyRecord.encrypted_key;
        providerType = keyRecord.provider || 'openrouter';
        endpointUrl = keyRecord.base_url || 'https://openrouter.ai/api/v1';
      } else {
        // Fallback to default OpenRouter environment key if present
        apiKey = Deno.env.get('OPENROUTER_API_KEY') || '';
        providerType = 'openrouter';
        endpointUrl = 'https://openrouter.ai/api/v1';
      }
    } else if (tier === 'tier4') {
      // Tier 4: Custom Models (OpenAI API-Compatible Local Endpoints / Ollama)
      endpointUrl = connectorConfig?.baseUrl || 'http://localhost:11434/v1';
      apiKey = connectorConfig?.apiKey || 'ollama';
      customHeaders = connectorConfig?.customHeaders || {};
      providerType = 'openai_compatible';
    } else {
      // Tier 1: Aurora Native AI (Default Zero-Config Baseline)
      // Standard Free Tier: gemini-3.1-flash-lite or gemini-2.0-flash using standard GEMINI_API_KEY
      targetModel = 'gemini-3.1-flash-lite';
      apiKey = Deno.env.get('GEMINI_API_KEY') || '';
      endpointUrl = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`;
      providerType = 'google';
    }

    if (!apiKey && providerType !== 'custom_vpc') {
      return buildStandardErrorResponse(401, {
        message: `Missing API key for ${providerType} (${tier}). Please configure an active API key in Settings > AI Services.`
      });
    }

    // -------------------------------------------------------------
    // Execute Request through In-Memory Queue (Debounce & Rate Limit Protection)
    // -------------------------------------------------------------
    return await new Promise<Response>((resolve) => {
      const executeCall = async (): Promise<Response> => {
        try {
          let response: Response;

          if (providerType === 'google') {
            const googlePayload = {
              contents: contents || [{ role: 'user', parts: [{ text: prompt }] }],
              systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined
            };

            response = await fetch(endpointUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(googlePayload)
            });
          } else {
            // OpenAI Compatible / OpenRouter / VPC Endpoints
            const messages = [];
            if (systemInstruction) messages.push({ role: 'system', content: systemInstruction });
            messages.push({ role: 'user', content: prompt || (contents?.[0]?.parts?.[0]?.text) || '' });

            response = await fetch(`${endpointUrl.replace(/\/$/, '')}/chat/completions`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                ...customHeaders
              },
              body: JSON.stringify({
                model: targetModel,
                messages
              })
            });
          }

          if (!response.ok) {
            const errorText = await response.text();
            const res = buildStandardErrorResponse(response.status, errorText);
            resolve(res);
            return res;
          }

          const resData = await response.json();
          let extractedText = '';

          if (providerType === 'google') {
            extractedText = resData.candidates?.[0]?.content?.parts?.[0]?.text || '';
          } else {
            extractedText = resData.choices?.[0]?.message?.content || '';
          }

          const successRes = new Response(
            JSON.stringify({
              success: true,
              text: extractedText,
              tierUsed: tier,
              model: targetModel,
              provider: providerType,
              rawResponse: resData
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );

          resolve(successRes);
          return successRes;
        } catch (err: any) {
          const errRes = buildStandardErrorResponse(500, err.message || err);
          resolve(errRes);
          return errRes;
        }
      };

      // Add to Gateway Queue
      requestQueue.push({ id: Math.random().toString(), execute: executeCall });
      processQueue();
    });

  } catch (err: any) {
    return buildStandardErrorResponse(500, err.message || err);
  }
})
