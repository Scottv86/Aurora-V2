import React, { createContext, useContext, useState, useCallback } from 'react';

export type NewModuleModalView = 'choices' | 'templates';

interface NewModuleModalContextType {
  isOpen: boolean;
  view: NewModuleModalView;
  openNewModuleModal: (view?: NewModuleModalView) => void;
  closeNewModuleModal: () => void;
  setView: (view: NewModuleModalView) => void;
}

const NewModuleModalContext = createContext<NewModuleModalContextType | undefined>(undefined);

export const NewModuleModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<NewModuleModalView>('choices');

  const openNewModuleModal = useCallback((initialView: NewModuleModalView = 'choices') => {
    setView(initialView);
    setIsOpen(true);
  }, []);

  const closeNewModuleModal = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <NewModuleModalContext.Provider
      value={{
        isOpen,
        view,
        openNewModuleModal,
        closeNewModuleModal,
        setView
      }}
    >
      {children}
    </NewModuleModalContext.Provider>
  );
};

export const useNewModuleModal = () => {
  const context = useContext(NewModuleModalContext);
  if (!context) {
    throw new Error('useNewModuleModal must be used within a NewModuleModalProvider');
  }
  return context;
};
