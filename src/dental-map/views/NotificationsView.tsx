import {
  Ban,
  Bell,
  BellOff,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  Clock3,
  Inbox,
  Star,
  Stethoscope,
  XCircle,
  type LucideIcon
} from "lucide-react";
import { useMemo } from "react";
import { Badge, Card } from "../ui";
import { EmptyState } from "../components/common";
import { formatUzDate } from "../lib/date";
import type { ApiAppointment } from "../types";
import { statusTone } from "./AppointmentDetailView";

type AppointmentStatus = ApiAppointment["status"];

/**
 * Feed copy per status — the patient-facing status line + icon shown on each
 * notification card. The Badge tone is taken from the shared `statusTone` source
 * of truth so the feed never drifts from the list/detail views.
 */
const statusFeed: Record<AppointmentStatus, { line: string; Icon: LucideIcon }> = {
  pending: { line: "Shifokor tasdig'i kutilmoqda", Icon: Clock3 },
  doctor_confirmed: { line: "Shifokor tasdiqladi ✅", Icon: CheckCircle2 },
  doctor_rejected: { line: "Shifokor rad etdi ❌", Icon: XCircle },
  user_cancelled: { line: "Bekor qilindi", Icon: Ban },
  completed: { line: "Qabul yakunlandi — baholang", Icon: Star },
  no_show: { line: "Kelmagan", Icon: XCircle }
};

function createdMs(appointment: ApiAppointment): number {
  const time = appointment.created_at ? new Date(appointment.created_at).getTime() : 0;
  return Number.isNaN(time) ? 0 : time;
}

export function NotificationsView({
  appointments = [],
  isDoctor,
  pendingCount = 0,
  onOpenAppointment,
  onOpenRequests
}: {
  /** The patient's appointments (ignored for the doctor branch). */
  appointments?: ApiAppointment[];
  isDoctor?: boolean;
  pendingCount?: number;
  /** Opens a single appointment's detail. */
  onOpenAppointment: (appointment: ApiAppointment) => void;
  onOpenRequests?: () => void;
}) {
  // Most-recent first. The list arrives `-created_at` ordered already, but we
  // re-sort defensively so the newest status change always sits on top.
  const feed = useMemo(
    () => [...appointments].sort((a, b) => createdMs(b) - createdMs(a)),
    [appointments]
  );

  // The freshest non-pending change gets a subtle "new" accent — this is the
  // update the patient most likely opened the feed to see.
  const newestChangedId = useMemo(
    () => feed.find((appointment) => appointment.status !== "pending")?.id ?? null,
    [feed]
  );

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
      ) : feed.length === 0 ? (
        <EmptyState
          title="Bildirishnoma hozircha mavjud emas"
          text="Qabulga yozilganingizdan so'ng, uning holati (tasdiqlash, rad etish, yakunlash) shu yerda ko'rinadi."
          Icon={BellOff}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {feed.map((appointment) => {
            const meta = statusFeed[appointment.status];
            const tone = statusTone(appointment.status);
            const isNew = appointment.id === newestChangedId;
            const StatusIcon = meta.Icon;

            return (
              <Card
                key={appointment.id}
                as="article"
                interactive
                role="button"
                tabIndex={0}
                onClick={() => onOpenAppointment(appointment)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onOpenAppointment(appointment);
                  }
                }}
                className={isNew ? "flex flex-col gap-3 ring-2 ring-brand-300" : "flex flex-col gap-3"}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                      <Stethoscope size={20} />
                    </span>
                    <div className="min-w-0">
                      <strong className="block truncate font-semibold text-ink-900">
                        {appointment.doctor_name || "Shifokor"}
                      </strong>
                      <small className="text-xs text-ink-400">Shifokor</small>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {isNew && (
                      <Badge tone="brand" className="shrink-0">
                        Yangi
                      </Badge>
                    )}
                    <ChevronRight size={18} className="text-ink-400" />
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-2xl bg-surface-50 px-3.5 py-2.5 text-sm font-medium text-ink-700">
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                    <CalendarDays size={15} className="shrink-0 text-brand-500" />
                    {formatUzDate(appointment.appointment_date)}
                  </span>
                  <span className="h-4 w-px shrink-0 bg-surface-200" />
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                    <Clock size={15} className="shrink-0 text-brand-500" />
                    {appointment.appointment_time.slice(0, 5)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <StatusIcon size={17} className="shrink-0 text-ink-500" />
                  <Badge tone={tone}>{meta.line}</Badge>
                </div>

                {appointment.status === "doctor_rejected" && appointment.reject_reason && (
                  <div className="rounded-2xl bg-danger/10 px-3.5 py-2.5 text-sm text-danger">
                    <span className="mb-1 block text-xs font-semibold uppercase text-danger/70">Rad etish sababi</span>
                    <p className="leading-relaxed">{appointment.reject_reason}</p>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
