import {
  CalendarCheck2,
  CalendarDays,
  CheckCircle2,
  Clock,
  Loader2,
  Phone,
  UserRound,
  XCircle,
  type LucideIcon
} from "lucide-react";
import { useState } from "react";
import { EmptyState } from "../../components/common";
import { formatUzDate } from "../../lib/date";
import type { ApiAppointment } from "../../types";
import { Badge, Button, Card, Field, Chip, cn } from "../../ui";
import { SectionHeader, appointmentStatusLabel, statusTone } from "./common";

type FilterKey = "all" | "pending" | "doctor_confirmed" | "completed";
type Action = "confirm" | "reject" | "complete" | "mark_no_show";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "Hammasi" },
  { key: "pending", label: "Kutilmoqda" },
  { key: "doctor_confirmed", label: "Tasdiqlangan" },
  { key: "completed", label: "Yakunlangan" }
];

const EMPTY: Record<FilterKey, { Icon: LucideIcon; title: string; text: string }> = {
  all: {
    Icon: CalendarDays,
    title: "Hozircha qabul so'rovlari yo'q",
    text: "Yangi so'rovlar kelganda shu yerda ko'rinadi."
  },
  pending: {
    Icon: Clock,
    title: "Kutilayotgan so'rov yo'q",
    text: "Barcha so'rovlar ko'rib chiqilgan."
  },
  doctor_confirmed: {
    Icon: CalendarCheck2,
    title: "Tasdiqlangan qabul yo'q",
    text: "Tasdiqlagan qabullaringiz shu yerda ko'rinadi."
  },
  completed: {
    Icon: CheckCircle2,
    title: "Yakunlangan qabul yo'q",
    text: "Yakunlangan qabullar shu yerda ko'rinadi."
  }
};

const DEFAULT_REJECT_REASON = "Shifokor tomonidan rad etildi.";

