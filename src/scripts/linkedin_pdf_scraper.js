// ARQUIVO FINAL: src/scripts/linkedin_pdf_scraper.js
// Este script roda no MAIN WORLD para interceptar fetch/XHR

(async function () {
    'use strict';

    // Medida de segurança para evitar múltiplas execuções
    if (window.hasLinkedInPdfScraper) {
        console.warn('⚠️ O scraper de PDF do LinkedIn já está ativo nesta página.');
        return;
    }
    window.hasLinkedInPdfScraper = true;

    const PREFIX = '[SCRAPER]';
    const log = {
        info: (...args) => console.log(`%c${PREFIX} ℹ️`, 'color: blue; font-weight: bold;', ...args),
        success: (...args) => console.log(`%c${PREFIX} ✅`, 'color: green; font-weight: bold;', ...args),
        error: (...args) => console.error(`%c${PREFIX} ❌`, 'color: red; font-weight: bold;', ...args)
    };

    log.info("Script ativado. Interceptando requisições de rede...");

    // Função para converter Blob para Base64
    function blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    // Função para sinalizar o PDF capturado via DOM (para o Relay no ISOLATED world)
    async function signalPdfCaptured(blob) {
        try {
            log.info("Convertendo PDF para Base64...");
            const base64Data = await blobToBase64(blob);
            log.success("Conversão concluída. Sinalizando para o Relay...");

            // Cria um elemento invisível no DOM para passar os dados
            let signal = document.getElementById('__pdfCapturedSignal');
            if (!signal) {
                signal = document.createElement('div');
                signal.id = '__pdfCapturedSignal';
                signal.style.display = 'none';
                document.body.appendChild(signal);
            }
            signal.setAttribute('data-pdf', base64Data);

            log.success("Sinal enviado via DOM. O Relay deve capturar.");
        } catch (err) {
            log.error("Erro ao sinalizar PDF:", err);
        }
    }

    // =========================
    // INTERCEPTADOR DE 'FETCH'
    // =========================
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
        const response = await originalFetch(...args);
        try {
            const url = response.url || "";
            const contentType = response.headers.get('content-type') || "";

            if (contentType.includes("application/pdf") || url.includes("/ambry/")) {
                const cloned = response.clone();
                const blob = await cloned.blob();
                log.success('PDF capturado via Fetch:', url);

                // Sinaliza o PDF capturado
                await signalPdfCaptured(blob);
            }
        } catch (err) {
            log.error("Erro ao capturar PDF via Fetch:", err);
        }
        return response;
    };

    // =========================
    // INTERCEPTADOR DE 'XHR'
    // =========================
    const origSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function (...args) {
        this.addEventListener("load", async function () {
            try {
                const ct = this.getResponseHeader("Content-Type");
                if (ct && ct.includes("application/pdf")) {
                    log.success("PDF capturado via XHR:", this.responseURL);
                    const blob = new Blob([this.response], { type: "application/pdf" });
                    await signalPdfCaptured(blob);
                }
            } catch (e) {
                log.error("Erro ao capturar PDF via XHR:", e);
            }
        });
        return origSend.apply(this, args);
    };

    log.info("Interceptadores de rede configurados. Aguardando PDF...");

})();