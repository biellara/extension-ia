// Tela simples com:
// status (conversa ativa, mensagens, retenção, anonimização), botões: Pausar/Retomar e limpar conversa

import  { useEffect,  useState} from "react";
import { MSG_BG_STATUS, MSG_GET_STATUS } from "../common/messaging/channels";
import React from "react";

type BgState = "idle" | "observing" | "paused";
type BgStatus = {
    state: BgState;
    paused: boolean;
    conversationKey?: string;
    messageCount?: number;
    latestTimestamp?: string;
    retention?: {days: number, limitPerConversation: number};
};

export default function App() {
  const [status, setStatus] = useState<BgStatus | null>(null);
  const [error, setError] = useState<string | null>(null); 

useEffect(() => {
  function askStatus(retry = 0) {
    chrome.runtime.sendMessage({ type: MSG_GET_STATUS }, (response) => {
      const err = chrome.runtime.lastError;
      if (err) {
        if (err.message?.includes("message port closed") && retry < 1) {
          setTimeout(() => askStatus(retry + 1), 150);
          return;
        }
        setError(err.message || "Erro desconhecido");
        return;
      }
      if (response?.type === MSG_BG_STATUS && response.payload) {
        setStatus(response.payload as BgStatus);
      } else {
        setError("Resposta inesperada do background");
      }
    });
  }
  askStatus();
}, []);
    return (
      <div style={{ padding: 12, minWidth: 260, fontFamily: "system-ui, Arial"}}>
        <h1 style={{ fontSize: 16, margin: 0 }}>Status</h1>

        {error && <p style={{color: "red"}}>Error: {error}</p>}
        {!status && !error && <p>Loading...</p>}

        {status && (
          <ul style={{ paddingLeft: 16, margin: "8px 0"}}>
            <li>state: <b>{status.state}</b></li>
            <li>paused: <b>{String(status.paused)}</b></li>
            {status.conversationKey && <li>conversationKey: <b>{status.conversationKey}</b></li>}
            <li>messageCount: {status.messageCount ?? 0}</li>
            {status.latestTimestamp && <li>latest: {status.latestTimestamp}</li>}
            <li>retention: {status.retention?.days}d / {status.retention?.limitPerConversation} msgs</li>
          </ul>

        )}
      </div>

    );
  }
// Fim da tela simples com status e botões
