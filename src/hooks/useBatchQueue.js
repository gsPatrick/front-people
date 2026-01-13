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
    const startQueue = useCallback(async (scorecardId) => {
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

        const tabs = queueState.tabs;

        for (let i = 0; i < tabs.length; i++) {
            if (abortRef.current) break;

            setQueueState(prev => ({
                ...prev,
                currentIndex: i
            }));

            const result = await processTab(tabs[i], scorecardId);

            setQueueState(prev => ({
                ...prev,
                results: [...prev.results, result]
            }));
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

    return {
        queueState,
        detectLinkedInTabs,
        startQueue,
        stopQueue,
        acceptProfile,
        rejectProfile
    };
};
