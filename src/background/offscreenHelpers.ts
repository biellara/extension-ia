// Este script é executado no service worker (background) para gerenciar o documento offscreen.

const OFFSCREEN_DOCUMENT_PATH = 'offscreen.html';

let creating: Promise<void> | null; // Garante que não tentemos criar o documento várias vezes ao mesmo tempo

// Verifica se o documento offscreen já existe
async function hasDocument(): Promise<boolean> {
  // @ts-ignore - clients.matchAll está disponível em service workers de extensão
  const matchedClients = await self.clients.matchAll();
  for (const client of matchedClients) {
    if (client.url.endsWith(OFFSCREEN_DOCUMENT_PATH)) {
      return true;
    }
  }
  return false;
}

/**
 * Envia uma requisição fetch através do documento offscreen para contornar o CORS.
 * @param url A URL para a qual fazer a requisição.
 * @param options As opções do fetch (method, headers, body).
 * @returns Uma Promise que resolve com os dados da resposta ou rejeita com um erro.
 */
export async function fetchViaOffscreen(url: string, options: RequestInit): Promise<any> {
  // Cria o documento offscreen se ele ainda não existir.
  if (!(await hasDocument())) {
    if (creating) {
      await creating;
    } else {
      creating = chrome.offscreen.createDocument({
        url: OFFSCREEN_DOCUMENT_PATH,
        // CORREÇÃO: Usamos a string 'DOM_PARSER' diretamente para máxima compatibilidade.
        reasons: ['DOM_PARSER' as chrome.offscreen.Reason],
        justification: 'Necessário para analisar dados e contornar restrições de CORS ao chamar a API do Gemini.',
      });
      await creating;
      creating = null;
    }
  }

  // Envia a mensagem para o documento offscreen e aguarda a resposta.
  return new Promise((resolve, reject) => {
    const listener = (message: { type: string; success: boolean; data?: any; error?: any }) => {
      if (message.type === 'offscreen-fetch-result') {
        chrome.runtime.onMessage.removeListener(listener);
        if (message.success) {
          resolve(message.data);
        } else {
          reject(message.error);
        }
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    chrome.runtime.sendMessage({ type: 'offscreen-fetch', payload: { url, options } });
  });
}
