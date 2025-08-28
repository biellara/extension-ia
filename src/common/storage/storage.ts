import { ConversationMeta, StoredMessage } from "../types/models";
import { getAppSettings } from "./settings";

// --- Funções Utilitárias de Storage ---

async function loadData<T>(key: string, defaultValue: T): Promise<T> {
  try {
    if (!chrome?.runtime?.id) return defaultValue;
    const result = await chrome.storage.local.get(key);
    return result[key] || defaultValue;
  } catch (_e) {
    return defaultValue;
  }
}

async function saveData(key: string, value: unknown): Promise<void> {
  try {
    if (!chrome?.runtime?.id) return;
    return await chrome.storage.local.set({ [key]: value });
  } catch (_e) {
  }
}

async function removeData(keys: string | string[]): Promise<void> {
  try {
    if (!chrome?.runtime?.id) return;
    return await chrome.storage.local.remove(keys);
  } catch (_e) {
  }
}

export async function getConversationMeta(conversationKey: string): Promise<ConversationMeta | null> {
    const metaKey = `conv:${conversationKey}:meta`;
    return await loadData<ConversationMeta | null>(metaKey, null);
}

export async function saveConversationMeta(conversationKey: string, meta: ConversationMeta): Promise<void> {
    const metaKey = `conv:${conversationKey}:meta`;
    await saveData(metaKey, meta);
}


async function applyRetention(
  conversationKey: string,
  meta: ConversationMeta
): Promise<ConversationMeta> {
  const settings = await getAppSettings();
  const chunksToDelete: string[] = [];
  let totalMessages = meta.messageCount;
  let _messagesDeletedCount = 0;

  if (totalMessages > settings.messageLimit) {
    const chunks = Array.from({ length: meta.chunks }, (_, i) => i + 1);
    for (const chunkNum of chunks) {
      if (totalMessages <= settings.messageLimit) break;

      const chunkKey = `conv:${conversationKey}:chunk:${String(chunkNum).padStart(4, "0")}`;
      const chunk = await loadData<StoredMessage[]>(chunkKey, []);
      if (chunk.length > 0) {
        chunksToDelete.push(chunkKey);
        totalMessages -= chunk.length;
        _messagesDeletedCount += chunk.length;
      }
    }
  }

  // TODO: Implementar retenção por tempo (ex: 7 dias) em um passo futuro.

  if (chunksToDelete.length > 0) {
    await removeData(chunksToDelete);
    meta.messageCount = totalMessages;
  }

  return meta;
}


function toLocalISO(timeStr: string): string {
  const now = new Date();
  const [hours, minutes] = timeStr.split(":");
  now.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
  return now.toISOString();
}

type IncomingMessage = {
  timestamp: string;
  digest: string;
  timestampISO?: string;
  authorType?: "contact" | "agent" | string;
  authorLabel?: string;
  textRaw?: string;
  [key: string]: unknown;
};

export async function processMessageBatch(
  conversationKey: string,
  messages: IncomingMessage[]
): Promise<ConversationMeta> {
  const metaKey = `conv:${conversationKey}:meta`;
  const digestsKey = `conv:${conversationKey}:digests`;
  const CHUNK_SIZE = 200;

  let meta = await loadData<ConversationMeta | null>(metaKey, null);
  if (!meta) {
    meta = {
      conversationKey,
      messageCount: 0,
      latestTimestampISO: "",
      chunks: 1,
      status: 'active',
    };
  }

  const digestSet = new Set(await loadData<string[]>(digestsKey, []));

  const newMessages = messages
    .map((m) => ({ ...m, timestampISO: toLocalISO(m.timestamp) }))
    .filter((m) => !digestSet.has(m.digest)) as (IncomingMessage & { timestampISO: string })[];

  if (newMessages.length === 0) {
    return meta;
  }

  newMessages.forEach((m) => digestSet.add(m.digest));

  let chunkKey = `conv:${conversationKey}:chunk:${String(meta.chunks).padStart(4, "0")}`;
  let currentChunk = await loadData<StoredMessage[]>(chunkKey, []);

  for (const message of newMessages) {
    if (currentChunk.length >= CHUNK_SIZE) {
      await saveData(chunkKey, currentChunk);
      meta.chunks += 1;
      chunkKey = `conv:${conversationKey}:chunk:${String(meta.chunks).padStart(4, "0")}`;
      currentChunk = [];
    }
    const authorType: StoredMessage["authorType"] = message.authorType === "agent" ? "agent" : "contact";
    currentChunk.push({
      timestampISO: message.timestampISO,
      digest: message.digest,
      authorType,
      authorLabel: typeof message.authorLabel === "string" ? message.authorLabel : "",
      textRaw: typeof message.textRaw === "string" ? message.textRaw : "",
    });
  }

  await saveData(chunkKey, currentChunk);

  meta.messageCount += newMessages.length;
  meta.latestTimestampISO = newMessages[newMessages.length - 1].timestampISO;

  await saveData(digestsKey, Array.from(digestSet));

  const updatedMeta = await applyRetention(conversationKey, meta);
  await saveData(metaKey, updatedMeta);

  return updatedMeta;
}

export async function clearConversationData(conversationKey: string): Promise<void> {
  if (!conversationKey) return;

  const metaKey = `conv:${conversationKey}:meta`;
  const meta = await loadData<ConversationMeta | null>(metaKey, null);
  if (!meta) return;

  const keysToDelete = [metaKey, `conv:${conversationKey}:digests`];
  for (let i = 1; i <= meta.chunks; i++) {
    keysToDelete.push(`conv:${conversationKey}:chunk:${String(i).padStart(4, "0")}`);
  }

  await removeData(keysToDelete);
}
