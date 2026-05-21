import { createContext, useContext, useState, useCallback } from 'react';

const TopbarContext = createContext(null);

export function TopbarProvider({ children }) {
  const [action, setActionState] = useState(null);

  const setAction = useCallback((config) => {
    // config: { label: string, onClick: fn } | null
    setActionState(config);
  }, []);

  const clearAction = useCallback(() => setActionState(null), []);

  return (
    <TopbarContext.Provider value={{ action, setAction, clearAction }}>
      {children}
    </TopbarContext.Provider>
  );
}

export function useTopbar() {
  const ctx = useContext(TopbarContext);
  if (!ctx) throw new Error('useTopbar deve ser usado dentro de TopbarProvider');
  return ctx;
}
