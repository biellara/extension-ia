
export type OverlayUIState = {
  pos: { x: number; y: number };
  minimized: boolean;
  hasBeenMoved: boolean;
};

const STORAGE_KEY = 'echoOverlayUIState';

const DEFAULT_STATE: OverlayUIState = {
  pos: { x: 20, y: 20 }, // Posição de fallback
  minimized: true,
  hasBeenMoved: false,
};

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
