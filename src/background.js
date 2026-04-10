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
const VERSION = '1.5.4';
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
            }).catch(() => {}); // Ignora erros em abas restritas (ex: chrome://)
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
    workerWindowId: null,
    callerTabId: null // Aba que iniciou o processo (PROIBIDA de automação)
};

// Resolver global para sincronização entre o capturador de PDF e o controlador da fila
let activeExtractionResolve = null;
let activeExtractionTabId = null; // ID da aba que estamos esperando extrair

function notifyExtraction(result) {
    if (activeExtractionResolve) {
        log.info("[BATCH] Notificando loop sobre resultado da extração.");
        const resolve = activeExtractionResolve;
        activeExtractionResolve = null; // Limpa para evitar re-chamada
        resolve(result);
        return true;
    }
    return false;
}

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
    
    // Broadcast para todas as abas (para o widget/pill)
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
async function wakeUpWindow(windowId, ms = 800) {
    if (!windowId) return;
    try {
        await chrome.windows.update(windowId, { state: 'normal', focused: false });
        await new Promise(r => setTimeout(r, ms));
        await chrome.windows.update(windowId, { state: 'minimized', focused: false });
    } catch (err) {
        log.error("[WAKEUP] Falha ao acordar janela:", err);
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
        state: 'normal',
        width: 1200,
        height: 800,
        focused: false
    });
    
    // Stealth-Pop: Delay mínimo para o Chrome 'pintar' a janela e o LinkedIn carregar botões
    await new Promise(r => setTimeout(r, 500));
    await chrome.windows.update(workerWindow.id, { state: 'minimized', focused: false }).catch(() => {});
    
    // Delay adicional para estabilização do robô
    await new Promise(r => setTimeout(r, 1500));
    
    batchState.workerWindowId = workerWindow.id;
    log.info(`[BATCH] Janela Worker IDs: Memory=${batchState.workerWindowId}`);
    saveBatchState();
    return parseInt(workerWindow.id);
}

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
        // CRIAÇÃO COMPATÍVEL: Apenas estado Minimizado (sem coordenadas conflitantes)
        const workerWindow = await chrome.windows.create({
            url: searchUrl,
            type: 'popup',
            state: 'normal',
            width: 1200,
            height: 800,
            focused: false
        });
        
        batchState.workerWindowId = workerWindow.id;
        
        // Stealth-Pop: Desperta o layout engine da busca
        await new Promise(r => setTimeout(r, 500));
        await chrome.windows.update(workerWindow.id, { state: 'minimized', focused: false }).catch(() => {});
        
        // chrome.windows.create com url cria abas que podem ser obtidas se populate:true
        // mas em MV3, se passar url, a primeira aba é a url.
        // Vamos pegar a aba ativa da janela recém-criada
        const [tab] = await chrome.tabs.query({ windowId: workerWindow.id });
        searchTabId = tab.id;
        
        saveBatchState();

        while (collectedUrls.size < targetCount && batchState.isSourcing) {
            log.info(`[SOURCING] Capturando... (${collectedUrls.size}/${targetCount})`);
            await new Promise(r => setTimeout(r, 6000));
            
            await chrome.scripting.executeScript({ target: { tabId: searchTabId }, files: ['scripts/linkedin_search_scraper.js'] });
            
            // Acorda a janela para garantir que o clique em 'Próxima' seja processado pelo navegador
            await wakeUpWindow(batchState.workerWindowId, 600);
            
            const response = await chrome.tabs.sendMessage(searchTabId, { action: "scrape_search_results", goToNext: true });
            if (response?.success) {
                response.urls.forEach(url => {
                    if (collectedUrls.size < targetCount) collectedUrls.add(url);
                });
                batchState.sourcingCount = collectedUrls.size;
                saveBatchState();
                
                if (!response.hasNextPage || collectedUrls.size >= targetCount) break;
            } else {
                log.error("[SOURCING] Scraper falhou ou não retornou dados.");
                break;
            }
        }

        const finalTabs = Array.from(collectedUrls).map(url => {
            const match = url.match(/linkedin\.com\/in\/([^/?]+)/);
            return { id: null, url, username: match ? match[1] : 'unknown', status: 'pending' };
        });

        batchState.tabs = finalTabs;
        batchState.isSourcing = false;
        saveBatchState();

        if (finalTabs.length > 0) {
            log.success(`[SOURCING] Concluído! ${finalTabs.length} perfis encontrados. Iniciando extração...`);
            runBatchLoop();
        } else {
            log.warn("[SOURCING] Nenhum perfil encontrado.");
            if (batchState.workerWindowId) chrome.windows.remove(batchState.workerWindowId).catch(() => {});
            batchState.workerWindowId = null;
            saveBatchState();
        }

    } catch (e) {
        log.error("[SOURCING] Erro crítico:", e);
        batchState.isSourcing = false;
        saveBatchState();
    } finally {
        if (searchTabId) chrome.tabs.remove(searchTabId).catch(() => {});
    }
}

