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
  CS_INSERT_SUGGESTION,
  AI_RESULT,
  OVERLAY_FINISH_CONVERSATION,
  OVERLAY_REFRESH_CONVERSATION
} from "../common/messaging/channels";
import { processMessageBatch, clearConversationData, getConversationMeta, saveConversationMeta } from "../common/storage/storage";
import { getAppSettings, saveAppSettings, AppSettings } from "../common/storage/settings";
import { handleAiRequest } from "../background/ai/aiHandlers";
import { debounce } from "../common/utils/debounce";
import { ConversationMeta } from "../common/types/models";

type ClassificationData = {
  reason?: string;
  urgency?: string;
  sentiment?: string;
};

type AppState = {
  state: 'idle' | 'observing' | 'paused' | 'finished';
  paused: boolean;
  conversationKey?: string;
  messageCount?: number;
  latestTimestamp?: string;
  settings: AppSettings;
  classification?: ClassificationData;
  summary?: ConversationMeta['summary'];
};

const tabStates: { [tabId: number]: AppState } = {};
const activePorts: { [tabId: number]: chrome.runtime.Port } = {};

const classifyConversation = async (tabId: number, conversationKey: string) => {
  const resultPayload = await handleAiRequest({
    type: 'AI_CLASSIFY',
    payload: { conversationKey }
  }, tabId);

  if (resultPayload?.kind === 'classification') {
    const currentState = await getTabState(tabId);
    currentState.classification = resultPayload.data as ClassificationData;
    broadcastStatus(tabId);
  }
};

const debouncedClassify = debounce(classifyConversation, 3000);

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
        delete activePorts[tabId];
      }
    } catch (_e) {
      delete activePorts[tabId];
    }
  }
}

chrome.runtime.onConnect.addListener(port => {
  if (port.name === "overlay" && port.sender?.tab?.id) {
    const tabId = port.sender.tab.id;
    activePorts[tabId] = port;
    port.onDisconnect.addListener(() => {
      delete activePorts[tabId];
    });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { type, payload } = message;

  if (type === CS_INSERT_SUGGESTION) {
    const tabId = sender.tab?.id;
    if (tabId) {
      chrome.tabs.sendMessage(tabId, message, (response) => {
        if (chrome.runtime.lastError) {
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          sendResponse(response);
        }
      });
    } else {
      sendResponse({ success: false, error: 'ID da aba do remetente não encontrado.' });
    }
    return true;
  }
  
  if (type === AI_SUMMARIZE || type === AI_SUGGEST) {
    const tabId = payload?.tabId || sender.tab?.id;
    if (tabId) {
        (async () => {
            const resultPayload = await handleAiRequest(message, tabId);
            if (resultPayload) {
                chrome.tabs.sendMessage(tabId, { type: AI_RESULT, payload: resultPayload });
            }
        })();
    }
    return true;
  }
  
  if (type === MSG_OPEN_OPTIONS_PAGE) {
    chrome.runtime.openOptionsPage();
    return;
  }

  if (type === MSG_CLEAR_ALL_DATA) {
      chrome.storage.local.clear(() => {
        Object.keys(tabStates).forEach(id => {
            const tabIdNum = parseInt(id, 10);
            const state = tabStates[tabIdNum];
            if (state) {
                state.state = 'idle';
                state.conversationKey = undefined;
                state.messageCount = 0;
                state.classification = undefined;
                state.summary = undefined;
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
        currentState.classification = undefined;
        currentState.summary = undefined;
        if (chrome.runtime.id) chrome.tabs.sendMessage(tabId, { type: MSG_BG_REQUEST_SNAPSHOT, payload });
        stateChanged = true;
        break;

      case MSG_CS_SNAPSHOT_RESULT:
        if (currentState.paused) break;
        const metaSnapshot = await processMessageBatch(payload.conversationKey, payload.messages);
        currentState.messageCount = metaSnapshot.messageCount;
        currentState.latestTimestamp = metaSnapshot.latestTimestampISO;
        currentState.summary = metaSnapshot.summary;
        currentState.state = metaSnapshot.status === 'finished' ? 'finished' : 'observing';
        stateChanged = true;
        if (metaSnapshot.messageCount > 0 && metaSnapshot.status === 'active') {
            classifyConversation(tabId, payload.conversationKey);
        }
        break;

      case MSG_CS_NEW_MESSAGES:
        if (currentState.paused || currentState.state === 'finished') break;
        const metaNew = await processMessageBatch(payload.conversationKey, payload.messages);
        currentState.messageCount = metaNew.messageCount;
        currentState.latestTimestamp = metaNew.latestTimestampISO;
        stateChanged = true;

        const lastMessage = payload.messages[payload.messages.length - 1];
        if (lastMessage?.authorType === 'contact') {
          debouncedClassify(tabId, payload.conversationKey);
        }
        break;

      case OVERLAY_FINISH_CONVERSATION:
        if (currentState.conversationKey) {
            const conversationKey = currentState.conversationKey;
            const resultPayload = await handleAiRequest({ type: 'AI_SUMMARIZE', payload: { conversationKey }}, tabId);
            
            if (resultPayload?.kind === 'summary') {
                const summaryData = {
                    generatedAt: new Date().toISOString(),
                    content: resultPayload.data,
                };
                const meta = await getConversationMeta(conversationKey);
                if (meta) {
                    meta.summary = summaryData;
                    meta.status = 'finished';
                    await saveConversationMeta(conversationKey, meta);

                    currentState.summary = summaryData;
                    currentState.state = 'finished';
                    stateChanged = true;

                    await clearConversationData(conversationKey, { preserveMeta: true });
                }
            }
        }
        break;

      case OVERLAY_REFRESH_CONVERSATION:
        if (currentState.conversationKey) {
            const conversationKey = currentState.conversationKey;
            await clearConversationData(conversationKey); // Limpa tudo, incluindo meta

            currentState.state = 'observing';
            currentState.messageCount = 0;
            currentState.latestTimestamp = undefined;
            currentState.classification = undefined;
            currentState.summary = undefined;
            currentState.paused = false;

            if (chrome.runtime.id) {
                // Envia uma flag para o content script saber que é uma atualização
                chrome.tabs.sendMessage(tabId, { type: MSG_BG_REQUEST_SNAPSHOT, payload: { conversationKey, isRefresh: true } });
            }
            stateChanged = true;
        }
        break;

      case MSG_GET_STATUS:
        sendResponse({ type: MSG_BG_STATUS, payload: currentState });
        break;

      case POPUP_TOGGLE_PAUSE:
        currentState.paused = !currentState.paused;
        currentState.state = currentState.paused ? 'paused' : (currentState.state === 'finished' ? 'finished' : 'observing');
        stateChanged = true;
        break;

      case POPUP_CLEAR_CONVERSATION:
        if (payload.conversationKey) {
          await clearConversationData(payload.conversationKey);
          currentState.messageCount = 0;
          currentState.latestTimestamp = undefined;
          currentState.classification = undefined;
          currentState.summary = undefined;
          currentState.state = 'observing';
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
    state.state = state.paused ? 'paused' : (state.state === 'finished' ? 'finished' : 'observing');
    broadcastStatus(tab.id);
  }
});
