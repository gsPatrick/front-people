/* global chrome */
// ===================================================================
//              ARQUIVO COMPLETE: background.js (ROOT SYNC)
// ===================================================================

// Log inicial
console.log('[BACKGROUND] 🚀 Service Worker iniciando...');

// --- Imports ---
import { extractProfileFromPdf, analyzeProfileWithAI } from './src/services/api.service.js';

// --- Logger Padrão ---
const PREFIX = '[BACKGROUND]';
const VERSION = '1.2.5';
console.log(`${PREFIX} VERSION: ${VERSION} 🚀`);

self.addEventListener('install', () => {
    self.skipWaiting();
});

const log = {
    info: (...args) => console.log(`%c${PREFIX} ℹ️`, 'color: darkblue; font-weight: bold;', ...args),
    success: (...args) => console.log(`%c${PREFIX} ✅`, 'color: darkgreen; font-weight: bold;', ...args),
    error: (...args) => console.error(`%c${PREFIX} ❌`, 'color: darkred; font-weight: bold;', ...args)
};

// --- Configurações Iniciais ---
const DEFAULT_SETTINGS = {
    isSidePanelModeEnabled: true,
    isLinkedInPopupEnabled: true,
    isPersistenceEnabled: false,
    isOpenInTabEnabled: false,
    isAIEnabled: false
};

async function updateActionBehavior() {
  try {
    const data = await chrome.storage.local.get('app_settings');
    const settings = data.app_settings || DEFAULT_SETTINGS;
    if (settings.isSidePanelModeEnabled) {
      await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
      await chrome.action.setPopup({ popup: '' });
    } else {
      await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
      await chrome.action.setPopup({ popup: 'index.html' });
    }
  } catch (error) {
    log.error("Erro ao atualizar o comportamento da ação:", error);
  }
}

chrome.runtime.onInstalled.addListener((details) => {
  log.info('Extensão instalada/atualizada.', details);
  if (details.reason === 'install') {
    chrome.storage.local.set({ app_settings: DEFAULT_SETTINGS });
  }
  updateActionBehavior();
  // Auto-injeta o widget em todas as abas abertas para garantir a pílula em todos os lugares
  injectWidgetIntoAllTabs();
});

async function injectWidgetIntoAllTabs() {
    try {
        const tabs = await chrome.tabs.query({ url: ["http://*/*", "https://*/*"] });
        log.info(`[WIDGET] Auto-injetando em ${tabs.length} abas...`);
        for (const tab of tabs) {
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['scripts/batch_progress_widget.js']
            }).catch(() => {}); 
        }
    } catch (err) {
        log.error("Erro na auto-injeção do widget:", err);
    }
}

chrome.runtime.onStartup.addListener(() => {
    updateActionBehavior();
});

// --- utilitários ---
function base64ToBlob(base64Data) {
    const [header, data] = base64Data.split(',');
    const mime = header.match(/:(.*?);/)[1];
    const byteCharacters = atob(data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mime });
}

// --- Gerenciador de Fila em Lote (Persistent State) ---
let batchState = {
    isRunning: false,
    isSourcing: false,
    sourcingCount: 0,
    sourcingTarget: 0,
    tabs: [],
    currentIndex: 0,
    results: [],
    scorecardId: null,
    jobId: null,
    workerWindowId: null 
};

// Carrega estado inicial do storage
chrome.storage.local.get('batch_state', (data) => {
    if (data.batch_state) {
        batchState = { ...batchState, ...data.batch_state };
        batchState.isRunning = false; 
        batchState.isSourcing = false;
        batchState.workerWindowId = null;
        saveBatchState();
    }
});

function saveBatchState() {
    chrome.storage.local.set({ batch_state: batchState });
    chrome.runtime.sendMessage({ type: 'BATCH_STATE_CHANGED', state: batchState }).catch(() => {});
    
    if (batchState.isRunning || batchState.isSourcing) {
        broadcastToWidgets({ 
            type: 'BATCH_WIDGET_UPDATE', 
            current: batchState.isSourcing ? batchState.sourcingCount : batchState.results.length, 
            total: batchState.isSourcing ? batchState.sourcingTarget : batchState.tabs.length,
            mode: batchState.isSourcing ? 'SOURCING' : 'EXTRACTING'
        });
    } else if (batchState.results.length === 0) {
        broadcastToWidgets({ type: 'BATCH_WIDGET_HIDE' });
    }
}

async function broadcastToWidgets(message) {
    try {
        const tabs = await chrome.tabs.query({});
        for (const tab of tabs) {
            chrome.tabs.sendMessage(tab.id, message).catch(() => {});
        }
    } catch (error) {
        log.error("Erro no broadcast para widgets:", error);
    }
}

