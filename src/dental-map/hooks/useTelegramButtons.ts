"use client";

import { useEffect } from "react";
import type { Doctor, TelegramWebApp, ViewId } from "../types";

type UseTelegramButtonsArgs = {
  webApp: TelegramWebApp | null;
  activeView: ViewId;
  selectedDoctor: Doctor | null;
  consultationSent: boolean;
  submitting: boolean;
  showBack: boolean;
  onBack: () => void;
  changeView: (view: ViewId) => void;
};

/**
 * Drives the native Telegram BackButton and MainButton so the shell component
 * stays focused on rendering instead of imperative widget wiring.
 */
export function useTelegramButtons({
  webApp,
  activeView,
  selectedDoctor,
  consultationSent,
  submitting,
  showBack,
  onBack,
  changeView
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
    const mainButton = webApp?.MainButton;
    if (!mainButton) {
      return;
    }

    const handleMainButton = () => {
      // While a submit is in flight, the button shows a spinner and is disabled;
      // ignore any stray taps so we never fire a duplicate registration POST.
      if (submitting) {
        return;
      }
      if (activeView === "home" || activeView === "doctors" || activeView === "clinics" || activeView === "map") {
        if (selectedDoctor) {
          changeView("appointment");
        } else {
          changeView("doctors");
        }
        return;
      }
      if (activeView === "appointment") {
        const appointmentForm = document.getElementById("appointment-form");
        if (appointmentForm instanceof HTMLFormElement) {
          appointmentForm.requestSubmit();
        }
        // No fallback: the old submitConsultation() call here flipped a fake
        // "So'rov yuborildi" success WITHOUT creating an appointment when the
        // form wasn't in the DOM (e.g. the doctor dropped out of the list).
        return;
      }
    };

    const buttonText = "Qabulga yozilish";

    // ALLOWLIST: the MainButton is shown only on views its handler actually
    // implements. The old blocklist missed myAppointments/saved/notifications/
    // services and the doctor dashboard views, showing a dead "Qabulga yozilish"
    // button whose taps were silent no-ops.
    const showMainButton =
      (activeView === "appointment" && !consultationSent) ||
      ((activeView === "home" || activeView === "doctors" || activeView === "clinics" || activeView === "map") &&
        Boolean(selectedDoctor));

    if (!showMainButton) {
      mainButton.hide();
    } else {
      mainButton.setText(buttonText);
      mainButton.show();
      mainButton.onClick(handleMainButton);
      if (submitting) {
        mainButton.showProgress?.();
        mainButton.disable();
      } else {
        mainButton.hideProgress?.();
        mainButton.enable();
      }
    }

    return () => {
      mainButton.offClick(handleMainButton);
    };
  }, [
    activeView,
    changeView,
    consultationSent,
    selectedDoctor,
    submitting,
    webApp
  ]);
}
