import { ArrowLeft, ArrowRight, Camera, CheckCircle2, Info, Loader2, Upload } from "lucide-react";
import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { serviceItems, specialtyOptions } from "../../catalog";
import { Button, Field, MultiSelectSheet, PhoneField, RegionDistrictField, Select, TextareaField, cn, useToast } from "../../ui";
import { WorkTimeField } from "./WorkTimeField";

const STEP_TITLES = ["Shaxsiy ma'lumotlar", "Mutaxassislik", "Klinika"] as const;
const TOTAL_STEPS = STEP_TITLES.length;

type DoctorField =
  | "full_name"
  | "doctor_phone"
  | "password"
  | "password_confirm"
  | "specialty"
  | "experience_years"
  | "clinic_name"
  | "clinic_district"
  | "clinic_address";

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
  doctorSpecialty,
  doctorRegion,
  doctorDistrict,
  selectedServiceIds,
  photoFileName,
  onStepChange,
  onSpecialtyChange,
  onRegionChange,
  onDistrictChange,
  onToggleService,
  onPhotoFileChange,
  onSubmit
}: {
  step: number;
  submitting: boolean;
  doctorSpecialty: string;
  doctorRegion: string | null;
  doctorDistrict: string;
  selectedServiceIds: string[];
  photoFileName: string;
  onStepChange: (step: number) => void;
  onSpecialtyChange: (specialty: string) => void;
  onRegionChange: (region: string | null) => void;
  onDistrictChange: (district: string) => void;
  onToggleService: (serviceId: string) => void;
  onPhotoFileChange: (fileName: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [invalidField, setInvalidField] = useState<DoctorField | null>(null);

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
      if (!value("clinic_address")) {
        return { field: "clinic_address", message: "Klinika manzilini kiriting." };
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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    // Step 3 native submit — guard once more before handing off to the app.
    const result = validateStep(3);
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
          <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-surface-200 bg-surface-50 px-4 py-3.5 transition-colors hover:border-brand-300 hover:bg-brand-50">
            <input
              type="file"
              name="photo_file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(event) => onPhotoFileChange(event.currentTarget.files?.[0]?.name ?? "")}
            />
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-500">
              <Camera size={20} />
            </span>
            <span className="min-w-0 flex-1">
              <strong className="block truncate text-sm font-semibold text-ink-900">
                {photoFileName || "Rasm yuklash"}
              </strong>
              <small className="block text-xs text-ink-500">
                {photoFileName ? "Rasm tanlandi" : "JPG, PNG yoki WebP"}
              </small>
            </span>
            <Upload size={18} className="shrink-0 text-ink-400" />
          </label>
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
            options={specialtyOptions.map((item) => ({ value: item, label: item }))}
            placeholder="Yo'nalishni tanlang"
            error={invalidField === "specialty"}
          />
          <MultiSelectSheet
            label="Ko'rsatadigan xizmatlar"
            name="services"
            value={selectedServiceIds}
            onToggle={onToggleService}
            options={serviceItems.map(({ id, label }) => ({ value: id, label }))}
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
          <Field
            label="Klinika manzili"
            name="clinic_address"
            placeholder="Ko'cha va uy raqami (masalan: Bunyodkor 9)"
            required
            error={invalidField === "clinic_address"}
            onChange={() => clear("clinic_address")}
          />
          <div className="flex items-start gap-3 rounded-2xl border border-brand-100 bg-brand-50 px-4 py-3.5 text-sm text-ink-700">
            <Info size={18} className="mt-0.5 shrink-0 text-brand-600" />
            <p>Klinika lokatsiyasi Telegram bot orqali yuboriladi. Shifokor tasdiqlagandan so&apos;ng sizga xabar beramiz.</p>
          </div>
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
          type={step === TOTAL_STEPS ? "submit" : "button"}
          size="lg"
          className="flex-1"
          disabled={submitting}
          onClick={step === TOTAL_STEPS ? undefined : advance}
        >
          {step === TOTAL_STEPS ? (
            <>
              {submitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
              {submitting ? "Yuborilmoqda…" : "To'lovga o'tish"}
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