export function DoctorAppointmentRequests({
  appointments = [],
  loading = false,
  onAppointmentAction
}: {
  appointments: ApiAppointment[];
  loading?: boolean;
  onAppointmentAction: (a: ApiAppointment, action: Action, reason?: string) => Promise<void> | void;
}) {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [reasons, setReasons] = useState<Record<string, string>>({});

  const countFor = (key: FilterKey) =>
    key === "all" ? appointments.length : appointments.filter((item) => item.status === key).length;

  const filtered = filter === "all" ? appointments : appointments.filter((item) => item.status === filter);
  const empty = EMPTY[filter];

  return (
    <section className="flex flex-col gap-4">
      <SectionHeader
        Icon={CalendarCheck2}
        title="Qabul so'rovlari"
        subtitle="Bemorlarning qabul so'rovlarini boshqaring"
      />

      <div
        className="-mx-1 flex gap-2 overflow-x-auto no-scrollbar px-1 pb-1.5"
        role="group"
        aria-label="So'rovlarni holat bo'yicha saralash"
      >
        {FILTERS.map((item) => {
          const active = filter === item.key;
          const count = countFor(item.key);
          return (
            <Chip key={item.key} active={active} onClick={() => setFilter(item.key)} className="shrink-0">
              {item.label}
              <span
                className={cn(
                  "inline-flex min-w-5 items-center justify-center rounded-pill px-1.5 text-xs font-bold tabular-nums",
                  active ? "bg-white/25 text-white" : "bg-surface-100 text-ink-500"
                )}
              >
                {count}
              </span>
            </Chip>
          );
        })}
      </div>

      {loading && appointments.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 py-10 text-center">
          <Loader2 size={22} className="animate-spin text-brand-500" />
          <span className="text-sm text-ink-500">Yuklanmoqda...</span>
        </Card>
      ) : filtered.length === 0 ? (
        <EmptyState Icon={empty.Icon} title={empty.title} text={empty.text} />
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((appointment) => {
            const isPending = appointment.status === "pending";
            const isConfirmed = appointment.status === "doctor_confirmed";
            const reason = reasons[appointment.id] ?? "";

            return (
              <Card key={appointment.id} as="article" className="flex flex-col gap-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                      <UserRound size={20} />
                    </span>
                    <div className="min-w-0">
                      <strong className="block truncate font-semibold text-ink-900">{appointment.full_name}</strong>
                      {(appointment.age || appointment.gender) && (
                        <small className="block truncate text-xs text-ink-400">
                          {[appointment.age ? `${appointment.age} yosh` : null, appointment.gender]
                            .filter(Boolean)
                            .join(" · ")}
                        </small>
                      )}
                    </div>
                  </div>
                  <Badge tone={statusTone(appointment.status)} className="shrink-0">
                    {appointmentStatusLabel(appointment.status)}
                  </Badge>
                </div>

                <div className="flex flex-col gap-2.5 rounded-2xl bg-surface-50 px-3.5 py-3 text-sm">
                  <div className="flex items-center gap-3 font-medium text-ink-700">
                    <span className="inline-flex min-w-0 items-center gap-1.5">
                      <CalendarDays size={15} className="shrink-0 text-brand-500" />
                      <span className="truncate">{formatUzDate(appointment.appointment_date)}</span>
                    </span>
                    <span className="h-4 w-px shrink-0 bg-surface-200" />
                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                      <Clock size={15} className="shrink-0 text-brand-500" />
                      {appointment.appointment_time.slice(0, 5)}
                    </span>
                  </div>
                  {appointment.phone && (
                    <a
                      href={`tel:${appointment.phone}`}
                      className="inline-flex w-fit max-w-full items-center gap-1.5 font-semibold text-brand-600 transition-colors hover:text-brand-700"
                    >
                      <Phone size={15} className="shrink-0" />
                      <span className="truncate">{appointment.phone}</span>
                    </a>
                  )}
                </div>

                {appointment.note && (
                  <div className="rounded-2xl bg-surface-50 px-3.5 py-3 text-sm text-ink-700">
                    <span className="mb-1 block text-xs font-semibold uppercase text-ink-400">Bemor holati</span>
                    <p className="leading-relaxed">{appointment.note}</p>
                  </div>
                )}

                {appointment.status === "doctor_rejected" && appointment.reject_reason && (
                  <p className="flex items-start gap-2 rounded-2xl bg-danger/10 px-3.5 py-3 text-sm leading-relaxed text-danger">
                    <XCircle size={16} className="mt-0.5 shrink-0" />
                    <span>{appointment.reject_reason}</span>
                  </p>
                )}

                {isPending && (
                  <div className="flex flex-col gap-3 border-t border-surface-100 pt-3.5">
                    <Field
                      label="Rad etish sababi"
                      value={reason}
                      onChange={(event) =>
                        setReasons((prev) => ({ ...prev, [appointment.id]: event.target.value }))
                      }
                      placeholder={DEFAULT_REJECT_REASON}
                    />
                    <div className="flex flex-wrap gap-2.5">
                      <Button
                        type="button"
                        size="sm"
                        className="min-w-32 flex-1"
                        onClick={() => void onAppointmentAction(appointment, "confirm")}
                      >
                        <CheckCircle2 size={16} />
                        Tasdiqlash
                      </Button>
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        className="min-w-32 flex-1"
                        onClick={() =>
                          void onAppointmentAction(appointment, "reject", reason.trim() || DEFAULT_REJECT_REASON)
                        }
                      >
                        <XCircle size={16} />
                        Rad etish
                      </Button>
                    </div>
                  </div>
                )}

                {isConfirmed && (
                  <div className="flex flex-wrap gap-2.5 border-t border-surface-100 pt-3.5">
                    <Button
                      type="button"
                      size="sm"
                      className="min-w-32 flex-1"
                      onClick={() => void onAppointmentAction(appointment, "complete")}
                    >
                      <CheckCircle2 size={16} />
                      Yakunlandi
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      className="min-w-32 flex-1"
                      onClick={() => void onAppointmentAction(appointment, "mark_no_show")}
                    >
                      <XCircle size={16} />
                      Kelmadi
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
