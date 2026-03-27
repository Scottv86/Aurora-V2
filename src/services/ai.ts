import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateSolution(prompt: string, contextDocs?: string[]) {
  const model = ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: `
      You are the Aurora AI Solution Builder. 
      Based on the following business requirements, propose a modular solution structure.
      
      Requirements: ${prompt}
      ${contextDocs ? `Context Documents: ${contextDocs.join('\n')}` : ''}
      
      Return a JSON object with:
      - suggestedModules: string[]
      - suggestedWorkflows: { name: string, steps: string[] }[]
      - suggestedFields: { module: string, name: string, type: string }[]
      - reasoning: string
    `,
    config: {
      responseMimeType: "application/json"
    }
  });

  const response = await model;
  return JSON.parse(response.text || '{}');
}

export async function summarizeRecord(recordData: any) {
  const model = ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Summarize this business record and suggest next steps: ${JSON.stringify(recordData)}`,
  });

  const response = await model;
  return response.text;
}
