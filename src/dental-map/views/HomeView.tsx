import { ChevronRight, Stethoscope } from "lucide-react";
import { DoctorAvatar, EmptyState, SectionTitle } from "../components/common";
import { DoctorCard } from "../components/DoctorCard";
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
    <div className="view-stack">
      <SectionTitle
        title="Tavsiya etilgan shifokorlar"
        action="Barchasi"
        onAction={() => onNavigate("doctors")}
      />
      <div className="doctor-grid">
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

      {doctor && (
        <>
          <SectionTitle
            title="Tanlangan shifokor"
            action="Qabul"
            onAction={() => onAppointment(doctor)}
          />
          <button className="appointment-strip" onClick={() => onOpenDoctor(doctor)}>
            <DoctorAvatar doctor={doctor} size="sm" />
            <span>
              <strong>{doctor.name}</strong>
              <small>{doctor.clinic}</small>
              <em>{consultationSent ? "Administrator tasdiqini kutmoqda" : "Qabulga yozilish tayyor"}</em>
            </span>
            <ChevronRight size={18} />
          </button>
        </>
      )}
    </div>
  );
}
