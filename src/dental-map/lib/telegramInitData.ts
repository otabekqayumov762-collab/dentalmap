"use client";

import type { TelegramWebApp } from "../types";

const INIT_DATA_SESSION_KEY = "dentalmap_telegram_init_data";

function readSessionInitData() {
  try {
    return window.sessionStorage.getItem(INIT_DATA_SESSION_KEY) || "";
  } catch {
    return "";
  }
}

function writeSessionInitData(initData: string) {
  if (!initData) {
    return;
  }
  try {
    window.sessionStorage.setItem(INIT_DATA_SESSION_KEY, initData);
  } catch {
    // Telegram webviews can occasionally deny storage; the fresh value is still usable.
  }
}

export function getTelegramInitData(webApp?: TelegramWebApp | null) {
  const fresh = webApp?.initData || window.Telegram?.WebApp?.initData || "";
  if (fresh) {
    writeSessionInitData(fresh);
    return fresh;
  }
  return readSessionInitData();
}
