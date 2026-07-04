import { HeartOff } from "lucide-react";
import { EmptyState } from "../components/common";
import { DoctorCard } from "../components/DoctorCard";
import type { Doctor } from "../types";

/**
 * The patient's saved ("favourite") doctors. Doctors are saved via the heart on
 * any doctor card (persisted to localStorage); this page lets the patient come
 * back to that shortlist and book.
 */
export function SavedDoctorsView({
  doctors,
  onOpenDoctor,
  savedDoctorIds,
  onToggleSaved,
  onAppointment
}: {
  doctors: Doctor[];
  onOpenDoctor: (doctor: Doctor) => void;
  savedDoctorIds: string[];
  onToggleSaved: (doctorId: string) => void;
  onAppointment: (doctor: Doctor) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-baseline justify-between gap-3">
        <h1 className="text-xl font-extrabold tracking-tight text-ink-900">Saqlangan shifokorlar</h1>
        {doctors.length > 0 && <span className="shrink-0 text-sm text-ink-500">{doctors.length} ta</span>}
      </header>
      {doctors.length > 0 ? (
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
      ) : (
        <EmptyState
          title="Saqlangan shifokor yo'q"
          text="Yoqqan shifokorni kartadagi yurakcha ❤️ orqali saqlang — bu yerda ko'rinadi."
          Icon={HeartOff}
        />
      )}
    </div>
  );
}