// --- LOOP DE EXTRAÇÃO ---
async function runBatchLoop() {
    if (batchState.isRunning) return;
    batchState.isRunning = true;
    saveBatchState();

    let profileWindowId = null;
    let currentTabId = null;

    try {
        // 1. INICIALIZAÇÃO DA JANELA FANTASMA (Antes do Loop)
        log.info("[BATCH] Iniciando janela fantasma isolada...");
        const firstProfile = batchState.tabs[batchState.currentIndex];
        if (!firstProfile) throw new Error("Fila vazia");

        const ghostWindow = await chrome.windows.create({ 
            url: firstProfile.url, 
            type: 'popup',
            state: 'normal',
            width: 1200,
            height: 800,
            focused: false
        });
        
        profileWindowId = ghostWindow.id;
        const [initialTab] = await chrome.tabs.query({ windowId: profileWindowId });
        currentTabId = initialTab.id;
        log.info(`[BATCH] Janela Fantasma ${profileWindowId} pronta com aba ${currentTabId}`);

        while (batchState.currentIndex < batchState.tabs.length && batchState.isRunning) {
            const tabData = batchState.tabs[batchState.currentIndex];
            log.info(`[BATCH] Processando (${batchState.currentIndex + 1}/${batchState.tabs.length}): ${tabData.username}`);

            // 2. Garante que a janela ainda existe
            try {
                await chrome.windows.get(profileWindowId);
            } catch (e) {
                log.warn("[BATCH] Janela fantasma fechada precocemente. Recriando...");
                const newWindow = await chrome.windows.create({ 
                    url: tabData.url, 
                    type: 'popup',
                    state: 'normal',
                    width: 1200,
                    height: 800,
                    focused: false
                });
                profileWindowId = newWindow.id;
                const [tab] = await chrome.tabs.query({ windowId: profileWindowId });
                currentTabId = tab.id;
            }

            // 3. Rotatividade de Aba (Híbrida)
            // Se for o primeiro (index já processado na criação da janela), apenas aguardamos.
            // Se for do segundo em diante, criamos aba nova.
            const currentTab = await chrome.tabs.get(currentTabId).catch(() => null);
            if (currentTab && currentTab.url.includes(tabData.username)) {
                log.info(`[BATCH] Aba já posicionada para: ${tabData.username}`);
            } else {
                log.info(`[BATCH] Rotacionando para nova aba: ${tabData.username}`);
                const oldTabId = currentTabId;
                
                // SEGURANÇA MÁXIMA: Verifica se não estamos tentando usar a aba do usuário
                if (batchState.callerTabId && profileWindowId === null) {
                     log.error("[BATCH] Tentativa de automação na janela incorreta!");
                     break;
                }

                const newTab = await chrome.tabs.create({ windowId: profileWindowId, url: tabData.url });
                currentTabId = newTab.id;
                
                if (currentTabId === batchState.callerTabId) {
                    log.error("[BATCH] CRITICAL SEGURITY: Tentativa de usar a aba do usuário detectada!");
                    chrome.tabs.remove(currentTabId).catch(() => {});
                    break;
                }

                if (oldTabId && oldTabId !== batchState.callerTabId) {
                    chrome.tabs.remove(oldTabId).catch(() => {});
                }
            }

            // 4. Fluxo de Extração Consciente (Sync)
            await new Promise(r => setTimeout(r, 6000));
            await chrome.scripting.executeScript({ target: { tabId: currentTabId }, files: ['scripts/pdf_relay.js'] });
            await chrome.scripting.executeScript({ target: { tabId: currentTabId }, files: ['scripts/linkedin_pdf_scraper.js'], world: 'MAIN' });

            await wakeUpWindow(profileWindowId, 1000);
            
            activeExtractionTabId = currentTabId; 
            await chrome.scripting.executeScript({
                target: { tabId: currentTabId },
                func: function () {
                    const clickPdf = async () => {
                        // Tenta encontrar e clicar no botão 3 vezes com intervalo de 1.5s
                        for (let attempt = 1; attempt <= 3; attempt++) {
                            console.log(`[CLICKER] Tentativa ${attempt} de encontrar botão 'Mais'...`);
                            let moreButton = document.querySelector('button[aria-label*="More"], button[aria-label*="Mais"]') ||
                                document.querySelector('button[data-view-name="profile-overflow-button"]');
                            
                            if (moreButton) {
                                moreButton.click();
                                await new Promise(r => setTimeout(r, 1200));
                                const items = Array.from(document.querySelectorAll('.artdeco-dropdown__item, [role="menuitem"]'));
                                const pdfItem = items.find(i => /pdf/i.test(i.innerText));
                                if (pdfItem) {
                                    pdfItem.click();
                                    return; // Sucesso!
                                }
                            }
                            await new Promise(r => setTimeout(r, 1500));
                        }
                    };
                    clickPdf();
                }
            });

            const extractionResult = await new Promise((resolve) => {
                activeExtractionResolve = resolve;
                setTimeout(() => {
                    if (activeExtractionResolve === resolve) {
                        activeExtractionResolve = null;
                        resolve({ success: false, error: 'Timeout' });
                    }
                }, 60000);
            });

            if (extractionResult.success) {
                const matchResult = await analyzeProfileWithAI(batchState.scorecardId, extractionResult.data, batchState.jobId);
                
                const categories = [];
                const strengths = [];
                const weaknesses = [];

                if (matchResult?.categories) {
                    matchResult.categories.forEach(cat => {
                        categories.push({ ...cat, averageScore: cat.score });
                        if (cat.criteria) {
                            cat.criteria.forEach(crit => {
                                if (crit.score >= 80) strengths.push(crit.justification);
                                else if (crit.score <= 40) weaknesses.push(crit.justification);
                            });
                        }
                    });
                }

                batchState.results.push({
                    username: tabData.username,
                    name: extractionResult.data.perfil?.nome || tabData.username,
                    headline: extractionResult.data.perfil?.titulo || tabData.username,
                    matchResult,
                    matchScore: matchResult?.matchScore || 0,
                    categories,
                    strengths: strengths.slice(0, 3),
                    weaknesses: weaknesses.slice(0, 3),
                    success: true
                });
            } else {
                batchState.results.push({ username: tabData.username, error: extractionResult.error, success: false });
            }

            batchState.currentIndex++;
            saveBatchState();
            
            // Delay de respiro entre perfis na mesma janela
            if (batchState.currentIndex < batchState.tabs.length && batchState.isRunning) {
                await new Promise(r => setTimeout(r, 2000));
            }
        }
    } catch (err) {
        log.error("[BATCH] Erro crítico no loop:", err);
    } finally {
        if (profileWindowId) {
            log.info("[BATCH] Fechando janela de extração.");
            await chrome.windows.remove(profileWindowId).catch(() => {});
        }
        batchState.isRunning = false;
        saveBatchState();
        log.success("[BATCH] Fila Atômica finalizada.");
        chrome.notifications.create({ type: 'basic', iconUrl: 'logo.png', title: 'Batch Finalizado', message: 'Processamento atômico concluído.' });
    }
}

