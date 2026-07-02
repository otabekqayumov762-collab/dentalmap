import type { FormEvent } from "react";
import { BrandLogo } from "../components/common";
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
  registrationError: string;
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
  registrationError,
  onRoleChange,
  onUserSubmit,
  onDoctorSubmit,
  onDoctorPaid
}: AuthGateProps) {
  return (
    <main className="grid min-h-[var(--tg-viewport-height)] justify-items-center bg-surface-100">
      <section className="flex w-full max-w-[640px] flex-col gap-5 px-5 pb-10 pt-7">
        <header className="flex flex-col items-center gap-2 text-center">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-3xl bg-brand-50">
            <BrandLogo />
          </span>
          <h1 className="text-xl font-extrabold tracking-tight text-ink-900">
            DENTAL <span className="text-brand-500">MAP</span>
          </h1>
          <p className="text-sm text-ink-500">Davom etish uchun tizimga kiring yoki ro&apos;yxatdan o&apos;ting</p>
        </header>

        <div className="grid grid-cols-2 gap-1.5 rounded-pill bg-surface-200/70 p-1">
          {(["login", "register"] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={mode === value}
              onClick={() => onModeChange(value)}
              className={cn(
                "h-10 rounded-pill text-sm font-semibold transition-colors",
                mode === value ? "bg-surface-0 text-brand-600 shadow-card" : "text-ink-500"
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
            registrationError={registrationError}
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
