// Aqui registra ouvintes de mensagens e coordena fluxos: 
// inicia/para observação na aba, pede snapshots, recebe lots do content, aplica dedupe/retention, atualiza status para o popup

import { MSG_GET_STATUS, MSG_BG_STATUS } from "../common/messaging/channels";

type BgState = "idle" | "observing" | "paused";
type BgStatus = {
  state: BgState;
  paused: boolean;
  conversationKey?: string;
  messageCount?: number;
  latestTimestamp?: string;
  retention?: { days: number; limitPerConversation: number };
};

const DEFAULT_STATUS: BgStatus = {
  state: "idle",
  paused: false,
  messageCount: 0,
  retention: { days: 7, limitPerConversation: 2000 },
};

let currentStatus: BgStatus = { ...DEFAULT_STATUS };

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === MSG_GET_STATUS) {
    setTimeout(() => {
      try {
        sendResponse({ type: MSG_BG_STATUS, payload: currentStatus });
      } catch (e) {
        console.warn("[BG] sendResponse error:", e);
      }
    }, 0);

    return true;
  }

  return false;
});