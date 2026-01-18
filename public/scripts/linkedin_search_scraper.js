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
        while (totalHeight < document.body.scrollHeight) {
            window.scrollBy(0, distance);
            totalHeight += distance;
            await sleep(200);
        }
        window.scrollTo(0, 0); // Volta ao topo
    }

    function extractProfileUrls() {
        // Seletores comuns de resultados de busca do LinkedIn
        // Link principal do perfil dentro do container de resultado
        const selector = '.reusable-search__result-container a.app-aware-link';
        const elements = document.querySelectorAll(selector);

        const urls = new Set();
        elements.forEach(el => {
            let href = el.href;
            if (href && href.includes('/in/')) {
                // Remove query params para limpar a URL
                href = href.split('?')[0];
                urls.add(href);
            }
        });

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
                    console.log(`[InHire] Encontrados ${urls.length} perfis.`);

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
