// ATUALIZE O ARQUIVO: src/hooks/useWorkflow.js

import { useState, useCallback, useMemo } from 'react';
import * as api from '../services/api.service';

// CORREÇÃO: Removido fetchAndSetJobs dos argumentos
export const useWorkflow = (executeAsync, navigateTo, goBack) => {
  // ... (todo o resto do código do hook permanece o mesmo)
  const [profileContext, setProfileContext] = useState(null);
  const [currentJob, setCurrentJob] = useState(null);
  const [currentTalent, setCurrentTalent] = useState(null);
  const [currentCandidates, setCurrentCandidates] = useState([]);
  const [currentJobStages, setCurrentJobStages] = useState([]);
  const [currentApplication, setCurrentApplication] = useState(null);

  const handleSelectTalentForDetails = useCallback((talent) => executeAsync(async () => {
    const talentResult = await api.fetchTalentDetails(talent.id);
    if (talentResult.success && talentResult.talent) {
      setCurrentTalent(talentResult.talent);
      navigateTo('talent_profile');
    } else {
      throw new Error(talentResult.error || "Talento não encontrado.");
    }
  }), [executeAsync, navigateTo]);

  const handleConfirmTalentCreation = useCallback((talentData, jobIdToApply = null) => executeAsync(async () => {
    const payload = { ...talentData, jobId: jobIdToApply };
    const newTalent = await api.createTalent(payload);
    await handleSelectTalentForDetails(newTalent);
  }), [executeAsync, handleSelectTalentForDetails]);

  const handleSelectJobForDetails = useCallback((job) => executeAsync(async () => {
    const result = await api.fetchCandidatesForJob(job.id);
    setCurrentJob(job);
    setCurrentCandidates(result.data.candidates);
    setCurrentJobStages(result.data.stages);
    navigateTo('job_details');
  }), [executeAsync, navigateTo]);

  const handleSelectCandidateForDetails = useCallback((candidate, job) => executeAsync(async () => {
    const result = await api.fetchCandidateDetails(job.id, candidate.id);
    const { candidateData } = result;
    setCurrentApplication(candidateData.application);
    setCurrentTalent(candidateData);
    setCurrentJob(job);
    navigateTo('candidate_details');
  }), [executeAsync, navigateTo]);

  const handleUpdateApplicationStatus = useCallback((applicationId, newStageId) => executeAsync(async () => {
    await api.updateApplicationStatus(applicationId, newStageId);
    await handleSelectJobForDetails(currentJob);
  }), [executeAsync, currentJob, handleSelectJobForDetails]);

  const handleEditTalentInfo = useCallback(async (talentId, talentUpdates, applicationCustomFields) => {
    await executeAsync(async () => {
      if (talentUpdates && Object.keys(talentUpdates).length > 0) {
        await api.updateTalent(talentId, talentUpdates);
      }
      if (applicationCustomFields && applicationCustomFields.length > 0 && currentApplication?.id) {
        await api.updateApplicationCustomFields(currentApplication.id, applicationCustomFields);
      }
      
      const result = await api.fetchCandidateDetails(currentJob.id, talentId);
      const { candidateData } = result;

      setCurrentApplication(candidateData.application);
      setCurrentTalent(candidateData);
      
      alert("Informações atualizadas com sucesso!");
      
      goBack();
    });
  }, [executeAsync, currentApplication, currentJob, goBack]);

  const handleDeleteTalent = useCallback((talentId) => executeAsync(async () => {
    const result = await api.deleteTalent(talentId);
    if (result.success) { 
      alert("Talento deletado com sucesso!");
      navigateTo('dashboard_talents'); 
    } else {
      throw new Error(result.message || "Falha ao deletar talento.");
    }
  }), [executeAsync, navigateTo]);

  const handleApplyTalentToJob = useCallback((jobId, talentId) => executeAsync(async () => {
    const result = await api.applyToJob(jobId, talentId);
    if (result.id) { 
      alert("Talento adicionado à vaga com sucesso!");
      await handleSelectTalentForDetails({ id: talentId });
    } else {
      throw new Error(result.message || "Falha ao adicionar talento à vaga.");
    }
  }), [executeAsync, handleSelectTalentForDetails]);

  const handleRemoveApplicationForTalent = useCallback((applicationId, talentId) => executeAsync(async () => {
    if (window.confirm("Tem certeza que deseja remover esta candidatura?")) {
      const result = await api.removeApplication(applicationId);
      if (result.success) { 
        alert("Candidatura removida com sucesso!");
        await handleSelectTalentForDetails({ id: talentId });
      } else {
        throw new Error(result.message || "Falha ao remover candidatura.");
      }
    }
  }), [executeAsync, handleSelectTalentForDetails]);

  const applicationCustomFields = useMemo(() => {
    return currentTalent?.application?.customFields || [];
  }, [currentTalent]);
  
  const state = { profileContext, currentJob, currentTalent, currentCandidates, currentJobStages, currentApplication, applicationCustomFields };
  const setters = { setProfileContext, setCurrentJob, setCurrentTalent, setCurrentCandidates, setCurrentJobStages, setCurrentApplication };
  const actions = {
    handleSelectTalentForDetails, handleConfirmTalentCreation, handleSelectJobForDetails,
    handleSelectCandidateForDetails, handleUpdateApplicationStatus, handleEditTalentInfo,
    handleDeleteTalent, handleApplyTalentToJob, handleRemoveApplicationForTalent
  };

  return { ...state, ...setters, ...actions };
};