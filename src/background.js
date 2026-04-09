/* global chrome */
// ===================================================================
//              ARQUIVO COMPLETE: src/background.js
// ===================================================================

// Log inicial
console.log('[BACKGROUND] 🚀 Service Worker iniciando...');

// --- Imports ---
import { extractProfileFromPdf, analyzeProfileWithAI } from './services/api.service.js';

// --- Logger Padrão ---
const PREFIX = '[BACKGROUND]';
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
    log.info('Comportamento da ação atualizado.');
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
});

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
    tabs: [],
    currentIndex: 0,
    results: [],
    scorecardId: null,
    jobId: null
};

// Carrega estado inicial do storage
chrome.storage.local.get('batch_state', (data) => {
    if (data.batch_state) {
        batchState = { ...batchState, ...data.batch_state };
        batchState.isRunning = false; // Resetar isRunning por segurança
        saveBatchState();
    }
});

function saveBatchState() {
    chrome.storage.local.set({ batch_state: batchState });
    chrome.runtime.sendMessage({ type: 'BATCH_STATE_CHANGED', state: batchState }).catch(() => {});
    
    // Notifica widgets em todas as abas
    if (batchState.isRunning) {
        broadcastToWidgets({ 
            type: 'BATCH_WIDGET_UPDATE', 
            current: batchState.results.length, 
            total: batchState.tabs.length 
        });
    } else if (batchState.results.length === 0) {
        broadcastToWidgets({ type: 'BATCH_WIDGET_HIDE' });
    }
}

async function broadcastToWidgets(message) {
    const tabs = await chrome.tabs.query({});
    log.info(`Broadcasting update to ${tabs.length} tabs.`);
    for (const tab of tabs) {
        chrome.tabs.sendMessage(tab.id, message).catch(() => {});
    }
}

