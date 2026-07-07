import {
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  Clock3,
  EyeOff,
  Globe,
  Loader2,
  MapPin,
  Pencil,
  Phone,
  RefreshCw,
  Stethoscope,
  XCircle,
  type LucideIcon
} from "lucide-react";
import { DoctorAvatar } from "../../components/common";
import type { ApiDoctor, ApiUser, Doctor } from "../../types";
import { Button, Card, cn } from "../../ui";

const AVATAR_ACCENT = "#0f8fe8";

type StatusState = "ok" | "pending" | "bad";

/** Builds a Doctor-shaped object so we can reuse <DoctorAvatar> for the profile photo. */
function toAvatarDoctor(profile: ApiDoctor | null, user: ApiUser | null): Doctor {
  return {
    id: profile?.id ?? "",
    name: profile?.full_name || user?.full_name || "Shifokor",
    specialty: profile?.specialty ?? "",
    rating: Number(profile?.rating) || 0,
    reviews: 0,
    experience: "",
    clinic: "",
    district: "",
    address: "",
    phone: "",
    nextSlot: "",
    image: profile?.photo,
    accent: AVATAR_ACCENT
  };
}

/** One status line on the gradient: leading category icon + label + trailing state pill. */
function StatusRow({
  Icon,
  title,
  value,
  state,
  first
}: {
  Icon: LucideIcon;
  title: string;
  value: string;
  state: StatusState;
  first?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-3 px-3 py-2.5", !first && "border-t border-white/10")}>
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-lg",
          state === "ok" ? "bg-white/20 text-white" : state === "pending" ? "bg-white/15 text-white/85" : "bg-white/10 text-white/75"
        )}
      >
        <Icon size={16} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[0.68rem] font-semibold uppercase text-white/55">{title}</span>
        <span className="block truncate text-sm font-semibold text-white/90">{value}</span>
      </span>
    </div>
  );
}

function InfoRow({ Icon, label, value }: { Icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-start gap-2 rounded-xl bg-white/10 px-3 py-2 text-left">
      <Icon size={15} className="mt-0.5 shrink-0 text-white/75" />
      <span className="min-w-0">
        <span className="block text-[0.68rem] font-semibold uppercase text-white/55">{label}</span>
        <span className="block truncate text-sm font-medium text-white/90">{value}</span>
      </span>
    </div>
  );
}

export function DoctorHeaderCard({
  user,
  profile,
  approvalStatus,
  isPublished,
  loading,
  onRefresh,
  onEdit
}: {
  user: ApiUser | null;
  profile: ApiDoctor | null;
  approvalStatus?: string;
  isPublished: boolean;
  loading: boolean;
  onRefresh: () => void;
  onEdit: () => void;
}) {
  const name = profile?.full_name || user?.full_name || "Shifokor";
  const specialty = profile?.specialty?.trim() || "Mutaxassislik ko'rsatilmagan";
  const hasPhoto = Boolean(profile?.photo);
  const experience = profile?.experience_years ? `${profile.experience_years} yil` : "Kiritilmagan";

  const approvalState: StatusState =
    approvalStatus === "blocked" || approvalStatus === "rejected" ? "bad" : "ok";
  const ApprovalIcon = approvalState === "ok" ? CheckCircle2 : XCircle;
  const approvalValue = approvalStatus === "blocked" ? "Bloklangan" : approvalStatus === "rejected" ? "Faol emas" : "Profil faol";

  return (
    <Card className="flex flex-col gap-4 border-0 bg-gradient-to-br from-brand-500 to-brand-600 text-white">
      <div className="flex items-center gap-4">
        {hasPhoto ? (
          <span className="shrink-0 rounded-2xl ring-1 ring-white/30">
            <DoctorAvatar doctor={toAvatarDoctor(profile, user)} size="lg" />
          </span>
        ) : (
          <span className="flex size-20 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
            <Stethoscope size={34} />
          </span>
        )}

        <div className="min-w-0 flex-1">
          <strong className="block truncate text-lg font-bold leading-tight">{name}</strong>
          <span className="mt-1 block truncate text-sm text-white/85">{specialty}</span>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
            aria-label="Ma'lumotlarni yangilash"
            title="Yangilash"
            className="h-12 w-12 px-0"
          >
            {loading ? <Loader2 size={22} className="animate-spin" /> : <RefreshCw size={22} strokeWidth={2.4} />}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onEdit}
            aria-label="Profilni tahrirlash"
            title="Profilni tahrirlash"
            className="h-12 w-12 px-0"
          >
            <Pencil size={22} strokeWidth={2.4} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <InfoRow Icon={Building2} label="Klinika" value={profile?.clinic_name || "Kiritilmagan"} />
        <InfoRow Icon={MapPin} label="Tuman" value={profile?.clinic_district || "Kiritilmagan"} />
        <InfoRow Icon={Phone} label="Telefon" value={profile?.doctor_phone || user?.phone || "Kiritilmagan"} />
        <InfoRow Icon={Clock3} label="Ish vaqti" value={profile?.work_time || "Kiritilmagan"} />
        <InfoRow Icon={BriefcaseBusiness} label="Tajriba" value={experience} />
      </div>

      <div className="overflow-hidden rounded-2xl bg-white/10 ring-1 ring-inset ring-white/10">
        <StatusRow first Icon={ApprovalIcon} title="Profil holati" value={approvalValue} state={approvalState} />
        <StatusRow
          Icon={isPublished ? Globe : EyeOff}
          title="Ilova holati"
          value={isPublished ? "Bemorlar ko'ra oladi" : "Hozircha ko'rinmaydi"}
          state={isPublished ? "ok" : "bad"}
        />
      </div>
    </Card>
  );
}
