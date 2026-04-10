/* global chrome */
// src/hooks/useApp.js

import { useState, useEffect, useCallback, useMemo } from 'react';
import { saveSettings, loadSettings } from '../services/session.service';
import * as api from '../services/api.service';

// Função de automação que será injetada
function autoDownloadPdfFunction() {
    (async function () {
        console.log('[AUTODOWNLOAD] Script de download automático ativado.');
        try {
            console.log('[AUTODOWNLOAD] Procurando o botão "Mais..."');
            let moreButton =
                document.querySelector('button[aria-label*="More"], button[aria-label*="Mais"]') ||
                document.querySelector('button[data-view-name="profile-overflow-button"]');

            if (!moreButton) {
                const buttons = Array.from(document.querySelectorAll('button'));
                moreButton = buttons.find(btn => btn.querySelector('svg[id*="overflow"]') !== null);
            }
            if (!moreButton) {
                const topcard = document.querySelector('section[data-view-name="profile-top-card"]');
                if (topcard) {
                    moreButton = Array.from(topcard.querySelectorAll('button')).find(btn => {
                        const ariaLabel = btn.getAttribute('aria-label') || '';
                        return ariaLabel.toLowerCase().includes('more') || ariaLabel.toLowerCase().includes('mais');
                    });
                }
            }
            if (!moreButton) throw new Error('Botão "Mais..." não encontrado no perfil.');

            moreButton.click();
            console.log('[AUTODOWNLOAD] Botão "Mais..." clicado.');

            await new Promise(r => setTimeout(r, 500));
            const dropdownItems = Array.from(document.querySelectorAll('.artdeco-dropdown__item, [role="menuitem"]'));
            const savePdfItem = dropdownItems.find(item => {
                const text = item.innerText.trim().toLowerCase();
                return text === 'save to pdf' || text === 'salvar como pdf';
            });
            if (!savePdfItem) throw new Error('Opção "Salvar como PDF" não encontrada no menu.');

            savePdfItem.click();
            console.log('[AUTODOWNLOAD] Clicando em "Salvar como PDF"... O download deve começar.');
        } catch (error) {
            console.error('[AUTODOWNLOAD] Erro no script de automação:', error.message);
            alert(`Falha ao automatizar o download do PDF: ${error.message}`);
        }
    })();
}


export const useApp = (executeAsync, navigateTo) => {
    const [settings, setSettings] = useState(null);
    const [currentTab, setCurrentTab] = useState(null);
    const [validatedProfileUrl, setValidatedProfileUrl] = useState(null);
    const [currentProfileStatus, setCurrentProfileStatus] = useState(null);

    useEffect(() => {
        const autoValidateProfile = async (tab) => {
            // SEGUNDANÇA: Se estivermos em Sourcing ou Batch, a Sidepanel NÃO DEVE validar perfis ativos
            // para evitar interferência nos eventos de tab do Chrome.
            if (batchState.isRunning || batchState.isSourcing) {
                return;
            }

            if (!tab || !tab.url || tab.url === validatedProfileUrl) {
                setCurrentProfileStatus(null);
                return;
            }

            const linkedinProfileRegex = /linkedin\.com\/in\/([a-zA-Z0-9-]+)/;
            const match = tab.url.match(linkedinProfileRegex);

            if (match && match[1]) {
                const username = match[1];
                console.log(`[AUTO-VALIDATE] Perfil detectado: ${username}. Validando...`);
                setValidatedProfileUrl(tab.url);

                const validationResult = await api.validateProfile(tab.url);

                setCurrentProfileStatus(validationResult);
            } else {
                setValidatedProfileUrl(null);
                setCurrentProfileStatus(null);
            }
        };

        const handleTabChange = () => {
            if (chrome && chrome.tabs) {
                chrome.tabs.query({ active: true, currentWindow: true }, ([activeTab]) => {
                    if (activeTab) {
                        setCurrentTab(activeTab);
                        autoValidateProfile(activeTab);
                    }
                });
            }
        };

        handleTabChange();

        const listeners = {
            onUpdated: (tabId, changeInfo) => {
                if (tabId === currentTab?.id && changeInfo.url) {
                    handleTabChange();
                }
            },
            onActivated: handleTabChange
        };

        if (chrome && chrome.tabs) {
            chrome.tabs.onUpdated.addListener(listeners.onUpdated);
            chrome.tabs.onActivated.addListener(listeners.onActivated);
            return () => {
                chrome.tabs.onUpdated.removeListener(listeners.onUpdated);
                chrome.tabs.onActivated.removeListener(listeners.onActivated);
            };
        }
    }, [validatedProfileUrl, navigateTo, currentTab]);


    const initializeApp = useCallback(async () => {
        const loadedSettings = await loadSettings();
        const currentSettings = { isSidePanelModeEnabled: true, ...loadedSettings };
        setSettings(currentSettings);
        return { settings: currentSettings, initialAction: 'FRESH_START', payload: null };
    }, []);

    const handleSettingChange = useCallback(async (key, value) => {
        const newSettings = { ...(settings || {}), [key]: value };
        setSettings(newSettings);
        await saveSettings(newSettings);
        if (key === 'isSidePanelModeEnabled' && chrome.runtime) {
            try { chrome.runtime.reload(); } catch { navigateTo('restart_required'); }
        }
    }, [settings, navigateTo]);


    // ==========================================================
    // MUDANÇA PRINCIPAL AQUI
    // ==========================================================
    const handleCaptureLinkedInProfile = useCallback(async () => {
        try {
            if (!currentTab || !currentTab.url || !currentTab.url.includes("linkedin.com/in/")) {
                alert("Para capturar um perfil, navegue até uma página de perfil do LinkedIn.");
                return;
            }

            alert("Iniciando a captura do perfil. O processo continuará em segundo plano na aba do LinkedIn.");

            await chrome.scripting.executeScript({
                target: { tabId: currentTab.id },
                files: ['scripts/pdf_relay.js']
            });

            await chrome.scripting.executeScript({
                target: { tabId: currentTab.id },
                files: ['scripts/linkedin_pdf_scraper.js'],
                world: 'MAIN'
            });

            await chrome.scripting.executeScript({
                target: { tabId: currentTab.id },
                func: autoDownloadPdfFunction
            });

        } catch (error) {
            console.error("[POPUP] Erro ao injetar scripts:", error);
            alert(`Ocorreu um erro ao tentar iniciar a captura: ${error.message}`);
        }
    }, [currentTab]);

    return useMemo(() => ({
        settings,
        setSettings,
        currentTab,
        currentProfileStatus,
        initializeApp,
        handleSettingChange,
        handleCaptureLinkedInProfile,
    }), [settings, currentTab, currentProfileStatus, initializeApp, handleSettingChange, handleCaptureLinkedInProfile]);
};