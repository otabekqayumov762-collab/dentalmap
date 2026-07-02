"use client";

/**
 * Theme resolution + persistence for the mini-app.
 * Priority: explicit saved preference → Telegram host colorScheme → system.
 * The `.dark` class on <html> is the single source of truth for the palette
 * (see the `.dark {}` block in app/globals.css); `data-telegram-theme` is kept
 * in sync so the legacy body/leaflet rules follow too.
 */

export const THEME_STORAGE_KEY = "dental-map-theme";
export type ThemePreference = "light" | "dark";

const DARK_BG = "#101a21";
const DARK_SECONDARY = "#18232c";
const LIGHT_BG = "#f8fbfc";

type TgLike =
  | {
      colorScheme?: string;
      setHeaderColor?: (color: string) => void;
      setBackgroundColor?: (color: string) => void;
    }
  | null
  | undefined;

function getTg(tg?: TgLike): TgLike {
  if (tg) return tg;
  try {
    return (window as unknown as { Telegram?: { WebApp?: TgLike } }).Telegram?.WebApp ?? null;
  } catch {
    return null;
  }
}

export function getStoredPreference(): ThemePreference | null {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

export function systemPrefersDark(): boolean {
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  } catch {
    return false;
  }
}

/** saved preference → Telegram colorScheme → system preference */
export function resolveIsDark(tg?: TgLike): boolean {
  const saved = getStoredPreference();
  if (saved) return saved === "dark";
  const host = getTg(tg);
  if (host?.colorScheme) return host.colorScheme === "dark";
  return systemPrefersDark();
}

export function isDarkActive(): boolean {
  try {
    return document.documentElement.classList.contains("dark");
  } catch {
    return false;
  }
}

/** Applies the resolved theme to <html> and syncs Telegram chrome colors. */
export function applyTheme(isDark: boolean, tg?: TgLike): void {
  try {
    const root = document.documentElement;
    root.classList.toggle("dark", isDark);
    root.dataset.telegramTheme = isDark ? "dark" : "light";
    const host = getTg(tg);
    host?.setHeaderColor?.(isDark ? DARK_SECONDARY : LIGHT_BG);
    host?.setBackgroundColor?.(isDark ? DARK_BG : LIGHT_BG);
  } catch {
    // SSR / restricted env — no-op.
  }
}

/** Persists an explicit user choice and applies it immediately. */
export function setPreference(pref: ThemePreference, tg?: TgLike): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, pref);
  } catch {
    // ignore storage failures
  }
  applyTheme(pref === "dark", tg);
}
