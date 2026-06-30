import { Camera, CheckCircle2, Clock, Star, Upload } from "lucide-react";
import type { FormEvent } from "react";
import { districts, serviceItems, specialtyOptions } from "../../catalog";
import { ChoiceField } from "../../components/common";
import { Button, Chip, Field, PhoneField, Select, TextareaField } from "../../ui";
import { LocationPickerField } from "./LocationPickerField";

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
    <form id="doctor-register-form" className="flex flex-col gap-4 rounded-card bg-surface-0 p-5 shadow-card" onSubmit={onSubmit}>
      <Field label="Shifokor F.I.O." name="full_name" placeholder="Shifokor F.I.O." />
      <ChoiceField
        label="Asosiy yo'nalish"
        name="specialty"
        value={doctorSpecialty}
        options={specialtyOptions}
        onChange={onSpecialtyChange}
      />
      <fieldset className="m-0 border-0 p-0">
        <legend className="mb-1.5 block text-sm font-medium text-ink-700">
          Ko&apos;rsatadigan xizmatlar
        </legend>
        <input type="hidden" name="services" value={selectedServiceIds.join(",")} />
        <div className="flex flex-wrap gap-2">
          {serviceItems.map(({ id, label }) => {
            const active = selectedServiceIds.includes(id);

            return (
              <Chip key={id} active={active} onClick={() => onToggleService(id)}>
                {label}
                {active && <CheckCircle2 size={14} />}
              </Chip>
            );
          })}
        </div>
      </fieldset>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Ish staji" name="experience_years" placeholder="Masalan: 8 yil" />
        <Field label="Ish vaqti" name="work_time" placeholder="09:00 - 18:00" />
      </div>
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
      <Field label="Ishlaydigan klinika nomi" name="clinic_name" placeholder="Klinika nomi" />
      <TextareaField label="Izoh" name="description" placeholder="Qisqa ma'lumot" />
      <div className="flex items-center gap-3 rounded-2xl bg-surface-50 px-4 py-3.5">
        <Star size={18} className="shrink-0 text-warning" />
        <span>
          <strong className="block text-sm font-semibold text-ink-900">
            Reyting administrator orqali yuritiladi
          </strong>
          <small className="block text-xs text-ink-500">
            Reyting va sharhlar tasdiqlangan qabul tarixidan hisoblanadi.
          </small>
        </span>
      </div>
      <PhoneField label="Shifokor telefon raqami" name="doctor_phone" />
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
      {registrationError && (
        <div
          role="alert"
          className="flex items-center gap-3 rounded-2xl bg-rose-50 px-4 py-3 text-danger"
        >
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
