import { GoogleGenAI, Type } from "@google/genai";
import { Module, ModuleField } from "../types/platform";
import { createFormulaContext } from "../lib/formulaEngine";
import { API_BASE_URL } from "../config";

let aiInstance: GoogleGenAI | null = null;

const getAI = () => {
  if (aiInstance) return aiInstance;
  
  const apiKey = (import.meta as any).env.VITE_GEMINI_API_KEY as string | undefined;
  if (!apiKey) {
    console.warn('[Security Warning] VITE_GEMINI_API_KEY is missing on client. AI service requests are routed through server endpoints (/api/ai/completion).');
    return null;
  }
  
  aiInstance = new GoogleGenAI({ apiKey });
  return aiInstance;
};

// In-Memory Request Deduplication & Cache Map
const pendingRequests = new Map<string, Promise<string>>();
const responseCache = new Map<string, { timestamp: number; text: string }>();
const CACHE_TTL_MS = 10000; // 10 seconds TTL cache for identical requests

const executeServerCompletion = async (
  prompt: string,
  systemInstruction?: string,
  responseMimeType?: string
): Promise<string> => {
  const cacheKey = `${prompt}__${systemInstruction || ''}__${responseMimeType || ''}`;

  // 1. Check Cache
  const cached = responseCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.text;
  }

  // 2. Deduplicate In-Flight Requests (React Double-Render & Concurrency Protection)
  if (pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey)!;
  }

  const executionPromise = (async () => {
    try {
      const tenantId = localStorage.getItem('aurora_tenant_id') || 'default-tenant';
      const authDataStr = localStorage.getItem('aurora_auth');
      let token = '';
      if (authDataStr) {
        try {
          const authData = JSON.parse(authDataStr);
          token = authData?.access_token || authData?.token || '';
        } catch (e) {}
      }

      const res = await fetch(`${API_BASE_URL}/api/ai/completion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
          'x-tenant-id': tenantId
        },
        body: JSON.stringify({
          prompt,
          systemInstruction,
          responseMimeType
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        const standardError = errJson.error || {
          code: 'HTTP_ERROR',
          title: 'AI Request Failed',
          message: `Server returned status ${res.status}`,
          technical_details: JSON.stringify(errJson)
        };
        
        // Throw structured error object for AuroraToast consumption
        const customErr: any = new Error(standardError.message || standardError.title);
        customErr.structuredError = standardError;
        throw customErr;
      }

      const data = await res.json();
      const text = data.text || '';
      
      responseCache.set(cacheKey, { timestamp: Date.now(), text });
      return text;
    } catch (err: any) {
      console.warn('[aiService] Backend AI completion execution error:', err.message);
      throw err;
    } finally {
      pendingRequests.delete(cacheKey);
    }
  })();

  pendingRequests.set(cacheKey, executionPromise);
  return executionPromise;
};

export interface AISolution {
  modules: Module[];
  workflows: {
    name: string;
    description: string;
    targetModuleId: string;
    nodes: { id: string; type: string; name: string; config?: any }[];
    edges: { id: string; source: string; target: string; condition?: string }[];
  }[];
  automations: {
    trigger: string;
    action: string;
    description: string;
    targetModuleId: string;
  }[];
  reasoning: string;
}

export interface AIDocumentTemplate {
  name: string;
  content: string;
  description: string;
  suggestedFields: string[];
}

/**
 * Generates a complete business solution based on a prompt.
 */
export const generateSolution = async (prompt: string): Promise<AISolution> => {
  const systemInstruction = `You are Aurora AI, the architect for a business operating platform. 
A user wants to build a solution for: "${prompt}".

Design a comprehensive solution including:
1. Modules to enable. Choose from pre-built modules or define entirely new custom modules.
2. For each module, define a set of tabs (e.g., "General", "Details", "Settings") to organize the data.
3. For each module, define the visual layout organized into rows and columns.
4. Use appropriate field types.
5. For each module, suggest a "Module Type" based on its function: "RECORD" (for data entries like Licences), "WORK_ITEM" (for actionable items like Applications), "REGISTRY" (for reference data), "LOG" (for audit/event data), or "FINANCIAL" (for monetary tracking).
6. Workflows with specific steps bound to a module.
7. Automations bound to a module.

Provide your response in a structured JSON format matching AISolution.`;

  const text = await executeServerCompletion(prompt, systemInstruction, 'application/json');

  try {
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr) as AISolution;
  } catch (error) {
    console.error("Failed to parse AI solution JSON:", error);
    throw new Error("Invalid response from AI service.");
  }
};

/**
 * Generates a document template based on a prompt.
 */
export const generateDocumentTemplate = async (prompt: string, moduleId?: string): Promise<AIDocumentTemplate> => {
  const systemInstruction = `You are Aurora AI, an expert in business document automation. 
A user wants to create a document template for: "${prompt}".
${moduleId ? `This template is for the module: "${moduleId}".` : ""}

Design a professional document template in HTML format with placeholders like {{field_name}}.

Provide your response in a structured JSON format matching { name, content, description, suggestedFields }.`;

  const text = await executeServerCompletion(prompt, systemInstruction, 'application/json');

  try {
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr) as AIDocumentTemplate;
  } catch (error) {
    console.error("Failed to parse AI document template JSON:", error);
    throw new Error("Invalid response from AI service.");
  }
};

/**
 * Generates a summary for a record.
 */
export const generateAISummary = async (data: any, fields: any[]): Promise<string> => {
  try {
    const dataString = JSON.stringify(data, null, 2);
    const fieldsString = JSON.stringify(fields.map((f: ModuleField) => ({ id: f.id, label: f.label, type: f.type })), null, 2);
    
    const prompt = `You are an AI assistant integrated into a CRM system. 
Generate a concise, professional summary of this record data.
Hierarchy: ${data.path || 'Root'}
Associations: ${JSON.stringify(data.associations || [])}
Fields: ${fieldsString}
Data: ${dataString}`;

    const text = await executeServerCompletion(prompt);
    return text || "Summary could not be generated.";
  } catch (error) {
    console.error("Error generating AI summary:", error);
    return "Error generating summary.";
  }
};

/**
 * Generates a calculation expression based on a prompt.
 */
export const generateExpression = async (prompt: string, fields: any[], functions: any[]): Promise<string> => {
  try {
    const fieldsString = JSON.stringify(fields.map(f => ({ label: f.label, key: f.name || f.id, type: f.type })), null, 2);
    const functionsString = JSON.stringify(functions.map(f => ({ name: f.name, template: f.template, description: f.description })), null, 2);

    const systemInstruction = `You are an expert logic architect for the Aurora Platform. 
Your task is to convert a natural language request into a valid Aurora Expression.

USER REQUEST: "${prompt}"

AVAILABLE FIELDS (Always wrap the Field Key (Slug) from the 'key' property in curly braces, e.g., {price}. Do NOT use the Field Label. Special system fields: {Record Key}):
${fieldsString}

AVAILABLE FUNCTIONS:
${functionsString}

EXTENDED FUNCTIONS (Implemented):
- POW(base, exp)
- FIND(needle, haystack, [start])
- TIMESPAN(unit, d1, d2)
- ADD_TIME(date, span)
- SUB_TIME(date, span)
- VLOOKUP(val, list, searchCol, returnCol)

STRICT RULES:
1. Return ONLY the expression string. No markdown, no comments, no intro.
2. If you don't understand the request, return a helpful comment starting with "// AI: " explaining why.
3. Use single quotes for strings: 'Value'.
4. Boolean values (e.g. checkboxes) are evaluated as string literals ('true' or 'false'). For boolean checks, compare against string literals, e.g. {boolean_field} == 'true' or {boolean_field} != 'true', instead of raw true/false.
5. Correctly handle singular vs plural requests (e.g. "first letter" = 1, "first 3 letters" = 3).
6. For collection operations (SUM, AVG, COUNT), ensure the field is a list or repeatable group.`;

    const text = await executeServerCompletion(prompt, systemInstruction);
    return text.trim().replace(/^```[a-z]*\n|```$/gi, '');
  } catch (error) {
    console.error("Error generating AI expression:", error);
    return "// Error connecting to AI service. Please try again.";
  }
};

/**
 * Fixes an expression with errors using AI.
 */
export const fixExpression = async (expression: string, errors: any[], fields: any[], functions: any[]): Promise<string> => {
  try {
    const fieldsString = JSON.stringify(fields.map(f => ({ label: f.label, key: f.name || f.id, type: f.type })), null, 2);
    const functionsString = JSON.stringify(functions.map(f => ({ name: f.name, template: f.template, description: f.description })), null, 2);
    const errorsString = JSON.stringify(errors, null, 2);

    const systemInstruction = `You are an expert logic architect for the Aurora Platform. 
The user has an expression with errors, and you need to fix it.

CURRENT EXPRESSION: "${expression}"
ERRORS: ${errorsString}

AVAILABLE FIELDS (Always wrap the Field Key (Slug) from the 'key' property in curly braces, e.g., {price}. Do NOT use the Field Label. Special system fields: {Record Key}):
${fieldsString}

AVAILABLE FUNCTIONS:
${functionsString}

STRICT RULES:
1. Return ONLY the fixed expression string. No markdown, no comments, no intro.
2. If you can't fix it, return the original expression.
3. Ensure all Field Keys (Slugs) are wrapped in curly braces {}. Do NOT use the Field Label.
4. Fix common syntax errors like missing commas, unbalanced parentheses, or wrong parameter counts.
5. Correct Field Keys if they are slightly misspelled (fuzzy match against the 'key' property).
6. Boolean values (e.g. checkboxes) are evaluated as string literals ('true' or 'false'). For boolean checks, compare against string literals, e.g. {boolean_field} == 'true' or {boolean_field} != 'true', instead of raw true/false.`;

    const text = await executeServerCompletion(`Fix expression: ${expression}`, systemInstruction);
    return text.trim().replace(/^```[a-z]*\n|```$/gi, '');
  } catch (error) {
    console.error("Error fixing AI expression:", error);
    return expression;
  }
};

/**
 * Safely evaluates calculation fields locally.
 * Supported syntax: {Field Label} or {{field_id}}
 */
export const evaluateCalculations = (
  data: Record<string, any>, 
  fields: ModuleField[], 
  globalListData: Record<string, any[]> = {}
): Record<string, any> => {
  let newData = { ...data };
  
  // Perform up to 3 passes to handle calculations that depend on other calculations
  let passes = 3;
  let hasChanges = true;

  while (passes > 0 && hasChanges) {
    hasChanges = false;
    const previousData = { ...newData };

    fields.forEach(field => {
      if (field.type === 'calculation' && field.calculationLogic) {
        try {
          let logic = field.calculationLogic;
          
          // Sort fields to prevent partial replacements
          const sortedFields = [...fields].sort((a, b) => {
            const lenA = Math.max(a.label?.length || 0, a.name?.length || 0);
            const lenB = Math.max(b.label?.length || 0, b.name?.length || 0);
            return lenB - lenA;
          });

          // Replace both {{field_id}}, {Field Label}, {field_slug}, and {{field_slug}} with actual values
          sortedFields.forEach(f => {
            let value = previousData[f.id];
            
            // Handle nested fields in groups
            if (value === undefined || value === null) {
              for (const key in previousData) {
                if (typeof previousData[key] === 'object' && previousData[key] !== null) {
                  if (previousData[key][f.id] !== undefined) {
                    value = previousData[key][f.id];
                    break;
                  }
                }
              }
            }
            
            // Default values based on field type
            if (value === undefined || value === null || value === '') {
              const numericTypes = ['number', 'currency', 'calculation'];
              value = numericTypes.includes(f.type) ? 0 : "";
            }

            const idRegex = new RegExp(`\\{\\{${f.id}\\}\\}`, 'g');
            
            const safeReplacement = typeof value === 'number' ? value.toString() : `"${value.toString().replace(/"/g, '\\"')}"`;
            
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

          // Handle system fields like Record Key
          const recordKey = previousData._record_key || "";
          logic = logic.replace(/\{Record Key\}/gi, `"${recordKey.replace(/"/g, '\\"')}"`);
          logic = logic.replace(/\{\{_record_key\}\}/g, `"${recordKey.replace(/"/g, '\\"')}"`);
          
          // Use centralized formula engine
          const context = createFormulaContext({
            getGlobalListItems: (name) => globalListData[name] || []
          });
          
          // Evaluate the logic safely using Function
          // eslint-disable-next-line no-new-func
          const func = new Function(...Object.keys(context), `return ${logic}`);
          const result = func(...Object.values(context));
          
          const finalResult = (result === undefined || result === null) ? "" : result;
          
          if (newData[field.id] !== finalResult) {
            newData[field.id] = finalResult;
            hasChanges = true;
          }
        } catch (error) {
          // If we fail on early passes, we might succeed on later ones once dependencies resolve
          if (passes === 1) {
            console.error(`Error evaluating calculation for field ${field.id}:`, error);
            newData[field.id] = "Error";
          }
        }
      }
    });
    
    passes--;
  }
  
  return newData;
};

