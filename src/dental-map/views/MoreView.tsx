import { Building2, CheckCircle2, ChevronRight, MapPin, MessageCircle, SlidersHorizontal, User } from "lucide-react";
import type { Shortcut, ViewId } from "../types";

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
    <div className="view-stack">
      <div className={sent ? "admin-status sent" : "admin-status"}>
        <CheckCircle2 size={18} />
        <span>
          <strong>{sent ? "Administrator tekshiryapti" : "Faol so'rov yo'q"}</strong>
          <small>{sent ? "So'rovingiz administratorga yuborildi." : "Qabul formasini to'ldiring."}</small>
        </span>
      </div>
      <div className="menu-grid">
        {rows.map(({ id, label, description, badge, Icon }, index) => (
          <button
            key={id}
            className={index === 0 ? "menu-card featured" : "menu-card"}
            onClick={() => onNavigate(id)}
            type="button"
          >
            <span className="menu-icon">
              <Icon size={22} />
            </span>
            <span className="menu-copy">
              <strong>{label}</strong>
              <small>{description}</small>
            </span>
            <span className="menu-action">{badge ?? <ChevronRight size={18} />}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
