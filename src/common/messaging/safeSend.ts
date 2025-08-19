// Define um tipo genérico para as mensagens da extensão
export type Message = {
  type: string;
  payload?: any;
};

export function safeSendMessage(message: Message): Promise<any | undefined> {
  return new Promise((resolve) => {
    // Se a extensão foi invalidada/recarregada, chrome.runtime.id deixa de existir.
    if (!chrome?.runtime?.id) {
      return resolve(undefined);
    }
    
    try {
      chrome.runtime.sendMessage(message, (response) => {
        const _ = chrome.runtime.lastError;
        resolve(response);
      });
    } catch (error) {
      console.warn("safeSendMessage falhou:", error);
      resolve(undefined);
    }
  });
}
