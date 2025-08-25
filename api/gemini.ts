// Usa a sintaxe require para importar os tipos, compatível com CommonJS
const { VercelRequest, VercelResponse } = require('@vercel/node');

// Lê a variável de ambiente configurada na Vercel
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Usa module.exports para exportar a função, em vez de 'export default'
// CORREÇÃO: Adiciona os tipos VercelRequest e VercelResponse aos parâmetros
module.exports = async (request: typeof VercelRequest, response: typeof VercelResponse) => {
  // 1. Loga o corpo da requisição recebida
  console.log("Corpo da requisição recebida:", request.body);

  if (request.method !== 'POST') {
    return response.status(405).json({ error: { message: 'Método não permitido.' } });
  }

  // 2. Valida se a API Key foi carregada
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
    console.log(`Enviando para a API do Gemini no endpoint: ${url}`);
    
    // O fetch já é global no ambiente Node.js da Vercel, não precisa de import
    const geminiResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiPayload),
    });

    const data = await geminiResponse.json();

    // 3. Loga a resposta recebida da Gemini (seja sucesso ou erro)
    console.log("Resposta recebida da API Gemini:", { status: geminiResponse.status, body: data });

    // Repassa a resposta da Gemini para o cliente
    return response.status(geminiResponse.status).json(data);

  } catch (error) {
    // 4. Loga erros de rede
    console.error("ERRO CRÍTICO: Falha ao fazer a chamada fetch para a API do Gemini.", error);
    return response.status(500).json({ error: { message: 'Falha de comunicação com a API do Gemini.' } });
  }
};
