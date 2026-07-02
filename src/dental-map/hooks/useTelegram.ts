"use client";

import { useEffect, useState } from "react";
import { applyTheme, getStoredPreference, resolveIsDark } from "../lib/theme";
import type { TelegramUser, TelegramWebApp } from "../types";

/**
 * Detects the Telegram WebApp host, wires up the theme and viewport, and exposes
 * the resolved web app + user. `initialized` flips to true once detection runs so
 * downstream session logic can react exactly once.
 */
export function useTelegram() {
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);
  const [telegramUser, setTelegramUser] = useState<TelegramUser | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const tg = window.Telegram?.WebApp ?? null;
    setWebApp(tg);

    if (!tg) {
      applyTheme(resolveIsDark(null));
      setInitialized(true);
      return;
    }

    tg.ready();
    tg.expand();
    tg.disableVerticalSwipes?.();

    // Initial theme: saved preference → Telegram colorScheme → system.
    applyTheme(resolveIsDark(tg), tg);

    // Follow the host only while the user hasn't set an explicit preference.
    const applyTelegramTheme = () => {
      if (getStoredPreference()) return;
      applyTheme(tg.colorScheme === "dark", tg);
    };
    tg.onEvent?.("themeChanged", applyTelegramTheme);

    setTelegramUser(tg.initDataUnsafe?.user ?? null);
    setInitialized(true);

    return () => {
      tg.offEvent?.("themeChanged", applyTelegramTheme);
    };
  }, []);

  return { webApp, telegramUser, initialized };
}
