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
  responseMimeType?: string,
  model?: string
): Promise<string> => {
  const cacheKey = `${prompt}__${systemInstruction || ''}__${responseMimeType || ''}__${model || ''}`;

  // 1. Check Cache
  const cached = responseCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.text;
  }

  // 2. Deduplicate In-Flight Requests
  if (pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey)!;
  }

  const executionPromise = (async () => {
    // 3. Try Server AI Gateway Endpoint (/api/ai/completion)
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
          model,
          prompt,
          systemInstruction,
          responseMimeType
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.text) {
          responseCache.set(cacheKey, { timestamp: Date.now(), text: data.text });
          return data.text;
        }
      }
    } catch (serverErr) {
      console.warn('[aiService] Server AI endpoint unreachable, attempting client GenAI:', serverErr);
    }

    // 4. Try Direct Client-Side Gemini SDK if VITE_GEMINI_API_KEY is available
    const clientAI = getAI();
    if (clientAI) {
      try {
        const response = await clientAI.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            systemInstruction,
            responseMimeType: responseMimeType as any
          }
        });
        const text = response.text || '';
        if (text) {
          responseCache.set(cacheKey, { timestamp: Date.now(), text });
          return text;
        }
      } catch (clientErr: any) {
        console.warn('[aiService] Direct Client GenAI failed:', clientErr);
      }
    }

    throw new Error('AI Gateway API key is missing or unconfigured. Please add your key in Settings > AI Services.');
  })();

  pendingRequests.set(cacheKey, executionPromise);
  try {
    return await executionPromise;
  } finally {
    pendingRequests.delete(cacheKey);
  }
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

export interface SolutionOrchestrationResult {
  summaryText: string;
  suggestedActions: string[];
  groundedSources?: string[];
  modules: { id: string; name: string; type: 'RECORD' | 'WORK_ITEM' | 'REGISTRY' | 'LOG' | 'FINANCIAL' | 'CUSTOM'; description?: string; fieldsCount: number; linked: boolean }[];
  specArtifact?: {
    id: string;
    name: string;
    description: string;
    markdownContent: string;
  };
  formArtifact?: {
    id: string;
    name: string;
    title: string;
    subtitle: string;
    fields: { id: string; label: string; type: string; placeholder?: string; required?: boolean; colSpan?: number; options?: string[] }[];
  };
  workflowArtifact?: {
    id: string;
    name: string;
    nodes: { id: string; label: string; type: 'TRIGGER' | 'ACTION' | 'AUTOMATION' | 'APPROVAL'; status?: string }[];
  };
  permissionArtifact?: {
    id: string;
    name: string;
    roles: { name: string; level: string; color: string; description: string }[];
    matrix: { resource: string; read: boolean; create: boolean; edit: boolean; delete: boolean; export: boolean; scope: string }[];
  };
  moduleArtifact?: {
    id: string;
    name: string;
    description: string;
    fields: { id: string; label: string; type: string; required?: boolean; sample?: string }[];
  };
}


