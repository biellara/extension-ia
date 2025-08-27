// Observa mudanças no cabeçalho/contêiner raiz e avisa o BG que a conversa mudou (SPA)

import { selectors } from "./selector";
import { normalizeText, onlyDigits } from "../common/utils/text";
import { sha1 } from "../common/utils/hash";
import { debounce } from "../common/utils/debounce";
import { safeSendMessage, Message } from "../common/messaging/safeSend";
import { MSG_CS_CONVERSATION_CHANGE, MSG_BG_REQUEST_SNAPSHOT, MSG_CS_SNAPSHOT_RESULT, MSG_CS_NEW_MESSAGES, CS_INSERT_SUGGESTION } from "../common/messaging/channels";

type ConversationHeader = { protocol?: string; phone?: string; name?: string };
type MessageData = {
  timestamp: string;
  authorType: 'contact' | 'agent';
  authorLabel: string;
  textRaw: string;
  digest: string;
};

let messageObserver: MutationObserver | null = null;
const processedDigests = new Set<string>();

function findChatInput(): HTMLTextAreaElement | null {
  for (const selector of selectors.chatInput) {
    const inputElement = document.querySelector(selector);
    if (inputElement) {
      return inputElement as HTMLTextAreaElement;
    }
  }
  console.error('[Echo] Campo de input do chat não encontrado.');
  return null;
}

function insertSuggestion(text: string): boolean {
  const input = findChatInput();
  if (input) {
    input.value = text;
    input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
    input.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
    input.focus();
    return true;
  }
  return false;
}

function getHeaderEl(): Element | null {
  return document.querySelector(selectors.headerContainer);
}

function readHeaderFromDiv(): ConversationHeader | null {
  const header = getHeaderEl();
  if (!header) return null;

  const texts = Array.from(header.querySelectorAll(`${selectors.protocolCandidates}, ${selectors.nameCandidates}`))
    .map(el => normalizeText(el.textContent || ""))
    .filter(Boolean);

  let protocol: string | undefined;
  let phone: string | undefined;
  let name: string | undefined;

  for (const t of texts) {
    if (!protocol) {
      const m = t.match(/#\s*\d{3,}/);
      if (m) protocol = m[0].replace(/\s+/g, "");
    }
    if (!phone) {
      const d = onlyDigits(t);
      if (d.length >= 10) phone = d;
    }
  }

  const nameCandidate = texts.find(t => /[A-Za-zÀ-ÿ]/.test(t) && !t.includes("#") && onlyDigits(t).length < 6);
  if (nameCandidate) name = nameCandidate;

  return { protocol, phone, name };
}

async function toConversationKey(h: ConversationHeader) {
  if (h.protocol) return `PROTO#${h.protocol.replace("#","")}`;
  if (h.phone)    return `TEL#${h.phone}`;
  if (h.name)     return `NOME#${h.name}`;
  const raw = [h.protocol, h.phone, h.name].filter(Boolean).join("|") || (getHeaderEl()?.textContent ?? "unknown");
  const digest = await sha1(normalizeText(raw));
  return `HDR#${digest.slice(0,12)}`;
}


let lastKey = "";
const emitChange = debounce(async () => {
  if (messageObserver) {
    messageObserver.disconnect();
    messageObserver = null;
  }
  processedDigests.clear();

  const header = readHeaderFromDiv();
  if (!header) return;
  const key = await toConversationKey(header);
  if (key === lastKey) return;
  lastKey = key;

  await safeSendMessage({
    type: MSG_CS_CONVERSATION_CHANGE,
    payload: { conversationKey: key, header }
  });
}, 350);

function parseMessageFromElement(item: Element): MessageData | null {
  const gridContainer = item.querySelector(selectors.messageGridContainer);
  if (!gridContainer || gridContainer.children.length < 2) {
    return null;
  }

  const isIncoming = gridContainer.children[0].querySelector(selectors.messageAvatar) !== null;
  const authorType = isIncoming ? "contact" : "agent";
  
  const authorEl = item.querySelector(selectors.messageAuthor);
  const authorLabel = normalizeText(authorEl?.textContent || "").replace(":", "");

  const textContainer = authorEl?.parentElement?.querySelector('div[class*="jss"]');
  const textRaw = normalizeText(textContainer?.textContent || "");

  const allSpans = Array.from(item.querySelectorAll('span'));
  const timestampEl = allSpans.find(span => /^\d{2}:\d{2}$/.test(normalizeText(span.textContent || "")));
  const timestamp = timestampEl ? normalizeText(timestampEl.textContent || "") : "";

  if (!textRaw) return null;

  const digest = `${timestamp}|${authorLabel}|${textRaw.slice(0, 50)}`;

  return { timestamp, authorType, authorLabel, textRaw, digest };
}

function collectMessages(): MessageData[] {
  const messageList = document.querySelector(selectors.messageList);
  if (!messageList) return [];

  const messageItems = messageList.querySelectorAll(selectors.messageListItem);
  const messages: MessageData[] = [];

  messageItems.forEach(item => {
    const messageData = parseMessageFromElement(item);
    if (messageData && !processedDigests.has(messageData.digest)) {
      messages.push(messageData);
      processedDigests.add(messageData.digest);
    }
  });

  return messages;
}

const sendNewMessages = debounce((newMessages: MessageData[]) => {
  if (newMessages.length === 0) return;

  safeSendMessage({
    type: MSG_CS_NEW_MESSAGES,
    payload: {
      conversationKey: lastKey,
      messages: newMessages,
    },
  });
}, 350);

let newMessagesBuffer: MessageData[] = [];

function handleNewMessages(mutations: MutationRecord[]) {
  for (const mutation of mutations) {
    mutation.addedNodes.forEach(node => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const messageData = parseMessageFromElement(node as Element);
        if (messageData && !processedDigests.has(messageData.digest)) {
          processedDigests.add(messageData.digest);
          newMessagesBuffer.push(messageData);
        }
      }
    });
  }
  sendNewMessages(newMessagesBuffer);
  newMessagesBuffer = [];
}

