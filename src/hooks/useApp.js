// ATUALIZE O ARQUIVO: src/hooks/useApp.js

import { useState, useEffect, useCallback } from 'react';
import * as api from '../services/api.service';
import { saveSettings, loadSettings, loadSessionState } from '../services/session.service';

const DEFAULT_SETTINGS = {
    isSidePanelModeEnabled: true,
    isPersistenceEnabled: false,
    isOpenInTabEnabled: false,
    isAIEnabled: false
};

export const useApp = (executeAsync, navigateTo) => {
    const [settings, setSettings] = useState(null);
    const [isOnLinkedInProfile, setIsOnLinkedInProfile] = useState(false);

    useEffect(() => {
        const checkCurrentTab = async () => {
            try {
                const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
                setIsOnLinkedInProfile(activeTab?.url?.includes("linkedin.com/in/") || false);
            } catch (e) {
                console.warn("Não foi possível verificar a aba:", e.message);
                setIsOnLinkedInProfile(false);
            }
        };

        checkCurrentTab();
        const listener = () => checkCurrentTab();
        chrome.tabs.onUpdated.addListener(listener);
        chrome.tabs.onActivated.addListener(listener);

        return () => {
            chrome.tabs.onUpdated.removeListener(listener);
            chrome.tabs.onActivated.removeListener(listener);
        };
    }, []);

    /**
     * CORREÇÃO: A função agora não recebe mais setters.
     * Em vez disso, ela carrega os dados e os RETORNA para o Popup.jsx.
     */
    const initializeApp = useCallback(async () => {
        const loadedSettings = await loadSettings();
        const currentSettings = { ...DEFAULT_SETTINGS, ...loadedSettings };

        let linkedInUrl = null;
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab) linkedInUrl = tab.url;
        } catch (e) { console.warn("Não foi possível acessar a URL da aba."); }

        // Se estiver no LinkedIn, retorna uma ação específica
        if (linkedInUrl && linkedInUrl.includes("linkedin.com/in/")) {
            const validationResult = await api.validateProfile(linkedInUrl);
            return { settings: currentSettings, initialAction: 'LINKEDIN_PROFILE', payload: validationResult };
        }

        // Se a persistência estiver ativa, tenta carregar a sessão
        if (currentSettings.isPersistenceEnabled) {
            const savedState = await loadSessionState();
            if (savedState && savedState.view && savedState.view !== 'loading') {
                return { settings: currentSettings, initialAction: 'RESTORE_SESSION', payload: savedState };
            }
        }

        // Caso contrário, é um início limpo
        return { settings: currentSettings, initialAction: 'FRESH_START', payload: null };
    }, []);

    const handleSettingChange = useCallback(async (key, value) => {
        const newSettings = { ...(settings || DEFAULT_SETTINGS), [key]: value };
        setSettings(newSettings);
        await saveSettings(newSettings);

        if (key === 'isSidePanelModeEnabled') {
            try {
                chrome.runtime.reload();
            } catch (e) {
                console.error("Falha ao recarregar a extensão:", e);
                navigateTo('restart_required');
            }
        }
    }, [settings, navigateTo]);

    const handleCaptureLinkedInProfile = useCallback((setProfileContext) => executeAsync(async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.url && tab.url.includes("linkedin.com/in/")) {
            const validationResult = await api.validateProfile(tab.url);
            setProfileContext(validationResult);
            navigateTo('add_confirm');
        } else {
            alert("Para capturar, por favor, navegue até um perfil válido no LinkedIn.");
        }
    }), [executeAsync, navigateTo]);

    /**
     * CORREÇÃO: Expondo 'setSettings' para que o Popup.jsx possa usá-lo.
     */
    return {
        settings,
        setSettings, // <-- AQUI ESTÁ A MUDANÇA IMPORTANTE
        isOnLinkedInProfile,
        initializeApp,
        handleSettingChange,
        handleCaptureLinkedInProfile
    };
};