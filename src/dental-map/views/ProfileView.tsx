import {
  CalendarCheck2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  LogOut,
  MessageCircle,
  Save,
  ShieldCheck,
  User,
  type LucideIcon
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
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

function initialsOf(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase() ?? "")
      .join("") || ""
  );
}

/** Small muted uppercase label above a grouped card (iOS-settings style). */
function GroupLabel({ children }: { children: ReactNode }) {
  return (
    <span className="mb-2 ml-1 block text-[0.7rem] font-semibold uppercase tracking-wide text-ink-400">{children}</span>
  );
}

function MenuRow({
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
        "flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface-50 focus-visible:bg-surface-50 focus-visible:outline-none active:bg-surface-100",
        !first && "border-t border-surface-100"
      )}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
        <Icon size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <strong className="block text-sm font-semibold text-ink-900">{title}</strong>
        <small className="truncate text-xs text-ink-500">{subtitle}</small>
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
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    try {
      const rawProfile = window.localStorage.getItem(PROFILE_STORAGE_KEY);
      if (!rawProfile) {
        return;
      }
      setProfile(cleanProfile(JSON.parse(rawProfile) as Partial<ProfileForm>));
      setIsSaved(true);
    } catch {
      setProfile(defaultProfile);
    }
  }, []);

  const completedFields = [profile.name, profile.phone, profile.district, profile.address].filter((value) =>
    value.trim()
  ).length;
  const completionPercent = Math.round((completedFields / 4) * 100);
  const initials = useMemo(() => initialsOf(profile.name), [profile.name]);

  function updateProfile(field: keyof ProfileForm, value: string) {
    setProfile((currentProfile) => ({ ...currentProfile, [field]: value }));
    setIsSaved(false);
  }

  function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
    setIsSaved(true);
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Hero — avatar, name, role + progressive-profiling completion */}
      <Card className="border-0 bg-gradient-to-br from-brand-500 to-brand-600 text-white">
        <div className="flex items-center gap-4">
          <span className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-xl font-extrabold ring-1 ring-white/25">
            {initials ? initials : <User size={30} />}
          </span>
          <div className="min-w-0 flex-1">
            <strong className="block truncate text-lg font-bold leading-tight">
              {profile.name.trim() || "Foydalanuvchi"}
            </strong>
            <span className="mt-1.5 inline-flex items-center gap-1 rounded-pill bg-white/15 px-2.5 py-0.5 text-xs font-semibold">
              <ShieldCheck size={13} />
              Bemor
            </span>
          </div>
          {isSaved && completionPercent === 100 && (
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/20" aria-hidden="true">
              <CheckCircle2 size={18} />
            </span>
          )}
        </div>

        <div className="mt-4 rounded-2xl bg-white/10 p-3.5">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium text-white/90">Profil to&apos;ldirilgan</span>
            <span className="font-bold tabular-nums">{completionPercent}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-pill bg-white/20">
            <i
              className={cn(
                "block h-full rounded-pill bg-white transition-all duration-500",
                progressWidth[completedFields]
              )}
            />
          </div>
          {completionPercent < 100 && (
            <small className="mt-2 block text-xs text-white/80">
              Ma&apos;lumotlaringizni to&apos;ldiring — qabulga tezroq yoziling.
            </small>
          )}
        </div>
      </Card>

      {/* Account */}
      <section>
        <GroupLabel>Hisob</GroupLabel>
        <div className="overflow-hidden rounded-card border border-surface-100 bg-surface-0 shadow-card">
          <MenuRow
            first
            Icon={CalendarDays}
            title="Mening qabullarim"
            subtitle="Yozilgan qabullar va holati"
            onClick={() => onNavigate("myAppointments")}
          />
          <MenuRow
            Icon={CalendarCheck2}
            title="Qabulga yozilish"
            subtitle="Shifokor uchun kun va vaqt tanlash"
            onClick={() => onNavigate("appointment")}
          />
        </div>
      </section>

      {/* Personal info */}
      <section>
        <GroupLabel>Shaxsiy ma&apos;lumotlar</GroupLabel>
        <Card as="section">
          <form onSubmit={saveProfile} className="flex flex-col gap-4">
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

            <div className="flex items-center justify-end gap-3 border-t border-surface-100 pt-3">
              {!isSaved && <span className="mr-auto text-xs text-ink-400">O&apos;zgarishlarni saqlang.</span>}
              <Button type="submit" size="sm" disabled={isSaved}>
                {isSaved ? <CheckCircle2 size={18} /> : <Save size={18} />}
                {isSaved ? "Saqlangan" : "Saqlash"}
              </Button>
            </div>
          </form>
        </Card>
      </section>

      {/* Support */}
      <section>
        <GroupLabel>Yordam</GroupLabel>
        <div className="overflow-hidden rounded-card border border-surface-100 bg-surface-0 shadow-card">
          <MenuRow
            first
            Icon={MessageCircle}
            title="Taklif va shikoyat"
            subtitle="Administratorga xabar yuborish"
            onClick={() => onNavigate("feedback")}
          />
        </div>
      </section>

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
        className="mt-1 inline-flex h-12 items-center justify-center gap-2 rounded-pill border border-rose-200 bg-rose-50 font-semibold text-danger transition-colors hover:bg-rose-100 active:scale-[0.99]"
      >
        <LogOut size={18} />
        Chiqish
      </button>
    </div>
  );
}