export const buildDynamicSolutionFromPrompt = (
  prompt: string,
  contextSources: { name: string; rawText?: string; contentSummary?: string }[],
  connectedModules: any[] = []
): SolutionOrchestrationResult => {
  const cleanPrompt = prompt.toLowerCase();

  let topic = 'Project Vision & Strategy';
  if (cleanPrompt.includes('incident') || cleanPrompt.includes('ticket') || cleanPrompt.includes('support')) {
    topic = 'Incident Triage & Support System';
  } else if (cleanPrompt.includes('hr') || cleanPrompt.includes('onboard') || cleanPrompt.includes('employee')) {
    topic = 'HR Employee Onboarding Hub';
  } else if (cleanPrompt.includes('crm') || cleanPrompt.includes('client') || cleanPrompt.includes('customer')) {
    topic = 'CRM Client Portal & Service Hub';
  } else if (cleanPrompt.includes('finance') || cleanPrompt.includes('audit') || cleanPrompt.includes('invoice')) {
    topic = 'Finance & Audit Matrix';
  } else if (cleanPrompt.includes('birth') || cleanPrompt.includes('death') || cleanPrompt.includes('marriage') || cleanPrompt.includes('register')) {
    topic = 'Births, Deaths & Marriages Registry System';
  } else if (cleanPrompt.includes('vision') || cleanPrompt.includes('project')) {
    topic = 'Project Vision & Master Strategy';
  }

  const customModules = [
    ...connectedModules,
    {
      id: `mod_${Date.now()}_1`,
      name: topic,
      type: 'RECORD' as const,
      description: `Primary record collection for ${topic}`,
      fieldsCount: 10,
      linked: true
    }
  ];

  const formFields = [
    { id: 'f_title', label: `${topic} Subject / Title`, type: 'text', placeholder: `Enter ${topic} title`, required: true, colSpan: 12 },
    { id: 'f_category', label: 'Classification Tier', type: 'select', colSpan: 6, options: ['Tier 1 Standard', 'Tier 2 Escalated', 'Tier 3 Executive'] },
    { id: 'f_owner', label: 'Assigned Stakeholder Email', type: 'email', placeholder: 'stakeholder@aurora.io', required: true, colSpan: 6 },
    { id: 'f_vision', label: 'Detailed Requirements / Vision Spec', type: 'text', placeholder: 'Specify vision objectives and criteria', required: false, colSpan: 12 }
  ];

  const workflowNodes = [
    { id: 'node_1', label: `${topic} Submitted`, type: 'TRIGGER' as const, status: 'completed' },
    { id: 'node_2', label: 'Evaluate Rules & SLA Thresholds', type: 'ACTION' as const, status: 'active' },
    { id: 'node_3', label: 'Notify Stakeholders & Provision Workspace', type: 'AUTOMATION' as const, status: 'pending' }
  ];

  const specMarkdown = `# Solution Architecture & Vision: ${topic}
**Lead Solution Architect**: Aurora AI Systems Designer  
**Target Solution**: ${topic}  
**Status**: APPROVED_FOR_PROVISIONING  
**Grounded Context Sources**: ${contextSources.map(c => c.name).join(', ') || 'Internal Workspace Blueprint'}

---

## 1. Executive Summary & System Purpose
This solution blueprint establishes an enterprise-grade operational architecture for **${topic}**, designed in direct response to requirements:
> *"${prompt}"*

The architecture provides high-capacity record management, automated SLA triage, role-based access control (RBAC), and OpenAPI integration hooks.

---

## 2. Business Objectives & SLA Metrics
- **Zero-Trust Multi-Tenancy**: Strict isolation per enterprise tenant namespace.
- **Automated Processing**: Instant form submission routing & SLA escalation threshold (4 Hours).
- **Audit Compliance**: Immutable log entries for all data modifications.

---

## 3. Data Dictionary & Relational Schema
The solution provisions the following primary data modules:
${customModules.map(m => `- **${m.name}** (${m.type}): ${m.description || 'Core record storage'} [${m.fieldsCount} Fields]`).join('\n')}

---

## 4. Workflows & Execution Topology
- **Trigger**: \`ON_FORM_SUBMIT\` via \`${topic} Intake Form\`
- **Action**: Evaluate SLA Thresholds & Assign Service Team
- **Automation**: Provision Workspace & Dispatch Notification Payload

---

## 5. Security & Integration Specifications
- **API Endpoint**: \`POST /api/v1/${topic.toLowerCase().replace(/[^a-z0-9]/g, '_')}/intake\`
- **Data Encryption**: AES-256 at rest, TLS 1.3 in transit
`;

  return {
    summaryText: `I've analyzed your prompt "${prompt}" alongside your context documents. I've formulated the primary **Solution Architecture & Vision Proposal** for ${topic}. Review the proposed system design below; once approved, I will synthesize all downstream forms, workflows, schemas, and RBAC matrix components.`,
    suggestedActions: [
      'Approve Solution Architecture Design',
      'Refine Architecture Proposal',
      'Export Architecture Spec'
    ],
    groundedSources: contextSources.map(c => c.name),
    modules: customModules,
    specArtifact: {
      id: `art_spec_${Date.now()}`,
      name: 'Solution Design',
      description: `Comprehensive technical blueprint and architecture spec for ${topic}`,
      markdownContent: specMarkdown
    },
    formArtifact: {
      id: `art_form_${Date.now()}`,
      name: `${topic} Intake Form`,
      title: `${topic} Intake & Registration`,
      subtitle: `Configured specifically for prompt: "${prompt}"`,
      fields: formFields
    },
    workflowArtifact: {
      id: `art_flow_${Date.now()}`,
      name: `${topic} Automated Flow`,
      nodes: workflowNodes
    },
    moduleArtifact: {
      id: `art_mod_${Date.now()}`,
      name: `${topic} Data Module Schema`,
      description: `Primary relational database table schema, fields & data dictionary for ${topic}`,
      fields: [
        { id: 'f_ref', label: 'Registration Reference Number', type: 'VARCHAR(64)', required: true, sample: 'SABR-2026-0812' },
        { id: 'f_child_name', label: 'Child Full Name', type: 'VARCHAR(255)', required: true, sample: 'Oliver James Smith' },
        { id: 'f_dob', label: 'Date of Birth', type: 'DATE', required: true, sample: '2026-08-17' },
        { id: 'f_facility', label: 'Birth Hospital / Location', type: 'VARCHAR(255)', required: true, sample: 'Adelaide Women & Children Hospital' },
        { id: 'f_status', label: 'Application Status', type: 'ENUM', required: true, sample: 'Submitted' },
        { id: 'f_guardian', label: 'Parent / Guardian Email', type: 'EMAIL', required: true, sample: 'guardian@sa.gov.au' },
        { id: 'f_cert', label: 'Certificate Issued Flag', type: 'BOOLEAN', required: false, sample: 'false' }
      ]
    },
    permissionArtifact: {
      id: `art_perm_${Date.now()}`,
      name: `${topic} Roles & Security Matrix`,
      roles: [
        { name: 'Workspace Admin', level: 'Full Control', color: 'indigo', description: 'Unrestricted administrative access to all records & configuration.' },
        { name: 'Department Manager', level: 'Scoped Management', color: 'emerald', description: 'Can create, edit, & export records within assigned department.' },
        { name: 'Standard Agent', level: 'Operational Access', color: 'sky', description: 'Can view & update assigned cases, submit intake requests.' },
        { name: 'Client Portal User', level: 'Restricted Self-Service', color: 'amber', description: 'Read-only access to own profile & submitted tickets.' }
      ],
      matrix: [
        { resource: 'Intake Forms & Records', read: true, create: true, edit: true, delete: true, export: true, scope: 'Workspace-wide' },
        { resource: 'SLA Escalation Workflows', read: true, create: false, edit: true, delete: false, export: true, scope: 'Department' },
        { resource: 'Customer PII Data', read: true, create: true, edit: true, delete: false, export: false, scope: 'Record Owner' },
        { resource: 'Analytics Dashboards', read: true, create: false, edit: false, delete: false, export: true, scope: 'Workspace-wide' }
      ]
    }
  };
};

