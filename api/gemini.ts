// api/ai/proxy.ts
// Proxy simples para IA (Gemini). Suporta CORS e OPTIONS (preflight).

type GenerateRequest = {
  prompt: string;
  system?: string;
  model?: string; // ex: "gemini-1.5-flash"
  temperature?: number;
  maxOutputTokens?: number;
};

const ALLOWED_ORIGINS = [
  // Coloque o ID da sua extensão para mais segurança
  // "chrome-extension://abcdefghijklmnopabcdefghijklmnop",
  "*", // durante desenvolvimento; troque por origin específico em produção
];

function corsHeaders(origin: string | null) {
  const allowOrigin =
    origin &&
    (ALLOWED_ORIGINS.includes("*") || ALLOWED_ORIGINS.includes(origin))
      ? origin
      : ALLOWED_ORIGINS.includes("*")
        ? "*"
        : (ALLOWED_ORIGINS[0] ?? "*");

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

export default async function handler(req: any, res: any) {
  const origin = (req.headers?.origin as string) || null;

  // Preflight
  if (req.method === "OPTIONS") {
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Private-Network", "true"); // MV3 em alguns cenários
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v as string));
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v as string));
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { prompt, system, model, temperature, maxOutputTokens } =
      (req.body as GenerateRequest) || {};
    if (!prompt || typeof prompt !== "string") {
      const headers = corsHeaders(origin);
      Object.entries(headers).forEach(([k, v]) =>
        res.setHeader(k, v as string)
      );
      res.status(400).json({ error: "Missing 'prompt' (string)" });
      return;
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      const headers = corsHeaders(origin);
      Object.entries(headers).forEach(([k, v]) =>
        res.setHeader(k, v as string)
      );
      res
        .status(500)
        .json({ error: "Server misconfigured: GEMINI_API_KEY not set" });
      return;
    }

    const chosenModel = model || "gemini-1.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      chosenModel
    )}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;

    const payload = {
      contents: [
        ...(system
          ? [{ role: "user", parts: [{ text: `(system) ${system}` }] }]
          : []),
        { role: "user", parts: [{ text: prompt }] },
      ],
      generationConfig: {
        temperature: typeof temperature === "number" ? temperature : 0.7,
        maxOutputTokens:
          typeof maxOutputTokens === "number" ? maxOutputTokens : 1024,
      },
    };

    const upstream = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await upstream.json();

    const text =
      data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") ??
      data?.candidates?.[0]?.content?.parts?.[0]?.text ??
      "";

    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v as string));
    res.status(200).json({
      model: chosenModel,
      output: text,
      raw: data, // se não quiser expor, remova esta linha
    });
  } catch (err: any) {
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v as string));
    res.status(500).json({ error: err?.message || "Internal error" });
  }
}
