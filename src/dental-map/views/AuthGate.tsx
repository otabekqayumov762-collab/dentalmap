"use client";

import { ArrowLeft, Sun } from "lucide-react";
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
  onPatientStepChange: (step: number) => void;
  /** This Telegram account already has a full profile — registering again cannot
   *  succeed, so the wizard is replaced by the action that can. */
  telegramTaken?: boolean;
  /** Which step the ACTIVE wizard is on — doctor or patient. 1 means the chooser
   *  is still relevant; anything higher means a choice has been made. */
  registerStep: number;
  onExitWizard: () => void;
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
  onPatientStepChange,
  telegramTaken = false,
  registerStep,
  onExitWizard,
  onRoleChange,
  onRequestOtp,
  onVerifyOtp,
  onOtpTokenChange,
  onUserSubmit,
  onDoctorSubmit
}: AuthGateProps) {
  // Login is a single screen with nothing to step through, so only the
  // registration wizard can be "in progress".
  const inWizard = mode === "register" && registerStep > 1;
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

        {/* The header and both toggles are CHOOSERS. Once the doctor is past the
            first step they have chosen, and leaving the controls on screen only
            eats vertical space and invites a mid-flow switch that would discard
            everything typed. They collapse into a single exit affordance. */}
        {!inWizard && (
        <header className="mx-auto mt-4 flex w-full max-w-sm flex-col items-center gap-2 text-center">
          <div className="flex items-center gap-3">
            <BrandLogo className="h-11 w-11" />
            <h1 className="text-2xl font-black tracking-tight text-ink-900">
              DENTAL <span className="text-brand-500">MAP</span>
            </h1>
          </div>
          <p className="text-sm font-medium leading-relaxed text-ink-500">
            {registrationOnly
              ? "Telegram profilingizni yakunlang va foydalanish turini tanlang"
              : "Telefon raqam orqali kiring yoki yangi profil yarating"}
          </p>
        </header>
        )}

        {inWizard && (
          <button
            type="button"
            onClick={onExitWizard}
            className="mt-4 inline-flex h-11 w-fit items-center gap-1.5 rounded-pill border border-control-border/60 bg-control px-4 text-sm font-bold text-ink-700 transition-colors hover:bg-surface-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-0"
          >
            <ArrowLeft size={17} />
            Chiqish
          </button>
        )}

        {telegramTaken && mode === "register" ? (
          <div className="mx-auto w-full max-w-sm rounded-card border border-surface-200 bg-surface-0 p-5 text-center dark:bg-surface-50">
            <p className="text-base font-bold text-ink-900">Bu Telegram hisobida profil bor</p>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-500">
              Qaytadan ro&apos;yxatdan o&apos;tish shart emas. Telefon raqam va parol bilan kiring.
            </p>
            <button
              type="button"
              onClick={() => onModeChange("login")}
              className="mt-4 inline-flex h-12 w-full items-center justify-center rounded-pill bg-gradient-to-r from-brand-500 to-accent-500 text-base font-bold text-on-brand shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-0"
            >
              Kirish
            </button>
          </div>
        ) : null}

        {!inWizard && !registrationOnly && !telegramTaken && (
          <SegmentedToggle
            value={mode}
            options={modeOptions}
            onChange={onModeChange}
            ariaLabel="Kirish yoki ro'yxatdan o'tish"
          />
        )}

        {!registrationOnly && mode === "login" ? (
          <LoginView onLogin={onLogin} onNavigate={() => onModeChange("register")} />
        ) : telegramTaken ? null : (
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
            onPatientStepChange={onPatientStepChange}
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
