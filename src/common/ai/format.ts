
import { StoredMessage } from "../types/models";

export function formatConversationForPrompt(messages: StoredMessage[]): string {
  const transcript = messages.map(msg => {
    const author = msg.authorType === 'agent' ? 'atendente' : 'cliente';
    const time = new Date(msg.timestampISO).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
    const text = msg.textRaw.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    return `{ts:"${time}", author:"${author}", text:"${text}"}`;
  }).join(',\n');

  const formattedString = `[\n${transcript}\n]`;

  return formattedString;
}
