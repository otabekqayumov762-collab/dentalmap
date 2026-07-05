"use client";

import { Save, Stethoscope } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { districts, specialtyOptions } from "../../catalog";
import { PhotoUploadField } from "../../components/PhotoUploadField";
import type { ApiDoctor, ApiUser, Specialty } from "../../types";
import { Button, Card, Field, PhoneField, Select, TextareaField } from "../../ui";
import { GroupLabel, SectionHeader } from "./common";

export type DoctorProfileFormProps = {
  user: ApiUser | null;
  profile: ApiDoctor | null;
  specialties: Specialty[];
  loading: boolean;
  onProfileSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void> | void;
};

/** Doctor self-service profile editor. Uncontrolled (FormData) with defaultValue seeding. */
export function DoctorProfileForm({ user, profile, specialties, loading, onProfileSubmit }: DoctorProfileFormProps) {
  // Admin-managed names when available, else the offline catalog fallback.
  const specialtyNames = specialties.length ? specialties.map((s) => s.name) : specialtyOptions;

  const [fileName, setFileName] = useState("");
  const [specialty, setSpecialty] = useState(profile?.specialty || specialtyNames[0]);
  const [clinicDistrict, setClinicDistrict] = useState(profile?.clinic_district || districts[1]);

  useEffect(() => {
    setSpecialty(profile?.specialty || specialtyNames[0]);
    setClinicDistrict(profile?.clinic_district || districts[1]);
    // Re-seed when a late-arriving fetched list resolves and the doctor has no saved specialty.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.clinic_district, profile?.specialty, specialtyNames.length]);

  return (
    <form onSubmit={onProfileSubmit} className="flex flex-col gap-5">
      <SectionHeader
        Icon={Stethoscope}
        title="Profil va rasm"
        subtitle="O'zgarishlar darhol saqlanadi."
      />

      {/* Shaxsiy */}
      <section>
        <GroupLabel>Shaxsiy</GroupLabel>
        <Card className="flex flex-col gap-4">
          {/* full_name is READ-ONLY on the backend (DoctorSelfUpdateSerializer):
              an editable input here was a "saved but not saved" trap — the PATCH
              returned 200 and the success haptic fired, but the name never changed. */}
          <Field
            label="Ism familiya"
            readOnly
            hint="Ismni o'zgartirish uchun administratorga murojaat qiling."
            defaultValue={profile?.full_name || user?.full_name || ""}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              name="specialty"
              label="Mutaxassislik"
              value={specialty}
              onChange={setSpecialty}
              options={specialtyNames.map((option) => ({ value: option, label: option }))}
            />
            <Field
              name="experience_years"
              numeric
              label="Tajriba (yil)"
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

          <PhotoUploadField
            name="photo_file"
            label="Profil rasmi"
            fileName={fileName}
            existingPhotoUrl={profile?.photo}
            onFileNameChange={setFileName}
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
            hint="Yandex yoki Google Maps havolasi — bemorlarga klinika lokatsiyasini yuborish uchun kerak."
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
