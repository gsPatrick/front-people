// src/services/api.service.js

import axios from 'axios';

// ATENÇÃO: Verifique se esta URL está correta para o seu ambiente de desenvolvimento.
const API_BASE_URL = 'https://geral-people-api.r954jc.easypanel.host/api';
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Lida com erros da API, extraindo a mensagem de erro relevante.
 * @param {Error} error - O objeto de erro do Axios.
 * @returns {string} A mensagem de erro formatada.
 */
const handleError = (error) => {
  const message = error.response?.data?.error || error.message || 'Ocorreu um erro inesperado.';
  console.error('Erro na chamada da API:', message);
  throw new Error(message);
};


// ===================================================================
//                          SERVIÇOS DA API
// ===================================================================

// --- Validação e Criação de Perfil (Fluxo do LinkedIn) ---

export const validateProfile = async (profileUrl) => {
  try {
    const response = await apiClient.post('/validate-profile', { profileUrl });
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const createTalent = async (talentData) => {
  try {
    const response = await apiClient.post('/create-talent', talentData);
    return response.data;
  } catch (error)
 {
    handleError(error);
  }
};


// --- Gerenciamento de Talentos ---

// ==========================================================
// CORREÇÃO APLICADA AQUI
// O nome do parâmetro recebido é `exclusiveStartKey` para consistência com o Popup.jsx.
// O nome do parâmetro enviado para a API é `nextPageKey`, que é o que o backend espera.
// ==========================================================
export const fetchAllTalents = async (limit = 10, exclusiveStartKey = null) => {
  try {
    const params = { limit };
    if (exclusiveStartKey) {
      // O backend espera o parâmetro como `nextPageKey`
      params.nextPageKey = JSON.stringify(exclusiveStartKey); 
    }
    const response = await apiClient.get('/talents', { params });
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

export const fetchJobsPaginated = async (page = 1, limit = 3, status = 'open') => {
  try {
    // Inclui o status como um parâmetro da URL
    const response = await apiClient.get(`/jobs?page=${page}&limit=${limit}&status=${status}`);
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

export const deleteTalent = async (talentId) => {
  try {
    const response = await apiClient.delete(`/talents/${talentId}`);
    return response.data; 
  } catch (error) {
    handleError(error);
  }
};


// --- Gerenciamento de Vagas e Candidaturas ---

export const fetchJobs = async () => {
  try {
    const response = await apiClient.get('/jobs');
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
    const response = await apiClient.delete(`/applications/${applicationId}`);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};


// --- Gerenciamento de Campos Personalizados ---

export const fetchCustomFieldsForEntity = async (entity) => {
  try {
    const response = await apiClient.get(`/custom-fields/${entity}`);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};


// --- Gerenciamento de Scorecard ---

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

export const evaluateWithAI = async (talentId, jobDetails, skillToEvaluate) => {
  try {
    const response = await apiClient.post('/ai/evaluate-skill', { talentId, jobDetails, skillToEvaluate });
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


/* ========================================================== */
/* NOVA FUNÇÃO ADICIONADA AQUI                                */
/* ========================================================== */
/**
 * Salva os pesos definidos para um kit de entrevista específico.
 * @param {string} kitId - O ID do kit de entrevista.
 * @param {object} weights - O objeto contendo os pesos, ex: { skillId: weightValue }.
 * @returns {Promise<object>} A resposta da API.
 */
export const saveKitWeights = async (kitId, weights) => {
  try {
    const response = await apiClient.post(`/interview-kit/${kitId}/weights`, { weights });
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const evaluateScorecardWithAI = async (talentId, jobDetails, scorecard, weights) => { // <<< 1. Adicionar weights aqui
  try {
    const response = await apiClient.post('/ai/evaluate-scorecard', { 
      talentId, 
      jobDetails, 
      scorecard, 
      weights // <<< 2. Incluir weights no corpo da requisição
    });
    return response.data;
  } catch (error) {
    handleError(error);
  }
};