import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: (import.meta as any).env.VITE_GEMINI_API_KEY || 'mock-key' });

export const generateAISummary = async (data: any, fields: any[]): Promise<string> => {
  try {
    const dataString = JSON.stringify(data, null, 2);
    const fieldsString = JSON.stringify(fields.map(f => ({ id: f.id, label: f.label, type: f.type })), null, 2);
    
    const prompt = `You are an AI assistant integrated into a CRM system. 
Your task is to generate a concise, professional summary of the following record data.

Fields Definition:
${fieldsString}

Record Data:
${dataString}

Please provide a 2-3 sentence summary highlighting the most important information.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    
    return response.text || "Summary could not be generated.";
  } catch (error) {
    console.error("Error generating AI summary:", error);
    return "Error generating summary.";
  }
};

export const evaluateCalculations = (data: any, fields: any[]): any => {
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
