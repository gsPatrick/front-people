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
        // window.scrollTo(0, 0); // Removido para evitar re-renderização/virtualização agressiva
    }

    function extractProfileUrls() {
        const urls = new Set();

        // Estrategia 1: Link do Título (Mais confiável)
        // Geralmente: .entity-result__title-text a.app-aware-link
        const titleLinks = document.querySelectorAll('.entity-result__title-text a.app-aware-link');
        titleLinks.forEach(el => {
            const href = el.href;
            if (href && href.includes('/in/')) {
                urls.add(href.split('?')[0]);
            }
        });

        // Estrategia 2: Seletor Genérico dentro do container de resultado
        // Caso o layout mude
        if (urls.size === 0) {
            console.log("[InHire] Estratégia 1 falhou, tentando seletor genérico...");
            const containers = document.querySelectorAll('li.reusable-search__result-container');
            containers.forEach(container => {
                const link = container.querySelector('a[href*="/in/"]');
                if (link) {
                    urls.add(link.href.split('?')[0]);
                }
            });
        }

        // Estratégia 3: Busca bruta por links de perfil na área de resultados principal
        if (urls.size === 0) {
            console.log("[InHire] Estratégia 2 falhou, tentando busca bruta...");
            const mainList = document.querySelector('ul.reusable-search__entity-result-list');
            if (mainList) {
                const links = mainList.querySelectorAll('a[href*="/in/"]');
                links.forEach(el => {
                    // Filtra links que não parecem ser o principal (evita duplicatas ou links de imagem se possível)
                    if (!el.classList.contains('scale-down')) {
                        urls.add(el.href.split('?')[0]);
                    }
                });
            }
        }

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
