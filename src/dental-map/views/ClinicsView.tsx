import { Building2, Clock, MapPin, Star } from "lucide-react";
import { EmptyState } from "../components/common";
import { Button, Card } from "../ui";
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
    <div className="flex flex-col gap-3">
      {clinics.map((clinic) => (
        <Card as="article" key={clinic.id} className="flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
              <Building2 size={24} />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <strong className="truncate text-[0.95rem] font-bold text-ink-900">{clinic.name}</strong>
              <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-500">
                <em className="inline-flex items-center gap-1 not-italic">
                  <Star size={14} className="text-warning" /> {clinic.rating || "0.0"}
                </em>
                <em className="inline-flex items-center gap-1 not-italic">
                  <MapPin size={14} className="text-brand-500" /> {clinic.district}
                </em>
              </span>
              <p className="text-sm text-ink-700">{clinic.address || "Manzil kiritilmagan"}</p>
              <small className="inline-flex items-center gap-1 text-xs text-ink-400">
                <Clock size={12} /> {clinic.workTime || "Ish vaqti kiritilmagan"}
              </small>
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={() => onNavigate("doctors")}>
            Shifokorlar
          </Button>
        </Card>
      ))}
      {clinics.length === 0 && (
        <EmptyState
          title={loading ? "Klinikalar yuklanmoqda" : "Klinika topilmadi"}
          text={dataError || "Tanlangan hudud bo'yicha hozircha klinika topilmadi."}
          Icon={Building2}
        />
      )}
    </div>
  );
}
