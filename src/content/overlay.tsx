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
};

const MinimizedIcon = ({ statusState }: { statusState: string }) => (
  <div className="echo-minimized-icon-wrapper">
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="echo-minimized-icon"
    >
      <path
        d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7.5 11.5C8.5 10.5 10.5 10.5 11.5 11.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M10.5 8.5C12.5 6.5 15.5 6.5 17.5 8.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
    <div className={`echo-status-indicator ${statusState}`} />
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
      {summaryData.topics && (
        <>
          <h4>Tópicos Principais:</h4>
          <ul>
            {summaryData.topics.map((item: string, i: number) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </>
      )}
      {summaryData.next_steps && (
        <>
          <h4>Próximos Passos:</h4>
          <ul>
            {summaryData.next_steps.map((item: string, i: number) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </>
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
  return (
    <div className="ai-result-section checklist-summary">
      <h3>{title}</h3>
      <div className="checklist-item">
        <strong>👤 Nome do Cliente:</strong>
        <span>{data.nome_cliente || "Aguardando..."}</span>
      </div>
      <div className="checklist-item">
        <strong>📞 Telefone:</strong>
        <span>{data.telefone_contato || "Aguardando..."}</span>
      </div>
      <div className="checklist-item">
        <strong>📍 Endereço:</strong>
        <span>{data.endereco_cliente || "Aguardando..."}</span>
      </div>
      <div className="checklist-item">
        <strong>🔧 Problema/Solicitação:</strong>
        <span>{data.problema_relatado || "Aguardando..."}</span>
      </div>
      <div className="checklist-item">
        <strong>✅ Resolução/Próximo Passo:</strong>
        <span>{data.resolucao_proximo_passo || "Aguardando..."}</span>
      </div>
    </div>
  );
};

const FinalSummary = ({
  summary,
}: {
  summary?: ConversationMeta["summary"];
}) => {
  if (!summary) return null;
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

  if (!checklist) {
    return (
      <div className="realtime-classification-placeholder">
        Aguardando dados para a checklist...
      </div>
    );
  }

  const getChecklistAsText = () => {
    return `
Nome do Cliente: ${checklist.nome_cliente || ""}
Telefone: ${checklist.telefone_contato || ""}
Endereço: ${checklist.endereco_cliente || ""}
Problema/Solicitação: ${checklist.problema_relatado || ""}
Resolução/Próximo Passo: ${checklist.resolucao_proximo_passo || ""}
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
    <div>
      <ChecklistDisplay data={checklist} title="📋 Checklist em Andamento" />
      <div className="checklist-actions">
        <button onClick={handleCopy} className="echo-overlay-button">
          Copiar
        </button>
        <button
          onClick={handleInsert}
          className="echo-overlay-button insert-button"
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
      setFeedback((prev) => ({ ...prev, [index]: "✔ Copiado" }));
    } else if (action === "insert" && conversationKey) {
      safeSendMessage({ type: CS_INSERT_SUGGESTION, payload: { text } }).then(
        (response) => {
          const res = response as { success?: boolean };
          if (res?.success) {
            setFeedback((prev) => ({ ...prev, [index]: "✔ Inserido" }));
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
      {suggestionData.suggestions?.map(
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
                  {feedback[i] === "✔ Inserido" ? "✔ Inserido" : "Inserir"}
                </button>
                <button
                  onClick={() => handleAction(sug.text, i, "copy")}
                  className="copy-button"
                  disabled={!!feedback[i]}
                >
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

const RealtimeClassification = ({
  classification,
}: {
  classification?: ClassificationData;
}) => {
  if (!classification || !classification.reason) {
    return (
      <div className="realtime-classification-placeholder">
        Aguardando classificação...
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
        if (
          message.payload.state === "finished" ||
          message.payload.state === "observing"
        ) {
          setIsAiLoading(false);
          setAiResult(null);
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
            status &&
            payload.conversationKey === status.conversationKey
          ) {
            if (
              payload.kind !== "classification" &&
              payload.kind !== "checklist"
            ) {
              setAiResult(msg.payload as AiResult["payload"]);
              setActiveTab("tools");
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
            status &&
            payload.conversationKey === status.conversationKey
          ) {
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
  }, [status]);

  const togglePause = () => safeSendMessage({ type: POPUP_TOGGLE_PAUSE });
  const clearConversation = () => {
    if (window.confirm("Limpar histórico e resumo desta conversa?")) {
      safeSendMessage({
        type: POPUP_CLEAR_CONVERSATION,
        payload: { conversationKey: status?.conversationKey },
      });
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
    setAiResult(null);
    setAiError(null);
    safeSendMessage({
      type,
      payload: { conversationKey: status.conversationKey },
    });
  };

  const handleFinishConversation = () => {
    if (status?.conversationKey && status.state !== "finished") {
      setIsAiLoading(true);
      setAiResult(null);
      setAiError(null);
      safeSendMessage({
        type: OVERLAY_FINISH_CONVERSATION,
        payload: { conversationKey: status.conversationKey },
      });
    }
  };

  const handleRefresh = () => {
    if (status?.conversationKey && !isAiLoading) {
      if (
        window.confirm(
          "Isso irá limpar os dados atuais e recarregar a conversa do zero. Deseja continuar?"
        )
      ) {
        setIsAiLoading(true);
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
    return null; // ou um loader
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
        title="Echo AI"
      >
        <MinimizedIcon statusState={status.state || "idle"} />
      </div>
    );
  }

  return (
    <div ref={overlayRef} className={overlayClassName}>
      <div className="echo-overlay-header">
        <div className="echo-overlay-title-wrapper">
          <div className={`echo-status-indicator ${status.state || "idle"}`} />
          <span>Echo</span>
          <span className="header-conversation-id">
            #{status.conversationKey?.split("#")[1]?.substring(0, 12) || "N/A"}
          </span>
        </div>
        <div className="header-buttons">
          <button
            onClick={handleRefresh}
            className="echo-overlay-button"
            title="Recarregar conversa"
            disabled={isAiLoading || status.state === "idle"}
          >
            ↻
          </button>
          <button
            onClick={toggleMinimize}
            className="echo-overlay-button"
            title="Minimizar"
          >
            -
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
                <span>Status</span>
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
                  <Icons.Clock /> Última
                </span>
                <strong>{latestTime}</strong>
              </div>
            </div>
            <div className="status-actions">
              <button onClick={togglePause} className="echo-overlay-button">
                {status.paused ? "Retomar" : "Pausar"}
              </button>
              <button
                onClick={clearConversation}
                className="echo-overlay-button"
              >
                Limpar
              </button>
            </div>
          </>
        )}

        {activeTab === "tools" && (
          <div className="echo-overlay-ia-section">
            {!isFinished && (
              <>
                <div className="echo-overlay-ia-actions">
                  <button
                    onClick={() => handleAiAction("AI_SUMMARIZE")}
                    disabled={isAiLoading || status.state === "idle"}
                  >
                    Resumo Rápido
                  </button>
                  <button
                    onClick={() => handleAiAction("AI_SUGGEST")}
                    disabled={isAiLoading || status.state === "idle"}
                  >
                    Sugestão
                  </button>
                </div>
                <LiveChecklist
                  checklist={status.liveChecklist}
                  onCopy={handleCopy}
                />
              </>
            )}
            {isAiLoading && (
              <div className="ai-loading">Consultando Gemini...</div>
            )}
            {aiError && <div className="ai-error">Erro: {aiError}</div>}
            {aiResult && !isFinished && (
              <div className="ai-result">{renderAiResult()}</div>
            )}
            <FinalSummary summary={status.summary} />
          </div>
        )}
      </div>

      <div className="echo-overlay-footer">
        <div className="echo-overlay-footer-left">
          <button
            onClick={toggleTheme}
            className="echo-overlay-button"
            title="Mudar Tema"
          >
            {isDarkMode ? "☀️" : "🌙"}
          </button>
          <a href="#" onClick={openOptions} className="footer-link">
            <Icons.Settings /> Configurações
          </a>
        </div>
        <button
          onClick={handleFinishConversation}
          className="echo-overlay-button finish-button"
          title="Encerrar e Gerar Resumo"
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
