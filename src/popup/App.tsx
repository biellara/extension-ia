import React, { useEffect, useState } from "react";
import { MSG_BG_STATUS, MSG_GET_STATUS, POPUP_TOGGLE_PAUSE, CS_SHOW_OVERLAY } from "../common/messaging/channels";

type BgStatus = {
  state: 'idle' | 'observing' | 'paused';
  paused: boolean;
  conversationKey?: string;
};

export default function App() {
  const [status, setStatus] = useState<BgStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tabId, setTabId] = useState<number | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        // 1. Descobre qual é a aba ativa
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const activeTab = tabs[0];

        if (!activeTab?.id) {
          setError("Não foi possível identificar a aba ativa.");
          setStatus({ state: 'idle', paused: false }); // Define um estado padrão
          return;
        }
        setTabId(activeTab.id);

        // 2. Envia a requisição para o background, informando o ID da aba
        const response = await chrome.runtime.sendMessage({
          type: MSG_GET_STATUS,
          payload: { tabId: activeTab.id } // <-- CORREÇÃO: Envia o ID da aba
        });

        // 3. Processa a resposta
        if (response?.type === MSG_BG_STATUS && response.payload) {
          setStatus(response.payload);
        } else {
          // Se não houver resposta ou estado, assume 'idle'
          setStatus({ state: 'idle', paused: false });
        }
      } catch (e) {
        if (e instanceof Error) {
          setError(`Não foi possível conectar à extensão. Recarregue a página. (${e.message})`);
        }
        setStatus({ state: 'idle', paused: false });
      }
    };

    fetchStatus();

    // Listener para atualizações em tempo real (se o popup ficar aberto)
    const listener = (message: any) => {
      if (message.type === MSG_BG_STATUS) {
        setStatus(message.payload);
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => {
      if (chrome?.runtime?.id) {
        chrome.runtime.onMessage.removeListener(listener);
      }
    };
  }, []);

  const handleTogglePause = () => {
    if (tabId) {
      // Envia o comando de pausar/retomar para o background, especificando a aba
      chrome.runtime.sendMessage({ type: POPUP_TOGGLE_PAUSE, payload: { tabId } });
    }
  };

  const handleShowOverlay = (e: React.MouseEvent) => {
    e.preventDefault();
    if (tabId) {
      // Envia a mensagem para o content script da aba ativa
      chrome.tabs.sendMessage(tabId, { type: CS_SHOW_OVERLAY });
      window.close(); // Fecha o popup
    }
  };

  const renderContent = () => {
    if (error) {
      return <p style={{ color: 'red' }}>{error}</p>;
    }
    if (!status) {
      return <p>Carregando...</p>;
    }
    return (
      <div>
        <p style={{margin: '4px 0'}}><b>Estado:</b> {status.state}</p>
        <p style={{margin: '4px 0'}}><b>Conversa:</b> {status.conversationKey?.split('#')[1] || 'Nenhuma'}</p>
        <button onClick={handleTogglePause} style={{ width: '100%', padding: '8px', margin: '10px 0' }}>
          {status.paused ? 'Retomar Captura' : 'Pausar Captura'}
        </button>
        <a href="#" onClick={handleShowOverlay} style={{ fontSize: 13, display: 'block', textAlign: 'center' }}>
          Abrir/Mostrar overlay na página
        </a>
      </div>
    );
  };

  return (
    <div style={{ padding: 16, minWidth: 250, fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 16, margin: "0 0 10px 0" }}>Echo Status</h1>
      {renderContent()}
    </div>
  );
}
