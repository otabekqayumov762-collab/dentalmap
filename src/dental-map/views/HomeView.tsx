import { ChevronRight, Stethoscope } from "lucide-react";
import { DoctorAvatar, EmptyState, SectionTitle } from "../components/common";
import { DoctorCard } from "../components/DoctorCard";
import { cn } from "../ui";
import type { Doctor, ViewId } from "../types";

export function HomeView({
  doctors,
  doctor,
  loading,
  dataError,
  consultationSent,
  onAppointment,
  onOpenDoctor,
  savedDoctorIds,
  onToggleSaved,
  onNavigate
}: {
  doctors: Doctor[];
  doctor: Doctor | null;
  loading: boolean;
  dataError: string;
  consultationSent: boolean;
  onAppointment: (doctor: Doctor) => void;
  onOpenDoctor: (doctor: Doctor) => void;
  savedDoctorIds: string[];
  onToggleSaved: (doctorId: string) => void;
  onNavigate: (view: ViewId) => void;
}) {
  return (
    <div className="mt-5 flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <SectionTitle
          title="Tavsiya etilgan shifokorlar"
          action="Barchasi"
          onAction={() => onNavigate("doctors")}
        />
        <div className="grid grid-cols-2 gap-3">
          {doctors.slice(0, 4).map((item) => (
            <DoctorCard
              key={item.id}
              doctor={item}
              onOpen={() => onOpenDoctor(item)}
              onAppointment={() => onAppointment(item)}
              isSaved={savedDoctorIds.includes(item.id)}
              onToggleSaved={() => onToggleSaved(item.id)}
            />
          ))}
        </div>
        {doctors.length === 0 && (
          <EmptyState
            title={loading ? "Shifokorlar yuklanmoqda" : "Shifokor topilmadi"}
            text={dataError || "Backendda tasdiqlangan shifokorlar ko'rinmayapti."}
            Icon={Stethoscope}
          />
        )}
      </section>

      {doctor && (
        <section className="flex flex-col gap-3">
          <SectionTitle
            title="Tanlangan shifokor"
            action="Qabul"
            onAction={() => onAppointment(doctor)}
          />
          <button
            type="button"
            onClick={() => onOpenDoctor(doctor)}
            className={cn(
              "flex w-full items-center gap-3 rounded-card border border-surface-100 bg-surface-0 p-4 text-left shadow-card",
              "transition-transform hover:-translate-y-0.5 active:scale-[0.99]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"
            )}
          >
            <DoctorAvatar doctor={doctor} size="sm" />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <strong className="truncate text-[0.95rem] font-bold text-ink-900">{doctor.name}</strong>
              <small className="truncate text-sm text-ink-500">{doctor.clinic}</small>
              <em className="truncate text-xs font-medium not-italic text-brand-600">
                {consultationSent ? "Shifokor tasdig'i kutilmoqda" : "Qabulga yozilish tayyor"}
              </em>
            </span>
            <ChevronRight size={18} className="shrink-0 text-ink-400" />
          </button>
        </section>
      )}
    </div>
  );
}
