// ATENÇÃO: ESTE ARQUIVO DEVE ESTAR EM 'src/background.js'

import { extractProfileFromPdf } from './services/api.service.js';

// 1. Configura a ação do clique no ícone para abrir o side panel
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

// 2. Listener para mensagens de outros scripts da extensão
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Processa a captura do PDF do LinkedIn
  if (message.action === "processLinkedInPdf" && message.data) {
    console.log("BACKGROUND: PDF (Base64) recebido do Content Script.");

    // A API espera um Blob. Convertamos o Data URL (Base64) para Blob.
    fetch(message.data)
      .then(res => res.blob())
      .then(async (pdfBlob) => {
        try {
          console.log("BACKGROUND: Blob convertido. Enviando para a API de extração...");
          const extractedData = await extractProfileFromPdf(pdfBlob);
          console.log("BACKGROUND: Dados extraídos com sucesso pela API!", extractedData);

          // Envia uma mensagem para a UI (Popup/Sidepanel) com o resultado.
          chrome.runtime.sendMessage({ type: 'PDF_EXTRACTION_SUCCESS', payload: extractedData });

          sendResponse({ success: true, data: extractedData });
        } catch (error) {
          console.error("BACKGROUND: Erro ao chamar a API de extração:", error);
          chrome.runtime.sendMessage({ type: 'PDF_EXTRACTION_FAILURE', payload: { message: error.message } });
          sendResponse({ success: false, error: error.message });
        }
      })
      .catch(error => {
        console.error("BACKGROUND: Erro ao converter Base64 para Blob:", error);
        sendResponse({ success: false, error: "Falha na conversão de Base64." });
      });

    // Retorna true para indicar que a resposta será enviada de forma assíncrona.
    return true;
  }

  // Você pode adicionar outros listeners 'if' aqui para diferentes ações no futuro.
});