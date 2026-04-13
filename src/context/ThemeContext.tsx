import { createContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const SCROLLBAR_STYLES = {
  dark: `
    ::-webkit-scrollbar { width: 5px !important; height: 5px !important; }
    ::-webkit-scrollbar-track { background: transparent !important; }
    ::-webkit-scrollbar-thumb { background: rgba(113, 113, 122, 0.5) !important; border-radius: 10px !important; }
    ::-webkit-scrollbar-thumb:hover { background: rgba(113, 113, 122, 0.8) !important; }
    html { scrollbar-width: thin; scrollbar-color: rgba(113, 113, 122, 0.5) transparent; }
  `,
  light: `
    ::-webkit-scrollbar { width: 5px !important; height: 5px !important; }
    ::-webkit-scrollbar-track { background: transparent !important; }
    ::-webkit-scrollbar-thumb { background: rgba(113, 113, 122, 0.4) !important; border-radius: 10px !important; }
    ::-webkit-scrollbar-thumb:hover { background: rgba(113, 113, 122, 0.7) !important; }
    html { scrollbar-width: thin; scrollbar-color: rgba(113, 113, 122, 0.4) transparent; }
  `,
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);

    // Inject scrollbar styles directly so they win over browser/OS defaults
    let styleEl = document.getElementById('aurora-scrollbar-theme') as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'aurora-scrollbar-theme';
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = SCROLLBAR_STYLES[theme];
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
