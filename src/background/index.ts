import {
  MSG_CS_CONVERSATION_CHANGE,
  MSG_CS_SNAPSHOT_RESULT,
  MSG_BG_REQUEST_SNAPSHOT,
  MSG_CS_NEW_MESSAGES,
  MSG_GET_STATUS,
  MSG_BG_STATUS,
  POPUP_TOGGLE_PAUSE,
  POPUP_CLEAR_CONVERSATION,
  OPTIONS_UPDATE_SETTINGS
} from "../common/messaging/channels";
import { processMessageBatch } from "../common/storage/storage";
import { ConversationMeta } from "../common/types/models";

console.log("[BG] Service Worker iniciado.");

type AppState = {
  state: 'idle' | 'observing' | 'paused';
  paused: boolean;
  conversationKey?: string;
  messageCount?: number;
  latestTimestamp?: string;
  settings: {
    anonymize: boolean;
  }
};

const tabStates: { [tabId: number]: AppState } = {};
const activePorts: { [tabId: number]: chrome.runtime.Port } = {};

function getTabState(tabId: number): AppState {
  if (!tabStates[tabId]) {
    tabStates[tabId] = {
      state: 'idle',
      paused: false,
      settings: { anonymize: true }
    };
  }
  return tabStates[tabId];
}

/**
 * Transmite o estado atualizado para o overlay de uma aba específica.
 * Inclui tratamento de erros para portas que foram fechadas (ex: por bfcache).
 * @param tabId O ID da aba para a qual enviar o status.
 */
function broadcastStatus(tabId: number) {
  const port = activePorts[tabId];
  if (port) {
    const state = getTabState(tabId);
    try {
      port.postMessage({ type: MSG_BG_STATUS, payload: state });
      // VERIFICAÇÃO ADICIONAL: Trata o erro específico do bfcache que não é capturado pelo catch.
      if (chrome.runtime.lastError) {
        console.warn(`[BG] lastError ao enviar status para aba ${tabId}: ${chrome.runtime.lastError.message}`);
        // Limpa a porta inválida
        delete activePorts[tabId];
      }
    } catch (e) {
      console.warn(`[BG] Falha ao enviar status para aba ${tabId}, porta desconectada.`, e);
      // Limpa a porta inválida
      delete activePorts[tabId];
    }
  }
}

chrome.runtime.onConnect.addListener(port => {
  if (port.name === "overlay" && port.sender?.tab?.id) {
    const tabId = port.sender.tab.id;
    activePorts[tabId] = port;
    console.log(`[BG] Overlay conectado na aba ${tabId}`);

    port.onDisconnect.addListener(() => {
      // Limpa a porta quando o content script se desconecta
      delete activePorts[tabId];
      console.log(`[BG] Overlay desconectado da aba ${tabId}`);
      // Verifica o lastError para evitar erros não verificados no log
      if (chrome.runtime.lastError) {
         console.log(`[BG] onDisconnect lastError: ${chrome.runtime.lastError.message}`);
      }
    });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { type, payload } = message;
  const tabId = sender.tab?.id;

  if (!tabId) return true; // Ignora mensagens sem um ID de aba

  const currentState = getTabState(tabId);
  let stateChanged = false;

  switch (type) {
    case MSG_CS_CONVERSATION_CHANGE:
      currentState.state = 'observing';
      currentState.conversationKey = payload.conversationKey;
      currentState.messageCount = 0;
      currentState.latestTimestamp = undefined;
      if (chrome.runtime.id) chrome.tabs.sendMessage(tabId, { type: MSG_BG_REQUEST_SNAPSHOT, payload });
      stateChanged = true;
      break;

    case MSG_CS_SNAPSHOT_RESULT:
    case MSG_CS_NEW_MESSAGES:
      if (currentState.paused) break;
      processMessageBatch(payload.conversationKey, payload.messages).then(meta => {
        currentState.messageCount = meta.messageCount;
        currentState.latestTimestamp = meta.latestTimestampISO;
        broadcastStatus(tabId); // Transmite após a operação assíncrona
      });
      // A mudança de estado é transmitida dentro do .then()
      break;

    case MSG_GET_STATUS:
      sendResponse({ type: MSG_BG_STATUS, payload: currentState });
      broadcastStatus(tabId);
      break;

    case POPUP_TOGGLE_PAUSE:
      currentState.paused = !currentState.paused;
      currentState.state = currentState.paused ? 'paused' : 'observing';
      stateChanged = true;
      break;

    case POPUP_CLEAR_CONVERSATION:
      console.log(`[BG] Limpando conversa ${payload.conversationKey}`);
      currentState.messageCount = 0;
      currentState.latestTimestamp = undefined;
      // TODO: Chamar uma função em storage.ts para limpar os dados
      stateChanged = true;
      break;

    case OPTIONS_UPDATE_SETTINGS:
      currentState.settings = { ...currentState.settings, ...payload };
      stateChanged = true;
      break;
  }

  if (stateChanged) {
    broadcastStatus(tabId);
  }

  return true;
});

// (Opcional) Context Menu
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "toggle-pause",
    title: "Pausar/Retomar Captura",
    contexts: ["page"],
    documentUrlPatterns: ["https://erp.iredinternet.com.br/*"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "toggle-pause" && tab?.id) {
    const state = getTabState(tab.id);
    state.paused = !state.paused;
    state.state = state.paused ? 'paused' : 'observing';
    broadcastStatus(tab.id);
  }
});
