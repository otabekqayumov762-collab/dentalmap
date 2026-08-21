"use client";

import {
  Check,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Hourglass,
  Loader2,
  MessageSquareText,
  Pencil,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  TimerOff,
  XCircle,
  type LucideIcon
} from "lucide-react";
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

/** The server burns the code on the fifth wrong guess (apps/accounts/otp.py,
 *  MAX_VERIFY_ATTEMPTS). It cannot SAY so — "expired" and "burned" come back as
 *  one message on purpose, so a prober cannot tell a live code from a dead one
 *  — so the pane counts its own POSTs to tell the user which of the two
 *  happened. One POST is one attempt: the in-flight guard below makes sure of
 *  that. */
const MAX_VERIFY_ATTEMPTS = 5;

/** How long the confirmation is allowed to be seen before the wizard moves on.
 *  Long enough to register as an answer, short enough not to feel like a stall.
 *  Not motion — reduced-motion users get the same beat, just without the
 *  entrance animation the global 0.01ms rule collapses. */
const SUCCESS_HOLD_MS = 900;

/** Segments in the code-life meter. Twelve fits 360px with gap-1 and still
 *  moves visibly: at a 90s TTL one segment is 7.5 seconds. */

/** Both sentences the throttle path can produce start this way — the vague one
 *  the backend sends and the one useDentalData rewrites with the real wait. */
const THROTTLE_HINT = "Juda ko'p urinish";
/** The 400 body for a code that no longer exists (expired, or burned). */
const EXPIRED_HINT = "muddati tugadi";

type ProblemSource = "verify" | "resend";

type Trouble = {
  Icon: LucideIcon;
  tone: "danger" | "warning";
  title: string;
  detail: string;
  /** Does this put the fault on the six boxes? A throttle or a failed resend
   *  does not — painting them red would send the user re-reading digits that
   *  were never the problem. */
  marksCode: boolean;
  /** Nothing typed into the boxes can succeed until a new code is issued. */
  blocksCode: boolean;
};

/**
 * Four situations, four next actions. The wrong-code and throttle titles are the
 * server's own sentence (the throttle one carries the real wait in seconds);
 * the other two are ours, because the server deliberately says the same thing
 * for both.
 */
