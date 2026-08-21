/**
 * Phone verification can be switched off for the window between shipping the
 * OTP flow and having an SMS provider configured. Default ON: the secure state
 * is what you get by doing nothing, and disabling it takes an explicit
 * NEXT_PUBLIC_OTP_ENABLED=false at build time, matched by OTP_ROLLOUT_PENDING on
 * the backend. With it off the OTP pane is skipped entirely rather than shown
 * and waved through — a code entry that accepts anything is worse than none.
 *
 * Shared by BOTH wizards. It used to live inside the doctor form, but the
 * patient form cannot import from there (the doctor wizard is code-split and
 * the patient path must not pull that chunk in), and a second copy of this
 * expression is exactly how the two flows would drift out of step.
 */
export const otpEnabled = process.env.NEXT_PUBLIC_OTP_ENABLED !== "false";