async function ensureWorkerWindow() {
    if (batchState.workerWindowId) {
        try {
            await chrome.windows.get(batchState.workerWindowId);
            return batchState.workerWindowId;
        } catch {
            batchState.workerWindowId = null;
        }
    }
    log.info("[BATCH] Criando Janela Worker (Modo Fantasma Seguro)...");
    const workerWindow = await chrome.windows.create({
        url: 'about:blank',
        type: 'popup',
        state: 'minimized',
        focused: false
    });
    
    // Pequeno delay para estabilização
    await new Promise(r => setTimeout(r, 2000));
    
    // Garante minimização extra
    await chrome.windows.update(workerWindow.id, { state: 'minimized', focused: false }).catch(() => {});
    
    batchState.workerWindowId = workerWindow.id;
    log.info(`[BATCH] Janela Worker IDs: Memory=${batchState.workerWindowId}`);
    saveBatchState();
    return parseInt(workerWindow.id);
}

// --- LOOP DE BUSCA (SOURCING) ---
async function runSourcingLoop(searchUrl, targetCount) {
    if (batchState.isSourcing) return;
    batchState.isSourcing = true;
    batchState.sourcingCount = 0;
    batchState.sourcingTarget = targetCount;
    batchState.tabs = [];
    saveBatchState();

    let collectedUrls = new Set();
    let searchTabId = null;

    try {
        log.info("[SOURCING] Criando Janela de Busca Fantasma...");
        // CRIAÇÃO COMPATÍVEL
        const workerWindow = await chrome.windows.create({
            url: searchUrl,
            type: 'popup',
            state: 'minimized',
            focused: false
        });
        
        batchState.workerWindowId = workerWindow.id;
        const [tab] = await chrome.tabs.query({ windowId: workerWindow.id });
        searchTabId = tab.id;
        saveBatchState();

        while (collectedUrls.size < targetCount && batchState.isSourcing) {
            await new Promise(r => setTimeout(r, 6000));
            await chrome.scripting.executeScript({ target: { tabId: searchTabId }, files: ['scripts/linkedin_search_scraper.js'] });
            const response = await chrome.tabs.sendMessage(searchTabId, { action: "scrape_search_results", goToNext: true });
            if (response?.success) {
                response.urls.forEach(url => {
                    if (collectedUrls.size < targetCount) collectedUrls.add(url);
                });
                batchState.sourcingCount = collectedUrls.size;
                saveBatchState();
                if (!response.hasNextPage || collectedUrls.size >= targetCount) break;
            } else break;
        }

        const finalTabs = Array.from(collectedUrls).map(url => {
            const match = url.match(/linkedin\.com\/in\/([^/?]+)/);
            return { id: null, url, username: match ? match[1] : 'unknown', status: 'pending' };
        });

        batchState.tabs = finalTabs;
        batchState.isSourcing = false;
        saveBatchState();

        if (finalTabs.length > 0) {
            runBatchLoop();
        } else {
            if (batchState.workerWindowId) chrome.windows.remove(batchState.workerWindowId).catch(() => {});
            batchState.workerWindowId = null;
            saveBatchState();
        }
    } catch {
        batchState.isSourcing = false;
        saveBatchState();
    } finally {
        if (searchTabId) chrome.tabs.remove(searchTabId).catch(() => {});
    }
}

