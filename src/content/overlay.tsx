import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { getOverlayUIState, saveOverlayUIState } from '../common/storage/ui';
import { safeSendMessage } from '../common/messaging/safeSend';
import {
  MSG_BG_STATUS,
  MSG_GET_STATUS,
  POPUP_TOGGLE_PAUSE,
  POPUP_CLEAR_CONVERSATION,
  OPTIONS_UPDATE_SETTINGS,
  CS_SHOW_OVERLAY
} from '../common/messaging/channels';
import './overlay.css';

type StatusPayload = {
  state?: 'idle' | 'observing' | 'paused';
  paused?: boolean;
  conversationKey?: string;
  messageCount?: number;
  latestTimestamp?: string;
  settings?: {
    anonymize?: boolean;
  };
};

const App = () => {
  const [status, setStatus] = useState<StatusPayload>({ state: 'idle' });
  const [pos, setPos] = useState({ x: 20, y: 20 });
  const [minimized, setMinimized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const dragStartPos = useRef({ x: 0, y: 0 });

  // Efeito para carregar estado inicial e conectar ao background
  useEffect(() => {
    if (!chrome?.runtime?.id) return;

    getOverlayUIState().then(state => {
      if (chrome?.runtime?.id) { // Verifica novamente após a promise resolver
        setPos(state.pos);
        setMinimized(state.minimized);
      }
    });

    const port = chrome.runtime.connect({ name: 'overlay' });
    port.onMessage.addListener(message => {
      if (message.type === MSG_BG_STATUS) {
        setStatus(message.payload);
      }
    });
    
    // Lida com a desconexão da porta (ocorre na invalidação do contexto)
    port.onDisconnect.addListener(() => {
        console.log("Porta do overlay desconectada.");
    });

    safeSendMessage({ type: MSG_GET_STATUS });
    
    // Listener para o popup pedir para mostrar o overlay
    const messageListener = (message: any) => {
      if (message.type === CS_SHOW_OVERLAY) {
        setMinimized(false);
        saveOverlayUIState({ minimized: false });
      }
    };
    chrome.runtime.onMessage.addListener(messageListener);

    return () => {
      if (chrome?.runtime?.id) {
        port.disconnect();
        chrome.runtime.onMessage.removeListener(messageListener);
      }
    };
  }, []);

  // Handlers para drag-and-drop
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).tagName === 'BUTTON' || (e.target as HTMLElement).tagName === 'A' || (e.target as HTMLElement).tagName === 'INPUT') {
      return;
    }
    setIsDragging(true);
    dragStartPos.current = {
      x: e.clientX - pos.x,
      y: e.clientY - pos.y,
    };
    document.body.style.userSelect = 'none';
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !overlayRef.current) return;
    let newX = e.clientX - dragStartPos.current.x;
    let newY = e.clientY - dragStartPos.current.y;

    const { innerWidth, innerHeight } = window;
    const { offsetWidth, offsetHeight } = overlayRef.current;
    newX = Math.max(0, Math.min(newX, innerWidth - offsetWidth));
    newY = Math.max(0, Math.min(newY, innerHeight - offsetHeight));

    setPos({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    document.body.style.userSelect = '';
    saveOverlayUIState({ pos });
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, pos]);

  // Ações dos botões
  const togglePause = () => safeSendMessage({ type: POPUP_TOGGLE_PAUSE });
  const clearConversation = () => {
    if (window.confirm('Limpar histórico desta conversa?')) {
      safeSendMessage({ type: POPUP_CLEAR_CONVERSATION, payload: { conversationKey: status.conversationKey } });
    }
  };
  const toggleAnonymize = () => {
    const anonymize = !status.settings?.anonymize;
    safeSendMessage({ type: OPTIONS_UPDATE_SETTINGS, payload: { anonymize } });
  };
  const openOptions = (e: React.MouseEvent) => {
    e.preventDefault();
    if (chrome?.runtime?.id) {
      chrome.runtime.openOptionsPage();
    }
  };
  const toggleMinimize = () => {
    const newMinimized = !minimized;
    setMinimized(newMinimized);
    saveOverlayUIState({ minimized: newMinimized });
  };

  const latestTime = status.latestTimestamp ? new Date(status.latestTimestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '-';

  if (minimized) {
    return (
      <div
        ref={overlayRef}
        className={`echo-overlay minimized`}
        style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
        onClick={toggleMinimize}
      >
        <div className={`echo-status-indicator ${status.state || 'idle'}`} />
      </div>
    );
  }

  return (
    <div ref={overlayRef} className="echo-overlay" style={{ left: `${pos.x}px`, top: `${pos.y}px` }}>
      <div className="echo-overlay-header" onMouseDown={handleMouseDown}>
        <div className="echo-overlay-title-wrapper">
          <div className={`echo-status-indicator ${status.state || 'idle'}`} />
          <span>Echo</span>
        </div>
        <button onClick={toggleMinimize} className="echo-overlay-button" title="Minimizar">-</button>
      </div>
      <div className="echo-overlay-body">
        <div className="echo-overlay-status-line">
          <b>Status:</b> {status.state || 'idle'} ({status.messageCount || 0} msgs, últ: {latestTime})
        </div>
        <div className="echo-overlay-conversation-line">
          <b>Conversa:</b> {status.conversationKey?.split('#')[1]?.substring(0, 12) || 'N/A'}
        </div>
        <div className="echo-overlay-actions">
          <button onClick={togglePause} className="echo-overlay-button">
            {status.paused ? 'Retomar' : 'Pausar'}
          </button>
          <button onClick={clearConversation} className="echo-overlay-button">Limpar</button>
          <label className="echo-overlay-switch">
            <input type="checkbox" checked={!!status.settings?.anonymize} onChange={toggleAnonymize} />
            Anon
          </label>
        </div>
      </div>
      <div className="echo-overlay-footer">
        <a href="#" onClick={openOptions}>⚙ Configurações</a>
      </div>
    </div>
  );
};

// Injeta a raiz do overlay e monta o componente
if (!document.getElementById('echo-overlay-root')) {
    const rootEl = document.createElement('div');
    rootEl.id = 'echo-overlay-root';
    document.body.appendChild(rootEl);
    const root = createRoot(rootEl);
    root.render(<App />);
}

export default App;
