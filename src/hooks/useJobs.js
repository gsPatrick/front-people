// ATUALIZE O ARQUIVO: src/hooks/useJobs.js

import { useState, useCallback, useMemo } from 'react';
import * as api from '../services/api.service';

const PAGE_LIMIT_JOBS = 3;

export const useJobs = (executeAsync) => {
  const [jobsData, setJobsData] = useState({ jobs: [], currentPage: 1, totalPages: 1, totalJobs: 0 });

  const fetchAndSetJobs = useCallback(async (page, status = 'open') => {
    return executeAsync(async () => {
      const data = await api.fetchJobsPaginated(page, PAGE_LIMIT_JOBS, status);
      if (data) {
        setJobsData(data);
      }
      return data;
    });
  }, [executeAsync]);

  const handleJobsPageChange = useCallback((newPage, currentStatus) => {
    if (newPage > 0 && newPage <= jobsData.totalPages) {
      fetchAndSetJobs(newPage, currentStatus);
    }
  }, [fetchAndSetJobs, jobsData.totalPages]);

  const handleDeleteJob = useCallback(async (jobId, currentStatus) => {
    if (!window.confirm("Deseja realmente excluir esta vaga? Esta ação remove apenas a vaga local.")) {
      return;
    }

    // Primeiro executamos a exclusão
    await executeAsync(async () => {
      await api.deleteJob(jobId);
    });

    // Depois que a trava do DELETE foi liberada, chamamos o refresh
    // Isso garante que o segundo executeAsync (dentro do fetchAndSetJobs) consiga rodar
    alert("Vaga removida!");
    await fetchAndSetJobs(jobsData.currentPage, currentStatus);
  }, [executeAsync, fetchAndSetJobs, jobsData.currentPage]);

  return useMemo(() => ({ 
    jobsData, 
    fetchAndSetJobs, 
    handleJobsPageChange, 
    handleDeleteJob 
  }), [jobsData, fetchAndSetJobs, handleJobsPageChange, handleDeleteJob]);
};