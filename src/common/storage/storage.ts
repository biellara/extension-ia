import { ConversationMeta, StoredMessage } from "../types/models";
import { getAppSettings } from "./settings";

// --- Funções Utilitárias de Storage ---

async function loadData<T>(key: string, defaultValue: T): Promise<T> {
  try {
    if (!chrome?.runtime?.id) return defaultValue;
    const result = await chrome.storage.local.get(key);
    return result[key] || defaultValue;
  } catch (e) {
    return defaultValue;
  }
}

async function saveData(key: string, value: unknown): Promise<void> {
  try {
    if (!chrome?.runtime?.id) return;
    return await chrome.storage.local.set({ [key]: value });
  } catch (e) {
    // Silencia o erro de contexto invalidado
  }
}

async function removeData(keys: string | string[]): Promise<void> {
  try {
    if (!chrome?.runtime?.id) return;
    return await chrome.storage.local.remove(keys);
  } catch (e) {
     // Silencia o erro de contexto invalidado
  }
}

// --- Lógica de Retenção ---

async function applyRetention(
  conversationKey: string,
  meta: ConversationMeta
): Promise<ConversationMeta> {
  const settings = await getAppSettings();
  const chunksToDelete: string[] = [];
  let totalMessages = meta.messageCount;
  let messagesDeletedCount = 0;

  // Retenção por volume (limite de mensagens)
  if (totalMessages > settings.messageLimit) {
    const chunks = Array.from({ length: meta.chunks }, (_, i) => i + 1);
    for (const chunkNum of chunks) {
      if (totalMessages <= settings.messageLimit) break;

      const chunkKey = `conv:${conversationKey}:chunk:${String(chunkNum).padStart(4, "0")}`;
      const chunk = await loadData<StoredMessage[]>(chunkKey, []);
      if (chunk.length > 0) {
        chunksToDelete.push(chunkKey);
        totalMessages -= chunk.length;
        messagesDeletedCount += chunk.length;
      }
    }
  }

  // TODO: Implementar retenção por tempo (ex: 7 dias) em um passo futuro.

  if (chunksToDelete.length > 0) {
    // Não logamos o conteúdo, apenas a ação
    console.log(`[BG Retention] Apagando ${chunksToDelete.length} chunks e ${messagesDeletedCount} mensagens por exceder o limite de ${settings.messageLimit}.`);
    await removeData(chunksToDelete);
    meta.messageCount = totalMessages;
    // Idealmente, os chunks seriam renumerados, mas para simplicidade, mantemos assim.
  }

  return meta;
}

// --- Funções Principais de Gerenciamento de Dados ---

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

  // Log sem dados sensíveis
  console.log(`[BG Storage] ${newMessages.length} novas mensagens salvas para ${conversationKey}. Total: ${updatedMeta.messageCount}`);
  return updatedMeta;
}

/**
 * Apaga todos os dados associados a uma única conversa.
 * @param conversationKey A chave da conversa a ser apagada.
 */
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
  console.log(`[BG] Dados da conversa ${conversationKey} foram apagados.`);
}