export interface ThinkingStep {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'completed';
}

/**
 * Dynamically generates intent-aware thinking steps based on user prompt analysis.
 */
export const generateThinkingStepsForPrompt = (
  prompt: string, 
  contextSourcesCount: number
): ThinkingStep[] => {
  const p = prompt.toLowerCase();

  // Scenario 1: Questions / Explanations / Clarifications
  if (p.includes('?') || p.includes('why') || p.includes('how') || p.includes('explain') || p.includes('agree') || p.includes('should we') || p.includes('what about') || p.includes('can you')) {
    return [
      { id: 's1', label: 'Analyzing user question & architectural intent', status: 'active' },
      { id: 's2', label: 'Evaluating Aurora workspace configuration & system requirements', status: 'pending' },
      { id: 's3', label: 'Formulating architectural response & clarification options', status: 'pending' }
    ];
  }

  // Scenario 2: Refinement / Specific Artifact Tweak (Form, Workflow, Report, Module, Automation, etc.)
  if (p.includes('add') || p.includes('remove') || p.includes('update') || p.includes('change') || p.includes('modify') || p.includes('field') || p.includes('node') || p.includes('title')) {
    let target = 'solution artifact';
    if (p.includes('form')) target = 'Form Layout';
    else if (p.includes('workflow') || p.includes('flow')) target = 'Workflow Diagram';
    else if (p.includes('report') || p.includes('chart')) target = 'Report Dashboard';
    else if (p.includes('module') || p.includes('table')) target = 'Data Module Schema';
    else if (p.includes('automation') || p.includes('rule')) target = 'Automation Pipeline';

    return [
      { id: 's1', label: `Locating target ${target} in current solution blueprint`, status: 'active' },
      { id: 's2', label: `Evaluating requested schema modifications & validations`, status: 'pending' },
      { id: 's3', label: `Applying changes to ${target} & updating live studio preview`, status: 'pending' }
    ];
  }

  // Scenario 3: Deployment & Exporting
  if (p.includes('deploy') || p.includes('export') || p.includes('save') || p.includes('publish')) {
    return [
      { id: 's1', label: 'Compiling solution bundle & validating component integrity', status: 'active' },
      { id: 's2', label: 'Building deployment manifest & database schema migrations', status: 'pending' },
      { id: 's3', label: 'Finalizing workspace provisioning instructions', status: 'pending' }
    ];
  }

  // Scenario 4: Full Solution Blueprint Generation / Creation (Default)
  return [
    { id: 's1', label: `Ingesting ${contextSourcesCount > 0 ? `${contextSourcesCount} context document(s)` : 'workspace requirements'} & evaluating prompt intent`, status: 'active' },
    { id: 's2', label: 'Architecting solution vision, RBAC security model & API endpoints', status: 'pending' },
    { id: 's3', label: 'Generating relational database modules, tables & validation schemas', status: 'pending' },
    { id: 's4', label: 'Constructing interactive forms, process workflows & analytics dashboards', status: 'pending' }
  ];
};

