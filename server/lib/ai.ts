import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const genAI = new GoogleGenAI({ apiKey: process.env.VITE_GEMINI_API_KEY || "" });

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await genAI.models.embedContent({
      model: "text-embedding-004",
      contents: [{ parts: [{ text }] }]
    });
    
    // The response structure might vary, let's look at what we saw in the types
    // Based on the types, it returns EmbedContentResponse
    return response.embeddings[0].values;
  } catch (error) {
    console.error("Error generating embedding:", error);
    // Return a zero vector as fallback
    return new Array(768).fill(0); 
  }
}
