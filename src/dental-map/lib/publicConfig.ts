import { isSafeTelegramUrl } from "./url";

const configuredSupportUrl = process.env.NEXT_PUBLIC_SUPPORT_URL?.trim() || "";

/** Build validation makes this mandatory. Runtime still fails closed if a
 * malformed value somehow bypasses the build gate. */
export const SUPPORT_URL = isSafeTelegramUrl(configuredSupportUrl) ? configuredSupportUrl : "";

export const PRIVACY_PATH = "/privacy/";

const configuredBotUrl = process.env.NEXT_PUBLIC_BOT_URL?.trim() || "";
const configuredDirectLink = process.env.NEXT_PUBLIC_MINI_APP_DIRECT_LINK?.trim() || "";

/** Where Payme should send the phone back to after checkout.
 *
 * NOT this app's own URL, which is what it used to be. Payme opens in the
 * system browser on iOS, so redirecting to our web origin loaded a SECOND copy
 * of the app in Safari while the real Mini App sat untouched behind Telegram.
 * The doctor paid and then carried on in the browser, and the `payment_return`
 * marker -- which exists so the Mini App can refresh the subscription -- was
 * read by the copy that could not act on it.
 *
 * A t.me link hands the phone back to Telegram instead. The direct link lands
 * straight in the Mini App and is the one to use; the bot link is the fallback
 * until BotFather `/newapp` is done, and still beats being stranded in Safari.
 */
export const PAYMENT_RETURN_URL = isSafeTelegramUrl(configuredDirectLink)
  ? configuredDirectLink
  : isSafeTelegramUrl(configuredBotUrl)
    ? configuredBotUrl
    : "";


/**
 * The support handle as a person reads it: `@dentalmap_uz`.
 *
 * Derived from SUPPORT_URL rather than configured twice, so the link and the
 * label can never drift apart -- a support username that is written down
 * separately is a support username that eventually points at nobody.
 */
export const SUPPORT_HANDLE = SUPPORT_URL
  ? `@${SUPPORT_URL.replace(/^https:\/\/t\.me\//i, "").replace(/\/+$/, "")}`
  : "";

/**
 * Open the support chat.
 *
 * `openTelegramLink` first, because this is a t.me link and it belongs inside
 * Telegram: `openLink` would hand it to the in-app browser, which then shows a
 * web page telling the user to open Telegram. `window.open` is the last resort
 * for the web build, where neither exists.
 */
export function openSupportChat() {
  if (typeof window === "undefined" || !SUPPORT_URL) {
    return false;
  }
  const telegram = window.Telegram?.WebApp;
  if (telegram?.openTelegramLink) {
    telegram.openTelegramLink(SUPPORT_URL);
    return true;
  }
  if (telegram?.openLink) {
    telegram.openLink(SUPPORT_URL);
    return true;
  }
  window.open(SUPPORT_URL, "_blank", "noopener,noreferrer");
  return true;
}
