/// <reference types="vite/client" />
import { GoogleGenAI, Type } from "@google/genai";


let aiInstance: GoogleGenAI | null = null;

const getAI = () => {
  if (aiInstance) return aiInstance;
  
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('Gemini API Key is missing. AI features will not work.');
    // Return a dummy object or handle locally if possible, 
    // but at least don't crash the whole app.
  }
  
  aiInstance = new GoogleGenAI(apiKey || 'dummy-key');
  return aiInstance;
};

export interface AISolution {
  modules: {
    id: string;
    name: string;
    description: string;
    category: string;
    isCustom: boolean;
    iconName: string;
    tabs?: { id: string; label: string }[];
    layout: {
      id: string;
      columnCount: number;
      tabId?: string;
      columns: {
        id: string;
        fields: {
          id: string;
          name: string;
          label: string;
          type: 'text' | 'longText' | 'number' | 'checkbox' | 'currency' | 'email' | 'phone' | 'address' | 'lookup' | 'user' | 'calculation' | 'ai_summary' | 'date' | 'select';
          options?: string[];
          required: boolean;
          placeholder?: string;
          helperText?: string;
        }[];
      }[];
    }[];
  }[];
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

export const generateSolution = async (prompt: string): Promise<AISolution> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: `You are Aurora AI, the architect for a business operating platform. 
    A user wants to build a solution for: "${prompt}".
    
    Design a comprehensive solution including:
    1. Modules to enable. Choose from pre-built modules or define entirely new custom modules.
    2. For each module, define a set of tabs (e.g., "General", "Details", "Settings") to organize the data if it is complex.
    3. For each module, define the visual layout. Group related fields into rows. A row can have 1, 2, 3, or 4 columns. Place fields inside these columns. Assign each row to a specific tab using its tabId.
    4. Use appropriate field types (text, longText, number, checkbox, currency, email, phone, address, lookup, user, calculation, ai_summary, date, select).
    5. Workflows with specific steps bound to a module.
    6. Automations bound to a module.
    
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
                iconName: { type: Type.STRING, description: "A Lucide icon name like 'Database', 'Users', 'Zap', 'FileText', 'ShieldCheck', 'ShoppingCart', 'HeartHandshake', 'Briefcase', 'Globe', 'Layers'" },
                tabs: {
                  type: Type.ARRAY,
                  description: "Optional tabs to organize the module layout.",
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
                  description: "The visual layout of the module, organized into rows and columns. Each row should be assigned to a tabId if tabs are defined.",
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      columnCount: { type: Type.INTEGER, description: "Number of columns in this row (1, 2, 3, or 4)" },
                      tabId: { type: Type.STRING, description: "The ID of the tab this row belongs to" },
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
                                  options: {
                                    type: Type.ARRAY,
                                    items: { type: Type.STRING }
                                  },
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
              required: ["id", "name", "description", "category", "isCustom", "iconName", "layout"]
            }
          },
          workflows: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                steps: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                },
                description: { type: Type.STRING },
                targetModuleId: { type: Type.STRING, description: "The ID of the module this workflow applies to" }
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
                targetModuleId: { type: Type.STRING, description: "The ID of the module this automation applies to" }
              },
              required: ["trigger", "action", "description", "targetModuleId"]
            }
          },
          reasoning: { type: Type.STRING }
        },
        required: ["modules", "workflows", "automations", "reasoning"]
      }
    }
  });

  return JSON.parse(response.text);
};

export const generateDocumentTemplate = async (prompt: string, moduleId?: string): Promise<AIDocumentTemplate> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `You are Aurora AI, an expert in business document automation. 
    A user wants to create a document template for: "${prompt}".
    ${moduleId ? `This template is for the module: "${moduleId}".` : ""}
    
    Design a professional document template in HTML format. 
    Include placeholders for merge fields using the format {{field_name}}.
    The HTML should be clean and suitable for a rich text editor.
    
    Provide your response in a structured JSON format.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "A concise name for the template" },
          content: { type: Type.STRING, description: "The HTML content of the template with {{merge_fields}}" },
          description: { type: Type.STRING, description: "A brief description of the template" },
          suggestedFields: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: "A list of merge fields used in the template (e.g., ['client_name', 'date', 'amount'])"
          }
        },
        required: ["name", "content", "description", "suggestedFields"]
      }
    }
  });

  return JSON.parse(response.text);
};

