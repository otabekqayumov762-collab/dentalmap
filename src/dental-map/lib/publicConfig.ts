import { isSafeTelegramUrl } from "./url";

const configuredSupportUrl = process.env.NEXT_PUBLIC_SUPPORT_URL?.trim() || "";

/** Build validation makes this mandatory. Runtime still fails closed if a
 * malformed value somehow bypasses the build gate. */
export const SUPPORT_URL = isSafeTelegramUrl(configuredSupportUrl) ? configuredSupportUrl : "";

export const PRIVACY_PATH = "/privacy/";
