// Instala o MutationObserver no contêiner das mensagens agrupa, alterações (debounce ~350ms) e envia "novas mensagens" em lotes

declare global {
  interface Window {
    __CS_INITED__?: boolean;
  }
}

export {};

if (!window.__CS_INITED__) {
  window.__CS_INITED__ = true;
  console.log("[CS] init");

  import("./conversation").then((m) => {
    chrome.runtime.onMessage.addListener(m.handleBackgroundMessages);

    m.startConversationWatcher();
  });
}