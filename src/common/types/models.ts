// Aqui vai definir as interfaces de Conversation, Message, Attachment, etc...

// Define a estrutura de uma mensagem como ela será guardada
export interface StoredMessage {
  digest: string;
  timestampISO: string;
  authorType: 'contact' | 'agent';
  authorLabel: string;
  textRaw: string;
}

// Define a estrutura dos metadados de uma conversa
export interface ConversationMeta {
  conversationKey: string;
  messageCount: number;
  latestTimestampISO: string;
  chunks: number; // Número do último chunk de mensagens
  retentionUntil?: string; // Data ISO para a próxima verificação de retenção
}
