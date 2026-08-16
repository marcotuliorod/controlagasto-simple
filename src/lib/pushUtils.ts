/**
 * Converte uma string Base64 URL-safe para Uint8Array
 * Usado para converter a VAPID public key para o formato necessário pelo PushManager
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Valida se a VAPID public key tem o tamanho correto (65 bytes para P-256 uncompressed)
 */
export function isValidVapidKey(key: Uint8Array): boolean {
  return key.length === 65;
}
