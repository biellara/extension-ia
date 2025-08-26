/**
 * @file Client util para chamar o proxy no Vercel que faz a ponte com a API do Google Gemini.
 * Funciona em extensão (content/background) pois o CORS é tratado no backend.
 */

// 1) Preferir variável de ambiente em build (Vite), senão usa fallback:
const PROXY_API_URL =
  (typeof import.meta !== "undefined" &&
    (import.meta as any).env &&
    (import.meta as any).env.VITE_PROXY_API_URL) ||
  // 👉 Ajuste para o seu domínio Vercel + rota do proxy criada anteriormente
  "https://echo-three-omega.vercel.app/api/gemini";

// Tipos de I/O genéricos (tolerantes a variações de payload)
type MaybeZodSchema =
  | { parse: (input: unknown) => any } // zod-like
  | undefined;

type CallOptions = {
  prompt: string;
  system?: string;
  model?: string; // ex: "gemini-1.5-flash"
  temperature?: number;
  maxOutputTokens?: number;
  responseSchema?: MaybeZodSchema; // caso espere JSON e queira validar
  signal?: AbortSignal; // para cancelamento
};

type CallResult<T = unknown> = {
  data: T | string;
  tokensIn: number;
  tokensOut: number;
  model?: string;
  raw?: any; // resposta completa do backend (se quiser inspecionar)
};

/**
 * callGemini - chama seu proxy no Vercel e retorna o texto (ou JSON se "responseSchema" for fornecido)
 * Tolerante a dois formatos:
 *   A) Resposta do seu proxy: { model, output, raw }
 *   B) Resposta "direta" do Google: { candidates, usageMetadata, ... }
 */
export async function callGemini<T = unknown>({
  prompt,
  system,
  model = "gemini-1.5-flash",
  temperature = 0.7,
  maxOutputTokens = 1024,
  responseSchema,
  signal
}: CallOptions): Promise<CallResult<T>> {
  // Sanitização rápida
  if (!prompt || typeof prompt !== "string") {
    throw new Error("O parâmetro 'prompt' é obrigatório e deve ser string.");
  }

  const body = {
    prompt,
    system,
    model,
    temperature,
    maxOutputTokens
  };

  let resp: Response;
  try {
    resp = await fetch(PROXY_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      // Importante para extensão: deixe o backend tratar CORS
      signal
    });
  } catch (err: any) {
    // Falha de rede / abort / DNS…
    throw new Error(`[Gemini Provider] Falha na requisição: ${err?.message || err}`);
  }

  let json: any;
  try {
    json = await resp.json();
  } catch {
    // às vezes o upstream retorna algo não JSON em erro
    const text = await resp.text().catch(() => "");
    throw new Error(
      `[Gemini Provider] Resposta não-JSON do servidor (status ${resp.status}): ${text || "<vazio>"}`
    );
  }

  if (!resp.ok) {
    // O proxy padroniza erros como { error: "..." }
    const msg = json?.error || `HTTP ${resp.status}`;
    throw new Error(`[Gemini Provider] Erro do servidor: ${msg}`);
  }

  // ---------------------------
  // Suporte aos dois formatos:
  // ---------------------------

  // Formato A) do proxy recomendado: { model, output, raw }
  if (typeof json?.output === "string") {
    const textResponse = json.output as string;

    // Tokens (se o proxy estiver retornando raw do Google)
    const tokensIn: number =
      json?.raw?.usageMetadata?.promptTokenCount ??
      json?.usageMetadata?.promptTokenCount ??
      0;
    const tokensOut: number =
      json?.raw?.usageMetadata?.candidatesTokenCount ??
      json?.usageMetadata?.candidatesTokenCount ??
      0;

    // Se o chamador forneceu um schema (zod-like), tentamos parsear como JSON estruturado
    let data: any = textResponse;
    if (responseSchema) {
      try {
        const parsed = JSON.parse(textResponse);
        data = responseSchema.parse ? responseSchema.parse(parsed) : parsed;
      } catch (e: any) {
        throw new Error(
          `[Gemini Provider] A resposta não é um JSON válido para o schema fornecido: ${e?.message || e}`
        );
      }
    }

    return {
      data,
      tokensIn,
      tokensOut,
      model: json?.model,
      raw: json
    };
  }

  // Formato B) “direto” do Google (caso você aponte para lá sem proxy)
  // { candidates: [{ content: { parts: [{ text }] } }], usageMetadata: {...} }
  if (Array.isArray(json?.candidates) && json.candidates.length > 0) {
    const first = json.candidates[0];
    const textResponse: string =
      first?.content?.parts?.map((p: any) => p?.text ?? "").join("") ??
      first?.content?.parts?.[0]?.text ??
      "";

    if (!textResponse) {
      throw new Error(
        "[Gemini Provider] Resposta inesperada: 'candidates' veio sem texto."
      );
    }

    const tokensIn: number = json?.usageMetadata?.promptTokenCount ?? 0;
    const tokensOut: number = json?.usageMetadata?.candidatesTokenCount ?? 0;

    let data: any = textResponse;
    if (responseSchema) {
      try {
        const parsed = JSON.parse(textResponse);
        data = responseSchema.parse ? responseSchema.parse(parsed) : parsed;
      } catch (e: any) {
        throw new Error(
          `[Gemini Provider] A resposta não é um JSON válido para o schema fornecido: ${e?.message || e}`
        );
      }
    }

    return {
      data,
      tokensIn,
      tokensOut,
      model: json?.model,
      raw: json
    };
  }

  // Nada casou
  throw new Error(
    "[Gemini Provider] Resposta do servidor em formato desconhecido. Verifique o proxy e o payload."
  );
}
