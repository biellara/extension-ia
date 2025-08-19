import { MSG_CS_CONVERSATION_CHANGE, MSG_CS_SNAPSHOT_RESULT, MSG_BG_REQUEST_SNAPSHOT, MSG_CS_NEW_MESSAGES } from "../common/messaging/channels";
import { processMessageBatch } from "../common/storage/storage";
import { ConversationMeta } from "../common/types/models";

console.log("[BG] Service Worker iniciado.");

let activeConversation: Partial<ConversationMeta> & { tabId?: number } = {};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { type, payload } = message;
  const tabId = sender.tab?.id;

  if (type === MSG_CS_CONVERSATION_CHANGE) {
    console.log("[BG] Mudança de conversa detetada:", payload.conversationKey);
    activeConversation = {
      tabId: tabId,
      conversationKey: payload.conversationKey,
    };
    
    if (tabId && payload.conversationKey) {
      chrome.tabs.sendMessage(tabId, {
        type: MSG_BG_REQUEST_SNAPSHOT,
        payload: { conversationKey: payload.conversationKey },
      });
    }
    sendResponse({ ok: true });
    return true;
  }

  // Unificamos a lógica para ambos os tipos de mensagem
  if (type === MSG_CS_SNAPSHOT_RESULT || type === MSG_CS_NEW_MESSAGES) {
    if (type === MSG_CS_SNAPSHOT_RESULT) console.log(`[BG] Recebido snapshot com ${payload.messages.length} mensagens.`);
    if (type === MSG_CS_NEW_MESSAGES) console.log(`[BG] Recebidas ${payload.messages.length} novas mensagens.`);

    processMessageBatch(payload.conversationKey, payload.messages)
      .then(updatedMeta => {
        // Atualiza o estado da conversa ativa com os metadados mais recentes
        activeConversation = { ...activeConversation, ...updatedMeta };
        sendResponse({ ok: true });
      })
      .catch(error => {
        console.error("[BG] Erro ao processar lote de mensagens:", error);
        sendResponse({ ok: false });
      });
      
    return true; // Indica que a resposta será assíncrona
  }
});

chrome.runtime.onConnect.addListener(port => {
  if (port.name === "popup") {
    port.onMessage.addListener(msg => {
      if (msg.type === "POPUP_GET_STATE") {
        port.postMessage({ state: activeConversation });
      }
    });
  }
});
