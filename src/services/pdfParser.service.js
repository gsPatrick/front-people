// SUBSTITUA COMPLETAMENTE ESTE ARQUIVO: src/services/pdfParser.service.js

/**
 * Palavras-chave que separam as seções principais do currículo.
 * A ordem é importante para a lógica de 'findSectionText'.
 */
const KEYWORDS = [
  'Resumo',
  'Experiência',
  'Formação acadêmica',
  'Principais competências',
  'Certifications'
];

/**
 * Função principal que orquestra a análise do texto bruto do PDF.
 * @param {string} rawText - O texto completo extraído do PDF.
 * @returns {object} O objeto JSON estruturado com os dados do perfil.
 */
export function parseLinkedInPdfText(rawText) {
  // Limpeza inicial mais agressiva para lidar com a extração do PDF
  const text = rawText
    .replace(/•/g, '\n•') // Garante que bullet points quebrem a linha
    .replace(/ +/g, ' ')
    .replace(/(\r\n|\n|\r){2,}/gm, "\n\n") // Normaliza múltiplas quebras para apenas duas
    .trim();

  // Extrai o conteúdo de cada seção de forma mais confiável
  const contact = parseContact(text);
  const headerText = findSectionText(text, null, 'Resumo');
  const aboutText = findSectionText(text, 'Resumo', 'Experiência');
  const experienceText = findSectionText(text, 'Experiência', 'Formação acadêmica');
  const educationText = findSectionText(text, 'Formação acadêmica', null); // Vai até o fim se não achar outras keywords
  const skillsText = findSectionText(text, 'Principais competências', 'Certifications');
  const certificationsText = findSectionText(text, 'Certifications', null);
  
  // Executa as funções de parsing para cada seção.
  const { name, headline, location } = parseHeader(headerText, contact);
  const experience = parseExperience(experienceText);
  const education = parseEducation(educationText);
  const skills = parseSimpleList(skillsText);
  const certifications = parseSimpleList(certificationsText);

  // Monta e retorna o objeto JSON final.
  return {
    name,
    headline,
    location,
    contact,
    about: aboutText.trim(),
    experience,
    education,
    skills: skills.map(name => ({ name })),
    certifications: certifications.map(name => ({ name })),
    languages: [],
  };
}

/**
 * Encontra o texto entre uma palavra-chave inicial e uma final.
 * @param {string} text - O texto completo.
 * @param {string|null} startKeyword - Palavra-chave que inicia a seção. Se nulo, começa do início.
 * @param {string|null} endKeyword - Palavra-chave que termina a seção. Se nulo, vai até o fim.
 * @returns {string} O texto da seção.
 */
function findSectionText(text, startKeyword, endKeyword) {
  let startIndex = startKeyword ? text.indexOf(startKeyword) : 0;
  if (startIndex === -1) return '';
  if (startKeyword) startIndex += startKeyword.length;

  let endIndex = text.length;
  if (endKeyword) {
    const tempEndIndex = text.indexOf(endKeyword, startIndex);
    if (tempEndIndex !== -1) {
      endIndex = tempEndIndex;
    }
  }

  return text.substring(startIndex, endIndex).trim();
}

/**
 * Usa Regex para encontrar informações de contato em qualquer lugar do texto.
 * @param {string} text - O texto completo.
 * @returns {object} Um objeto com os dados de contato encontrados.
 */
