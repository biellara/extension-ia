/**
 * @file Armazena e recupera o estado da UI do overlay (posição e estado minimizado).
 */

// Define a estrutura do estado da UI do overlay
export type OverlayUIState = {
  pos: { x: number; y: number };
  minimized: boolean;
  // Flag para saber se a posição inicial já foi definida pelo usuário.
  hasBeenMoved: boolean;
};

const STORAGE_KEY = 'echoOverlayUIState';

// ESTADO PADRÃO ATUALIZADO: Começa minimizado e sem posição definida pelo usuário.
const DEFAULT_STATE: OverlayUIState = {
  pos: { x: 20, y: 20 }, // Posição de fallback
  minimized: true,
  hasBeenMoved: false,
};

/**
 * Obtém o estado da UI do overlay do chrome.storage.local de forma segura.
 * @returns {Promise<OverlayUIState>} O estado salvo ou um estado padrão.
 */
export async function getOverlayUIState(): Promise<OverlayUIState> {
  if (!chrome?.runtime?.id) {
    return Promise.resolve(DEFAULT_STATE);
  }
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    return result[STORAGE_KEY] || DEFAULT_STATE;
  } catch (error) {
    if (!(error instanceof Error && error.message.includes("Extension context invalidated"))) {
      console.error("Erro ao obter estado da UI do overlay:", error);
    }
    return DEFAULT_STATE;
  }
}

/**
 * Salva o estado da UI do overlay de forma segura.
 * @param {Partial<OverlayUIState>} newState - O novo estado a ser mesclado com o estado atual.
 */
export async function saveOverlayUIState(newState: Partial<OverlayUIState>): Promise<void> {
  if (!chrome?.runtime?.id) return;
  try {
    const currentState = await getOverlayUIState();
    const mergedState = { ...currentState, ...newState };
    await chrome.storage.local.set({ [STORAGE_KEY]: mergedState });
  } catch (error) {
    if (!(error instanceof Error && error.message.includes("Extension context invalidated"))) {
        console.error("Erro ao salvar estado da UI do overlay:", error);
    }
  }
}
