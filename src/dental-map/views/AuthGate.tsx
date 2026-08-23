"use client";

import { ArrowLeft, Sun } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { BrandLogo } from "../components/common";
import type { OtpIssue } from "../hooks/useDentalData";
import { SUPPORT_HANDLE, openSupportChat } from "../lib/publicConfig";
import { isDarkActive, setPreference } from "../lib/theme";
import type { RegisterRole, Service, Specialty } from "../types";
import { SegmentedToggle, cn, useToast, type SegmentedOption } from "../ui";
// Code-split with the doctor wizard, for the same reason: both carry the OTP
// boxes, and neither is on the path a cold start takes.
import { PasswordResetView } from "./lazyViews";
import { LoginView } from "./LoginView";
import { RegisterView } from "./RegisterView";

/** "reset" is a third screen, not a third tab: it is reached from the login
 *  form and leaves back to it, so it never appears in the toggle. */
export type AuthMode = "login" | "register" | "reset";

// No icons here on purpose: "Ro'yxatdan o'tish" already fills half the pill at
// 375px, and an icon in front of it forces the label to truncate.
const modeOptions: Array<SegmentedOption<AuthMode>> = [
  { value: "login", label: "Kirish" },
  { value: "register", label: "Ro'yxatdan o'tish" }
];

export type AuthGateProps = {
  mode: AuthMode;
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
  /** Which step the ACTIVE wizard is on — doctor or patient. 1 means the chooser
   *  is still relevant; anything higher means a choice has been made. */
  registerStep: number;
  onExitWizard: () => void;
  onRoleChange: (role: RegisterRole) => void;
  onRequestOtp: (phone: string) => Promise<OtpIssue>;
  onVerifyOtp: (phone: string, code: string) => Promise<string>;
  onOtpTokenChange: (token: string | null) => void;
  onRequestPasswordReset: (phone: string) => Promise<OtpIssue>;
  onVerifyPasswordReset: (phone: string, code: string) => Promise<string>;
  /** Resolves true when the reset also signed the user in, so the caller
   *  knows whether to send them to the cabinet or to the login screen. */
  onConfirmPasswordReset: (phone: string, resetToken: string, password: string) => Promise<boolean>;
  onUserSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onDoctorSubmit: (event: FormEvent<HTMLFormElement>) => void;
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
  registerStep,
  onExitWizard,
  onRoleChange,
  onRequestOtp,
  onVerifyOtp,
  onOtpTokenChange,
  onRequestPasswordReset,
  onVerifyPasswordReset,
  onConfirmPasswordReset,
  onUserSubmit,
  onDoctorSubmit
}: AuthGateProps) {
  // Login is a single screen with nothing to step through, so only the
  // registration wizard can be "in progress".
  const inWizard = mode === "register" && registerStep > 1;
  // The reset flow owns the whole screen for the same reason the wizard does:
  // the header and the Kirish/Ro'yxatdan o'tish toggle are choosers, and the
  // user has already chosen. Its own "Kirish" button is the way back.
  // Only the Kirish/Ro'yxatdan o'tish toggle is hidden: it is a chooser, and
  // the user has chosen. The wordmark stays, because the reset flow has no
  // other context of its own — and because the theme button is anchored to the
  // top of this section, so a StepHeader promoted into that band would have its
  // progress segments running under a 44px button.
  const inReset = mode === "reset";
  const { toast } = useToast();
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
      <section className="relative flex h-full w-full min-w-0 max-w-[640px] flex-col gap-8 overflow-x-hidden overflow-y-auto overscroll-contain px-5 pb-[calc(2.5rem+var(--tg-inset-bottom))] pt-[calc(1.5rem+var(--tg-inset-top))] no-scrollbar">
        <button
          type="button"
          aria-label={isDarkTheme ? "Kunduzgi rejimga o'tish" : "Tungi rejimga o'tish"}
          aria-pressed={isDarkTheme}
          onClick={toggleTheme}
          className={cn(
            // Absolutely positioned, so the section's padding-top does NOT move
            // it: without the inset in `top` the theme toggle stays parked under
            // Telegram's fullscreen controls even once the wordmark clears them.
            "absolute right-5 top-[calc(1.25rem+var(--tg-inset-top))] inline-flex h-11 w-11 items-center justify-center rounded-control border transition-colors",
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
            <h1 className="whitespace-nowrap text-2xl font-black tracking-tight text-ink-900">
              DENTAL <span className="text-brand-500">MAP</span>
            </h1>
          </div>
          <p className="text-sm font-medium leading-relaxed text-ink-500">
            {inReset
              ? "Raqamingizni tasdiqlang va yangi parol o'rnating"
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

        {!inWizard && !inReset && (
          <SegmentedToggle
            value={mode}
            options={modeOptions}
            onChange={onModeChange}
            ariaLabel="Kirish yoki ro'yxatdan o'tish"
          />
        )}

        {inReset ? (
          <PasswordResetView
            onRequestCode={onRequestPasswordReset}
            onVerifyCode={onVerifyPasswordReset}
            onConfirm={onConfirmPasswordReset}
            onDone={(message) => {
              onModeChange("login");
              if (message) {
                toast.success(message);
              }
            }}
          />
        ) : mode === "login" ? (
          <LoginView
            onLogin={onLogin}
            onNavigate={() => onModeChange("register")}
            onForgotPassword={() => onModeChange("reset")}
          />
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
            onPatientStepChange={onPatientStepChange}
            onRoleChange={onRoleChange}
            onRequestOtp={onRequestOtp}
            onVerifyOtp={onVerifyOtp}
            onOtpTokenChange={onOtpTokenChange}
            onUserSubmit={onUserSubmit}
            onDoctorSubmit={onDoctorSubmit}
          />
        )}

        {/* Support, at the bottom of the first screen a stranger ever sees.
            Hidden inside the doctor wizard for the same reason the header is:
            that flow is long and vertical space is the scarce thing. Rendered
            only when a handle is actually configured, so a missing env var
            cannot leave a dead "@" on the sign-in screen. */}
        {!inWizard && SUPPORT_HANDLE ? (
          <p className="mx-auto mt-auto w-full max-w-sm pt-2 text-center text-xs text-ink-500">
            Savol yoki muammo bo&apos;lsa —{" "}
            <button
              type="button"
              onClick={openSupportChat}
              className="font-semibold text-brand-600 underline decoration-brand-300 underline-offset-2"
            >
              {SUPPORT_HANDLE}
            </button>
          </p>
        ) : null}
      </section>
    </main>
  );
}
