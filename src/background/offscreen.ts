// Este script é executado no documento offscreen para realizar a chamada fetch.

chrome.runtime.onMessage.addListener(handleMessages);

async function handleMessages(message: { type: string; payload: any }) {
  // Escuta apenas por mensagens do tipo 'offscreen-fetch'
  if (message.type === 'offscreen-fetch') {
    const { url, options } = message.payload;
    try {
      const response = await fetch(url, options);
      const data = await response.json();
      // Envia o resultado (sucesso ou erro da API) de volta para o service worker
      if (!response.ok) {
        chrome.runtime.sendMessage({ type: 'offscreen-fetch-result', success: false, error: data });
      } else {
        chrome.runtime.sendMessage({ type: 'offscreen-fetch-result', success: true, data });
      }
    } catch (error) {
      // Envia um erro de rede (ex: sem internet) de volta
      chrome.runtime.sendMessage({
        type: 'offscreen-fetch-result',
        success: false,
        error: { error: { message: error instanceof Error ? error.message : 'Erro de fetch desconhecido' } },
      });
    }
  }
}
