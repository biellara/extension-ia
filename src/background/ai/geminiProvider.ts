/**
 * @file Contém a lógica central para fazer chamadas à API do Google Gemini.
 */
import { fetchViaOffscreen } from '../offscreenHelpers'; // Importa o helper do offscreen

const API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

interface GeminiResponse {
  candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
  usageMetadata?: { promptTokenCount: number; candidatesTokenCount: number; }
}

export async function callGemini(
  apiKey: string,
  model: string,
  prompt: string,
  responseSchema?: object
): Promise<{ data: any; tokensIn: number; tokensOut: number; }> {

  const url = `${API_BASE_URL}/${model}:generateContent?key=${apiKey}`;
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: responseSchema ? "application/json" : "text/plain",
      ...(responseSchema && { responseSchema }),
      temperature: 0.5,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 1024,
    },
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
    ],
  };

  console.log(`[Gemini Provider] Enviando requisição para o modelo: ${model} via Offscreen`);

  // CORREÇÃO: Usa o helper do offscreen em vez do fetch global para evitar o erro de CORS.
  const result = await fetchViaOffscreen(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }) as GeminiResponse;

  if (!result.candidates || result.candidates.length === 0 || !result.candidates[0].content) {
    console.error("[Gemini Provider] Resposta inválida da API:", result);
    throw new Error("A API do Gemini retornou uma resposta vazia ou inválida.");
  }

  const textResponse = result.candidates[0].content.parts[0].text;
  
  return {
    data: responseSchema ? JSON.parse(textResponse) : textResponse,
    tokensIn: result.usageMetadata?.promptTokenCount || 0,
    tokensOut: result.usageMetadata?.candidatesTokenCount || 0,
  };
}
