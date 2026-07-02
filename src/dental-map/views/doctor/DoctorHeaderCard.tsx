import { CheckCircle2, EyeOff, Loader2, RefreshCw, Stethoscope, XCircle } from "lucide-react";
import { DoctorAvatar } from "../../components/common";
import type { ApiDoctor, ApiUser, Doctor } from "../../types";
import { Badge, Button, Card } from "../../ui";
import { approvalLabel, approvalTone } from "./common";

const AVATAR_ACCENT = "#0f8fe8";

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

      <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-white/10 p-3">
        <Badge tone={approvalTone(approvalStatus)}>
          {approvalStatus === "approved" ? (
            <CheckCircle2 size={13} />
          ) : approvalStatus === "rejected" ? (
            <XCircle size={13} />
          ) : (
            <Loader2 size={13} />
          )}
          {approvalLabel(approvalStatus)}
        </Badge>

        <Badge tone={isPublished ? "success" : "neutral"}>
          {isPublished ? <CheckCircle2 size={13} /> : <EyeOff size={13} />}
          {isPublished ? "Saytda ko'rinmoqda" : "Saytda yashirilgan"}
        </Badge>

        <Badge tone={isSubscriptionActive ? "success" : "danger"}>
          {isSubscriptionActive ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
          {isSubscriptionActive ? "Obuna faol" : "Obuna faol emas"}
        </Badge>
      </div>

      {subscriptionExpiry && (
        <small className="-mt-1 block text-xs text-white/80">Obuna: {subscriptionExpiry} gacha</small>
      )}
    </Card>
  );
}
