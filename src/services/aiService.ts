import { GoogleGenAI, Type } from "@google/genai";
import { Module, ModuleField } from "../types/platform";
import { createFormulaContext } from "../lib/formulaEngine";

let aiInstance: GoogleGenAI | null = null;

const getAI = () => {
  if (aiInstance) return aiInstance;
  
  const apiKey = (import.meta as any).env.VITE_GEMINI_API_KEY as string | undefined;
  if (!apiKey) {
    console.warn('Gemini API Key (VITE_GEMINI_API_KEY) is missing. AI features will not work.');
    return null;
  }
  
  aiInstance = new GoogleGenAI({ apiKey });
  return aiInstance;
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
  const ai = getAI();
  if (!ai) throw new Error("AI service not initialized");

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-lite",
    contents: `You are Aurora AI, the architect for a business operating platform. 
    A user wants to build a solution for: "${prompt}".
    
    Design a comprehensive solution including:
    1. Modules to enable. Choose from pre-built modules or define entirely new custom modules.
    2. For each module, define a set of tabs (e.g., "General", "Details", "Settings") to organize the data.
    3. For each module, define the visual layout organized into rows and columns.
    4. Use appropriate field types.
    5. For each module, suggest a "Module Type" based on its function: "RECORD" (for data entries like Licences), "WORK_ITEM" (for actionable items like Applications), "REGISTRY" (for reference data), "LOG" (for audit/event data), or "FINANCIAL" (for monetary tracking).
    6. Workflows with specific steps bound to a module.
    7. Automations bound to a module.
    
    Provide your response in a structured JSON format.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          modules: {
            type: Type.ARRAY,
            items: { 
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                name: { type: Type.STRING },
                description: { type: Type.STRING },
                category: { type: Type.STRING },
                isCustom: { type: Type.BOOLEAN },
                iconName: { type: Type.STRING },
                type: { type: Type.STRING, enum: ['RECORD', 'WORK_ITEM', 'REGISTRY', 'LOG', 'FINANCIAL'] },
                tabs: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      label: { type: Type.STRING }
                    },
                    required: ["id", "label"]
                  }
                },
                layout: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      columnCount: { type: Type.INTEGER },
                      tabId: { type: Type.STRING },
                      columns: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            id: { type: Type.STRING },
                            fields: {
                              type: Type.ARRAY,
                              items: {
                                type: Type.OBJECT,
                                properties: {
                                  id: { type: Type.STRING },
                                  name: { type: Type.STRING },
                                  label: { type: Type.STRING },
                                  type: { type: Type.STRING, enum: ['text', 'longText', 'number', 'checkbox', 'currency', 'email', 'phone', 'address', 'lookup', 'user', 'calculation', 'ai_summary', 'date', 'select'] },
                                  options: { type: Type.ARRAY, items: { type: Type.STRING } },
                                  required: { type: Type.BOOLEAN },
                                  placeholder: { type: Type.STRING },
                                  helperText: { type: Type.STRING }
                                },
                                required: ["id", "name", "label", "type", "required"]
                              }
                            }
                          },
                          required: ["id", "fields"]
                        }
                      }
                    },
                    required: ["id", "columnCount", "columns"]
                  }
                }
              },
              required: ["id", "name", "description", "category", "isCustom", "iconName", "type", "layout"]
            }
          },
          workflows: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                description: { type: Type.STRING },
                targetModuleId: { type: Type.STRING },
                nodes: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      type: { type: Type.STRING, enum: ['STATUS', 'DECISION', 'ACTION', 'DELAY', 'START', 'END'] },
                      name: { type: Type.STRING },
                      config: { type: Type.OBJECT }
                    },
                    required: ["id", "type", "name"]
                  }
                },
                edges: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      source: { type: Type.STRING },
                      target: { type: Type.STRING },
                      condition: { type: Type.STRING }
                    },
                    required: ["id", "source", "target"]
                  }
                }
              },
              required: ["name", "description", "targetModuleId", "nodes", "edges"]
            }
          },
          automations: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                trigger: { type: Type.STRING },
                action: { type: Type.STRING },
                description: { type: Type.STRING },
                targetModuleId: { type: Type.STRING }
              },
              required: ["trigger", "action", "description", "targetModuleId"]
            }
          },
          reasoning: { type: Type.STRING }
        },
        required: ["modules", "workflows", "automations", "reasoning"]
      } as any
    }
  });

  try {
    return JSON.parse(response.text) as AISolution;
  } catch (error) {
    console.error("Failed to parse AI solution JSON:", error);
    throw new Error("Invalid response from AI service.");
  }
};

/**
 * Generates a document template based on a prompt.
 */
export const generateDocumentTemplate = async (prompt: string, moduleId?: string): Promise<AIDocumentTemplate> => {
  const ai = getAI();
  if (!ai) throw new Error("AI service not initialized");

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-lite",
    contents: `You are Aurora AI, an expert in business document automation. 
    A user wants to create a document template for: "${prompt}".
    ${moduleId ? `This template is for the module: "${moduleId}".` : ""}
    
    Design a professional document template in HTML format with placeholders like {{field_name}}.
    
    Provide your response in a structured JSON format.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          content: { type: Type.STRING },
          description: { type: Type.STRING },
          suggestedFields: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["name", "content", "description", "suggestedFields"]
      } as any
    }
  });

  try {
    return JSON.parse(response.text) as AIDocumentTemplate;
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
    const ai = getAI();
    const dataString = JSON.stringify(data, null, 2);
    const fieldsString = JSON.stringify(fields.map((f: ModuleField) => ({ id: f.id, label: f.label, type: f.type })), null, 2);
    
    const prompt = `You are an AI assistant integrated into a CRM system. 
Generate a concise, professional summary of this record data.
Hierarchy: ${data.path || 'Root'}
Associations: ${JSON.stringify(data.associations || [])}
Fields: ${fieldsString}
Data: ${dataString}`;

    // FIXED: Use a valid model name
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: prompt,
    });
    
    return response.text || "Summary could not be generated.";
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
    const ai = getAI();
    if (!ai) return "// Gemini API Key missing. Please check your .env file.";

    const fieldsString = JSON.stringify(fields.map(f => ({ label: f.label, key: f.name || f.id, type: f.type })), null, 2);
    const functionsString = JSON.stringify(functions.map(f => ({ name: f.name, template: f.template, description: f.description })), null, 2);

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: `You are an expert logic architect for the Aurora Platform. 
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
      4. For boolean values, use true/false (no quotes).
      5. Correctly handle singular vs plural requests (e.g. "first letter" = 1, "first 3 letters" = 3).
      6. For collection operations (SUM, AVG, COUNT), ensure the field is a list or repeatable group.`,
    });

    return response.text.trim().replace(/^```[a-z]*\n|```$/gi, '');
  } catch (error) {
    console.error("Error generating AI expression:", error);
    return "// Error connecting to Gemini. Please try again.";
  }
};

/**
 * Fixes an expression with errors using AI.
 */
export const fixExpression = async (expression: string, errors: any[], fields: any[], functions: any[]): Promise<string> => {
  try {
    const ai = getAI();
    if (!ai) return expression;

    const fieldsString = JSON.stringify(fields.map(f => ({ label: f.label, key: f.name || f.id, type: f.type })), null, 2);
    const functionsString = JSON.stringify(functions.map(f => ({ name: f.name, template: f.template, description: f.description })), null, 2);
    const errorsString = JSON.stringify(errors, null, 2);

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: `You are an expert logic architect for the Aurora Platform. 
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
      5. Correct Field Keys if they are slightly misspelled (fuzzy match against the 'key' property).`,
    });

    return response.text.trim().replace(/^```[a-z]*\n|```$/gi, '');
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

