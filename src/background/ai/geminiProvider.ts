/**
 * @file Contém a lógica central para fazer chamadas à API do Google Gemini.
 */

const API_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>;
    };
  }>;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
  }
}

/**
 * Envia um prompt para a API do Gemini e retorna a resposta.
 * @param apiKey A chave de API do usuário.
 * @param model O modelo a ser usado (ex: 'gemini-1.5-flash-latest').
 * @param prompt O prompt completo a ser enviado.
 * @param responseSchema O schema JSON esperado para a resposta.
 * @returns Um objeto com os dados da resposta e metadados de uso.
 */
export async function callGemini(
  apiKey: string,
  model: string,
  prompt: string,
  responseSchema?: object
): Promise<{ data: any; tokensIn: number; tokensOut: number; }> {

  const url = `${API_ENDPOINT}/${model}:generateContent?key=${apiKey}`;

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
    safetySettings: [ // Configurações de segurança para evitar bloqueios desnecessários
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
    ],
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorBody = await response.json();
    throw new Error(`Erro na API do Gemini: ${response.status} ${response.statusText} - ${JSON.stringify(errorBody)}`);
  }

  const result = (await response.json()) as GeminiResponse;

  if (!result.candidates || result.candidates.length === 0) {
    throw new Error("A API do Gemini não retornou candidatos.");
  }

  const textResponse = result.candidates[0].content.parts[0].text;
  
  return {
    data: responseSchema ? JSON.parse(textResponse) : textResponse,
    tokensIn: result.usageMetadata?.promptTokenCount || 0,
    tokensOut: result.usageMetadata?.candidatesTokenCount || 0,
  };
}
