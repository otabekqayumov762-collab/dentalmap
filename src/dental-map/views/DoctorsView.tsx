import { Stethoscope } from "lucide-react";
import { EmptyState } from "../components/common";
import { DoctorCard } from "../components/DoctorCard";
import type { Doctor } from "../types";

export function DoctorsView({
  doctors,
  loading,
  dataError,
  onOpenDoctor,
  savedDoctorIds,
  onToggleSaved,
  onAppointment
}: {
  doctors: Doctor[];
  loading: boolean;
  dataError: string;
  onOpenDoctor: (doctor: Doctor) => void;
  savedDoctorIds: string[];
  onToggleSaved: (doctorId: string) => void;
  onAppointment: (doctor: Doctor) => void;
}) {
  return (
    <div className="view-stack">
      <div className="doctor-grid">
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
          text={dataError || "Filterga mos yoki tasdiqlangan shifokor yo'q."}
          Icon={Stethoscope}
        />
      )}
    </div>
  );
}