async function runBatchLoop() {
    if (!batchState.isRunning) return;

    // Guarda a aba atual e monitora para restaurar o foco agressivamente
    let originalTabId = null;
    try {
        const activeTabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (activeTabs.length > 0) originalTabId = activeTabs[0].id;
        log.info(`[BATCH] Aba original detectada: ${originalTabId}`);
    } catch (e) {
        log.error("Erro ao detectar aba original:", e);
    }

    while (batchState.currentIndex < batchState.tabs.length && batchState.isRunning) {
        const tabData = batchState.tabs[batchState.currentIndex];
        log.info(`[BATCH] >>> INICIANDO PERFIL: ${tabData.username} (${batchState.currentIndex + 1}/${batchState.tabs.length})`);

        let currentTabId = null;
        try {
            log.info(`[BATCH] Criando aba em segundo plano para: ${tabData.url}`);
            const newTab = await chrome.tabs.create({ url: tabData.url, active: false });
            currentTabId = newTab.id;
            
            // Re-foca a aba original instantaneamente
            if (originalTabId) {
                await chrome.tabs.update(originalTabId, { active: true }).catch(() => {});
                log.info(`[BATCH] Re-focado na aba original ${originalTabId}`);
            }

            log.info(`[BATCH] Aguardando 8s para carregamento do LinkedIn...`);
            await new Promise(r => setTimeout(r, 8000));

            log.info(`[BATCH] Injetando scripts de extração na aba ${currentTabId}`);
            await chrome.scripting.executeScript({ target: { tabId: currentTabId }, files: ['scripts/pdf_relay.js'] });
            await chrome.scripting.executeScript({ target: { tabId: currentTabId }, files: ['scripts/linkedin_pdf_scraper.js'], world: 'MAIN' });

            log.info(`[BATCH] Disparando comando de clique para PDF...`);
            await chrome.scripting.executeScript({
                target: { tabId: currentTabId },
                func: function () {
                    const clickPdf = async () => {
                        let moreButton = document.querySelector('button[aria-label*="More"], button[aria-label*="Mais"]') ||
                            document.querySelector('button[data-view-name="profile-overflow-button"]');
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

            log.info(`[BATCH] Aguardando resposta de extração (PDF_EXTRACTION_SUCCESS)...`);
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
                log.success(`[BATCH] Extração concluída para ${tabData.username}. Iniciando análise IA.`);
                const matchResult = await analyzeProfileWithAI(batchState.scorecardId, extractionResult.data, batchState.jobId);
                batchState.results.push({
                    username: tabData.username,
                    name: extractionResult.data.perfil?.nome || tabData.username,
                    matchResult,
                    matchScore: matchResult?.matchScore || 0,
                    success: true
                });
                log.success(`[BATCH] Análise IA concluída: Score ${matchResult?.matchScore}`);
            } else {
                log.error(`[BATCH] Falha na extração para ${tabData.username}: ${extractionResult.error}`);
                batchState.results.push({ username: tabData.username, error: extractionResult.error, success: false });
            }
        } catch (err) {
            log.error(`[BATCH] Erro crítico para ${tabData.username}:`, err.message);
            batchState.results.push({ username: tabData.username, error: err.message, success: false });
        } finally {
            if (currentTabId) {
                log.info(`[BATCH] Fechando aba ${currentTabId}`);
                await chrome.tabs.remove(currentTabId).catch(() => {});
            }
        }

        batchState.currentIndex++;
        saveBatchState();
        if (batchState.currentIndex < batchState.tabs.length && batchState.isRunning) {
            const delay = 12000;
            log.info(`[BATCH] Aguardando ${delay/1000}s para próximo perfil...`);
            await new Promise(r => setTimeout(r, delay));
        }
    }

    batchState.isRunning = false;
    saveBatchState();
    log.success("[BATCH] Fila finalizada com sucesso.");
    chrome.notifications.create({ type: 'basic', iconUrl: 'logo.png', title: 'Batch Finalizado', message: 'Processamento concluído.' });
}

// OUVINTE DE MENSAGENS
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    log.info(`[BACKGROUND] Mensagem recebida: ${message.action || message.type}`);

    if (message.action === "START_BATCH") {
        if (batchState.isRunning) {
            log.warn("[BACKGROUND] Já existe um batch em execução. Ignorando START.");
            sendResponse({ success: false, error: "Fila já em execução." });
            return true;
        }
        log.success("[BACKGROUND] Iniciando NOVO Batch.");
        batchState = { isRunning: true, tabs: message.tabs, scorecardId: message.scorecardId, jobId: message.jobId, currentIndex: 0, results: [] };
        saveBatchState();
        runBatchLoop();
        sendResponse({ success: true });
    } else if (message.action === "STOP_BATCH") {
        log.info("[BACKGROUND] Interrompendo Batch.");
        batchState.isRunning = false;
        saveBatchState();
        sendResponse({ success: true });
    } else if (message.action === "GET_BATCH_STATE") {
        sendResponse({ state: batchState });
    } else if (message.action === "RESET_BATCH") {
        batchState = { isRunning: false, tabs: [], currentIndex: 0, results: [], scorecardId: null, jobId: null };
        saveBatchState();
        sendResponse({ success: true });
    } else if (message.action === "processLinkedInPdf") {
        const pdfBlob = base64ToBlob(message.data);
        extractProfileFromPdf(pdfBlob).then(data => sendResponse({success:true, data})).catch(e => sendResponse({success:false, error:e.message}));
        return true;
    }
    return true;
});

// OUVINTE DE DOWNLOADS
chrome.downloads.onCreated.addListener(async (downloadItem) => {
    const isLinkedInProfilePdf = downloadItem.url.includes('linkedin.com') && downloadItem.filename.toLowerCase().endsWith('.pdf');
    if (isLinkedInProfilePdf) {
        log.info("[DOWNLOAD] LinkedIn PDF detectado. Cancelando download real.");
        await chrome.downloads.cancel(downloadItem.id).catch(() => {});
        await chrome.downloads.erase({ id: downloadItem.id }).catch(() => {});
    }
});