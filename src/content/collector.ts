// Instala o MutationObserver no contêiner das mensagens agrupa, alterações (debounce ~350ms) e envia "novas mensagens" em lotes

import { MSG_CS_CONVERSATION_CHANGE } from "../common/messaging/channels";
import { safeSendMessage } from "../common/messaging/safeSend";

declare global { interface Window {__CS_INITED__?: boolean; }}

if (window.__CS_INITED__) {
    } else {
  window.__CS_INITED__ = true;
  console.log("[CS] init");
  import("./conversation").then(m => m.startConversationWatcher());
}

import("./conversation").then(m => {
    chrome.runtime.onMessage.addListener(m.handleBackgroundMessages);

    m.startConversationWatcher();
});
