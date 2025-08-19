// Instala o MutationObserver no contêiner das mensagens agrupa, alterações (debounce ~350ms) e envia "novas mensagens" em lotes

import { MSG_CS_CONVERSATION_CHANGE } from "../common/messaging/channels";
import { safeSendMessage } from "../common/messaging/safeSend";

declare global { interface Window {__CS_INITED__?: boolean; }}
    if (window.__CS_INITED__) {
    } else {
  window.__CS_INITED__ = true;}


function makeFakeConversationKey() {
  const title = (document.title || "ERP").trim();
  return `TITLE#${title}`;
}
function notifyConversationChange() {
  const conversationKey = makeFakeConversationKey();
  chrome.runtime.sendMessage({
    type: MSG_CS_CONVERSATION_CHANGE,
    payload: { conversationKey },
  });

}

notifyConversationChange();

const titleObserver = new MutationObserver(() => {
  notifyConversationChange();
});

const titleEl = document.querySelector("title");
if (titleEl) {
  titleObserver.observe(titleEl, { childList: true });
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    notifyConversationChange();
  }
});
