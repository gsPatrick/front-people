// CRIE O ARQUIVO: src/hooks/useNavigation.js

import { useState, useCallback } from 'react';

export const useNavigation = (initialView = 'loading') => {
  const [view, setView] = useState(initialView);
  const [history, setHistory] = useState([]);

  const navigateTo = useCallback((newView) => {
    setHistory(prev => [...prev.slice(-5), view]); // Mantém um histórico curto
    setView(newView);
  }, [view]);

  const goBack = useCallback(() => {
    const previousView = history.pop() || 'dashboard_jobs';
    setHistory([...history]);
    setView(previousView);
  }, [history]);

  return { view, navigateTo, goBack, setView, history, setHistory };
};