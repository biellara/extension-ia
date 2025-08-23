declare global {
  interface Window {
    __ECHO_CS_OVERLAY_INJECTED__?: boolean;
    __ECHO_CS_CONVERSATION_INJECTED__?: boolean;
  }
}

export {};

try {
  const isTopFrame = window.self === window.top;
  const isAttendanceFrame = window.location.href.includes("erp.iredinternet.com.br/attendance#/");

  console.log(`[Echo Collector] Script executado. É o frame principal? ${isTopFrame}, É o frame de atendimento? ${isAttendanceFrame}, URL: ${window.location.href}`);

  // Regra 1: O widget do overlay só deve ser criado uma vez, no frame principal.
  if (isTopFrame && !window.__ECHO_CS_OVERLAY_INJECTED__) {
    window.__ECHO_CS_OVERLAY_INJECTED__ = true;
    console.log("[Echo Collector] Este é o frame principal. Importando o overlay...");
    import("./overlay");
  }

  // Regra 2: A lógica de monitoramento do chat só roda no iframe de atendimento.
  if (isAttendanceFrame && !window.__ECHO_CS_CONVERSATION_INJECTED__) {
    window.__ECHO_CS_CONVERSATION_INJECTED__ = true;
    console.log("[Echo Collector] Este é o frame de atendimento. Importando o monitor de conversas...");
    import("./conversation").then((m) => {
      chrome.runtime.onMessage.addListener(m.handleBackgroundMessages);
      m.startConversationWatcher();
    });
  }
} catch (e) {
  console.error('[Echo Collector] Erro fatal durante a inicialização:', e);
}
