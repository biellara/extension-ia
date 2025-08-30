import React, { useState, useEffect, useRef, useCallback } from "react";
import { createRoot } from "react-dom/client";
import { getOverlayUIState, saveOverlayUIState } from "../common/storage/ui";
import { safeSendMessage } from "../common/messaging/safeSend";
import {
  MSG_BG_STATUS,
  MSG_GET_STATUS,
  POPUP_TOGGLE_PAUSE,
  POPUP_CLEAR_CONVERSATION,
  CS_SHOW_OVERLAY,
  MSG_OPEN_OPTIONS_PAGE,
  AI_RESULT,
  AI_ERROR,
  CS_INSERT_SUGGESTION,
  OVERLAY_FINISH_CONVERSATION,
  OVERLAY_REFRESH_CONVERSATION,
  CS_INSERT_CHECKLIST,
} from "../common/messaging/channels";
import { AiResult } from "../common/ai/types";
import "./overlay.css";
import { ConversationMeta } from "../common/types/models";
import { AppSettings } from "../common/storage/settings";

// --- Ícones SVG para a nova interface ---
const Icons = {
  EchoLogo: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      <path d="M8 10h.01"></path>
      <path d="M12 10h.01"></path>
      <path d="M16 10h.01"></path>
    </svg>
  ),
  Message: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </svg>
  ),
  Clock: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10"></circle>
      <polyline points="12 6 12 12 16 14"></polyline>
    </svg>
  ),
  Settings: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="3"></circle>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
    </svg>
  ),
  User: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
      <circle cx="12" cy="7" r="4"></circle>
    </svg>
  ),
  Phone: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-1.11 2.4l-.47.28a2 2 0 0 0-.75 2.53c.82.78 2.07 1.94 3.23 3.1.2.2.4.4.6.59l.86.68c.2.16.4.3.6.43.34.25.68.49 1 .71.7.5 1.4.98 2.08 1.45.6.4.74 1.16.48 1.7-.26.54-.86.91-1.5.91-.65 0-1.3-.12-1.95-.36-1.3-.49-2.6-1.12-3.8-1.94a15.89 15.89 0 0 1-3.8-3.8c-.82-1.2-1.45-2.5-1.94-3.8-.24-.65-.36-1.3-.36-1.95 0-.64.37-1.24.91-1.5.54-.26 1.3-.12 1.7.48.47.68.95 1.38 1.45 2.08.22.32.46.66.71 1 .13.2.28.4.43.6l.68.86c.19.2.4.4.59.6.2.2.4.4.6.59z"></path>
    </svg>
  ),
  MapPin: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
      <circle cx="12" cy="10" r="3"></circle>
    </svg>
  ),
  Tool: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-3.77 3.77a1 1 0 0 1-1.4 0l-1.6-1.6a1 1 0 0 1 0-1.4l3.77-3.77a6 6 0 0 1 7.94-7.94l-1.6-1.6z"></path>
      <path d="M5.5 10.5l-.2.2c-.3.3-.6.4-.9.4-.3 0-.6-.1-.9-.4l-2.7-2.7c-.3-.3-.4-.6-.4-.9 0-.3.1-.6.4-.9l.2-.2c.3-.3.6-.4.9-.4.3 0 .6.1.9.4l2.7 2.7c.3.3.4.6.4.9 0 .3-.1.6-.4.9z"></path>
    </svg>
  ),
  CheckCircle: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
  ),
};

const MinimizedIcon = ({ statusState }: { statusState: string }) => (
  <div className="echo-minimized-icon-wrapper">
    <Icons.EchoLogo />
    <div className={`echo-status-indicator ${statusState}`} />
  </div>
);

const Spinner = () => (
  <div className="spinner">
    <div className="double-bounce1"></div>
    <div className="double-bounce2"></div>
  </div>
);

type GeneralSummaryData = {
  topics?: string[];
  next_steps?: string[];
};

