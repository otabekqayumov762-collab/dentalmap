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
    let cancelled = false;
    let retryTimer: number | undefined;
    let cleanupTheme: (() => void) | undefined;
    let cleanupViewport: (() => void) | undefined;
    const startedAt = Date.now();

    const setup = (tg: TelegramWebApp | null) => {
      if (cancelled) {
        return;
      }
      setWebApp(tg);

      if (!tg) {
        applyTheme(resolveIsDark(null));
        setInitialized(true);
        return;
      }

      tg.ready();
      tg.expand();
      tg.disableVerticalSwipes?.();

      // Telegram Desktop and mobile clients expose the usable WebApp height.
      // `100vh/100svh` can include host chrome, which made the auth form grow
      // behind Telegram's header and forced the whole document to scroll.
      const applyTelegramViewport = () => {
        const height = tg.viewportStableHeight || tg.viewportHeight;
        if (height && Number.isFinite(height) && height > 0) {
          document.documentElement.style.setProperty("--tg-viewport-height", `${Math.round(height)}px`);
        }
      };
      applyTelegramViewport();
      tg.onEvent?.("viewportChanged", applyTelegramViewport);
      cleanupViewport = () => {
        tg.offEvent?.("viewportChanged", applyTelegramViewport);
        document.documentElement.style.removeProperty("--tg-viewport-height");
      };

      // Initial theme: saved preference → Telegram colorScheme → system.
      applyTheme(resolveIsDark(tg), tg);

      // Follow the host only while the user hasn't set an explicit preference.
      const applyTelegramTheme = () => {
        if (getStoredPreference()) return;
        applyTheme(tg.colorScheme === "dark", tg);
      };
      tg.onEvent?.("themeChanged", applyTelegramTheme);
      cleanupTheme = () => tg.offEvent?.("themeChanged", applyTelegramTheme);

      setTelegramUser(tg.initDataUnsafe?.user ?? null);
      setInitialized(true);
    };

    const detect = () => {
      const tg = window.Telegram?.WebApp ?? null;
      if (tg || Date.now() - startedAt > 2500) {
        setup(tg);
        return;
      }
      retryTimer = window.setTimeout(detect, 50);
    };

    detect();

    return () => {
      cancelled = true;
      if (retryTimer) {
        window.clearTimeout(retryTimer);
      }
      cleanupTheme?.();
      cleanupViewport?.();
    };
  }, []);

  return { webApp, telegramUser, initialized };
}
