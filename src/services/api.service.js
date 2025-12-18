// ARQUIVO COMPLETO E ATUALIZADO: src/services/api.service.js

import axios from 'axios';
import { loadAuthData } from './session.service';

const API_BASE_URL = 'https://geral-people-api.r954jc.easypanel.host/api'; // <-- Sua URL de produção

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// INTERCEPTADOR: Adiciona o token de autenticação a cada requisição
apiClient.interceptors.request.use(async (config) => {
    const authData = await loadAuthData();
    if (authData?.token) {
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
        await apiClient.delete(`/scorecards/${id}`);
        return { success: true };
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

export const createTalent = async (talentData) => {
  try {
    const response = await apiClient.post('/create-talent', talentData);
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

export const deleteTalent = async (talentId) => {
  try {
    await apiClient.delete(`/talents/${talentId}`);
    return { success: true };
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

export const analyzeProfileWithAI = async (scorecardId, profileData) => {
  try {
    const response = await apiClient.post(`/match/${scorecardId}`, profileData);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};