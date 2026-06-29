import { CalendarDays, CheckCircle2, ChevronRight, Clock, Home, MapPin, Phone, Save, User } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { districts } from "../catalog";
import type { ViewId } from "../types";

type ProfileForm = {
  name: string;
  phone: string;
  district: string;
  address: string;
};

const PROFILE_STORAGE_KEY = "dental-map-user-profile";
const defaultProfile: ProfileForm = {
  name: "",
  phone: "",
  district: "Mirzo Ulugbek",
  address: ""
};

function cleanProfile(value: Partial<ProfileForm>): ProfileForm {
  return {
    name: typeof value.name === "string" ? value.name : "",
    phone: typeof value.phone === "string" ? value.phone : "",
    district: typeof value.district === "string" && value.district ? value.district : defaultProfile.district,
    address: typeof value.address === "string" ? value.address : ""
  };
}

function formatSavedTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Hali saqlanmagan";
  }

  return new Intl.DateTimeFormat("uz-UZ", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short"
  }).format(date);
}

export function ProfileView({
  doctorRegistrationSent,
  doctorSubscriptionPaid,
  onNavigate
}: {
  doctorRegistrationSent: boolean;
  doctorSubscriptionPaid: boolean;
  onNavigate: (view: ViewId) => void;
}) {
  const [profile, setProfile] = useState<ProfileForm>(defaultProfile);
  const [savedAt, setSavedAt] = useState("");
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    try {
      const rawProfile = window.localStorage.getItem(PROFILE_STORAGE_KEY);

      if (!rawProfile) {
        return;
      }

      const parsedProfile = JSON.parse(rawProfile) as Partial<ProfileForm> & { savedAt?: string };

      setProfile(cleanProfile(parsedProfile));
      setSavedAt(typeof parsedProfile.savedAt === "string" ? parsedProfile.savedAt : "");
      setIsSaved(true);
    } catch {
      setProfile(defaultProfile);
    }
  }, []);

  const completedFields = [profile.name, profile.phone, profile.district, profile.address].filter((value) =>
    value.trim()
  ).length;
  const completionPercent = Math.round((completedFields / 4) * 100);
  const savedTime = savedAt ? formatSavedTime(savedAt) : "Hali saqlanmagan";

  function updateProfile(field: keyof ProfileForm, value: string) {
    setProfile((currentProfile) => ({
      ...currentProfile,
      [field]: value
    }));
    setIsSaved(false);
  }

  function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextSavedAt = new Date().toISOString();
    window.localStorage.setItem(
      PROFILE_STORAGE_KEY,
      JSON.stringify({
        ...profile,
        savedAt: nextSavedAt
      })
    );
    setSavedAt(nextSavedAt);
    setIsSaved(true);
  }

  return (
    <div className="view-stack">
      <section className="profile-card profile-hero">
        <div className="profile-hero-top">
          <div className="profile-avatar">
            <User size={34} />
          </div>
          <div className="profile-hero-copy">
            <strong>{profile.name.trim() || "Foydalanuvchi profili"}</strong>
            <span>Telefon, tuman va manzilni shu yerdan tahrirlang.</span>
          </div>
          <div className={isSaved ? "profile-save-pill saved" : "profile-save-pill"}>
            {isSaved ? <CheckCircle2 size={15} /> : <Clock size={15} />}
            <span>{isSaved ? "Saqlangan" : "Tahrir"}</span>
          </div>
        </div>
        <div className="profile-progress" aria-label={`Profil to'ldirilishi ${completionPercent}%`}>
          <span>
            <b>To&apos;ldirilgan</b>
            <em>{completionPercent}%</em>
          </span>
          <i className={`profile-progress-fill progress-width-${completionPercent}`} />
        </div>
      </section>

      <form className="profile-edit-card" onSubmit={saveProfile}>
        <div className="profile-edit-head">
          <div>
            <strong>Shaxsiy ma&apos;lumotlar</strong>
            <small>Ma&apos;lumotlar faqat ushbu qurilmada lokal saqlanadi.</small>
          </div>
          <span>{savedTime}</span>
        </div>

        <div className="profile-form-grid">
          <label className="profile-field">
            <span>Ism familiya</span>
            <div className="profile-field-shell">
              <User size={18} />
              <input
                autoComplete="name"
                placeholder="Masalan, Azizbek Karimov"
                value={profile.name}
                onChange={(event) => updateProfile("name", event.target.value)}
              />
            </div>
          </label>

          <label className="profile-field">
            <span>Telefon raqam</span>
            <div className="profile-field-shell">
              <Phone size={18} />
              <input
                autoComplete="tel"
                inputMode="tel"
                placeholder="+998 90 123 45 67"
                value={profile.phone}
                onChange={(event) => updateProfile("phone", event.target.value)}
              />
            </div>
          </label>

          <label className="profile-field">
            <span>Tuman</span>
            <div className="profile-field-shell">
              <MapPin size={18} />
              <select value={profile.district} onChange={(event) => updateProfile("district", event.target.value)}>
                {districts.slice(1).map((district) => (
                  <option key={district} value={district}>
                    {district}
                  </option>
                ))}
              </select>
            </div>
          </label>

          <label className="profile-field">
            <span>Manzil</span>
            <div className="profile-field-shell textarea">
              <Home size={18} />
              <textarea
                placeholder="Ko'cha, uy yoki mo'ljal"
                value={profile.address}
                onChange={(event) => updateProfile("address", event.target.value)}
              />
            </div>
          </label>
        </div>

        <div className="profile-save-row">
          <span className={isSaved ? "profile-save-note saved" : "profile-save-note"}>
            {isSaved ? "Oxirgi o'zgarishlar saqlandi." : "O'zgarishlarni saqlang."}
          </span>
          <button className="profile-save-button" type="submit" disabled={isSaved}>
            {isSaved ? <CheckCircle2 size={18} /> : <Save size={18} />}
            {isSaved ? "Saqlangan" : "Saqlash"}
          </button>
        </div>
      </form>

      <button className="settings-row" type="button" onClick={() => onNavigate("appointment")}>
        <CalendarDays size={18} />
        <span>
          <strong>Qabulga yozilish</strong>
          <small>Tanlangan shifokor uchun kun va vaqtni yuboring.</small>
        </span>
        <ChevronRight size={18} />
      </button>
      {doctorRegistrationSent && (
        <div className={doctorSubscriptionPaid ? "admin-status sent" : "admin-status"}>
          {doctorSubscriptionPaid ? <CheckCircle2 size={18} /> : <Clock size={18} />}
          <span>
            <strong>{doctorSubscriptionPaid ? "Shifokor obunasi yuborildi" : "Shifokor obunasi kutilmoqda"}</strong>
            <small>
              {doctorSubscriptionPaid
                ? "Administrator to'lov chekini tasdiqlaydi."
                : "Administrator tekshiruvi uchun to'lov cheki kutiladi."}
            </small>
          </span>
        </div>
      )}
    </div>
  );
}
