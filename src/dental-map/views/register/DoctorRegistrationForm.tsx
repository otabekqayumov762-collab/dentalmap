import { Camera, CheckCircle2, Clock, Upload } from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { districts, serviceItems, specialtyOptions } from "../../catalog";
import { Button, Field, OptionGrid, PhoneField, Select, TextareaField } from "../../ui";
import { LocationPickerField } from "./LocationPickerField";
import { WorkTimeField } from "./WorkTimeField";

function Section({ step, title, children }: { step: number; title: string; children: ReactNode }) {
  return (
    <section className="rounded-card bg-surface-0 p-5 shadow-card">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-600">
          {step}
        </span>
        <h3 className="text-sm font-bold text-ink-900">{title}</h3>
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

function FieldGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <fieldset className="m-0 border-0 p-0">
      <legend className="mb-1.5 block text-sm font-medium text-ink-700">{label}</legend>
      {children}
    </fieldset>
  );
}

export function DoctorRegistrationForm({
  doctorSpecialty,
  doctorDistrict,
  selectedServiceIds,
  photoFileName,
  registrationError,
  onSpecialtyChange,
  onDistrictChange,
  onToggleService,
  onPhotoFileChange,
  onSubmit
}: {
  doctorSpecialty: string;
  doctorDistrict: string;
  selectedServiceIds: string[];
  photoFileName: string;
  registrationError: string;
  onSpecialtyChange: (specialty: string) => void;
  onDistrictChange: (district: string) => void;
  onToggleService: (serviceId: string) => void;
  onPhotoFileChange: (fileName: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form id="doctor-register-form" className="flex flex-col gap-4" onSubmit={onSubmit}>
      <Section step={1} title="Shaxsiy ma'lumotlar">
        <Field label="Shifokor F.I.O." name="full_name" placeholder="Ism familiya" />
        <PhoneField label="Telefon raqam" name="doctor_phone" />
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

      <Section step={2} title="Mutaxassislik">
        <FieldGroup label="Asosiy yo'nalish">
          <OptionGrid
            name="specialty"
            value={doctorSpecialty}
            onChange={onSpecialtyChange}
            options={specialtyOptions.map((item) => ({ value: item, label: item }))}
          />
        </FieldGroup>
        <FieldGroup label="Ko'rsatadigan xizmatlar">
          <OptionGrid
            multiple
            name="services"
            value={selectedServiceIds}
            onChange={onToggleService}
            options={serviceItems.map(({ id, label }) => ({ value: id, label }))}
          />
        </FieldGroup>
        <Field label="Ish staji" name="experience_years" placeholder="Masalan: 8 yil" />
        <WorkTimeField name="work_time" />
        <TextareaField label="Izoh" name="description" placeholder="Qisqa ma'lumot" />
      </Section>

      <Section step={3} title="Klinika">
        <Field label="Ishlaydigan klinika nomi" name="clinic_name" placeholder="Klinika nomi" />
        <Select
          label="Klinika tumani"
          name="clinic_district"
          value={doctorDistrict}
          options={districts.slice(1).map((district) => ({ value: district, label: district }))}
          onChange={onDistrictChange}
          placeholder="Tumanni tanlang"
        />
        <Field
          label="Klinika manzili"
          name="clinic_address"
          placeholder="Ko'cha va uy raqami (masalan: Bunyodkor 9)"
        />
        <LocationPickerField name="clinic_location_url" label="Klinika lokatsiyasi (kartada)" />
      </Section>

      {registrationError && (
        <div role="alert" className="flex items-center gap-3 rounded-2xl bg-rose-50 px-4 py-3 text-danger">
          <Clock size={18} className="shrink-0" />
          <span>
            <strong className="block text-sm font-semibold">Yuborilmadi</strong>
            <small className="block text-xs opacity-90">{registrationError}</small>
          </span>
        </div>
      )}

      <Button type="submit" size="lg">
        <CheckCircle2 size={18} />
        Shifokor anketasini yuborish
      </Button>
    </form>
  );
}
