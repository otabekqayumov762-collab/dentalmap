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
  doctorSubscriptionPaid: boolean;
  submitting: boolean;
  doctorStep: number;
  showBack: boolean;
  onBack: () => void;
  changeView: (view: ViewId) => void;
  submitConsultation: () => void;
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
  doctorSubscriptionPaid,
  submitting,
  doctorStep,
  showBack,
  onBack,
  changeView,
  submitConsultation
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
        } else {
          submitConsultation();
        }
        return;
      }
      if (activeView === "register" && registerRole === "doctor" && doctorRegistrationSent && !doctorSubscriptionPaid) {
        const paymentButton = document.getElementById("doctor-payment-submit");
        if (paymentButton instanceof HTMLButtonElement) {
          paymentButton.click();
        }
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
        : activeView === "register" && registerRole === "doctor" && doctorRegistrationSent && !doctorSubscriptionPaid
          ? "Chekni yuborish"
          : activeView === "register" && registerRole === "doctor"
            ? doctorStep < 3
              ? "Keyingi"
              : "To'lovga o'tish"
            : activeView === "register"
              ? "Profil yaratish"
              : "Qabulga yozilish";

    if (
      activeView === "profile" ||
      activeView === "login" ||
      activeView === "more" ||
      activeView === "feedback" ||
      activeView === "doctorDetail" ||
      ((activeView === "home" || activeView === "doctors" || activeView === "clinics" || activeView === "map") &&
        !selectedDoctor) ||
      (activeView === "register" && registerRole === "user" && userRegistered) ||
      doctorSubscriptionPaid
    ) {
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
    doctorRegistrationSent,
    doctorSubscriptionPaid,
    doctorStep,
    registerRole,
    selectedDoctor,
    submitConsultation,
    submitting,
    userRegistered,
    webApp
  ]);
}
