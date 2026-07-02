import {
  CalendarClock,
  CheckCircle2,
  EyeOff,
  Globe,
  Loader2,
  RefreshCw,
  Sparkles,
  Stethoscope,
  XCircle,
  type LucideIcon
} from "lucide-react";
import { DoctorAvatar } from "../../components/common";
import type { ApiDoctor, ApiUser, Doctor } from "../../types";
import { Button, Card, cn } from "../../ui";
import { approvalLabel } from "./common";

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
  label,
  state,
  first
}: {
  Icon: LucideIcon;
  label: string;
  state: StatusState;
  first?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-3 px-3 py-2.5", !first && "border-t border-white/10")}>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/15 text-white">
        <Icon size={16} />
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-white/90">{label}</span>
      <span
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-full",
          state === "ok" ? "bg-white/25 text-white" : "bg-white/10 text-white/70"
        )}
        aria-hidden="true"
      >
        {state === "ok" ? (
          <CheckCircle2 size={14} />
        ) : state === "pending" ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <XCircle size={14} />
        )}
      </span>
    </div>
  );
}

export function DoctorHeaderCard({
  user,
  profile,
  approvalStatus,
  isPublished,
  isSubscriptionActive,
  subscriptionExpiry,
  loading,
  onRefresh
}: {
  user: ApiUser | null;
  profile: ApiDoctor | null;
  approvalStatus?: string;
  isPublished: boolean;
  isSubscriptionActive: boolean;
  subscriptionExpiry: string;
  loading: boolean;
  onRefresh: () => void;
}) {
  const name = profile?.full_name || user?.full_name || "Shifokor";
  const specialty = profile?.specialty?.trim() || "Mutaxassislik ko'rsatilmagan";
  const hasPhoto = Boolean(profile?.photo);

  const approvalState: StatusState =
    approvalStatus === "approved" ? "ok" : approvalStatus === "rejected" ? "bad" : "pending";
  const ApprovalIcon = approvalState === "ok" ? CheckCircle2 : approvalState === "bad" ? XCircle : Loader2;

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

        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onRefresh}
          disabled={loading}
          aria-label="Ma'lumotlarni yangilash"
          className="shrink-0"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          Yangilash
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl bg-white/10 ring-1 ring-inset ring-white/10">
        <StatusRow first Icon={ApprovalIcon} label={approvalLabel(approvalStatus)} state={approvalState} />
        <StatusRow
          Icon={isPublished ? Globe : EyeOff}
          label={isPublished ? "Ilovada ko'rinmoqda" : "Ilovada yashirilgan"}
          state={isPublished ? "ok" : "bad"}
        />
        <StatusRow
          Icon={Sparkles}
          label={isSubscriptionActive ? "Obuna faol" : "Obuna faol emas"}
          state={isSubscriptionActive ? "ok" : "bad"}
        />
      </div>

      {subscriptionExpiry && (
        <div className="flex items-center gap-1.5 text-xs text-white/80">
          <CalendarClock size={13} className="shrink-0" />
          <span className="truncate">Obuna: {subscriptionExpiry} gacha</span>
        </div>
      )}
    </Card>
  );
}
