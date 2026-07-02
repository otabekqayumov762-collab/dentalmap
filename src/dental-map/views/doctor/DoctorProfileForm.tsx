"use client";

import { ImageUp, Save, Stethoscope } from "lucide-react";
import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { districts, specialtyOptions } from "../../catalog";
import type { ApiDoctor, ApiUser } from "../../types";
import { Button, Card, Field, PhoneField, Select, TextareaField, cn } from "../../ui";
import { GroupLabel, SectionHeader } from "./common";

export type DoctorProfileFormProps = {
  user: ApiUser | null;
  profile: ApiDoctor | null;
  loading: boolean;
  onProfileSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void> | void;
};

/** Doctor self-service profile editor. Uncontrolled (FormData) with defaultValue seeding. */
export function DoctorProfileForm({ user, profile, loading, onProfileSubmit }: DoctorProfileFormProps) {
  const [fileName, setFileName] = useState("");
  const [specialty, setSpecialty] = useState(profile?.specialty || specialtyOptions[0]);
  const [clinicDistrict, setClinicDistrict] = useState(profile?.clinic_district || districts[1]);

  useEffect(() => {
    setSpecialty(profile?.specialty || specialtyOptions[0]);
    setClinicDistrict(profile?.clinic_district || districts[1]);
  }, [profile?.clinic_district, profile?.specialty]);

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    setFileName(event.target.files?.[0]?.name ?? "");
  }

  return (
    <form onSubmit={onProfileSubmit} className="flex flex-col gap-5">
      <SectionHeader
        Icon={Stethoscope}
        title="Profil va rasm"
        subtitle="O'zgartirilsa admin qayta tasdiqlaydi."
      />

      {/* Shaxsiy */}
      <section>
        <GroupLabel>Shaxsiy</GroupLabel>
        <Card className="flex flex-col gap-4">
          <Field
            name="full_name"
            label="Ism familiya"
            placeholder="Masalan, Anvar Karimov"
            defaultValue={profile?.full_name || user?.full_name || ""}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              name="specialty"
              label="Mutaxassislik"
              value={specialty}
              onChange={setSpecialty}
              options={specialtyOptions.map((option) => ({ value: option, label: option }))}
            />
            <Field
              name="experience_years"
              type="number"
              label="Tajriba (yil)"
              min={0}
              max={80}
              defaultValue={profile?.experience_years || 0}
            />
          </div>
          <Field
            name="work_time"
            label="Ish vaqti"
            placeholder="09:00 - 18:00"
            hint="Profilda ko'rsatiladi; qabul vaqtlarini 'Jadval' bo'limida belgilaysiz."
            defaultValue={profile?.work_time || ""}
          />

          {/* Rasm — joriy rasm + dropzone (photo_file) + havola (photo) */}
          <div>
            <span className="mb-1.5 block text-sm font-medium text-ink-700">Profil rasmi</span>
            {profile?.photo ? (
              <div className="mb-3 flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={profile.photo}
                  alt="Joriy profil rasmi"
                  className="h-16 w-16 shrink-0 rounded-2xl border border-surface-200 object-cover"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-ink-900">Joriy rasm</span>
                  <span className="block truncate text-xs text-ink-400">Yangisini yuklab almashtirishingiz mumkin</span>
                </span>
              </div>
            ) : null}
            <label
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed px-4 py-3.5 transition-colors",
                "focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-100",
                fileName
                  ? "border-brand-300 bg-brand-50"
                  : "border-surface-300 bg-surface-50 hover:border-brand-400 hover:bg-brand-50"
              )}
            >
              <span
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-xl transition-colors",
                  fileName ? "bg-brand-100 text-brand-600" : "bg-brand-50 text-brand-600"
                )}
              >
                <ImageUp size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-ink-900">{fileName || "Rasm tanlang"}</span>
                <span className="block truncate text-xs text-ink-400">
                  {fileName ? "Boshqasini tanlash uchun bosing" : "JPG, PNG yoki WEBP"}
                </span>
              </span>
              <input
                type="file"
                name="photo_file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={onFileChange}
              />
            </label>
          </div>
          <Field
            name="photo"
            type="url"
            label="Rasm havolasi (ixtiyoriy)"
            placeholder="https://..."
            hint="Fayl yuklamasangiz, rasm havolasini qoldiring."
            defaultValue={profile?.photo || ""}
          />
        </Card>
      </section>

      {/* Klinika */}
      <section>
        <GroupLabel>Klinika</GroupLabel>
        <Card className="flex flex-col gap-4">
          <Field name="clinic_name" label="Klinika nomi" defaultValue={profile?.clinic_name || ""} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              name="clinic_district"
              label="Tuman"
              value={clinicDistrict}
              onChange={setClinicDistrict}
              options={districts.slice(1).map((district) => ({ value: district, label: district }))}
            />
            <PhoneField
              name="doctor_phone"
              label="Telefon raqam"
              defaultValue={profile?.doctor_phone || user?.phone || ""}
            />
          </div>
          <TextareaField
            name="clinic_address"
            label="Manzil"
            placeholder="Ko'cha, uy yoki mo'ljal"
            defaultValue={profile?.clinic_address || ""}
          />
          <Field
            name="clinic_location_url"
            type="url"
            label="Xarita havolasi"
            placeholder="https://maps..."
            defaultValue={profile?.clinic_location_url || ""}
          />
          <TextareaField
            name="directions"
            label="Yo'l ko'rsatmalari"
            placeholder="Mo'ljal va qanday yetib borish"
            defaultValue={profile?.directions || ""}
          />
          <TextareaField
            name="description"
            label="Tavsif"
            placeholder="O'zingiz va xizmatlaringiz haqida"
            defaultValue={profile?.description || ""}
          />
        </Card>
      </section>

      <Button type="submit" size="lg" disabled={loading}>
        <Save size={18} />
        {loading ? "Saqlanmoqda…" : "Profilni saqlash"}
      </Button>
    </form>
  );
}
