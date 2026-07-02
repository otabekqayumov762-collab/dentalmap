import { LogOut, MessageCircle, XCircle } from "lucide-react";
import type { FormEvent } from "react";
import type { ApiAppointment, ApiDoctor, ApiUser, ApiWeeklyAvailability, ViewId } from "../types";
import { formatDate } from "./doctor/common";
import { DoctorAppointmentRequests } from "./doctor/DoctorAppointmentRequests";
import { DoctorHeaderCard } from "./doctor/DoctorHeaderCard";
import { DoctorProfileForm } from "./doctor/DoctorProfileForm";
import { DoctorScheduleManager } from "./doctor/DoctorScheduleManager";
import { DoctorStatsRow } from "./doctor/DoctorStatsRow";

export function DoctorDashboardView({
  user,
  profile,
  appointments,
  schedule,
  loading,
  error,
  onRefresh,
  onProfileSubmit,
  onScheduleSubmit,
  onAppointmentAction,
  onScheduleDelete,
  onNavigate,
  onLogout
}: {
  user: ApiUser | null;
  profile: ApiDoctor | null;
  appointments: ApiAppointment[];
  schedule: ApiWeeklyAvailability[];
  loading: boolean;
  error: string;
  onRefresh: () => void;
  onProfileSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onScheduleSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onAppointmentAction: (
    appointment: ApiAppointment,
    action: "confirm" | "reject" | "complete" | "mark_no_show",
    reason?: string
  ) => Promise<void>;
  onScheduleDelete?: (item: ApiWeeklyAvailability) => Promise<void> | void;
  onNavigate: (view: ViewId) => void;
  onLogout: () => void;
}) {
  const pendingCount = appointments.filter((a) => a.status === "pending").length;
  const confirmedCount = appointments.filter((a) => a.status === "doctor_confirmed").length;
  const completedCount = appointments.filter((a) => a.status === "completed").length;
  const approvalStatus = profile?.approval_status || user?.doctor_profile?.approval_status;

  return (
    <div className="flex flex-col gap-5">
      <DoctorHeaderCard
        user={user}
        profile={profile}
        approvalStatus={approvalStatus}
        isPublished={Boolean(profile?.is_published)}
        isSubscriptionActive={Boolean(profile?.is_subscription_active)}
        subscriptionExpiry={formatDate(profile?.subscription_expires_at)}
        loading={loading}
        onRefresh={onRefresh}
      />

      {error && (
        <div className="flex items-center gap-2 rounded-2xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger" role="alert">
          <XCircle size={17} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <DoctorStatsRow
        pendingCount={pendingCount}
        confirmedCount={confirmedCount}
        completedCount={completedCount}
        rating={profile?.rating || "0.0"}
        reviewsCount={profile?.reviews_count || 0}
      />

      <DoctorAppointmentRequests appointments={appointments} onAppointmentAction={onAppointmentAction} />

      <DoctorScheduleManager
        schedule={schedule}
        loading={loading}
        onScheduleSubmit={onScheduleSubmit}
        onScheduleDelete={onScheduleDelete}
      />

      <DoctorProfileForm user={user} profile={profile} loading={loading} onProfileSubmit={onProfileSubmit} />

      <button
        type="button"
        onClick={() => onNavigate("feedback")}
        className="flex w-full items-center gap-3 rounded-card border border-surface-100 bg-surface-0 p-4 text-left shadow-card transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 active:scale-[0.99]"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <MessageCircle size={18} />
        </span>
        <span className="min-w-0 flex-1">
          <strong className="block font-semibold text-ink-900">Taklif va shikoyat</strong>
          <small className="mt-0.5 block text-xs text-ink-500">Administratorga xabar yuborish</small>
        </span>
      </button>

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
