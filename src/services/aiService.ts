import { GoogleGenAI, Type } from "@google/genai";
import { Module, ModuleField } from "../types/platform";

let aiInstance: GoogleGenAI | null = null;

const getAI = () => {
  if (aiInstance) return aiInstance;
  
  const apiKey = (import.meta as any).env.VITE_GEMINI_API_KEY as string | undefined;
  if (!apiKey) {
    console.warn('Gemini API Key (VITE_GEMINI_API_KEY) is missing. AI features will not work.');
  }
  
  // FIXED: Constructor expects an options object with apiKey
  aiInstance = new GoogleGenAI({ apiKey: apiKey || 'dummy-key' });
  return aiInstance;
};

export interface AISolution {
  modules: Module[];
  workflows: {
    name: string;
    steps: string[];
    description: string;
    targetModuleId: string;
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
                steps: { type: Type.ARRAY, items: { type: Type.STRING } },
                description: { type: Type.STRING },
                targetModuleId: { type: Type.STRING }
              },
              required: ["name", "steps", "description", "targetModuleId"]
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
 * Safely evaluates calculation fields locally.
 */
export const evaluateCalculations = (data: Record<string, any>, fields: ModuleField[]): Record<string, any> => {
  const newData = { ...data };
  
  fields.forEach(field => {
    if (field.type === 'calculation' && field.calculationLogic) {
      try {
        let logic = field.calculationLogic;
        
        // Replace {{field_id}} with actual values
        fields.forEach(f => {
          const value = data[f.id] || 0;
          // Use regex to replace all occurrences
          const regex = new RegExp(`\\{\\{${f.id}\\}\\}`, 'g');
          logic = logic.replace(regex, typeof value === 'number' ? value.toString() : `"${value}"`);
        });
        
        // Evaluate the logic safely using Function
        // eslint-disable-next-line no-new-func
        const result = new Function(`return ${logic}`)();
        newData[field.id] = result;
      } catch (error) {
        console.error(`Error evaluating calculation for field ${field.id}:`, error);
        newData[field.id] = "Error";
      }
    }
  });
  
  return newData;
};
