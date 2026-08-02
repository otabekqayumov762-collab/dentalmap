"use client";

import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, SkipForward } from "lucide-react";
import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { SPECIALTY_SERVICE_HINTS, genderOptions, serviceItems, specialtyOptions } from "../../catalog";
import { isOfflineMode } from "../../api/dentalMapApi";
import { PhotoUploadField } from "../../components/PhotoUploadField";
import { PrivacyAcknowledgement } from "../../components/PrivacyAcknowledgement";
import type { OtpIssue } from "../../hooks/useDentalData";
import type { Service, Specialty } from "../../types";
import {
  Button,
  Field,
  MultiSelectSheet,
  OptionGrid,
  OptionalMark,
  PhoneField,
  RegionDistrictField,
  Select,
  TextareaField,
  cn,
  errorTextClass,
  labelClass,
  inlineActionClass,
  useSettledEmpty,
  useToast
} from "../../ui";
import { LocationPickerField, mapLinkValidationError } from "./LocationPickerField";
import { OtpStep } from "./OtpStep";
import { StepHeader } from "./StepHeader";
import { WorkTimeField } from "./WorkTimeField";

/**
 * The wizard's pages, in DOM order.
 *
 * Every pane stays MOUNTED and is hidden with `hidden` rather than unmounted.
 * That is not a shortcut, it is the whole design: `new FormData(formRef.current)`
 * must see fields from pages the user has already left, the password inputs must
 * never be serialised into anything but the single final POST, and the
 * `photo_file` File object cannot be serialised at all — an unmounted pane would
 * force both into storage or into a server-side draft row.
 */
const DOCTOR_STEPS = [
  { id: "identity", title: "Shaxsiy ma'lumotlar" },
  { id: "otp", title: "Kodni tasdiqlang" },
  { id: "password", title: "Parol yarating" },
  { id: "gender", title: "Jinsi" },
  { id: "photo", title: "Shifokor rasmi" },
  { id: "professional", title: "Mutaxassislik" },
  { id: "clinic", title: "Klinika" }
] as const;

export const TOTAL_DOCTOR_STEPS = DOCTOR_STEPS.length;
const IDENTITY_STEP = 1;
const OTP_STEP = 2;

/**
 * Phone verification can be switched off for the window between shipping this
 * flow and having an SMS provider configured. Default ON: the secure state is
 * what you get by doing nothing, and disabling it takes an explicit
 * NEXT_PUBLIC_OTP_ENABLED=false at build time, matched by OTP_ROLLOUT_PENDING on
 * the backend. With it off the OTP pane is skipped entirely rather than shown
 * and waved through — a code entry that accepts anything is worse than none.
 */
export const otpEnabled = process.env.NEXT_PUBLIC_OTP_ENABLED !== "false";

type DoctorField =
  | "full_name"
  | "doctor_phone"
  | "sms_consent"
  | "otp_token"
  | "password"
  | "password_confirm"
  | "doctor_gender"
  | "specialty"
  | "experience_years"
  | "clinic_name"
  | "clinic_district"
  | "clinic_location_url"
  | "privacy_acknowledged";

/** Pane shell. Same card chrome as the AuthGate cards on purpose — a second
 *  container style would make the wizard look like a different app. */
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

