export function createIdempotencyKey() {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.randomUUID) {
    return `miniapp-payment-${cryptoApi.randomUUID()}`;
  }
  if (cryptoApi?.getRandomValues) {
    const bytes = new Uint8Array(16);
    cryptoApi.getRandomValues(bytes);
    return `miniapp-payment-${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
  }
  return `miniapp-payment-${Date.now()}`;
}
