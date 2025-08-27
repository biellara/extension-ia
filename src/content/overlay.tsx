import React, { useState, useEffect, useRef, useCallback } from "react";
import { createRoot } from "react-dom/client";
import { getOverlayUIState, saveOverlayUIState } from "../common/storage/ui";
import { safeSendMessage } from "../common/messaging/safeSend";
import {
  MSG_BG_STATUS,
  MSG_GET_STATUS,
  POPUP_TOGGLE_PAUSE,
  POPUP_CLEAR_CONVERSATION,
  OPTIONS_UPDATE_SETTINGS,
  CS_SHOW_OVERLAY,
  MSG_OPEN_OPTIONS_PAGE,
  AI_RESULT,
  AI_ERROR,
  CS_INSERT_SUGGESTION,
} from "../common/messaging/channels";
import { AiResult } from "../common/ai/types";
import "./overlay.css";

const MinimizedIcon = ({ statusState }: { statusState: string }) => (
  <div className="echo-minimized-icon-wrapper">
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="echo-minimized-icon">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M7.5 11.5C8.5 10.5 10.5 10.5 11.5 11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M10.5 8.5C12.5 6.5 15.5 6.5 17.5 8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
    <div className={`echo-status-indicator ${statusState}`} />
  </div>
);

type SummaryData = {
  topics?: string[];
  next_steps?: string[];
};

const SummaryResult = ({ data }: { data: unknown }) => {
  const summaryData = data as SummaryData;
  return (
    <div className="ai-result-section">
      <h3>Resumo da Conversa</h3>
      {summaryData.topics && ( <><h4>Tópicos Principais:</h4><ul>{summaryData.topics.map((item: string, i: number) => <li key={i}>{item}</li>)}</ul></>)}
      {summaryData.next_steps && ( <><h4>Próximos Passos:</h4><ul>{summaryData.next_steps.map((item: string, i: number) => <li key={i}>{item}</li>)}</ul></>)}
    </div>
  );
};

type SuggestionData = {
  suggestions?: { tone: string; text: string }[];
};

const SuggestionResult = ({ data, conversationKey }: { data: unknown; conversationKey?: string; }) => {
  const suggestionData = data as SuggestionData;
  const [feedback, setFeedback] = useState<{ [index: number]: string }>({});

  const handleAction = (text: string, index: number, action: "copy" | "insert") => {
    if (action === "copy") {
      navigator.clipboard.writeText(text);
      setFeedback((prev) => ({ ...prev, [index]: "✔ Copiado" }));
    } else if (action === "insert" && conversationKey) {
      safeSendMessage({ type: CS_INSERT_SUGGESTION, payload: { text }})
      .then((response: any) => {
        if (response?.success) {
          setFeedback((prev) => ({ ...prev, [index]: "✔ Inserido" }));
        } else {
          setFeedback((prev) => ({ ...prev, [index]: "Falhou!" }));
        }
      });
    }
    setTimeout(() => {
      setFeedback((prev) => ({ ...prev, [index]: "" }));
    }, 2000);
  };

  return (
    <div className="ai-result-section">
      <h3>Sugestões de Resposta</h3>
      {suggestionData.suggestions?.map((sug: { tone: string; text: string }, i: number) => (
          <div key={i} className="suggestion-card">
            <div className="suggestion-header">
              <strong>Tom: {sug.tone}</strong>
              <div className="suggestion-buttons">
                <button onClick={() => handleAction(sug.text, i, "insert")} className="insert-button" disabled={!!feedback[i]}>
                  {feedback[i] === "✔ Inserido" ? "✔ Inserido" : "Inserir"}
                </button>
                <button onClick={() => handleAction(sug.text, i, "copy")} className="copy-button" disabled={!!feedback[i]}>
                  {feedback[i] === "✔ Copiado" ? "✔ Copiado" : "Copiar"}
                </button>
              </div>
            </div>
            <p>{sug.text}</p>
          </div>
        )
      )}
    </div>
  );
};

