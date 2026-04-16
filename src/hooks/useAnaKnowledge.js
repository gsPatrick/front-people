// src/hooks/useAnaKnowledge.js
import { useState, useCallback } from 'react';
import axios from 'axios';
import { loadAuthData } from '../services/session.service';

const API_BASE_URL = 'https://geral-people-api.r954jc.easypanel.host/api';

export const useAnaKnowledge = () => {
    const [rules, setRules] = useState([]);
    const [models, setModels] = useState([]);
    const [entries, setEntries] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    const getHeaders = () => {
        const authData = loadAuthData();
        return {
            'Authorization': `Bearer ${authData?.token}`,
            'Content-Type': 'application/json'
        };
    };

    // --- RULES ---
    const loadRules = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await axios.get(`${API_BASE_URL}/ana/rules`, { headers: getHeaders() });
            setRules(res.data.rules);
            return res.data;
        } catch (err) {
            console.error('Erro ao carregar regras:', err);
            return { error: err.message };
        } finally {
            setIsLoading(false);
        }
    }, []);

    const saveRule = async (ruleData) => {
        setIsLoading(true);
        try {
            const method = ruleData.id ? 'put' : 'post';
            const url = ruleData.id ? `${API_BASE_URL}/ana/rules/${ruleData.id}` : `${API_BASE_URL}/ana/rules`;
            const res = await axios[method](url, ruleData, { headers: getHeaders() });
            await loadRules();
            return res.data;
        } catch (err) {
            return { error: err.message };
        } finally {
            setIsLoading(false);
        }
    };

    const deleteRule = async (id) => {
        setIsLoading(true);
        try {
            await axios.delete(`${API_BASE_URL}/ana/rules/${id}`, { headers: getHeaders() });
            await loadRules();
            return { success: true };
        } catch (err) {
            return { error: err.message };
        } finally {
            setIsLoading(false);
        }
    };

    // --- MODELS ---
    const loadModels = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await axios.get(`${API_BASE_URL}/ana/models`, { headers: getHeaders() });
            setModels(res.data.models);
            return res.data;
        } catch (err) {
            console.error('Erro ao carregar modelos:', err);
            return { error: err.message };
        } finally {
            setIsLoading(false);
        }
    }, []);

    const saveModel = async (modelData) => {
        setIsLoading(true);
        try {
            const method = modelData.id ? 'put' : 'post';
            const url = modelData.id ? `${API_BASE_URL}/ana/models/${modelData.id}` : `${API_BASE_URL}/ana/models`;
            const res = await axios[method](url, modelData, { headers: getHeaders() });
            await loadModels();
            return res.data;
        } catch (err) {
            return { error: err.message };
        } finally {
            setIsLoading(false);
        }
    };

    const deleteModel = async (id) => {
        setIsLoading(true);
        try {
            await axios.delete(`${API_BASE_URL}/ana/models/${id}`, { headers: getHeaders() });
            await loadModels();
            return { success: true };
        } catch (err) {
            return { error: err.message };
        } finally {
            setIsLoading(false);
        }
    };

    // --- ENTRIES ---
    const loadEntries = useCallback(async (modelId) => {
        setIsLoading(true);
        try {
            const res = await axios.get(`${API_BASE_URL}/ana/models/${modelId}/entries`, { headers: getHeaders() });
            setEntries(res.data.entries);
            return res.data;
        } catch (err) {
            console.error('Erro ao carregar entries:', err);
            return { error: err.message };
        } finally {
            setIsLoading(false);
        }
    }, []);

    const saveEntry = async (modelId, entryData) => {
        setIsLoading(true);
        try {
            const method = entryData.id ? 'put' : 'post';
            const url = entryData.id ? `${API_BASE_URL}/ana/entries/${entryData.id}` : `${API_BASE_URL}/ana/models/${modelId}/entries`;
            const res = await axios[method](url, entryData, { headers: getHeaders() });
            await loadEntries(modelId);
            return res.data;
        } catch (err) {
            return { error: err.message };
        } finally {
            setIsLoading(false);
        }
    };

    const deleteEntry = async (id, modelId) => {
        setIsLoading(true);
        try {
            await axios.delete(`${API_BASE_URL}/ana/entries/${id}`, { headers: getHeaders() });
            await loadEntries(modelId);
            return { success: true };
        } catch (err) {
            return { error: err.message };
        } finally {
            setIsLoading(false);
        }
    };

    // --- PDF EXTRACTION ---
    const extractPdfToBlocks = async (file) => {
        setIsLoading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            
            const authData = loadAuthData();
            const res = await axios.post(`${API_BASE_URL}/ana/extract-pdf`, formData, {
                headers: {
                    'Authorization': `Bearer ${authData?.token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
            return res.data;
        } catch (err) {
            return { error: err.response?.data?.error || err.message };
        } finally {
            setIsLoading(false);
        }
    };

    return {
        rules,
        models,
        entries,
        isLoading,
        loadRules,
        saveRule,
        deleteRule,
        loadModels,
        saveModel,
        deleteModel,
        loadEntries,
        saveEntry,
        deleteEntry,
        extractPdfToBlocks
    };
};
