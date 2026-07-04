import {
  CalendarCheck2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Heart,
  LogOut,
  MessageCircle,
  Save,
  User,
  type LucideIcon
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { isOfflineMode } from "../api/dentalMapApi";
import { districtToRegion } from "../catalog";
import { openExternal } from "../lib/url";
import type { ApiUser, ViewId } from "../types";

// Support/help-desk Telegram account. Override via NEXT_PUBLIC_SUPPORT_URL.
const SUPPORT_TELEGRAM_URL = process.env.NEXT_PUBLIC_SUPPORT_URL || "https://t.me/Alisherovich_5";
import { Button, Card, Field, PhoneField, RegionDistrictField, TextareaField, cn } from "../ui";

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
  currentUser,
  doctorRegistrationSent,
  onNavigate,
  onLogout,
  onSaveProfile
}: {
  currentUser?: ApiUser | null;
  doctorRegistrationSent: boolean;
  onNavigate: (view: ViewId) => void;
  onLogout: () => void;
  /** Persist the profile. Returns "" on success, else a status/error message. */
  onSaveProfile: (payload: ProfileForm) => Promise<string>;
}) {
  const [profile, setProfile] = useState<ProfileForm>(defaultProfile);
  const [region, setRegion] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Seed: online → the signed-in backend user; offline → the localStorage draft.
  useEffect(() => {
    if (currentUser && !isOfflineMode()) {
      setProfile(
        cleanProfile({
          name: currentUser.full_name,
          phone: currentUser.phone,
          district: currentUser.profile?.district,
          address: currentUser.profile?.address
        })
      );
      setIsSaved(true);
      return;
    }
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
  }, [currentUser]);

  const completedFields = [profile.name, profile.phone, profile.district, profile.address].filter((value) =>
    value.trim()
  ).length;
  const completionPercent = Math.round((completedFields / 4) * 100);
  const initials = useMemo(() => initialsOf(profile.name), [profile.name]);

  function updateProfile(field: keyof ProfileForm, value: string) {
    setProfile((currentProfile) => ({ ...currentProfile, [field]: value }));
    setIsSaved(false);
    setSaveError("");
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setSaveError("");
    try {
      if (isOfflineMode()) {
        // Offline: the localStorage draft is the source of truth for the seed.
        window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
      }
      const message = await onSaveProfile(profile);
      if (message) {
        setSaveError(message);
        return;
      }
      setIsSaved(true);
    } finally {
      setSaving(false);
    }
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
          <MenuRow
            Icon={Heart}
            title="Saqlangan shifokorlar"
            subtitle="Yoqqan shifokorlaringiz ro'yxati"
            onClick={() => onNavigate("saved")}
          />
        </div>
      </section>

      {/* Personal info */}
      <section>
        <GroupLabel>Shaxsiy ma&apos;lumotlar</GroupLabel>
        <Card as="section">
          <form onSubmit={saveProfile} className="flex flex-col gap-4">
            <Field
              id="profile-name"
              name="full_name"
              label="Ism familiya"
              autoComplete="name"
              placeholder="Masalan, Anvar Karimov"
              value={profile.name}
              onChange={(event) => updateProfile("name", event.target.value)}
            />
            <PhoneField
              name="phone"
              label="Telefon raqam"
              value={profile.phone}
              onValueChange={(value) => updateProfile("phone", value)}
            />
            <RegionDistrictField
              name="district"
              label="Tuman"
              mode="select"
              region={region ?? (profile.district ? districtToRegion[profile.district] ?? null : null)}
              district={profile.district || null}
              onSelect={(selection) => {
                setRegion(selection.region);
                updateProfile("district", selection.district ?? "");
              }}
              placeholder="Tumanni tanlang"
            />
            <TextareaField
              id="profile-address"
              name="address"
              label="Manzil"
              placeholder="Ko'cha, uy yoki mo'ljal"
              value={profile.address}
              onChange={(event) => updateProfile("address", event.target.value)}
            />

            {saveError && <p className="text-xs text-danger">{saveError}</p>}

            <div className="flex items-center justify-end gap-3 border-t border-surface-100 pt-3">
              {!isSaved && !saveError && (
                <span className="mr-auto text-xs text-ink-400">O&apos;zgarishlarni saqlang.</span>
              )}
              <Button type="submit" size="sm" disabled={isSaved || saving}>
                {isSaved ? <CheckCircle2 size={18} /> : <Save size={18} />}
                {saving ? "Saqlanmoqda…" : isSaved ? "Saqlangan" : "Saqlash"}
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
            title="Yordam markazi bilan bog'lanish"
            subtitle="Telegram orqali savol bering"
            onClick={() => openExternal(SUPPORT_TELEGRAM_URL)}
          />
        </div>
      </section>

      {doctorRegistrationSent && (
        <Card className="flex items-start gap-3 border-success/20 bg-success/10">
          <span className="mt-0.5 shrink-0 text-success">
            <CheckCircle2 size={18} />
          </span>
          <span className="min-w-0">
            <strong className="block font-semibold text-ink-900">Shifokor arizasi yuborildi</strong>
            <small className="mt-0.5 block text-xs text-ink-500">
              Administrator tekshirgandan keyin profilingiz saytda ko&apos;rinadi.
            </small>
          </span>
        </Card>
      )}

      <button
        type="button"
        onClick={onLogout}
        className="mt-1 inline-flex h-12 items-center justify-center gap-2 rounded-pill border border-danger/30 bg-danger/10 font-semibold text-danger transition-colors hover:bg-danger/20 active:scale-[0.99]"
      >
        <LogOut size={18} />
        Chiqish
      </button>
    </div>
  );
}
