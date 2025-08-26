// Usa a sintaxe require para importar os tipos, compatível com CommonJS
const { VercelRequest, VercelResponse } = require('@vercel/node');

// Lê a variável de ambiente configurada na Vercel
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Usa module.exports para exportar a função, em vez de 'export default'
module.exports = async (request: typeof VercelRequest, response: typeof VercelResponse) => {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: { message: 'Método não permitido.' } });
  }

  if (!GEMINI_API_KEY) {
    console.error("ERRO: A variável de ambiente GEMINI_API_KEY não foi encontrada.");
    return response.status(500).json({ error: { message: "A API Key do servidor não está configurada." } });
  }

  const { model, prompt, responseSchema } = request.body;
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

    const data = await geminiResponse.json();
    return response.status(geminiResponse.status).json(data);

  } catch (error) {
    console.error("ERRO CRÍTICO: Falha ao fazer a chamada fetch para a API do Gemini.", error);
    return response.status(500).json({ error: { message: 'Falha de comunicação com a API do Gemini.' } });
  }
};