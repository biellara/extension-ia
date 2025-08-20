// Define um tipo genérico para as mensagens da extensão
export type Message = {
  type: string;
  payload?: unknown;
};

export function safeSendMessage(message: Message): Promise<unknown | undefined> {
  return new Promise((resolve) => {
    // Se a extensão foi invalidada/recarregada, chrome.runtime.id deixa de existir.
    if (!chrome?.runtime?.id) {
      return resolve(undefined);
    }
    
    try {
      chrome.runtime.sendMessage(message, (response) => {
        resolve(response);
      });
    } catch (error) {
      console.warn("safeSendMessage falhou:", error);
      resolve(undefined);
    }
  });
}
