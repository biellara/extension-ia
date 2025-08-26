import type { VercelRequest, VercelResponse } from '@vercel/node';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Lista de origens que podem fazer requisições para esta API
const ALLOWED_ORIGINS = [
  'chrome-extension://jaegpgibeikncjfncollpkpepmmcdgha',
  // Adicione aqui a URL do seu ambiente de desenvolvimento se precisar
  // 'http://localhost:5173' 
];

// Função para adicionar os headers CORS à resposta
const allowCors = (fn: (req: VercelRequest, res: VercelResponse) => Promise<void>) => async (req: VercelRequest, res: VercelResponse) => {
  const origin = req.headers.origin;
  console.log(`Requisição recebida da origem: ${origin}`); // Log para debug

  // Verifica se a origem da requisição está na lista de permitidas
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin'); // Informa aos caches que a resposta varia com a origem
  } else {
    console.warn(`Origem não permitida tentou acessar: ${origin}`);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  return await fn(req, res);
};

const handler = async (request: VercelRequest, response: VercelResponse): Promise<void> => {
  // Adicionando logs para diagnóstico
  console.log(`Recebida requisição com método: ${request.method}`);
  console.log('Corpo da requisição:', JSON.stringify(request.body, null, 2));

  if (request.method !== 'POST') {
    response.status(405).json({ error: { message: 'Método não permitido. Apenas POST é aceito.' } });
    return;
  }

  if (!GEMINI_API_KEY) {
    console.error("ERRO FATAL: A variável de ambiente GEMINI_API_KEY não foi configurada no servidor.");
    response.status(500).json({ error: { message: "A API Key do servidor não está configurada." } });
    return;
  }

  const { model, prompt, responseSchema } = request.body;

  if (!model || !prompt) {
    console.error("ERRO: Requisição inválida. 'model' e 'prompt' são obrigatórios.");
    response.status(400).json({ error: { message: "Requisição inválida. Faltando 'model' ou 'prompt' no corpo." } });
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
    console.log(`Resposta recebida do Gemini (Status: ${geminiResponse.status})`);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error("Erro ao fazer parse da resposta do Gemini como JSON.");
      data = { error: { message: 'Resposta inválida da API do Gemini', rawResponse: responseText } };
      response.status(500).json(data);
      return;
    }

    response.status(geminiResponse.status).json(data);

  } catch (error: any) {
    console.error("ERRO CRÍTICO: Falha na chamada fetch para a API do Gemini.", error);
    response.status(500).json({ error: { message: 'Falha de comunicação com a API do Gemini.', details: error.message } });
  }
};

// Alterado de 'export default' para 'module.exports' para compatibilidade com o ambiente da Vercel
module.exports = allowCors(handler);
