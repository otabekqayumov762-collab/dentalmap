import { BellOff, ChevronRight, Bell, Clock3, Inbox } from "lucide-react";
import { Badge, Card } from "../ui";
import { EmptyState } from "../components/common";

export function NotificationsView({
  sent,
  isDoctor,
  pendingCount = 0,
  onOpenAppointment,
  onOpenRequests
}: {
  sent: boolean;
  isDoctor?: boolean;
  pendingCount?: number;
  onOpenAppointment: () => void;
  onOpenRequests?: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          <Bell size={20} />
        </span>
        <div className="min-w-0">
          <h1 className="text-xl font-extrabold tracking-tight text-ink-900">Bildirishnomalar</h1>
          <p className="text-sm text-ink-500">Qabul holati va eslatmalar</p>
        </div>
      </header>

      {isDoctor ? (
        pendingCount > 0 ? (
          <Card as="article" interactive onClick={onOpenRequests} className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
              <Inbox size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-2">
                <strong className="truncate text-ink-900">Yangi qabul so&apos;rovlari</strong>
                <Badge tone="brand" className="shrink-0">
                  {pendingCount} ta kutilmoqda
                </Badge>
              </div>
              <p className="text-sm text-ink-500">Bemorlardan kelgan so&apos;rovlarni ko&apos;rib chiqing.</p>
            </div>
            <ChevronRight size={18} className="shrink-0 text-ink-400" />
          </Card>
        ) : (
          <EmptyState
            title="Yangi bildirishnoma yo'q"
            text="Yangi qabul so'rovlari shu yerda ko'rinadi."
            Icon={BellOff}
          />
        )
      ) : sent ? (
        // The patient sent a booking request this session: show its status here
        // (mirrors the doctor's pending-requests card) instead of the generic
        // "no notifications" empty state.
        <Card as="article" interactive onClick={onOpenAppointment} className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
            <Clock3 size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2">
              <strong className="truncate text-ink-900">So&apos;rov yuborildi</strong>
              <Badge tone="brand" className="shrink-0">
                Kutilmoqda
              </Badge>
            </div>
            <p className="text-sm text-ink-500">
              Shifokor tasdig&apos;i kutilmoqda. Qabullaringiz holatini shu yerdan kuzating.
            </p>
          </div>
          <ChevronRight size={18} className="shrink-0 text-ink-400" />
        </Card>
      ) : (
        <EmptyState
          title="Bildirishnoma hozircha mavjud emas"
          text="Qabul holati va yangiliklar Telegram bot orqali yuboriladi. Shifokor so'rovingizni tasdiqlagach, sizga xabar keladi."
          Icon={BellOff}
        />
      )}
    </div>
  );
}
