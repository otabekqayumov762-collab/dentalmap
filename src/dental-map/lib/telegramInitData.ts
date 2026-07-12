"use client";

import type { TelegramWebApp } from "../types";

/** Return only the live, Telegram-provided signed payload. Persisting initData
 * creates a replayable credential cache and can outlive the host session. */
export function getFreshTelegramInitData(webApp?: TelegramWebApp | null) {
  if (webApp?.initData) {
    return webApp.initData;
  }
  return typeof window === "undefined" ? "" : window.Telegram?.WebApp?.initData || "";
}