function startMessageObserver() {
  const messageList = document.querySelector(selectors.messageList);
  if (!messageList) {
    console.warn("[CS] Não foi possível iniciar o observador: lista de mensagens não encontrada.");
    return;
  }

  if (messageObserver) messageObserver.disconnect();

  messageObserver = new MutationObserver(handleNewMessages);
  messageObserver.observe(messageList, { childList: true, subtree: false });
}

function waitForElement(selector: string, callback: () => void) {
  const interval = setInterval(() => {
    const element = document.querySelector(selector);
    if (element) {
      clearInterval(interval);
      callback();
    }
  }, 200);
}

export function handleBackgroundMessages(message: Message, _sender: chrome.runtime.MessageSender, sendResponse: (response?: unknown) => void): boolean {
    switch (message.type) {
        case MSG_BG_REQUEST_SNAPSHOT: {
            const payload = message.payload as { conversationKey: string };
            waitForElement(selectors.messageList, () => {
                const messages = collectMessages();
                safeSendMessage({
                    type: MSG_CS_SNAPSHOT_RESULT,
                    payload: { conversationKey: payload.conversationKey, messages },
                });
                startMessageObserver();
            });
            return false;
        }

        case CS_INSERT_SUGGESTION: {
            const payload = message.payload as { text: string };
            const success = insertSuggestion(payload.text);
            sendResponse({ success });
            return true;
        }

        default:
            return false;
    }
}

function attachHeaderObserver(headerElement: Element) {
    const observer = new MutationObserver(() => emitChange());
    observer.observe(headerElement, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true
    });
    window.addEventListener("pagehide", () => observer.disconnect());
}

export function startConversationWatcher() {
  const checkInterval = 500;
  const maxAttempts = 40;
  let attempts = 0;

  const intervalId = setInterval(() => {
    const headerNode = getHeaderEl();
    attempts++;

    if (headerNode) {
      clearInterval(intervalId);
      emitChange();
      attachHeaderObserver(headerNode);
    } else if (attempts >= maxAttempts) {
      clearInterval(intervalId);
      console.error("[CS] Não foi possível encontrar o headerContainer após 20 segundos:", selectors.headerContainer);
    }
  }, checkInterval);
}