export function DoctorRegistrationForm({
  step,
  submitting,
  specialties,
  services,
  taxonomyLoading = false,
  taxonomyError = "",
  onRetryTaxonomies,
  doctorSpecialty,
  doctorGender,
  doctorRegion,
  doctorDistrict,
  selectedServiceIds,
  photoFileName,
  onStepChange,
  onSpecialtyChange,
  onDoctorGenderChange,
  onRegionChange,
  onDistrictChange,
  onToggleService,
  onSetServices,
  onPhotoFileChange,
  onRequestOtp,
  onVerifyOtp,
  onOtpTokenChange,
  onSubmit
}: {
  step: number;
  submitting: boolean;
  specialties: Specialty[];
  services: Service[];
  taxonomyLoading?: boolean;
  taxonomyError?: string;
  onRetryTaxonomies?: () => void;
  doctorSpecialty: string;
  doctorGender: string;
  doctorRegion: string | null;
  doctorDistrict: string;
  selectedServiceIds: string[];
  photoFileName: string;
  onStepChange: (step: number) => void;
  onSpecialtyChange: (specialty: string) => void;
  onDoctorGenderChange: (gender: string) => void;
  onRegionChange: (region: string | null) => void;
  onDistrictChange: (district: string) => void;
  onToggleService: (serviceId: string) => void;
  onSetServices: (serviceIds: string[]) => void;
  onPhotoFileChange: (fileName: string) => void;
  onRequestOtp: (phone: string) => Promise<OtpIssue>;
  onVerifyOtp: (phone: string, code: string) => Promise<string>;
  onOtpTokenChange: (token: string | null) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  // MEMORY ONLY. The signed ticket never touches sessionStorage, localStorage,
  // the URL or a DOM value attribute; the submit handler in DentalMapApp appends
  // it to the FormData and nowhere else. A reload loses it and the user restarts
  // at the identity pane — the deliberate cost of not persisting a credential.
  const otpTokenRef = useRef<string | null>(null);
  const [invalidField, setInvalidField] = useState<DoctorField | null>(null);
  const [invalidMessage, setInvalidMessage] = useState("");
  const [phoneValue, setPhoneValue] = useState("");
  const [otpIssue, setOtpIssue] = useState<OtpIssue | null>(null);
  // The identity pane owns its own in-flight flag: a 429 or a 503 from the SMS
  // provider must keep the user on the pane, not advance and not block the form.
  const [requestingOtp, setRequestingOtp] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  // The phone the live token belongs to; editing the number invalidates it.
  const verifiedPhoneRef = useRef("");
  // Handle for the gender pane's auto-advance, so a Back tap inside the 200ms
  // window cancels it instead of being overruled a moment later.
  const autoAdvanceRef = useRef<number | null>(null);

  // Admin-managed lists when available, else the offline catalog fallback.
  const allowDemoTaxonomies = isOfflineMode();
  const specialtyChoices = specialties.length
    ? specialties.map((s) => ({ value: s.name, label: s.name }))
    : allowDemoTaxonomies
      ? specialtyOptions.map((item) => ({ value: item, label: item }))
      : [];
  const rawServiceChoices = services.length
    ? services.map((s) => ({ value: s.name, label: s.name }))
    : allowDemoTaxonomies
      ? serviceItems.map(({ id, label }) => ({ value: id, label }))
      : [];

  // Specialty → services is a client-side ORDERING hint, not a schema relation:
  // the services a dentist of this kind actually offers float to the top of the
  // sheet instead of being hunted for in an alphabetical list.
  const serviceHints = SPECIALTY_SERVICE_HINTS[doctorSpecialty] ?? [];
  const serviceChoices = serviceHints.length
    ? [...rawServiceChoices].sort((a, b) => {
        const rank = (label: string) => {
          const index = serviceHints.indexOf(label);
          return index === -1 ? serviceHints.length : index;
        };
        return rank(a.label) - rank(b.label);
      })
    : rawServiceChoices;

  // Wait for the list to SETTLE empty before treating it as blocked. Without
  // this the flag is true during every cold fetch, so entering this pane mid-load
  // showed "loading…", a red "the list is empty, retry" alert and the Select's
  // own neutral empty note all at once — three answers, one of them wrong.
  const taxonomySettledEmpty = useSettledEmpty(specialtyChoices.length === 0);
  const servicesSettledEmpty = useSettledEmpty(serviceChoices.length === 0);
  const taxonomyBlocked = !allowDemoTaxonomies && taxonomySettledEmpty && !taxonomyLoading;

  function fail(field: DoctorField, message: string) {
    setInvalidField(field);
    setInvalidMessage(message);
    toast.error(message);
  }

  const clear = (field: DoctorField) =>
    setInvalidField((current) => (current === field ? null : current));

  /** Inline error props for a control, so the message lands next to the field
   *  instead of only in a toast that has already faded. */
  const errorFor = (field: DoctorField) =>
    invalidField === field ? { error: true, errorText: invalidMessage } : {};

  // Per-step client validation — mirrors the thresholds enforced in
  // DentalMapApp.sendDoctorRegistration so both paths stay consistent. Reads the
  // LIVE form (every pane is still mounted), so a value entered three panes ago
  // is still visible here.
  function validateStep(target: number): { field: DoctorField; message: string } | null {
    const form = formRef.current;
    if (!form) {
      return null;
    }
    const formData = new FormData(form);
    const value = (key: string) => String(formData.get(key) || "").trim();

    if (target === 1) {
      if (value("full_name").length < 2) {
        return { field: "full_name", message: "Shifokor F.I.O. ni to'liq kiriting." };
      }
      if (value("doctor_phone").replace(/\D/g, "").length < 12) {
        return { field: "doctor_phone", message: "Telefon raqamni to'liq kiriting." };
      }
      // Only when a code will actually be sent. With OTP off the pane is
      // skipped, so demanding consent for an SMS that never happens blocked the
      // whole flow on a promise nobody was making.
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
      const password = String(formData.get("password") || "");
      const passwordConfirm = String(formData.get("password_confirm") || "");
      if (password.length < 8) {
        return { field: "password", message: "Parol kamida 8 ta belgidan iborat bo'lishi kerak." };
      }
      if (password !== passwordConfirm) {
        return { field: "password_confirm", message: "Parollar bir xil emas." };
      }
      return null;
    }

    if (target === 4) {
      if (!value("doctor_gender")) {
        return { field: "doctor_gender", message: "Jinsni tanlang." };
      }
      return null;
    }

    if (target === 5) {
      // The photo is optional by design; this pane can never block the flow.
      return null;
    }

    if (target === 6) {
      if (!doctorSpecialty.trim() && !value("specialty")) {
        return { field: "specialty", message: "Asosiy yo'nalishni tanlang." };
      }
      const experience = Number(value("experience_years"));
      if (!value("experience_years") || !Number.isFinite(experience) || experience < 0 || experience > 80) {
        return { field: "experience_years", message: "Ish stajini 0 dan 80 gacha raqamda kiriting." };
      }
      return null;
    }

    if (target === 7) {
      if (!value("clinic_name")) {
        return { field: "clinic_name", message: "Klinika nomini kiriting." };
      }
      if (!value("clinic_district")) {
        return { field: "clinic_district", message: "Klinika tumanini tanlang." };
      }
      const locationError = mapLinkValidationError(value("clinic_location_url"));
      if (locationError) {
        return { field: "clinic_location_url", message: locationError };
      }
      if (value("privacy_acknowledged") !== "yes") {
        return { field: "privacy_acknowledged", message: "Maxfiylik qoidalarini o'qib tasdiqlang." };
      }
      return null;
    }

    return null;
  }

  function goToStep(next: number) {
    if (autoAdvanceRef.current) {
      window.clearTimeout(autoAdvanceRef.current);
      autoAdvanceRef.current = null;
    }
    setInvalidField(null);
    setInvalidMessage("");
    onStepChange(Math.min(Math.max(next, 1), TOTAL_DOCTOR_STEPS));
  }

  function storeToken(token: string | null) {
    otpTokenRef.current = token;
    verifiedPhoneRef.current = token ? phoneValue : "";
    setOtpVerified(Boolean(token));
    onOtpTokenChange(token);
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
    if (!otpEnabled) {
      // No provider configured: skip straight past the pane instead of asking
      // for a code nothing will ever send.
      goToStep(OTP_STEP + 1);
      return;
    }
    const phone = String(new FormData(form).get("doctor_phone") || "").trim();
    // Coming back to edit an unrelated field must not burn one of the three
    // codes per hour the backend allows for this number.
    if (otpTokenRef.current && verifiedPhoneRef.current === phone) {
      goToStep(OTP_STEP);
      return;
    }
    setRequestingOtp(true);
    try {
      const issue = await onRequestOtp(phone);
      setOtpIssue(issue);
      goToStep(OTP_STEP);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Kod yuborilmadi. Qayta urinib ko'ring.";
      fail("doctor_phone", message);
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
    goToStep(step + 1);
  }

  function goBack() {
    // Hop over the skipped pane in both directions, or Back would land on a
    // step the user was never shown and cannot complete.
    if (!otpEnabled && step === OTP_STEP + 1) {
      goToStep(IDENTITY_STEP);
      return;
    }
    goToStep(step - 1);
  }

  function submitForm() {
    // Route the final step through the form's native submit so onSubmit receives
    // a real FormEvent (the app reads FormData from event.currentTarget).
    formRef.current?.requestSubmit();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    // Registration may only ever fire from the final step. Any submit event that
    // arrives earlier (stray Enter key, a programmatic requestSubmit) is ignored
    // so the success screen never shows before a real final submission.
    if (step !== TOTAL_DOCTOR_STEPS) {
      event.preventDefault();
      return;
    }
    // Re-run EVERY step's guard, not just the last one: the panes the user
    // already passed are still editable in the DOM.
    for (let target = 1; target <= TOTAL_DOCTOR_STEPS; target += 1) {
      const result = validateStep(target);
      if (result) {
        event.preventDefault();
        fail(result.field, result.message);
        onStepChange(target);
        return;
      }
    }
    setInvalidField(null);
    setInvalidMessage("");
    onSubmit(event);
  }

  const isFinalStep = step === TOTAL_DOCTOR_STEPS;
  const busy = submitting || requestingOtp;
  const advanceDisabled =
    busy ||
    // The OTP pane advances only once a ticket is in memory; its own CTA is the
    // verify button, so a dead "Davom etish" here would be a trap.
    (otpEnabled && step === OTP_STEP && !otpVerified) ||
    (step === 6 && taxonomyBlocked);

  return (
    <form
      id="doctor-register-form"
      ref={formRef}
      noValidate
      className="flex flex-col gap-4"
      onSubmit={handleSubmit}
    >
      <StepHeader
        // Count only the panes the doctor is actually shown. With OTP off the
        // raw index would read "1/8" then jump to "3/8", telling them they
        // skipped something they were never offered.
        step={otpEnabled || step < OTP_STEP ? step : step - 1}
        total={otpEnabled ? TOTAL_DOCTOR_STEPS : TOTAL_DOCTOR_STEPS - 1}
        title={DOCTOR_STEPS[step - 1].title}
      />

      <Pane
        hidden={step !== 1}
        intro="Ismingiz va telefon raqamingiz — bemorlar sizni shu ma'lumotlar orqali topadi."
      >
        <Field
          label="Shifokor F.I.O."
          name="full_name"
          placeholder="Ism familiya"
          autoComplete="name"
          required
          {...errorFor("full_name")}
          onChange={() => clear("full_name")}
        />
        <PhoneField
          label="Telefon raqam"
          name="doctor_phone"
          required
          {...errorFor("doctor_phone")}
          onValueChange={(next) => {
            setPhoneValue(next);
            clear("doctor_phone");
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
          <span className="text-[13px] font-medium leading-relaxed text-ink-500">
            Telefon raqamimni tasdiqlash uchun SMS kod yuborilishiga roziman. Kod eSKIZ xizmati orqali
            yuboriladi.
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
          onIssue={setOtpIssue}
          onVerified={storeToken}
          onEditPhone={() => goToStep(IDENTITY_STEP)}
        />
      </Pane>

      <Pane
        hidden={step !== 3}
        intro="Parol keyingi kirishlar uchun kerak. Uni hech qayerda saqlamaymiz — faqat shu formadan yuboriladi."
      >
        <Field
          label="Parol"
          name="password"
          type="password"
          minLength={8}
          autoComplete="new-password"
          placeholder="Kamida 8 ta belgi"
          required
          {...errorFor("password")}
          onChange={() => clear("password")}
        />
        <Field
          label="Parolni takrorlang"
          name="password_confirm"
          type="password"
          minLength={8}
          autoComplete="new-password"
          placeholder="Parolni qayta kiriting"
          required
          {...errorFor("password_confirm")}
          onChange={() => clear("password_confirm")}
        />
      </Pane>

      <Pane hidden={step !== 4} intro="Bemorlar shifokorni jinsi bo'yicha ham filtrlaydi.">
        <fieldset className="m-0 border-0 p-0">
          <legend className={labelClass}>Jinsi</legend>
          <OptionGrid
            name="doctor_gender"
            value={doctorGender}
            onChange={(gender) => {
              onDoctorGenderChange(gender);
              clear("doctor_gender");
              // A single-choice pane with nothing else on it: move on by itself,
              // but keep the CTA below as the accessible, undoable fallback.
              // The delay lets the selected state render before the pane swaps.
              autoAdvanceRef.current = window.setTimeout(() => {
                autoAdvanceRef.current = null;
                goToStep(5);
              }, 200);
            }}
            options={genderOptions.map((item) => ({ value: item, label: item }))}
            error={invalidField === "doctor_gender"}
          />
          {invalidField === "doctor_gender" && (
            <small className={errorTextClass} role="alert">
              {invalidMessage}
            </small>
          )}
        </fieldset>
      </Pane>

      <Pane
        hidden={step !== 5}
        intro="Rasm profilingizga ishonch qo'shadi, lekin majburiy emas — keyin ham qo'shishingiz mumkin."
      >
        <PhotoUploadField
          name="photo_file"
          label="Shifokor rasmi"
          fileName={photoFileName}
          onFileNameChange={onPhotoFileChange}
        />
      </Pane>

      <Pane hidden={step !== 6} intro="Yo'nalish va tajribangiz qidiruvda ko'rsatiladi.">
        {!allowDemoTaxonomies && (taxonomyLoading || taxonomyError) && (
          <div
            role={taxonomyError ? "alert" : "status"}
            className={cn(
              "rounded-card px-3.5 py-3 text-sm",
              taxonomyError ? "bg-danger/10 text-danger" : "bg-surface-50 text-ink-500"
            )}
          >
            <p>{taxonomyLoading ? "Yo'nalish va xizmatlar yuklanmoqda…" : taxonomyError}</p>
            {taxonomyError && onRetryTaxonomies && (
              <button type="button" className={cn(inlineActionClass, "mt-1 underline")} onClick={onRetryTaxonomies}>
                Qayta urinish
              </button>
            )}
          </div>
        )}
        <Select
          label="Asosiy yo'nalish"
          name="specialty"
          value={doctorSpecialty}
          onChange={(next) => {
            onSpecialtyChange(next);
            clear("specialty");
            // Pre-tick this specialty's usual services; the user can untick any
            // of them, so this is a head start, not a decision made for them.
            const hints = SPECIALTY_SERVICE_HINTS[next];
            if (hints?.length) {
              const preselected = rawServiceChoices
                .filter((option) => hints.includes(option.label))
                .map((option) => option.value);
              if (preselected.length) {
                onSetServices(preselected);
              }
            }
          }}
          options={specialtyChoices}
          placeholder="Yo'nalishni tanlang"
          disabled={taxonomyBlocked}  /* settled, not raw length — see above */
          {...errorFor("specialty")}
        />
        <MultiSelectSheet
          label={
            <>
              Ko&apos;rsatadigan xizmatlar
              <OptionalMark />
            </>
          }
          name="services"
          value={selectedServiceIds}
          onToggle={onToggleService}
          options={serviceChoices}
          placeholder="Xizmatlarni tanlang"
          disabled={servicesSettledEmpty}
        />
        <Field
          label="Ish staji"
          name="experience_years"
          numeric
          suffix="yil"
          placeholder="Masalan: 8"
          hint="Faqat raqam, 0 dan 80 gacha"
          required
          {...errorFor("experience_years")}
          onInput={() => clear("experience_years")}
        />
        <WorkTimeField name="work_time" />
        <TextareaField
          label={
            <>
              Izoh
              <OptionalMark />
            </>
          }
          name="description"
          placeholder="Qisqa ma'lumot"
        />
      </Pane>

      <Pane hidden={step !== 7} intro="Oxirgi qadam: klinika manzili bemorlarga xaritada ko'rinadi.">
        <Field
          label="Ishlaydigan klinika nomi"
          name="clinic_name"
          placeholder="Klinika nomi"
          required
          {...errorFor("clinic_name")}
          onChange={() => clear("clinic_name")}
        />
        <RegionDistrictField
          label="Klinika tumani"
          name="clinic_district"
          mode="select"
          region={doctorRegion}
          district={doctorDistrict || null}
          onSelect={(selection) => {
            onRegionChange(selection.region);
            onDistrictChange(selection.district ?? "");
            clear("clinic_district");
          }}
          placeholder="Tumanni tanlang"
          {...errorFor("clinic_district")}
        />
        <LocationPickerField
          name="clinic_location_url"
          required
          error={invalidField === "clinic_location_url"}
          errorText={invalidField === "clinic_location_url" ? invalidMessage : undefined}
        />
        <PrivacyAcknowledgement error={invalidField === "privacy_acknowledged"} />
        {invalidField === "privacy_acknowledged" && (
          <small className={errorTextClass} role="alert">
            {invalidMessage}
          </small>
        )}
      </Pane>

      <div className="flex gap-3">
        {step > 1 && (
          <Button
            type="button"
            variant="secondary"
            size="lg"
            className="w-auto px-5"
            disabled={busy}
            onClick={goBack}
          >
            <ArrowLeft size={18} aria-hidden="true" />
            Orqaga
          </Button>
        )}
        <Button
          id="doctor-register-advance"
          type="button"
          variant="gradient"
          size="lg"
          className="flex-1"
          disabled={advanceDisabled}
          onClick={isFinalStep ? submitForm : advance}
        >
          {isFinalStep ? (
            <>
              {submitting ? (
                <Loader2 size={18} className="animate-spin" aria-hidden="true" />
              ) : (
                <CheckCircle2 size={18} aria-hidden="true" />
              )}
              {submitting ? "Yuborilmoqda…" : "Ro'yxatdan o'tish"}
            </>
          ) : (
            <>
              {requestingOtp ? (
                <Loader2 size={18} className="animate-spin" aria-hidden="true" />
              ) : null}
              {requestingOtp ? "Kod yuborilmoqda…" : "Davom etish"}
              {!requestingOtp && <ArrowRight size={18} aria-hidden="true" />}
            </>
          )}
        </Button>
      </div>

      {/* Below the row, not inside it: back + skip + primary in one line leaves
          the primary CTA about 60px wide on a 375px phone. */}
      {step === 5 && (
        <Button type="button" variant="ghost" size="lg" disabled={busy} onClick={() => goToStep(6)}>
          <SkipForward size={18} aria-hidden="true" />
          O&apos;tkazib yuborish
        </Button>
      )}

      {/* No third message here: the pane's own status banner covers loading and
          errors, and the Select explains a genuinely empty list in place. A red
          alert on top of those told the doctor to retry something that is not
          theirs to fix. */}
    </form>
  );
}
