// COLE ESTE CÓDIGO ATUALIZADO NO ARQUIVO: src/hooks/useTalents.js

import { useState, useCallback, useEffect, useRef } from 'react';
import * as api from '../services/api.service';

const PAGE_LIMIT_TALENTS = 10;

export const useTalents = (executeAsync, view) => {
  const [talentsData, setTalentsData] = useState({ talents: [], currentPage: 1, totalPages: 1, totalTalents: 0 });
  const [filters, setFilters] = useState({ searchTerm: '' });
  const searchDebounceRef = useRef(null);

  const fetchAndSetTalents = useCallback(async (page, currentFilters) => {
    // ==========================================================
    // CORREÇÃO 1: Passar 'true' para executeAsync para tratar
    // todas as buscas de talento como um loading parcial.
    // ==========================================================
    executeAsync(async () => {
      const result = await api.fetchAllTalents(page, PAGE_LIMIT_TALENTS, currentFilters);
      if (result.success && result.data) {
        setTalentsData(result.data);
      }
    }, true); // `true` impede o LoadingView global de ser acionado.
  }, [executeAsync]);

  useEffect(() => {
    if (view.name !== 'dashboard_talents') return;
    
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    searchDebounceRef.current = setTimeout(() => {
      fetchAndSetTalents(1, filters);
    }, 500);

    return () => clearTimeout(searchDebounceRef.current);
  }, [filters, view.name, fetchAndSetTalents]);

  const handleTalentsPageChange = (newPage) => {
    if (newPage > 0 && newPage <= talentsData.totalPages) {
      fetchAndSetTalents(newPage, filters);
    }
  };
  
  return {
    talentsData,
    filters,
    setFilters,
    handleTalentsPageChange,
  };
};