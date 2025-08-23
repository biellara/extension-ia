import {
  MSG_CS_CONVERSATION_CHANGE,
  MSG_CS_SNAPSHOT_RESULT,
  MSG_BG_REQUEST_SNAPSHOT,
  MSG_CS_NEW_MESSAGES,
  MSG_GET_STATUS,
  MSG_BG_STATUS,
  POPUP_TOGGLE_PAUSE,
  POPUP_CLEAR_CONVERSATION,
  OPTIONS_UPDATE_SETTINGS,
  MSG_OPEN_OPTIONS_PAGE,
  MSG_CLEAR_ALL_DATA,
  AI_SUMMARIZE,
  AI_SUGGEST,
  AI_CLASSIFY
} from "../common/messaging/channels";
import { processMessageBatch, clearConversationData } from "../common/storage/storage";
import { getAppSettings, saveAppSettings, AppSettings } from "../common/storage/settings";
import { handleAiRequest } from "../background/ai/aiHandlers"; // Importa o handler de IA

console.log("[BG] Service Worker iniciado.");

type AppState = {
  state: 'idle' | 'observing' | 'paused';
  paused: boolean;
  conversationKey?: string;
  messageCount?: number;
  latestTimestamp?: string;
  settings: AppSettings;
};

const tabStates: { [tabId: number]: AppState } = {};
const activePorts: { [tabId: number]: chrome.runtime.Port } = {};

async function getTabState(tabId: number): Promise<AppState> {
  if (!tabStates[tabId]) {
    tabStates[tabId] = {
      state: 'idle',
      paused: false,
      settings: await getAppSettings()
    };
  }
  tabStates[tabId].settings = await getAppSettings();
  return tabStates[tabId];
}

async function broadcastStatus(tabId: number) {
  const port = activePorts[tabId];
  if (port) {
    const state = await getTabState(tabId);
    try {
      port.postMessage({ type: MSG_BG_STATUS, payload: state });
      if (chrome.runtime.lastError) {
        console.warn(`[BG] lastError ao enviar status para aba ${tabId}: ${chrome.runtime.lastError.message}`);
        delete activePorts[tabId];
      }
    } catch (e) {
      console.warn(`[BG] Falha ao enviar status para aba ${tabId}, porta desconectada.`, e);
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
      delete activePorts[tabId];
      console.log(`[BG] Overlay desconectado da aba ${tabId}`);
      if (chrome.runtime.lastError) {
         console.log(`[BG] onDisconnect lastError: ${chrome.runtime.lastError.message}`);
      }
    });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { type, payload } = message;

  // CORREÇÃO: Ativa o roteamento para o handler de IA
  if (type === AI_SUMMARIZE || type === AI_SUGGEST || type === AI_CLASSIFY) {
    const tabId = payload?.tabId || sender.tab?.id;
    if (tabId) {
      console.log(`[BG] Roteando a ação de IA '${type}' para o handler.`);
      handleAiRequest(message, tabId);
    }
    return true; // Indica que a resposta será assíncrona
  }
  
  if (type === MSG_OPEN_OPTIONS_PAGE) {
    chrome.runtime.openOptionsPage();
    return;
  }

  if (type === MSG_CLEAR_ALL_DATA) {
      chrome.storage.local.clear(() => {
        console.log("[BG] Todos os dados foram apagados.");
        Object.keys(tabStates).forEach(id => {
            const tabIdNum = parseInt(id, 10);
            const state = tabStates[tabIdNum];
            if (state) {
                state.state = 'idle';
                state.conversationKey = undefined;
                state.messageCount = 0;
                broadcastStatus(tabIdNum);
            }
        });
        sendResponse({ ok: true });
      });
      return true;
  }

  const tabId = payload?.tabId || sender.tab?.id;
  if (!tabId) return true;

  (async () => {
    const currentState = await getTabState(tabId);
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
        const meta = await processMessageBatch(payload.conversationKey, payload.messages);
        currentState.messageCount = meta.messageCount;
        currentState.latestTimestamp = meta.latestTimestampISO;
        stateChanged = true;
        break;

      case MSG_GET_STATUS:
        sendResponse({ type: MSG_BG_STATUS, payload: currentState });
        break;

      case POPUP_TOGGLE_PAUSE:
        currentState.paused = !currentState.paused;
        currentState.state = currentState.paused ? 'paused' : 'observing';
        stateChanged = true;
        break;

      case POPUP_CLEAR_CONVERSATION:
        if (payload.conversationKey) {
          await clearConversationData(payload.conversationKey);
          currentState.messageCount = 0;
          currentState.latestTimestamp = undefined;
          stateChanged = true;
        }
        break;

      case OPTIONS_UPDATE_SETTINGS:
        await saveAppSettings(payload);
        currentState.settings = await getAppSettings();
        stateChanged = true;
        break;
    }

    if (stateChanged) {
      broadcastStatus(tabId);
    }
  })();

  return true;
});

// Context Menu
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "toggle-pause",
    title: "Pausar/Retomar Captura",
    contexts: ["page"],
    documentUrlPatterns: ["https://erp.iredinternet.com.br/*"]
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "toggle-pause" && tab?.id) {
    const state = await getTabState(tab.id);
    state.paused = !state.paused;
    state.state = state.paused ? 'paused' : 'observing';
    broadcastStatus(tab.id);
  }
});
