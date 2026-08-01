"use client";

import { Sun } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { BrandLogo } from "../components/common";
import type { OtpIssue } from "../hooks/useDentalData";
import { isDarkActive, setPreference } from "../lib/theme";
import type { RegisterRole, Service, Specialty } from "../types";
import { SegmentedToggle, cn, type SegmentedOption } from "../ui";
import { LoginView } from "./LoginView";
import { RegisterView } from "./RegisterView";

export type AuthMode = "login" | "register";

// No icons here on purpose: "Ro'yxatdan o'tish" already fills half the pill at
// 375px, and an icon in front of it forces the label to truncate.
const modeOptions: Array<SegmentedOption<AuthMode>> = [
  { value: "login", label: "Kirish" },
  { value: "register", label: "Ro'yxatdan o'tish" }
];

export type AuthGateProps = {
  mode: AuthMode;
  registrationOnly?: boolean;
  onModeChange: (mode: AuthMode) => void;
  onLogin: (login: string, password: string) => Promise<string>;
  role: RegisterRole;
  specialties: Specialty[];
  services: Service[];
  taxonomyLoading?: boolean;
  taxonomyError?: string;
  onRetryTaxonomies?: () => void;
  userRegistered: boolean;
  submitting: boolean;
  doctorStep: number;
  onDoctorStepChange: (step: number) => void;
  onRoleChange: (role: RegisterRole) => void;
  onRequestOtp: (phone: string) => Promise<OtpIssue>;
  onVerifyOtp: (phone: string, code: string) => Promise<string>;
  onOtpTokenChange: (token: string | null) => void;
  onUserSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onDoctorSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

/**
 * Full-screen authentication wall. The app interior is unreachable until the
 * user logs in or registers (as a patient or a doctor).
 */
export function AuthGate({
  mode,
  registrationOnly = false,
  onModeChange,
  onLogin,
  role,
  specialties,
  services,
  taxonomyLoading,
  taxonomyError,
  onRetryTaxonomies,
  userRegistered,
  submitting,
  doctorStep,
  onDoctorStepChange,
  onRoleChange,
  onRequestOtp,
  onVerifyOtp,
  onOtpTokenChange,
  onUserSubmit,
  onDoctorSubmit
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
    <main className="grid h-[var(--tg-viewport-height)] min-h-0 justify-items-center overflow-hidden bg-surface-100">
      <section className="relative flex h-full w-full min-w-0 max-w-[640px] flex-col gap-5 overflow-x-hidden overflow-y-auto overscroll-contain px-5 pb-[calc(2.5rem+env(safe-area-inset-bottom))] pt-[calc(1.5rem+env(safe-area-inset-top))] no-scrollbar">
        <button
          type="button"
          aria-label={isDarkTheme ? "Kunduzgi rejimga o'tish" : "Tungi rejimga o'tish"}
          aria-pressed={isDarkTheme}
          onClick={toggleTheme}
          className={cn(
            "absolute right-5 top-5 inline-flex h-11 w-11 items-center justify-center rounded-control border transition-colors",
            isDarkTheme
              ? "border-surface-200 bg-surface-0 text-brand-600 dark:border-white/10 dark:bg-surface-50 dark:text-ink-700"
              : "border-surface-200 bg-surface-0 text-ink-500 hover:bg-surface-100"
          )}
        >
          <Sun size={18} />
        </button>

        <header className="mx-auto mt-8 flex w-full max-w-sm flex-col items-center gap-3 text-center">
          <div className="flex items-center gap-3">
            <BrandLogo className="h-14 w-14 rounded-card" />
            <h1 className="text-[1.55rem] font-black tracking-tight text-ink-900">
              DENTAL <span className="text-brand-500">MAP</span>
            </h1>
          </div>
          <p className="text-sm font-medium leading-relaxed text-ink-500">
            {registrationOnly
              ? "Telegram profilingizni yakunlang va foydalanish turini tanlang"
              : "Telefon raqam orqali kiring yoki yangi profil yarating"}
          </p>
        </header>

        {!registrationOnly && (
          <SegmentedToggle
            value={mode}
            options={modeOptions}
            onChange={onModeChange}
            ariaLabel="Kirish yoki ro'yxatdan o'tish"
          />
        )}

        {!registrationOnly && mode === "login" ? (
          <LoginView onLogin={onLogin} onNavigate={() => onModeChange("register")} />
        ) : (
          <RegisterView
            role={role}
            specialties={specialties}
            services={services}
            taxonomyLoading={taxonomyLoading}
            taxonomyError={taxonomyError}
            onRetryTaxonomies={onRetryTaxonomies}
            userRegistered={userRegistered}
            submitting={submitting}
            doctorStep={doctorStep}
            onDoctorStepChange={onDoctorStepChange}
            onRoleChange={onRoleChange}
            onRequestOtp={onRequestOtp}
            onVerifyOtp={onVerifyOtp}
            onOtpTokenChange={onOtpTokenChange}
            onUserSubmit={onUserSubmit}
            onDoctorSubmit={onDoctorSubmit}
          />
        )}
      </section>
    </main>
  );
}
