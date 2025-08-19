// src/common/messaging/safeSend.ts
export function safeSendMessage(message: any): Promise<any | undefined> {
  return new Promise((resolve) => {
    // se a extensão foi invalidada/recarregada, chrome.runtime.id some
    // @ts-ignore
    if (!chrome?.runtime?.id) return resolve(undefined);
    try {
      chrome.runtime.sendMessage(message, (resp) => {
        // tocar lastError evita throw em dev
        // @ts-ignore
        const _ = chrome.runtime.lastError;
        resolve(resp);
      });
    } catch {
      resolve(undefined);
    }
  });
}
