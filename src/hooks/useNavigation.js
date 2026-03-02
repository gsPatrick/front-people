// COLE ESTE CÓDIGO NO ARQUIVO: src/hooks/useNavigation.js

import { useState, useCallback } from 'react';

export const useNavigation = (initialViewName = 'loading') => {
  // O estado 'view' agora é um objeto com nome e estado opcional
  const [navState, setNavState] = useState({
    view: { name: initialViewName, state: null },
    history: []
  });

  const navigateTo = useCallback((viewName, viewState = null) => {
    setNavState(prev => ({
      view: { name: viewName, state: viewState },
      history: [...prev.history.slice(-5), prev.view]
    }));
  }, []);

  const goBack = useCallback(() => {
    setNavState(prev => {
      if (prev.history.length === 0) {
        return { ...prev, view: { name: 'dashboard_jobs', state: null } };
      }
      const newHistory = [...prev.history];
      const lastView = newHistory.pop();
      return { view: lastView, history: newHistory };
    });
  }, []);

  return { 
    view: navState.view, 
    navigateTo, 
    goBack, 
    history: navState.history,
    setView: (v) => setNavState(prev => ({ ...prev, view: v })),
    setHistory: (h) => setNavState(prev => ({ ...prev, history: h }))
  };
};