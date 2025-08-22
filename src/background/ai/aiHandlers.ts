/**
 * @file Orquestra as chamadas de IA, desde a recepção da mensagem até o envio do resultado.
 */
import { AiRequest, AiResult, AiError } from '../../common/ai/types';
import { getAppSettings } from '../../common/storage/settings';
import { getLastNMessages } from '../../common/ai/windowing';
import { formatConversationForPrompt } from '../../common/ai/format';
import { callGemini } from './geminiProvider';

// Importa os schemas e prompts
import { summarySchema } from '../ai/schemas/summary.schema';
import { suggestionSchema } from '../ai/schemas/suggest.schema';
import { classificationSchema } from '../ai/schemas/classify.schema';
import summarizePrompt from '../ai/prompts/summarize.pt.txt?raw';
import suggestPrompt from '../ai/prompts/suggest.pt.txt?raw';
import classifyPrompt from '../ai/prompts/classify.pt.txt?raw';

/**
 * Lida com uma requisição de IA vinda do overlay.
 * @param message A mensagem de requisição.
 * @param tabId O ID da aba que fez a requisição.
 */
export async function handleAiRequest(message: AiRequest, tabId: number) {
  const { type, payload } = message;
  const startTime = Date.now();

  try {
    const settings = await getAppSettings();
    if (!settings.geminiApiKey) {
      throw new Error("API Key do Gemini não configurada.");
    }

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

    const result = await callGemini(settings.geminiApiKey, settings.aiModel, fullPrompt, schema);

    const tookMs = Date.now() - startTime;
    const resultPayload: AiResult['payload'] = {
      kind,
      conversationKey: payload.conversationKey,
      data: result.data,
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
      tookMs,
    };
    
    chrome.tabs.sendMessage(tabId, { type: 'AI_RESULT', payload: resultPayload });

  } catch (error) {
    const tookMs = Date.now() - startTime;
    const errorPayload: AiError['payload'] = {
      conversationKey: payload.conversationKey,
      reason: error instanceof Error ? error.message : 'Erro desconhecido',
      details: error instanceof Error ? error.stack : undefined,
    };
    console.error("[AI Handler Error]", errorPayload);
    chrome.tabs.sendMessage(tabId, { type: 'AI_ERROR', payload: errorPayload });
  }
}
