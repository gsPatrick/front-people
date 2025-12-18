// background.js

// 1. Configura a ação do clique no ícone para abrir o side panel
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

// 2. Listener para mensagens do content script (scraper do LinkedIn)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Verifica se a ação é para processar o PDF do LinkedIn
    if (message.action === "processLinkedInPdf" && message.data) {
        console.log("BACKGROUND: PDF recebido. Enviando para a API...");

        // A API de extração espera um Blob, não um Base64.
        // Precisamos converter o Data URL (Base64) de volta para um Blob.
        fetch(message.data)
            .then(res => res.blob())
            .then(async (pdfBlob) => {
                try {
                    // Importa a função da API dinamicamente, pois estamos em um service worker.
                    // ATENÇÃO: Verifique se o caminho para api.service.js está correto
                    // em relação à estrutura do seu projeto.
                    // Como este arquivo será compilado para a raiz de 'dist', o caminho deve ser relativo a ele.
                    const api = await import('./services/api.service.js');
                    
                    const extractedData = await api.extractProfileFromPdf(pdfBlob);

                    console.log("BACKGROUND: Sucesso na API!", extractedData);

                    // AQUI: Você pode agora enviar uma mensagem para o Popup/SidePanel
                    // com os dados extraídos, se ele estiver aberto.
                    // Exemplo: chrome.runtime.sendMessage({ type: 'PDF_PROCESSED', payload: extractedData });
                    
                    sendResponse({ success: true, data: extractedData });

                } catch (error) {
                    console.error("BACKGROUND: Erro ao processar PDF:", error);
                    sendResponse({ success: false, error: error.message });
                }
            })
            .catch(error => {
                console.error("BACKGROUND: Erro ao converter Base64 para Blob:", error);
                sendResponse({ success: false, error: "Falha na conversão de Base64." });
            });
        
        // Retorna true para indicar que a resposta será enviada de forma assíncrona
        return true; 
    }
});