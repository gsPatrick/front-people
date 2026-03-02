(async function() {
    'use strict';

    console.log('🚀 LINKEDIN PDF SCRAPER ATUALIZADO INICIADO');

    // =========================
    // LOGGER SIMPLES
    // =========================
    const log = {
        info: (...args) => console.log('ℹ️', ...args),
        success: (...args) => console.log('✅', ...args),
        warn: (...args) => console.warn('⚠️', ...args),
        error: (...args) => console.error('❌', ...args)
    };

    // =========================
    // INTERCEPTADOR DE PDF
    // =========================
    window.__capturedPDF = null;

    (function() {
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            const response = await originalFetch(...args);
            try {
                const url = response.url || "";
                const contentType = response.headers.get('content-type') || "";
                if (contentType.includes("application/pdf") || url.includes("/ambry/")) {
                    const cloned = response.clone();
                    const blob = await cloned.blob();
                    log.success('📄 PDF capturado via fetch:', url);
                    window.__capturedPDF = blob;
                }
            } catch (err) {
                log.error("Erro ao capturar PDF:", err);
            }
            return response;
        };
    })();

    (function() {
        const origSend = XMLHttpRequest.prototype.send;
        XMLHttpRequest.prototype.send = function(...args) {
            this.addEventListener("load", function() {
                const ct = this.getResponseHeader("Content-Type");
                if (ct && ct.includes("application/pdf")) {
                    log.success("📄 PDF capturado via XHR:", this.responseURL);
                    window.__capturedPDF = new Blob([this.response], { type: "application/pdf" });
                }
            });
            return origSend.apply(this, args);
        };
    })();

    log.info("Interceptadores de PDF ativados. Aguarde o LinkedIn gerar o PDF...");

    // =========================
    // AGUARDAR PDF
    // =========================
    async function waitForPDF(timeout = 30000) {
        const start = Date.now();
        while (!window.__capturedPDF && Date.now() - start < timeout) {
            await new Promise(r => setTimeout(r, 300));
        }
        if (!window.__capturedPDF) throw new Error("PDF não foi capturado dentro do tempo limite.");
        return window.__capturedPDF;
    }

    const pdfBlob = await waitForPDF();
    log.success("✅ PDF disponível em window.__capturedPDF");

    // =========================
    // ENVIAR PDF PARA A API
    // =========================
    const API_URL = "https://suaapi.com/upload-linkedin"; // 🔹 <--- troque para sua URL real

    async function sendToAPI(pdfBlob) {
        const formData = new FormData();
        formData.append("file", pdfBlob, "LinkedIn_Profile.pdf");

        log.info("📤 Enviando PDF para a API...");
        const response = await fetch(API_URL, {
            method: "POST",
            body: formData
        });

        if (!response.ok) throw new Error(`Falha ao enviar para API: ${response.status}`);
        const data = await response.json();
        log.success("📥 Resposta da API recebida!");
        return data;
    }

    const extractedData = await sendToAPI(pdfBlob);

    // =========================
    // BAIXAR JSON LOCALMENTE
    // =========================
    const jsonBlob = new Blob([JSON.stringify(extractedData, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(jsonBlob);
    a.download = `linkedin-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    log.success("💾 JSON baixado localmente com os dados extraídos!");
    log.info("✅ Processo completo. Dados também disponíveis em window.__extractedData");

    window.__extractedData = extractedData;

})();
