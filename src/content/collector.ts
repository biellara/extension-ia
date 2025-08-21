// Instala o MutationObserver no contêiner das mensagens agrupa, alterações (debounce ~350ms) e envia "novas mensagens" em lotes

declare global {
  interface Window {
    __CS_INITED_OVERLAY__?: boolean;
    __CS_INITED_CONVERSATION__?: boolean;
  }
}

export {};

const isTopFrame = window.self === window.top;
const isAttendanceFrame = window.location.href.includes("erp.iredinternet.com.br/attendance#/");

// Regra 1: O widget do overlay só deve ser criado uma vez, no frame principal.
if (isTopFrame && !window.__CS_INITED_OVERLAY__) {
  window.__CS_INITED_OVERLAY__ = true;
  console.log("[CS] Frame principal detectado. Injetando o Overlay.");
  import("./overlay");
}

// Regra 2: A lógica de monitoramento do chat só roda no iframe de atendimento.
if (isAttendanceFrame && !window.__CS_INITED_CONVERSATION__) {
  window.__CS_INITED_CONVERSATION__ = true;
  console.log("[CS] Frame de atendimento detectado. Iniciando o monitor de conversas.");
  import("./conversation").then((m) => {
    chrome.runtime.onMessage.addListener(m.handleBackgroundMessages);
    m.startConversationWatcher();
  });
}
