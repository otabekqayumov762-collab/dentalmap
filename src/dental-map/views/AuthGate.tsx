"use client";

import { Sun } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { BrandLogo } from "../components/common";
import { isDarkActive, setPreference } from "../lib/theme";
import type { RegisterRole } from "../types";
import { cn } from "../ui";
import { LoginView } from "./LoginView";
import { RegisterView } from "./RegisterView";

export type AuthMode = "login" | "register";

export type AuthGateProps = {
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
  onLogin: (login: string, password: string) => Promise<string>;
  role: RegisterRole;
  userRegistered: boolean;
  doctorRegistrationSent: boolean;
  doctorSubscriptionPaid: boolean;
  submitting: boolean;
  doctorStep: number;
  onDoctorStepChange: (step: number) => void;
  onRoleChange: (role: RegisterRole) => void;
  onUserSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onDoctorSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onDoctorPaid: () => void;
};

/**
 * Full-screen authentication wall. The app interior is unreachable until the
 * user logs in or registers (as a patient or a doctor).
 */
export function AuthGate({
  mode,
  onModeChange,
  onLogin,
  role,
  userRegistered,
  doctorRegistrationSent,
  doctorSubscriptionPaid,
  submitting,
  doctorStep,
  onDoctorStepChange,
  onRoleChange,
  onUserSubmit,
  onDoctorSubmit,
  onDoctorPaid
}: AuthGateProps) {
  const [isDarkTheme, setIsDarkTheme] = useState(false);

  useEffect(() => {
    setIsDarkTheme(isDarkActive());
  }, []);

  function toggleTheme() {
    const nextDark = !isDarkTheme;
    setPreference(nextDark ? "dark" : "light");
    setIsDarkTheme(nextDark);
  }

  return (
    <main className="grid min-h-[var(--tg-viewport-height)] justify-items-center bg-surface-100">
      <section className="relative flex w-full min-w-0 max-w-[640px] flex-col gap-5 overflow-x-hidden px-5 pb-10 pt-6">
        <button
          type="button"
          aria-label={isDarkTheme ? "Kunduzgi rejimga o'tish" : "Tungi rejimga o'tish"}
          aria-pressed={isDarkTheme}
          onClick={toggleTheme}
          className={cn(
            "absolute right-5 top-5 inline-flex h-11 w-11 items-center justify-center rounded-2xl border transition-colors",
            isDarkTheme
              ? "border-surface-200 bg-surface-0 text-brand-600 dark:border-white/10 dark:bg-surface-50 dark:text-ink-700"
              : "border-surface-200 bg-surface-0 text-ink-500 hover:bg-surface-100"
          )}
        >
          <Sun size={18} />
        </button>

        <header className="mx-auto mt-8 flex w-full max-w-sm flex-col items-center gap-3 text-center">
          <div className="flex items-center gap-3">
            <BrandLogo className="h-14 w-14 rounded-[22px]" />
            <h1 className="text-[1.55rem] font-black tracking-tight text-ink-900">
              DENTAL <span className="text-brand-500">MAP</span>
            </h1>
          </div>
          <p className="text-sm font-medium leading-relaxed text-ink-500">
            Telefon raqam orqali kiring yoki yangi profil yarating
          </p>
        </header>

        <div className="grid grid-cols-2 gap-1.5 rounded-[24px] border border-surface-200 bg-surface-0 p-1.5 shadow-card dark:bg-surface-50">
          {(["login", "register"] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={mode === value}
              onClick={() => onModeChange(value)}
              className={cn(
                "h-12 rounded-[19px] text-sm font-extrabold transition-colors",
                mode === value
                  ? "bg-brand-500 text-white shadow-card"
                  : "text-ink-500 hover:text-ink-700"
              )}
            >
              {value === "login" ? "Kirish" : "Ro'yxatdan o'tish"}
            </button>
          ))}
        </div>

        {mode === "login" ? (
          <LoginView onLogin={onLogin} onNavigate={() => onModeChange("register")} />
        ) : (
          <RegisterView
            role={role}
            userRegistered={userRegistered}
            doctorRegistrationSent={doctorRegistrationSent}
            doctorSubscriptionPaid={doctorSubscriptionPaid}
            submitting={submitting}
            doctorStep={doctorStep}
            onDoctorStepChange={onDoctorStepChange}
            onRoleChange={onRoleChange}
            onUserSubmit={onUserSubmit}
            onDoctorSubmit={onDoctorSubmit}
            onDoctorPaid={onDoctorPaid}
            onNavigate={() => onModeChange("login")}
          />
        )}
      </section>
    </main>
  );
}
