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
import { toSafeTelHref } from "../../lib/phone";
import type { ApiAppointment } from "../../types";
import { Badge, Button, Card, Field, Chip } from "../../ui";
import { SectionHeader, appointmentStatusLabel, statusTone } from "./common";

type FilterKey = "all" | "pending" | "doctor_confirmed" | "completed";
export type DoctorAppointmentAction = "confirm" | "reject" | "complete" | "mark_no_show";

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

const REJECT_REASON_PLACEHOLDER = "Masalan: shu vaqtda boshqa qabul bor.";

function isoDate(offsetDays: number) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

export function createDemoAppointments(): ApiAppointment[] {
  return [
    {
      id: "demo-appointment-pending-1",
      doctor: "demo-doctor",
      full_name: "Madina Karimova",
      phone: "+998901234567",
      gender: "Ayol",
      age: 28,
      appointment_date: isoDate(1),
      appointment_time: "09:30:00",
      note: "Tish og'rig'i kuchaygan, konsultatsiya kerak.",
      status: "pending"
    },
    {
      id: "demo-appointment-pending-2",
      doctor: "demo-doctor",
      full_name: "Javohir Abdullayev",
      phone: "+998933334455",
      gender: "Erkak",
      age: 34,
      appointment_date: isoDate(1),
      appointment_time: "11:00:00",
      note: "Implant bo'yicha ko'rikdan o'tmoqchi.",
      status: "pending"
    },
    {
      id: "demo-appointment-confirmed-1",
      doctor: "demo-doctor",
      full_name: "Dilshod Rahmonov",
      phone: "+998977778899",
      gender: "Erkak",
      age: 41,
      appointment_date: isoDate(2),
      appointment_time: "15:30:00",
      note: "Plomba almashtirish uchun keladi.",
      status: "doctor_confirmed"
    },
    {
      id: "demo-appointment-completed-1",
      doctor: "demo-doctor",
      full_name: "Sevara To'xtayeva",
      phone: "+998945556677",
      gender: "Ayol",
      age: 25,
      appointment_date: isoDate(-1),
      appointment_time: "10:00:00",
      note: "Profilaktik tekshiruv yakunlangan.",
      status: "completed"
    }
  ];
}

export function DoctorAppointmentRequests({
  appointments = [],
  loading = false,
  onAppointmentAction
}: {
  appointments: ApiAppointment[];
  loading?: boolean;
  onAppointmentAction: (a: ApiAppointment, action: DoctorAppointmentAction, reason?: string) => Promise<void> | void;
}) {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [reasons, setReasons] = useState<Record<string, string>>({});
  // Appointment id with an action currently in flight — disables that card's
  // buttons so a double-tap can't fire duplicate confirm/reject POSTs (the
  // second one 400s and overwrote the success with an error banner).
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const filtered = filter === "all" ? appointments : appointments.filter((item) => item.status === filter);
  const empty = EMPTY[filter];

  function runAction(appointment: ApiAppointment, action: DoctorAppointmentAction, reason?: string) {
    if (action === "reject" && !reason?.trim()) {
      return;
    }
    if (pendingActionId) {
      return;
    }
    setPendingActionId(appointment.id);
    void Promise.resolve(onAppointmentAction(appointment, action, reason?.trim())).finally(() => {
      setPendingActionId(null);
    });
  }

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
          return (
            <Chip key={item.key} active={active} onClick={() => setFilter(item.key)} className="shrink-0">
              {item.label}
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
            const rejectReasonValid = reason.trim().length >= 3;
            const actionPending = pendingActionId === appointment.id;
            const phoneHref = toSafeTelHref(appointment.phone);

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
                  {phoneHref && (
                    <a
                      href={phoneHref}
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
                      label="Rad etish sababi *"
                      value={reason}
                      onChange={(event) =>
                        setReasons((prev) => ({ ...prev, [appointment.id]: event.target.value }))
                      }
                      placeholder={REJECT_REASON_PLACEHOLDER}
                      required
                      minLength={3}
                      error={reason.length > 0 && !rejectReasonValid}
                    />
                    <div className="flex flex-wrap gap-2.5">
                      <Button
                        type="button"
                        size="sm"
                        className="min-w-32 flex-1"
                        disabled={actionPending}
                        onClick={() => runAction(appointment, "confirm")}
                      >
                        {actionPending ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                        Tasdiqlash
                      </Button>
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        className="min-w-32 flex-1"
                        disabled={!rejectReasonValid || actionPending}
                        onClick={() => runAction(appointment, "reject", reason)}
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
                      disabled={actionPending}
                      onClick={() => runAction(appointment, "complete")}
                    >
                      {actionPending ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                      Yakunlandi
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      className="min-w-32 flex-1"
                      disabled={actionPending}
                      onClick={() => runAction(appointment, "mark_no_show")}
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
