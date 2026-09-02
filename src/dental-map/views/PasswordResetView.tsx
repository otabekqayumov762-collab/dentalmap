"use client";

import { ArrowLeft, CheckCircle2, Loader2, Send } from "lucide-react";
import { useRef, useState, type FormEvent, type ReactNode } from "react";
import type { OtpIssue } from "../hooks/useDentalData";
import { Button, Field, PhoneField, cn, errorTextClass } from "../ui";
import { writeLoginDraft } from "./LoginView";
import { OtpStep } from "./register/OtpStep";
import { StepHeader } from "./register/StepHeader";

/**
 * Parolni tiklash — the same three moves as the doctor wizard's phone check
 * (request a code, verify it, spend the ticket) shown with the same segmented
 * header and the same card chrome, because it IS the same mechanism. The code
 * pane is literally OtpStep: its code lifetime, resend action and masked
 * number and its five-attempt handling are all behaviour the reset needs
 * identically, and a second copy would drift.
 *
 * The ticket lives in a ref and never in state or storage: it is a bearer
 * credential for one password change, and React state ends up in dev tools
 * while sessionStorage survives the tab.
 */
const RESET_STEPS = [
  // Not "Telefon raqam": that is the field's own label, and a heading that
  // repeats the label under it names the input twice and the step not at all.
  { id: "phone", title: "Parolni tiklash" },
  { id: "code", title: "Kodni tasdiqlang" },
  { id: "password", title: "Yangi parol" }
] as const;

const TOTAL_RESET_STEPS = RESET_STEPS.length;

type ResetField = "phone" | "password" | "password_confirm";

export type PasswordResetViewProps = {
  variant?: "reset" | "activation";
  initialPhone?: string;
  initialIssue?: OtpIssue;
  onRequestCode: (phone: string) => Promise<OtpIssue>;
  onVerifyCode: (phone: string, code: string) => Promise<string>;
  /** Resolves true when the reset signed the user in. */
  onConfirm: (phone: string, resetToken: string, password: string) => Promise<boolean>;
  /** Back to the sign-in screen — after a successful reset, and from step 1. */
  onDone: (message: string) => void;
};

function Pane({ hidden, intro, children }: { hidden: boolean; intro?: string; children: ReactNode }) {
  return (
    <div className={cn(hidden && "hidden")}>
      <section className="flex flex-col gap-4 rounded-card border border-surface-200 bg-surface-0 p-5 shadow-card dark:bg-surface-50">
        {intro && <p className="text-sm font-medium leading-relaxed text-ink-500">{intro}</p>}
        {children}
      </section>
    </div>
  );
}

