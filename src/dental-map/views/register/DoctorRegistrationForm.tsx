import { ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { genderOptions, serviceItems, specialtyOptions } from "../../catalog";
import { PhotoUploadField } from "../../components/PhotoUploadField";
import type { Service, Specialty } from "../../types";
import { Button, Field, MultiSelectSheet, OptionGrid, PhoneField, RegionDistrictField, Select, TextareaField, cn, useToast } from "../../ui";
import { isSupportedMapLink, LocationPickerField } from "./LocationPickerField";
import { WorkTimeField } from "./WorkTimeField";

const STEP_TITLES = ["Shaxsiy ma'lumotlar", "Mutaxassislik", "Klinika"] as const;
const TOTAL_STEPS = STEP_TITLES.length;

type DoctorField =
  | "full_name"
  | "doctor_phone"
  | "doctor_gender"
  | "password"
  | "password_confirm"
  | "specialty"
  | "experience_years"
  | "clinic_name"
  | "clinic_district"
  | "clinic_location_url";

function Section({ step, title, children }: { step: number; title: string; children: ReactNode }) {
  return (
    <section className="rounded-card bg-surface-0 p-5 shadow-card">
      <div className="mb-4 flex items-center gap-3 border-b border-surface-100 pb-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-sm font-bold text-white shadow-card">
          {step}
        </span>
        <h3 className="text-lg font-extrabold tracking-tight text-ink-900">{title}</h3>
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

export function DoctorRegistrationForm({
  step,
  submitting,
  specialties,
  services,
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
  onPhotoFileChange,
  onSubmit
}: {
  step: number;
  submitting: boolean;
  specialties: Specialty[];
  services: Service[];
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
  onPhotoFileChange: (fileName: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [invalidField, setInvalidField] = useState<DoctorField | null>(null);

  // Admin-managed lists when available, else the offline catalog fallback.
  const specialtyChoices = specialties.length
    ? specialties.map((s) => ({ value: s.name, label: s.name }))
    : specialtyOptions.map((item) => ({ value: item, label: item }));
  const serviceChoices = services.length
    ? services.map((s) => ({ value: s.name, label: s.name }))
    : serviceItems.map(({ id, label }) => ({ value: id, label }));

  // Per-step client validation — mirrors the thresholds enforced in
  // DentalMapApp.sendDoctorRegistration so both paths stay consistent. Returns
  // the offending field + message so the specific control can be highlighted.
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
      const password = String(formData.get("password") || "");
      const passwordConfirm = String(formData.get("password_confirm") || "");
      if (password.length < 8) {
        return { field: "password", message: "Parol kamida 8 ta belgidan iborat bo'lishi kerak." };
      }
      if (password !== passwordConfirm) {
        return { field: "password_confirm", message: "Parollar bir xil emas." };
      }
      if (!value("doctor_gender")) {
        return { field: "doctor_gender", message: "Jinsni tanlang." };
      }
      return null;
    }

    if (target === 2) {
      if (!doctorSpecialty.trim() && !value("specialty")) {
        return { field: "specialty", message: "Asosiy yo'nalishni tanlang." };
      }
      if (!value("experience_years")) {
        return { field: "experience_years", message: "Ish stajini kiriting." };
      }
      return null;
    }

    if (target === 3) {
      if (!value("clinic_name")) {
        return { field: "clinic_name", message: "Klinika nomini kiriting." };
      }
      if (!value("clinic_district")) {
        return { field: "clinic_district", message: "Klinika tumanini tanlang." };
      }
      if (!isSupportedMapLink(value("clinic_location_url"))) {
        return { field: "clinic_location_url", message: "Google yoki Yandex Maps linkini kiriting." };
      }
      return null;
    }

    return null;
  }

  function advance() {
    const result = validateStep(step);
    if (result) {
      setInvalidField(result.field);
      toast.error(result.message);
      return;
    }
    setInvalidField(null);
    onStepChange(Math.min(step + 1, TOTAL_STEPS));
  }

  function goBack() {
    setInvalidField(null);
    onStepChange(Math.max(step - 1, 1));
  }

  function submitForm() {
    // Route the final step through the form's native submit so onSubmit receives
    // a real FormEvent (the app reads FormData from event.currentTarget).
    formRef.current?.requestSubmit();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    // Registration may only ever fire from the final step. Any submit event that
    // arrives earlier (stray Enter key, a programmatic requestSubmit) is ignored
    // so the success screen never shows before a real step-3 submission.
    if (step !== TOTAL_STEPS) {
      event.preventDefault();
      return;
    }
    // Step 3 submit — guard once more before handing off to the app.
    const result = validateStep(TOTAL_STEPS);
    if (result) {
      event.preventDefault();
      setInvalidField(result.field);
      toast.error(result.message);
      return;
    }
    setInvalidField(null);
    onSubmit(event);
  }

  const clear = (field: DoctorField) => setInvalidField((current) => (current === field ? null : current));

  return (
    <form
      id="doctor-register-form"
      ref={formRef}
      noValidate
      className="flex flex-col gap-4"
      onSubmit={handleSubmit}
    >
      <div className="rounded-card bg-surface-0 p-4 shadow-card">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-bold text-ink-900">{STEP_TITLES[step - 1]}</span>
          <span className="text-xs font-semibold text-ink-500">
            Qadam {step}/{TOTAL_STEPS}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-1.5" aria-hidden="true">
          {STEP_TITLES.map((title, index) => (
            <span
              key={title}
              className={cn(
                "h-1.5 rounded-full transition-colors",
                index < step ? "bg-brand-500" : "bg-surface-200"
              )}
            />
          ))}
        </div>
      </div>

      <div className={cn(step !== 1 && "hidden")}>
        <Section step={1} title="Shaxsiy ma'lumotlar">
          <Field
            label="Shifokor F.I.O."
            name="full_name"
            placeholder="Ism familiya"
            required
            error={invalidField === "full_name"}
            onChange={() => clear("full_name")}
          />
          <PhoneField
            label="Telefon raqam"
            name="doctor_phone"
            required
            error={invalidField === "doctor_phone"}
            onValueChange={() => clear("doctor_phone")}
          />
          <Field
            label="Parol"
            name="password"
            type="password"
            minLength={8}
            autoComplete="new-password"
            placeholder="Kamida 8 ta belgi"
            required
            error={invalidField === "password"}
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
            error={invalidField === "password_confirm"}
            onChange={() => clear("password_confirm")}
          />
          <fieldset className="m-0 border-0 p-0">
            <legend className="mb-1.5 block text-sm font-medium text-ink-700">Jinsi</legend>
            <OptionGrid
              name="doctor_gender"
              value={doctorGender}
              onChange={(gender) => {
                onDoctorGenderChange(gender);
                clear("doctor_gender");
              }}
              options={genderOptions.map((item) => ({ value: item, label: item }))}
              error={invalidField === "doctor_gender"}
            />
          </fieldset>
          <PhotoUploadField
            name="photo_file"
            label="Shifokor rasmi"
            fileName={photoFileName}
            onFileNameChange={onPhotoFileChange}
          />
        </Section>
      </div>

      <div className={cn(step !== 2 && "hidden")}>
        <Section step={2} title="Mutaxassislik">
          <Select
            label="Asosiy yo'nalish"
            name="specialty"
            value={doctorSpecialty}
            onChange={(next) => {
              onSpecialtyChange(next);
              clear("specialty");
            }}
            options={specialtyChoices}
            placeholder="Yo'nalishni tanlang"
            error={invalidField === "specialty"}
          />
          <MultiSelectSheet
            label="Ko'rsatadigan xizmatlar"
            name="services"
            value={selectedServiceIds}
            onToggle={onToggleService}
            options={serviceChoices}
            placeholder="Xizmatlarni tanlang"
          />
          <Field
            label="Ish staji"
            name="experience_years"
            numeric
            placeholder="Masalan: 8"
            hint="Faqat raqam, masalan 8"
            required
            error={invalidField === "experience_years"}
            onInput={() => clear("experience_years")}
          />
          <WorkTimeField name="work_time" />
          <TextareaField label="Izoh" name="description" placeholder="Qisqa ma'lumot" />
        </Section>
      </div>

      <div className={cn(step !== 3 && "hidden")}>
        <Section step={3} title="Klinika">
          <Field
            label="Ishlaydigan klinika nomi"
            name="clinic_name"
            placeholder="Klinika nomi"
            required
            error={invalidField === "clinic_name"}
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
            error={invalidField === "clinic_district"}
          />
          <LocationPickerField name="clinic_location_url" required />
        </Section>
      </div>

      <div className="flex items-center gap-3">
        {step > 1 && (
          <Button
            type="button"
            variant="secondary"
            size="lg"
            className="flex-1"
            disabled={submitting}
            onClick={goBack}
          >
            <ArrowLeft size={18} />
            Orqaga
          </Button>
        )}
        <Button
          id="doctor-register-advance"
          type="button"
          size="lg"
          className="flex-1"
          disabled={submitting}
          onClick={step === TOTAL_STEPS ? submitForm : advance}
        >
          {step === TOTAL_STEPS ? (
            <>
              {submitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
              {submitting ? "Yuborilmoqda…" : "Ro'yxatdan o'tish"}
            </>
          ) : (
            <>
              Keyingi
              <ArrowRight size={18} />
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
