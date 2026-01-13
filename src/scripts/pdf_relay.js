// ARQUIVO CORRIGIDO: src/scripts/pdf_relay.js
// Este script roda no ISOLATED WORLD e faz a ponte entre MAIN e BACKGROUND

(function () {
    'use strict';

    console.log('[RELAY] PDF Relay injetado. Aguardando PDF do scraper...');

    // Função para converter Blob para Base64
    function blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    // O ISOLATED world compartilha o mesmo DOM, então podemos usar MutationObserver
    // ou polling para detectar quando o PDF foi capturado no MAIN world

    let checkAttempts = 0;
    const maxAttempts = 100; // 30 segundos (100 * 300ms)

    const checkForPdf = async () => {
        checkAttempts++;

        // Usa eval para acessar a variável no MAIN world através do contexto compartilhado
        // Na verdade, isso não funciona diretamente. Vamos usar uma abordagem diferente.

        // Verifica se existe um elemento de sinalização no DOM
        const signal = document.getElementById('__pdfCapturedSignal');

        if (signal) {
            console.log('[RELAY] Sinal de PDF encontrado no DOM!');
            const base64Data = signal.getAttribute('data-pdf');

            if (base64Data) {
                console.log('[RELAY] PDF Base64 extraído. Enviando para Background...');

                try {
                    chrome.runtime.sendMessage({
                        action: "processLinkedInPdf",
                        data: base64Data
                    }, (response) => {
                        console.log('[RELAY] Resposta do Background:', response);
                    });

                    // Remove o sinal
                    signal.remove();
                } catch (err) {
                    console.error('[RELAY] Erro ao enviar para Background:', err);
                }
            }
            return; // Para o polling
        }

        if (checkAttempts < maxAttempts) {
            setTimeout(checkForPdf, 300);
        } else {
            console.log('[RELAY] Timeout aguardando PDF.');
        }
    };

    // Inicia o polling
    checkForPdf();

})();
