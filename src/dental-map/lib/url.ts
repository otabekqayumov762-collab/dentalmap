/** True only for http(s) URLs — blocks javascript:/data: and other unsafe schemes. */
export function isSafeHttpUrl(value?: string | null) {
  if (!value) {
    return false;
  }
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/** Opens an external URL in a new tab only when its scheme is safe. */
export function openExternal(value?: string | null) {
  if (!isSafeHttpUrl(value)) {
    return;
  }
  window.open(value as string, "_blank", "noopener,noreferrer");
}
