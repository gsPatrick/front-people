// ATUALIZE O ARQUIVO: src/hooks/useTalents.js

import { useState, useCallback, useEffect, useRef } from 'react';
import * as api from '../services/api.service';

const PAGE_LIMIT_TALENTS = 10;

// CORREÇÃO: Removido 'view' dos argumentos do hook.
export const useTalents = (executeAsync, view) => {
  const [talents, setTalents] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [nextPageKey, setNextPageKey] = useState(null);
  const [pageKeyHistory, setPageKeyHistory] = useState([null]);
  const [filters, setFilters] = useState({ searchTerm: '', selectedJobId: '' });
  const searchDebounceRef = useRef(null);

  const fetchAndSetTalents = useCallback(async (pageKey, direction = 'next') => {
    executeAsync(async () => {
      const result = await api.fetchAllTalents(PAGE_LIMIT_TALENTS, pageKey);
      if (result.success && result.data) {
        let fetchedTalents = result.data.talents || [];

        if (filters.searchTerm) {
          fetchedTalents = fetchedTalents.filter(t =>
            t.name?.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
            t.headline?.toLowerCase().includes(filters.searchTerm.toLowerCase())
          );
        }

        setTalents(fetchedTalents.filter(t => t && t.id));
        setNextPageKey(result.data.nextPageKey);

        if (direction === 'next') {
          setCurrentPage(p => p + 1);
          setPageKeyHistory(hist => [...hist, result.data.nextPageKey]);
        } else if (direction === 'prev') {
          setCurrentPage(p => p - 1);
        }
      }
    }, true);
  }, [executeAsync, filters.searchTerm]);

  useEffect(() => {
    // Esta lógica agora funciona corretamente porque o hook é estável.
    if (view !== 'dashboard_talents') return;
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    searchDebounceRef.current = setTimeout(() => {
      setCurrentPage(1);
      setPageKeyHistory([null]);
      fetchAndSetTalents(null, 'reset');
    }, 500);

    return () => clearTimeout(searchDebounceRef.current);
  }, [filters, view, fetchAndSetTalents]);

  const handleNextPage = () => {
    if (nextPageKey) {
      fetchAndSetTalents(nextPageKey, 'next');
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      const prevPageKey = pageKeyHistory[currentPage - 2];
      setPageKeyHistory(hist => hist.slice(0, -1));
      fetchAndSetTalents(prevPageKey, 'prev');
    }
  };
  
  return {
    talents,
    currentPage: currentPage,
    nextPageKey: nextPageKey,
    filters,
    setFilters,
    handleNextPage,
    handlePrevPage,
  };
};