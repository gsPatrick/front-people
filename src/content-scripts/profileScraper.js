// src/content-scripts/profileScraper.js

/**
 * Tenta encontrar o elemento principal do perfil que contém nome, título, etc.
 * Isso torna a busca pelos outros elementos mais confiável.
 */
const getMainProfileElement = () => {
    // O LinkedIn geralmente envolve o cabeçalho do perfil em um elemento com a foto.
    // Procuramos por um link que contenha 'pv-top-card__photo'.
    const photoLink = document.querySelector('a[href*="/in/"][href*="/detail/contact-info/"]');
    if (photoLink) {
        // A partir do link da foto, subimos na árvore DOM para encontrar o contêiner principal.
        // Este elemento geralmente é um `div` que é irmão de um `div` com `id="artdeco-modal-outlet"`
        let parent = photoLink.closest('div.pv-top-card');
        if(parent) return parent;
    }
    
    // Fallback: Se a estrutura acima falhar, tenta encontrar um container geral.
    // Este seletor é mais genérico e pode funcionar em diferentes layouts.
    const mainSections = document.querySelectorAll('main section');
    for(const section of mainSections) {
        if(section.querySelector('h1')) {
            return section;
        }
    }
    return document; // Retorna o documento inteiro como último recurso
};


const scrapeProfile = () => {
    try {
        const mainElement = getMainProfileElement();

        // Helper para buscar texto dentro do elemento principal.
        const getText = (selector, element = mainElement) => element.querySelector(selector)?.textContent.trim() || null;
        
        const getUsernameFromUrl = () => {
            try {
                const url = window.location.href;
                const match = url.match(/linkedin\.com\/in\/([^/?]+)/);
                return match ? match[1] : null;
            } catch (e) { return null; }
        };

        // --- NOVOS SELETORES MAIS ROBUSTOS ---
        // 1. Nome: É quase sempre o único H1 dentro do cabeçalho do perfil.
        const name = getText('h1');

        // 2. Headline: Geralmente é o próximo `div` logo após o H1.
        const headlineElement = mainElement.querySelector('h1 + div');
        const headline = headlineElement ? headlineElement.textContent.trim() : null;

        // 3. Localização: É um `span` que geralmente vem depois do headline e contém ícones.
        const locationElement = Array.from(mainElement.querySelectorAll('span.text-body-small'))
                                     .find(span => span.textContent.includes(',') && (span.textContent.includes('Brazil') || span.textContent.includes('Brasil')));
        const location = locationElement ? locationElement.textContent.trim() : null;


        const profileData = {
            name: name,
            headline: headline,
            location: location,
            linkedinUsername: getUsernameFromUrl(),
            company: null, // Manter como null por enquanto
            jobTitle: null // Manter como null por enquanto
        };
        
        // Validação final: se não conseguiu pegar o nome ou username, algo está muito errado.
        if (!profileData.name || !profileData.linkedinUsername) {
            throw new Error('Não foi possível extrair informações essenciais (nome ou username). O layout do LinkedIn pode ter mudado.');
        }

        // Envia a mensagem de sucesso para a extensão.
        chrome.runtime.sendMessage({
            type: 'SCRAPE_SUCCESS',
            payload: profileData
        });

    } catch (error) {
        // Envia uma mensagem de falha detalhada.
        chrome.runtime.sendMessage({
            type: 'SCRAPE_FAILURE',
            payload: { message: error.message }
        });
    }
};

scrapeProfile();