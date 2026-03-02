// scripts/linkedin_search_scraper.js

(function () {
    console.log("[InHire] Search Scraper Injected");

    const SETTINGS = {
        maxRetries: 3,
        scrollDelay: 1500,
        paginationDelay: 3000
    };

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async function autoScroll() {
        let totalHeight = 0;
        let distance = 300;
        // Scrollando um pouco mais agressivo e esperando mais
        while (totalHeight < document.body.scrollHeight) {
            window.scrollBy(0, distance);
            totalHeight += distance;
            await sleep(100);
        }
        // NÃO volta ao topo, deixa lá embaixo pro LinkedIn carregar tudo
    }

    function extractProfileUrls() {
        const urls = new Set();

        // Estratégia "Nuclear" (Global Scan): 
        // Vamos pegar TODOS os links da página que contêm "/in/" e filtrar o lixo.
        console.log("[InHire] Iniciando Scan Global de URLs...");

        const allLinks = document.querySelectorAll('a[href*="/in/"]');
        console.log(`[InHire Scan] ${allLinks.length} links potenciais encontrados.`);

        allLinks.forEach(el => {
            let href = el.href;

            // Filtros de segurança:
            if (
                href &&
                href.includes('/in/') &&
                !href.includes('/overlay/') &&
                !href.includes('/detail/') && // overlay de detalhes
                !href.includes('/miniprofile/') && // mini profile popups
                !href.includes('linkedin.com/in/me') &&
                !href.includes('linkedin.com/in/ACoA') // IDs internos
            ) {
                // Remove query params para limpar a URL
                const cleanUrl = href.split('?')[0];

                // Validação extra
                if (cleanUrl.length > 25) {
                    urls.add(cleanUrl);
                }
            }
        });

        // Fallback: Se não achou NADA, tenta buscar no texto HTML (desespero total)
        if (urls.size === 0) {
            console.log("[InHire] Scan de links falhou. Tentando Regex no HTML (fallback extremo).");
            const html = document.body.innerHTML;
            const regex = /linkedin\.com\/in\/([a-zA-Z0-9-]+)/g;
            let match;
            while ((match = regex.exec(html)) !== null) {
                if (match[0] && !match[0].includes('/me') && !match[0].includes('/overlay')) {
                    urls.add('https://www.' + match[0]);
                }
            }
        }

        console.log(`[InHire Scraper] Retornando ${urls.size} perfis únicos:`, Array.from(urls));
        return Array.from(urls);
    }

    function findNextButton() {
        // Botão "Avançar" ou "Next" na paginação
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.find(btn =>
            (btn.innerText.includes('Avançar') || btn.innerText.includes('Next') || btn.ariaLabel?.includes('Next')) &&
            !btn.disabled
        );
    }

    // Escuta mensagens do Popup/Background
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "scrape_search_results") {
            (async () => {
                try {
                    console.log("[InHire] Iniciando scraping da página...");
                    await autoScroll();
                    await sleep(SETTINGS.scrollDelay);

                    const urls = extractProfileUrls();

                    const nextBtn = findNextButton();
                    const hasNextPage = !!nextBtn;

                    sendResponse({
                        success: true,
                        urls: urls,
                        hasNextPage: hasNextPage
                    });

                    // Se solicitado, clica para a próxima página após responder
                    if (request.goToNext && hasNextPage) {
                        console.log("[InHire] Navegando para próxima página...");
                        nextBtn.click();
                    }

                } catch (err) {
                    console.error("[InHire] Erro no scraper:", err);
                    sendResponse({ success: false, error: err.message });
                }
            })();
            return true; // Mantém canal aberto para resposta assíncrona
        }
    });
})();
