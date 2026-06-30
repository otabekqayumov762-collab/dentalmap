"use client";

import { useEffect, useState } from "react";
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
      document.documentElement.dataset.telegramTheme = "light";
      setInitialized(true);
      return;
    }

    tg.ready();
    tg.expand();
    tg.disableVerticalSwipes?.();
    tg.setHeaderColor?.(tg.themeParams?.secondary_bg_color ?? "#f8fbfc");
    tg.setBackgroundColor?.(tg.themeParams?.bg_color ?? "#f8fbfc");

    const applyTelegramTheme = () => {
      const root = document.documentElement;
      root.dataset.telegramTheme = tg.colorScheme === "dark" ? "dark" : "light";
    };

    applyTelegramTheme();
    tg.onEvent?.("themeChanged", applyTelegramTheme);

    setTelegramUser(tg.initDataUnsafe?.user ?? null);
    setInitialized(true);

    return () => {
      tg.offEvent?.("themeChanged", applyTelegramTheme);
    };
  }, []);

  return { webApp, telegramUser, initialized };
}