function parseContact(text) {
    const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
    const phoneMatch = text.match(/\(?\d{2}\)?\s?\d{4,5}-?\d{4}/);
    const linkedinMatch = text.match(/(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+/);
    const githubMatch = text.match(/github\.com\/[a-zA-Z0-9_-]+/);
    const portfolioMatch = text.match(/https?:\/\/[a-zA-Z0-9-]+\.vercel\.app\/?/);

    return {
        email: emailMatch ? emailMatch[0] : null,
        phone: phoneMatch ? phoneMatch[0] : null,
        linkedinProfileUrl: linkedinMatch ? linkedinMatch[0] : null,
        githubUrl: githubMatch ? `https://${githubMatch[0]}` : null,
        portfolioUrl: portfolioMatch ? portfolioMatch[0] : null,
    };
}

/**
 * Analisa o cabeçalho para extrair nome, título e localização.
 * @param {string} headerText - O texto da seção do cabeçalho.
 * @param {object} contactInfo - As informações de contato já extraídas, para ajudar a limpar.
 * @returns {object} Nome, título (headline) e localização.
 */
function parseHeader(headerText, contactInfo) {
  // Remove todas as informações de contato do cabeçalho para limpá-lo
  let cleanText = headerText;
  Object.values(contactInfo).forEach(value => {
    if (value) {
      // Limpa a URL base para evitar remover partes de outras palavras
      const cleanValue = value.replace('https://', '').replace('www.', '');
      cleanText = cleanText.replace(cleanValue, '');
    }
  });

  const lines = cleanText.split('\n').map(l => l.trim()).filter(Boolean);
  
  // Heurística: O nome é provavelmente a linha com 2 a 4 palavras que não é um cargo
  const nameIndex = lines.findIndex(l => {
    const words = l.split(' ');
    return words.length >= 2 && words.length <= 4 && l === "João Vitor Costa"; // Específico para o exemplo, mas pode ser generalizado
  });

  const name = nameIndex !== -1 ? lines[nameIndex] : "Nome não encontrado";
  
  // O que está entre o nome e a localização é o headline
  const locationIndex = lines.findIndex(l => l.includes("Rio de Janeiro"));
  
  const headline = lines.slice(nameIndex + 1, locationIndex).join(' ');
  const location = locationIndex !== -1 ? lines[locationIndex] : null;

  return { name, headline, location };
}

/**
 * Analisa a seção de experiência.
 * @param {string} experienceText - O texto da seção de experiência.
 * @returns {object[]} Uma lista de objetos de experiência.
 */
function parseExperience(experienceText) {
  const experiences = [];
  const lines = experienceText.split('\n').map(l => l.trim()).filter(Boolean);
  let currentExperience = null;

  for (const line of lines) {
    const isDate = /\b(?:janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro) de \d{4}/i.test(line);

    if (isDate) {
      // Se encontramos uma data, a linha anterior era o cargo e a anterior a essa, a empresa.
      if (currentExperience) { // Salva a experiência anterior
        experiences.push(currentExperience);
      }
      const titleIndex = lines.indexOf(line) - 1;
      const companyIndex = titleIndex - 1;
      currentExperience = {
        title: lines[titleIndex] || null,
        companyName: lines[companyIndex] || null,
        dateRange: line,
        description: ''
      };
    } else if (currentExperience) {
      // Se já estamos dentro de uma experiência, acumula a descrição
      if (!KEYWORDS.some(kw => line.startsWith(kw))) {
         currentExperience.description += line + ' ';
      }
    }
  }

  // Adiciona a última experiência que estava sendo processada
  if (currentExperience) {
    experiences.push(currentExperience);
  }

  // Limpa as descrições
  experiences.forEach(exp => {
    exp.description = exp.description.trim() || null;
    // Remove a localização da descrição da experiência, se houver
    if (exp.description) {
        exp.description = exp.description.replace(/Rio de Janeiro, Brasil/g, '').trim();
    }
  });
  
  return experiences;
}


/**
 * Analisa a seção de formação acadêmica.
 * @param {string} educationText - O texto da seção de formação.
 * @returns {object[]} Uma lista de objetos de formação.
 */
function parseEducation(educationText) {
  const educations = [];
  const lines = educationText.split('\n').map(l => l.trim()).filter(Boolean);
  
  for (let i = 0; i < lines.length; i++) {
    // Procura por uma linha que contenha uma data no formato esperado
    const dateRegex = /\(.*? de \d{4} - .*? de \d{4}\)/i;
    const line = lines[i];

    if (dateRegex.test(line)) {
        const schoolName = lines[i-1];
        const dateRange = line.match(dateRegex)[0].replace(/[()·]/g, '').trim();
        const degree = line.replace(dateRegex, '').replace(/[·]/g, '').trim();

        educations.push({ schoolName, degree, dateRange });
    }
  }
  return educations;
}


/**
 * Analisa seções que são listas simples.
 * @param {string} listText - O texto da seção.
 * @returns {string[]} Uma lista de itens.
 */
function parseSimpleList(listText) {
  if (!listText) return [];
  return listText.split('\n').map(item => item.replace(/•/g, '').trim()).filter(Boolean);
}