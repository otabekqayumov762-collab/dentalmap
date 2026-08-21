"use client";

import { CheckCircle2, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { OtpIssue } from "../../hooks/useDentalData";
import { Button, cn, inlineActionClass } from "../../ui";
import { OTP_CODE_LENGTH, OtpCodeInput } from "../../ui/OtpCodeInput";

/** "+998 90 123 45 67" → "+998 90 ••• •• 67": enough to recognise your own
 *  number, not enough to be useful over someone's shoulder. */
function maskPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 12) {
    return phone;
  }
  const national = digits.slice(3);
  return `+998 ${national.slice(0, 2)} ••• •• ${national.slice(7, 9)}`;
}

function clock(seconds: number) {
  const safe = Math.max(0, seconds);
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}

export type OtpStepProps = {
  /** The pane is the visible one — drives autofocus and the ticking timers. */
  active: boolean;
  phone: string;
  /** Metadata from the issue that brought the user here (or from a resend). */
  issue: OtpIssue | null;
  /** The "a code went out" sentence. Overridable because the password-reset
   *  endpoint answers a number with no account exactly as it answers one with
   *  an account — so that flow must not state an SMS was sent. Registration
   *  knows one was, and keeps the plain wording. */
  sentText?: string;
  /** A token is already held in memory: the pane is done. */
  verified: boolean;
  /** The outer registration POST is in flight. */
  formSubmitting: boolean;
  onRequestOtp: (phone: string) => Promise<OtpIssue>;
  onVerifyOtp: (phone: string, code: string) => Promise<string>;
  onIssue: (issue: OtpIssue) => void;
  onVerified: (token: string) => void;
  onEditPhone: () => void;
};

/**
 * The phone-confirmation pane. It owns the two clocks (code TTL and resend
 * cooldown) and its own in-flight flag, because they are pane-local concerns:
 * hoisting them into DoctorRegistrationForm would re-render all seven panes
 * once per second for the whole two minutes.
 *
 * The code is NEVER given a `name`, so it can never end up in the FormData the
 * final POST serialises — only the signed token the backend hands back does.
 */
