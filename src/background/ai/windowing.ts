
import { ConversationMeta, StoredMessage } from "../../common/types/models";

async function loadData<T>(key: string, defaultValue: T): Promise<T> {
  const result = await chrome.storage.local.get(key);
  return result[key] || defaultValue;
}

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
    messages = [...chunk, ...messages]; 
    chunksToRead--;
  }

  const finalMessages = messages.slice(-n);

  return finalMessages;
}
