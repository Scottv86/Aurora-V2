import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { generateAISummary, generateSolution, generateDocumentTemplate, generateExpression } from '../services/aiService';
import { showAuroraToast } from '../components/UI/AuroraToast';

interface AIContextType {
  requestCompletion: (prompt: string, systemInstruction?: string, responseMimeType?: string) => Promise<string>;
  requestSummary: (data: any, fields: any[]) => Promise<string>;
  requestSolution: (prompt: string) => Promise<any>;
  requestDocumentTemplate: (prompt: string, moduleId?: string) => Promise<any>;
  isProcessing: boolean;
}

const AIContext = createContext<AIContextType | null>(null);

export const AIContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleError = (error: any) => {
    console.error('[AIContextProvider] Gateway Error caught:', error);
    if (error?.structuredError) {
      showAuroraToast.error(error.structuredError);
    } else {
      showAuroraToast.error({
        code: 'UNKNOWN_ERROR',
        title: 'AI Operation Failed',
        message: error?.message || 'An unexpected AI gateway error occurred.',
        technical_details: JSON.stringify(error, null, 2)
      });
    }
  };

  const requestCompletion = useCallback(async (prompt: string) => {
    setIsProcessing(true);
    try {
      return await generateExpression(prompt, [], []);
    } catch (err) {
      handleError(err);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const requestSummary = useCallback(async (data: any, fields: any[]) => {
    setIsProcessing(true);
    try {
      return await generateAISummary(data, fields);
    } catch (err) {
      handleError(err);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const requestSolution = useCallback(async (prompt: string) => {
    setIsProcessing(true);
    try {
      return await generateSolution(prompt);
    } catch (err) {
      handleError(err);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const requestDocumentTemplate = useCallback(async (prompt: string, moduleId?: string) => {
    setIsProcessing(true);
    try {
      return await generateDocumentTemplate(prompt, moduleId);
    } catch (err) {
      handleError(err);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return (
    <AIContext.Provider value={{
      requestCompletion,
      requestSummary,
      requestSolution,
      requestDocumentTemplate,
      isProcessing
    }}>
      {children}
    </AIContext.Provider>
  );
};

export const useAI = () => {
  const context = useContext(AIContext);
  if (!context) {
    throw new Error('useAI must be used within an AIContextProvider');
  }
  return context;
};
