// ATUALIZE O ARQUIVO: src/hooks/useJobs.js

import { useState, useCallback } from 'react';
import * as api from '../services/api.service';

const PAGE_LIMIT_JOBS = 3;

export const useJobs = (executeAsync) => {
  const [jobsData, setJobsData] = useState({ jobs: [], currentPage: 1, totalPages: 1, totalJobs: 0 });

  // CORREÇÃO: A função agora aceita o status como parâmetro
  const fetchAndSetJobs = useCallback(async (page, status = 'open') => {
    executeAsync(async () => {
      // Passa o status para a chamada da API
      const data = await api.fetchJobsPaginated(page, PAGE_LIMIT_JOBS, status);
      if (data) {
        setJobsData(data);
      }
    });
  }, [executeAsync]);

  // CORREÇÃO: handleJobsPageChange também precisa saber o status atual para paginar corretamente
  const handleJobsPageChange = (newPage, currentStatus) => {
    if (newPage > 0 && newPage <= jobsData.totalPages) {
      fetchAndSetJobs(newPage, currentStatus);
    }
  };

  return { jobsData, fetchAndSetJobs, handleJobsPageChange };
};