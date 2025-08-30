/**
 * @file Define os tipos de dados para as requisições e respostas da IA.
 */

export type AiRequestKind = 'summary' | 'suggestion' | 'classification' | 'finalization' | 'checklist';

// Dados enviados do Overlay para o Background
export interface AiRequest {
  type: 'AI_SUMMARIZE' | 'AI_SUGGEST' | 'AI_CLASSIFY' | 'AI_FINALIZE' | 'AI_EXTRACT_DATA';
  payload: {
    conversationKey: string;
    n?: number; // Para janela de contexto
    lang?: string;
    style?: 'neutro' | 'amigavel' | 'formal';
  };
}

// Dados de sucesso enviados do Background para o Overlay
export interface AiResult {
  type: 'AI_RESULT';
  payload: {
    kind: AiRequestKind;
    conversationKey: string;
    data: unknown; // O JSON retornado pelo Gemini
    tokensIn: number;
    tokensOut: number;
    tookMs: number;
  };
}

// Dados de erro enviados do Background para o Overlay
export interface AiError {
  type: 'AI_ERROR';
  payload: {
    conversationKey: string;
    reason: string;
    details?: string;
  };
}
