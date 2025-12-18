// SUBSTITUA O ARQUIVO: src/services/pdf.service.js

import * as pdfjsLib from 'pdfjs-dist';

// ==========================================================
// ⭐ MUDANÇA PRINCIPAL AQUI ⭐
// Importamos o worker com o sufixo "?url". O Vite fará a mágica de
// copiar o arquivo e nos dar o caminho correto.
// ==========================================================
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker?url';

// Agora definimos o workerSrc com a URL que o Vite nos forneceu.
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

/**
 * Extrai todo o texto de um arquivo PDF.
 * @param {File} pdfFile - O arquivo PDF selecionado pelo usuário.
 * @returns {Promise<string>} Uma promessa que resolve com o texto completo do PDF.
 */
export const extractTextFromPdf = async (pdfFile) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const typedarray = new Uint8Array(event.target.result);
        const pdf = await pdfjsLib.getDocument(typedarray).promise;
        let fullText = '';

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map(item => item.str).join(' ');
          fullText += pageText + '\n\n';
        }

        resolve(fullText);

      } catch (error) {
        console.error('Erro ao extrair texto do PDF:', error);
        reject(new Error('Falha ao ler o arquivo PDF.'));
      }
    };

    reader.onerror = (error) => {
      reject(new Error('Erro ao ler o arquivo.'));
    };

    reader.readAsArrayBuffer(pdfFile);
  });
};