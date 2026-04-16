// ARQUIVO COMPLETO E ATUALIZADO: src/services/api.service.js

import axios from 'axios';
import { loadAuthData } from './session.service';

const API_BASE_URL = 'https://geral-people-api.r954jc.easypanel.host/api'; // <-- Sua URL de produção

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 1800000 // 30 minutos de limite de timeout para lidar com respostas longas da IA
});

// INTERCEPTADOR: Adiciona o token de autenticação a cada requisição
apiClient.interceptors.request.use(async (config) => {
  const authData = await loadAuthData();
  // Blindagem contra tokens nulos ou strings "undefined"
  if (authData?.token && authData.token !== 'undefined') {
    config.headers.Authorization = `Bearer ${authData.token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

const handleError = (error) => {
  const message = error.response?.data?.error || error.message || 'Ocorreu um erro inesperado.';
  const status = error.response?.status;
  console.error('Erro na chamada da API:', message, 'Status:', status);

  const apiError = new Error(message);
  apiError.status = status;
  throw apiError;
};




// ===================================================================
//                          SERVIÇOS DE AUTENTICAÇÃO
// ===================================================================
export const loginUser = async (email, password) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, { email, password });
    return response.data;
  } catch (error) {
    handleError(error);
  }
};


// ===================================================================
//          ⭐ NOVA FUNÇÃO PARA PARSING DE TEXTO COM IA ⭐
// ===================================================================
/**
 * Envia o texto bruto de um perfil para a API de IA para ser estruturado em JSON.
 * @param {string} rawText - O texto completo extraído de um PDF.
 * @returns {Promise<object>} Os dados do perfil estruturados em JSON.
 */
export const processProfileFromText = async (rawText) => {
  try {
    // A rota que você criou no seu backend é '/parse-profile-ai'
    const response = await apiClient.post('/parse-profile-ai', { rawText });
    return response.data;
  } catch (error) {
    handleError(error);
  }
};


// ===================================================================
//          ⭐ NOVA FUNÇÃO PARA EXTRAÇÃO DE PDF ⭐
// ===================================================================
/**
 * Envia um arquivo PDF (Blob) para a API para extração.
 * Esta função será chamada pelo background.js, mas a definimos aqui para centralizar a lógica da API.
 * @param {Blob} pdfBlob - O arquivo PDF capturado.
 * @returns {Promise<object>} Os dados extraídos do perfil.
 */
export const extractProfileFromPdf = async (pdfBlob) => {
  try {
    const formData = new FormData();
    formData.append("file", pdfBlob, "linkedin_profile.pdf");

    // Esta chamada precisa de um header diferente (multipart/form-data)
    // e do token de autenticação.
    const authData = await loadAuthData();
    const headers = {};
    if (authData?.token) {
      headers['Authorization'] = `Bearer ${authData.token}`;
    }

    const response = await axios.post(`${API_BASE_URL}/extract-from-pdf`, formData, { headers });
    return response.data;
  } catch (error) {
    handleError(error);
  }
};


// ===================================================================
//                          SERVIÇOS DE ADMINISTRAÇÃO
// ===================================================================
export const getAllUsers = async () => {
  try {
    const response = await apiClient.get('/admin/users');
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const createUser = async (userData) => {
  try {
    const response = await apiClient.post('/admin/users', userData);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const updateUser = async (userId, userData) => {
  try {
    const response = await apiClient.put(`/admin/users/${userId}`, userData);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const deleteUser = async (userId) => {
  try {
    const response = await apiClient.delete(`/admin/users/${userId}`);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

// ===================================================================
//                          DEMAIS SERVIÇOS DA API
// ===================================================================
export const createScorecard = async (scorecardData) => {
  try {
    const response = await apiClient.post('/scorecards', scorecardData);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const getAllScorecards = async () => {
  try {
    const response = await apiClient.get('/scorecards');
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const updateScorecard = async (id, scorecardData) => {
  try {
    const response = await apiClient.put(`/scorecards/${id}`, scorecardData);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const deleteScorecard = async (id) => {
  try {
    const response = await apiClient.delete(`/scorecards/${id}`);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const syncScorecardToInHire = async (id) => {
  try {
    const response = await apiClient.post(`/scorecards/${id}/sync-inhire`);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const validateProfile = async (profileUrl) => {
  try {
    const response = await apiClient.post('/validate-profile', { profileUrl });
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const createTalent = async (talentData, matchData = null) => {
  try {
    const payload = { ...talentData };
    if (matchData) payload.matchData = matchData;
    const response = await apiClient.post('/create-talent', payload);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const fetchAllTalents = async (page = 1, limit = 10, filters = {}) => {
  try {
    const params = {
      page,
      limit,
      ...filters
    };
    const response = await apiClient.get('/talents', { params });
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const updateFullProfile = async (talentId, applicationId, scrapedData) => {
  try {
    const response = await apiClient.post('/update-full-profile', {
      talentId,
      applicationId,
      scrapedData
    });
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const fetchTalentDetails = async (talentId) => {
  try {
    const response = await apiClient.get(`/talents/${talentId}`);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const updateTalent = async (talentId, dataToUpdate) => {
  try {
    const response = await apiClient.patch(`/talents/${talentId}`, dataToUpdate);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const updateTalentStatus = async (talentId, status) => {
  try {
    const response = await apiClient.patch(`/talents/${talentId}/status`, { status });
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const addTalentToJob = async (talentId, jobId) => {
  try {
    const response = await apiClient.post(`/talents/${talentId}/add-to-job`, { jobId });
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const deleteTalent = async (talentId) => {
  try {
    await apiClient.delete(`/talents/${talentId}`);
    return { success: true };
  } catch (error) {
    handleError(error);
  }
};

export const createJob = async (jobData) => {
  try {
    const response = await apiClient.post('/jobs', jobData);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const fetchJobsPaginated = async (page = 1, limit = 3, status = 'open') => {
  try {
    const response = await apiClient.get(`/jobs?page=${page}&limit=${limit}&status=${status}`);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const fetchJobDetails = async (jobId) => {
  try {
    const response = await apiClient.get(`/jobs/${jobId}`);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const updateJobDetails = async (jobId, data) => {
  try {
    const response = await apiClient.patch(`/jobs/${jobId}`, data);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const syncJobToInHire = async (jobId) => {
  try {
    const response = await apiClient.post(`/jobs/${jobId}/sync-inhire`);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const deleteJob = async (jobId) => {
  try {
    const response = await apiClient.delete(`/jobs/${jobId}`);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const fetchAreas = async () => {
    try {
      const response = await apiClient.get('/areas');
      return response.data;
    } catch (error) {
      handleError(error);
    }
  };

export const fetchCandidatesForJob = async (jobId) => {
  try {
    const response = await apiClient.get(`/jobs/${jobId}/candidates`);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const fetchCandidateDetails = async (jobId, talentId) => {
  try {
    const response = await apiClient.get(`/candidate-details/job/${jobId}/talent/${talentId}`);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const applyToJob = async (jobId, talentId) => {
  try {
    const response = await apiClient.post('/apply', { jobId, talentId });
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const updateApplicationStatus = async (applicationId, stageId) => {
  try {
    const response = await apiClient.patch(`/applications/${applicationId}/status`, { stageId });
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const updateApplicationCustomFields = async (applicationId, customFields) => {
  try {
    const response = await apiClient.patch(`/applications/${applicationId}/custom-fields`, { customFields });
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const removeApplication = async (applicationId) => {
  try {
    await apiClient.delete(`/applications/${applicationId}`);
    return { success: true };
  } catch (error) {
    handleError(error);
  }
};

export const fetchCustomFieldsForEntity = async (entity) => {
  try {
    // entity: 'TALENTS', 'JOB_TALENTS' ou 'JOBS'
    const response = await apiClient.get(`/custom-fields/${entity}`);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const fetchScorecardData = async (applicationId, jobId) => {
  try {
    const response = await apiClient.get(`/scorecard-data/application/${applicationId}/job/${jobId}`);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const fetchKitsForJob = async (jobId) => {
  try {
    const response = await apiClient.get(`/jobs/${jobId}/interview-kits`);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const fetchScorecardForJob = async (jobId) => {
  try {
    const response = await apiClient.get(`/jobs/${jobId}/scorecard`);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const createScorecardAndKit = async (data) => {
  try {
    const response = await apiClient.post('/create-scorecard-and-kit', data);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const submitScorecard = async (applicationId, scorecardId, evaluationData) => {
  try {
    const response = await apiClient.post('/submit-scorecard', { applicationId, scorecardId, evaluationData });
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const fetchInterviewKit = async (kitId) => {
  try {
    const response = await apiClient.get(`/interview-kit/${kitId}`);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const saveKitWeights = async (kitId, weights) => {
  try {
    const response = await apiClient.post(`/interview-kit/${kitId}/weights`, { weights });
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const checkAICacheStatus = async (talentId) => {
  try {
    const response = await apiClient.get(`/ai/cache-status/${talentId}`);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const syncLinkedInProfile = async (talentId) => {
  try {
    const response = await apiClient.post('/ai/sync-profile', { talentId });
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const evaluateScorecardWithAI = async (talentId, jobDetails, scorecard, weights) => {
  try {
    const response = await apiClient.post('/ai/evaluate-scorecard', {
      talentId,
      jobDetails,
      scorecard,
      weights
    });
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const analyzeProfileWithAI = async (scorecardId, profileData, jobId = null) => {
  try {
    const payload = { ...profileData };
    if (jobId) payload.jobId = jobId;
    
    const authData = await loadAuthData();
    const headers = { 'Content-Type': 'application/json' };
    if (authData?.token) {
      headers['Authorization'] = `Bearer ${authData.token}`;
    }

    console.log(`[API] Iniciando análise para Scorecard: ${scorecardId}, Job: ${jobId || 'N/A'}`);
    
    // Usamos axios direto para consistência com o padrão que funciona na extração
    const response = await axios.post(`${API_BASE_URL}/match/${scorecardId}`, payload, { 
      headers,
      timeout: 1800000 // 30 minutos
    });
    
    return response.data;
  } catch (error) {
    console.error(`[API] Erro em analyzeProfileWithAI (Scorecard: ${scorecardId}):`, error);
    handleError(error);
  }
};

// --- AI Memory (Glossário) ---
export const getAIMemories = async () => {
  try {
    const response = await apiClient.get('/ai-memory');
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const createAIMemory = async (data) => {
  try {
    const response = await apiClient.post('/ai-memory', data);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const updateAIMemory = async (id, data) => {
  try {
    const response = await apiClient.put(`/ai-memory/${id}`, data);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const deleteAIMemory = async (id) => {
  try {
    await apiClient.delete(`/ai-memory/${id}`);
    return true;
  } catch (error) {
    handleError(error);
  }
};

// ===================================================================
//                          CHAT SERVICES
// ===================================================================

export const getChatConversations = async () => {
  try {
    const response = await apiClient.get('/chat/conversations');
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const getChatConversation = async (id) => {
  try {
    const response = await apiClient.get(`/chat/conversations/${id}`);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const deleteChatConversation = async (id) => {
  try {
    const response = await apiClient.delete(`/chat/conversations/${id}`);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const getChatSettings = async () => {
  try {
    const response = await apiClient.get('/chat/settings');
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const updateChatSettings = async (settings) => {
  try {
    const response = await apiClient.post('/chat/settings', settings);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

// ===================================================================
//                          ANA INTELLIGENCE SERVICES
// ===================================================================
// ... (existing ana services)

export const getAnaRules = async () => {
  try {
    const response = await apiClient.get('/ana/rules');
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const saveAnaRule = async (ruleData) => {
  try {
    const method = ruleData.id ? 'put' : 'post';
    const url = ruleData.id ? `/ana/rules/${ruleData.id}` : '/ana/rules';
    const response = await apiClient[method](url, ruleData);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const deleteAnaRule = async (id) => {
  try {
    const response = await apiClient.delete(`/ana/rules/${id}`);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const getAnaModels = async () => {
  try {
    const response = await apiClient.get('/ana/models');
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const saveAnaModel = async (modelData) => {
  try {
    const method = modelData.id ? 'put' : 'post';
    const url = modelData.id ? `/ana/models/${modelData.id}` : '/ana/models';
    const response = await apiClient[method](url, modelData);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const deleteAnaModel = async (id) => {
  try {
    const response = await apiClient.delete(`/ana/models/${id}`);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const getAnaEntries = async (modelId) => {
  try {
    const response = await apiClient.get(`/ana/models/${modelId}/entries`);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const saveAnaEntry = async (modelId, entryData) => {
  try {
    const method = entryData.id ? 'put' : 'post';
    const url = entryData.id ? `/ana/entries/${entryData.id}` : `/ana/models/${modelId}/entries`;
    const response = await apiClient[method](url, entryData);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const deleteAnaEntry = async (id) => {
  try {
    const response = await apiClient.delete(`/ana/entries/${id}`);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const extractAnaPdf = async (text) => {
  try {
    const response = await apiClient.post('/ana/extract-pdf', { text });
    return response.data;
  } catch (error) {
    handleError(error);
  }
};