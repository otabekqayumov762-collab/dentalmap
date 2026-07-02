import { CalendarCheck2, CalendarDays, CheckCircle2, Clock, Phone, UserRound, XCircle } from "lucide-react";
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

const DEFAULT_REJECT_REASON = "Doktor tomonidan rad etildi.";

export function DoctorAppointmentRequests({
  appointments,
  onAppointmentAction
}: {
  appointments: ApiAppointment[];
  onAppointmentAction: (a: ApiAppointment, action: Action, reason?: string) => Promise<void> | void;
}) {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [reasons, setReasons] = useState<Record<string, string>>({});

  const countFor = (key: FilterKey) =>
    key === "all" ? appointments.length : appointments.filter((item) => item.status === key).length;

  const filtered = filter === "all" ? appointments : appointments.filter((item) => item.status === filter);

  return (
    <section className="flex flex-col gap-4">
      <SectionHeader
        Icon={CalendarCheck2}
        title="Qabul so'rovlari"
        subtitle="Bemorlarning qabul so'rovlarini boshqaring"
      />

      <div className="-mx-1 flex gap-2 overflow-x-auto no-scrollbar px-1 pb-1" role="list">
        {FILTERS.map((item) => (
          <Chip
            key={item.key}
            active={filter === item.key}
            onClick={() => setFilter(item.key)}
            className="shrink-0"
          >
            {item.label}
            <span
              className={cn(
                "inline-flex min-w-5 items-center justify-center rounded-pill px-1.5 text-xs font-bold",
                filter === item.key ? "bg-white/25 text-white" : "bg-surface-100 text-ink-500"
              )}
            >
              {countFor(item.key)}
            </span>
          </Chip>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState Icon={CalendarDays} title="Hozircha qabul so'rovlari yo'q" text="Yangi so'rovlar shu yerda ko'rinadi." />
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((appointment) => {
            const isPending = appointment.status === "pending";
            const isConfirmed = appointment.status === "doctor_confirmed";
            const reason = reasons[appointment.id] ?? "";

            return (
              <Card key={appointment.id} as="article" className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                      <UserRound size={20} />
                    </span>
                    <div className="min-w-0">
                      <strong className="block truncate font-semibold text-ink-900">{appointment.full_name}</strong>
                      {(appointment.age || appointment.gender) && (
                        <small className="text-xs text-ink-400">
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

                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl bg-surface-50 px-3.5 py-2.5 text-sm font-medium text-ink-700">
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                    <CalendarDays size={15} className="shrink-0 text-brand-500" />
                    {formatUzDate(appointment.appointment_date)}
                  </span>
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                    <Clock size={15} className="shrink-0 text-brand-500" />
                    {appointment.appointment_time.slice(0, 5)}
                  </span>
                  <a
                    href={`tel:${appointment.phone}`}
                    className="inline-flex items-center gap-1.5 whitespace-nowrap text-brand-600 transition-colors hover:text-brand-700"
                  >
                    <Phone size={15} className="shrink-0" />
                    {appointment.phone}
                  </a>
                </div>

                {appointment.note && (
                  <p className="rounded-2xl bg-surface-50 px-3.5 py-2.5 text-sm text-ink-700">{appointment.note}</p>
                )}

                {appointment.status === "doctor_rejected" && appointment.reject_reason && (
                  <p className="flex items-start gap-2 rounded-2xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-600">
                    <XCircle size={16} className="mt-0.5 shrink-0" />
                    <span>{appointment.reject_reason}</span>
                  </p>
                )}

                {isPending && (
                  <div className="flex flex-col gap-3 border-t border-surface-100 pt-3">
                    <Field
                      label="Rad etish sababi"
                      value={reason}
                      onChange={(event) =>
                        setReasons((prev) => ({ ...prev, [appointment.id]: event.target.value }))
                      }
                      placeholder={DEFAULT_REJECT_REASON}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        className="flex-1"
                        onClick={() => void onAppointmentAction(appointment, "confirm")}
                      >
                        <CheckCircle2 size={16} />
                        Tasdiqlash
                      </Button>
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        className="flex-1"
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
                  <div className="flex flex-wrap gap-2 border-t border-surface-100 pt-3">
                    <Button
                      type="button"
                      size="sm"
                      className="flex-1"
                      onClick={() => void onAppointmentAction(appointment, "complete")}
                    >
                      <CheckCircle2 size={16} />
                      Yakunlandi
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      className="flex-1"
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
