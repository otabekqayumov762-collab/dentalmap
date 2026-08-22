"use client";

import { ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { genderOptions } from "../../catalog";
import { PrivacyAcknowledgement } from "../../components/PrivacyAcknowledgement";
import type { OtpIssue } from "../../hooks/useDentalData";
import { otpEnabled } from "../../lib/otp";
import {
  Button,
  Field,
  OptionGrid,
  PhoneField,
  cn,
  errorTextClass,
  labelClass,
  useToast
} from "../../ui";
import { StepHeader } from "./StepHeader";

/**
 * The code-entry pane, kept OFF the first-paint chunk.
 *
 * This form is statically imported by the shell, so a plain import would put
 * the six OTP boxes in front of every cold start — the exact cost the ui barrel
 * refuses to re-export OtpCodeInput to avoid, and 2 kB gzip against a 150 kB
 * budget that has 0.5 kB left. Rendering it inside an always-mounted (hidden)
 * pane means the chunk starts loading when the wizard mounts, long before the
 * patient has typed a phone number, so nothing is ever waited on.
 */
const OtpStep = dynamic(() => import("./OtpStep").then((m) => m.OtpStep), {
  ssr: false,
  loading: () => null
});

/**
 * The patient wizard, built on the same bones as the doctor one.
 *
 * Panes are HIDDEN, never unmounted, for the same reason: the password inputs
 * stay mounted for the whole flow so the value never has to be serialized into
 * storage to survive a step change, and `new FormData(formRef.current)` at the
 * end still sees every field regardless of which pane is on screen. That is also
 * why this stays one <form> with one submit — DentalMapApp.sendUserRegistration
 * is untouched.
 *
 * Four panes, not the doctor's seven: a patient supplies far less, and padding
 * the flow with near-empty screens would make signup feel longer than it is.
 * The SMS pane is the one they share — see the note on it below.
 */
const USER_STEPS = [
  { id: "identity", title: "Shaxsiy ma'lumotlar", intro: "Ism va telefon raqamingizni kiriting." },
  { id: "otp", title: "Kodni tasdiqlang", intro: "" },
  { id: "password", title: "Parol yarating", intro: "Hisobingizga kirish uchun parol o'ylab toping." },
  { id: "profile", title: "Yakuniy", intro: "Bu ma'lumotlar shifokor tanlashda yordam beradi." }
] as const;

const TOTAL_USER_STEPS = USER_STEPS.length;
const IDENTITY_STEP = 1;
const OTP_STEP = 2;

type UserField =
  | "full_name"
  | "phone"
  | "sms_consent"
  | "otp_token"
  | "password"
  | "password_confirm"
  | "privacy_acknowledged";

function Pane({ hidden, intro, children }: { hidden: boolean; intro?: ReactNode; children: ReactNode }) {
  return (
    <div className={cn(hidden && "hidden")}>
      <section className="flex flex-col gap-4 rounded-card border border-surface-200 bg-surface-0 p-5 shadow-card dark:bg-surface-50">
        {intro && <p className="text-sm font-medium leading-relaxed text-ink-500">{intro}</p>}
        {children}
      </section>
    </div>
  );
}

export function UserRegistrationForm({
  userGender,
  userRegistered,
  submitting,
  onGenderChange,
  onRequestOtp,
  onVerifyOtp,
  onOtpTokenChange,
  onSubmit,
  onStepChange
}: {
  userGender: string;
  userRegistered: boolean;
  submitting: boolean;
  onGenderChange: (gender: string) => void;
  onRequestOtp: (phone: string) => Promise<OtpIssue>;
  onVerifyOtp: (phone: string, code: string) => Promise<string>;
  onOtpTokenChange: (token: string | null) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  /** Mirrored to the shell so the auth chrome can collapse once a choice is made. */
  onStepChange?: (step: number) => void;
}) {
  const { toast } = useToast();
  const [invalidField, setInvalidField] = useState<UserField | null>(null);
  const [invalidMessage, setInvalidMessage] = useState("");
  const [step, setStep] = useState(1);
  const [phoneValue, setPhoneValue] = useState("");
  const [otpIssue, setOtpIssue] = useState<OtpIssue | null>(null);
  // The identity pane owns its own in-flight flag: a 429 or a 503 from the SMS
  // provider must keep the user on the pane, not advance and not block the form.
  const [requestingOtp, setRequestingOtp] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  // MEMORY ONLY, exactly as in the doctor wizard: the signed ticket never
  // touches sessionStorage, localStorage, the URL or a DOM value attribute. A
  // reload loses it and the patient restarts at the identity pane.
  const otpTokenRef = useRef<string | null>(null);
  // The phone the live token belongs to; editing the number invalidates it.
  const verifiedPhoneRef = useRef("");
  // The number the code in flight was sent to. Not the same question as the one
  // above: a code can be unspent and still perfectly good.
  const issuedPhoneRef = useRef("");

  function goToStep(next: number) {
    const clamped = Math.min(Math.max(next, 1), TOTAL_USER_STEPS);
    setStep(clamped);
    onStepChange?.(clamped);
  }
  const formRef = useRef<HTMLFormElement | null>(null);

  function fail(field: UserField, message: string) {
    setInvalidField(field);
    setInvalidMessage(message);
    toast.error(message);
  }

  /**
   * Validate only the pane in front of the user.
   *
   * Checking the whole form on every step would reject step 1 for a password
   * they have not been asked for yet. The thresholds mirror
   * DentalMapApp.sendUserRegistration, which stays as the backstop.
   */
  function validateStep(target: number): { field: UserField; message: string } | null {
    const form = formRef.current;
    if (!form) {
      return null;
    }
    const data = new FormData(form);
    const value = (key: string) => String(data.get(key) || "").trim();

    if (target === 1) {
      if (value("full_name").length < 2) {
        return { field: "full_name", message: "F.I.O. ni to'liq kiriting." };
      }
      if (value("phone").replace(/\D/g, "").length < 12) {
        return { field: "phone", message: "Telefon raqamni to'liq kiriting." };
      }
      // Only when a code will actually be sent. With OTP off the pane is
      // skipped, so demanding consent for an SMS that never happens would block
      // the flow on a promise nobody is making.
      if (otpEnabled && value("sms_consent") !== "yes") {
        return { field: "sms_consent", message: "SMS kod yuborilishiga rozilik bering." };
      }
      return null;
    }

    if (target === 2) {
      if (otpEnabled && !otpTokenRef.current) {
        return { field: "otp_token", message: "Avval telefon raqamni kod orqali tasdiqlang." };
      }
      return null;
    }

    if (target === 3) {
      if (value("password").length < 8) {
        return { field: "password", message: "Parol kamida 8 ta belgidan iborat bo'lishi kerak." };
      }
      if (value("password") !== value("password_confirm")) {
        return { field: "password_confirm", message: "Parollar bir xil emas." };
      }
      return null;
    }

    // Gender and age are optional — gating them would block signup on data the
    // backend does not require. The privacy acknowledgement is not optional.
    if (target === 4) {
      if (value("privacy_acknowledged") !== "yes") {
        return { field: "privacy_acknowledged", message: "Maxfiylik qoidalarini o'qib tasdiqlang." };
      }
    }
    return null;
  }

  /** Verified means done with this pane, so move on rather than parking the
   *  user in front of a filled-in code with a button still to press. Password
   *  reset already worked this way; the two wizards did not, and the extra tap
   *  read as the code not having registered. OtpStep holds its confirmation
   *  beat before calling this, so the jump is not mid-keystroke. */
  function storeToken(token: string | null) {
    otpTokenRef.current = token;
    verifiedPhoneRef.current = token ? phoneValue : "";
    setOtpVerified(Boolean(token));
    onOtpTokenChange(token);
    if (token) {
      goToStep(OTP_STEP + 1);
    }
  }

  /** The identity pane's CTA: validate, then buy the code before advancing. */
  async function advanceFromIdentity() {
    const result = validateStep(IDENTITY_STEP);
    if (result) {
      fail(result.field, result.message);
      return;
    }
    const form = formRef.current;
    if (!form) {
      return;
    }
    setInvalidField(null);
    if (!otpEnabled) {
      // No provider configured: skip straight past the pane instead of asking
      // for a code nothing will ever send.
      goToStep(OTP_STEP + 1);
      return;
    }
    const phone = String(new FormData(form).get("phone") || "").trim();
    // Coming back to edit an unrelated field must not burn one of the three
    // codes per hour the backend allows for this number.
    if (otpTokenRef.current && verifiedPhoneRef.current === phone) {
      goToStep(OTP_STEP);
      return;
    }
    // Nor when the code already sent to this number is still alive. Tapping
    // "O'zgartirish" on the code pane is a look at the number, not a request for
    // a new SMS, and buying one inside the backend's 60s resend cooldown is a
    // 429 — which lands on THIS pane, the one with no way back to the boxes.
    if (
      otpIssue &&
      issuedPhoneRef.current === phone &&
      Date.now() < otpIssue.issuedAt + otpIssue.expiresIn * 1000
    ) {
      goToStep(OTP_STEP);
      return;
    }
    setRequestingOtp(true);
    try {
      const issue = await onRequestOtp(phone);
      issuedPhoneRef.current = phone;
      setOtpIssue(issue);
      goToStep(OTP_STEP);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Kod yuborilmadi. Qayta urinib ko'ring.";
      fail("phone", message);
    } finally {
      setRequestingOtp(false);
    }
  }

  function advance() {
    if (step === IDENTITY_STEP) {
      void advanceFromIdentity();
      return;
    }
    const result = validateStep(step);
    if (result) {
      fail(result.field, result.message);
      return;
    }
    setInvalidField(null);
    goToStep(step + 1);
  }

  function goBack() {
    setInvalidField(null);
    // Hop over the skipped pane in both directions, or Back would land on a
    // step the patient was never shown and cannot complete.
    if (!otpEnabled && step === OTP_STEP + 1) {
      goToStep(IDENTITY_STEP);
      return;
    }
    goToStep(step - 1);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    // Enter on an early pane must not submit a half-filled form. Only the last
    // pane's button is allowed through, and it re-checks every pane first.
    if (step !== TOTAL_USER_STEPS) {
      event.preventDefault();
      return;
    }
    for (let target = 1; target <= TOTAL_USER_STEPS; target += 1) {
      const result = validateStep(target);
      if (result) {
        event.preventDefault();
        goToStep(target);
        fail(result.field, result.message);
        return;
      }
    }
    setInvalidField(null);
    onSubmit(event);
  }

  const clear = (field: UserField) => setInvalidField((current) => (current === field ? null : current));

  if (userRegistered) {
    return (
      <div className="flex items-center gap-3 rounded-card bg-brand-50 px-4 py-3.5">
        <CheckCircle2 size={18} className="shrink-0 text-brand-500" />
        <span>
          <strong className="block text-sm font-semibold text-ink-900">Profil tayyor</strong>
          <small className="block text-xs text-ink-500">Endi qabulga yozilish va shifokor tanlash mumkin.</small>
        </span>
      </div>
    );
  }

  const isLastStep = step === TOTAL_USER_STEPS;
  const busy = submitting || requestingOtp;
  const advanceDisabled =
    busy ||
    // The OTP pane advances only once a ticket is in memory; its own CTA is the
    // verify button, so a dead "Davom etish" here would be a trap.
    (otpEnabled && step === OTP_STEP && !otpVerified);

  return (
    <form
      id="user-register-form"
      ref={formRef}
      noValidate
      className="flex flex-col gap-6"
      onSubmit={handleSubmit}
    >
      <StepHeader
        // Count only the panes the patient is actually shown. With OTP off the
        // raw index would read "1/4" then jump to "3/4", telling them they
        // skipped something they were never offered.
        step={otpEnabled || step < OTP_STEP ? step : step - 1}
        total={otpEnabled ? TOTAL_USER_STEPS : TOTAL_USER_STEPS - 1}
        title={USER_STEPS[step - 1].title}
      />

      <Pane hidden={step !== 1} intro={USER_STEPS[0].intro}>
        <Field
          label="F.I.O."
          name="full_name"
          placeholder="Ism familiya"
          required
          error={invalidField === "full_name"}
          onChange={() => clear("full_name")}
        />
        {/* The SMS pane is shared with the doctor wizard now: the phone is the
            login identifier and the only channel a reminder can reach, so a
            patient who mistypes it loses the account and every booking on it. */}
        <PhoneField
          label="Telefon raqam"
          name="phone"
          required
          error={invalidField === "phone"}
          errorText={invalidField === "phone" ? invalidMessage : undefined}
          onValueChange={(next) => {
            setPhoneValue(next);
            clear("phone");
            // A changed number invalidates the ticket bound to the old one.
            if (otpTokenRef.current && next !== verifiedPhoneRef.current) {
              storeToken(null);
              setOtpIssue(null);
            }
          }}
        />
        {/* Hidden, not just un-validated: a consent box for an SMS that will
            never be sent is a question with no meaning behind it. */}
        {otpEnabled && (
          <label
            className={cn(
              "flex items-start gap-3 rounded-control border bg-control px-3.5 py-3",
              invalidField === "sms_consent" ? "border-danger" : "border-control-border"
            )}
          >
            <input
              type="checkbox"
              name="sms_consent"
              value="yes"
              aria-invalid={invalidField === "sms_consent" || undefined}
              onChange={() => clear("sms_consent")}
              className="mt-0.5 h-4 w-4 shrink-0 accent-brand-500"
            />
            <span className="text-sm font-medium leading-relaxed text-ink-500">
              Telefon raqamimni tasdiqlash uchun SMS kod yuborilishiga roziman.
            </span>
          </label>
        )}
        {invalidField === "sms_consent" && (
          <small className={errorTextClass} role="alert">
            {invalidMessage}
          </small>
        )}
      </Pane>

      <Pane hidden={step !== 2}>
        <OtpStep
          active={step === 2}
          phone={phoneValue}
          issue={otpIssue}
          verified={otpVerified}
          formSubmitting={submitting}
          onRequestOtp={onRequestOtp}
          onVerifyOtp={onVerifyOtp}
          onIssue={(issue) => {
            issuedPhoneRef.current = phoneValue;
            setOtpIssue(issue);
          }}
          onVerified={storeToken}
          onEditPhone={() => goToStep(IDENTITY_STEP)}
        />
      </Pane>

      <Pane hidden={step !== 3} intro={USER_STEPS[2].intro}>
        <Field
          label="Parol"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="Kamida 8 ta belgi"
          required
          error={invalidField === "password"}
          onChange={() => clear("password")}
        />
        <Field
          label="Parolni tasdiqlash"
          name="password_confirm"
          type="password"
          autoComplete="new-password"
          placeholder="Parolni qayta kiriting"
          required
          error={invalidField === "password_confirm"}
          onChange={() => clear("password_confirm")}
        />
      </Pane>

      <Pane hidden={step !== 4} intro={USER_STEPS[3].intro}>
        <fieldset className="m-0 border-0 p-0">
          <legend className={labelClass}>Jinsi</legend>
          <OptionGrid
            name="gender"
            value={userGender}
            onChange={onGenderChange}
            options={genderOptions.map((item) => ({ value: item, label: item }))}
          />
        </fieldset>
        <Field label="Yoshi" name="age" numeric placeholder="Yosh" />
        {/* Tuman bu yerda so'ralmaydi: u ixtiyoriy (backend required=False) va
            faqat "yaqin atrofdagi klinikalar" uchun kerak — ro'yxatdan o'tishni
            uzaytiradigan, lekin hech narsani ochmaydigan savol edi. Profildan
            istalgan vaqtda kiritiladi. */}
        <PrivacyAcknowledgement error={invalidField === "privacy_acknowledged"} />
      </Pane>

      <div className="flex items-center gap-3">
        {step > 1 && (
          <Button
            type="button"
            variant="secondary"
            size="lg"
            className="shrink-0"
            disabled={busy}
            onClick={goBack}
          >
            <ArrowLeft size={18} />
            Orqaga
          </Button>
        )}
        {isLastStep ? (
          <Button type="submit" variant="gradient" size="lg" className="flex-1" disabled={submitting}>
            {submitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
            {submitting ? "Yuborilmoqda…" : "Profil yaratish"}
          </Button>
        ) : (
          <Button
            id="user-register-advance"
            type="button"
            variant="gradient"
            size="lg"
            className="flex-1"
            disabled={advanceDisabled}
            onClick={advance}
          >
            {requestingOtp ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : null}
            {requestingOtp ? "Kod yuborilmoqda…" : "Davom etish"}
            {!requestingOtp && <ArrowRight size={18} />}
          </Button>
        )}
      </div>
    </form>
  );
}
