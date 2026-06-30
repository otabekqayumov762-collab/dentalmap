import { Bell, CalendarCheck2, CheckCircle2, ChevronRight, Clock } from "lucide-react";
import { Badge, Card } from "../ui";

export function NotificationsView({ sent, onOpenAppointment }: { sent: boolean; onOpenAppointment: () => void }) {
  const primary = sent
    ? {
        title: "Administrator tasdig'i kutilmoqda",
        text: "So'rovingiz ko'rib chiqilmoqda. Shifokor tasdiqlagach xabar beramiz.",
        tone: "warning" as const,
        label: "Jarayonda"
      }
    : {
        title: "Qabul formasi tayyor",
        text: "F.I.O, telefon, kun va vaqtni kiriting — qabulga yoziling.",
        tone: "brand" as const,
        label: "Yangi"
      };

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          <Bell size={20} />
        </span>
        <div>
          <h1 className="text-lg font-bold text-ink-900">Bildirishnomalar</h1>
          <p className="text-sm text-ink-500">Qabul holati va eslatmalar</p>
        </div>
      </header>

      <Card as="article" interactive onClick={onOpenAppointment} className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          {sent ? <Clock size={20} /> : <CalendarCheck2 size={20} />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <strong className="truncate text-ink-900">{primary.title}</strong>
            <Badge tone={primary.tone}>{primary.label}</Badge>
          </div>
          <p className="text-sm text-ink-500">{primary.text}</p>
        </div>
        <ChevronRight size={18} className="shrink-0 text-ink-400" />
      </Card>

      <Card as="article" className="flex items-center gap-3 opacity-90">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <CheckCircle2 size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <strong className="block truncate text-ink-900">Dental Map&apos;ga xush kelibsiz</strong>
          <p className="text-sm text-ink-500">Shifokor va klinikalarni qidiring, qabulga yoziling.</p>
        </div>
      </Card>
    </div>
  );
}