export function PasswordResetView({
  variant = "reset",
  initialPhone = "",
  initialIssue,
  onRequestCode,
  onVerifyCode,
  onConfirm,
  onDone
}: PasswordResetViewProps) {
  const activation = variant === "activation";
  const [step, setStep] = useState(initialIssue ? 2 : 1);
  const [phone, setPhone] = useState(initialPhone);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [issue, setIssue] = useState<OtpIssue | null>(initialIssue ?? null);
  const [invalidField, setInvalidField] = useState<ResetField | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const ticketRef = useRef("");

  function fail(field: ResetField | null, text: string) {
    setInvalidField(field);
    setMessage(text);
  }

  function clear(field: ResetField) {
    setMessage((current) => (invalidField === field ? "" : current));
    setInvalidField((current) => (current === field ? null : current));
  }

  async function sendCode() {
    if (phone.replace(/\D/g, "").length < 12) {
      fail("phone", "Telefon raqamni to'liq kiriting.");
      return;
    }
    setBusy(true);
    try {
      setIssue(await onRequestCode(phone));
      fail(null, "");
      setStep(2);
    } catch (cause) {
      fail("phone", cause instanceof Error ? cause.message : "Kod yuborilmadi. Qayta urinib ko'ring.");
    } finally {
      setBusy(false);
    }
  }

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length < 8) {
      fail("password", "Parol kamida 8 ta belgidan iborat bo'lishi kerak.");
      return;
    }
    if (password !== passwordConfirm) {
      fail("password_confirm", "Parollar bir xil emas.");
      return;
    }
    setBusy(true);
    try {
      const signedIn = await onConfirm(phone, ticketRef.current, password);
      // The server has just ended every session this account had, including any
      // the thief was holding. Nothing about the old password is worth keeping.
      ticketRef.current = "";
      setPassword("");
      setPasswordConfirm("");
      if (signedIn) {
        // Straight into the cabinet. They proved the phone with an SMS code and
        // chose this password a second ago; asking for it back is a form for its
        // own sake, and a login screen right after "parol yangilandi" reads as
        // though the reset had not worked.
        onDone("Parol yangilandi.");
        return;
      }
      // No session came back — an older backend during a rolling deploy. Land on
      // sign-in with the number already filled, so the only thing left to type
      // is the password that was just chosen.
      writeLoginDraft(phone);
      onDone("Parol yangilandi. Endi yangi parol bilan kiring.");
    } catch (cause) {
      fail(
        "password",
        cause instanceof Error ? cause.message : "Parolni yangilab bo'lmadi. Qayta urinib ko'ring."
      );
    } finally {
      setBusy(false);
    }
  }

  function goBack() {
    if (activation && step === 2) {
      setIssue(null);
      onDone("");
      return;
    }
    if (step === 1) {
      onDone("");
      return;
    }
    fail(null, "");
    // Stepping back off the code pane drops the ticket with it: it is bound to
    // the number that was verified, and the number is what step 1 edits.
    if (step === 2) {
      setIssue(null);
    }
    if (step === 3) {
      ticketRef.current = "";
    }
    setStep(step - 1);
  }

  return (
    <form noValidate className="flex flex-col gap-4" onSubmit={submitPassword}>
      <StepHeader
        step={activation ? step - 1 : step}
        total={activation ? 2 : TOTAL_RESET_STEPS}
        title={
          activation
            ? step === 2
              ? "Raqamni tasdiqlang"
              : "Shaxsiy parol yarating"
            : RESET_STEPS[step - 1].title
        }
      />

      <Pane
        hidden={step !== 1}
        // Careful wording: the backend answers a number with no account exactly
        // as it answers one with an account, so nothing here may promise an SMS
        // outright — that promise would be a lie for half the people who read
        // it, and the answer to "is this number registered?" for the other half.
        intro="Hisobingizga bog'langan raqamni kiriting. Agar bu raqamda hisob bo'lsa, tasdiqlash kodi SMS orqali yuboriladi."
      >
        <PhoneField
          label="Telefon raqam"
          value={phone}
          error={invalidField === "phone"}
          onValueChange={(next) => {
            setPhone(next);
            clear("phone");
          }}
        />
      </Pane>

      <Pane hidden={step !== 2}>
        <OtpStep
          active={step === 2}
          phone={phone}
          issue={issue}
          sentText={
            activation
              ? "Vaqtinchalik kirishni tasdiqlash uchun ushbu raqamga 6 xonali kod yuborildi."
              : "Agar bu raqamda hisob bo'lsa, unga 6 xonali kod yuborildi."
          }
          verified={false}
          formSubmitting={busy}
          onRequestOtp={onRequestCode}
          onVerifyOtp={onVerifyCode}
          onIssue={setIssue}
          onVerified={(token) => {
            ticketRef.current = token;
            setStep(3);
          }}
          onEditPhone={() => {
            setIssue(null);
            if (activation) {
              onDone("");
            } else {
              setStep(1);
            }
          }}
        />
      </Pane>

      <Pane
        hidden={step !== 3}
        intro={
          activation
            ? "Endi faqat o'zingiz biladigan yangi parol yarating. Vaqtinchalik parol shu zahoti bekor qilinadi."
            : "Yangi parol o'ylab toping. Uni saqlaganimizdan keyin boshqa barcha qurilmalardagi seanslar tugatiladi."
        }
      >
        <Field
          label="Yangi parol"
          type="password"
          minLength={8}
          autoComplete="new-password"
          placeholder="Kamida 8 ta belgi"
          value={password}
          error={invalidField === "password"}
          onChange={(event) => {
            setPassword(event.target.value);
            clear("password");
          }}
        />
        <Field
          label="Parolni takrorlang"
          type="password"
          minLength={8}
          autoComplete="new-password"
          placeholder="Parolni qayta kiriting"
          value={passwordConfirm}
          error={invalidField === "password_confirm"}
          onChange={(event) => {
            setPasswordConfirm(event.target.value);
            clear("password_confirm");
          }}
        />
      </Pane>

      {message && (
        <small className={errorTextClass} role="alert">
          {message}
        </small>
      )}

      <div className="flex gap-3">
        <Button
          type="button"
          variant="secondary"
          size="lg"
          className="w-auto px-5"
          disabled={busy}
          onClick={goBack}
        >
          <ArrowLeft size={18} aria-hidden="true" />
          {step === 1 || (activation && step === 2) ? "Kirish" : "Orqaga"}
        </Button>

        {/* Step 2 has no button here on purpose: its CTA is OtpStep's own
            "Tasdiqlash", and a second primary that cannot do anything until the
            code is verified is a trap rather than a shortcut. */}
        {step === 1 && (
          <Button
            type="button"
            variant="gradient"
            size="lg"
            className="flex-1"
            disabled={busy}
            onClick={() => void sendCode()}
          >
            {busy ? (
              <Loader2 size={18} className="animate-spin" aria-hidden="true" />
            ) : (
              <Send size={18} aria-hidden="true" />
            )}
            {/* One icon only: with a trailing arrow as well, the label wrapped
                onto two lines inside the pill at 360px. */}
            {busy ? "Kod yuborilmoqda…" : "Kod yuborish"}
          </Button>
        )}

        {step === 3 && (
          <Button type="submit" variant="gradient" size="lg" className="flex-1" disabled={busy}>
            {busy ? (
              <Loader2 size={18} className="animate-spin" aria-hidden="true" />
            ) : (
              <CheckCircle2 size={18} aria-hidden="true" />
            )}
            {/* "Parolni yangilash" wrapped onto two lines inside the pill at
                360px; the step is already titled "Yangi parol". */}
            {busy ? "Saqlanmoqda…" : "Saqlash"}
          </Button>
        )}
      </div>
    </form>
  );
}
