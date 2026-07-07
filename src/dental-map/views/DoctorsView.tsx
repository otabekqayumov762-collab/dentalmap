import { Stethoscope } from "lucide-react";
import { EmptyState } from "../components/common";
import { DoctorCard } from "../components/DoctorCard";
import { cn } from "../ui";
import type { Doctor } from "../types";

export function DoctorsView({
  doctors,
  loading,
  dataError,
  onOpenDoctor,
  savedDoctorIds,
  onToggleSaved,
  onAppointment,
  filtersActive = false,
  onResetFilters
}: {
  doctors: Doctor[];
  loading: boolean;
  dataError: string;
  onOpenDoctor: (doctor: Doctor) => void;
  savedDoctorIds: string[];
  onToggleSaved: (doctorId: string) => void;
  onAppointment: (doctor: Doctor) => void;
  filtersActive?: boolean;
  onResetFilters?: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-extrabold tracking-tight text-ink-900">Shifokorlar</h1>
          <p className="text-sm font-semibold text-ink-500">
            {doctors.length > 0 ? `${doctors.length} ta shifokor` : "Ro'yxat yangilanmoqda"}
          </p>
        </div>
        {filtersActive && (
          <button
            type="button"
            onClick={onResetFilters}
            className={cn(
              "shrink-0 rounded-pill border border-brand-100 bg-brand-50 px-4 py-2",
              "text-sm font-extrabold text-brand-700 shadow-card transition-colors hover:bg-brand-100"
            )}
          >
            Barchasi
          </button>
        )}
      </header>
      <div className="grid grid-cols-2 gap-3">
        {doctors.map((doctor) => (
          <DoctorCard
            key={doctor.id}
            doctor={doctor}
            onOpen={() => onOpenDoctor(doctor)}
            onAppointment={() => onAppointment(doctor)}
            isSaved={savedDoctorIds.includes(doctor.id)}
            onToggleSaved={() => onToggleSaved(doctor.id)}
          />
        ))}
      </div>
      {doctors.length === 0 && (
        <EmptyState
          title={loading ? "Shifokorlar yuklanmoqda" : "Shifokor topilmadi"}
          text={dataError || "Filterga mos shifokor topilmadi."}
          Icon={Stethoscope}
        />
      )}
    </div>
  );
}
