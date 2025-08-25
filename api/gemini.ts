// api/gemini.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

const GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY;

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const { model, prompt, responseSchema } = request.body;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

  const payload = {
    // A estrutura do payload que você já tem em geminiProvider.ts
  };

  try {
    const geminiResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await geminiResponse.json();

    if (!geminiResponse.ok) {
      return response.status(geminiResponse.status).json(data);
    }

    response.status(200).json(data);
  } catch (error) {
    response.status(500).json({ error: 'Failed to fetch from Gemini API' });
  }
}