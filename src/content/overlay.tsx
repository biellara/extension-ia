import React, { useState, useEffect, useRef } from "react";
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

// --- Componente Spinner ---
const Spinner = () => (
  <div className="spinner">
    <div className="double-bounce1"></div>
    <div className="double-bounce2"></div>
  </div>
);

// --- Componentes de Exibição de Resultados da IA ---

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
  const hasData = Object.values(data).some((value) => value && value.trim() !== '');

  return (
    <div className="ai-result-section checklist-summary">
      <h3>{title}</h3>
      {!hasData ? (
        <p className="ai-result-placeholder">Aguardando dados da checklist...</p>
      ) : (
        <>
          <div className="checklist-item">
            <strong>
              <Icons.User /> Nome do Cliente:
            </strong>
            <span>{data.nome_cliente || "Aguardando..."}</span>
          </div>
          <div className="checklist-item">
            <strong>
              <Icons.Phone /> Telefone:
            </strong>
            <span>{data.telefone_contato || "Aguardando..."}</span>
          </div>
          <div className="checklist-item">
            <strong>
              <Icons.MapPin /> Endereço:
            </strong>
            <span>{data.endereco_cliente || "Aguardando..."}</span>
          </div>
          <div className="checklist-item">
            <strong>
              <Icons.Tool /> Problema/Solicitação:
            </strong>
            <span>{data.problema_relatado || "Aguardando..."}</span>
          </div>
          <div className="checklist-item">
            <strong>
              <Icons.CheckCircle /> Resolução/Próximo Passo:
            </strong>
            <span>{data.resolucao_proximo_passo || "Aguardando..."}</span>
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

const LiveChecklist = ({
  checklist,
  onCopy,
}: {
  checklist?: ChecklistSummaryData;
  onCopy: (text: string) => void;
}) => {
  const [insertFeedback, setInsertFeedback] = useState(false);

  const hasData = checklist && Object.values(checklist).some((value) => value && value.trim() !== '');

  const getChecklistAsText = () => {
    return `
Nome do Cliente: ${checklist?.nome_cliente || "N/A"}
Telefone: ${checklist?.telefone_contato || "N/A"}
Endereço: ${checklist?.endereco_cliente || "N/A"}
Problema/Solicitação: ${checklist?.problema_relatado || "N/A"}
Resolução/Próximo Passo: ${checklist?.resolucao_proximo_passo || "N/A"}
        `.trim();
  };

  const handleCopy = () => {
    onCopy(getChecklistAsText());
  };

  const handleInsert = () => {
    if (checklist) {
      safeSendMessage({
        type: CS_INSERT_CHECKLIST,
        payload: { checklist },
      }).then((response: unknown) => {
        const res = response as { success?: boolean }; // Adiciona a asserção de tipo
        if (res?.success) {
          setInsertFeedback(true);
          setTimeout(() => setInsertFeedback(false), 2000);
        }
      });
    }
  };

  return (
    <div className="live-checklist-wrapper">
      <ChecklistDisplay data={checklist || {}} title="📋 Checklist em Andamento" />
      {hasData && (
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
      )}
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

const RealtimeClassification = ({
  classification,
}: {
  classification?: ClassificationData;
}) => {
  if (!classification || !classification.reason) {
    return (
      <div className="realtime-classification-placeholder">
        Aguardando classificação em tempo real...
      </div>
    );
  }

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
    <div
      className={`realtime-classification-bar sentiment-${sentimentInfo.className}`}
    >
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
  classification?: ClassificationData;
  summary?: ConversationMeta["summary"];
  liveChecklist?: ChecklistSummaryData;
};

const App = () => {
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [minimized, setMinimized] = useState(true);
  const overlayRef = useRef<HTMLDivElement>(null);

  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AiResult["payload"] | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const [activeTab, setActiveTab] = useState<"overview" | "tools">("overview");
  const [copyFeedback, setCopyFeedback] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("echo-theme");
    if (savedTheme === "dark") setIsDarkMode(true);

    if (!chrome?.runtime?.id) return;

    getOverlayUIState().then((state) => {
      if (chrome?.runtime?.id) {
        setMinimized(state.minimized ?? true);
      }
    });
  }, []);

  const toggleTheme = () => {
    const newIsDarkMode = !isDarkMode;
    setIsDarkMode(newIsDarkMode);
    localStorage.setItem("echo-theme", newIsDarkMode ? "dark" : "light");
  };

  useEffect(() => {
    if (!chrome?.runtime?.id) return;

    const port = chrome.runtime.connect({ name: "overlay" });
    port.onMessage.addListener((message) => {
      if (message.type === MSG_BG_STATUS) {
        setStatus(message.payload);
        // Only clear AI results/loading when conversation changes significantly
        // or specifically finished/idle.
        if (
          message.payload.state === "finished" ||
          message.payload.state === "idle"
        ) {
          setIsAiLoading(false);
          setAiResult(null); // Clear AI result when conversation finishes or goes idle
          setAiError(null);
          // If finished, default to overview or ensure final summary is visible
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
          const payload = msg.payload as {
            conversationKey?: string;
            kind?: string;
          };
          if (
            payload &&
            status && // Ensure status is not null before accessing conversationKey
            payload.conversationKey === status.conversationKey
          ) {
            // Classification and checklist are handled directly by status update
            // Other AI results (summary, suggestion) update aiResult state
            if (
              payload.kind !== "classification" &&
              payload.kind !== "checklist"
            ) {
              setAiResult(msg.payload as AiResult["payload"]);
              setActiveTab("tools"); // Switch to tools tab when a new AI result (summary/suggestion) arrives
            }
            setAiError(null);
            setIsAiLoading(false);
          }
        } else if (msg.type === AI_ERROR) {
          const payload = msg.payload as {
            conversationKey?: string;
            reason?: string;
          };
          if (
            payload &&
            status && // Ensure status is not null before accessing conversationKey
            payload.conversationKey === status.conversationKey
          ) {
            setAiError(payload.reason ?? "Erro desconhecido da IA.");
            setAiResult(null);
            setIsAiLoading(false);
            setActiveTab("tools"); // Show error in tools tab
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
  }, [status?.conversationKey, status?.state, status]); // Depend on conversationKey and state to react to changes

  const togglePause = () => safeSendMessage({ type: POPUP_TOGGLE_PAUSE });
  const clearConversation = () => {
    if (window.confirm("Deseja realmente limpar o histórico e resumo desta conversa? Esta ação não pode ser desfeita.")) {
      safeSendMessage({
        type: POPUP_CLEAR_CONVERSATION,
        payload: { conversationKey: status?.conversationKey },
      });
      setAiResult(null); // Clear AI results immediately after clearing conversation
      setAiError(null);
      setIsAiLoading(false);
    }
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
    if (!status?.conversationKey) return;
    setIsAiLoading(true);
    setAiResult(null); // Clear previous AI result when requesting a new one
    setAiError(null);
    setActiveTab("tools"); // Always switch to tools tab when an AI action is triggered
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
        setAiResult(null); // Clear previous AI result when refreshing
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
      default:
        return null;
    }
  };

  if (!status) {
    return null; // ou um loader inicial simples
  }

  const isFinished = status.state === "finished";
  const latestTime = status.latestTimestamp
    ? new Date(status.latestTimestamp).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-";
  const overlayClassName = `echo-overlay ${isDarkMode ? "dark-theme" : ""} ${minimized ? "minimized" : ""} position-${status.settings.widgetPosition}`;

  if (minimized) {
    return (
      <div
        className={overlayClassName}
        onClick={toggleMinimize}
        title="Echo AI - Clique para expandir"
      >
        <MinimizedIcon statusState={status.state || "idle"} />
      </div>
    );
  }

  return (
    <div ref={overlayRef} className={overlayClassName}>
      <div className="echo-overlay-header">
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
            onClick={toggleMinimize}
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
            <RealtimeClassification classification={status.classification} />
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
            <div className="echo-overlay-ia-actions">
              <button
                onClick={() => handleAiAction("AI_SUMMARIZE")}
                disabled={isAiLoading || status.state === "idle" || status.state === "finished"}
                className="ai-action-button"
                title="Gerar um resumo rápido da conversa até o momento"
              >
                Gerar Resumo Rápido
              </button>
              <button
                onClick={() => handleAiAction("AI_SUGGEST")}
                disabled={isAiLoading || status.state === "idle" || status.state === "finished"}
                className="ai-action-button"
                title="Obter sugestões de resposta com base na conversa"
              >
                Obter Sugestão
              </button>
            </div>

            {isAiLoading && (
              <div className="ai-loading-wrapper">
                <Spinner />
                <span>Consultando Gemini...</span>
              </div>
            )}
            {aiError && <div className="ai-error">Erro: {aiError}</div>}
            
            {/* Live Checklist always visible if conversation is ongoing or finished but has data */}
            {!isFinished && (
              <LiveChecklist
                checklist={status.liveChecklist}
                onCopy={handleCopy}
              />
            )}
            
            {aiResult && !isFinished && (
              <div className="ai-result">{renderAiResult()}</div>
            )}
            
            {isFinished && <FinalSummary summary={status.summary} />}
            
            {!isAiLoading && !aiError && !aiResult && !isFinished && !status.liveChecklist && (
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
      {copyFeedback && <div className="copy-feedback">Checklist copiada!</div>}
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