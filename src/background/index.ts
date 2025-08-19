// Aqui registra ouvintes de mensagens e coordena fluxos: 
// inicia/para observação na aba, pede snapshots, recebe lots do content, aplica dedupe/retention, atualiza status para o popup

import { 
  MSG_GET_STATUS, 
  MSG_BG_STATUS,
  MSG_CS_CONVERSATION_CHANGE
} from "../common/messaging/channels";

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

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  console.log("[BG] onMessage:", msg, "from tab:", sender.tab?.id);
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

  if (msg?.type === MSG_CS_CONVERSATION_CHANGE) {
    console.log("[BG] conversation change message received:", msg.payload);
    const key = msg?.payload?.conversationKey as string | undefined;
      if (!key) {
        currentStatus.state = "observing";
        currentStatus.conversationKey = key;
        currentStatus.messageCount = 0;
        console.log("[BG] conversation set:", key, "from tab:", sender.tab?.id);
  }

  try {
      sendResponse({ ok: true});
    } catch {}
    return true;
  }
  return false;
});

  chrome.runtime.onInstalled.addListener((d) => {
    console.log("[BG] Extension installed", d);
    currentStatus = { ...DEFAULT_STATUS };
  
});