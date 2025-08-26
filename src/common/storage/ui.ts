// Este é um exemplo do conteúdo provável do seu ficheiro.
// A linha mais importante é a adição de 'size'.

export type OverlayUIState = {
  pos: { x: number; y: number };
  minimized: boolean;
  hasBeenMoved: boolean;
  size?: { width: number; height: number }; // <-- ADICIONE OU AJUSTE ESTA LINHA
};

// O resto do seu ficheiro (funções get/save) permanece o mesmo.
// Exemplo:
const OVERLAY_UI_STATE_KEY = 'echo-overlay-ui-state';

export async function getOverlayUIState(): Promise<Partial<OverlayUIState>> {
  try {
    if (!chrome?.runtime?.id) return {};
    const result = await chrome.storage.local.get(OVERLAY_UI_STATE_KEY);
    return result[OVERLAY_UI_STATE_KEY] || {};
  } catch (_e) {
    return {};
  }
}

export async function saveOverlayUIState(
  newState: Partial<OverlayUIState>
): Promise<void> {
  const currentState = await getOverlayUIState();
  const mergedState = { ...currentState, ...newState };
  try {
    if (!chrome?.runtime?.id) return;
    await chrome.storage.local.set({ [OVERLAY_UI_STATE_KEY]: mergedState });
  } catch (_e) {
    // Silencia o erro
  }
}
