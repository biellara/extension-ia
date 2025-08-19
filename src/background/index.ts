// Aqui registra ouvintes de mensagens e coordena fluxos: 
// inicia/para observação na aba, pede snapshots, recebe lots do content, aplica dedupe/retention, atualiza status para o popup
import { MSG_CS_CONVERSATION_CHANGE, MSG_CS_SNAPSHOT_RESULT, MSG_BG_REQUEST_SNAPSHOT, MSG_CS_NEW_MESSAGES } from "../common/messaging/channels";

console.log("[BG] Service Worker iniciado.");

let activeConversation = {
  tabId: 0,
  conversationKey: "",
  messageCount: 0,
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { type, payload } = message;

  if (type === MSG_CS_CONVERSATION_CHANGE) {
    console.log("[BG] Mudança de conversa detetada:", payload.conversationKey);
    activeConversation = {
      tabId: sender.tab?.id || 0,
      conversationKey: payload.conversationKey,
      messageCount: 0,
    };
    
    if (activeConversation.tabId && activeConversation.conversationKey) {
      console.log("[BG] Pedindo snapshot para o CS:", activeConversation.conversationKey);
      chrome.tabs.sendMessage(activeConversation.tabId, {
        type: MSG_BG_REQUEST_SNAPSHOT,
        payload: { conversationKey: activeConversation.conversationKey },
      });
    }
    sendResponse({ ok: true });
    return true;
  }

  if (type === MSG_CS_SNAPSHOT_RESULT) {
    console.log(`[BG] Recebido snapshot com ${payload.messages.length} mensagens para`, payload.conversationKey);
    const storageKey = `conv:${payload.conversationKey}:chunk:0001`;
    chrome.storage.local.set({ [storageKey]: payload.messages }, () => {
      console.log("[BG] Snapshot salvo no storage com a chave:", storageKey);
    });
    activeConversation.messageCount = payload.messages.length;
    sendResponse({ ok: true });
    return true;
  }

  if (type === MSG_CS_NEW_MESSAGES) {
    console.log(`[BG] Recebidas ${payload.messages.length} novas mensagens para`, payload.conversationKey);
    const storageKey = `conv:${payload.conversationKey}:chunk:0001`;

    // Busca o chunk existente, adiciona as novas mensagens e salva de volta
    chrome.storage.local.get(storageKey, (result) => {
      const existingMessages = result[storageKey] || [];
      const updatedMessages = [...existingMessages, ...payload.messages];
      
      chrome.storage.local.set({ [storageKey]: updatedMessages }, () => {
        console.log(`[BG] Armazenamento atualizado. Total de mensagens: ${updatedMessages.length}`);
      });

      activeConversation.messageCount = updatedMessages.length;
    });

    sendResponse({ ok: true });
    return true;
  }
});

// ... (o resto do código, como o onConnect, permanece o mesmo) ...
chrome.runtime.onConnect.addListener(port => {
  if (port.name === "popup") {
    port.onMessage.addListener(msg => {
      if (msg.type === "POPUP_GET_STATE") {
        port.postMessage({ state: activeConversation });
      }
    });
  }
});
