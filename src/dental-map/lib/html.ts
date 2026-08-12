const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#039;"
};

/**
 * Escape text that is about to be interpolated into a raw HTML string.
 *
 * Used for the clinic name inside a Leaflet/Yandex `divIcon`, which takes markup
 * rather than a text node, so this is the only thing standing between a clinic
 * name and script injection on the map.
 *
 * Written as one regex pass on purpose. The previous version chained five
 * `String.prototype.replaceAll` calls — Chrome 85+, August 2020 — and an Android
 * System WebView older than that threw `TypeError: ....replaceAll is not a
 * function` the moment the map rendered its first marker, which is the same
 * blank screen as any other boot failure. `replace(/…/g)` is ES3.
 */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => HTML_ESCAPES[character]);
}