export function OtpStep({
  active,
  phone,
  issue,
  sentText = "Raqamingizga 6 xonali kod yubordik.",
  verified,
  formSubmitting,
  onRequestOtp,
  onVerifyOtp,
  onIssue,
  onVerified,
  onEditPhone
}: OtpStepProps) {
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => Date.now());
  // Guards the auto-verify that fires when the sixth digit lands: without it a
  // paste plus the explicit button tap would POST the same code twice, burning
  // two of the five attempts.
  const verifyingRef = useRef(false);

  const issuedAt = issue?.issuedAt ?? 0;
  const expiresIn = issue?.expiresIn ?? 0;
  const resendAfter = issue?.resendAfter ?? 0;
  const elapsed = issuedAt ? Math.floor((now - issuedAt) / 1000) : 0;
  const codeRemaining = issuedAt ? Math.max(0, expiresIn - elapsed) : 0;
  const resendRemaining = issuedAt ? Math.max(0, resendAfter - elapsed) : 0;
  const codeExpired = Boolean(issuedAt) && codeRemaining === 0;

  // One interval for both clocks, and only while this pane is on screen.
  //
  // The first tick is taken immediately rather than waiting a second, because
  // `now` was seeded when this component mounted -- which is when the wizard
  // rendered step 1, not when the user arrived here. Every second spent typing
  // a name and a phone made `now` staler, so the first frame showed a countdown
  // ABOVE the maximum the server issued: "Kod amal qiladi: 2:26" against an
  // expires_in of 120. It corrected itself a second later, which is exactly
  // long enough to be seen and not long enough to be believed.
  useEffect(() => {
    if (!active || !issuedAt || verified) {
      return;
    }
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [active, issuedAt, verified]);

  // A new code (first issue or resend) always starts from empty boxes.
  useEffect(() => {
    setCode("");
    setError("");
  }, [issuedAt]);

  const verify = useCallback(
    async (candidate: string) => {
      if (verifyingRef.current || candidate.length !== OTP_CODE_LENGTH) {
        return;
      }
      verifyingRef.current = true;
      setVerifying(true);
      setError("");
      try {
        const token = await onVerifyOtp(phone, candidate);
        onVerified(token);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Kodni tasdiqlab bo'lmadi. Qayta urinib ko'ring.");
        setCode("");
      } finally {
        verifyingRef.current = false;
        setVerifying(false);
      }
    },
    [onVerifyOtp, onVerified, phone]
  );

  async function resend() {
    if (resending || resendRemaining > 0) {
      return;
    }
    setResending(true);
    setError("");
    try {
      onIssue(await onRequestOtp(phone));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Kod yuborilmadi. Qayta urinib ko'ring.");
    } finally {
      setResending(false);
    }
  }

  const busy = verifying || resending || formSubmitting;
  const resendBlocked = resendRemaining > 0;
  const resendLabel = resending
    ? "Yuborilmoqda…"
    : resendBlocked
      ? `Qayta yuborish (${clock(resendRemaining)})`
      : "Qayta yuborish";

  if (verified) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm font-medium leading-relaxed text-ink-500">
          {maskPhone(phone)} raqami tasdiqlandi.
        </p>
        <div className="flex items-center gap-3 rounded-card border border-brand-200 bg-brand-50 p-4 text-brand-700">
          <CheckCircle2 size={20} aria-hidden="true" />
          <span className="text-sm font-bold">Telefon raqam tasdiqlandi</span>
        </div>
        <button
          type="button"
          onClick={onEditPhone}
          className={cn(inlineActionClass, "self-start")}
        >
          Raqamni o&apos;zgartirish
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm font-medium leading-relaxed text-ink-500">
        {sentText} Kod {expiresIn ? clock(expiresIn) : "2:00"} davomida amal qiladi.
      </p>

      <OtpCodeInput
        value={code}
        onChange={(next) => {
          setCode(next);
          if (error) {
            setError("");
          }
        }}
        onComplete={(next) => void verify(next)}
        disabled={busy || codeExpired}
        error={Boolean(error)}
        errorText={error || (codeExpired ? "Kod muddati tugadi. Yangi kod so'rang." : "")}
        autoFocus={active}
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium text-ink-500">
          {maskPhone(phone)}{" "}
          <button
            type="button"
            onClick={onEditPhone}
            disabled={busy}
            className={inlineActionClass}
          >
            O&apos;zgartirish
          </button>
        </span>
        <span
          className={cn(
            "text-xs font-semibold tabular-nums",
            codeExpired ? "text-danger" : "text-ink-400"
          )}
          role="timer"
          aria-live="off"
        >
          {codeExpired ? "Kod eskirdi" : `Kod amal qiladi: ${clock(codeRemaining)}`}
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        <button
          type="button"
          onClick={() => void resend()}
          disabled={resendBlocked || resending || formSubmitting}
          className={cn(inlineActionClass, "self-start")}
        >
          {resending ? (
            <Loader2 size={15} className="animate-spin" aria-hidden="true" />
          ) : (
            <RefreshCw size={15} aria-hidden="true" />
          )}
          {resendLabel}
        </button>
        {resendBlocked && (
          <small className="text-xs font-medium text-ink-500">
            Yangi kodni {clock(resendRemaining)} dan keyin so&apos;rash mumkin.
          </small>
        )}
      </div>

      {/* Explicit fallback for anyone whose autofill pastes the code without
          firing the completion path (and for keyboard users who prefer a CTA). */}
      <Button
        type="button"
        variant="gradient"
        size="lg"
        onClick={() => void verify(code)}
        disabled={code.length !== OTP_CODE_LENGTH || busy || codeExpired}
      >
        {verifying ? (
          <Loader2 size={18} className="animate-spin" aria-hidden="true" />
        ) : (
          <ShieldCheck size={18} aria-hidden="true" />
        )}
        {verifying ? "Tekshirilmoqda…" : "Tasdiqlash"}
      </Button>

      {issue?.devCode && (
        <p className="text-xs font-semibold text-warning">Test kodi: {issue.devCode}</p>
      )}
    </div>
  );
}
