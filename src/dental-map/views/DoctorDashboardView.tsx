import { CalendarCheck2, ChevronRight, Loader2, LogOut, MessageCircle, XCircle } from "lucide-react";
import { useState, type FormEvent } from "react";
import { isOfflineMode } from "../api/dentalMapApi";
import { Card } from "../ui";
import type { ApiAppointment, ApiDoctor, ApiUser, ApiWeeklyAvailability, Specialty, ViewId } from "../types";
import {
  createDemoAppointments,
  DoctorAppointmentRequests,
  type DoctorAppointmentAction
} from "./doctor/DoctorAppointmentRequests";
import { DoctorHeaderCard } from "./doctor/DoctorHeaderCard";
import { DoctorProfileForm } from "./doctor/DoctorProfileForm";
import { DoctorScheduleManager } from "./doctor/DoctorScheduleManager";
import { DoctorStatsRow } from "./doctor/DoctorStatsRow";

export type DoctorSection = "kabinet" | "appointments" | "schedule" | "profile";

export function DoctorDashboardView({
  section = "kabinet",
  user,
  specialties,
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
  section?: DoctorSection;
  user: ApiUser | null;
  specialties: Specialty[];
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
  const [demoAppointments, setDemoAppointments] = useState<ApiAppointment[]>(() => createDemoAppointments());
  // Demo data is ONLY for offline/preview mode. A real logged-in doctor with an
  // empty (or still-loading) list must see the real empty/loading state — never
  // 4 fabricated patients with fake phone numbers and fake pending counts.
  const usingDemoAppointments = isOfflineMode() && appointments.length === 0;
  const visibleAppointments = usingDemoAppointments ? demoAppointments : appointments;
  const pendingCount = visibleAppointments.filter((a) => a.status === "pending").length;
  const confirmedCount = visibleAppointments.filter((a) => a.status === "doctor_confirmed").length;
  const completedCount = visibleAppointments.filter((a) => a.status === "completed").length;
  const approvalStatus = profile?.approval_status || user?.doctor_profile?.approval_status;

  function handleAppointmentAction(appointment: ApiAppointment, action: DoctorAppointmentAction, reason?: string) {
    if (!usingDemoAppointments) {
      return onAppointmentAction(appointment, action, reason);
    }

    const nextStatusByAction: Record<DoctorAppointmentAction, ApiAppointment["status"]> = {
      confirm: "doctor_confirmed",
      reject: "doctor_rejected",
      complete: "completed",
      mark_no_show: "no_show"
    };

    setDemoAppointments((current) =>
      current.map((item) =>
        item.id === appointment.id
          ? {
              ...item,
              status: nextStatusByAction[action],
              reject_reason: action === "reject" ? reason?.trim() || "" : item.reject_reason
            }
          : item
      )
    );
    return Promise.resolve();
  }

  const errorBanner = error ? (
    <div className="flex items-center gap-2 rounded-2xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger" role="alert">
      <XCircle size={17} className="shrink-0" />
      <span>{error}</span>
    </div>
  ) : null;

  if (section === "appointments") {
    return (
      <div className="flex flex-col gap-4">
        {errorBanner}
        <DoctorAppointmentRequests
          appointments={visibleAppointments}
          loading={loading}
          onAppointmentAction={handleAppointmentAction}
        />
      </div>
    );
  }

  if (section === "schedule") {
    return (
      <div className="flex flex-col gap-4">
        {errorBanner}
        <DoctorScheduleManager
          schedule={schedule}
          loading={loading}
          onScheduleSubmit={onScheduleSubmit}
          onScheduleDelete={onScheduleDelete}
        />
      </div>
    );
  }

  if (section === "profile") {
    // Online, profile not yet fetched: rendering the (uncontrolled) form now
    // would mount every field EMPTY and never re-seed — and saving that empty
    // form wipes the stored profile. Hold a loader until /api/doctors/me/ lands;
    // key remounts the form if the profile object is swapped later.
    const profileNotReady = !profile && !isOfflineMode();
    return (
      <div className="flex flex-col gap-4">
        {errorBanner}
        {profileNotReady ? (
          <Card className="flex flex-col items-center gap-3 py-10 text-center">
            {loading ? (
              <Loader2 size={22} className="animate-spin text-brand-500" />
            ) : null}
            <span className="text-sm text-ink-500">
              {loading ? "Profil yuklanmoqda..." : "Profil yuklanmadi. Yangilashni qayta urinib ko'ring."}
            </span>
            {!loading && (
              <button
                type="button"
                onClick={onRefresh}
                className="inline-flex h-10 items-center justify-center rounded-pill border border-surface-200 bg-surface-0 px-4 text-sm font-bold text-brand-600 transition-colors hover:bg-brand-50"
              >
                Qayta yuklash
              </button>
            )}
          </Card>
        ) : (
          <DoctorProfileForm
            key={profile?.id ?? "offline"}
            user={user}
            profile={profile}
            specialties={specialties}
            loading={loading}
            onProfileSubmit={onProfileSubmit}
          />
        )}
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
          className="inline-flex h-12 items-center justify-center gap-2 rounded-pill border border-danger/30 bg-danger/10 font-semibold text-danger transition-colors hover:bg-danger/20"
        >
          <LogOut size={18} />
          Chiqish
        </button>
      </div>
    );
  }

  // Kabinet (overview)
  return (
    <div className="flex flex-col gap-5">
      <DoctorHeaderCard
        user={user}
        profile={profile}
        approvalStatus={approvalStatus}
        isPublished={Boolean(profile?.is_published)}
        isSubscriptionActive={Boolean(profile?.is_subscription_active)}
        loading={loading}
        onRefresh={onRefresh}
        onEdit={() => onNavigate("doctorEdit")}
      />
      {errorBanner}
      <DoctorStatsRow
        pendingCount={pendingCount}
        confirmedCount={confirmedCount}
        completedCount={completedCount}
        rating={profile?.rating || "0.0"}
        reviewsCount={profile?.reviews_count || 0}
      />

      <button
        type="button"
        onClick={() => onNavigate("doctorRequests")}
        className="flex w-full items-center gap-3 rounded-card border border-surface-100 bg-surface-0 p-4 text-left shadow-card transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 active:scale-[0.99]"
      >
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
          <CalendarCheck2 size={20} />
        </span>
        <span className="min-w-0 flex-1">
          <strong className="block font-semibold text-ink-900">Qabul so&apos;rovlari</strong>
          <small className="text-xs text-ink-500">
            {pendingCount > 0 ? `${pendingCount} ta yangi so'rov kutilmoqda` : "Yangi so'rov yo'q"}
          </small>
        </span>
        <ChevronRight size={18} className="shrink-0 text-ink-400" />
      </button>
    </div>
  );
}
