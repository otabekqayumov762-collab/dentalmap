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
  changeView: (view: ViewId) => void;
  closeNotifications: () => void;
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
  changeView,
  closeNotifications,
  submitConsultation
}: UseTelegramButtonsArgs) {
  useEffect(() => {
    if (!webApp?.BackButton) {
      return;
    }

    const handleBack = () => {
      closeNotifications();
      changeView("home");
    };

    if (activeView === "home") {
      webApp.BackButton.hide();
    } else {
      webApp.BackButton.show();
      webApp.BackButton.onClick(handleBack);
    }

    return () => {
      webApp.BackButton?.offClick(handleBack);
    };
  }, [activeView, changeView, closeNotifications, webApp]);

  useEffect(() => {
    const mainButton = webApp?.MainButton;
    if (!mainButton) {
      return;
    }

    const handleMainButton = () => {
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
        const paymentForm = document.getElementById("doctor-payment-form");
        if (paymentForm instanceof HTMLFormElement) {
          paymentForm.requestSubmit();
        }
        return;
      }
      if (activeView === "register" && registerRole === "user" && userRegistered) {
        return;
      }
      if (activeView === "register") {
        const formId = registerRole === "doctor" ? "doctor-register-form" : "user-register-form";
        const registerForm = document.getElementById(formId);
        if (registerForm instanceof HTMLFormElement) {
          registerForm.requestSubmit();
        }
      }
    };

    const buttonText =
      activeView === "appointment"
        ? "Qabulga yozilish"
        : activeView === "register" && registerRole === "doctor" && doctorRegistrationSent && !doctorSubscriptionPaid
          ? "50 000 so'm to'lash"
          : activeView === "register" && registerRole === "doctor"
            ? "Shifokor anketasini yuborish"
            : activeView === "register"
              ? "Profil yaratish"
              : "Qabulga yozilish";

    if (
      activeView === "profile" ||
      activeView === "more" ||
      activeView === "feedback" ||
      activeView === "doctorDetail" ||
      (activeView === "register" && registerRole === "user" && userRegistered) ||
      doctorSubscriptionPaid
    ) {
      mainButton.hide();
    } else {
      mainButton.setText(buttonText);
      mainButton.enable();
      mainButton.show();
      mainButton.onClick(handleMainButton);
    }

    return () => {
      mainButton.offClick(handleMainButton);
    };
  }, [
    activeView,
    changeView,
    doctorRegistrationSent,
    doctorSubscriptionPaid,
    registerRole,
    selectedDoctor,
    submitConsultation,
    userRegistered,
    webApp
  ]);
}