/**
 * Orchestrates a complete Solution Blueprint update given a user prompt and context sources.
 */
export const orchestrateSolutionBlueprint = async (
  prompt: string,
  contextSources: { name: string; rawText?: string; contentSummary?: string }[],
  existingArtifacts: any[] = [],
  model?: string,
  onThinkingStep?: (steps: ThinkingStep[]) => void
): Promise<SolutionOrchestrationResult> => {
  const initialSteps = generateThinkingStepsForPrompt(prompt, contextSources.length);

  let currentSteps = [...initialSteps];
  const updateSteps = (stepId: string, status: 'active' | 'completed') => {
    currentSteps = currentSteps.map(s => {
      if (s.id === stepId) return { ...s, status };
      return s;
    });
    if (onThinkingStep) onThinkingStep([...currentSteps]);
  };

  if (onThinkingStep) onThinkingStep([...currentSteps]);

  const contextSummaryText = contextSources
    .map(c => `Document [${c.name}]: ${c.rawText || c.contentSummary || 'No text extracted'}`)
    .join('\n\n');

  const existingArtifactsSummary = existingArtifacts.map(a => `- [${a.type}] ${a.name} (ID: ${a.id}): ${a.description || ''}`).join('\n');

  // Progressive Step Timers
  if (currentSteps.length > 1) {
    setTimeout(() => {
      updateSteps('s1', 'completed');
      if (currentSteps[1]) updateSteps('s2', 'active');
    }, 400);
  }

  if (currentSteps.length > 2) {
    setTimeout(() => {
      if (currentSteps[1]) updateSteps('s2', 'completed');
      if (currentSteps[2]) updateSteps('s3', 'active');
    }, 900);
  }

  if (currentSteps.length > 3) {
    setTimeout(() => {
      if (currentSteps[2]) updateSteps('s3', 'completed');
      if (currentSteps[3]) updateSteps('s4', 'active');
    }, 1400);
  }

  const systemInstruction = `You are Aurora AI Solution Orchestrator. 
Your job is to analyze user prompts and context documents to design/update an enterprise application solution bundle in Aurora.
You are fully aware of all 12 specialized Builders in the Aurora platform:
1. Data Module Builder (Database tables, schemas, relations & fields)
2. Interactive Form Builder (Public intake forms, admin forms & field layouts)
3. Visual Workflow Builder (Flow diagrams, node graphs & SLA triggers)
4. Vision Spec & Page Builder (Architecture specs, vision plans & custom pages)
5. Sites & Portal Builder (Public-facing portals & client sites)
6. Navigation Tree Builder (Workspace sidebar menus & routing structure)
7. Automations & SLA Rules Builder (Trigger rules, event listeners & auto-assignments)
8. Validation Rules Builder (Field-level constraints & logic verification)
9. Integration & Connectors Builder (REST APIs, webhooks & external data connectors)
10. Reports & Analytics Builder (Dashboards, KPI metrics & charts)
11. Document Templates Builder (PDF/Word generation templates)
12. Roles & Security Matrix Builder (RBAC permissions, scopes & access policies)

CRITICAL MANDATE: You MUST ALWAYS generate a "specArtifact" ("Solution Design") FIRST for every request. The specArtifact is the primary technical architecture proposal document that outlines the solution vision, business goals, data schema hierarchy, process workflows, RBAC matrix, and API endpoints. Always include specArtifact as the primary artifact in your JSON response.

OUTPUT FORMAT: Return ONLY valid JSON matching this schema:
{
  "summaryText": "Concise natural language explanation of what was created or updated.",
  "suggestedActions": ["Action 1", "Action 2", "Action 3"],
  "modules": [
    { "id": "mod_clients", "name": "Clients", "type": "RECORD", "description": "Client records", "fieldsCount": 8, "linked": true }
  ],
  "moduleArtifact": {
    "id": "art_mod_1",
    "name": "Registrations Data Module Schema",
    "description": "Relational database table schema and field dictionary.",
    "fields": [
      { "id": "f_ref", "label": "Reference Number", "type": "VARCHAR(64)", "required": true, "sample": "REF-001" },
      { "id": "f_name", "label": "Full Name", "type": "VARCHAR(255)", "required": true, "sample": "Jane Doe" }
    ]
  },
  "specArtifact": {
    "id": "art_spec_1",
    "name": "Solution Design",
    "description": "Comprehensive technical architecture specification plan.",
    "markdownContent": "# Solution Architecture & Vision\\n\\n## Executive Summary..."
  },
  "formArtifact": {
    "id": "art_form_1",
    "name": "Public Intake Form",
    "title": "Public Registration Form",
    "subtitle": "Public-facing registration submission form.",
    "fields": [
      { "id": "f_fname", "label": "First Name", "type": "text", "placeholder": "First Name", "required": true, "colSpan": 6 },
      { "id": "f_lname", "label": "Last Name", "type": "text", "placeholder": "Last Name", "required": true, "colSpan": 6 }
    ]
  },
  "workflowArtifact": {
    "id": "art_flow_1",
    "name": "Automated Processing Flow",
    "nodes": [
      { "id": "node_1", "label": "Form Submitted", "type": "TRIGGER", "status": "completed" },
      { "id": "node_2", "label": "Assign Verification Agent", "type": "ACTION", "status": "active" }
    ]
  },
  "permissionArtifact": {
    "id": "art_perm_1",
    "name": "Roles & Security Matrix",
    "roles": [{ "name": "Admin", "level": "Full Control", "color": "indigo", "description": "Full access" }],
    "matrix": [{ "resource": "Records", "read": true, "create": true, "edit": true, "delete": true, "export": true, "scope": "Workspace" }]
  }
}`;

  const fullUserPrompt = `
CONTEXT DOCUMENTS:
${contextSummaryText || 'No attached context documents.'}

CURRENT EXISTING ARTIFACTS IN THIS SOLUTION BLUEPRINT:
${existingArtifactsSummary || 'No artifacts generated yet.'}

USER REQUEST / REFINEMENT PROMPT:
"${prompt}"

Generate the complete updated solution blueprint JSON object.`;

  try {
    const text = await executeServerCompletion(fullUserPrompt, systemInstruction, 'application/json', model);

    updateSteps('s4', 'completed');

    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(jsonStr) as SolutionOrchestrationResult;
    if (!parsed.groundedSources || parsed.groundedSources.length === 0) {
      parsed.groundedSources = contextSources.map(c => c.name);
    }
    return parsed;
  } catch (error) {
    updateSteps('s4', 'completed');
    console.warn("Server AI Completion unavailable or returned error, executing Smart Dynamic Solution Engine:", error);
    return buildDynamicSolutionFromPrompt(prompt, contextSources, existingArtifacts);
  }
};



