// ARQUIVO FINAL COM A CORREÇÃO: src/hooks/useApp.js

import { useState, useEffect, useCallback } from 'react';
import { saveSettings, loadSettings } from '../services/session.service';
import * as api from '../services/api.service';

// Função de automação que será injetada
function autoDownloadPdfFunction() {
    (async function () {
        console.log('[AUTODOWNLOAD] Script de download automático ativado.');
        const waitForElement = (selector, timeout = 5000) => {
            return new Promise((resolve, reject) => {
                const interval = setInterval(() => {
                    const element = document.querySelector(selector);
                    if (element) { clearInterval(interval); resolve(element); }
                }, 100);
                setTimeout(() => {
                    clearInterval(interval);
                    reject(new Error(`[AUTODOWNLOAD] Elemento não encontrado: ${selector}`));
                }, timeout);
            });
        };
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
            onUpdated: (tabId, changeInfo, tab) => {
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
            try { chrome.runtime.reload(); } catch (e) { navigateTo('restart_required'); }
        }
    }, [settings, navigateTo]);


    // ==========================================================
    // MUDANÇA PRINCIPAL AQUI
    // ==========================================================
    const handleCaptureLinkedInProfile = async () => {
        try {
            if (!currentTab || !currentTab.url || !currentTab.url.includes("linkedin.com/in/")) {
                alert("Para capturar um perfil, navegue até uma página de perfil do LinkedIn.");
                return;
            }

            // Mensagem ajustada para informar que a ação ocorre em segundo plano
            alert("Iniciando a captura do perfil. O processo continuará em segundo plano na aba do LinkedIn.");

            // REMOVIDO: A linha abaixo foi removida para impedir a mudança de tela.
            // navigateTo('scraping');

            // 1. Injeta o Relay (ISOLATED WORLD) para ouvir a mensagem e falar com o Background
            await chrome.scripting.executeScript({
                target: { tabId: currentTab.id },
                files: ['scripts/pdf_relay.js']
                // world default is ISOLATED, which is what we want for chrome.runtime access
            });

            // 2. Injeta o Interceptador (MAIN WORLD) para monkey-patch e pegar o PDF
            await chrome.scripting.executeScript({
                target: { tabId: currentTab.id },
                files: ['scripts/linkedin_pdf_scraper.js'],
                world: 'MAIN'
            });

            // 3. Injeta a automação que clica nos botões (pode ser ISOLATED ou MAIN, tanto faz, mas ISOLATED é mais seguro)
            await chrome.scripting.executeScript({
                target: { tabId: currentTab.id },
                func: autoDownloadPdfFunction
            });

        } catch (error) {
            console.error("[POPUP] Erro ao injetar scripts:", error);
            // Mensagem de erro direta, sem redirecionamento
            alert(`Ocorreu um erro ao tentar iniciar a captura: ${error.message}`);

            // REMOVIDO: A linha abaixo foi removida para não redirecionar em caso de erro.
            // navigateTo('dashboard_jobs');
        }
    };

    return {
        settings,
        setSettings,
        currentTab,
        currentProfileStatus,
        initializeApp,
        handleSettingChange,
        handleCaptureLinkedInProfile,
    };
};