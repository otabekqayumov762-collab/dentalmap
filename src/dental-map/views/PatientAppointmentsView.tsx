import { CalendarDays, Clock, Loader2, RefreshCcw, Stethoscope, XCircle } from "lucide-react";
import { appointmentStatusLabel } from "../api/dentalMapApi";
import { EmptyState } from "../components/common";
import type { ApiAppointment } from "../types";
import { Badge, Button, Card } from "../ui";

type AppointmentStatus = ApiAppointment["status"];
type Tone = "brand" | "success" | "warning" | "danger" | "neutral";

function statusTone(status: AppointmentStatus): Tone {
  if (status === "pending") {
    return "warning";
  }
  if (status === "doctor_confirmed") {
    return "brand";
  }
  if (status === "completed") {
    return "neutral";
  }
  if (status === "doctor_rejected" || status === "user_cancelled" || status === "no_show") {
    return "danger";
  }
  return "neutral";
}

const cancellableStatuses: AppointmentStatus[] = ["pending", "doctor_confirmed"];

export function PatientAppointmentsView({
  appointments,
  loading,
  error,
  onRefresh,
  onCancel
}: {
  appointments: ApiAppointment[];
  loading: boolean;
  error?: string;
  onRefresh?: () => void;
  onCancel?: (appointment: ApiAppointment) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-extrabold tracking-tight text-ink-900">Mening qabullarim</h1>
          <span className="mt-0.5 block text-sm text-ink-500">Sizning bron qilingan qabullaringiz.</span>
        </div>
        {onRefresh && (
          <Button
            variant="secondary"
            size="sm"
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="shrink-0"
            aria-label="Yangilash"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
            Yangilash
          </Button>
        )}
      </header>

      {error && (
        <div
          className="flex items-center gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-danger"
          role="alert"
        >
          <XCircle size={17} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading && appointments.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 py-10 text-center">
          <Loader2 size={22} className="animate-spin text-brand-500" />
          <span className="text-sm text-ink-500">Qabullar yuklanmoqda...</span>
        </Card>
      ) : appointments.length === 0 ? (
        <EmptyState
          Icon={CalendarDays}
          title="Hozircha qabul yo'q"
          text="Shifokorni tanlab, birinchi qabulingizni bron qiling."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {appointments.map((appointment) => {
            const canCancel = onCancel && cancellableStatuses.includes(appointment.status);

            return (
              <Card key={appointment.id} as="article" className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                      <Stethoscope size={20} />
                    </span>
                    <div className="min-w-0">
                      <strong className="block truncate font-semibold text-ink-900">
                        {appointment.doctor_name || "Shifokor"}
                      </strong>
                      <small className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-500">
                        <CalendarDays size={13} className="shrink-0" />
                        {appointment.appointment_date}
                        <Clock size={13} className="ml-1 shrink-0" />
                        {appointment.appointment_time.slice(0, 5)}
                      </small>
                    </div>
                  </div>
                  <Badge tone={statusTone(appointment.status)} className="shrink-0">
                    {appointmentStatusLabel(appointment.status)}
                  </Badge>
                </div>

                {appointment.note && (
                  <p className="rounded-2xl bg-surface-50 px-3.5 py-2.5 text-sm text-ink-700">{appointment.note}</p>
                )}

                {canCancel && (
                  <Button
                    variant="danger"
                    size="sm"
                    type="button"
                    onClick={() => onCancel(appointment)}
                    className="self-start"
                  >
                    <XCircle size={16} />
                    Bekor qilish
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