type ClassificationData = {
  reason?: string;
  urgency?: string;
  sentiment?: string;
};

const RealtimeClassification = ({ classification }: { classification?: ClassificationData }) => {
  if (!classification || !classification.reason) {
    return <div className="realtime-classification-placeholder">Aguardando classificação...</div>;
  }

  const { reason, urgency, sentiment } = classification;

  const sentimentMap: Record<string, { icon: string; className: string }> = {
    'Positivo': { icon: '😊', className: 'positive' },
    'Neutro': { icon: '😐', className: 'neutral' },
    'Negativo': { icon: '😡', className: 'negative' },
  };

  const sentimentInfo = sentiment && sentimentMap[sentiment]
    ? sentimentMap[sentiment]
    : { icon: '🤔', className: 'unknown' };

  return (
    <div className={`realtime-classification-bar sentiment-${sentimentInfo.className}`}>
      <div className="classification-item">
        <strong>{sentimentInfo.icon} Sentimento:</strong>
        <span>{sentiment}</span>
      </div>
      <div className="classification-item">
        <strong>{urgency === 'Alta' ? '⚠️' : '⚡'} Urgência:</strong>
        <span>{urgency}</span>
      </div>
      <div className="classification-item">
        <strong>📝 Motivo:</strong>
        <span className="classification-reason" title={reason}>{reason}</span>
      </div>
    </div>
  );
};

type StatusPayload = {
  state?: "idle" | "observing" | "paused";
  paused?: boolean;
  conversationKey?: string;
  messageCount?: number;
  latestTimestamp?: string;
  settings?: { anonymize?: boolean };
  classification?: ClassificationData;
};

