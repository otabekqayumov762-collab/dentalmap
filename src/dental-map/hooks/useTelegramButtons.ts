"use client";

import { useEffect } from "react";
import type { TelegramWebApp, ViewId } from "../types";

type UseTelegramButtonsArgs = {
  webApp: TelegramWebApp | null;
  activeView: ViewId;
  showBack: boolean;
  onBack: () => void;
};

/**
 * Drives the native Telegram BackButton, and keeps the MainButton hidden.
 *
 * The MainButton used to be driven per view. Telegram paints it as a second
 * full-width bar under the app's own footer, so any screen that already had a
 * primary action showed that action twice — the same label, a different colour,
 * the same result. It is dismissed once here instead.
 */
export function useTelegramButtons({
  webApp,
  activeView,
  showBack,
  onBack
}: UseTelegramButtonsArgs) {
  useEffect(() => {
    if (!webApp?.BackButton) {
      return;
    }

    const handleBack = () => onBack();

    if (showBack) {
      webApp.BackButton.show();
      webApp.BackButton.onClick(handleBack);
    } else {
      webApp.BackButton.hide();
    }

    return () => {
      webApp.BackButton?.offClick(handleBack);
    };
  }, [showBack, onBack, webApp]);

  useEffect(() => {
    // The MainButton is HIDDEN, not driven.
    //
    // Telegram paints it as a second full-width bar below the app's own footer,
    // so every screen that already had a primary button showed the same action
    // twice — "Qabulga yozilish" in the app and "Qabulga yozilish" underneath
    // it, in a different colour, doing the same thing. Two buttons for one
    // action is a question the user has to answer before acting.
    //
    // The app's own buttons stay: they sit where the form is, they carry the
    // submitting state, and they are styled like everything else around them.
    // Telegram's is dismissed once, here, rather than allowlisted per view.
    const mainButton = webApp?.MainButton;
    mainButton?.hide();
  }, [activeView, webApp]);
}
