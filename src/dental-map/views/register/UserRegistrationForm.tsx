import { CheckCircle2, Loader2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { genderOptions } from "../../catalog";
import { Button, Field, OptionGrid, PhoneField, RegionDistrictField, useToast } from "../../ui";

type UserField = "full_name" | "phone";

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
        region={userRegion}
        district={userDistrict || null}
        onSelect={(selection) => {
          onRegionChange(selection.region);
          onDistrictChange(selection.district ?? "");
        }}
        placeholder="Tumanni tanlang"
      />
      <Button type="submit" size="lg" disabled={submitting}>
        {submitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
        {submitting ? "Yuborilmoqda…" : "Profil yaratish"}
      </Button>
    </form>
  );
}
