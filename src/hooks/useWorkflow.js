// ARQUIVO COMPLETO E CORRIGIDO: src/hooks/useWorkflow.js

import { useState, useCallback, useMemo } from 'react';
import * as api from '../services/api.service';
import { extractTextFromPdf } from '../services/pdf.service';

export const useWorkflow = (executeAsync, navigateTo, goBack, onCaptureProfile) => {
  const [profileContext, setProfileContext] = useState(null);
  const [currentJob, setCurrentJob] = useState(null);
  const [currentTalent, setCurrentTalent] = useState(null);
  const [currentCandidates, setCurrentCandidates] = useState([]);
  const [currentJobStages, setCurrentJobStages] = useState([]);
  const [currentApplication, setCurrentApplication] = useState(null);
  const [currentInterviewKits, setCurrentInterviewKits] = useState([]);
  const [currentScorecardSummary, setCurrentScorecardSummary] = useState([]);
  
  const handlePdfUpload = useCallback((pdfFile) => {
    executeAsync(async () => {
      const extractedText = await extractTextFromPdf(pdfFile);
      if (!extractedText) throw new Error("Não foi possível extrair texto do PDF.");

      const jsonData = await api.processProfileFromText(extractedText);
      if (!jsonData || !jsonData.name) throw new Error("A API de IA não retornou dados de perfil válidos.");
      
      let profileIdentifier = jsonData.contact?.linkedinProfileUrl || jsonData.linkedinProfileUrl;
      
      if (!profileIdentifier) {
        console.warn("[FALLBACK] A IA não retornou a URL do LinkedIn. Tentando extrair do texto bruto...");
        const urlMatch = extractedText.match(/linkedin\.com\/in\/([a-zA-Z0-9-]+)/);
        if (urlMatch && urlMatch[1]) {
          profileIdentifier = urlMatch[1];
          console.log(`[FALLBACK] Identificador encontrado via Regex: ${profileIdentifier}`);
        }
      }
      
      if (!profileIdentifier) {
        throw new Error("A IA não conseguiu extrair um identificador do LinkedIn e a busca no texto bruto também falhou.");
      }

      const cleanedUsername = profileIdentifier.replace(/\/+$/, '');
      const fullUrlToValidate = `https://www.linkedin.com/in/${cleanedUsername}`;
      
      console.log(`[PDF UPLOAD] Validando com a URL: ${fullUrlToValidate}`);
      const validationResult = await api.validateProfile(fullUrlToValidate);
      
      const finalProfileData = { ...jsonData, linkedinUrl: fullUrlToValidate };

      setProfileContext({
        exists: validationResult.exists,
        talent: validationResult.talent,
        profileData: finalProfileData
      });
      
      navigateTo('confirm_profile');
    });
  }, [executeAsync, navigateTo]);

  const openLinkedInTab = (username) => {
      if (!username) return;
      const url = `https://www.linkedin.com/in/${username.replace(/\/+$/, '')}`; 
      if (chrome && chrome.tabs) chrome.tabs.create({ url, active: true });
      else window.open(url, '_blank');
  };

  const handleSelectCandidateForDetails = useCallback((candidate, job) => executeAsync(async () => {
    const detailsResult = await api.fetchCandidateDetails(job.id, candidate.id);
    if (!detailsResult.success) throw new Error(detailsResult.error || "Não foi possível carregar os detalhes.");
    openLinkedInTab(detailsResult.candidateData.linkedinUsername);
    const [kitsResult, summaryResult] = await Promise.all([
        api.fetchKitsForJob(job.id),
        api.fetchScorecardData(detailsResult.candidateData.application.id, job.id)
    ]);
    setCurrentApplication(detailsResult.candidateData.application);
    setCurrentTalent(detailsResult.candidateData);
    setCurrentJob(job);
    setCurrentInterviewKits(kitsResult || []);
    setCurrentScorecardSummary(summaryResult.data?.content || []);
    navigateTo('candidate_details');
  }), [executeAsync, navigateTo]);
  
  const handleRequestProfileUpdate = useCallback(async () => {
    navigateTo('update_pdf');
  }, [navigateTo]);


  // ==========================================================
  // CORREÇÃO PRINCIPAL AQUI
  // Trocamos `api.updateTalent` por `api.updateFullProfile`
  // ==========================================================
  const handlePdfUpdate = useCallback((pdfFile) => {
    executeAsync(async () => {
      // Adicionado um check extra para garantir o ID da candidatura, necessário para a nova chamada
      if (!currentTalent?.id || !currentApplication?.id) {
        throw new Error("Contexto do talento ou da candidatura perdido. Não é possível atualizar.");
      }

      const extractedText = await extractTextFromPdf(pdfFile);
      if (!extractedText) throw new Error("Não foi possível extrair texto do PDF.");

      const jsonData = await api.processProfileFromText(extractedText);
      if (!jsonData || !jsonData.name) throw new Error("A API de IA não retornou dados de perfil válidos para a atualização.");

      // CORREÇÃO: Usando a função correta que aceita o objeto de dados completo.
      await api.updateFullProfile(currentTalent.id, currentApplication.id, jsonData);
      
      alert("Perfil atualizado com sucesso a partir do novo PDF!");

      const detailsResult = await api.fetchCandidateDetails(currentJob.id, currentTalent.id);
      if (!detailsResult.success) throw new Error(detailsResult.error || "Não foi possível recarregar os detalhes do candidato.");
      
      setCurrentTalent(detailsResult.candidateData);
      
      // Retornamos para a tela de detalhes
      goBack();
    });
  }, [executeAsync, goBack, currentTalent, currentApplication, currentJob]);


  const handleConfirmCreation = useCallback(() => {
    navigateTo('select_job_for_new_talent');
  }, [navigateTo]);

  const handleCreateAndGoToEvaluation = useCallback((profileData, selectedJob) => {
    executeAsync(async () => {
      const { linkedinUrl } = profileData;
      const linkedinUsername = linkedinUrl ? linkedinUrl.split('/in/')[1]?.replace(/\/+$/, '') : null;
      const payload = { ...profileData, jobId: selectedJob.id, linkedinUsername };
      const createResult = await api.createTalent(payload);
      if (!createResult || !createResult.id) throw new Error("Falha ao criar o talento.");
      const detailsResult = await api.fetchCandidateDetails(selectedJob.id, createResult.id);
      if (!detailsResult.success) throw new Error(detailsResult.error);
      const [kitsResult, summaryResult] = await Promise.all([
          api.fetchKitsForJob(selectedJob.id),
          api.fetchScorecardData(detailsResult.candidateData.application.id, selectedJob.id)
      ]);
      setCurrentApplication(detailsResult.candidateData.application);
      setCurrentTalent(detailsResult.candidateData);
      setCurrentJob(selectedJob);
      setCurrentInterviewKits(kitsResult || []);
      setCurrentScorecardSummary(summaryResult.data?.content || []);
      navigateTo('candidate_details');
    });
  }, [executeAsync, navigateTo]);

  const handleSelectTalentForDetails = useCallback((talent, navigationState = {}) => {
    executeAsync(async () => {
      openLinkedInTab(talent.linkedinUsername);
      const talentResult = await api.fetchTalentDetails(talent.id);
      if (talentResult.success && talentResult.talent) {
        setCurrentTalent(talentResult.talent);
        navigateTo('talent_profile');
        if (navigationState.startUpdate) {
          setTimeout(() => handleRequestProfileUpdate(), 500);
        }
      } else {
        throw new Error(talentResult.error || "Talento não encontrado.");
      }
    });
  }, [executeAsync, navigateTo, handleRequestProfileUpdate]);
  
  const handleSelectJobForDetails = useCallback((job) => executeAsync(async () => {
    const result = await api.fetchCandidatesForJob(job.id);
    setCurrentJob(job);
    setCurrentCandidates(result.data.candidates);
    setCurrentJobStages(result.data.stages);
    navigateTo('job_details');
  }), [executeAsync, navigateTo]);

  const handleUpdateApplicationStatus = useCallback((applicationId, newStageId) => executeAsync(async () => {
    await api.updateApplicationStatus(applicationId, newStageId);
    if (currentTalent?.application?.id === applicationId) {
        const newStage = currentJobStages.find(s => s.id === newStageId);
        setCurrentTalent(prev => ({ ...prev, application: { ...prev.application, stageId: newStageId, stageName: newStage?.name || prev.application.stageName } }));
    }
    const result = await api.fetchCandidatesForJob(currentJob.id);
    setCurrentCandidates(result.data.candidates);
  }), [executeAsync, currentJob, currentTalent, currentJobStages]);

  const handleEditTalentInfo = useCallback(async (talentId, talentUpdates, applicationCustomFields) => {
    await executeAsync(async () => {
      if (talentUpdates && Object.keys(talentUpdates).length > 0) await api.updateTalent(talentId, talentUpdates);
      if (applicationCustomFields && applicationCustomFields.length > 0 && currentApplication?.id) await api.updateApplicationCustomFields(currentApplication.id, applicationCustomFields);
      const result = await api.fetchCandidateDetails(currentJob.id, talentId);
      setCurrentApplication(result.candidateData.application);
      setCurrentTalent(result.candidateData);
      alert("Informações atualizadas!");
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
    if (window.confirm("Remover esta candidatura?")) {
      const result = await api.removeApplication(applicationId);
      if (result.success) { 
        alert("Candidatura removida."); 
        await handleSelectTalentForDetails({ id: talentId }); 
      } else {
        throw new Error(result.message || "Falha ao remover candidatura.");
      }
    }
  }), [executeAsync, handleSelectTalentForDetails]);

  const applicationCustomFields = useMemo(() => (currentTalent?.application?.customFields || []).map(field => ({ ...field, id: field.customFieldId || field.id })), [currentTalent]);
  
  const state = { profileContext, currentJob, currentTalent, currentCandidates, currentJobStages, currentApplication, applicationCustomFields, currentInterviewKits, currentScorecardSummary };
  const setters = { setProfileContext, setCurrentJob, setCurrentTalent, setCurrentCandidates, setCurrentJobStages, setCurrentApplication, setCurrentInterviewKits, setCurrentScorecardSummary };
  const actions = { handleSelectTalentForDetails, handleSelectJobForDetails, handleSelectCandidateForDetails, handleUpdateApplicationStatus, handleEditTalentInfo, handleDeleteTalent, handleApplyTalentToJob, handleRemoveApplicationForTalent, handleCreateAndGoToEvaluation, handleRequestProfileUpdate, handlePdfUpload, handleConfirmCreation, handlePdfUpdate };

  return { ...state, ...setters, ...actions };
};