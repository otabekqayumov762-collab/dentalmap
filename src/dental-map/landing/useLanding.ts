"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getApiUrl } from "../api/dentalMapApi";
import { asLanguage, fallbackContent, type Language, type LandingContent } from "./content";

const STORAGE_KEY = "dentalmap.landing.lang";

/**
 * The language to open in.
 *
 * A returning visitor's choice wins over everything: they have already told us
 * once. Otherwise the browser's own preference, if it is one we speak. Uzbek
 * last, because this is an Uzbek product and that is the safest place to land.
 *
 * Read lazily rather than at module scope: this file is imported during the
 * static export, where there is no window and no visitor.
 */
export function initialLanguage(): Language {
  if (typeof window === "undefined") {
    return "uz";
  }
  try {
    const saved = asLanguage(window.localStorage.getItem(STORAGE_KEY));
    if (saved) {
      return saved;
    }
  } catch {
    // Private mode, or storage disabled. Not a reason to fail.
  }
  for (const candidate of navigator.languages ?? [navigator.language]) {
    const parsed = asLanguage(candidate);
    if (parsed) {
      return parsed;
    }
  }
  return "uz";
}

/**
 * The page's content: bundled copy first, the owner's copy the moment it lands.
 *
 * Never throws and never leaves the page empty. If the API is unreachable -- the
 * exact situation this product has been in for hours at a time -- the visitor
 * still gets a complete page rather than an error, and the only thing missing is
 * whatever the owner has edited since the last release.
 */
export function useLanding(language: Language) {
  const [content, setContent] = useState<LandingContent>(() => fallbackContent(language));
  const [live, setLive] = useState(false);
  // Guards against a slow response for a language the visitor has since left.
  const requested = useRef(language);

  const load = useCallback(async (lang: Language) => {
    requested.current = lang;
    try {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 8000);
      let response: Response;
      try {
        response = await fetch(getApiUrl(`/api/landing/?lang=${lang}`), {
          signal: controller.signal,
          cache: "no-store"
        });
      } finally {
        window.clearTimeout(timeout);
      }
      if (!response.ok) {
        return;
      }
      const payload = (await response.json()) as Partial<LandingContent>;
      if (requested.current !== lang) {
        return;
      }
      // Merged over the bundled copy rather than replacing it, so a field the
      // owner has not filled in yet shows the shipped text instead of a blank.
      const base = fallbackContent(lang);
      setContent({
        ...base,
        ...payload,
        hero: { ...base.hero, ...(payload.hero ?? {}) },
        steps: payload.steps?.length ? payload.steps : base.steps,
        plans: payload.plans ?? base.plans,
        video: { ...base.video, ...(payload.video ?? {}) },
        stats: payload.stats === null ? null : { ...base.stats!, ...(payload.stats ?? {}) },
        lang
      });
      setLive(true);
    } catch {
      // Offline, timed out, blocked: the bundled page stands.
    }
  }, []);

  useEffect(() => {
    setContent((current) => (current.lang === language ? current : fallbackContent(language)));
    void load(language);
  }, [language, load]);

  return { content, live };
}

export function rememberLanguage(lang: Language) {
  try {
    window.localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // Nothing to do; the choice simply will not survive the tab.
  }
}
