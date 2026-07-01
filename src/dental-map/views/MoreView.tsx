import { Building2, CheckCircle2, ChevronRight, LogOut, MapPin, MessageCircle, SlidersHorizontal, User } from "lucide-react";
import type { Shortcut, ViewId } from "../types";
import { cn } from "../ui";

export function MoreView({
  onNavigate,
  sent,
  isDoctor,
  onLogout
}: {
  onNavigate: (view: ViewId) => void;
  sent: boolean;
  isDoctor: boolean;
  onLogout: () => void;
}) {
  const patientRows: Array<Shortcut & { description: string }> = [
    { id: "services", label: "Xizmatlar", Icon: SlidersHorizontal, description: "Davolash va konsultatsiya turlari" },
    { id: "clinics", label: "Klinikalar", Icon: Building2, description: "Manzil, reyting va ish vaqti" },
    { id: "map", label: "Klinikagacha yo'l", Icon: MapPin, description: "Lokatsiya va marshrut" },
    { id: "feedback", label: "Taklif va shikoyat", Icon: MessageCircle, description: "Administratorga xabar yuborish" },
    { id: "profile", label: "Profil", Icon: User, description: "Ma'lumotlaringiz" }
  ];
  const doctorRows: Array<Shortcut & { description: string }> = [
    { id: "profile", label: "Kabinet", Icon: User, description: "Profil, jadval va qabullar" },
    { id: "feedback", label: "Taklif va shikoyat", Icon: MessageCircle, description: "Administratorga xabar yuborish" }
  ];
  const rows = isDoctor ? doctorRows : patientRows;

  return (
    <div className="flex flex-col gap-3">
      {!isDoctor && (
        <div
          className={cn(
            "flex items-center gap-3 rounded-card p-4 shadow-card",
            sent ? "bg-emerald-50 text-emerald-700" : "border border-surface-100 bg-surface-0 text-ink-700"
          )}
        >
          <span
            className={cn(
              "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
              sent ? "bg-emerald-100 text-emerald-700" : "bg-surface-100 text-ink-500"
            )}
          >
            <CheckCircle2 size={18} />
          </span>
          <span className="flex flex-col">
            <strong className="text-[0.95rem] font-semibold">
              {sent ? "Administrator tekshiryapti" : "Faol so'rov yo'q"}
            </strong>
            <small className={cn("text-xs", sent ? "text-emerald-600" : "text-ink-500")}>
              {sent ? "So'rovingiz administratorga yuborildi." : "Qabul formasini to'ldiring."}
            </small>
          </span>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {rows.map(({ id, label, description, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onNavigate(id)}
            className="flex items-center gap-3 rounded-card border border-surface-100 bg-surface-0 p-4 text-left shadow-card transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 active:scale-[0.99]"
          >
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
              <Icon size={22} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <strong className="text-[0.95rem] font-semibold text-ink-900">{label}</strong>
              <small className="text-xs text-ink-500">{description}</small>
            </span>
            <ChevronRight size={18} className="shrink-0 text-ink-400" />
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={onLogout}
        className="mt-1 inline-flex h-12 items-center justify-center gap-2 rounded-pill border border-rose-200 bg-rose-50 font-semibold text-danger transition-colors hover:bg-rose-100"
      >
        <LogOut size={18} />
        Chiqish
      </button>
    </div>
  );
}