const App = () => {
  const [status, setStatus] = useState<StatusPayload>({ state: "idle" });
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [minimized, setMinimized] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AiResult["payload"] | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const [size, setSize] = useState({ width: 320, height: 480 });
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartRef = useRef({ x: 0, y: 0, width: 0, height: 0 });

  const dragStartPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const savedTheme = localStorage.getItem("echo-theme");
    if (savedTheme === "dark") setIsDarkMode(true);

    if (!chrome?.runtime?.id) return;

    getOverlayUIState().then((state) => {
      if (chrome?.runtime?.id) {
        const isMinimized = state.minimized ?? true;
        setMinimized(isMinimized);

        if (state.size) setSize(state.size);
        if (!state.hasBeenMoved) {
          const margin = 20;
          const initialX = window.innerWidth - (isMinimized ? 48 : state.size?.width || 320) - margin;
          const initialY = window.innerHeight - (isMinimized ? 48 : state.size?.height || 480) - margin;
          setPos({ x: initialX, y: initialY });
        } else {
          setPos(state.pos ?? { x: 0, y: 0 });
        }
      }
    });
  }, []);

  const toggleTheme = () => {
    const newIsDarkMode = !isDarkMode;
    setIsDarkMode(newIsDarkMode);
    localStorage.setItem("echo-theme", newIsDarkMode ? "dark" : "light");
  };

  const handleResizeMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsResizing(true);
      const overlay = overlayRef.current;
      if (overlay) {
        resizeStartRef.current = {
          x: e.clientX,
          y: e.clientY,
          width: overlay.offsetWidth,
          height: overlay.offsetHeight,
        };
        document.body.style.cursor = "nwse-resize";
        document.body.style.userSelect = "none";
      }
    },[]);

  const handleResizeMouseMove = useCallback((e: MouseEvent) => {
      if (!isResizing || !overlayRef.current) return;
      const dx = e.clientX - resizeStartRef.current.x;
      const dy = e.clientY - resizeStartRef.current.y;

      const newWidth = Math.max(280, resizeStartRef.current.width + dx);
      const newHeight = Math.max(220, resizeStartRef.current.height + dy);

      overlayRef.current.style.width = `${newWidth}px`;
      overlayRef.current.style.height = `${newHeight}px`;
    },[isResizing]);

  const handleResizeMouseUp = useCallback(() => {
    if (!isResizing) return;
    setIsResizing(false);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    const overlay = overlayRef.current;
    if (overlay) {
      const finalSize = { width: overlay.offsetWidth, height: overlay.offsetHeight };
      setSize(finalSize);
      saveOverlayUIState({ size: finalSize });
    }
  }, [isResizing]);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener("mousemove", handleResizeMouseMove);
      window.addEventListener("mouseup", handleResizeMouseUp, { once: true });
    }
    return () => {
      window.removeEventListener("mousemove", handleResizeMouseMove);
      window.removeEventListener("mouseup", handleResizeMouseUp);
    };
  }, [isResizing, handleResizeMouseMove, handleResizeMouseUp]);

  useEffect(() => {
    if (!chrome?.runtime?.id) return;

    const port = chrome.runtime.connect({ name: "overlay" });
    port.onMessage.addListener((message) => {
      if (message.type === MSG_BG_STATUS) {
        setStatus(message.payload);
      }
    });
    safeSendMessage({ type: MSG_GET_STATUS });

    const messageListener = (message: unknown) => {
      if (typeof message === "object" && message !== null && "type" in message) {
        const msg = message as { type: string; payload?: unknown };
        if (msg.type === CS_SHOW_OVERLAY) {
          setMinimized(false);
          saveOverlayUIState({ minimized: false });
        } else if (msg.type === AI_RESULT) {
          const payload = msg.payload as { conversationKey?: string, kind?: string };
          if (payload && payload.conversationKey === status.conversationKey) {
            if (payload.kind !== 'classification') {
                setAiResult(msg.payload as AiResult["payload"]);
            }
            setAiError(null);
            setIsAiLoading(false);
          }
        } else if (msg.type === AI_ERROR) {
          const payload = msg.payload as { conversationKey?: string; reason?: string; };
          if (payload && payload.conversationKey === status.conversationKey) {
            setAiError(payload.reason ?? "");
            setAiResult(null);
            setIsAiLoading(false);
          }
        }
      }
    };
    chrome.runtime.onMessage.addListener(messageListener);

    return () => {
      if (chrome?.runtime?.id) {
        port.disconnect();
        chrome.runtime.onMessage.removeListener(messageListener);
      }
    };
  }, [status.conversationKey]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button, a, input, label, .echo-overlay-resize-handle")) return;
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    setIsDragging(true);
    const overlay = overlayRef.current;
    if (overlay) {
      dragOffset.current = {
        x: e.clientX - overlay.offsetLeft,
        y: e.clientY - overlay.offsetTop,
      };
      overlay.classList.add("dragging");
      document.body.style.userSelect = "none";
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
      overlayRef.current.style.left = `${newX}px`;
      overlayRef.current.style.top = `${newY}px`;
    }, [isDragging]);

  const handleMouseUp = useCallback((_e: React.MouseEvent<HTMLDivElement> | MouseEvent) => {
      if (!isDragging) return;
      setIsDragging(false);
      const overlay = overlayRef.current;
      if (overlay) {
        overlay.classList.remove("dragging");
        document.body.style.userSelect = "";
        const finalPos = { x: overlay.offsetLeft, y: overlay.offsetTop };
        setPos(finalPos);
        saveOverlayUIState({ pos: finalPos, hasBeenMoved: true });
      }
    }, [isDragging]);

  const handleMinimizedMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    const dx = Math.abs(e.clientX - dragStartPos.current.x);
    const dy = Math.abs(e.clientY - dragStartPos.current.y);
    if (dx < 5 && dy < 5) {
      toggleMinimize();
    }
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp, { once: true });
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const togglePause = () => safeSendMessage({ type: POPUP_TOGGLE_PAUSE });
  const clearConversation = () => {
    if (window.confirm("Limpar histórico desta conversa?")) {
      safeSendMessage({ type: POPUP_CLEAR_CONVERSATION, payload: { conversationKey: status.conversationKey }});
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
  const handleAiAction = (type: "AI_SUMMARIZE" | "AI_SUGGEST") => {
    if (!status.conversationKey) return;
    setIsAiLoading(true);
    setAiResult(null);
    setAiError(null);
    safeSendMessage({ type, payload: { conversationKey: status.conversationKey }});
  };

  const renderAiResult = () => {
    if (!aiResult) return null;
    switch (aiResult.kind) {
      case "summary": return <SummaryResult data={aiResult.data} />;
      case "suggestion": return <SuggestionResult data={aiResult.data} conversationKey={status.conversationKey}/>;
      default: return null;
    }
  };

  const latestTime = status.latestTimestamp ? new Date(status.latestTimestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "-";
  const overlayClassName = `echo-overlay ${isDarkMode ? "dark-theme" : ""} ${minimized ? "minimized" : ""}`;

  if (minimized) {
    return (
      <div ref={overlayRef} className={overlayClassName} style={{ left: `${pos.x}px`, top: `${pos.y}px` }} onMouseDown={handleMouseDown} onMouseUp={handleMinimizedMouseUp} title="Echo AI">
        <MinimizedIcon statusState={status.state || "idle"} />
      </div>
    );
  }

  return (
    <div ref={overlayRef} className={overlayClassName} style={{ left: `${pos.x}px`, top: `${pos.y}px`, width: `${size.width}px`, height: `${size.height}px` }}>
      <div className="echo-overlay-header" onMouseDown={handleMouseDown}>
        <div className="echo-overlay-title-wrapper">
          <div className={`echo-status-indicator ${status.state || "idle"}`} />
          <span>Echo</span>
        </div>
        <button onClick={toggleMinimize} className="echo-overlay-button" title="Minimizar">-</button>
      </div>
      <div className="echo-overlay-body">
        <RealtimeClassification classification={status.classification} />
        <div className="echo-overlay-status-line">
          <b>Status:</b> {status.state || "idle"} ({status.messageCount || 0}{" "} msgs, últ: {latestTime})
        </div>
        <div className="echo-overlay-conversation-line">
          <b>Conversa:</b>{" "} {status.conversationKey?.split("#")[1]?.substring(0, 12) || "N/A"}
        </div>
        <div className="echo-overlay-actions">
          <button onClick={togglePause} className="echo-overlay-button">{status.paused ? "Retomar" : "Pausar"}</button>
          <button onClick={clearConversation} className="echo-overlay-button">Limpar</button>
          <label className="echo-overlay-switch">
            <input type="checkbox" checked={!!status.settings?.anonymize} onChange={toggleAnonymize}/> Anon
          </label>
        </div>
        <div className="echo-overlay-ia-section">
          <div className="echo-overlay-ia-actions">
            <button onClick={() => handleAiAction("AI_SUMMARIZE")} disabled={isAiLoading || status.state === "idle"}>Resumo IA</button>
            <button onClick={() => handleAiAction("AI_SUGGEST")} disabled={isAiLoading || status.state === "idle"}>Sugestão</button>
          </div>
          {isAiLoading && (<div className="ai-loading">Consultando Gemini...</div>)}
          {aiError && <div className="ai-error">Erro: {aiError}</div>}
          {aiResult && <div className="ai-result">{renderAiResult()}</div>}
        </div>
      </div>
      <div className="echo-overlay-footer">
        <button onClick={toggleTheme} className="echo-overlay-button" style={{ fontSize: "14px" }}>
          {isDarkMode ? "☀️" : "🌙"}
        </button>
        <a href="#" onClick={openOptions}>⚙ Configurações</a>
      </div>
      <div className="echo-overlay-resize-handle" onMouseDown={handleResizeMouseDown}></div>
    </div>
  );
};

try {
  if (!document.getElementById("echo-overlay-root")) {
    const rootEl = document.createElement("div");
    rootEl.id = "echo-overlay-root";
    document.body.appendChild(rootEl);
    const root = createRoot(rootEl);
    root.render(<App />);
  }
} catch (_e) {
  // Silenced
}

export default App;
