import type { VercelRequest, VercelResponse } from '@vercel/node';

// Chave da API do Gemini, lida das variáveis de ambiente
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Lista de origens que podem fazer requisições para esta API.
// É crucial para a segurança e para o funcionamento de extensões.
const ALLOWED_ORIGINS = [
  'chrome-extension://jaegpgibeikncjfncollpkpepmmcdgha',
  // Adicione aqui a URL do seu ambiente de desenvolvimento se precisar, ex:
  // 'http://localhost:5173' 
];

/**
 * Middleware para lidar com CORS.
 * Verifica se a origem da requisição está na lista de permitidas.
 */
const allowCors = (fn: (req: VercelRequest, res: VercelResponse) => Promise<void>) => async (req: VercelRequest, res: VercelResponse) => {
  const origin = req.headers.origin;
  console.log(`Requisição recebida da origem: ${origin}`); // Log para debug

  // Se a origem estiver na lista de permitidas, reflete a origem na resposta.
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin'); // Importante para caches
  } else if (!origin) {
    // Permite requisições sem o header 'Origin', como as do Postman ou de servidor para servidor.
    console.log('Requisição sem header de Origem permitida.');
  } else {
    // Bloqueia e avisa sobre origens não permitidas.
    console.warn(`Origem não permitida tentou acessar: ${origin}`);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Responde imediatamente a requisições OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  return await fn(req, res);
};

/**
 * Handler principal da função serverless.
 */
const handler = async (request: VercelRequest, response: VercelResponse): Promise<void> => {
  console.log(`Recebida requisição com método: ${request.method}`);

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
  console.log('Corpo da requisição:', JSON.stringify(request.body, null, 2));

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
      console.error("Erro ao fazer parse da resposta do Gemini como JSON.", responseText);
      response.status(500).json({ error: { message: 'Resposta inválida da API do Gemini', rawResponse: responseText } });
      return;
    }

    response.status(geminiResponse.status).json(data);

  } catch (error: any) {
    console.error("ERRO CRÍTICO: Falha na chamada fetch para a API do Gemini.", error);
    response.status(500).json({ error: { message: 'Falha de comunicação com a API do Gemini.', details: error.message } });
  }
};

// Usa 'export default' para ser compatível com "type": "module" no package.json
export default allowCors(handler);