const GeneralSummary = ({ data }: { data: unknown }) => {
  const summaryData = data as GeneralSummaryData;
  return (
    <div className="ai-result-section">
      <h3>Resumo Rápido</h3>
      {summaryData.topics && summaryData.topics.length > 0 && (
        <>
          <h4>Tópicos Principais:</h4>
          <ul>
            {summaryData.topics.map((item: string, i: number) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </>
      )}
      {summaryData.next_steps && summaryData.next_steps.length > 0 && (
        <>
          <h4>Próximos Passos:</h4>
          <ul>
            {summaryData.next_steps.map((item: string, i: number) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </>
      )}
      {!summaryData.topics?.length && !summaryData.next_steps?.length && (
        <p className="ai-result-placeholder">Nenhum resumo gerado ainda.</p>
      )}
    </div>
  );
};

type ChecklistSummaryData = {
  nome_cliente?: string;
  telefone_contato?: string;
  endereco_cliente?: string;
  problema_relatado?: string;
  resolucao_proximo_passo?: string;
};

const ChecklistDisplay = ({
  data,
  title,
}: {
  data: ChecklistSummaryData;
  title: string;
}) => {
  const hasData = Object.values(data).some((value) => value && value.trim() !== '' && value.trim() !== 'Não informado');

  return (
    <div className="ai-result-section checklist-summary">
      <h3>{title}</h3>
      {!hasData ? (
        <p className="ai-result-placeholder">Nenhum dado extraído ainda.</p>
      ) : (
        <>
          <div className="checklist-item">
            <strong>
              <Icons.User /> Nome do Cliente:
            </strong>
            <span>{data.nome_cliente || "Não informado"}</span>
          </div>
          <div className="checklist-item">
            <strong>
              <Icons.Phone /> Telefone:
            </strong>
            <span>{data.telefone_contato || "Não informado"}</span>
          </div>
          <div className="checklist-item">
            <strong>
              <Icons.MapPin /> Endereço:
            </strong>
            <span>{data.endereco_cliente || "Não informado"}</span>
          </div>
          <div className="checklist-item">
            <strong>
              <Icons.Tool /> Problema/Solicitação:
            </strong>
            <span>{data.problema_relatado || "Não informado"}</span>
          </div>
          <div className="checklist-item">
            <strong>
              <Icons.CheckCircle /> Resolução/Próximo Passo:
            </strong>
            <span>{data.resolucao_proximo_passo || "Não informado"}</span>
          </div>
        </>
      )}
    </div>
  );
};

const FinalSummary = ({
  summary,
}: {
  summary?: ConversationMeta["summary"];
}) => {
  if (!summary || !summary.content) {
    return (
      <div className="ai-result-section checklist-summary">
        <h3>📄 Checklist de Finalização (IA)</h3>
        <p className="ai-result-placeholder">O resumo final da checklist estará disponível aqui após o término do atendimento.</p>
      </div>
    );
  }
  return (
    <ChecklistDisplay
      data={summary.content as ChecklistSummaryData}
      title="📄 Checklist de Finalização (IA)"
    />
  );
};

const ChecklistResult = ({
    data,
    onCopy,
    onInsert,
  }: {
    data: unknown;
    onCopy: (text: string) => void;
    onInsert: (checklist: ChecklistSummaryData) => void;
  }) => {
    const checklistData = data as ChecklistSummaryData;
    const [insertFeedback, setInsertFeedback] = useState(false);
  
    const getChecklistAsText = () => {
      return `
  Nome do Cliente: ${checklistData?.nome_cliente || "N/A"}
  Telefone: ${checklistData?.telefone_contato || "N/A"}
  Endereço: ${checklistData?.endereco_cliente || "N/A"}
  Problema/Solicitação: ${checklistData?.problema_relatado || "N/A"}
  Resolução/Próximo Passo: ${checklistData?.resolucao_proximo_passo || "N/A"}
          `.trim();
    };
  
    const handleCopy = () => {
      onCopy(getChecklistAsText());
    };
  
    const handleInsert = () => {
      onInsert(checklistData);
      setInsertFeedback(true);
      setTimeout(() => setInsertFeedback(false), 2000);
    };
  
    return (
      <div className="live-checklist-wrapper">
        <ChecklistDisplay data={checklistData || {}} title="📋 Dados Extraídos" />
        <div className="checklist-actions">
            <button onClick={handleCopy} className="echo-overlay-button secondary-button">
                Copiar
            </button>
            <button
                onClick={handleInsert}
                className="echo-overlay-button primary-button"
                disabled={insertFeedback}
            >
                {insertFeedback ? "✔ Inserido" : "Inserir no Relato"}
            </button>
        </div>
      </div>
    );
  };

type SuggestionData = {
  suggestions?: { tone: string; text: string }[];
};

const SuggestionResult = ({
  data,
  conversationKey,
}: {
  data: unknown;
  conversationKey?: string;
}) => {
  const suggestionData = data as SuggestionData;
  const [feedback, setFeedback] = useState<{ [index: number]: string }>({});

  const handleAction = (
    text: string,
    index: number,
    action: "copy" | "insert"
  ) => {
    if (action === "copy") {
      navigator.clipboard.writeText(text);
      setFeedback((prev) => ({ ...prev, [index]: "✔ Copiado!" }));
    } else if (action === "insert" && conversationKey) {
      safeSendMessage({ type: CS_INSERT_SUGGESTION, payload: { text } }).then(
        (response) => {
          const res = response as { success?: boolean };
          if (res?.success) {
            setFeedback((prev) => ({ ...prev, [index]: "✔ Inserido!" }));
          } else {
            setFeedback((prev) => ({ ...prev, [index]: "Falhou!" }));
          }
        }
      );
    }
    setTimeout(() => {
      setFeedback((prev) => ({ ...prev, [index]: "" }));
    }, 2000);
  };

  return (
    <div className="ai-result-section">
      <h3>Sugestões de Resposta</h3>
      {suggestionData.suggestions && suggestionData.suggestions.length > 0 ? (
        suggestionData.suggestions.map(
          (sug: { tone: string; text: string }, i: number) => (
            <div key={i} className="suggestion-card">
              <div className="suggestion-header">
                <strong>Tom: {sug.tone}</strong>
                <div className="suggestion-buttons">
                  <button
                    onClick={() => handleAction(sug.text, i, "insert")}
                    className="insert-button"
                    disabled={!!feedback[i]}
                  >
                    {feedback[i] === "✔ Inserido!" ? "✔ Inserido" : "Inserir"}
                  </button>
                  <button
                    onClick={() => handleAction(sug.text, i, "copy")}
                    className="copy-button"
                    disabled={!!feedback[i]}
                  >
                    {feedback[i] === "✔ Copiado!" ? "✔ Copiado" : "Copiar"}
                  </button>
                </div>
              </div>
              <p>{sug.text}</p>
            </div>
          )
        )
      ) : (
        <p className="ai-result-placeholder">Nenhuma sugestão gerada ainda.</p>
      )}
    </div>
  );
};

type ClassificationData = {
  reason?: string;
  urgency?: string;
  sentiment?: string;
};

const ClassificationResult = ({
    data,
  }: {
    data: unknown;
  }) => {
    const classification = data as ClassificationData;
    const { reason, urgency, sentiment } = classification;
  
    const sentimentMap: Record<string, { icon: string; className: string }> = {
      Positivo: { icon: "😊", className: "positive" },
      Neutro: { icon: "😐", className: "neutral" },
      Negativo: { icon: "😡", className: "negative" },
    };
  
    const sentimentInfo =
      sentiment && sentimentMap[sentiment]
        ? sentimentMap[sentiment]
        : { icon: "🤔", className: "unknown" };
  
    return (
      <div className={`ai-result-section realtime-classification-bar sentiment-${sentimentInfo.className}`}>
        <h3>Análise de Sentimento</h3>
        <div className="classification-item">
          <strong>{sentimentInfo.icon} Sentimento:</strong>
          <span>{sentiment}</span>
        </div>
        <div className="classification-item">
          <strong>{urgency === "Alta" ? "⚠️" : "⚡"} Urgência:</strong>
          <span>{urgency}</span>
        </div>
        <div className="classification-item">
          <strong>📝 Motivo:</strong>
          <span className="classification-reason" title={reason}>
            {reason}
          </span>
        </div>
      </div>
    );
  };

type StatusPayload = {
  state?: "idle" | "observing" | "paused" | "finished";
  paused?: boolean;
  conversationKey?: string;
  messageCount?: number;
  latestTimestamp?: string;
  settings: AppSettings;
  summary?: ConversationMeta["summary"];
};

const MINIMIZED_SIZE = 54;
const EXPANDED_SIZE = { width: 380, height: 560 };

const App = () => {
    const [status, setStatus] = useState<StatusPayload | null>(null);
    const [minimized, setMinimized] = useState(true);
    const [position, setPosition] = useState({ x: window.innerWidth - 84, y: window.innerHeight - 84 });
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [initialStateLoaded, setInitialStateLoaded] = useState(false);
  
    const overlayRef = useRef<HTMLDivElement>(null);
    const dragInfo = useRef({
      isDragging: false,
      hasDragged: false,
      startMouse: { x: 0, y: 0 },
      offset: { x: 0, y: 0 },
    });
  
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [aiResult, setAiResult] = useState<AiResult["payload"] | null>(null);
    const [aiError, setAiError] = useState<string | null>(null);
  
    const [activeTab, setActiveTab] = useState<"overview" | "tools">("overview");
    const [copyFeedback, setCopyFeedback] = useState(false);
  
    useEffect(() => {
      const savedTheme = localStorage.getItem("echo-theme");
      if (savedTheme === "dark") setIsDarkMode(true);
  
      if (!chrome?.runtime?.id) return;
  
      getOverlayUIState().then((state) => {
        setMinimized(state.minimized ?? true);
        if (state.hasBeenMoved && state.pos) {
          setPosition(state.pos);
        }
        setInitialStateLoaded(true);
      });
    }, []);
  
    useEffect(() => {
        if (!initialStateLoaded || !status?.settings.widgetPosition) return;
    
        getOverlayUIState().then((state) => {
            if (state.hasBeenMoved && state.pos) {
                setPosition(state.pos);
            } else {
                const width = minimized ? MINIMIZED_SIZE : EXPANDED_SIZE.width;
                const height = minimized ? MINIMIZED_SIZE : EXPANDED_SIZE.height;
                const positionClass = status.settings.widgetPosition;
                
                let x = window.innerWidth - width - 20;
                let y = window.innerHeight - height - 20;
                
                if (positionClass === 'top-right') { y = 20; }
                else if (positionClass === 'top-left') { x = 20; y = 20; }
                else if (positionClass === 'bottom-left') { x = 20; }
                
                setPosition({ x, y });
            }
        });
    }, [initialStateLoaded, status?.settings.widgetPosition, minimized]);

  useEffect(() => {
    if (!chrome?.runtime?.id) return;

    const port = chrome.runtime.connect({ name: "overlay" });
    port.onMessage.addListener((message) => {
      if (message.type === MSG_BG_STATUS) {
        setStatus(message.payload);
        if (
          message.payload.state === "finished" ||
          message.payload.state === "idle"
        ) {
          setIsAiLoading(false);
          setAiResult(null); 
          setAiError(null);
          if (message.payload.state === "finished") {
             setActiveTab("tools");
          } else if (message.payload.state === "idle") {
             setActiveTab("overview");
          }
        }
      }
    });
    safeSendMessage({ type: MSG_GET_STATUS });

    const messageListener = (message: unknown) => {
      if (
        typeof message === "object" &&
        message !== null &&
        "type" in message
      ) {
        const msg = message as { type: string; payload?: unknown };
        if (msg.type === CS_SHOW_OVERLAY) {
          setMinimized(false);
          saveOverlayUIState({ minimized: false });
        } else if (msg.type === AI_RESULT) {
          const payload = msg.payload as { conversationKey?: string };
          if (
            payload &&
            status &&
            payload.conversationKey === status.conversationKey
          ) {
            setAiResult(msg.payload as AiResult["payload"]);
            setAiError(null);
            setIsAiLoading(false);
            setActiveTab("tools");
          }
        } else if (msg.type === AI_ERROR) {
          const payload = msg.payload as {
            conversationKey?: string;
            reason?: string;
          };
          if (
            payload &&
            status &&
            payload.conversationKey === status.conversationKey
          ) {
            setAiError(payload.reason ?? "Erro desconhecido da IA.");
            setAiResult(null);
            setIsAiLoading(false);
            setActiveTab("tools");
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
  }, [status]);

  const handleToggleMinimize = useCallback(() => {
    setMinimized(prevMinimized => {
        const newMinimized = !prevMinimized;

        setPosition(prevPos => {
            const currentWidth = prevMinimized ? MINIMIZED_SIZE : EXPANDED_SIZE.width;
            const currentHeight = prevMinimized ? MINIMIZED_SIZE : EXPANDED_SIZE.height;
            const newWidth = newMinimized ? MINIMIZED_SIZE : EXPANDED_SIZE.width;
            const newHeight = newMinimized ? MINIMIZED_SIZE : EXPANDED_SIZE.height;

            const newPos = {
                x: prevPos.x + (currentWidth - newWidth) / 2,
                y: prevPos.y + (currentHeight - newHeight) / 2,
            };
            
            saveOverlayUIState({ minimized: newMinimized, pos: newPos, hasBeenMoved: true });
            return newPos;
        });

        return newMinimized;
    });
}, []);
  
const handleMouseMove = useCallback((e: MouseEvent) => {
  if (!dragInfo.current.isDragging) return;
  e.preventDefault();

  const dx = e.clientX - dragInfo.current.startMouse.x;
  const dy = e.clientY - dragInfo.current.startMouse.y;
  
  if (!dragInfo.current.hasDragged && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
    dragInfo.current.hasDragged = true;
    if (overlayRef.current) {
        overlayRef.current.classList.add('dragging');
    }
  }

  const newX = dragInfo.current.offset.x + dx;
  const newY = dragInfo.current.offset.y + dy;

  if (overlayRef.current) {
      overlayRef.current.style.transform = `translate(${newX - position.x}px, ${newY - position.y}px)`;
  }
}, [position.x, position.y]);

const handleMouseUp = useCallback((e: MouseEvent) => {
  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('mouseup', handleMouseUp);
  
  if (overlayRef.current) {
      overlayRef.current.classList.remove('dragging');
      overlayRef.current.style.transform = '';
  }

  if (dragInfo.current.hasDragged) {
      const dx = e.clientX - dragInfo.current.startMouse.x;
      const dy = e.clientY - dragInfo.current.startMouse.y;
      const newPos = {
          x: dragInfo.current.offset.x + dx,
          y: dragInfo.current.offset.y + dy,
      };
      setPosition(newPos);
      saveOverlayUIState({ pos: newPos, hasBeenMoved: true });
  } else if(dragInfo.current.isDragging) {
      handleToggleMinimize();
  }

  dragInfo.current.isDragging = false;
  dragInfo.current.hasDragged = false;
}, [handleMouseMove, handleToggleMinimize]);


const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    
    const isDragHandle = minimized || (!minimized && target.closest('.echo-overlay-header'));
    if (!isDragHandle || target.closest('button, a')) {
        return;
    }
    
    e.preventDefault();
    dragInfo.current = {
        isDragging: true,
        hasDragged: false,
        startMouse: { x: e.clientX, y: e.clientY },
        offset: { ...position },
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
}, [minimized, position, handleMouseMove, handleMouseUp]);


  const toggleTheme = () => {
    const newIsDarkMode = !isDarkMode;
    setIsDarkMode(newIsDarkMode);
    localStorage.setItem("echo-theme", newIsDarkMode ? "dark" : "light");
  };

  const togglePause = () => safeSendMessage({ type: POPUP_TOGGLE_PAUSE });
  const clearConversation = () => {
    if (window.confirm("Deseja realmente limpar o histórico e resumo desta conversa? Esta ação não pode ser desfeita.")) {
      safeSendMessage({
        type: POPUP_CLEAR_CONVERSATION,
        payload: { conversationKey: status?.conversationKey },
      });
      setAiResult(null);
      setAiError(null);
      setIsAiLoading(false);
    }
  };
  const openOptions = (e: React.MouseEvent) => {
    e.preventDefault();
    safeSendMessage({ type: MSG_OPEN_OPTIONS_PAGE });
  };

  const handleAiAction = (type: "AI_SUMMARIZE" | "AI_SUGGEST" | "AI_CLASSIFY" | "AI_EXTRACT_DATA") => {
    if (!status?.conversationKey) return;
    setIsAiLoading(true);
    setAiResult(null);
    setAiError(null);
    setActiveTab("tools");
    safeSendMessage({
      type,
      payload: { conversationKey: status.conversationKey },
    });
  };

  const handleFinishConversation = () => {
    if (status?.conversationKey && status.state !== "finished") {
      if (window.confirm("Deseja finalizar o atendimento e gerar o resumo final? A conversa será marcada como 'Finalizada'.")) {
        setIsAiLoading(true);
        setAiResult(null);
        setAiError(null);
        safeSendMessage({
          type: OVERLAY_FINISH_CONVERSATION,
          payload: { conversationKey: status.conversationKey },
        });
      }
    }
  };

  const handleRefresh = () => {
    if (status?.conversationKey && !isAiLoading) {
      if (
        window.confirm(
          "Isso irá limpar os dados de IA atuais e recarregar a conversa do zero para análise. Deseja continuar?"
        )
      ) {
        setIsAiLoading(true);
        setAiResult(null);
        setAiError(null);
        safeSendMessage({
          type: OVERLAY_REFRESH_CONVERSATION,
          payload: { conversationKey: status.conversationKey },
        });
      }
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const handleInsertChecklist = (checklist: ChecklistSummaryData) => {
    safeSendMessage({
        type: CS_INSERT_CHECKLIST,
        payload: { checklist },
    });
  };

  const renderAiResult = () => {
    if (!aiResult) return null;
    switch (aiResult.kind) {
      case "summary":
        return <GeneralSummary data={aiResult.data} />;
      case "suggestion":
        return (
          <SuggestionResult
            data={aiResult.data}
            conversationKey={status?.conversationKey}
          />
        );
      case "classification":
        return <ClassificationResult data={aiResult.data} />;
      case "checklist":
        return <ChecklistResult data={aiResult.data} onCopy={handleCopy} onInsert={handleInsertChecklist} />;
      default:
        return null;
    }
  };

  if (!status) {
    return null; 
  }

  const isFinished = status.state === "finished";
  const latestTime = status.latestTimestamp
    ? new Date(status.latestTimestamp).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-";
    const overlayClassName = `echo-overlay ${isDarkMode ? "dark-theme" : ""} ${minimized ? "minimized" : ""}`;
    const overlayStyle = {
      left: `${position.x}px`,
      top: `${position.y}px`,
    };

  if (minimized) {
    return (
      <div
        ref={overlayRef}
        className={overlayClassName}
        style={overlayStyle}
        onMouseDown={handleMouseDown}
        title="Echo AI - Clique para expandir"
      >
        <MinimizedIcon statusState={status.state || "idle"} />
      </div>
    );
  }

  return (
    <div ref={overlayRef} className={overlayClassName} style={overlayStyle}>
      <div className="echo-overlay-header" onMouseDown={handleMouseDown}>
        <div className="echo-overlay-title-wrapper">
          <Icons.EchoLogo />
          <span>Echo AI</span>
          <span className="header-conversation-id" title={`ID da Conversa: ${status.conversationKey || "N/A"}`}>
            #{status.conversationKey?.split("#")[1]?.substring(0, 12) || "N/A"}
          </span>
        </div>
        <div className="header-buttons">
          <button
            onClick={handleRefresh}
            className="echo-overlay-button icon-button"
            title="Recarregar dados da conversa para análise"
            disabled={isAiLoading || status.state === "idle" || status.state === "finished"}
          >
            ↻
          </button>
          <button
            onClick={handleToggleMinimize}
            className="echo-overlay-button icon-button"
            title="Minimizar"
          >
            —
          </button>
        </div>
      </div>

      <div className="nav-tabs">
        <button
          className={`nav-tab ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          Visão Geral
        </button>
        <button
          className={`nav-tab ${activeTab === "tools" ? "active" : ""}`}
          onClick={() => setActiveTab("tools")}
        >
          Ferramentas IA
        </button>
      </div>

      <div className="echo-overlay-body">
        {activeTab === "overview" && (
          <>
            <div className="status-grid">
              <div className="status-item">
                <span>Status Atual</span>
                <strong>{status.state || "idle"}</strong>
              </div>
              <div className="status-item">
                <span>
                  <Icons.Message /> Mensagens
                </span>
                <strong>{status.messageCount || 0}</strong>
              </div>
              <div className="status-item">
                <span>
                  <Icons.Clock /> Última Interação
                </span>
                <strong>{latestTime}</strong>
              </div>
            </div>
            <div className="status-actions">
              <button
                onClick={togglePause}
                className="echo-overlay-button primary-button"
                disabled={status.state === "idle" || status.state === "finished"}
              >
                {status.paused ? "Retomar Observação" : "Pausar Observação"}
              </button>
              <button
                onClick={clearConversation}
                className="echo-overlay-button secondary-button"
                disabled={status.state === "idle" && !status.conversationKey}
              >
                Limpar Conversa
              </button>
            </div>
          </>
        )}

        {activeTab === "tools" && (
          <div className="echo-overlay-ia-section">
            <div className="echo-overlay-ia-actions-grid">
              <button onClick={() => handleAiAction("AI_SUMMARIZE")} disabled={isAiLoading || isFinished} className="ai-action-button">Gerar Resumo</button>
              <button onClick={() => handleAiAction("AI_SUGGEST")} disabled={isAiLoading || isFinished} className="ai-action-button">Sugerir Resposta</button>
              <button onClick={() => handleAiAction("AI_CLASSIFY")} disabled={isAiLoading || isFinished} className="ai-action-button">Analisar Sentimento</button>
              <button onClick={() => handleAiAction("AI_EXTRACT_DATA")} disabled={isAiLoading || isFinished} className="ai-action-button">Extrair Dados</button>
            </div>

            {isAiLoading && (
              <div className="ai-loading-wrapper">
                <Spinner />
                <span>Consultando Gemini...</span>
              </div>
            )}
            {aiError && <div className="ai-error">Erro: {aiError}</div>}
            
            {aiResult && !isFinished && (
              <div className="ai-result">{renderAiResult()}</div>
            )}
            
            {isFinished && <FinalSummary summary={status.summary} />}
            
            {!isAiLoading && !aiError && !aiResult && !isFinished && (
                <div className="ai-placeholder">
                    <Icons.EchoLogo />
                    <p>Use as ferramentas de IA acima para otimizar seu atendimento.</p>
                </div>
            )}
          </div>
        )}
      </div>

      <div className="echo-overlay-footer">
        <div className="echo-overlay-footer-left">
          <button
            onClick={toggleTheme}
            className="echo-overlay-button icon-button"
            title="Mudar Tema (Claro/Escuro)"
          >
            {isDarkMode ? "☀️" : "🌙"}
          </button>
          <a href="#" onClick={openOptions} className="footer-link" title="Abrir configurações da extensão">
            <Icons.Settings /> Configurações
          </a>
        </div>
        <button
          onClick={handleFinishConversation}
          className="echo-overlay-button finish-button"
          title="Encerrar atendimento e gerar resumo final da conversa"
          disabled={isFinished || status.state === "idle" || isAiLoading}
        >
          Finalizar Atendimento
        </button>
      </div>
      {copyFeedback && <div className="copy-feedback">Copiado para a área de transferência!</div>}
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

