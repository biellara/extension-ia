import type { VercelRequest, VercelResponse } from '@vercel/node';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const ALLOWED_ORIGINS = [
  'chrome-extension://jaegpgibeikncjfncollpkpepmmcdgha',
];

const allowCors = (fn: (req: VercelRequest, res: VercelResponse) => Promise<void>) => async (req: VercelRequest, res: VercelResponse) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  // Lógica de CORS
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Responde imediatamente a requisições OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  
  return await fn(req, res);
};

const handler = async (request: VercelRequest, response: VercelResponse): Promise<void> => {
  if (request.method !== 'POST') {
    response.status(405).json({ error: { message: 'Método não permitido.' } });
    return;
  }

  if (!GEMINI_API_KEY) {
    console.error("ERRO: GEMINI_API_KEY não está configurada no servidor.");
    response.status(500).json({ error: { message: "API Key do servidor não configurada." } });
    return;
  }

  const { model, prompt, responseSchema } = request.body;
  
  if (!model || !prompt) {
    response.status(400).json({ error: { message: "Requisição inválida. 'model' e 'prompt' são obrigatórios." } });
    return;
  }
  
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

  const geminiPayload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: responseSchema ? "application/json" : "text/plain",
      ...(responseSchema && { responseSchema }),
      temperature: 0.5,
    },
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
    ],
  };

  try {
    const geminiResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiPayload),
    });

    const responseText = await geminiResponse.text();
    const data = JSON.parse(responseText);

    if (!data.candidates) {
      console.error("Resposta do Gemini sem 'candidates':", data);
      response.status(400).json({ 
        error: { 
          message: 'A API do Gemini retornou um erro.',
          geminiResponse: data
        } 
      });
      return;
    }

    response.status(geminiResponse.status).json(data);

  } catch (error: unknown) {
    console.error("ERRO na chamada para a API do Gemini:", error);
    const errorMessage = typeof error === 'object' && error !== null && 'message' in error ? (error as { message: string }).message : String(error);
    response.status(500).json({ error: { message: 'Falha de comunicação com a API do Gemini.', details: errorMessage } });
  }
};

export default allowCors(handler);
