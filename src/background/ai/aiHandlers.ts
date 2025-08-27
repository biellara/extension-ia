import { AiRequest, AiResult, AiError } from '../../common/ai/types';
import { getAppSettings } from '../../common/storage/settings';
import { getLastNMessages } from './windowing';
import { formatConversationForPrompt } from '../../common/ai/format';
import { callGemini } from './geminiProvider';
import { summarySchema } from './schemas/summary.schema';
import { suggestionSchema } from './schemas/suggest.schema';
import { classificationSchema } from './schemas/classify.schema';
import { summarizePrompt, suggestPrompt, classifyPrompt } from './prompts';

export async function handleAiRequest(message: AiRequest, tabId: number): Promise<AiResult['payload'] | null> {
  const { type, payload } = message;
  const startTime = Date.now();

  try {
    const settings = await getAppSettings();
    const messages = await getLastNMessages(payload.conversationKey, settings.contextWindowSize);

    if (messages.length === 0) {
      throw new Error("Não há mensagens nesta conversa para analisar.");
    }

    const formattedConversation = formatConversationForPrompt(messages);
    
    let promptText: string;
    let schema: object | undefined;
    let kind: AiResult['payload']['kind'];

    switch (type) {
      case 'AI_SUMMARIZE':
        promptText = summarizePrompt;
        schema = summarySchema;
        kind = 'summary';
        break;
      case 'AI_SUGGEST':
        promptText = suggestPrompt;
        schema = suggestionSchema;
        kind = 'suggestion';
        break;
      case 'AI_CLASSIFY':
        promptText = classifyPrompt;
        schema = classificationSchema;
        kind = 'classification';
        break;
      default:
        throw new Error("Tipo de requisição de IA desconhecido.");
    }

    const fullPrompt = `${promptText}\n\nTranscrição:\n${formattedConversation}`;
    const result = await callGemini(settings.aiModel, fullPrompt, schema);

    const tookMs = Date.now() - startTime;
    const resultPayload: AiResult['payload'] = {
      kind,
      conversationKey: payload.conversationKey,
      data: result.data,
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
      tookMs,
    };
    
    return resultPayload;

  } catch (error) {
    const errorPayload: AiError['payload'] = {
      conversationKey: payload.conversationKey,
      reason: error instanceof Error ? error.message : 'Erro desconhecido',
      details: error instanceof Error ? error.stack : undefined,
    };
    console.error("[AI Handler] Erro:", errorPayload);
    chrome.tabs.sendMessage(tabId, { type: 'AI_ERROR', payload: errorPayload });
    return null;
  }
}
