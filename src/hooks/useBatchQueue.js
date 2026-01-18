// src/hooks/useBatchQueue.js
import { useState, useCallback, useRef } from 'react';
import * as api from '../services/api.service.js';

const TIMEOUT_PER_TAB = 20000; // 20 segundos por aba

export const useBatchQueue = () => {
    const [queueState, setQueueState] = useState({
        isRunning: false,
        scorecardId: null,
        tabs: [],
        currentIndex: 0,
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

    // Processa uma única aba
    const processTab = useCallback(async (tab, scorecardId) => {
        return new Promise(async (resolve) => {
            const timeout = setTimeout(() => {
                resolve({
                    username: tab.username,
                    error: 'Timeout',
                    tabId: tab.id
                });
            }, TIMEOUT_PER_TAB);

            try {
                // 1. Ativa a aba
                await chrome.tabs.update(tab.id, { active: true });
                await new Promise(r => setTimeout(r, 500));

                // 2. Injeta o Relay
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['scripts/pdf_relay.js']
                });

                // 3. Injeta o Scraper no MAIN world
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['scripts/linkedin_pdf_scraper.js'],
                    world: 'MAIN'
                });

                // 4. Injeta a automação de clique
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: function () {
                        (async function () {
                            const waitForElement = (selector, timeout = 5000) => {
                                return new Promise((resolve, reject) => {
                                    const interval = setInterval(() => {
                                        const element = document.querySelector(selector);
                                        if (element) { clearInterval(interval); resolve(element); }
                                    }, 100);
                                    setTimeout(() => { clearInterval(interval); reject(new Error('Timeout')); }, timeout);
                                });
                            };

                            try {
                                let moreButton = document.querySelector('button[aria-label*="More"], button[aria-label*="Mais"]') ||
                                    document.querySelector('button[data-view-name="profile-overflow-button"]');

                                if (!moreButton) {
                                    const buttons = Array.from(document.querySelectorAll('button'));
                                    moreButton = buttons.find(btn => btn.querySelector('svg[id*="overflow"]') !== null);
                                }

                                if (!moreButton) throw new Error('Botão não encontrado');

                                moreButton.click();
                                await new Promise(r => setTimeout(r, 500));

                                const dropdownItems = Array.from(document.querySelectorAll('.artdeco-dropdown__item, [role="menuitem"]'));
                                const savePdfItem = dropdownItems.find(item => {
                                    const text = item.innerText.trim().toLowerCase();
                                    return text === 'save to pdf' || text === 'salvar como pdf';
                                });

                                if (!savePdfItem) throw new Error('Opção PDF não encontrada');
                                savePdfItem.click();
                            } catch (error) {
                                console.error('[BATCH] Erro na automação:', error.message);
                            }
                        })();
                    }
                });

                // 5. Espera o resultado do processamento (via mensagem do background)
                // Configurar listener temporário
                const waitForResult = () => {
                    return new Promise((resolveResult) => {
                        const listener = (message) => {
                            if (message.type === 'PDF_EXTRACTION_SUCCESS') {
                                chrome.runtime.onMessage.removeListener(listener);
                                resolveResult({ success: true, data: message.payload });
                            } else if (message.type === 'PDF_EXTRACTION_FAILURE') {
                                chrome.runtime.onMessage.removeListener(listener);
                                resolveResult({ success: false, error: message.payload.message });
                            }
                        };
                        chrome.runtime.onMessage.addListener(listener);

                        // Timeout interno
                        setTimeout(() => {
                            chrome.runtime.onMessage.removeListener(listener);
                            resolveResult({ success: false, error: 'Timeout aguardando extração' });
                        }, 15000);
                    });
                };

                const extractionResult = await waitForResult();

                if (!extractionResult.success) {
                    clearTimeout(timeout);
                    resolve({
                        username: tab.username,
                        tabId: tab.id,
                        error: extractionResult.error
                    });
                    return;
                }

                // 6. Executa o Match com o Scorecard
                const profileData = extractionResult.data;
                const matchResult = await api.analyzeProfileWithAI(scorecardId, profileData);

                clearTimeout(timeout);
                resolve({
                    username: tab.username,
                    tabId: tab.id,
                    name: profileData.perfil?.nome || tab.username,
                    headline: profileData.perfil?.titulo,
                    profileData: profileData,
                    matchResult: matchResult,
                    averageScore: matchResult?.averageScore,
                    categories: matchResult?.categories
                });

            } catch (error) {
                clearTimeout(timeout);
                resolve({
                    username: tab.username,
                    tabId: tab.id,
                    error: error.message
                });
            }
        });
    }, []);

    // Inicia o processamento da fila
    const startQueue = useCallback(async (scorecardId, explicitTabs = null) => {
        if (isRunningRef.current) return;

        isRunningRef.current = true;
        abortRef.current = false;

        setQueueState(prev => ({
            ...prev,
            isRunning: true,
            scorecardId: scorecardId,
            currentIndex: 0,
            results: []
        }));

        // Se passamos tabs, usa elas. Senão, pega do state.
        const tabsToProcess = explicitTabs || [...queueState.tabs];

        for (let i = 0; i < tabsToProcess.length; i++) {
            if (abortRef.current) break;

            setQueueState(prev => ({
                ...prev,
                currentIndex: i
            }));

            let currentItem = tabsToProcess[i];
            let activeTabId = currentItem.id;
            let createdTab = false;

            // Lógica para abrir aba se for item de Automação
            if (!activeTabId && currentItem.url) {
                try {
                    const tab = await chrome.tabs.create({ url: currentItem.url, active: false });
                    activeTabId = tab.id;
                    currentItem = { ...currentItem, id: activeTabId }; // Atualiza item localmente
                    createdTab = true;
                    // Espera carregar página
                    await new Promise(r => setTimeout(r, 6000));
                } catch (err) {
                    console.error("Erro ao abrir aba:", err);
                    setQueueState(prev => ({
                        ...prev,
                        results: [...prev.results, { username: currentItem.username, error: "Falha ao abrir link" }]
                    }));
                    continue; // Pula para próximo
                }
            }

            // Processa
            const result = await processTab(currentItem, scorecardId);

            // Fecha aba temporária
            if (createdTab && activeTabId) {
                chrome.tabs.remove(activeTabId);
            }

            setQueueState(prev => ({
                ...prev,
                results: [...prev.results, result]
            }));

            // Delay Humano (só se não for o último)
            if (i < tabsToProcess.length - 1) {
                const delay = Math.floor(Math.random() * (4000 - 2000 + 1) + 2000);
                await new Promise(r => setTimeout(r, delay));
            }
        }

        isRunningRef.current = false;
        setQueueState(prev => ({
            ...prev,
            isRunning: false
        }));
    }, [queueState.tabs, processTab]);

    // Para a fila
    const stopQueue = useCallback(() => {
        abortRef.current = true;
        isRunningRef.current = false;
        setQueueState(prev => ({
            ...prev,
            isRunning: false
        }));
    }, []);

    // Aceitar perfil (navegar para criação)
    const acceptProfile = useCallback((result) => {
        console.log('[BATCH] Perfil aceito:', result.username);
        // A lógica de criação será chamada pelo componente pai
        return result;
    }, []);

    // Rejeitar perfil
    const rejectProfile = useCallback((result) => {
        console.log('[BATCH] Perfil rejeitado:', result.username);
        return result;
    }, []);

    // NOVA FUNÇÃO: Sourcing Automático via Busca
    const sourceProfilesFromSearch = useCallback(async (searchUrl, scorecardId, targetCount = 50) => {
        const searchTab = await chrome.tabs.create({ url: searchUrl, active: true });
        let collectedUrls = new Set();

        const waitDocs = (ms) => new Promise(r => setTimeout(r, ms));

        try {
            while (collectedUrls.size < targetCount) {
                await waitDocs(6000);

                await chrome.scripting.executeScript({
                    target: { tabId: searchTab.id },
                    files: ['scripts/linkedin_search_scraper.js']
                });

                const response = await chrome.tabs.sendMessage(searchTab.id, {
                    action: "scrape_search_results",
                    goToNext: true
                });

                if (response && response.success) {
                    response.urls.forEach(url => collectedUrls.add(url));
                    if (!response.hasNextPage) break;
                } else {
                    break;
                }

                if (collectedUrls.size >= targetCount) break;
            }
        } catch (e) {
            console.error("Erro no sourcing:", e);
            alert("Erro durante a busca: " + e.message + ". A aba não será fechada para depuração.");
            return 0; // Sai da função sem fechar a aba
        } finally {
            if (collectedUrls.size > 0) {
                // Só fecha se conseguiu algo, senão deixa aberto pra debug
                // setTimeout(() => chrome.tabs.remove(searchTab.id), 2000); 
                // COMENTADO PARA DEBUG: O usuário disse que fechava muito rápido.
                chrome.tabs.remove(searchTab.id);
            }
        }

        if (collectedUrls.size === 0) {
            alert("Nenhum perfil encontrado. Verifique se a URL de busca está correta e se há resultados de 'Pessoas' visíveis.");
            return 0;
        }

        const newItems = Array.from(collectedUrls).slice(0, targetCount).map(url => {
            const match = url.match(/linkedin\.com\/in\/([^/?]+)/);
            return {
                id: null,
                url: url,
                username: match ? match[1] : 'unknown',
                status: 'pending'
            };
        });

        // Atualiza o state VISUALMENTE
        setQueueState(prev => ({
            ...prev,
            tabs: [...prev.tabs, ...newItems]
        }));

        // INICIA AUTOMATICAMENTE A FILA
        // Passamos newItems + abas anteriores para garantir que processe tudo
        if (scorecardId && newItems.length > 0) {
            // Pequeno delay para garantir que o setQueueState não conflite, 
            // mas usamos explicitTabs no startQueue
            console.log("[AutoSource] Iniciando fila automaticamente com", newItems.length, "itens");
            // Combinar com tabs existentes se houver (mas geralmente na automação está zerado)
            // Vamos focar nos newItems para simplificar, já que a ideia é "busca -> processa"
            startQueue(scorecardId, newItems);
        }

        return newItems.length;
    }, [startQueue]);

    return {
        queueState,
        detectLinkedInTabs,
        startQueue,
        stopQueue,
        acceptProfile,
        rejectProfile,
        sourceProfilesFromSearch
    };
};
