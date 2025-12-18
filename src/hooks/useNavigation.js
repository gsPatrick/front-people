// COLE ESTE CÓDIGO NO ARQUIVO: src/hooks/useNavigation.js

import { useState, useCallback } from 'react';

export const useNavigation = (initialViewName = 'loading') => {
  // O estado 'view' agora é um objeto com nome e estado opcional
  const [view, setView] = useState({ name: initialViewName, state: null });
  const [history, setHistory] = useState([]);

  const navigateTo = useCallback((viewName, viewState = null) => {
    // Adiciona o estado anterior ao histórico
    setHistory(prev => [...prev.slice(-5), view]);
    // Define a nova view com seu nome e estado
    setView({ name: viewName, state: viewState });
  }, [view]); // Depende do objeto 'view' completo

  const goBack = useCallback(() => {
    if (history.length > 0) {
      const previousView = history[history.length - 1];
      setHistory(history.slice(0, -1));
      setView(previousView);
    } else {
      // Fallback se não houver histórico
      setView({ name: 'dashboard_jobs', state: null });
    }
  }, [history]);

  // Expõe também o objeto view completo para que o estado possa ser lido
  return { view, navigateTo, goBack, setView, history, setHistory };
};