import { Building2, CheckCircle2, ChevronRight, MapPin, MessageCircle, SlidersHorizontal, User } from "lucide-react";
import type { Shortcut, ViewId } from "../types";
import { cn } from "../ui";

export function MoreView({
  onNavigate,
  sent
}: {
  onNavigate: (view: ViewId) => void;
  sent: boolean;
}) {
  const rows: Array<Shortcut & { description: string; badge?: string }> = [
    {
      id: "services",
      label: "Xizmatlar",
      Icon: SlidersHorizontal,
      description: "Davolash va konsultatsiya turlari"
    },
    {
      id: "clinics",
      label: "Klinikalar",
      Icon: Building2,
      description: "Manzil, reyting va ish vaqti"
    },
    {
      id: "map",
      label: "Klinikagacha yo'l",
      Icon: MapPin,
      description: "Lokatsiya va marshrut"
    },
    {
      id: "feedback",
      label: "Taklif va shikoyat",
      Icon: MessageCircle,
      description: "Administratorga xabar yuborish"
    },
    {
      id: "profile",
      label: "Profil",
      Icon: User,
      description: "Telefon va xavfsizlik"
    }
  ];

  return (
    <div className="flex flex-col gap-3">
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

      <div className="flex flex-col gap-3">
        {rows.map(({ id, label, description, badge, Icon }, index) => {
          const featured = index === 0;

          return (
            <button
              key={id}
              type="button"
              onClick={() => onNavigate(id)}
              className={cn(
                "flex items-center gap-3 rounded-card p-4 text-left shadow-card transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 active:scale-[0.99]",
                featured ? "bg-brand-500 text-white" : "border border-surface-100 bg-surface-0"
              )}
            >
              <span
                className={cn(
                  "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
                  featured ? "bg-white/20 text-white" : "bg-brand-50 text-brand-600"
                )}
              >
                <Icon size={22} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <strong className={cn("text-[0.95rem] font-semibold", featured ? "text-white" : "text-ink-900")}>
                  {label}
                </strong>
                <small className={cn("text-xs", featured ? "text-white/80" : "text-ink-500")}>{description}</small>
              </span>
              <span className={cn("shrink-0", featured ? "text-white" : "text-ink-400")}>
                {badge ?? <ChevronRight size={18} />}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
