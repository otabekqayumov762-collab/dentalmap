import { ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { genderOptions } from "../../catalog";
import { PrivacyAcknowledgement } from "../../components/PrivacyAcknowledgement";
import {
  Button,
  Field,
  OptionGrid,
  PhoneField,
  RegionDistrictField,
  cn,
  labelClass,
  useToast
} from "../../ui";
import { StepHeader } from "./StepHeader";

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
 * No SMS step here — see the note on the phone pane.
 */
const USER_STEPS = [
  { id: "identity", title: "Shaxsiy ma'lumotlar", intro: "Ism va telefon raqamingizni kiriting." },
  { id: "password", title: "Parol yarating", intro: "Hisobingizga kirish uchun parol o'ylab toping." },
  { id: "profile", title: "Jinsi va yoshi", intro: "Bu shifokor tanlashda yordam beradi." },
  { id: "location", title: "Manzil", intro: "Yaqin atrofdagi klinikalarni ko'rsatamiz." }
] as const;

const TOTAL_USER_STEPS = USER_STEPS.length;

type UserField =
  | "full_name"
  | "phone"
  | "password"
  | "password_confirm"
  | "district"
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
  userRegion,
  userDistrict,
  userRegistered,
  submitting,
  onGenderChange,
  onRegionChange,
  onDistrictChange,
  onSubmit,
  onStepChange
}: {
  userGender: string;
  userRegion: string | null;
  userDistrict: string;
  userRegistered: boolean;
  submitting: boolean;
  onGenderChange: (gender: string) => void;
  onRegionChange: (region: string | null) => void;
  onDistrictChange: (district: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  /** Mirrored to the shell so the auth chrome can collapse once a choice is made. */
  onStepChange?: (step: number) => void;
}) {
  const { toast } = useToast();
  const [invalidField, setInvalidField] = useState<UserField | null>(null);
  const [step, setStep] = useState(1);

  function goToStep(next: number) {
    setStep(next);
    onStepChange?.(next);
  }
  const formRef = useRef<HTMLFormElement | null>(null);

  function fail(field: UserField, message: string) {
    setInvalidField(field);
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
      return null;
    }

    if (target === 2) {
      if (value("password").length < 8) {
        return { field: "password", message: "Parol kamida 8 ta belgidan iborat bo'lishi kerak." };
      }
      if (value("password") !== value("password_confirm")) {
        return { field: "password_confirm", message: "Parollar bir xil emas." };
      }
      return null;
    }

    // Pane 3 (gender, age) is entirely optional — gating it would block signup
    // on data the backend does not require.

    if (target === 4) {
      if (value("privacy_acknowledged") !== "yes") {
        return { field: "privacy_acknowledged", message: "Maxfiylik qoidalarini o'qib tasdiqlang." };
      }
    }
    return null;
  }

  function advance() {
    const result = validateStep(step);
    if (result) {
      fail(result.field, result.message);
      return;
    }
    setInvalidField(null);
    goToStep(Math.min(step + 1, TOTAL_USER_STEPS));
  }

  function goBack() {
    setInvalidField(null);
    goToStep(Math.max(step - 1, 1));
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

  return (
    <form
      id="user-register-form"
      ref={formRef}
      noValidate
      className="flex flex-col gap-6"
      onSubmit={handleSubmit}
    >
      <StepHeader step={step} total={TOTAL_USER_STEPS} title={USER_STEPS[step - 1].title} />

      <Pane hidden={step !== 1} intro={USER_STEPS[0].intro}>
        <Field
          label="F.I.O."
          name="full_name"
          placeholder="Ism familiya"
          required
          error={invalidField === "full_name"}
          onChange={() => clear("full_name")}
        />
        {/* No SMS verification on this path on purpose: patients are the
            high-volume role and every code costs money, while a patient who
            mistypes their number simply cannot be called back — they are not
            listed publicly and take no payments. Doctors are verified instead. */}
        <PhoneField
          label="Telefon raqam"
          name="phone"
          required
          error={invalidField === "phone"}
          onValueChange={() => clear("phone")}
        />
      </Pane>

      <Pane hidden={step !== 2} intro={USER_STEPS[1].intro}>
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

      <Pane hidden={step !== 3} intro={USER_STEPS[2].intro}>
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
      </Pane>

      <Pane hidden={step !== 4} intro={USER_STEPS[3].intro}>
        <RegionDistrictField
          label="Tuman"
          name="district"
          mode="select"
          region={userRegion}
          district={userDistrict || null}
          onSelect={(selection) => {
            onRegionChange(selection.region);
            onDistrictChange(selection.district ?? "");
            clear("district");
          }}
          placeholder="Tumanni tanlang"
        />
        <PrivacyAcknowledgement error={invalidField === "privacy_acknowledged"} />
      </Pane>

      <div className="flex items-center gap-3">
        {step > 1 && (
          <Button type="button" variant="secondary" size="lg" className="shrink-0" onClick={goBack}>
            <ArrowLeft size={18} />
            Ortga
          </Button>
        )}
        {isLastStep ? (
          <Button type="submit" variant="gradient" size="lg" className="flex-1" disabled={submitting}>
            {submitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
            {submitting ? "Yuborilmoqda…" : "Profil yaratish"}
          </Button>
        ) : (
          <Button type="button" variant="gradient" size="lg" className="flex-1" onClick={advance}>
            Davom etish
            <ArrowRight size={18} />
          </Button>
        )}
      </div>
    </form>
  );
}
