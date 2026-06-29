import { CheckCircle2 } from "lucide-react";
import type { FormEvent } from "react";
import { districts, genderOptions } from "../../catalog";
import { ChoiceField } from "../../components/common";

export function UserRegistrationForm({
  userGender,
  userDistrict,
  userRegistered,
  onGenderChange,
  onDistrictChange,
  onSubmit
}: {
  userGender: string;
  userDistrict: string;
  userRegistered: boolean;
  onGenderChange: (gender: string) => void;
  onDistrictChange: (district: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <>
      <form className="consult-form" onSubmit={onSubmit}>
        <label>
          <span>F.I.O.</span>
          <input placeholder="F.I.O." />
        </label>
        <label>
          <span>Telefon raqam</span>
          <input placeholder="+998 ..." />
        </label>
        <div className="two-fields">
          <ChoiceField
            label="Jinsi"
            name="gender"
            value={userGender}
            options={genderOptions}
            onChange={onGenderChange}
          />
          <label>
            <span>Yoshi</span>
            <input type="number" min="1" max="100" placeholder="Yosh" />
          </label>
        </div>
        <label>
          <span>Shahar</span>
          <input placeholder="Shahar" />
        </label>
        <ChoiceField
          label="Tuman"
          name="district"
          value={userDistrict}
          options={districts.slice(1)}
          onChange={onDistrictChange}
        />
        <label>
          <span>Yashash joyi</span>
          <textarea placeholder="Manzil" />
        </label>
        <button className="primary-btn submit" type="submit">
          <CheckCircle2 size={18} />
          Profil yaratish
        </button>
      </form>

      {userRegistered && (
        <div className="admin-status sent">
          <CheckCircle2 size={18} />
          <span>
            <strong>Profil tayyor</strong>
            <small>Endi qabulga yozilish va shifokor tanlash mumkin.</small>
          </span>
        </div>
      )}
    </>
  );
}
