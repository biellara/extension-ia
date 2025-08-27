// IMPORTANTE: Substitua pela URL do seu servidor Vercel.
const PROXY_API_URL = "https://echo-extension.vercel.app/api/gemini";

interface GeminiResponse {
  candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
  usageMetadata?: { promptTokenCount: number; candidatesTokenCount: number; };
  error?: { message: string };
}

export async function callGemini(
  model: string,
  prompt: string,
  responseSchema?: object
): Promise<{ data: unknown; tokensIn: number; tokensOut: number; }> {

  const response = await fetch(PROXY_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, prompt, responseSchema })
  });

  const result = await response.json() as GeminiResponse;

  if (!response.ok || result.error) {
    console.error("[Gemini Provider] Resposta inválida do proxy ou da API:", result);
    throw new Error(result.error?.message || "O servidor proxy retornou uma resposta inválida.");
  }

  const candidate = result.candidates?.[0];
  const part = candidate?.content?.parts?.[0];

  if (!part || typeof part.text !== 'string') {
    console.error("[Gemini Provider] Resposta da API em formato inesperado ou vazia (sem 'parts' ou 'text'). Isso pode ser causado por filtros de segurança da API.", result);
    console.log("[Gemini Provider] Resposta completa da Gemini:", JSON.stringify(result, null, 2));
    throw new Error("A API do Gemini retornou uma resposta vazia ou em formato inesperado.");
  }


  const textResponse = part.text;
  
  return {
    data: responseSchema ? JSON.parse(textResponse) : textResponse,
    tokensIn: result.usageMetadata?.promptTokenCount || 0,
    tokensOut: result.usageMetadata?.candidatesTokenCount || 0,
  };
}
