// COLE ESTE CÓDIGO NO ARQUIVO: src/services/session.service.js

// Chaves para o armazenamento local do Chrome para evitar conflitos
const SESSION_STATE_KEY = 'app_session_state_v1';
const SETTINGS_KEY = 'app_settings_v1';
const AUTH_DATA_KEY = 'app_auth_data_v1';

// ===================================================================
//                          GERENCIAMENTO DE AUTENTICAÇÃO
// ===================================================================

/**
 * Salva o token e os dados do usuário no storage local do Chrome.
 * @param {object} authData - Objeto contendo { token, user }.
 */
export const saveAuthData = async (authData) => {
  try {
    await chrome.storage.local.set({ [AUTH_DATA_KEY]: authData });
  } catch (e) {
    console.error("Erro ao salvar dados de autenticação:", e);
  }
};

/**
 * Carrega o token e os dados do usuário do storage.
 * @returns {Promise<{token: string, user: object}|null>} Os dados de autenticação ou null se não encontrados.
 */
export const loadAuthData = async () => {
  try {
    const result = await chrome.storage.local.get(AUTH_DATA_KEY);
    return result[AUTH_DATA_KEY] || null;
  } catch (e) {
    console.error("Erro ao carregar dados de autenticação:", e);
    return null;
  }
};

/**
 * Limpa os dados de autenticação do storage (usado para logout).
 */
export const clearAuthData = async () => {
  try {
    await chrome.storage.local.remove(AUTH_DATA_KEY);
  } catch (e) {
    console.error("Erro ao limpar dados de autenticação:", e);
  }
};


// ===================================================================
//                          GERENCIAMENTO DE SESSÃO DA APLICAÇÃO
// ===================================================================

/**
 * Salva o estado atual da navegação e dos dados (view atual, job, talento, etc.).
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
 * Carrega o último estado salvo da sessão para restauração.
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

// ===================================================================
//                          GERENCIAMENTO DE CONFIGURAÇÕES
// ===================================================================

/**
 * Salva as configurações da aplicação (ex: modo painel lateral, IA ativada).
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
 * Carrega as configurações salvas da aplicação.
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