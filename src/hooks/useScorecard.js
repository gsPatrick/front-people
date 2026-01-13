// ARQUIVO COMPLETO: src/hooks/useScorecard.js

import { useState, useCallback } from 'react';
import * as api from '../services/api.service';

/**
 * Hook customizado para gerenciar todo o fluxo de scorecard.
 * @param {object} props - Propriedades para o hook.
 * @param {function} props.executeAsync - Função wrapper para chamadas de API.
 * @param {object} props.settings - O objeto de configurações da aplicação.
 * @param {object} props.currentTalent - O talento atualmente em contexto.
 * @param {object} props.currentJob - A vaga atualmente em contexto.
 * @param {object} props.currentApplication - A candidatura atualmente em contexto.
 * @returns {object} - Estado e funções para controlar o fluxo de scorecard.
 */
export const useScorecard = ({ executeAsync, settings, currentTalent, currentJob, currentApplication, onScorecardUpdate }) => {
  const [isScorecardModalOpen, setIsScorecardModalOpen] = useState(false);
  const [scorecardModalContent, setScorecardModalContent] = useState(null);
  const [scorecardData, setScorecardData] = useState(null);
  const [selectedInterviewKit, setSelectedInterviewKit] = useState(null);
  const [currentEvaluationToEdit, setCurrentEvaluationToEdit] = useState(null);
  const [aiAnalysisCache, setAiAnalysisCache] = useState({});

  const handleCloseScorecard = useCallback(() => {
    setIsScorecardModalOpen(false);
    setScorecardData(null);
    setSelectedInterviewKit(null);
    setCurrentEvaluationToEdit(null);
  }, []);

  const handleAccessScorecard = useCallback((job) => {
    executeAsync(async () => {
      if (!currentApplication) throw new Error("Candidatura não encontrada no contexto.");
      const result = await api.fetchScorecardData(currentApplication.id, job.id);
      if (result.success && result.data) {
        setScorecardData(result.data);
        setScorecardModalContent('results');
        setIsScorecardModalOpen(true);
      } else {
        throw new Error(result.error || "Não foi possível carregar o resumo do scorecard.");
      }
    });
  }, [executeAsync, currentApplication]);

  const handleStartNewEvaluation = useCallback((job) => {
    executeAsync(async () => {
      if (!currentApplication) throw new Error("Candidatura não encontrada no contexto.");
      const result = await api.fetchKitsForJob(job.id);
      setScorecardData({ type: 'kits', content: result });

      if (result && result.length > 0) {
        setScorecardModalContent('select_kit');
      } else {
        setScorecardModalContent('create');
      }
      setIsScorecardModalOpen(true);
    });
  }, [executeAsync, currentApplication]);

  const handleSelectInterviewKit = useCallback((kit) => {
    setSelectedInterviewKit(kit);
    setScorecardModalContent('evaluate');
  }, []);

  const handleCreateScorecardAndKit = useCallback((payload) => {
    executeAsync(async () => {
      const result = await api.createScorecardAndKit(payload);
      if (result.success && result.kit) {
        setSelectedInterviewKit(result.kit);
        setScorecardModalContent('evaluate');
      } else {
        throw new Error(result.error || "Falha ao criar Scorecard e Kit.");
      }
    });
  }, [executeAsync]);

  const handleScorecardSubmit = useCallback((evaluationData) => {
    executeAsync(async () => {
      // ---- ADICIONE ESTAS LINHAS PARA DEPURAR ----
      console.log('DEBUG: Submetendo Scorecard com o seguinte contexto:');
      console.log('Kit Selecionado:', selectedInterviewKit);
      console.log('Candidatura Atual:', currentApplication);
      // ---------------------------------------------

      if (!selectedInterviewKit?.id || !currentApplication?.id) {
        throw new Error("Contexto de avaliação inválido. Kit ou candidatura não encontrados.");
      }
      await api.submitScorecard(currentApplication.id, selectedInterviewKit.id, evaluationData);

      // Se houver callback de atualização (refresh summary), chama ele
      if (onScorecardUpdate) {
        console.log('[useScorecard] Triggering scorecard update refresh...');
        await onScorecardUpdate();
      }

      alert("Avaliação enviada com sucesso!");
      handleCloseScorecard();
    });
  }, [executeAsync, selectedInterviewKit, currentApplication, handleCloseScorecard, onScorecardUpdate]);

  const handleStartEditEvaluation = useCallback((evaluation) => {
    executeAsync(async () => {
      const kitId = evaluation.scorecardInterviewId;
      if (!kitId) throw new Error("ID do kit não encontrado na avaliação.");

      const result = await api.fetchInterviewKit(kitId);
      if (result.success && result.kit) {
        setSelectedInterviewKit(result.kit);
        setCurrentEvaluationToEdit(evaluation);
        setScorecardModalContent('evaluate');
        setIsScorecardModalOpen(true);
      } else {
        throw new Error(result.error || "Não foi possível carregar a estrutura do kit para edição.");
      }
    });
  }, [executeAsync]);

  const handleGoBackInScorecardFlow = useCallback(() => {
    setCurrentEvaluationToEdit(null);
    if (scorecardData?.type === 'summary') {
      setScorecardModalContent('results');
    } else {
      handleCloseScorecard();
    }
  }, [scorecardData, handleCloseScorecard]);

  const handleCacheAIResult = useCallback((cacheKey, result) => {
    setAiAnalysisCache(prevCache => ({ ...prevCache, [cacheKey]: result }));
  }, []);

  const handleSaveWeights = useCallback(async (kitId, weights) => {
    try {
      await api.saveKitWeights(kitId, weights);
    } catch (err) {
      console.error("Falha ao salvar os pesos em segundo plano:", err.message);
    }
  }, []);

  const handleAIAssistScorecard = useCallback(async (scorecard, weights) => {
    if (!currentTalent?.id || !currentJob) {
      throw new Error("Contexto incompleto para a análise de IA.");
    }
    return api.evaluateScorecardWithAI(currentTalent.id, currentJob, scorecard, weights);
  }, [currentTalent, currentJob]);

  const handleSyncProfile = useCallback(async () => {
    if (!currentTalent?.id) {
      throw new Error("ID do talento não encontrado para sincronização.");
    }
    return api.syncLinkedInProfile(currentTalent.id);
  }, [currentTalent]);

  const handleCheckAICache = useCallback(async () => {
    if (!currentTalent?.id) return { hasCache: false };
    return api.checkAICacheStatus(currentTalent.id);
  }, [currentTalent]);

  return {
    isScorecardModalOpen,
    scorecardModalContent,
    scorecardData,
    selectedInterviewKit,
    currentEvaluationToEdit,
    aiAnalysisCache,
    settings,
    handleAccessScorecard,
    handleStartNewEvaluation,
    handleCloseScorecard,
    handleSelectInterviewKit,
    handleCreateScorecardAndKit,
    handleScorecardSubmit,
    handleStartEditEvaluation,
    handleGoBackInScorecardFlow,
    handleSaveWeights,
    handleAIAssistScorecard,
    handleSyncProfile,
    handleCheckAICache,
    handleCacheAIResult,
  };
};