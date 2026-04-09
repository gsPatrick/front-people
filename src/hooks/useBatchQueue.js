/* global chrome */
// src/hooks/useBatchQueue.js - Versão Proxy (Delega para o Background.js)
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

    // Sincroniza estado inicial e ouve mudanças do background
    useEffect(() => {
        const syncState = () => {
            chrome.runtime.sendMessage({ action: "GET_BATCH_STATE" }, (response) => {
                if (response?.state) {
                    setQueueState(prev => ({ ...prev, ...response.state }));
                }
            });
        };

        syncState();

        const listener = (message) => {
            if (message.type === 'BATCH_STATE_CHANGED') {
                setQueueState(prev => ({ ...prev, ...message.state }));
            }
        };

        chrome.runtime.onMessage.addListener(listener);
        return () => chrome.runtime.onMessage.removeListener(listener);
    }, []);

    const detectLinkedInTabs = useCallback(async () => {
        return new Promise((resolve) => {
            if (!chrome?.tabs) return resolve([]);
            chrome.tabs.query({}, (allTabs) => {
                const linkedInTabs = allTabs.filter(tab => tab.url?.includes('linkedin.com/in/')).map(tab => {
                    const match = tab.url.match(/linkedin\.com\/in\/([^/?]+)/);
                    return { id: tab.id, url: tab.url, username: match ? match[1] : 'unknown', status: 'pending' };
                });
                setQueueState(prev => ({ ...prev, tabs: linkedInTabs }));
                resolve(linkedInTabs);
            });
        });
    }, []);

    const startQueue = useCallback(async (scorecardId, jobId = null, explicitTabs = null) => {
        const tabsToProcess = explicitTabs || queueState.tabs;
        chrome.runtime.sendMessage({ 
            action: "START_BATCH", 
            tabs: tabsToProcess, 
            scorecardId, 
            jobId 
        });
    }, [queueState.tabs]);

    const stopQueue = useCallback(() => {
        chrome.runtime.sendMessage({ action: "STOP_BATCH" });
    }, []);

    const resetQueue = useCallback(() => {
        chrome.runtime.sendMessage({ action: "RESET_BATCH" });
    }, []);

    const sourceProfilesFromSearch = useCallback(async (searchUrl, scorecardId, targetCount = 50, jobId = null) => {
        // Envia para o background fazer o sourcing fantasma
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
        const singleItem = { id: null, url: profileUrl, username: match ? match[1] : 'unknown', status: 'pending' };
        setQueueState(prev => ({ ...prev, tabs: [singleItem] }));
        startQueue(scorecardId, jobId, [singleItem]);
    }, [startQueue]);

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
    }), [queueState, detectLinkedInTabs, startQueue, stopQueue, resetQueue, acceptProfile, rejectProfile, sourceProfilesFromSearch, startProcessFromSingleUrl]);
};
