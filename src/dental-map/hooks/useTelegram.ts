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

      // Every SDK call below is version-gated, and Telegram's SDK signals an
      // unsupported method by THROWING Error('WebAppMethodUnsupported') — which
      // optional chaining does not catch, it only guards a *missing* method.
      // A throw escaping this effect would skip setInitialized(true) and hand the
      // whole app to Next's error page, so the entire host handshake sits inside
      // one guard and `initialized` is set in `finally`: a hostile SDK can cost us
      // fullscreen or theme sync, never the app itself. We do not pin the SDK
      // version, so "it only console.warns today" is not a guarantee we control.
      try {
        tg.ready();
        tg.expand();
        // True fullscreen (Bot API 8.0+): expand() only removes the collapsed
        // state — Telegram still keeps its own header bar above the app, which on
        // a phone costs ~90px of the little vertical space there is.
        tg.requestFullscreen?.();
        tg.disableVerticalSwipes?.();
        setupHost(tg);
      } catch {
        // Older or stricter client. Fall back to the plain browser theme so the
        // app still renders in the right colour scheme.
        applyTheme(resolveIsDark(null));
      } finally {
        setInitialized(true);
      }
    };

    const setupHost = (tg: TelegramWebApp) => {
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
