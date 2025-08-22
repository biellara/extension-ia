/**
 * @file Formata um array de mensagens para um formato de texto compacto,
 * ideal para ser incluído em um prompt de IA.
 */
import { StoredMessage } from "../types/models";

/**
 * Converte um array de mensagens em uma string de transcrição compacta.
 * @param messages Array de mensagens salvas.
 * @returns Uma string formatada representando a conversa.
 */
export function formatConversationForPrompt(messages: StoredMessage[]): string {
  const transcript = messages.map(msg => {
    const author = msg.authorType === 'agent' ? 'atendente' : 'cliente';
    const time = new Date(msg.timestampISO).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
    // Escapa aspas e barras invertidas no texto para evitar JSON inválido no prompt
    const text = msg.textRaw.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    return `{ts:"${time}", author:"${author}", text:"${text}"}`;
  }).join(',\n');

  return `[\n${transcript}\n]`;
}
