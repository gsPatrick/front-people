// src/services/session.service.js

// Chaves para o armazenamento local do Chrome
const SESSION_STATE_KEY = 'app_session_state';
const SETTINGS_KEY = 'app_settings';

// --- GERENCIAMENTO DE SESSÃO ---

/**
 * Salva o estado atual da navegação e dos dados.
 * @param {object} state - O objeto de estado a ser salvo.
 */
export const saveSessionState = async (state) => {
  try {
    await chrome.storage.local.set({ [SESSION_STATE_KEY]: state });
  } catch (e) {
    console.error("Erro ao salvar o estado da sessão:", e);
  }
};

/**
 * Carrega o último estado salvo da sessão.
 * @returns {Promise<object|null>} O estado salvo ou null.
 */
export const loadSessionState = async () => {
  try {
    const result = await chrome.storage.local.get(SESSION_STATE_KEY);
    return result[SESSION_STATE_KEY] || null;
  } catch (e) {
    console.error("Erro ao carregar o estado da sessão:", e);
    return null;
  }
};

// --- GERENCIAMENTO DE CONFIGURAÇÕES ---

/**
 * Salva as configurações da aplicação.
 * @param {object} settings - O objeto de configurações.
 */
export const saveSettings = async (settings) => {
  try {
    await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
  } catch (e) {
    console.error("Erro ao salvar as configurações:", e);
  }
};

/**
 * Carrega as configurações salvas.
 * @returns {Promise<object|null>} As configurações salvas ou null.
 */
export const loadSettings = async () => {
  try {
    const result = await chrome.storage.local.get(SETTINGS_KEY);
    return result[SETTINGS_KEY] || null;
  } catch (e) {
    console.error("Erro ao carregar as configurações:", e);
    return null;
  }
};