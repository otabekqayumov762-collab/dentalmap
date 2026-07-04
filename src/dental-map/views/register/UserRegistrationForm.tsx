import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import type { FormEvent } from "react";
import { genderOptions } from "../../catalog";
import { Button, Field, OptionGrid, PhoneField, RegionDistrictField } from "../../ui";

export function UserRegistrationForm({
  userGender,
  userRegion,
  userDistrict,
  userRegistered,
  submitting,
  registrationError,
  onGenderChange,
  onRegionChange,
  onDistrictChange,
  onSubmit
}: {
  userGender: string;
  userRegion: string | null;
  userDistrict: string;
  userRegistered: boolean;
  submitting: boolean;
  registrationError: string;
  onGenderChange: (gender: string) => void;
  onRegionChange: (region: string | null) => void;
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
      <Field label="F.I.O." name="full_name" placeholder="Ism familiya" required />
      <PhoneField label="Telefon raqam" name="phone" required />
      <Field
        label="Parol"
        name="password"
        type="password"
        minLength={8}
        autoComplete="new-password"
        placeholder="Kamida 8 ta belgi"
        required
      />
      <Field
        label="Parolni takrorlang"
        name="password_confirm"
        type="password"
        minLength={8}
        autoComplete="new-password"
        placeholder="Parolni qayta kiriting"
        required
      />
      <fieldset className="m-0 border-0 p-0">
        <legend className="mb-1.5 block text-sm font-medium text-ink-700">Jinsi</legend>
        <OptionGrid
          name="gender"
          value={userGender}
          onChange={onGenderChange}
          options={genderOptions.map((item) => ({ value: item, label: item }))}
        />
      </fieldset>
      <Field label="Yoshi" name="age" type="number" min="1" max="100" placeholder="Yosh" />
      <RegionDistrictField
        label="Tuman"
        name="district"
        region={userRegion}
        district={userDistrict || null}
        onSelect={(selection) => {
          onRegionChange(selection.region);
          onDistrictChange(selection.district ?? "");
        }}
        placeholder="Tumanni tanlang"
      />
      {registrationError && (
        <div role="alert" className="flex items-center gap-3 rounded-2xl bg-danger/10 px-4 py-3 text-danger">
          <XCircle size={18} className="shrink-0" />
          <span>
            <strong className="block text-sm font-semibold">Yuborilmadi</strong>
            <small className="block text-xs opacity-90">{registrationError}</small>
          </span>
        </div>
      )}
      <Button type="submit" size="lg" disabled={submitting}>
        {submitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
        {submitting ? "Yuborilmoqda…" : "Profil yaratish"}
      </Button>
    </form>
  );
}
