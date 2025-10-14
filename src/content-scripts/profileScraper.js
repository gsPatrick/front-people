// CRIE O ARQUIVO: src/content-scripts/profileScraper.js

/**
 * Tenta encontrar o elemento principal do perfil que contém nome, título, etc.
 * Isso torna a busca pelos outros elementos mais confiável, pois o LinkedIn muda
 * as classes CSS constantemente.
 */
const getMainProfileElement = () => {
    // A estrutura mais confiável é encontrar o cabeçalho do perfil.
    // Ele geralmente está dentro de uma <section> que contém o <h1> com o nome da pessoa.
    const h1 = document.querySelector('h1');
    if (h1) {
        // Subimos na árvore DOM para encontrar o container da seção principal.
        const section = h1.closest('section');
        if (section) return section;
    }
    // Se não encontrar, retorna o documento inteiro como fallback.
    return document;
};

/**
 * Função principal que raspa os dados do perfil do LinkedIn.
 */
const scrapeProfile = () => {
    try {
        const mainElement = getMainProfileElement();

        // Helper para buscar texto de forma segura dentro do elemento principal.
        const getText = (selector) => mainElement.querySelector(selector)?.textContent.trim() || null;
        
        // Helper para extrair o username da URL da página.
        const getUsernameFromUrl = () => {
            try {
                const url = window.location.href;
                const match = url.match(/linkedin\.com\/in\/([^/?]+)/);
                return match ? match[1] : null;
            } catch (e) { return null; }
        };

        // --- SELETORES ROBUSTOS ---
        // 1. Nome: É quase sempre o único H1 visível no topo.
        const name = getText('h1');

        // 2. Headline: Geralmente é o próximo `div` logo após o H1.
        const headlineElement = mainElement.querySelector('h1 + div');
        const headline = headlineElement ? headlineElement.textContent.trim() : null;

        // 3. Localização: É um `span` que geralmente vem depois do headline.
        const locationElement = mainElement.querySelector('h1 + div + span');
        const location = locationElement ? locationElement.textContent.trim() : null;

        // Monta o objeto final com os dados.
        const profileData = {
            name: name,
            headline: headline,
            location: location,
            linkedinUsername: getUsernameFromUrl(),
            // Adicione aqui outros seletores para extrair mais dados (experiência, educação, etc.)
        };
        
        // Validação final: se não conseguiu pegar o nome, algo está errado.
        if (!profileData.name || !profileData.linkedinUsername) {
            throw new Error('Não foi possível extrair informações essenciais (nome ou username). O layout do LinkedIn pode ter mudado.');
        }

        // Envia a mensagem de SUCESSO com os dados para a extensão.
        chrome.runtime.sendMessage({
            type: 'SCRAPE_SUCCESS',
            payload: profileData
        });

    } catch (error) {
        // Envia uma mensagem de FALHA detalhada.
        chrome.runtime.sendMessage({
            type: 'SCRAPE_FAILURE',
            payload: { message: error.message }
        });
    }
};

// Executa a função de scraping.
scrapeProfile();