/**
 * Generates interactive training questions based on the agent's role and scope.
 */
export const generateTrainingQuestions = async (role: string, scopeDescription: string): Promise<string[]> => {
  try {
    const ai = getAI();
    if (!ai) return [
      "What primary task should this agent perform?",
      "What databases or modules does this agent need to read from?",
      "Who should be notified if a problem is detected?"
    ];

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `You are an expert AI architect. A user is provisioning a custom AI Agent on the Aurora Operating Platform.
      Agent Role: "${role}"
      Agent Scope/Task Description: "${scopeDescription}"

      Generate a list of 3 to 4 specific, interactive questions that an administrator must answer to configure and "program" this agent's behavior, directives, logic, and operational guardrails.
      The questions should be practical, focused, and tailored exactly to this agent's role (e.g. if customer service, ask about tone, escalation; if auditor, ask about critical warning thresholds).

      Provide your response in JSON format.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            questions: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["questions"]
        } as any
      }
    });

    const parsed = JSON.parse(response.text);
    return parsed.questions || [];
  } catch (error) {
    console.error("Error generating training questions:", error);
    return [
      "What primary task should this agent perform?",
      "What databases or modules does this agent need to read from?",
      "Who should be notified if a problem is detected?"
    ];
  }
};

/**
 * Compiles training answers and knowledge sources into a final system directive prompt.
 */
export const compileAgentDirectives = async (
  role: string,
  scopeDescription: string,
  questions: string[],
  answers: string[],
  articles: { title: string; content: string }[]
): Promise<string> => {
  try {
    const ai = getAI();
    if (!ai) return `Role: ${role}\nScope: ${scopeDescription}\nDirectives compiled manually.`;

    const qas = questions.map((q, i) => `Q: ${q}\nA: ${answers[i] || "N/A"}`).join('\n');
    const articlesContent = articles.map(art => `Document: "${art.title}"\n${art.content}`).join('\n\n');

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `You are an expert AI architect. Combine this agent's configuration into a cohesive, highly effective system prompt (directives) for this AI Agent operating on the Aurora Platform.

      Agent Role: "${role}"
      Agent Scope: "${scopeDescription}"

      Knowledge Base References:
      ${articlesContent || "No specific documents connected."}

      Interactive Interview Answers:
      ${qas}

      Generate a complete, professional, and detailed system instruction prompt for this agent. It should dictate its role, workflow instructions, how it should consult the connected knowledge bases, response tone, and operational boundaries/guardrails.
      Write ONLY the generated prompt content.`,
    });

    return response.text.trim();
  } catch (error) {
    console.error("Error compiling agent directives:", error);
    return `Role: ${role}\nScope: ${scopeDescription}\nConnected Knowledge Bases: ${articles.map(a => a.title).join(', ')}`;
  }
};

/**
 * Generates a profile picture avatar using Gemini Imagen or falls back to RoboHash / DiceBear.
 */
export const generateAgentAvatar = async (description: string): Promise<string> => {
  const ai = getAI();
  if (!ai) {
    const seed = encodeURIComponent(description.trim());
    return `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}`;
  }
  
  try {
    const response = await (ai.models as any).generateImages({
      model: 'imagen-3.0-generate-002',
      prompt: `Profile avatar icon of: ${description}. Flat vector design, circular frame style, clean colors, corporate tech app dashboard asset, high quality.`,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/png',
        aspectRatio: '1:1'
      }
    });
    
    if (response.generatedImages?.[0]?.image?.imageBytes) {
      return `data:image/png;base64,${response.generatedImages[0].image.imageBytes}`;
    }
  } catch (e) {
    console.warn("Imagen generation failed, falling back to DiceBear", e);
  }
  
  const seed = encodeURIComponent(description.trim());
  return `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}`;
};

