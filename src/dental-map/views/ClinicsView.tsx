import { Building2, MapPin, Star } from "lucide-react";
import { EmptyState } from "../components/common";
import type { Clinic, ViewId } from "../types";

export function ClinicsView({
  clinics,
  loading,
  dataError,
  onNavigate
}: {
  clinics: Clinic[];
  loading: boolean;
  dataError: string;
  onNavigate: (view: ViewId) => void;
}) {
  return (
    <div className="view-stack">
      {clinics.map((clinic) => (
        <article className="clinic-card" key={clinic.id}>
          <span className="clinic-avatar">
            <Building2 size={24} />
          </span>
          <div>
            <strong>{clinic.name}</strong>
            <span className="clinic-meta">
              <em><Star size={14} /> {clinic.rating || "0.0"}</em>
              <em><MapPin size={14} /> {clinic.district}</em>
            </span>
            <p>{clinic.address || "Manzil kiritilmagan"}</p>
            <small>{clinic.workTime || "Ish vaqti kiritilmagan"}</small>
          </div>
          <button className="mini-btn" onClick={() => onNavigate("doctors")}>
            Shifokorlar
          </button>
        </article>
      ))}
      {clinics.length === 0 && (
        <EmptyState
          title={loading ? "Klinikalar yuklanmoqda" : "Klinika topilmadi"}
          text={dataError || "Backendda faol klinika ma'lumotlari yo'q."}
          Icon={Building2}
        />
      )}
    </div>
  );
}
