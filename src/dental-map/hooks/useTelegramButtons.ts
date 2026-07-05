"use client";

import { useEffect } from "react";
import type { Doctor, RegisterRole, TelegramWebApp, ViewId } from "../types";

type UseTelegramButtonsArgs = {
  webApp: TelegramWebApp | null;
  activeView: ViewId;
  registerRole: RegisterRole;
  selectedDoctor: Doctor | null;
  userRegistered: boolean;
  doctorRegistrationSent: boolean;
  consultationSent: boolean;
  submitting: boolean;
  doctorStep: number;
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
  registerRole,
  selectedDoctor,
  userRegistered,
  doctorRegistrationSent,
  consultationSent,
  submitting,
  doctorStep,
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
      if (activeView === "register" && registerRole === "user" && userRegistered) {
        return;
      }
      if (activeView === "register" && registerRole === "doctor") {
        // The wizard owns validate/advance/submit behind one stable button —
        // click it (like the payment step) instead of blindly submitting.
        const advanceButton = document.getElementById("doctor-register-advance");
        if (advanceButton instanceof HTMLButtonElement) {
          advanceButton.click();
        }
        return;
      }
      if (activeView === "register") {
        const registerForm = document.getElementById("user-register-form");
        if (registerForm instanceof HTMLFormElement) {
          registerForm.requestSubmit();
        }
      }
    };

    const buttonText =
      activeView === "appointment"
        ? "Qabulga yozilish"
        : activeView === "register" && registerRole === "doctor"
            ? doctorStep < 3
              ? "Keyingi"
              : "Ro'yxatdan o'tish"
            : activeView === "register"
              ? "Profil yaratish"
              : "Qabulga yozilish";

    // ALLOWLIST: the MainButton is shown only on views its handler actually
    // implements. The old blocklist missed myAppointments/saved/notifications/
    // services and the doctor dashboard views, showing a dead "Qabulga yozilish"
    // button whose taps were silent no-ops.
    const showMainButton =
      (activeView === "appointment" && !consultationSent) ||
      (activeView === "register" &&
        !(registerRole === "user" && userRegistered) &&
        !(registerRole === "doctor" && doctorRegistrationSent)) ||
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
    doctorRegistrationSent,
    doctorStep,
    registerRole,
    selectedDoctor,
    submitting,
    userRegistered,
    webApp
  ]);
}
