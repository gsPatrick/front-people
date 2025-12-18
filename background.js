// ===================================================================
//              ARQUIVO COMPLETO: src/background.js
// ===================================================================

// Log inicial para garantir que o script começou a ser executado
console.log('[BACKGROUND] 🚀 Service Worker iniciando...');

// --- Bloco de Importação com Tratamento de Erro ---
try {
    var { extractProfileFromPdf } = await import('./services/api.service.js');
    console.log('[BACKGROUND] ✅ Módulo api.service.js importado com sucesso.');
} catch (e) {
    console.error('❌ ERRO CRÍTICO: Não foi possível importar o api.service.js. Verifique o caminho.', e);
    // Se a importação falhar, o resto do script não funcionará.
    // Lançar um erro aqui para deixar claro.
    throw new Error("Falha na importação do módulo da API.");
}

// --- Logger Padrão ---
const PREFIX = '[BACKGROUND]';
const log = {
    info: (...args) => console.log(`%c${PREFIX} ℹ️`, 'color: darkblue; font-weight: bold;', ...args),
    success: (...args) => console.log(`%c${PREFIX} ✅`, 'color: darkgreen; font-weight: bold;', ...args),
    error: (...args) => console.error(`%c${PREFIX} ❌`, 'color: darkred; font-weight: bold;', ...args)
};

// --- Lógica de Comportamento da Ação (Seu código original) ---
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
    log.info('Navegador iniciado, atualizando comportamento da ação.');
    updateActionBehavior();
});


// --- Lógica de Interceptação e Processamento de PDF ---

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

// 1. OUVINTE DE MENSAGENS
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "processLinkedInPdf") {
        log.info("Mensagem 'processLinkedInPdf' recebida do content script.");

        try {
            const pdfBlob = base64ToBlob(message.data);
            log.success("PDF convertido de Base64 para Blob.", { size: pdfBlob.size, type: pdfBlob.type });

            log.info("===> INICIANDO CHAMADA PARA A API <===");
            
            extractProfileFromPdf(pdfBlob)
                .then(extractedData => {
                    log.success("✅ SUCESSO! API retornou dados:", extractedData);
                    sendResponse({ success: true, data: extractedData });
                    chrome.notifications.create({
                        type: 'basic', iconUrl: 'logo.png', title: 'Sucesso!',
                        message: 'O perfil do LinkedIn foi extraído com sucesso.'
                    });
                })
                .catch(error => {
                    console.group("%c❌ FALHA NA CHAMADA DA API ❌", "color: red; font-size: 1.2em; font-weight: bold;");
                    log.error("Ocorreu um erro ao chamar 'extractProfileFromPdf'.");
                    log.error("Mensagem do Erro:", error.message);
                    log.error("Status HTTP (se disponível):", error.status);
                    log.error("Objeto de Erro Completo:", error);
                    console.groupEnd();
                    sendResponse({ success: false, error: error.message });
                    chrome.notifications.create({
                        type: 'basic', iconUrl: 'logo.png', title: 'Erro na Extração',
                        message: `Não foi possível processar o perfil. Erro: ${error.message}`
                    });
                });

        } catch (err) {
            log.error("Erro CRÍTICO ao decodificar o PDF (Base64 -> Blob).", err);
            sendResponse({ success: false, error: "Erro interno ao decodificar o PDF." });
        }
        return true; // Essencial para respostas assíncronas
    }
});
log.info('Ouvinte de mensagens (onMessage) configurado.');

// 2. OUVINTE DE DOWNLOADS
chrome.downloads.onCreated.addListener(async (downloadItem) => {
    log.info(`Novo download detectado: ${downloadItem.filename}`);
    const isLinkedInProfilePdf = downloadItem.url.includes('linkedin.com') && 
                                 downloadItem.filename.toLowerCase().endsWith('.pdf');

    if (isLinkedInProfilePdf) {
        log.success("Download de PDF do LinkedIn identificado. Cancelando...");
        try {
            await chrome.downloads.cancel(downloadItem.id);
            await chrome.downloads.erase({ id: downloadItem.id });
            log.success(`Download [ID: ${downloadItem.id}] apagado com sucesso.`);
        } catch (err) {
            log.error(`Falha ao cancelar/apagar o download [ID: ${downloadItem.id}].`, err.message);
        }
    }
});
log.info('Ouvinte de downloads (onCreated) configurado.');