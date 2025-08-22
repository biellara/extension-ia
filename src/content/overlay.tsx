import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { getOverlayUIState, saveOverlayUIState } from '../common/storage/ui';
import { safeSendMessage } from '../common/messaging/safeSend';
import {
  MSG_BG_STATUS,
  MSG_GET_STATUS,
  POPUP_TOGGLE_PAUSE,
  POPUP_CLEAR_CONVERSATION,
  OPTIONS_UPDATE_SETTINGS,
  CS_SHOW_OVERLAY,
  MSG_OPEN_OPTIONS_PAGE
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
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [minimized, setMinimized] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  // Efeito para carregar estado inicial e conectar ao background
  useEffect(() => {
    if (!chrome?.runtime?.id) return;

    getOverlayUIState().then(state => {
      if (chrome?.runtime?.id) {
        setMinimized(state.minimized);
        // Se a posição nunca foi movida, calcula o canto inferior direito
        if (!state.hasBeenMoved) {
          const margin = 20;
          const widgetSize = 50; // Tamanho do widget minimizado
          const initialX = window.innerWidth - widgetSize - margin;
          const initialY = window.innerHeight - widgetSize - margin;
          setPos({ x: initialX, y: initialY });
        } else {
          setPos(state.pos);
        }
      }
    });

    const port = chrome.runtime.connect({ name: 'overlay' });
    port.onMessage.addListener(message => {
      if (message.type === MSG_BG_STATUS) setStatus(message.payload);
    });
    port.onDisconnect.addListener(() => console.log("Porta do overlay desconectada."));
    safeSendMessage({ type: MSG_GET_STATUS });
    
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

  // --- LÓGICA DE DRAG & DROP OTIMIZADA ---

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button, a, input, label')) return;
    
    setIsDragging(true);
    const overlay = overlayRef.current;
    if (overlay) {
      dragOffset.current = {
        x: e.clientX - overlay.offsetLeft,
        y: e.clientY - overlay.offsetTop,
      };
      overlay.classList.add('dragging');
      document.body.style.userSelect = 'none';
    }
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !overlayRef.current) return;
    
    let newX = e.clientX - dragOffset.current.x;
    let newY = e.clientY - dragOffset.current.y;

    const { innerWidth, innerHeight } = window;
    const { offsetWidth, offsetHeight } = overlayRef.current;
    newX = Math.max(0, Math.min(newX, innerWidth - offsetWidth));
    newY = Math.max(0, Math.min(newY, innerHeight - offsetHeight));

    // ATUALIZAÇÃO DIRETA NO DOM PARA FLUIDEZ
    overlayRef.current.style.left = `${newX}px`;
    overlayRef.current.style.top = `${newY}px`;
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    if (!isDragging) return;
    
    setIsDragging(false);
    const overlay = overlayRef.current;
    if (overlay) {
      overlay.classList.remove('dragging');
      document.body.style.userSelect = '';
      
      const finalPos = { x: overlay.offsetLeft, y: overlay.offsetTop };
      setPos(finalPos); // Sincroniza o estado do React
      saveOverlayUIState({ pos: finalPos, hasBeenMoved: true }); // Salva a posição final
    }
  }, [isDragging]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp, { once: true });
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // --- Ações dos botões ---
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
    safeSendMessage({ type: MSG_OPEN_OPTIONS_PAGE });
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
        className="echo-overlay minimized"
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
