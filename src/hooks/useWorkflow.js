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
  const [updateContext, setUpdateContext] = useState({ isUpdating: false, kitId: null });

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

  const handleRequestProfileUpdate = useCallback(async (kitId = null) => {
    setUpdateContext({ isUpdating: true, kitId });
    navigateTo('update_pdf');
  }, [navigateTo]);


  // ==========================================================
  // CORREÇÃO PRINCIPAL AQUI
  // Trocamos `api.updateTalent` por `api.updateFullProfile`
  // ==========================================================
  const handleProfileUpdateFromExtraction = useCallback((profileData) => {
    executeAsync(async () => {
      if (!currentTalent?.id || !currentApplication?.id) {
        throw new Error("Contexto perdido. Não é possível atualizar.");
      }

      // 1. Atualizar Perfil Completo
      await api.updateFullProfile(currentTalent.id, currentApplication.id, profileData);

      // 2. Se houver Kit Selecionado (Contexto de Update), rodar IA e Salvar Scorecard
      if (updateContext.kitId) {
        // Recarrega estrutura do kit para ter certeza
        const kitRes = await api.fetchInterviewKit(updateContext.kitId);
        if (kitRes.success && kitRes.kit) {
          const kit = kitRes.kit;
          // Roda IA (simulando o MatchResultView logic)
          console.log("[DEBUG] Iniciando avaliação com IA para o Kit:", kit.name);
          const aiResult = await api.evaluateScorecardWithAI(currentTalent.id, currentJob, kit, {});

          if (aiResult && aiResult.evaluations) {
            const ratings = {};

            // Helper para normalizar strings para comparação
            const normalize = (str) => str ? str.toLowerCase().trim() : '';

            if (kit.skillCategories) {
              kit.skillCategories.forEach(cat => {
                if (cat.skills) {
                  cat.skills.forEach(skill => {
                    // Tenta match exato por ID (se disponível) ou fallback para nome
                    const evaluationById = aiResult.evaluations.find(ev => ev.id === skill.id);
                    const evaluationByName = aiResult.evaluations.find(ev => normalize(ev.name) === normalize(skill.name));

                    const bestMatch = evaluationById || evaluationByName;

                    if (bestMatch) {
                      console.log(`[DEBUG] Match encontrado para skill '${skill.name}':`, bestMatch);
                      if (skill.id) {
                        ratings[skill.id] = {
                          // Garante nota mínima 1 para exibir o campo de texto na UI
                          score: Math.max(1, bestMatch.score),
                          description: bestMatch.justification
                        };
                      }
                    }
                  });
                }
              });
            }

            const submitPayload = {
              ratings,
              decision: aiResult.finalDecision || 'NO_DECISION',
              feedback: aiResult.overallFeedback || '',
              notes: 'Avaliação gerada automaticamente via Atualização de Dados com IA.'
            };

            await api.submitScorecard(currentApplication.id, kit.id, submitPayload);
          }
        }
      }

      alert("Perfil atualizado e analisado com sucesso!");

      // 3. Recarregar Detalhes
      const detailsResult = await api.fetchCandidateDetails(currentJob.id, currentTalent.id);
      if (!detailsResult.success) throw new Error(detailsResult.error);

      setCurrentTalent(detailsResult.candidateData);
      // Atualiza resumo de scorecards também
      const summaryResult = await api.fetchScorecardData(detailsResult.candidateData.application.id, currentJob.id);
      setCurrentScorecardSummary(summaryResult.data?.content || []);

      setUpdateContext({ isUpdating: false, kitId: null });
      goBack(); // Sai do UpdatePdfView e volta para CandidateDetailView
    });
  }, [executeAsync, currentTalent, currentApplication, currentJob, updateContext, goBack]);

  // Mantendo o handlePdfUpdate manual como fallback/alternativo se necessário, 
  // mas agora o fluxo principal via extensão vai usar o handleProfileUpdateFromExtraction
  const handlePdfUpdate = useCallback((pdfFile) => {
    executeAsync(async () => {
      // ... (mantém lógica existente para upload manual de arquivo se quiser)
      const extractedText = await extractTextFromPdf(pdfFile);
      if (!extractedText) throw new Error("Falha ao ler PDF.");
      const jsonData = await api.processProfileFromText(extractedText);
      // Chama a nova função centralizada
      await handleProfileUpdateFromExtraction(jsonData);
    });
  }, [executeAsync, handleProfileUpdateFromExtraction]);


  const handleConfirmCreation = useCallback(() => {
    navigateTo('select_job_for_new_talent');
  }, [navigateTo]);

  const handleCreateAndGoToEvaluation = useCallback((profileData, selectedJob, matchData) => {
    executeAsync(async () => {
      // Suporta ambos: estrutura plana (linkedinUrl) e aninhada (perfil.linkedinUrl)
      const linkedinUrl = profileData.linkedinUrl || profileData.perfil?.linkedinUrl;
      const linkedinUsername = linkedinUrl ? linkedinUrl.split('/in/')[1]?.replace(/\/+$/, '') : null;

      // 1.1 Validation: Check for invalid 404 URLs
      if (linkedinUrl && (linkedinUrl.includes('/404') || linkedinUrl.includes('unavailable'))) {
        console.warn('[WORKFLOW] Invalid LinkedIn URL detected (404/unavailable):', linkedinUrl);
        if (linkedinUsername) {
          linkedinUrl = `https://www.linkedin.com/in/${linkedinUsername.replace(/\/+$/, '')}`;
          console.log('[WORKFLOW] Reconstructed URL from username:', linkedinUrl);
        } else {
          linkedinUrl = null; // Clear bad URL if no username to fix it
        }
      }

      // Extrai nome de ambas estruturas
      const nome = profileData.nome || profileData.perfil?.nome || profileData.name ||
        (linkedinUsername ? linkedinUsername.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ') : 'Candidato Desconhecido');
      const titulo = profileData.titulo || profileData.perfil?.titulo || profileData.headline;

      // Monta payload normalizado
      const payload = {
        ...profileData,
        jobId: selectedJob.id,
        linkedinUsername,
        linkedinUrl,
        nome,
        name: nome, // Mapping for external APIs
        titulo
      };
      const createResult = await api.createTalent(payload);
      if (!createResult || !createResult.id) throw new Error("Falha ao criar o talento.");
      const detailsResult = await api.fetchCandidateDetails(selectedJob.id, createResult.id);
      if (!detailsResult.success) throw new Error(detailsResult.error);

      // NOVO: Se houver dados de Match (criação via Batch Queue), salva o scorecard automaticamente
      if (matchData && matchData.result && matchData.scorecardId) {
        try {
          console.log('[WORKFLOW] Auto-saving scorecard from match data...');
          // 1. Busca estrutura do Kit para ter os IDs corretos
          const kitResultData = await api.fetchInterviewKit(matchData.scorecardId);
          if (kitResultData.success && kitResultData.kit) {
            const kit = kitResultData.kit;
            const ratings = {};
            const categories = matchData.result.categories || [];

            // 2. Mapeia as respostas do Match para os IDs do Kit
            // matchData structure: categories: [{ name, criteria: [{ name, score, justification }] }]
            kit.skillCategories.forEach(kitCat => {
              const matchCat = categories.find(c => c.name === kitCat.name);
              if (matchCat) {
                (kitCat.skills || []).forEach(kitSkill => {
                  const matchSkill = matchCat.criteria?.find(c => c.name === kitSkill.name);
                  if (matchSkill) {
                    ratings[kitSkill.id] = {
                      score: matchSkill.score,
                      description: matchSkill.justification
                    };
                  }
                });
              }
            });

            // 3. Monta o payload "plano" esperado
            const autoSavePayload = {
              userId: 'auto-match',
              scorecardInterviewId: matchData.scorecardId,
              feedback: '', // Match service não gera feedback geral texto corrido ainda
              decision: 'NO_DECISION',
              notes: 'Avaliação gerada automaticamente via Fila em Lote.',
              ratings: ratings
            };

            // 4. Salva (backend agora enriquece os IDs do kit se necessário)
            await api.submitScorecard(
              detailsResult.candidateData.application.id,
              matchData.scorecardId,
              autoSavePayload
            );
            console.log('[WORKFLOW] Scorecard auto-saved successfully.');
          }
        } catch (err) {
          console.error('[WORKFLOW] Failed to auto-save scorecard:', err);
          // Não bloqueia o fluxo, apenas loga o erro
        }

        // MUDANÇA: Retorna para o fluxo da Fila (Popup) sem navegar para detalhes
        return;
      }

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

  // Background creation for Batch Queue (Non-blocking)
  const handleCreateTalentInBackground = useCallback(async (profileData, selectedJob, matchData) => {
    // NOTE: We do NOT use executeAsync here to avoid blocking the UI with a global spinner.
    // The caller (Popup.jsx) manages the "Toast/Island" state.

    // Fix: Handle 'linkedin' field from AI/Scraper if 'linkedinUrl' is missing
    let linkedinUrl = profileData.linkedinUrl || profileData.perfil?.linkedinUrl || profileData.perfil?.linkedin;

    // Normalize URL if it comes without protocol
    if (linkedinUrl && !linkedinUrl.startsWith('http')) {
      linkedinUrl = `https://${linkedinUrl}`;
    }

    // Robust username extraction from any LinkedIn URL format
    let linkedinUsername = null;
    if (linkedinUrl) {
      const match = linkedinUrl.match(/linkedin\.com\/in\/([a-zA-Z0-9-]+)/);
      if (match && match[1]) {
        linkedinUsername = match[1];
      }
    }

    // 1.1 Validation: Check for invalid 404 URLs
    if (linkedinUrl && (linkedinUrl.includes('/404') || linkedinUrl.includes('unavailable'))) {
      console.warn('[WORKFLOW] Invalid LinkedIn URL detected (404/unavailable):', linkedinUrl);
      if (linkedinUsername) {
        linkedinUrl = `https://www.linkedin.com/in/${linkedinUsername.replace(/\/+$/, '')}`;
        console.log('[WORKFLOW] Reconstructed URL from username:', linkedinUrl);
      } else {
        linkedinUrl = null; // Clear bad URL
      }
    }

    const nome = profileData.nome || profileData.perfil?.nome || profileData.name ||
      (linkedinUsername ? linkedinUsername.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ') : 'Candidato Desconhecido');
    const titulo = profileData.titulo || profileData.perfil?.titulo || profileData.headline;

    const payload = {
      ...profileData,
      jobId: selectedJob.id,
      linkedinUsername,
      linkedinUrl,
      nome,
      name: nome, // Mapping for external APIs
      titulo
    };

    const createResult = await api.createTalent(payload);
    if (!createResult || !createResult.id) throw new Error("Falha ao criar o talento.");

    // Check Match Data for Auto-Scorecard
    if (matchData && matchData.result && matchData.scorecardId) {
      try {
        const detailsResult = await api.fetchCandidateDetails(selectedJob.id, createResult.id);
        const applicationId = detailsResult.candidateData?.application?.id;

        if (applicationId) {
          const kitResultData = await api.fetchInterviewKit(matchData.scorecardId);
          if (kitResultData.success && kitResultData.kit) {
            const kit = kitResultData.kit;
            const ratings = {};
            const categories = matchData.result.categories || [];

            kit.skillCategories.forEach(kitCat => {
              const matchCat = categories.find(c => c.name === kitCat.name);
              if (matchCat) {
                (kitCat.skills || []).forEach(kitSkill => {
                  const matchSkill = matchCat.criteria?.find(c => c.name === kitSkill.name);
                  if (matchSkill) {
                    ratings[kitSkill.id] = {
                      score: matchSkill.score,
                      description: matchSkill.justification
                    };
                  }
                });
              }
            });

            const autoSavePayload = {
              userId: 'auto-match',
              scorecardInterviewId: matchData.scorecardId,
              feedback: '',
              decision: 'NO_DECISION',
              notes: 'Avaliação gerada automaticamente via Fila em Lote.',
              ratings: ratings
            };

            await api.submitScorecard(applicationId, matchData.scorecardId, autoSavePayload);
          }
        }
      } catch (err) {
        console.error("Erro ao salvar scorecard em background:", err);
        // Non-fatal error for the user, but worth logging
      }
    }

    return createResult;
  }, []);

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

  const handleUpdateTalentStatus = useCallback((talentId, newStatus) => executeAsync(async () => {
    await api.updateTalentStatus(talentId, newStatus);
    setCurrentTalent(prev => ({ ...prev, status: newStatus }));
    alert(`Status atualizado para: ${newStatus}`);
  }), [executeAsync]);

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

  /* DEBUG: Log condition variables */
  // CORREÇÃO: Removemos executeAsync para permitir chamada aninhada dentro de outro fluxo async
  const refreshScorecardSummary = useCallback(async () => {
    console.log('[WORKFLOW] Attempting to refresh summary. App:', currentApplication, 'Job:', currentJob);
    if (currentApplication && currentJob) {
      try {
        console.log('[WORKFLOW] Refreshing scorecard summary...');
        const summaryResult = await api.fetchScorecardData(currentApplication.id, currentJob.id);
        setCurrentScorecardSummary(summaryResult.data?.content || []);
        console.log('[WORKFLOW] Scorecard summary updated. Content:', summaryResult.data?.content);
      } catch (err) {
        console.error('[WORKFLOW] Failed to refresh scorecard summary:', err);
      }
    } else {
      console.warn('[WORKFLOW] Cannot refresh summary: missing context.');
    }
  }, [currentApplication, currentJob]);

  const applicationCustomFields = useMemo(() => {
    const fields = currentTalent?.application?.customFields;
    return Array.isArray(fields) ? fields.map(field => ({ ...field, id: field.customFieldId || field.id })) : [];
  }, [currentTalent]);

  const state = { profileContext, currentJob, currentTalent, currentCandidates, currentJobStages, currentApplication, applicationCustomFields, currentInterviewKits, currentScorecardSummary, updateContext };
  const setters = { setProfileContext, setCurrentJob, setCurrentTalent, setCurrentCandidates, setCurrentJobStages, setCurrentApplication, setCurrentInterviewKits, setCurrentScorecardSummary };
  const actions = { handleSelectTalentForDetails, handleSelectJobForDetails, handleSelectCandidateForDetails, handleUpdateApplicationStatus, handleEditTalentInfo, handleDeleteTalent, handleApplyTalentToJob, handleRemoveApplicationForTalent, handleCreateAndGoToEvaluation, handleRequestProfileUpdate, handlePdfUpload, handleConfirmCreation, handlePdfUpdate, handleProfileUpdateFromExtraction, refreshScorecardSummary, handleCreateTalentInBackground, handleUpdateTalentStatus };

  return { ...state, ...setters, ...actions };
};