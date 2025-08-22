/**
 * @file Gerencia o armazenamento e recuperação das configurações da extensão.
 */

export interface AppSettings {
  retentionDays: 7 | 15 | 30;
  messageLimit: 500 | 1000 | 2000;
  anonymize: boolean;
  // Novas configurações para a IA
  geminiApiKey: string;
  aiModel: string;
  contextWindowSize: 30 | 50 | 80;
}

const STORAGE_KEY = 'echoAppSettings';

const DEFAULT_SETTINGS: AppSettings = {
  retentionDays: 7,
  messageLimit: 2000,
  anonymize: true,
  geminiApiKey: '',
  aiModel: 'gemini-1.5-flash-latest',
  contextWindowSize: 50,
};

/**
 * Obtém as configurações da extensão do storage.
 * @returns {Promise<AppSettings>} As configurações salvas ou as padrões.
 */
export async function getAppSettings(): Promise<AppSettings> {
  if (!chrome?.runtime?.id) {
    return Promise.resolve(DEFAULT_SETTINGS);
  }
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    return { ...DEFAULT_SETTINGS, ...result[STORAGE_KEY] };
  } catch (error) {
    console.error("Erro ao obter as configurações da aplicação:", error);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Salva as configurações da extensão no storage.
 * @param {Partial<AppSettings>} newSettings - As novas configurações a serem salvas.
 */
export async function saveAppSettings(newSettings: Partial<AppSettings>): Promise<void> {
  if (!chrome?.runtime?.id) return;
  try {
    const currentSettings = await getAppSettings();
    const mergedSettings = { ...currentSettings, ...newSettings };
    await chrome.storage.local.set({ [STORAGE_KEY]: mergedSettings });
    console.log("[BG] Configurações salvas:", mergedSettings);
  } catch (error) {
    console.error("Erro ao salvar as configurações da aplicação:", error);
  }
}