// OUVINTE DE MENSAGENS
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "START_BATCH") {
        if (batchState.isRunning || batchState.isSourcing) {
            sendResponse({ success: false, error: "Já em execução." });
            return true;
        }
        batchState = { 
            ...batchState, 
            isRunning: true, 
            tabs: message.tabs, 
            scorecardId: message.scorecardId, 
            jobId: message.jobId, 
            currentIndex: 0, 
            results: [],
            callerTabId: sender.tab ? sender.tab.id : null // Blacklist da aba do usuário
        };
        saveBatchState();
        runBatchLoop();
        sendResponse({ success: true });
    } else if (message.action === "START_SOURCING") {
        if (batchState.isRunning || batchState.isSourcing) {
            sendResponse({ success: false, error: "Já em execução." });
            return true;
        }
        batchState = { 
            ...batchState, 
            scorecardId: message.scorecardId, 
            jobId: message.jobId, 
            results: [], 
            currentIndex: 0,
            callerTabId: sender.tab ? sender.tab.id : null // Blacklist da aba do usuário
        };
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
        batchState = { isRunning: false, isSourcing: false, sourcingCount: 0, sourcingTarget: 0, tabs: [], currentIndex: 0, results: [], scorecardId: null, jobId: null, workerWindowId: null, callerTabId: null };
        saveBatchState();
        sendResponse({ success: true });
    } else if (message.action === "processLinkedInPdf") {
        const pdfBlob = base64ToBlob(message.data);
        extractProfileFromPdf(pdfBlob)
            .then(data => {
                const result = { success: true, data };
                
                // SEGURANÇA: Só notifica o loop interno se a mensagem veio da aba fantasma ativa
                if (sender.tab && sender.tab.id === activeExtractionTabId) {
                    notifyExtraction(result);
                    activeExtractionTabId = null; 
                } else {
                    log.info("[RELAY] PDF recebido de aba manual, processando apenas para UI.");
                }

                // Também manda mensagem externa para quem estiver ouvindo (ex: Sidepanel)
                chrome.runtime.sendMessage({ type: 'PDF_EXTRACTION_SUCCESS', payload: data });
                sendResponse(result);
            })
            .catch(e => {
                const result = { success: false, error: e.message };
                notifyExtraction(result);
                chrome.runtime.sendMessage({ type: 'PDF_EXTRACTION_FAILURE', payload: { message: e.message } });
                sendResponse(result);
            });
        return true;
    }
    return true;
});

