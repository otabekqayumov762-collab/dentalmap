import { Camera, CheckCircle2, Clock, Star, Upload } from "lucide-react";
import type { FormEvent } from "react";
import { districts, serviceItems, specialtyOptions } from "../../catalog";
import { ChoiceField } from "../../components/common";

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
    <form id="doctor-register-form" className="consult-form doctor-register-form" onSubmit={onSubmit}>
      <label>
        <span>Shifokor F.I.O.</span>
        <input name="full_name" placeholder="Shifokor F.I.O." />
      </label>
      <ChoiceField
        label="Asosiy yo'nalish"
        name="specialty"
        value={doctorSpecialty}
        options={specialtyOptions}
        onChange={onSpecialtyChange}
      />
      <fieldset className="service-picker">
        <legend>Ko&apos;rsatadigan xizmatlar</legend>
        <input type="hidden" name="services" value={selectedServiceIds.join(",")} />
        <div className="service-pill-row">
          {serviceItems.map(({ id, label, Icon }) => {
            const active = selectedServiceIds.includes(id);

            return (
              <button
                key={id}
                className={active ? "service-pill active" : "service-pill"}
                type="button"
                aria-pressed={active}
                onClick={() => onToggleService(id)}
              >
                <Icon size={16} />
                <span>{label}</span>
                {active && <CheckCircle2 size={14} />}
              </button>
            );
          })}
        </div>
      </fieldset>
      <div className="two-fields">
        <label>
          <span>Ish staji</span>
          <input name="experience_years" placeholder="Masalan: 8 yil" />
        </label>
        <label>
          <span>Ish vaqti</span>
          <input name="work_time" placeholder="09:00 - 18:00" />
        </label>
      </div>
      <label className="upload-card">
        <input
          type="file"
          name="photo_file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => onPhotoFileChange(event.currentTarget.files?.[0]?.name ?? "")}
        />
        <span className="upload-icon">
          <Camera size={20} />
        </span>
        <span className="upload-copy">
          <strong>{photoFileName || "Rasm yuklash"}</strong>
          <small>{photoFileName ? "Rasm tanlandi" : "JPG, PNG yoki WebP"}</small>
        </span>
        <Upload size={18} />
      </label>
      <label>
        <span>Ishlaydigan klinika nomi</span>
        <input name="clinic_name" placeholder="Klinika nomi" />
      </label>
      <label>
        <span>Izoh</span>
        <textarea name="description" placeholder="Qisqa ma'lumot" />
      </label>
      <div className="admin-status">
        <Star size={18} />
        <span>
          <strong>Reyting administrator orqali yuritiladi</strong>
          <small>Reyting va sharhlar tasdiqlangan qabul tarixidan hisoblanadi.</small>
        </span>
      </div>
      <label>
        <span>Shifokor telefon raqami</span>
        <input name="doctor_phone" placeholder="+998 ..." />
      </label>
      <div className="two-fields">
        <ChoiceField
          label="Klinika tumani"
          name="clinic_district"
          value={doctorDistrict}
          options={districts.slice(1)}
          onChange={onDistrictChange}
        />
        <label>
          <span>Klinika joylashuvi</span>
          <input name="clinic_address" placeholder="Manzil" />
        </label>
      </div>
      <label>
        <span>Klinika lokatsiya linki</span>
        <input
          name="clinic_location_url"
          type="url"
          placeholder="Google Maps yoki Yandex Maps linki"
        />
      </label>
      <label>
        <span>Klinikagacham borish</span>
        <textarea name="directions" placeholder="Mo'ljal yoki lokatsiya izohi" />
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
        Shifokor anketasini yuborish
      </button>
    </form>
  );
}
