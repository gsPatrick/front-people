// src/hooks/useAnaKnowledge.js
import { useState, useCallback } from 'react';
import * as apiService from '../services/api.service';

export const useAnaKnowledge = () => {
    const [rules, setRules] = useState([]);
    const [models, setModels] = useState([]);
    const [entries, setEntries] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    // --- RULES ---
    const loadRules = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await apiService.getAnaRules();
            setRules(data?.rules || []);
            return data;
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
            const data = await apiService.saveAnaRule(ruleData);
            await loadRules();
            return data;
        } catch (err) {
            return { error: err.message };
        } finally {
            setIsLoading(false);
        }
    };

    const deleteRule = async (id) => {
        setIsLoading(true);
        try {
            await apiService.deleteAnaRule(id);
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
            const data = await apiService.getAnaModels();
            setModels(data?.models || []);
            return data;
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
            const data = await apiService.saveAnaModel(modelData);
            await loadModels();
            return data;
        } catch (err) {
            return { error: err.message };
        } finally {
            setIsLoading(false);
        }
    };

    const deleteModel = async (id) => {
        setIsLoading(true);
        try {
            await apiService.deleteAnaModel(id);
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
            const data = await apiService.getAnaEntries(modelId);
            setEntries(data?.entries || []);
            return data;
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
            const data = await apiService.saveAnaEntry(modelId, entryData);
            await loadEntries(modelId);
            return data;
        } catch (err) {
            return { error: err.message };
        } finally {
            setIsLoading(false);
        }
    };

    const deleteEntry = async (id, modelId) => {
        setIsLoading(true);
        try {
            await apiService.deleteAnaEntry(id);
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
            console.log('[ANA] Iniciando extração local de PDF...');
            
            // Carregar o PDF localmente usando pdfjs-dist
            const pdfjs = await import('pdfjs-dist');
            const pdfWorker = await import('pdfjs-dist/build/pdf.worker.mjs?url');
            pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker.default;
            
            const arrayBuffer = await file.arrayBuffer();
            const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
            const pdf = await loadingTask.promise;
            
            let fullText = '';
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(' ');
                fullText += pageText + '\n\n';
                
                // Limitar para evitar payloads gigantes no início
                if (fullText.length > 30000) break;
            }
            
            console.log(`[ANA] Texto extraído (${fullText.length} caps). Enviando para IA...`);
            
            // Enviar texto extraído para o backend
            const data = await apiService.extractAnaPdf(fullText);
            return data;
        } catch (err) {
            console.error('[ANA] Erro na extração local:', err);
            return { error: 'Falha ao ler o PDF localmente: ' + err.message };
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
