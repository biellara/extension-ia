// Define a estrutura do estado da UI do overlay
export type OverlayUIState = {
  pos: { x: number; y: number };
  minimized: boolean;
};

const STORAGE_KEY = 'echoOverlayUIState';
const DEFAULT_STATE: OverlayUIState = { pos: { x: 20, y: 20 }, minimized: false };

/**
 * Obtém o estado da UI do overlay do chrome.storage.local de forma segura.
 * @returns {Promise<OverlayUIState>} O estado salvo ou um estado padrão.
 */
export async function getOverlayUIState(): Promise<OverlayUIState> {
  // VERIFICAÇÃO: Garante que o contexto da extensão é válido antes de chamar a API.
  if (!chrome?.runtime?.id) {
    console.warn("[Echo] Contexto da extensão invalidado. Retornando estado padrão da UI.");
    return Promise.resolve(DEFAULT_STATE);
  }

  try {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    return result[STORAGE_KEY] || DEFAULT_STATE;
  } catch (error) {
    // O erro "Extension context invalidated" também será capturado aqui.
    // Não é necessário logar novamente, apenas retornamos o padrão.
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
  // VERIFICAÇÃO: Garante que o contexto da extensão é válido.
  if (!chrome?.runtime?.id) {
    return; // Simplesmente não faz nada se o contexto foi perdido.
  }

  try {
    const currentState = await getOverlayUIState();
    // Previne a atualização se o currentState retornou default por causa de um contexto já invalidado.
    if (!chrome?.runtime?.id) return;
    
    const mergedState = { ...currentState, ...newState, pos: newState.pos || currentState.pos };
    await chrome.storage.local.set({ [STORAGE_KEY]: mergedState });
  } catch (error) {
    if (!(error instanceof Error && error.message.includes("Extension context invalidated"))) {
        console.error("Erro ao salvar estado da UI do overlay:", error);
    }
  }
}