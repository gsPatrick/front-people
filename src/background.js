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
const VERSION = '1.6.3';
console.log(`${PREFIX} VERSION: ${VERSION} 🚀`);

self.addEventListener('install', () => {
    self.skipWaiting();
});

const log = {
    info: (...args) => console.log(`%c${PREFIX} ℹ️`, 'color: darkblue; font-weight: bold;', ...args),
    warn: (...args) => console.warn(`%c${PREFIX} ⚠️`, 'color: darkorange; font-weight: bold;', ...args),
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
    callerTabId: null,
    callerWindowId: null // Janela que não pode ser tocada
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
/**
 * Empurra a janela do usuário para frente, escondendo a fantasma atrás.
 */
async function focusUserWindow() {
    try {
        if (batchState.callerWindowId) {
            await chrome.windows.update(parseInt(batchState.callerWindowId), { focused: true });
        }
    } catch (e) {
        // Se a janela do usuário não existe mais, não faz nada
    }
}

/**
 * Cria uma janela fantasma: abre como NORMAL sem foco,
 * depois traz a janela do usuário para frente (fantasma fica atrás).
 * Guarda o ID em batchState.workerWindowId.
 */
async function createGhostWindow(url) {
    log.info("[GHOST] Criando janela fantasma...");
    
    // Criar como NORMAL, sem foco (abre atrás da janela ativa)
    const ghostWindow = await chrome.windows.create({
        url: url,
        type: 'popup',
        state: 'normal',
        width: 1200,
        height: 800,
        focused: false
    });
    
    const windowId = parseInt(ghostWindow.id);
    
    // SEGURANÇA: Nunca usar a janela do usuário
    if (windowId === parseInt(batchState.callerWindowId)) {
        await chrome.windows.remove(windowId).catch(() => {});
        throw new Error("SEGURANÇA: Chrome retornou a janela do usuário!");
    }
    
    // Esperar renderização inicial
    await new Promise(r => setTimeout(r, 1500));
    
    // Trazer a janela do usuário para frente (fantasma fica atrás, mas ATIVA)
    await focusUserWindow();
    
    log.info(`[GHOST] Janela ${windowId} criada e escondida atrás da janela do usuário.`);
    
    // Guardar no estado global
    batchState.workerWindowId = windowId;
    saveBatchState();
    
    return windowId;
}

/**
 * Garante que a janela fantasma existe e está funcional.
 * Se ela sumiu, recria usando o mesmo processo.
 */
async function ensureGhostWindow(urlForRecreation) {
    if (batchState.workerWindowId) {
        try {
            await chrome.windows.get(parseInt(batchState.workerWindowId));
            return parseInt(batchState.workerWindowId);
        } catch {
            log.warn("[GHOST] Janela fantasma perdida! Recriando...");
            batchState.workerWindowId = null;
        }
    }
    return await createGhostWindow(urlForRecreation || 'about:blank');
}

/**
 * "Acorda" a janela fantasma para garantir que o Chrome processe renderização e cliques.
 * Como a janela está em estado 'normal' (não minimizada), ela já está ativa.
 * Apenas garante que a janela do usuário continua na frente.
 */
async function wakeUpWindow(windowId, ms = 800) {
    try {
        if (!windowId) return;
        // Garante que a janela existe e está ativa
        await chrome.windows.get(parseInt(windowId));
        await new Promise(r => setTimeout(r, ms));
        // Mantém a janela do usuário na frente
        await focusUserWindow();
    } catch (e) {
        log.warn(`[WAKEUP] Falha ao verificar janela ${windowId}: ${e.message}`);
    }
}

// =============================================
// SOURCING LOOP - Busca perfis no LinkedIn Search
// =============================================
async function runSourcingLoop(searchUrl, targetCount) {
    if (batchState.isSourcing) return;
    batchState.isSourcing = true;
    batchState.sourcingCount = 0;
    batchState.sourcingTarget = targetCount;
    batchState.tabs = [];
    saveBatchState();

    let collectedUrls = new Set();

    try {
        // Criar a janela fantasma UMA VEZ (visível → minimizada)
        const ghostWindowId = await createGhostWindow(searchUrl);
        
        // Pegar a aba de busca que foi criada dentro da janela fantasma
        const [searchTab] = await chrome.tabs.query({ windowId: ghostWindowId });
        const searchTabId = searchTab.id;
        
        log.info(`[SOURCING] Janela fantasma ${ghostWindowId} com aba de busca ${searchTabId}`);

        while (collectedUrls.size < targetCount && batchState.isSourcing) {
            log.info(`[SOURCING] Capturando... (${collectedUrls.size}/${targetCount})`);
            await new Promise(r => setTimeout(r, 6000));
            
            // Acorda a janela para garantir renderização
            await wakeUpWindow(ghostWindowId, 600);
            
            await chrome.scripting.executeScript({ target: { tabId: searchTabId }, files: ['scripts/linkedin_search_scraper.js'] });
            
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
            // Passa a aba de busca para o batch REUTILIZAR (não remover!)
            runBatchLoop(searchTabId);
        } else {
            log.warn("[SOURCING] Nenhum perfil encontrado.");
            // Só fecha se não encontrou nada
            if (batchState.workerWindowId) chrome.windows.remove(parseInt(batchState.workerWindowId)).catch(() => {});
            batchState.workerWindowId = null;
            saveBatchState();
        }

    } catch (e) {
        log.error("[SOURCING] Erro crítico:", e);
        batchState.isSourcing = false;
        if (batchState.workerWindowId) chrome.windows.remove(parseInt(batchState.workerWindowId)).catch(() => {});
        batchState.workerWindowId = null;
        saveBatchState();
    }
    // NÃO tem finally removendo a aba! O batch cuida disso.
}

// =============================================
// BATCH LOOP - Extrai dados de cada perfil
// Usa UMA ÚNICA ABA e navega ela para cada perfil.
// NUNCA remove a aba original da janela fantasma.
// =============================================
async function runBatchLoop(ghostTabId) {
    if (batchState.isRunning) return;
    batchState.isRunning = true;
    saveBatchState();

    let currentTabId = ghostTabId; // Reutiliza a aba que já existe na janela fantasma

    try {
        const firstProfile = batchState.tabs[batchState.currentIndex];
        if (!firstProfile) throw new Error("Fila vazia");

        // REUTILIZAR a janela fantasma que o sourcing já criou
        const ghostWindowId = await ensureGhostWindow(firstProfile.url);
        
        log.info(`[BATCH] Usando janela fantasma ${ghostWindowId}`);

        // Se temos uma aba do sourcing, NAVEGAR ela para o primeiro perfil (não criar nova!)
        if (currentTabId) {
            await chrome.tabs.update(currentTabId, { url: firstProfile.url });
            log.info(`[BATCH] Aba ${currentTabId} navegada para: ${firstProfile.username}`);
        } else {
            // Sem aba do sourcing (batch direto) - pegar a aba que já existe na janela
            const [existingTab] = await chrome.tabs.query({ windowId: ghostWindowId });
            if (existingTab) {
                currentTabId = existingTab.id;
                await chrome.tabs.update(currentTabId, { url: firstProfile.url });
            } else {
                // Último recurso: criar uma aba
                const newTab = await chrome.tabs.create({ windowId: ghostWindowId, url: firstProfile.url });
                currentTabId = newTab.id;
            }
        }

        log.info(`[BATCH] Janela Fantasma ${ghostWindowId} pronta com aba ${currentTabId}`);

        while (batchState.currentIndex < batchState.tabs.length && batchState.isRunning) {
            const tabData = batchState.tabs[batchState.currentIndex];
            log.info(`[BATCH] Processando (${batchState.currentIndex + 1}/${batchState.tabs.length}): ${tabData.username}`);

            // Garante que a janela fantasma ainda existe
            const windowId = await ensureGhostWindow(tabData.url);
            
            // Se a janela foi recriada, pegar a aba que existe nela
            if (windowId !== ghostWindowId) {
                const [newTab] = await chrome.tabs.query({ windowId: windowId });
                currentTabId = newTab.id;
            }

            // Para o segundo perfil em diante, NAVEGAR a mesma aba (não criar nova!)
            if (batchState.currentIndex > 0) {
                log.info(`[BATCH] Navegando aba para: ${tabData.username}`);
                await chrome.tabs.update(currentTabId, { url: tabData.url });
            }

            // Esperar a página carregar
            await new Promise(r => setTimeout(r, 6000));
            
            // Acorda a janela para garantir renderização
            await wakeUpWindow(windowId, 1000);
            
            await chrome.scripting.executeScript({ target: { tabId: currentTabId }, files: ['scripts/pdf_relay.js'] });
            await chrome.scripting.executeScript({ target: { tabId: currentTabId }, files: ['scripts/linkedin_pdf_scraper.js'], world: 'MAIN' });
            
            activeExtractionTabId = currentTabId; 
            await chrome.scripting.executeScript({
                target: { tabId: currentTabId },
                func: function () {
                    const clickPdf = async () => {
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
                                    return;
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
                    success: true,
                    profileData: extractionResult.data,
                    url: tabData.url
                });
            } else {
                batchState.results.push({ username: tabData.username, error: extractionResult.error, success: false });
            }

            batchState.currentIndex++;
            saveBatchState();
            
            if (batchState.currentIndex < batchState.tabs.length && batchState.isRunning) {
                await new Promise(r => setTimeout(r, 2000));
            }
        }
    } catch (err) {
        log.error("[BATCH] Erro crítico no loop:", err);
    } finally {
        // Fechar a janela fantasma ao final
        if (batchState.workerWindowId) {
            log.info("[BATCH] Fechando janela fantasma.");
            await chrome.windows.remove(parseInt(batchState.workerWindowId)).catch(() => {});
            batchState.workerWindowId = null;
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

        // Recupera a janela do usuário de forma robusta (mesmo se vier do Sidepanel)
        chrome.windows.getLastFocused({ populate: false }, (focusedWindow) => {
            batchState = { 
                ...batchState, 
                // isRunning será setado pelo runBatchLoop para evitar deadlock
                tabs: message.tabs, 
                scorecardId: message.scorecardId, 
                jobId: message.jobId, 
                currentIndex: 0, 
                results: [],
                callerTabId: sender.tab ? sender.tab.id : null,
                callerWindowId: focusedWindow ? focusedWindow.id : null 
            };
            saveBatchState();
            log.info(`[SAFETY] Sacred Lockdown Ativo. User Window: ${batchState.callerWindowId}`);
            runBatchLoop();
        });
        sendResponse({ success: true });
    } else if (message.action === "START_SOURCING") {
        if (batchState.isRunning || batchState.isSourcing) {
            sendResponse({ success: false, error: "Já em execução." });
            return true;
        }
        chrome.windows.getLastFocused({ populate: false }, (focusedWindow) => {
            batchState = { 
                ...batchState, 
                // isSourcing será setado pelo runSourcingLoop para evitar deadlock
                scorecardId: message.scorecardId, 
                jobId: message.jobId, 
                results: [], 
                currentIndex: 0,
                sourcingTarget: message.targetCount,
                callerTabId: sender.tab ? sender.tab.id : null,
                callerWindowId: focusedWindow ? focusedWindow.id : null
            };
            saveBatchState();
            log.info(`[SAFETY] Sacred Lockdown Ativo. User Window: ${batchState.callerWindowId}`);
            runSourcingLoop(message.searchUrl, message.targetCount);
        });
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