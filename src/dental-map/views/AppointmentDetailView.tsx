import { ArrowLeft, Building2, CalendarDays, Clock, MapPin, Stethoscope, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { appointmentStatusLabel } from "../api/dentalMapApi";
import { DoctorAvatar } from "../components/common";
import { formatUzDate } from "../lib/date";
import { isSafeMapUrl, openExternal } from "../lib/url";
import type { ApiAppointment, Doctor } from "../types";
import { Badge, Button, Card, Sheet, TextareaField } from "../ui";

type AppointmentStatus = ApiAppointment["status"];
type Tone = "brand" | "success" | "warning" | "danger" | "neutral";

/** Status → Badge tone, shared by the list and detail views so the two never drift. */
export function statusTone(status: AppointmentStatus): Tone {
  if (status === "pending") {
    return "warning";
  }
  if (status === "doctor_confirmed") {
    return "brand";
  }
  if (status === "completed") {
    return "success";
  }
  if (status === "doctor_rejected" || status === "user_cancelled" || status === "no_show") {
    return "danger";
  }
  return "neutral";
}

/** Statuses the patient may still cancel. Shared source of truth for both views. */
export const cancellableStatuses: AppointmentStatus[] = ["pending", "doctor_confirmed"];

/**
 * Bottom sheet asking why the patient is cancelling. Reused by both the list card
 * and the detail view so the cancel flow is identical everywhere. The reason is
 * optional — cancelling is never blocked — but it is forwarded to the doctor.
 */
export function CancelAppointmentSheet({
  appointment,
  onClose,
  onConfirm
}: {
  appointment: ApiAppointment | null;
  onClose: () => void;
  onConfirm: (appointment: ApiAppointment, reason: string) => void;
}) {
  const [reason, setReason] = useState("");

  // Reset the field every time a fresh cancellation is opened.
  useEffect(() => {
    if (appointment) {
      setReason("");
    }
  }, [appointment]);

  return (
    <Sheet open={Boolean(appointment)} onClose={onClose} title="Nega bekor qilyapsiz?">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-ink-500">
          Qabulni bekor qilish sababini yozing — shifokorga xabar beriladi.
        </p>
        <TextareaField
          label="Sabab"
          value={reason}
          maxLength={500}
          placeholder="Masalan: rejam o'zgardi, boshqa vaqtga yozilaman"
          onChange={(event) => setReason(event.target.value)}
        />
        <div className="flex gap-2">
          <Button variant="secondary" size="lg" type="button" className="flex-1" onClick={onClose}>
            Yopish
          </Button>
          <Button
            variant="danger"
            size="lg"
            type="button"
            className="flex-1"
            onClick={() => {
              if (!appointment) {
                return;
              }
              onConfirm(appointment, reason.trim());
              onClose();
            }}
          >
            <XCircle size={17} />
            Bekor qilish
          </Button>
        </div>
      </div>
    </Sheet>
  );
}

/**
 * Full appointment detail: the doctor presented as a profile (large avatar, name,
 * specialty, clinic + district), the date/time, the patient note, the status
 * badge, the clinic location, and — when still cancellable — a cancel action that
 * opens the shared reason sheet. The doctor is resolved from the loaded catalog by
 * the caller; when it is missing the view degrades gracefully to the stored
 * `doctor_name` and hides the photo/location.
 */
export function AppointmentDetailView({
  appointment,
  doctor,
  onBack,
  onCancel
}: {
  appointment: ApiAppointment;
  doctor?: Doctor;
  onBack: () => void;
  onCancel?: (appointment: ApiAppointment, reason: string) => void;
}) {
  const [cancelFor, setCancelFor] = useState<ApiAppointment | null>(null);

  const canCancel = Boolean(onCancel) && cancellableStatuses.includes(appointment.status);
  const name = doctor?.name || appointment.doctor_name || "Shifokor";
  const specialty = doctor?.specialty || "Shifokor";
  const clinic = doctor?.clinic;
  const district = doctor?.district;
  const address = doctor?.address;
  const locationUrl = doctor?.locationUrl;
  const clinicLine = [clinic, district].filter(Boolean).join(", ");
  const addressLine = [address, district].filter(Boolean).join(", ");

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={onBack}
        className="my-3 inline-flex h-9 w-fit items-center gap-1.5 rounded-pill border border-surface-200 bg-surface-0 px-3.5 text-[13px] font-bold text-accent-700 shadow-card"
      >
        <ArrowLeft size={17} />
        <span>Ortga</span>
      </button>

      <Card as="section" className="flex flex-col items-center gap-3 text-center">
        {doctor ? (
          <DoctorAvatar doctor={doctor} size="lg" />
        ) : (
          <span className="inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
            <Stethoscope size={34} />
          </span>
        )}
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-ink-900">{name}</h1>
          <p className="text-sm text-ink-500">{specialty}</p>
          {clinicLine && (
            <p className="mt-1.5 flex items-center justify-center gap-1.5 text-sm font-medium text-ink-700">
              <Building2 size={15} className="shrink-0 text-brand-500" />
              {clinicLine}
            </p>
          )}
        </div>
        <Badge tone={statusTone(appointment.status)}>{appointmentStatusLabel(appointment.status)}</Badge>
      </Card>

      <Card as="section" className="flex items-center gap-3">
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-800">
          <CalendarDays size={16} className="shrink-0 text-brand-500" />
          {formatUzDate(appointment.appointment_date)}
        </span>
        <span className="h-4 w-px shrink-0 bg-surface-200" />
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-800">
          <Clock size={16} className="shrink-0 text-brand-500" />
          {appointment.appointment_time.slice(0, 5)}
        </span>
      </Card>

      {appointment.note && (
        <Card as="section" className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase text-ink-400">Bemor holati</span>
          <p className="text-sm leading-relaxed text-ink-700">{appointment.note}</p>
        </Card>
      )}

      {appointment.status === "doctor_rejected" && appointment.reject_reason && (
        <Card as="section" className="flex flex-col gap-1 border-danger/20 bg-danger/5">
          <span className="text-xs font-semibold uppercase text-danger/70">Rad etish sababi</span>
          <p className="text-sm leading-relaxed text-danger">{appointment.reject_reason}</p>
        </Card>
      )}

      {(clinic || isSafeMapUrl(locationUrl)) && (
        <Card as="section" className="flex flex-col gap-2">
          <span className="flex items-center gap-2 text-sm font-bold text-ink-900">
            <MapPin size={16} className="shrink-0 text-brand-500" />
            Klinika manzili
          </span>
          {clinic && <span className="text-sm font-medium text-ink-700">{clinic}</span>}
          {addressLine && <small className="text-xs leading-relaxed text-ink-500">{addressLine}</small>}
          {isSafeMapUrl(locationUrl) && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="mt-1 w-full"
              onClick={() => openExternal(locationUrl)}
            >
              <MapPin size={16} />
              Xaritada ochish
            </Button>
          )}
        </Card>
      )}

      {canCancel && (
        <Button variant="danger" size="lg" type="button" onClick={() => setCancelFor(appointment)}>
          <XCircle size={18} />
          Bekor qilish
        </Button>
      )}

      <CancelAppointmentSheet
        appointment={cancelFor}
        onClose={() => setCancelFor(null)}
        onConfirm={(item, reason) => onCancel?.(item, reason)}
      />
    </div>
  );
}
