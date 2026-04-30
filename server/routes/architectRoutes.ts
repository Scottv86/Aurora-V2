import express from 'express';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

const SYSTEM_PROMPT = `
You are the "Shadow Architect", an AI design partner for the Aurora Module Builder.
Your goal is to help users build complex layouts and forms within a 12-column grid system.

CORE SYSTEM RULES:
1. Grid System: 12 columns total.
2. Layout Structure: A flat array of "Field" objects.
3. Field Properties:
   - id: string (unique)
   - type: One of ['text', 'longText', 'number', 'checkbox', 'currency', 'email', 'phone', 'address', 'lookup', 'user', 'calculation', 'date', 'select', 'heading', 'divider', 'spacer', 'alert', 'url', 'file', 'signature']
   - label: string (human readable name)
   - colSpan: number (1 to 12)
   - startCol: number (1 to 12)
   - rowIndex: number (0-indexed, represents the row number)
   - placeholder: string (optional)
   - required: boolean
   - options: string[] (only for 'select' or 'alert' types)
   - calculationLogic: string (formula like "{field1} + {field2}", use single braces)
   - visibilityRule: { fieldId: string, operator: string, value: string }
     - Operators: ['equals', 'not_equals', 'contains', 'greater_than', 'less_than', 'is_empty', 'not_empty']

4. Workflows:
   - The response can optionally include a "workflow" object.
   - workflow: { name: string, steps: { name: string, type: string }[] }
   - Step types: ['MANUAL', 'AUTOMATED', 'AI_ASSISTED']

YOUR TASK:
Process the user's natural language request and return a JSON object representing the UPDATED layout and/or workflow.
If the user asks for logic (e.g., "hide X if Y is Z"), include the appropriate visibilityRule.
If the user asks for a process or stages, include a workflow object.

Output Format:
Return ONLY a valid JSON object with "layout" and optionally "workflow" properties.
Do not include any markdown formatting or extra text.

Example Output:
{
  "layout": [
    { "id": "f1", "type": "select", "label": "Status", "options": ["Active", "Inactive"], "colSpan": 6, "startCol": 1, "rowIndex": 0 },
    { "id": "f2", "type": "text", "label": "Reason", "colSpan": 6, "startCol": 7, "rowIndex": 0, "visibilityRule": { "fieldId": "f1", "operator": "equals", "value": "Inactive" } }
  ],
  "workflow": {
    "name": "Member Approval",
    "steps": [
      { "name": "Draft", "type": "MANUAL" },
      { "name": "Review", "type": "AI_ASSISTED" },
      { "name": "Approved", "type": "MANUAL" }
    ]
  }
}
`;

router.post('/command', async (req, res) => {
  try {
    const { command, currentLayout } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "Gemini API key is not configured on the server." });
    }

    const prompt = `
${SYSTEM_PROMPT}

Current Layout: ${JSON.stringify(currentLayout)}
User Request: ${command}

Generate the updated layout based on the request. Preserve existing fields if they are still relevant, or create a brand new layout if requested.
Ensure all fields follow the 12-column grid rules and do not overlap.
`;

    const result = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });
    
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Clean JSON from potential markdown wrappers
    const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    try {
      const parsedData = JSON.parse(jsonString);
      res.json(parsedData);
    } catch (parseErr) {
      console.error("Gemini JSON Parse Error:", text);
      res.status(500).json({ error: "The Architect returned an invalid response. Please try again." });
    }

  } catch (error: any) {
    console.error("Architect Error:", error);
    res.status(500).json({ error: error.message || "Failed to process architect command." });
  }
});

const FORGE_PROMPT = `
You are the "Nexus Forge", an AI that builds API Connectors for the Aurora platform.
Your task is to generate a connector configuration based on a user's description.

A Connector consists of:
1. Metadata: Name, Icon (from Lucide-react name, e.g., "Globe"), Category.
2. IO Schema: 
   - Inputs: Array of { name: string, type: string, label: string, placeholder: string, required: boolean }.
   - Outputs: Array of { name: string, type: string, label: string }.
3. Edge Function Logic: A Deno-compatible Javascript function that handles the API request. 
   - It receives 'params' (inputs) and 'secrets' (API keys/tokens).
   - Use standard fetch for API calls.
   - It must return a JSON response.

Return ONLY a valid JSON object:
{
  "name": string,
  "icon": string,
  "category": string,
  "ioSchema": { "inputs": [...], "outputs": [...] },
  "edgeFunctionLogic": string
}
`;

router.post('/forge', async (req, res) => {
  try {
    const { prompt: userPrompt } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "Gemini API key is not configured." });
    }

    const prompt = `
${FORGE_PROMPT}

User Request: ${userPrompt}

Generate the connector configuration.
`;

    const result = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });
    
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const parsedData = JSON.parse(jsonString);
    res.json(parsedData);

  } catch (error: any) {
    console.error("Forge Error:", error);
    res.status(500).json({ error: "Failed to forge connector." });
  }
});

export default router;
