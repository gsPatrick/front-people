/* global chrome */
// src/hooks/useBatchQueue.js
import { useState, useCallback, useRef, useMemo } from 'react';
import * as api from '../services/api.service.js';

const TIMEOUT_PER_TAB = 3600000; // 1 hora (Praticamente ilimitado conforme solicitado)

export const useBatchQueue = () => {
    const [queueState, setQueueState] = useState({
        isRunning: false,
        isSourcing: false,
        scorecardId: null,
        tabs: [],
        currentIndex: 0,
        currentAttempt: 1,
        results: []
    });

    const isRunningRef = useRef(false);
    const abortRef = useRef(false);

    // Detecta todas as abas do LinkedIn abertas
    const detectLinkedInTabs = useCallback(async () => {
        return new Promise((resolve) => {
            if (!chrome?.tabs) {
                resolve([]);
                return;
            }

            chrome.tabs.query({}, (allTabs) => {
                const linkedInTabs = allTabs.filter(tab =>
                    tab.url && tab.url.includes('linkedin.com/in/')
                ).map(tab => {
                    const match = tab.url.match(/linkedin\.com\/in\/([^/?]+)/);
                    return {
                        id: tab.id,
                        url: tab.url,
                        username: match ? match[1] : 'unknown',
                        status: 'pending'
                    };
                });

                setQueueState(prev => ({
                    ...prev,
                    tabs: linkedInTabs
                }));

                resolve(linkedInTabs);
            });
        });
    }, []);

    // Processa uma única aba com suporte a RETRIES ILIMITADOS
    const processTab = useCallback(async (tab, scorecardId, attempt = 1, jobId = null) => {
        console.log(`[BATCH] Processando ${tab.username} - Tentativa ${attempt}`);

        return new Promise((resolve) => { (async () => {
            // Timeout de segurança extremamente longo para evitar abas zumbis
            const timeout = setTimeout(() => {
                resolve({
                    username: tab.username,
                    error: 'Timeout (Ilimitado atingido - 1h)',
                    tabId: tab.id,
                    shouldRetry: true
                });
            }, TIMEOUT_PER_TAB);

            try {
                let currentTabId = tab.id;

                // 1. Abre a aba se não houver um ID válido
                if (!currentTabId && tab.url) {
                    console.log(`[BATCH] Abrindo aba: ${tab.url}`);
                    const newTab = await chrome.tabs.create({ url: tab.url, active: true });
                    currentTabId = newTab.id;
                    tab.id = currentTabId; // IMPORTANTE: Atualiza o item com o ID real para rastreamento
                    await new Promise(r => setTimeout(r, 6000)); // Tempo extra para carregar
                }

                if (!currentTabId) throw new Error("Aba não encontrada");

                // 2. Garante que a aba está ativa
                await chrome.tabs.update(currentTabId, { active: true });
                await new Promise(r => setTimeout(r, 2000));

                // 3. Injeta o Relay e Scraper
                await chrome.scripting.executeScript({ target: { tabId: currentTabId }, files: ['scripts/pdf_relay.js'] });
                await chrome.scripting.executeScript({ target: { tabId: currentTabId }, files: ['scripts/linkedin_pdf_scraper.js'], world: 'MAIN' });

                // 4. Automação de Clique (Botão "More" -> "Save to PDF")
                await chrome.scripting.executeScript({
                    target: { tabId: currentTabId },
                    func: function () {
                        const clickPdf = async () => {
                            let moreButton = document.querySelector('button[aria-label*="More"], button[aria-label*="Mais"]') ||
                                document.querySelector('button[data-view-name="profile-overflow-button"]');

                            if (!moreButton) {
                                const buttons = Array.from(document.querySelectorAll('button'));
                                moreButton = buttons.find(btn => btn.querySelector('svg[id*="overflow"]') !== null);
                            }

                            if (moreButton) {
                                moreButton.click();
                                await new Promise(r => setTimeout(r, 800));
                                const items = Array.from(document.querySelectorAll('.artdeco-dropdown__item, [role="menuitem"]'));
                                const pdfItem = items.find(i => /pdf/i.test(i.innerText));
                                if (pdfItem) pdfItem.click();
                            }
                        };
                        clickPdf();
                    }
                });

                // 5. Espera o resultado (Sem timeout interno rígido)
                const waitForResult = () => {
                    return new Promise((resolveResult) => {
                        const listener = (message) => {
                            if (message.type === 'PDF_EXTRACTION_SUCCESS') {
                                chrome.runtime.onMessage.removeListener(listener);
                                resolveResult({ success: true, data: message.payload });
                            } else if (message.type === 'PDF_EXTRACTION_FAILURE') {
                                chrome.runtime.onMessage.removeListener(listener);
                                resolveResult({ success: false, error: message.payload?.message || 'Erro desconhecido' });
                            }
                        };
                        chrome.runtime.onMessage.addListener(listener);

                        // Colocado 30 minutos (1800000 ms) como margem absoluta máxima
                        setTimeout(() => {
                            chrome.runtime.onMessage.removeListener(listener);
                            resolveResult({ success: false, error: 'IA/Extração demorou além de 30 minutos', retryable: true });
                        }, 1800000);
                    });
                };

                const extractionResult = await waitForResult();

                if (!extractionResult.success) {
                    clearTimeout(timeout);
                    resolve({
                        username: tab.username,
                        error: extractionResult.error,
                        tabId: currentTabId, // Retorna o ID real para limpeza
                        shouldRetry: true
                    });
                    return;
                }

                // 6. Match com IA (Análise de Perfil)
                const profileData = extractionResult.data;
                console.log(`[BATCH] Enviando para análise. Scorecard: ${scorecardId || 'NULL'}, Job: ${jobId || 'NULL'}`);
                console.log(`[BATCH] Payload do Perfil:`, profileData);
                
                if (!scorecardId) {
                    console.warn(`[BATCH] ScorecardId ausente para ${tab.username}. Pulando análise.`);
                }

                const matchResult = scorecardId ? await api.analyzeProfileWithAI(scorecardId, profileData, jobId) : null;
                console.log(`[BATCH] Resultado da análise recebido para ${tab.username}:`, matchResult);

                // Mapeamento de Adaptador para UI (Mantendo Escala Base-100)
                const matchScore = matchResult?.matchScore || 0;
                const categories = [];
                const strengths = [];
                const weaknesses = [];

                if (matchResult?.categories) {
                    matchResult.categories.forEach(cat => {
                        // Backend agora retorna 0-100 para categorias também
                        categories.push({ ...cat, averageScore: cat.score });
                        if (cat.criteria) {
                            cat.criteria.forEach(crit => {
                                // Thresholds ajustados para escala 0-100
                                if (crit.score >= 80) strengths.push(crit.justification);
                                else if (crit.score <= 40) weaknesses.push(crit.justification);
                            });
                        }
                    });
                }

                clearTimeout(timeout);
                resolve({
                    username: tab.username,
                    name: profileData.perfil?.nome || profileData.name || tab.username,
                    headline: profileData.perfil?.titulo || profileData.headline,
                    profileData,
                    matchResult,
                    matchScore: matchScore, // Score oficial (0-100)
                    averageScore: matchScore, // Legado (0-100 agora)
                    categories: categories,
                    strengths: strengths.slice(0, 3),
                    weaknesses: weaknesses.slice(0, 3),
                    tabId: tab.id,
                    success: true
                });

            } catch (err) {
                clearTimeout(timeout);
                resolve({ username: tab.username, error: err.message, tabId: tab.id, shouldRetry: true });
            }
        })(); });
    }, []);

    // Função auxiliar para fechar uma aba de forma segura (sem errar se já fechada)
    const safeCloseTab = async (tabId) => {
        if (!tabId || !chrome?.tabs) return;
        try {
            await chrome.tabs.remove(tabId);
            console.log(`[BATCH] 🗑️ Aba ${tabId} fechada.`);
        } catch { /* aba já estava fechada */ }
    };

    // Inicia o processamento da fila com RETRIES
    const startQueue = useCallback(async (scorecardId, jobId = null, explicitTabs = null) => {
        if (isRunningRef.current) return;

        isRunningRef.current = true;
        abortRef.current = false;

        setQueueState(prev => ({
            ...prev,
            isRunning: true,
            scorecardId: scorecardId || prev.scorecardId, // Mantém o anterior se vier nulo
            currentIndex: 0,
            results: []
        }));

        const tabsToProcess = explicitTabs || [...queueState.tabs];
        // Rastreamento de TODAS as abas abertas pela fila para limpeza final
        const openedTabIds = new Set();

        for (let i = 0; i < tabsToProcess.length; i++) {
            if (abortRef.current) break;

            setQueueState(prev => ({ ...prev, currentIndex: i }));

            let currentItem = tabsToProcess[i];
            let success = false;
            let attempt = 1;
            let finalResult = null;
            const wasCreatedBySystem = !currentItem.id; // TRUE se o sistema vai criar a aba (id era null)

            // LOOP DE RETRY: Tenta infinitamente (ou até limite muito alto) como pedido
            while (!success && !abortRef.current) {
                setQueueState(prev => ({ ...prev, currentAttempt: attempt }));
                const result = await processTab(currentItem, scorecardId, attempt, jobId);

                // Rastreia APENAS abas CRIADAS pelo sistema (não abas pré-existentes do usuário)
                if (result.tabId && wasCreatedBySystem) openedTabIds.add(result.tabId);

                if (result.success) {
                    success = true;
                    finalResult = result;
                    console.log(`[BATCH] ✅ Sucesso em ${currentItem.username} após ${attempt} tentativas.`);
                } else if (result.shouldRetry) {
                    console.log(`[BATCH] ⚠️ Falha em ${currentItem.username}. Tentando novamente em 15s... (Tentativa ${attempt})\nMotivo: ${result.error}`);
                    attempt++;
                    // A cada 3 falhas, fecha a aba travada (se foi criada pelo sistema) e deixa o próximo loop criar uma nova
                    if (attempt % 3 === 0 && currentItem.id && wasCreatedBySystem) {
                        await safeCloseTab(currentItem.id);
                        openedTabIds.delete(currentItem.id);
                        currentItem.id = null;
                    }
                    await new Promise(r => setTimeout(r, 15000));
                } else {
                    finalResult = result;
                    break;
                }
            }

            if (finalResult) {
                setQueueState(prev => ({
                    ...prev,
                    results: [...prev.results, finalResult]
                }));
            }

            // FECHA a aba do perfil APENAS se foi criada pelo sistema
            if (wasCreatedBySystem) {
                const tabIdToClose = finalResult?.tabId || currentItem.id;
                if (tabIdToClose) {
                    await safeCloseTab(tabIdToClose);
                    openedTabIds.delete(tabIdToClose);
                }
            }

            // Delay entre perfis
            if (i < tabsToProcess.length - 1 && !abortRef.current) {
                const delay = Math.floor(Math.random() * 8000) + 12000;
                console.log(`[BATCH] ⏳ Aguardando ${Math.round(delay/1000)}s antes do próximo perfil...`);
                await new Promise(r => setTimeout(r, delay));
            }
        }

        // LIMPEZA FINAL: Fecha quaisquer abas remanescentes que a fila tenha aberto
        console.log(`[BATCH] 🧹 Limpeza final: ${openedTabIds.size} abas restantes para fechar.`);
        for (const tabId of openedTabIds) {
            await safeCloseTab(tabId);
        }

        isRunningRef.current = false;
        setQueueState(prev => ({ ...prev, isRunning: false }));
    }, [queueState.tabs, processTab]);

    const stopQueue = useCallback(() => {
        abortRef.current = true;
        isRunningRef.current = false;
        setQueueState(prev => ({ ...prev, isRunning: false }));
    }, []);

    const resetQueue = useCallback(() => {
        stopQueue();
        setQueueState({ isRunning: false, isSourcing: false, scorecardId: null, tabs: [], currentIndex: 0, results: [] });
    }, [stopQueue]);

    const acceptProfile = useCallback((result) => result, []);
    const rejectProfile = useCallback((result) => result, []);

    const sourceProfilesFromSearch = useCallback(async (searchUrl, scorecardId, targetCount = 50, jobId = null) => {
        setQueueState(prev => ({ ...prev, isSourcing: true }));
        let searchTab = null;
        let collectedUrls = new Set();
        try {
            // Tenta encontrar uma aba já aberta com a URL de busca para evitar duplicatas
            const existingTabs = await new Promise(r => chrome.tabs.query({ url: searchUrl }, r));
            if (existingTabs && existingTabs.length > 0) {
                searchTab = existingTabs[0];
                await chrome.tabs.update(searchTab.id, { active: true });
            } else {
                searchTab = await chrome.tabs.create({ url: searchUrl, active: true });
            }
            while (collectedUrls.size < targetCount) {
                await new Promise(r => setTimeout(r, 6000));
                await chrome.scripting.executeScript({ target: { tabId: searchTab.id }, files: ['scripts/linkedin_search_scraper.js'] });
                const response = await chrome.tabs.sendMessage(searchTab.id, { action: "scrape_search_results", goToNext: true });
                if (response?.success) {
                    response.urls.forEach(url => collectedUrls.add(url));
                    if (!response.hasNextPage) break;
                } else break;
            }
        } catch (e) {
            console.error("Erro no sourcing:", e);
        }
        // NÃO fecha a aba da listagem (mantenha aberta para o usuário)
        const newItems = Array.from(collectedUrls).slice(0, targetCount).map(url => {
            const match = url.match(/linkedin\.com\/in\/([^/?]+)/);
            return { id: null, url, username: match ? match[1] : 'unknown', status: 'pending' };
        });
        setQueueState(prev => ({ ...prev, isSourcing: false, tabs: [...prev.tabs, ...newItems] }));
        if (newItems.length > 0) startQueue(scorecardId, jobId, newItems);
        return newItems.length;
    }, [startQueue]);

    const startProcessFromSingleUrl = useCallback(async (profileUrl, scorecardId, jobId = null) => {
        const match = profileUrl?.match(/linkedin\.com\/in\/([^/?]+)/);
        const singleItem = { id: null, url: profileUrl, username: match ? match[1] : 'unknown', status: 'pending' };
        setQueueState(prev => ({ ...prev, tabs: [singleItem], isRunning: true, currentIndex: 0, results: [] }));
        startQueue(scorecardId, jobId, [singleItem]);
    }, [startQueue]);

    return useMemo(() => ({ queueState, detectLinkedInTabs, startQueue, stopQueue, resetQueue, acceptProfile, rejectProfile, sourceProfilesFromSearch, startProcessFromSingleUrl }), [queueState, detectLinkedInTabs, startQueue, stopQueue, resetQueue, acceptProfile, rejectProfile, sourceProfilesFromSearch, startProcessFromSingleUrl]);
};
