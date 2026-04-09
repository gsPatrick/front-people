/* global chrome */
// src/hooks/useBatchQueue.js
// BRIDGE MODE v1.2.7: Everything is handled by background.js
import { useState, useCallback, useEffect, useMemo } from 'react';

export const useBatchQueue = () => {
    const [queueState, setQueueState] = useState({
        isRunning: false,
        isSourcing: false,
        scorecardId: null,
        tabs: [],
        currentIndex: 0,
        results: []
    });

    // Sincronização Inicial e Real-time com o Background
    useEffect(() => {
        // 1. Carrega o estado atual ao montar o Sidepanel
        const loadInitialState = async () => {
            if (chrome?.runtime?.sendMessage) {
                chrome.runtime.sendMessage({ action: "GET_BATCH_STATE" }, (response) => {
                    if (response?.state) {
                        console.log("[useBatchQueue] Estado carregado do background:", response.state);
                        setQueueState(response.state);
                    }
                });
            }
        };

        loadInitialState();

        // 2. Escuta mudanças vindas do background.js
        const listener = (message) => {
            if (message.type === 'BATCH_STATE_CHANGED') {
                console.log("[useBatchQueue] Atualização de estado recebida:", message.state);
                setQueueState(message.state);
            }
        };

        chrome.runtime.onMessage.addListener(listener);
        return () => chrome.runtime.onMessage.removeListener(listener);
    }, []);

    // Encaminha detecção de abas para o background (se necessário) ou faz local
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
                // Sincroniza abas locais (opcional, já que o background é o mestre)
                resolve(linkedInTabs);
            });
        });
    }, []);

    // --- COMANDOS PARA O BACKGROUND ---

    const startQueue = useCallback((scorecardId, jobId = null, tabs = null) => {
        console.log("[useBatchQueue] Solicitando START_BATCH ao background...");
        const tabsToUse = tabs || queueState.tabs;
        chrome.runtime.sendMessage({ 
            action: "START_BATCH", 
            tabs: tabsToUse, 
            scorecardId, 
            jobId 
        });
    }, [queueState.tabs]);

    const stopQueue = useCallback(() => {
        console.log("[useBatchQueue] Solicitando STOP_BATCH ao background...");
        chrome.runtime.sendMessage({ action: "STOP_BATCH" });
    }, []);

    const resetQueue = useCallback(() => {
        console.log("[useBatchQueue] Solicitando RESET_BATCH ao background...");
        chrome.runtime.sendMessage({ action: "RESET_BATCH" });
    }, []);

    const sourceProfilesFromSearch = useCallback(async (searchUrl, scorecardId, targetCount = 50, jobId = null) => {
        console.log("[useBatchQueue] Solicitando START_SOURCING (Ghost) ao background...");
        chrome.runtime.sendMessage({ 
            action: "START_SOURCING", 
            searchUrl, 
            scorecardId, 
            targetCount, 
            jobId 
        });
    }, []);

    const startProcessFromSingleUrl = useCallback(async (profileUrl, scorecardId, jobId = null) => {
        const match = profileUrl?.match(/linkedin\.com\/in\/([^/?]+)/);
        const singleItem = [{ id: null, url: profileUrl, username: match ? match[1] : 'unknown', status: 'pending' }];
        startQueue(scorecardId, jobId, singleItem);
    }, [startQueue]);

    // Funções de UI (Aceitar/Rejeitar) continuam sendo proxies para api se necessário, 
    // mas o estado da fila é mandado pelo background.
    const acceptProfile = useCallback((result) => result, []);
    const rejectProfile = useCallback((result) => result, []);

    return useMemo(() => ({ 
        queueState, 
        detectLinkedInTabs, 
        startQueue, 
        stopQueue, 
        resetQueue, 
        acceptProfile, 
        rejectProfile, 
        sourceProfilesFromSearch, 
        startProcessFromSingleUrl 
    }), [queueState, detectLinkedInTabs, startQueue, stopQueue, resetQueue, sourceProfilesFromSearch, startProcessFromSingleUrl]);
};
