/**
 * @file Busca as últimas N mensagens de uma conversa no storage.
 */
import { ConversationMeta, StoredMessage } from "../types/models";

async function loadData<T>(key: string, defaultValue: T): Promise<T> {
  const result = await chrome.storage.local.get(key);
  return result[key] || defaultValue;
}

/**
 * Coleta as últimas N mensagens de uma conversa, lendo os chunks de trás para frente.
 * @param conversationKey A chave da conversa.
 * @param n O número de mensagens a serem retornadas.
 * @returns Um array com as últimas N mensagens, em ordem cronológica (ascendente).
 */
export async function getLastNMessages(conversationKey: string, n: number): Promise<StoredMessage[]> {
  const metaKey = `conv:${conversationKey}:meta`;
  const meta = await loadData<ConversationMeta | null>(metaKey, null);

  if (!meta || meta.messageCount === 0) {
    return [];
  }

  let messages: StoredMessage[] = [];
  let chunksToRead = meta.chunks;

  while (messages.length < n && chunksToRead > 0) {
    const chunkKey = `conv:${conversationKey}:chunk:${String(chunksToRead).padStart(4, "0")}`;
    const chunk = await loadData<StoredMessage[]>(chunkKey, []);
    messages = [...chunk, ...messages]; // Adiciona no início para manter a ordem
    chunksToRead--;
  }

  // Pega apenas as últimas N mensagens e garante a ordem ascendente
  const finalMessages = messages.slice(-n);

  return finalMessages;
}
