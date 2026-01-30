// linkedin_dom_scraper.js
// Extrai dados diretamente do DOM do LinkedIn para complementar/substituir o PDF

(function () {
    console.log("[DOM Scraper] Inicializando extração via DOM...");

    const extractText = (selector, root = document) => {
        const el = root.querySelector(selector);
        return el ? el.innerText.trim() : '';
    };

    const extractList = (sectionId, itemSelector, extractorFn) => {
        const section = document.getElementById(sectionId)?.closest('section');
        if (!section) return [];
        const items = section.querySelectorAll(itemSelector);
        return Array.from(items).map(extractorFn).filter(x => x);
    };

    // 1. Top Card (Nome, Headline, Local)
    const topCard = {
        name: extractText('h1.text-heading-xlarge'),
        headline: extractText('div.text-body-medium'),
        location: extractText('span.text-body-small.inline.t-black--light.break-words'),
        about: extractText('#about ~ .display-flex .inline-show-more-text') || extractText('#about ~ .display-flex')
    };

    // 2. Experiência
    const experiences = extractList('experience', 'li.artdeco-list__item', (li) => {
        const role = extractText('span.mr1.t-bold span[aria-hidden="true"]', li);
        const company = extractText('span.t-14.t-normal span[aria-hidden="true"]', li);
        const dateRange = extractText('span.t-14.t-black--light span[aria-hidden="true"]', li);
        const location = extractText('span.t-14.t-black--light:nth-child(2) span[aria-hidden="true"]', li);
        const description = extractText('div.inline-show-more-text span[aria-hidden="true"]', li);

        if (!role && !company) return null;

        return {
            role,
            company,
            dateRange,
            location,
            description
        };
    });

    // 3. Educação
    const education = extractList('education', 'li.artdeco-list__item', (li) => {
        const school = extractText('span.mr1.t-bold span[aria-hidden="true"]', li);
        const degree = extractText('span.t-14.t-normal span[aria-hidden="true"]', li);
        const dates = extractText('span.t-14.t-black--light span[aria-hidden="true"]', li);

        if (!school) return null;

        return {
            school,
            degree,
            dates
        };
    });

    // 4. Skills (Geralmente precisa clicar em 'Show all skills', mas vamos pegar as visíveis primeiro)
    const skills = extractList('skills', 'li.artdeco-list__item, a.app-aware-link > span[aria-hidden="true"]', (el) => {
        return el.innerText.trim();
    });

    const profileData = {
        source: 'DOM_SCRAPER',
        url: window.location.href,
        timestamp: new Date().toISOString(),
        perfil: {
            nome: topCard.name,
            titulo: topCard.headline,
            localizacao: topCard.location,
            resumo: topCard.about,
            linkedinUrl: window.location.href
        },
        experiencias: experiences,
        formacao: education,
        skills: [...new Set(skills)], // Remove duplicates
        rawText: document.body.innerText.substring(0, 5000) // Fallback text context
    };

    console.log("[DOM Scraper] Dados extraídos:", profileData);

    // Envia para o background/popup
    chrome.runtime.sendMessage({
        type: 'DOM_PROFILE_DATA',
        payload: profileData
    });

})();
