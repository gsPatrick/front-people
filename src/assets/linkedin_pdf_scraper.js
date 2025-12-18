// ARQUIVO COMPLETO: /scripts/linkedin_pdf_scraper.js

(async function() {
    'use strict';

    // Medida de segurança para evitar que o script seja injetado e executado
    // múltiplas vezes na mesma página se o usuário clicar no botão várias vezes.
    if (window.hasLinkedInPdfScraper) {
        console.warn('⚠️ O scraper de PDF do LinkedIn já está ativo nesta página. Aguardando a geração do PDF.');
        return;
    }
    window.hasLinkedInPdfScraper = true;

    const PREFIX = '[CONTENT SCRIPT]';
    const log = {
        info: (...args) => console.log(`%c${PREFIX} ℹ️`, 'color: blue; font-weight: bold;', ...args),
        success: (...args) => console.log(`%c${PREFIX} ✅`, 'color: green; font-weight: bold;', ...args),
        warn: (...args) => console.warn(`%c${PREFIX} ⚠️`, 'color: orange; font-weight: bold;', ...args),
        error: (...args) => console.error(`%c${PREFIX} ❌`, 'color: red; font-weight: bold;', ...args)
    };

    log.info("Script ativado. Aguardando o clique do usuário em 'Salvar como PDF' para interceptar o arquivo...");

    // =========================
    // VARIÁVEL GLOBAL PARA ARMAZENAR O PDF
    // =========================
    window.__capturedPDF = null;

    // =========================
    // INTERCEPTADOR DE 'FETCH'
    // =========================
    (function() {
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            const response = await originalFetch(...args);
            try {
                const url = response.url || "";
                const contentType = response.headers.get('content-type') || "";
                
                // Condição para identificar o PDF gerado pelo LinkedIn
                if (contentType.includes("application/pdf") || url.includes("/ambry/")) {
                    const cloned = response.clone();
                    const blob = await cloned.blob();
                    log.success('PDF capturado via API Fetch:', url);
                    window.__capturedPDF = blob;
                }
            } catch (err) {
                log.error("Erro ao tentar capturar PDF via Fetch:", err);
            }
            return response;
        };
    })();

    // =========================
    // INTERCEPTADOR DE 'XMLHTTPREQUEST' (para compatibilidade)
    // =========================
    (function() {
        const origSend = XMLHttpRequest.prototype.send;
        XMLHttpRequest.prototype.send = function(...args) {
            this.addEventListener("load", function() {
                try {
                    const ct = this.getResponseHeader("Content-Type");
                    if (ct && ct.includes("application/pdf")) {
                        log.success("PDF capturado via XHR:", this.responseURL);
                        window.__capturedPDF = new Blob([this.response], { type: "application/pdf" });
                    }
                } catch(e) {
                     log.error("Erro ao tentar capturar PDF via XHR:", e);
                }
            });
            return origSend.apply(this, args);
        };
    })();

    // =========================
    // FUNÇÕES AUXILIARES
    // =========================
    
    /**
     * Converte um objeto Blob para uma string Base64.
     * @param {Blob} blob - O arquivo PDF capturado.
     * @returns {Promise<string>} A representação do arquivo em Base64.
     */
    function blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    /**
     * Aguarda até que a variável window.__capturedPDF seja preenchida.
     * @param {number} timeout - Tempo máximo de espera em milissegundos.
     * @returns {Promise<Blob>} O Blob do PDF capturado.
     */
    async function waitForPDF(timeout = 30000) {
        log.info("Aguardando a detecção do PDF...");
        const start = Date.now();
        while (!window.__capturedPDF && Date.now() - start < timeout) {
            await new Promise(r => setTimeout(r, 300)); // Verifica a cada 300ms
        }
        if (!window.__capturedPDF) {
            throw new Error("Tempo limite excedido. O PDF não foi gerado ou capturado a tempo.");
        }
        return window.__capturedPDF;
    }

    // =========================
    // LÓGICA DE EXECUÇÃO PRINCIPAL
    // =========================
    try {
        // 1. Espera o PDF ser capturado
        const pdfBlob = await waitForPDF();
        log.success("PDF detectado e capturado com sucesso!", { size: pdfBlob.size, type: pdfBlob.type });

        // 2. Converte o Blob para Base64 para poder enviá-lo por mensagem
        log.info("Convertendo PDF para formato Base64...");
        const base64Pdf = await blobToBase64(pdfBlob);
        log.success("Conversão para Base64 concluída.");

        // 3. Envia o PDF para o background script para processamento
        log.info("Enviando PDF (Base64) para o background script...");
        chrome.runtime.sendMessage({
            action: "processLinkedInPdf",
            data: base64Pdf
        }, (response) => {
            if (chrome.runtime.lastError) {
                log.error("Falha ao comunicar com o background script:", chrome.runtime.lastError.message);
                return;
            }
            
            if (response && response.success) {
                log.success("Background script respondeu com sucesso! Processo finalizado no content script.");
                // Opcional: Você pode querer notificar o usuário na página com um toast/banner
                // alert('Perfil enviado para processamento!');
            } else {
                log.error("O background script retornou um erro:", response?.error || "Erro desconhecido.");
            }
        });

    } catch (err) {
        log.error("Erro fatal no processo de captura do content script:", err.message);
        // Opcional: Notificar o usuário sobre a falha
        alert(`Falha ao capturar o PDF do LinkedIn: ${err.message}`);
    } finally {
        // Limpa a flag para permitir que o script seja injetado novamente em uma futura tentativa.
        window.hasLinkedInPdfScraper = false;
        log.info("Script finalizado. Pronto para uma nova captura.");
    }

})();