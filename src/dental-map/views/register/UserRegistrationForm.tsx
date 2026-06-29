import { CheckCircle2, Clock } from "lucide-react";
import type { FormEvent } from "react";
import { districts, genderOptions } from "../../catalog";
import { ChoiceField } from "../../components/common";

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
      <div className="admin-status sent">
        <CheckCircle2 size={18} />
        <span>
          <strong>Profil tayyor</strong>
          <small>Endi qabulga yozilish va shifokor tanlash mumkin.</small>
        </span>
      </div>
    );
  }

  return (
    <>
      <form id="user-register-form" className="consult-form" onSubmit={onSubmit}>
        <label>
          <span>F.I.O.</span>
          <input name="full_name" placeholder="F.I.O." />
        </label>
        <label>
          <span>Telefon raqam</span>
          <input name="phone" placeholder="+998 ..." />
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
            <input name="age" type="number" min="1" max="100" placeholder="Yosh" />
          </label>
        </div>
        <label>
          <span>Shahar</span>
          <input name="city" placeholder="Shahar" />
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
          <textarea name="address" placeholder="Manzil" />
        </label>
        {registrationError && (
          <div className="admin-status error">
            <Clock size={18} />
            <span>
              <strong>Yuborilmadi</strong>
              <small>{registrationError}</small>
            </span>
          </div>
        )}
        <button className="primary-btn submit" type="submit">
          <CheckCircle2 size={18} />
          Profil yaratish
        </button>
      </form>
    </>
  );
}
