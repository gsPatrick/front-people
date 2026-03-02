// ARQUIVO ATUALIZADO: public/assets/interceptor.js

(function() {
    'use strict';
    
    if (window.hasPDFInterceptor) return;
    window.hasPDFInterceptor = true;

    console.log('✅ [MAIN WORLD] Interceptadores de Fetch e XHR ativados.');

    // Função auxiliar para processar o blob e enviar o evento
    function processAndDispatch(blob) {
        const reader = new FileReader();
        reader.onloadend = () => {
            window.dispatchEvent(new CustomEvent('pdfCaptured', { detail: reader.result }));
        };
        reader.readAsDataURL(blob);
    }

    // --- INTERCEPTADOR DE FETCH ---
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
        const response = await originalFetch(...args);
        try {
            const contentType = response.headers.get('content-type') || "";
            if (contentType.includes("application/pdf")) {
                console.log('✅ [MAIN WORLD] PDF detectado via Fetch!');
                const cloned = response.clone();
                const blob = await cloned.blob();
                processAndDispatch(blob);
            }
        } catch (err) {
             console.error('❌ [MAIN WORLD] Erro no interceptador de Fetch:', err);
        }
        return response;
    };

    // --- INTERCEPTADOR DE XHR (CORRIGIDO E ADICIONADO) ---
    const originalSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function(...args) {
        this.addEventListener('load', function() {
            try {
                const contentType = this.getResponseHeader('Content-Type');
                if (contentType && contentType.includes('application/pdf')) {
                    console.log('✅ [MAIN WORLD] PDF detectado via XHR!');
                    const blob = new Blob([this.response], { type: 'application/pdf' });
                    processAndDispatch(blob);
                }
            } catch (e) {
                console.error('❌ [MAIN WORLD] Erro no interceptador de XHR:', e);
            }
        });
        return originalSend.apply(this, args);
    };

})();