// OUVINTE DE DOWNLOADS
chrome.downloads.onCreated.addListener(async (downloadItem) => {
    const isLinkedInProfilePdf = downloadItem.url.includes('linkedin.com') && downloadItem.filename.toLowerCase().endsWith('.pdf');
    if (isLinkedInProfilePdf) {
        log.info("[DOWNLOAD] Interceptando PDF do LinkedIn:", downloadItem.filename);
        await chrome.downloads.cancel(downloadItem.id).catch(() => {});
        await chrome.downloads.erase({ id: downloadItem.id }).catch(() => {});

        try {
            // Busca o arquivo como blob
            const response = await fetch(downloadItem.url);
            const blob = await response.blob();
            
            log.info("[DOWNLOAD] Enviando PDF interceptado para extração...");
            const data = await extractProfileFromPdf(blob);
            const result = { success: true, data };
            
            // Notifica o loop principal via chamada direta
            notifyExtraction(result);
            
            // Notifica Sidepanel
            chrome.runtime.sendMessage({ type: 'PDF_EXTRACTION_SUCCESS', payload: data });
            log.success("[DOWNLOAD] Extração concluída com sucesso via interceptação.");
        } catch (error) {
            log.error("[DOWNLOAD] Erro ao processar PDF interceptado:", error);
            const result = { success: false, error: error.message };
            notifyExtraction(result);
            chrome.runtime.sendMessage({ type: 'PDF_EXTRACTION_FAILURE', payload: { message: error.message } });
        }
    }
});