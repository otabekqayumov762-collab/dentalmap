import { CalendarDays, CheckCircle2, ChevronRight, Clock, Home, MapPin, Phone, Save, User } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { districts } from "../catalog";
import type { ViewId } from "../types";
import { Button, Card, Select, cn } from "../ui";

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

// Static width classes so Tailwind can see them at build time (no inline styles).
const progressWidth = ["w-0", "w-1/4", "w-1/2", "w-3/4", "w-full"] as const;

const labelClass = "mb-1.5 block text-sm font-medium text-ink-700";
const fieldShell =
  "w-full rounded-2xl border border-surface-200 bg-surface-50 py-3 pl-11 pr-4 text-ink-900 " +
  "placeholder:text-ink-400 transition-colors focus:border-brand-400 focus:bg-white " +
  "focus:outline-none focus:ring-2 focus:ring-brand-100";

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
    <div className="flex flex-col gap-4">
      <Card className="bg-gradient-to-br from-brand-500 to-brand-600 border-0 text-white">
        <div className="flex items-center gap-3.5">
          <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white">
            <User size={34} />
          </div>
          <div className="min-w-0 flex-1">
            <strong className="block truncate text-lg font-bold">
              {profile.name.trim() || "Foydalanuvchi profili"}
            </strong>
            <span className="mt-0.5 block text-sm text-white/80">
              Telefon, tuman va manzilni shu yerdan tahrirlang.
            </span>
          </div>
          <div
            className={cn(
              "inline-flex items-center gap-1 rounded-pill px-2.5 py-1 text-xs font-semibold",
              isSaved ? "bg-white text-brand-700" : "bg-white/20 text-white"
            )}
          >
            {isSaved ? <CheckCircle2 size={15} /> : <Clock size={15} />}
            <span>{isSaved ? "Saqlangan" : "Tahrir"}</span>
          </div>
        </div>
        <div className="mt-4" aria-label={`Profil to'ldirilishi ${completionPercent}%`}>
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <b className="font-semibold text-white/90">To&apos;ldirilgan</b>
            <em className="not-italic font-bold">{completionPercent}%</em>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-pill bg-white/20">
            <i className={cn("block h-full rounded-pill bg-white transition-all", progressWidth[completedFields])} />
          </div>
        </div>
      </Card>

      <Card as="section">
        <form onSubmit={saveProfile} className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <strong className="block font-bold text-ink-900">Shaxsiy ma&apos;lumotlar</strong>
              <small className="mt-0.5 block text-xs text-ink-500">
                Ma&apos;lumotlar faqat ushbu qurilmada lokal saqlanadi.
              </small>
            </div>
            <span className="shrink-0 text-xs text-ink-400">{savedTime}</span>
          </div>

          <div className="flex flex-col gap-3.5">
            <label className="block">
              <span className={labelClass}>Ism familiya</span>
              <div className="relative">
                <User size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
                <input
                  className={fieldShell}
                  autoComplete="name"
                  placeholder="Masalan, Azizbek Karimov"
                  value={profile.name}
                  onChange={(event) => updateProfile("name", event.target.value)}
                />
              </div>
            </label>

            <label className="block">
              <span className={labelClass}>Telefon raqam</span>
              <div className="relative">
                <Phone size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
                <input
                  className={fieldShell}
                  autoComplete="tel"
                  inputMode="tel"
                  placeholder="+998 90 123 45 67"
                  value={profile.phone}
                  onChange={(event) => updateProfile("phone", event.target.value)}
                />
              </div>
            </label>

            <Select
              label={
                <span className="inline-flex items-center gap-1.5">
                  <MapPin size={16} className="text-ink-400" /> Tuman
                </span>
              }
              value={profile.district}
              options={districts.slice(1).map((district) => ({ value: district, label: district }))}
              onChange={(value) => updateProfile("district", value)}
            />

            <label className="block">
              <span className={labelClass}>Manzil</span>
              <div className="relative">
                <Home size={18} className="pointer-events-none absolute left-3.5 top-3.5 text-ink-400" />
                <textarea
                  className={cn(fieldShell, "min-h-24 resize-y")}
                  placeholder="Ko'cha, uy yoki mo'ljal"
                  value={profile.address}
                  onChange={(event) => updateProfile("address", event.target.value)}
                />
              </div>
            </label>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className={cn("text-xs", isSaved ? "text-success" : "text-ink-500")}>
              {isSaved ? "Oxirgi o'zgarishlar saqlandi." : "O'zgarishlarni saqlang."}
            </span>
            <Button type="submit" size="sm" disabled={isSaved}>
              {isSaved ? <CheckCircle2 size={18} /> : <Save size={18} />}
              {isSaved ? "Saqlangan" : "Saqlash"}
            </Button>
          </div>
        </form>
      </Card>

      <button
        type="button"
        onClick={() => onNavigate("appointment")}
        className="flex w-full items-center gap-3 rounded-card border border-surface-100 bg-surface-0 p-4 text-left shadow-card transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 active:scale-[0.99]"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <CalendarDays size={18} />
        </span>
        <span className="min-w-0 flex-1">
          <strong className="block font-semibold text-ink-900">Qabulga yozilish</strong>
          <small className="mt-0.5 block text-xs text-ink-500">
            Tanlangan shifokor uchun kun va vaqtni yuboring.
          </small>
        </span>
        <ChevronRight size={18} className="shrink-0 text-ink-400" />
      </button>

      {doctorRegistrationSent && (
        <Card
          className={cn(
            "flex items-start gap-3",
            doctorSubscriptionPaid ? "bg-emerald-50 border-emerald-100" : "bg-amber-50 border-amber-100"
          )}
        >
          <span className={cn("mt-0.5 shrink-0", doctorSubscriptionPaid ? "text-success" : "text-warning")}>
            {doctorSubscriptionPaid ? <CheckCircle2 size={18} /> : <Clock size={18} />}
          </span>
          <span className="min-w-0">
            <strong className="block font-semibold text-ink-900">
              {doctorSubscriptionPaid ? "Shifokor obunasi yuborildi" : "Shifokor obunasi kutilmoqda"}
            </strong>
            <small className="mt-0.5 block text-xs text-ink-500">
              {doctorSubscriptionPaid
                ? "Administrator to'lov chekini tasdiqlaydi."
                : "Administrator tekshiruvi uchun to'lov cheki kutiladi."}
            </small>
          </span>
        </Card>
      )}
    </div>
  );
}