function describeTrouble(
  message: string,
  source: ProblemSource,
  attemptsUsed: number
): Trouble {
  if (message.includes(THROTTLE_HINT)) {
    return {
      Icon: Hourglass,
      tone: "warning",
      title: message,
      detail: "Ko'rsatilgan vaqt o'tgach qayta urinib ko'ring.",
      marksCode: false,
      blocksCode: false
    };
  }
  if (source === "resend") {
    return {
      Icon: CircleAlert,
      tone: "danger",
      title: message,
      detail: "Aloqani tekshirib, qayta urinib ko'ring.",
      marksCode: false,
      blocksCode: false
    };
  }
  if (attemptsUsed >= MAX_VERIFY_ATTEMPTS) {
    return {
      Icon: ShieldAlert,
      tone: "danger",
      title: "Urinishlar tugadi.",
      detail: "Kod 5 marta xato kiritildi. Yangi kod so'rang.",
      // Not marksCode: the boxes are empty and disabled by now, and painting
      // them red would blame digits that are no longer on screen.
      marksCode: false,
      blocksCode: true
    };
  }
  if (message.includes(EXPIRED_HINT)) {
    return {
      Icon: TimerOff,
      tone: "danger",
      title: "Kod muddati tugadi.",
      detail: "Yangi kod so'rang — eskisi endi ishlamaydi.",
      marksCode: false,
      blocksCode: true
    };
  }
  return {
    Icon: XCircle,
    tone: "danger",
    title: message,
    detail: "Raqamlarni tekshirib, qaytadan kiriting.",
    marksCode: true,
    blocksCode: false
  };
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
 * Shared verbatim by three flows — doctor signup, patient signup, password
 * reset — so everything flow-specific arrives as a prop (`sentText`, `verified`)
 * and nothing here branches on which wizard is hosting it.
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
  const [problem, setProblem] = useState<{ message: string; source: ProblemSource } | null>(null);
  const [attemptsUsed, setAttemptsUsed] = useState(0);
  // Bumped on every rejected code. It keys the boxes, so a second wrong guess
  // replays the shake, and the remount hands focus back to the first box —
  // which is where the user has to start again anyway.
  const [rejectionKey, setRejectionKey] = useState(0);
  // The beat between "accepted" and the wizard moving on.
  const [celebrating, setCelebrating] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  // Guards the auto-verify that fires when the sixth digit lands: without it a
  // paste plus the explicit button tap would POST the same code twice, burning
  // two of the five attempts.
  const verifyingRef = useRef(false);
  const holdRef = useRef<number | null>(null);

  const issuedAt = issue?.issuedAt ?? 0;
  const expiresIn = issue?.expiresIn ?? 0;
  const resendAfter = issue?.resendAfter ?? 0;
  const elapsed = issuedAt ? Math.floor((now - issuedAt) / 1000) : 0;
  // Clamped at BOTH ends. The floor is obvious; the ceiling is the one that bit:
  // a countdown may never open above the maximum the server issued, however
  // stale or skewed the clock behind `elapsed` is.
  const codeRemaining = issuedAt ? Math.min(expiresIn, Math.max(0, expiresIn - elapsed)) : 0;
  const resendRemaining = issuedAt ? Math.min(resendAfter, Math.max(0, resendAfter - elapsed)) : 0;
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
    if (!active || !issuedAt || verified || celebrating) {
      return;
    }
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [active, issuedAt, verified, celebrating]);

  // A new code (first issue or resend) always starts from empty boxes, a clean
  // slate of attempts, and no leftover verdict from the code it replaced.
  useEffect(() => {
    setCode("");
    setProblem(null);
    setAttemptsUsed(0);
    setCelebrating(false);
    verifyingRef.current = false;
  }, [issuedAt]);

  useEffect(
    () => () => {
      if (holdRef.current) {
        window.clearTimeout(holdRef.current);
      }
    },
    []
  );

  const verify = useCallback(
    async (candidate: string) => {
      if (verifyingRef.current || candidate.length !== OTP_CODE_LENGTH) {
        return;
      }
      verifyingRef.current = true;
      setVerifying(true);
      setProblem(null);
      try {
        const token = await onVerifyOtp(phone, candidate);
        // verifyingRef stays raised on purpose: the pane is done, and nothing
        // typed during the confirmation beat may start a second POST.
        setVerifying(false);
        setCelebrating(true);
        holdRef.current = window.setTimeout(() => {
          holdRef.current = null;
          onVerified(token);
        }, SUCCESS_HOLD_MS);
      } catch (cause) {
        const message =
          cause instanceof Error ? cause.message : "Kodni tasdiqlab bo'lmadi. Qayta urinib ko'ring.";
        verifyingRef.current = false;
        setVerifying(false);
        setProblem({ message, source: "verify" });
        // A throttle is refused BEFORE the code is compared: it costs none of
        // the five attempts, so it must not advance the counter, and the digits
        // it never looked at are worth keeping for the retry.
        if (!message.includes(THROTTLE_HINT)) {
          setAttemptsUsed((used) => used + 1);
          setCode("");
          setRejectionKey((key) => key + 1);
        }
      }
    },
    [onVerifyOtp, onVerified, phone]
  );

  async function resend() {
    if (resending || resendRemaining > 0) {
      return;
    }
    setResending(true);
    setProblem(null);
    try {
      onIssue(await onRequestOtp(phone));
    } catch (cause) {
      setProblem({
        message: cause instanceof Error ? cause.message : "Kod yuborilmadi. Qayta urinib ko'ring.",
        source: "resend"
      });
    } finally {
      setResending(false);
    }
  }

  const busy = verifying || resending || formSubmitting;
  const trouble = problem
    ? describeTrouble(problem.message, problem.source, attemptsUsed)
    : codeExpired
      ? describeTrouble("Kod muddati tugadi.", "verify", attemptsUsed)
      : null;
  const codeBlocked = codeExpired || Boolean(trouble?.blocksCode);
  const resendBlocked = resendRemaining > 0;
  const resendLabel = resending
    ? "Yuborilmoqda…"
    : resendBlocked
      ? `Qayta yuborish (${clock(resendRemaining)})`
      : "Qayta yuborish";

  // Hidden once the code is dead: a bar still counting down beside "the code
  // expired" is the screen arguing with itself.
  const showMeter = Boolean(issuedAt) && !codeBlocked;

  if (verified) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 rounded-card border border-brand-200 bg-brand-50 p-4">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-control bg-brand-100 text-brand-700">
            <CheckCircle2 size={22} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-black tracking-tight text-ink-900">
              Telefon raqam tasdiqlandi
            </p>
            <p className="text-sm font-medium tabular-nums text-ink-600">{maskPhone(phone)}</p>
          </div>
        </div>
        <button type="button" onClick={onEditPhone} className={cn(inlineActionClass, "self-start")}>
          <Pencil size={15} aria-hidden="true" />
          Raqamni o&apos;zgartirish
        </button>
      </div>
    );
  }

  // The confirmation beat. A pane that simply vanished the moment the sixth
  // digit landed left people unsure whether the code had been accepted or the
  // wizard had skipped a step.
  if (celebrating) {
    return (
      <div
        role="status"
        className="flex flex-col items-center gap-3 rounded-card border border-brand-200 bg-brand-50 px-4 py-9 text-center animate-[modal-in_0.22s_ease-out]"
      >
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-pill bg-brand-500 text-on-brand">
          <Check size={30} strokeWidth={3} aria-hidden="true" />
        </span>
        <p className="text-base font-black tracking-tight text-ink-900">Kod tasdiqlandi</p>
        <p className="text-sm font-medium tabular-nums text-ink-600">{maskPhone(phone)}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Where the code went, and the way back to change it. A wrong digit in
          the number is the commonest reason a code never arrives, and a screen
          that only ever says "wrong code" sends people hunting in the wrong
          place. */}
      <div className="flex items-start gap-3 rounded-card border border-brand-200 bg-brand-50 p-4">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-brand-100 text-brand-700">
          <MessageSquareText size={19} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-relaxed text-ink-600">{sentText}</p>
          <p className="mt-1 text-base font-black tracking-tight tabular-nums text-ink-900">
            {maskPhone(phone)}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onEditPhone}
        disabled={busy}
        className={cn(inlineActionClass, "-mt-2 self-start")}
      >
        <Pencil size={15} aria-hidden="true" />
        O&apos;zgartirish
      </button>

      {/* Keyed on the rejection count: a refused code replays the shake and
          hands focus back to the first box. */}
      <div
        key={rejectionKey}
        className={cn(rejectionKey > 0 && "animate-[otp-shake_0.4s_ease-in-out]")}
      >
        <OtpCodeInput
          value={code}
          onChange={(next) => {
            setCode(next);
            if (problem) {
              setProblem(null);
            }
          }}
          onComplete={(next) => void verify(next)}
          disabled={busy || codeBlocked}
          error={Boolean(trouble?.marksCode)}
          autoFocus={active}
        />
      </div>

      {trouble && (
        <div
          role="alert"
          className={cn(
            "flex items-start gap-3 rounded-control border p-3.5",
            trouble.tone === "warning" ? "border-warning/60 bg-warning/10" : "border-danger/50 bg-danger/10"
          )}
        >
          <trouble.Icon
            size={18}
            aria-hidden="true"
            className={cn("mt-0.5 shrink-0", trouble.tone === "warning" ? "text-ink-900" : "text-danger")}
          />
          <div className="min-w-0">
            <p className="text-sm font-bold text-ink-900">{trouble.title}</p>
            <p className="mt-0.5 text-sm font-medium leading-relaxed text-ink-600">
              {trouble.detail}
            </p>
          </div>
        </div>
      )}

      {/* The code's remaining life, as a quantity rather than a note. */}
      {showMeter && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-500">
              <Clock3 size={14} aria-hidden="true" />
              {codeExpired ? "Kod eskirdi" : "Kod amal qiladi"}
            </span>
            <span
              className={cn(
                "text-xs font-black tabular-nums",
                codeExpired ? "text-danger" : "text-ink-900"
              )}
              role="timer"
              aria-live="off"
            >
              {clock(codeRemaining)}
            </span>
          </div>
        </div>
      )}

      {/* Explicit fallback for anyone whose autofill pastes the code without
          firing the completion path (and for keyboard users who prefer a CTA). */}
      <Button
        type="button"
        variant="gradient"
        size="lg"
        onClick={() => void verify(code)}
        disabled={code.length !== OTP_CODE_LENGTH || busy || codeBlocked}
      >
        {verifying ? (
          <Loader2 size={18} className="animate-spin" aria-hidden="true" />
        ) : (
          <ShieldCheck size={18} aria-hidden="true" />
        )}
        {verifying ? "Tekshirilmoqda…" : "Tasdiqlash"}
      </Button>

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

      {issue?.devCode && (
        <p className="text-xs font-semibold text-warning">Test kodi: {issue.devCode}</p>
      )}
    </div>
  );
}
