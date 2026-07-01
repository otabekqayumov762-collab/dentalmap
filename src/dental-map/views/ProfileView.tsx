import {
  CalendarCheck2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  LogOut,
  MessageCircle,
  Save,
  User,
  type LucideIcon
} from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { districts } from "../catalog";
import type { ViewId } from "../types";
import { Button, Card, Field, PhoneField, Select, TextareaField, cn } from "../ui";

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
  return new Intl.DateTimeFormat("uz-UZ", { day: "2-digit", hour: "2-digit", minute: "2-digit", month: "short" }).format(
    date
  );
}

function ActionRow({
  Icon,
  title,
  subtitle,
  onClick,
  first
}: {
  Icon: LucideIcon;
  title: string;
  subtitle: string;
  onClick: () => void;
  first?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface-50 focus-visible:outline-none focus-visible:bg-surface-50",
        !first && "border-t border-surface-100"
      )}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
        <Icon size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <strong className="block text-sm font-semibold text-ink-900">{title}</strong>
        <small className="text-xs text-ink-500">{subtitle}</small>
      </span>
      <ChevronRight size={18} className="shrink-0 text-ink-400" />
    </button>
  );
}

export function ProfileView({
  doctorRegistrationSent,
  doctorSubscriptionPaid,
  onNavigate,
  onLogout
}: {
  doctorRegistrationSent: boolean;
  doctorSubscriptionPaid: boolean;
  onNavigate: (view: ViewId) => void;
  onLogout: () => void;
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
    setProfile((currentProfile) => ({ ...currentProfile, [field]: value }));
    setIsSaved(false);
  }

  function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextSavedAt = new Date().toISOString();
    window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify({ ...profile, savedAt: nextSavedAt }));
    setSavedAt(nextSavedAt);
    setIsSaved(true);
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="border-0 bg-gradient-to-br from-brand-500 to-brand-600 text-white">
        <div className="flex items-center gap-3.5">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white/15">
            <User size={30} />
          </div>
          <div className="min-w-0 flex-1">
            <strong className="block truncate text-lg font-bold">{profile.name.trim() || "Foydalanuvchi profili"}</strong>
            <span className="mt-0.5 block text-sm text-white/80">Profil ma&apos;lumotlaringiz</span>
          </div>
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-1 rounded-pill px-2.5 py-1 text-xs font-semibold",
              isSaved ? "bg-white text-brand-700" : "bg-white/20 text-white"
            )}
          >
            {isSaved ? <CheckCircle2 size={15} /> : <Clock size={15} />}
            {isSaved ? "Saqlangan" : "Tahrir"}
          </span>
        </div>
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <b className="font-semibold text-white/90">To&apos;ldirilgan</b>
            <em className="font-bold not-italic">{completionPercent}%</em>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-pill bg-white/20">
            <i className={cn("block h-full rounded-pill bg-white transition-all", progressWidth[completedFields])} />
          </div>
        </div>
      </Card>

      <div className="overflow-hidden rounded-card border border-surface-100 bg-surface-0 shadow-card">
        <ActionRow
          first
          Icon={CalendarDays}
          title="Mening qabullarim"
          subtitle="Yozilgan qabullar va holati"
          onClick={() => onNavigate("myAppointments")}
        />
        <ActionRow
          Icon={CalendarCheck2}
          title="Qabulga yozilish"
          subtitle="Shifokor uchun kun va vaqt"
          onClick={() => onNavigate("appointment")}
        />
        <ActionRow
          Icon={MessageCircle}
          title="Taklif va shikoyat"
          subtitle="Administratorga xabar"
          onClick={() => onNavigate("feedback")}
        />
      </div>

      <Card as="section">
        <form onSubmit={saveProfile} className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <strong className="text-base font-bold text-ink-900">Shaxsiy ma&apos;lumotlar</strong>
            <span className="shrink-0 text-xs text-ink-400">{savedTime}</span>
          </div>

          <Field
            label="Ism familiya"
            autoComplete="name"
            placeholder="Ism familiya"
            value={profile.name}
            onChange={(event) => updateProfile("name", event.target.value)}
          />
          <PhoneField
            label="Telefon raqam"
            value={profile.phone}
            onValueChange={(value) => updateProfile("phone", value)}
          />
          <Select
            label="Tuman"
            value={profile.district}
            options={districts.slice(1).map((district) => ({ value: district, label: district }))}
            onChange={(value) => updateProfile("district", value)}
            placeholder="Tumanni tanlang"
          />
          <TextareaField
            label="Manzil"
            placeholder="Ko'cha, uy yoki mo'ljal"
            value={profile.address}
            onChange={(event) => updateProfile("address", event.target.value)}
          />

          <div className="flex items-center justify-between gap-3">
            <span className={cn("text-xs", isSaved ? "text-success" : "text-ink-500")}>
              {isSaved ? "Saqlandi." : "O'zgarishlarni saqlang."}
            </span>
            <Button type="submit" size="sm" disabled={isSaved}>
              {isSaved ? <CheckCircle2 size={18} /> : <Save size={18} />}
              {isSaved ? "Saqlangan" : "Saqlash"}
            </Button>
          </div>
        </form>
      </Card>

      {doctorRegistrationSent && (
        <Card
          className={cn(
            "flex items-start gap-3",
            doctorSubscriptionPaid ? "border-emerald-100 bg-emerald-50" : "border-amber-100 bg-amber-50"
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

      <button
        type="button"
        onClick={onLogout}
        className="inline-flex h-12 items-center justify-center gap-2 rounded-pill border border-rose-200 bg-rose-50 font-semibold text-danger transition-colors hover:bg-rose-100"
      >
        <LogOut size={18} />
        Chiqish
      </button>
    </div>
  );
}
