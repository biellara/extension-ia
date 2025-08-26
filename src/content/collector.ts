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


  if (isTopFrame && !window.__ECHO_CS_OVERLAY_INJECTED__) {
    window.__ECHO_CS_OVERLAY_INJECTED__ = true;
    import("./overlay");
  }

  if (isAttendanceFrame && !window.__ECHO_CS_CONVERSATION_INJECTED__) {
    window.__ECHO_CS_CONVERSATION_INJECTED__ = true;
    import("./conversation").then((m) => {
      chrome.runtime.onMessage.addListener(m.handleBackgroundMessages);
      m.startConversationWatcher();
    });
  }
} catch (e) {
  console.error('[Echo Collector] Erro fatal durante a inicialização:', e);
}