async function runBatchLoop() {
    if (batchState.isRunning) return;
    batchState.isRunning = true;
    saveBatchState();

    let windowId = await ensureWorkerWindow();
    log.info(`[BATCH] Iniciando loop com WindowID: ${windowId}`);

    while (batchState.currentIndex < batchState.tabs.length && batchState.isRunning) {
        const tabData = batchState.tabs[batchState.currentIndex];
        log.info(`[BATCH] Processando: ${tabData.username}`);

        let currentTabId = null;
        try {
            // RE-FORÇA MINIMIZAÇÃO antes de abrir cada perfil
            if (windowId) {
                await chrome.windows.update(parseInt(windowId), { state: 'minimized', focused: false }).catch(() => {});
            }

            log.info(`[BATCH] Abrindo aba na janela ${windowId}: ${tabData.url}`);
            const newTab = await chrome.tabs.create({ 
                windowId: parseInt(windowId),
                url: tabData.url, 
                active: false 
            });
            currentTabId = newTab.id;
            await new Promise(r => setTimeout(r, 8000));
            await chrome.scripting.executeScript({ target: { tabId: currentTabId }, files: ['scripts/pdf_relay.js'] });
            await chrome.scripting.executeScript({ target: { tabId: currentTabId }, files: ['scripts/linkedin_pdf_scraper.js'], world: 'MAIN' });

            await chrome.scripting.executeScript({
                target: { tabId: currentTabId },
                func: function () {
                    const clickPdf = async () => {
                        let moreButton = document.querySelector('button[aria-label*="More"], button[aria-label*="Mais"]') ||
                            document.querySelector('button[data-view-name="profile-overflow-button"]');
                        if (moreButton) {
                            moreButton.click();
                            await new Promise(r => setTimeout(r, 1000));
                            const items = Array.from(document.querySelectorAll('.artdeco-dropdown__item, [role="menuitem"]'));
                            const pdfItem = items.find(i => /pdf/i.test(i.innerText));
                            if (pdfItem) pdfItem.click();
                        }
                    };
                    clickPdf();
                }
            });

            const extractionResult = await new Promise((resolve) => {
                const listener = (msg) => {
                    if (msg.type === 'PDF_EXTRACTION_SUCCESS') {
                        chrome.runtime.onMessage.removeListener(listener);
                        resolve({ success: true, data: msg.payload });
                    } else if (msg.type === 'PDF_EXTRACTION_FAILURE') {
                        chrome.runtime.onMessage.removeListener(listener);
                        resolve({ success: false, error: msg.payload?.message });
                    }
                };
                chrome.runtime.onMessage.addListener(listener);
                setTimeout(() => {
                    chrome.runtime.onMessage.removeListener(listener);
                    resolve({ success: false, error: 'Timeout' });
                }, 60000);
            });

            if (extractionResult.success) {
                const matchResult = await analyzeProfileWithAI(batchState.scorecardId, extractionResult.data, batchState.jobId);
                batchState.results.push({
                    username: tabData.username,
                    name: extractionResult.data.perfil?.nome || tabData.username,
                    matchResult,
                    matchScore: matchResult?.matchScore || 0,
                    success: true
                });
            } else {
                batchState.results.push({ username: tabData.username, error: extractionResult.error, success: false });
            }
        } catch (err) {
            batchState.results.push({ username: tabData.username, error: err.message, success: false });
        } finally {
            if (currentTabId) await chrome.tabs.remove(currentTabId).catch(() => {});
        }

        batchState.currentIndex++;
        saveBatchState();
        if (batchState.currentIndex < batchState.tabs.length && batchState.isRunning) {
            await new Promise(r => setTimeout(r, 12000));
        }
    }

    if (batchState.workerWindowId) {
        chrome.windows.remove(batchState.workerWindowId).catch(() => {});
        batchState.workerWindowId = null;
    }

    batchState.isRunning = false;
    saveBatchState();
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "START_BATCH") {
        if (batchState.isRunning || batchState.isSourcing) {
            sendResponse({ success: false, error: "Já em execução." });
            return true;
        }
        batchState = { ...batchState, isRunning: true, tabs: message.tabs, scorecardId: message.scorecardId, jobId: message.jobId, currentIndex: 0, results: [] };
        saveBatchState();
        runBatchLoop();
        sendResponse({ success: true });
    } else if (message.action === "START_SOURCING") {
        if (batchState.isRunning || batchState.isSourcing) {
            sendResponse({ success: false, error: "Já em execução." });
            return true;
        }
        batchState = { ...batchState, scorecardId: message.scorecardId, jobId: message.jobId, results: [], currentIndex: 0 };
        runSourcingLoop(message.searchUrl, message.targetCount);
        sendResponse({ success: true });
    } else if (message.action === "STOP_BATCH") {
        batchState.isRunning = false;
        batchState.isSourcing = false;
        if (batchState.workerWindowId) {
            chrome.windows.remove(batchState.workerWindowId).catch(() => {});
            batchState.workerWindowId = null;
        }
        saveBatchState();
        sendResponse({ success: true });
    } else if (message.action === "GET_BATCH_STATE") {
        sendResponse({ state: batchState });
    } else if (message.action === "RESET_BATCH") {
        batchState = { isRunning: false, isSourcing: false, sourcingCount: 0, sourcingTarget: 0, tabs: [], currentIndex: 0, results: [], scorecardId: null, jobId: null, workerWindowId: null };
        saveBatchState();
        sendResponse({ success: true });
    } else if (message.action === "processLinkedInPdf") {
        const pdfBlob = base64ToBlob(message.data);
        extractProfileFromPdf(pdfBlob).then(data => sendResponse({success:true, data})).catch(e => sendResponse({success:false, error:e.message}));
        return true;
    }
    return true;
});

chrome.downloads.onCreated.addListener(async (downloadItem) => {
    const isLinkedInProfilePdf = downloadItem.url.includes('linkedin.com') && downloadItem.filename.toLowerCase().endsWith('.pdf');
    if (isLinkedInProfilePdf) {
        await chrome.downloads.cancel(downloadItem.id).catch(() => {});
        await chrome.downloads.erase({ id: downloadItem.id }).catch(() => {});
    }
});