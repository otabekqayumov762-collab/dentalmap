/**
 * `crypto.randomUUID` is Chrome 92+ (July 2021) **and** it only exists in a
 * secure context. Android System WebView that has not been updated since then is
 * exactly the tail of devices this app has to survive, and calling the method
 * straight out crashes the view that touched it — which is indistinguishable,
 * from the user's side, from "the app doesn't open".
 *
 * So nothing in the app calls `crypto.randomUUID` directly. It goes through
 * {@link createUuid}, which degrades twice: to `getRandomValues` (Chrome 11), and
 * then to `Math.random`. The last step is not cryptographically strong and must
 * never be used for a secret — these values are collision-avoidance ids
 * (idempotency keys), where a repeat costs a duplicate request, not a breach.
 */

/** RFC 4122 v4 layout. The server-side idempotency check accepts nothing else
 *  (`/^[0-9a-f-]{36}$/`), so every fallback has to produce this exact shape. */
function formatUuid(bytes: Uint8Array): string {
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10xx
  const hex: string[] = [];
  for (let index = 0; index < 16; index += 1) {
    hex.push(bytes[index].toString(16).padStart(2, "0"));
  }
  return (
    hex.slice(0, 4).join("") +
    "-" +
    hex.slice(4, 6).join("") +
    "-" +
    hex.slice(6, 8).join("") +
    "-" +
    hex.slice(8, 10).join("") +
    "-" +
    hex.slice(10, 16).join("")
  );
}

/** A v4-shaped UUID from the strongest source this browser actually has. */
export function createUuid(): string {
  const cryptoApi = globalThis.crypto;
  if (typeof cryptoApi?.randomUUID === "function") {
    try {
      return cryptoApi.randomUUID();
    } catch {
      // Present but refusing — an insecure context, for instance. Fall through.
    }
  }
  const bytes = new Uint8Array(16);
  if (typeof cryptoApi?.getRandomValues === "function") {
    cryptoApi.getRandomValues(bytes);
  } else {
    for (let index = 0; index < 16; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }
  return formatUuid(bytes);
}

export function createIdempotencyKey() {
  return `miniapp-payment-${createUuid()}`;
}
