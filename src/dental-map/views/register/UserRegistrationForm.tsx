import { CheckCircle2, Clock } from "lucide-react";
import type { FormEvent } from "react";
import { districts, genderOptions } from "../../catalog";
import { Button, Field, OptionGrid, PhoneField, Select, TextareaField } from "../../ui";

export function UserRegistrationForm({
  userGender,
  userDistrict,
  userRegistered,
  registrationError,
  onGenderChange,
  onDistrictChange,
  onSubmit
}: {
  userGender: string;
  userDistrict: string;
  userRegistered: boolean;
  registrationError: string;
  onGenderChange: (gender: string) => void;
  onDistrictChange: (district: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  if (userRegistered) {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-brand-50 px-4 py-3.5">
        <CheckCircle2 size={18} className="shrink-0 text-brand-500" />
        <span>
          <strong className="block text-sm font-semibold text-ink-900">Profil tayyor</strong>
          <small className="block text-xs text-ink-500">Endi qabulga yozilish va shifokor tanlash mumkin.</small>
        </span>
      </div>
    );
  }

  return (
    <form id="user-register-form" className="flex flex-col gap-4 rounded-card bg-surface-0 p-5 shadow-card" onSubmit={onSubmit}>
      <Field label="F.I.O." name="full_name" placeholder="Ism familiya" />
      <PhoneField label="Telefon raqam" name="phone" />
      <fieldset className="m-0 border-0 p-0">
        <legend className="mb-1.5 block text-sm font-medium text-ink-700">Jinsi</legend>
        <OptionGrid
          name="gender"
          value={userGender}
          onChange={onGenderChange}
          options={genderOptions.map((item) => ({ value: item, label: item }))}
        />
      </fieldset>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Yoshi" name="age" type="number" min="1" max="100" placeholder="Yosh" />
        <Field label="Shahar" name="city" placeholder="Shahar" />
      </div>
      <Select
        label="Tuman"
        name="district"
        value={userDistrict}
        options={districts.slice(1).map((district) => ({ value: district, label: district }))}
        onChange={onDistrictChange}
        placeholder="Tumanni tanlang"
      />
      <TextareaField label="Yashash joyi" name="address" placeholder="Manzil" />
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
        Profil yaratish
      </Button>
    </form>
  );
}
