import React, { createContext, useContext, useState, useCallback } from 'react';

export interface ModalEntry {
  id: string;
  moduleId: string;
  recordId?: string;
  type: 'view' | 'edit';
  title?: string;
  localData?: any;
  localSchema?: any[];
  onSaveLocal?: (data: any) => void;
}

interface ModalStackContextType {
  stack: ModalEntry[];
  pushModal: (modal: Omit<ModalEntry, 'id'>) => void;
  popModal: () => void;
  clearStack: () => void;
  popToId: (id: string) => void;
}

const ModalStackContext = createContext<ModalStackContextType | undefined>(undefined);

export const ModalStackProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [stack, setStack] = useState<ModalEntry[]>([]);

  const pushModal = useCallback((modal: Omit<ModalEntry, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 11);
    setStack(prev => [...prev, { ...modal, id }]);
  }, []);

  const popModal = useCallback(() => {
    setStack(prev => prev.slice(0, -1));
  }, []);

  const popToId = useCallback((id: string) => {
    setStack(prev => {
      const index = prev.findIndex(m => m.id === id);
      if (index === -1) return prev;
      return prev.slice(0, index + 1);
    });
  }, []);

  const clearStack = useCallback(() => {
    setStack([]);
  }, []);

  return (
    <ModalStackContext.Provider value={{ stack, pushModal, popModal, clearStack, popToId }}>
      {children}
    </ModalStackContext.Provider>
  );
};

export const useModalStack = () => {
  const context = useContext(ModalStackContext);
  if (!context) {
    throw new Error('useModalStack must be used within a ModalStackProvider');
  }
  return context;
};
