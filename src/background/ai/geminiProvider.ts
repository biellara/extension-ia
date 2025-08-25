// src/background/ai/geminiProvider.ts

// URL do seu servidor Vercel (exemplo)
const PROXY_API_URL = "https://extension-ia.vercel.app/api/gemini";

interface GeminiResponse {
  candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
  usageMetadata?: { promptTokenCount: number; candidatesTokenCount: number; }
  error?: { message: string }; // Para capturar erros da API do Google
}

// CORREÇÃO: A função não recebe mais 'apiKey' como argumento.
export async function callGemini(
  model: string,
  prompt: string,
  responseSchema?: object
): Promise<{ data: any; tokensIn: number; tokensOut: number; }> {

  console.log(`[Gemini Provider] Enviando requisição para o modelo: ${model} via Proxy`);

  const response = await fetch(PROXY_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // Envia os dados necessários para o seu servidor proxy
    body: JSON.stringify({ model, prompt, responseSchema })
  });

  // Tenta analisar a resposta como JSON, mesmo que seja um erro
  const result = await response.json() as GeminiResponse;

  // Se a resposta não foi OK (ex: erro 500 do servidor) ou se a Gemini retornou um erro
  if (!response.ok || result.error) {
    console.error("[Gemini Provider] Resposta inválida do proxy ou da API:", result);
    // Lança um erro com a mensagem vinda da API para um feedback mais claro
    throw new Error(result.error?.message || "O servidor proxy retornou uma resposta inválida.");
  }

  if (!result.candidates || result.candidates.length === 0 || !result.candidates[0].content) {
    console.error("[Gemini Provider] Resposta da API sem 'candidates':", result);
    throw new Error("A API do Gemini retornou uma resposta vazia ou em formato inesperado.");
  }

  const textResponse = result.candidates[0].content.parts[0].text;
  
  return {
    data: responseSchema ? JSON.parse(textResponse) : textResponse,
    tokensIn: result.usageMetadata?.promptTokenCount || 0,
    tokensOut: result.usageMetadata?.candidatesTokenCount || 0,
  };
}