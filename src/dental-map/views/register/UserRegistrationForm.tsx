import { CheckCircle2, Loader2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { genderOptions } from "../../catalog";
import { PrivacyAcknowledgement } from "../../components/PrivacyAcknowledgement";
import { Button, Field, OptionGrid, PhoneField, RegionDistrictField, useToast } from "../../ui";

type UserField = "full_name" | "phone" | "password" | "password_confirm" | "privacy_acknowledged";

export function UserRegistrationForm({
  userGender,
  userRegion,
  userDistrict,
  userRegistered,
  submitting,
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
  onGenderChange: (gender: string) => void;
  onRegionChange: (region: string | null) => void;
  onDistrictChange: (district: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const { toast } = useToast();
  const [invalidField, setInvalidField] = useState<UserField | null>(null);

  // Mirrors the thresholds in DentalMapApp.sendUserRegistration; gating here
  // (before the passed onSubmit) means the app-level guards act only as a
  // backstop, so a single toast fires per failure.
  function validate(form: HTMLFormElement): { field: UserField; message: string } | null {
    const data = new FormData(form);
    const value = (key: string) => String(data.get(key) || "").trim();
    if (value("full_name").length < 2) {
      return { field: "full_name", message: "F.I.O. ni to'liq kiriting." };
    }
    if (value("phone").replace(/\D/g, "").length < 12) {
      return { field: "phone", message: "Telefon raqamni to'liq kiriting." };
    }
    if (value("password").length < 8) {
      return { field: "password", message: "Parol kamida 8 ta belgidan iborat bo'lishi kerak." };
    }
    if (value("password") !== value("password_confirm")) {
      return { field: "password_confirm", message: "Parollar bir xil emas." };
    }
    if (value("privacy_acknowledged") !== "yes") {
      return { field: "privacy_acknowledged", message: "Maxfiylik qoidalarini o'qib tasdiqlang." };
    }
    return null;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const result = validate(event.currentTarget);
    if (result) {
      event.preventDefault();
      setInvalidField(result.field);
      toast.error(result.message);
      return;
    }
    setInvalidField(null);
    onSubmit(event);
  }

  const clear = (field: UserField) => setInvalidField((current) => (current === field ? null : current));

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
    <form
      id="user-register-form"
      noValidate
      className="flex flex-col gap-4 rounded-card bg-surface-0 p-5 shadow-card"
      onSubmit={handleSubmit}
    >
      <Field
        label="F.I.O."
        name="full_name"
        placeholder="Ism familiya"
        required
        error={invalidField === "full_name"}
        onChange={() => clear("full_name")}
      />
      <PhoneField
        label="Telefon raqam"
        name="phone"
        required
        error={invalidField === "phone"}
        onValueChange={() => clear("phone")}
      />
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
      <fieldset className="m-0 border-0 p-0">
        <legend className="mb-1.5 block text-sm font-medium text-ink-700">Jinsi</legend>
        <OptionGrid
          name="gender"
          value={userGender}
          onChange={onGenderChange}
          options={genderOptions.map((item) => ({ value: item, label: item }))}
        />
      </fieldset>
      <Field label="Yoshi" name="age" numeric placeholder="Yosh" />
      <RegionDistrictField
        label="Tuman"
        name="district"
        mode="select"
        region={userRegion}
        district={userDistrict || null}
        onSelect={(selection) => {
          onRegionChange(selection.region);
          onDistrictChange(selection.district ?? "");
        }}
        placeholder="Tumanni tanlang"
      />
      <PrivacyAcknowledgement error={invalidField === "privacy_acknowledged"} />
      <Button type="submit" size="lg" disabled={submitting}>
        {submitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
        {submitting ? "Yuborilmoqda…" : "Profil yaratish"}
      </Button>
    </form>
  );
}
