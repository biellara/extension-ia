// Tela simples com:
// status (conversa ativa, mensagens, retenção, anonimização), botões: Pausar/Retomar e limpar conversa

import React, { useEffect, useState } from "react";
import { MSG_BG_STATUS, MSG_GET_STATUS, POPUP_TOGGLE_PAUSE, CS_SHOW_OVERLAY } from "../common/messaging/channels";
import { safeSendMessage } from "../common/messaging/safeSend";

type BgStatus = {
  state: 'idle' | 'observing' | 'paused';
  paused: boolean;
  conversationKey?: string;
};

export default function App() {
  const [status, setStatus] = useState<BgStatus | null>(null);
  const [tabId, setTabId] = useState<number | null>(null);

  useEffect(() => {
    // Descobre a aba ativa para enviar mensagens direcionadas
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        setTabId(tabs[0].id);
        // Pede o status inicial para a aba ativa
        chrome.runtime.sendMessage({ type: MSG_GET_STATUS }, (response) => {
          if (response?.type === MSG_BG_STATUS) {
            setStatus(response.payload);
          }
        });
      }
    });

    // Ouve por atualizações de status do background
    const listener = (message: unknown) => {
      if (
        typeof message === "object" &&
        message !== null &&
        "type" in message &&
        (message as { type: string; payload: BgStatus }).type === MSG_BG_STATUS
      ) {
        setStatus((message as { type: string; payload: BgStatus }).payload);
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  const handleTogglePause = () => {
    if (tabId) {
      safeSendMessage({ type: POPUP_TOGGLE_PAUSE });
    }
  };

  const handleShowOverlay = (e: React.MouseEvent) => {
    e.preventDefault();
    if (tabId) {
      // Envia mensagem para o content script da aba ativa
      chrome.tabs.sendMessage(tabId, { type: CS_SHOW_OVERLAY });
      window.close(); // Fecha o popup
    }
  };

  return (
    <div style={{ padding: 16, minWidth: 250, fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 16, margin: "0 0 10px 0" }}>Echo Status</h1>
      {status ? (
        <div>
          <p><b>Estado:</b> {status.state}</p>
          <p><b>Conversa:</b> {status.conversationKey?.split('#')[1] || 'Nenhuma'}</p>
          <button onClick={handleTogglePause} style={{ width: '100%', padding: '8px', marginBottom: '10px' }}>
            {status.paused ? 'Retomar Captura' : 'Pausar Captura'}
          </button>
          <a href="#" onClick={handleShowOverlay} style={{ fontSize: 13 }}>
            Abrir overlay na página
          </a>
        </div>
      ) : (
        <p>Carregando...</p>
      )}
    </div>
  );
}
