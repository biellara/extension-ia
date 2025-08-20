import { ConversationMeta, StoredMessage } from "../types/models";

const CHUNK_SIZE = 200;
const RETENTION_DAYS = 7;
const MAX_MESSAGES_PER_CONV = 2000;

// --- Funções Utilitárias de Storage ---
async function loadData<T>(key: string, defaultValue: T): Promise<T> {
  const result = await chrome.storage.local.get(key);
  return result[key] || defaultValue;
}

async function saveData(key: string, value: unknown): Promise<void> {
  return chrome.storage.local.set({ [key]: value });
}

async function removeData(keys: string | string[]): Promise<void> {
  return chrome.storage.local.remove(keys);
}

// --- Funções de Lógica de Armazenamento ---

function toLocalISO(timeStr: string): string {
  const now = new Date();
  const [hours, minutes] = timeStr.split(":");
  now.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
  return now.toISOString();
}

type IncomingMessage = {
  timestamp: string; // Ex: "14:30"
  digest: string; // Hash único da mensagem

  // optional fields we may get from the collector
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
    .map((m) => ({
      ...m,
      timestampISO: toLocalISO(m.timestamp),
    }))
    // tell TS that timestampISO is present from this point
    .filter((m) => !digestSet.has(m.digest)) as (IncomingMessage & {
    timestampISO: string;
  })[];

  if (newMessages.length === 0) {
    return meta;
  }

  newMessages.forEach((m) => digestSet.add(m.digest));

  let chunkKey = `conv:${conversationKey}:chunk:${String(meta.chunks).padStart(4, "0")}`;
  let currentChunk = await loadData<StoredMessage[]>(chunkKey, []);

  const remainingMessages = [...newMessages];

  while (remainingMessages.length > 0) {
    const spaceInChunk = CHUNK_SIZE - currentChunk.length;
    const raw = remainingMessages.splice(0, spaceInChunk);

    const messagesToAppend: StoredMessage[] = raw.map((m) => {
      const mm = m as IncomingMessage & { timestampISO: string };
      const authorType: StoredMessage["authorType"] =
        mm.authorType === "agent" ? "agent" : "contact"; // normalize
      return {
        timestampISO: mm.timestampISO,
        timestamp: mm.timestamp,
        digest: mm.digest,
        authorType,
        authorLabel: typeof mm.authorLabel === "string" ? mm.authorLabel : "",
        textRaw: typeof mm.textRaw === "string" ? mm.textRaw : "",
      };
    });

    currentChunk.push(...messagesToAppend);
    await saveData(chunkKey, currentChunk);

    if (remainingMessages.length > 0) {
      meta.chunks += 1;
      chunkKey = `conv:${conversationKey}:chunk:${String(meta.chunks).padStart(4, "0")}`;
      currentChunk = [];
    }
  }

  meta.messageCount += newMessages.length;
  meta.latestTimestampISO = newMessages[newMessages.length - 1].timestampISO;

  await saveData(digestsKey, Array.from(digestSet));

  const updatedMeta = await applyRetention(conversationKey, meta);
  await saveData(metaKey, updatedMeta);

  console.log(
    `[BG Storage] ${newMessages.length} novas mensagens salvas para ${conversationKey}. Total: ${updatedMeta.messageCount}`
  );
  return updatedMeta;
}

async function applyRetention(
  conversationKey: string,
  meta: ConversationMeta
): Promise<ConversationMeta> {
  const chunksToDelete: string[] = [];
  let totalMessages = meta.messageCount;
  let messagesDeletedCount = 0;

  // Retenção por volume
  if (totalMessages > MAX_MESSAGES_PER_CONV) {
    const chunks = Array.from({ length: meta.chunks }, (_, i) => i + 1);
    for (const chunkNum of chunks) {
      if (totalMessages <= MAX_MESSAGES_PER_CONV) break;

      const chunkKey = `conv:${conversationKey}:chunk:${String(chunkNum).padStart(4, "0")}`;
      const chunk = await loadData<StoredMessage[]>(chunkKey, []);
      if (chunk.length > 0) {
        chunksToDelete.push(chunkKey);
        totalMessages -= chunk.length;
        messagesDeletedCount += chunk.length;
      }
    }
  }

  // Retenção por tempo (ainda por implementar em detalhe, mas a base está aqui)
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);
  // Aqui entraria a lógica para verificar o timestamp das mensagens em cada chunk

  if (chunksToDelete.length > 0) {
    console.log(
      `[BG Retention] Apagando ${chunksToDelete.length} chunks e ${messagesDeletedCount} mensagens por excesso de volume.`
    );
    await removeData(chunksToDelete);
    meta.messageCount = totalMessages;
    // Aqui seria necessário re-numerar os chunks restantes, mas para simplificar, vamos deixar como está.
  }

  return meta;
}
