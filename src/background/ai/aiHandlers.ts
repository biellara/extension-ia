import { AiRequest, AiResult, AiError } from '../../common/ai/types';
import { getAppSettings } from '../../common/storage/settings';
import { getLastNMessages } from './windowing';
import { formatConversationForPrompt } from '../../common/ai/format';
import { callGemini } from './geminiProvider';
import { summarySchema } from './schemas/summary.schema';
import { suggestionSchema } from './schemas/suggest.schema';
import { classificationSchema } from './schemas/classify.schema';
import { finalizationSchema } from './schemas/finalization.schema';
import { intentSchema } from './schemas/intent.schema'; // Novo
import { summarizePrompt, suggestPrompt, classifyPrompt, finalizePrompt, intentDetectionPrompt } from './prompts';

export async function handleAiRequest(message: AiRequest, tabId: number): Promise<AiResult['payload'] | null> {
  const { type, payload } = message;
  const startTime = Date.now();

  try {
    const settings = await getAppSettings();
    // Para detecção de intenção, usamos uma janela menor para ser mais rápido
    const contextSize = type === 'AI_DETECT_INTENT' ? 10 : settings.contextWindowSize;
    const messages = await getLastNMessages(payload.conversationKey, contextSize);

    if (messages.length < 3) { // Mínimo de 3 mensagens para ter contexto
      return null;
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
      case 'AI_FINALIZE':
        promptText = finalizePrompt;
        schema = finalizationSchema;
        kind = 'finalization';
        break;
      case 'AI_DETECT_INTENT': // Novo
        promptText = intentDetectionPrompt;
        schema = intentSchema;
        kind = 'intent';
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
    // Não envia erro para o overlay em caso de detecção de intenção, para não poluir a tela
    if (type !== 'AI_DETECT_INTENT') {
        console.error("[AI Handler] Erro:", errorPayload);
        chrome.tabs.sendMessage(tabId, { type: 'AI_ERROR', payload: errorPayload });
    }
    return null;
  }
}
