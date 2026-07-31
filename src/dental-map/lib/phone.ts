/** Build a dial link without allowing USSD/pause/control characters. */
export function toSafeTelHref(value?: string | null) {
  const normalized = (value ?? "").trim().replace(/[\s()-]/g, "");
  if (!/^\+?\d+$/.test(normalized)) {
    return "";
  }
  const digitCount = normalized.replace(/\D/g, "").length;
  if (digitCount < 7 || digitCount > 15) {
    return "";
  }
  return `tel:${normalized}`;
}
