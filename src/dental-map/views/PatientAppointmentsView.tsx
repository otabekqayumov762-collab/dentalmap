import { CalendarDays, Clock, Loader2, Plus, RefreshCcw, Star, Stethoscope, XCircle } from "lucide-react";
import { useState } from "react";
import { appointmentStatusLabel } from "../api/dentalMapApi";
import { EmptyState } from "../components/common";
import { formatUzDate } from "../lib/date";
import type { ApiAppointment } from "../types";
import { Badge, Button, Card, Modal, TextareaField, cn } from "../ui";
import { CancelAppointmentSheet, cancellableStatuses, statusTone } from "./AppointmentDetailView";

export function PatientAppointmentsView({
  appointments,
  loading,
  error,
  reviewedAppointmentIds = [],
  onRefresh,
  onOpenDetail,
  onCancel,
  onSubmitReview,
  onBook
}: {
  appointments: ApiAppointment[];
  loading: boolean;
  error?: string;
  reviewedAppointmentIds?: string[];
  onRefresh?: () => void;
  onOpenDetail?: (appointment: ApiAppointment) => void;
  onCancel?: (appointment: ApiAppointment, reason: string) => void;
  onSubmitReview?: (appointment: ApiAppointment, rating: number, text: string) => Promise<string | void>;
  onBook?: () => void;
}) {
  const [cancelFor, setCancelFor] = useState<ApiAppointment | null>(null);
  const [reviewFor, setReviewFor] = useState<ApiAppointment | null>(null);
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [reviewError, setReviewError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [publicConsent, setPublicConsent] = useState(false);

  const reviewed = new Set(reviewedAppointmentIds);

  function openReview(appointment: ApiAppointment) {
    setReviewFor(appointment);
    setRating(5);
    setText("");
    setReviewError("");
    setPublicConsent(false);
  }

  async function submitReview() {
    if (!reviewFor || !onSubmitReview) {
      return;
    }
    if (!text.trim()) {
      setReviewError("Izoh yozing.");
      return;
    }
    if (!publicConsent) {
      setReviewError("Sharhni taxallus bilan ommaga chiqarishga rozilikni tasdiqlang.");
      return;
    }
    setSubmitting(true);
    const result = await onSubmitReview(reviewFor, rating, text.trim());
    setSubmitting(false);
    if (typeof result === "string" && result) {
      setReviewError(result);
      return;
    }
    setReviewFor(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-extrabold tracking-tight text-ink-900">Mening qabullarim</h1>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            aria-label="Yangilash"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-surface-200 bg-surface-0 text-ink-500 transition-colors hover:bg-surface-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 active:scale-95 disabled:opacity-60"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
          </button>
        )}
      </header>

      {error && (
        <div
          className="flex items-center gap-2 rounded-2xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger"
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
        <div className="flex flex-col gap-4">
          <EmptyState
            Icon={CalendarDays}
            title="Hozircha qabul yo'q"
            text="Shifokorni tanlab, birinchi qabulingizni bron qiling."
          />
          {onBook && (
            <Button type="button" size="lg" className="w-full" onClick={onBook}>
              <Plus size={18} />
              Qabulga yozilish
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {appointments.map((appointment) => {
            const canCancel = onCancel && cancellableStatuses.includes(appointment.status);
            const isReviewed = reviewed.has(appointment.id);
            const canReview = onSubmitReview && appointment.status === "completed" && !isReviewed;

            return (
              <Card
                key={appointment.id}
                as="article"
                interactive={Boolean(onOpenDetail)}
                className="flex flex-col gap-3"
                {...(onOpenDetail
                  ? {
                      role: "button",
                      tabIndex: 0,
                      onClick: () => onOpenDetail(appointment),
                      onKeyDown: (event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onOpenDetail(appointment);
                        }
                      }
                    }
                  : {})}
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
                  <Badge tone={statusTone(appointment.status)} className="shrink-0">
                    {appointmentStatusLabel(appointment.status)}
                  </Badge>
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

                {appointment.note && (
                  <div className="rounded-2xl bg-surface-50 px-3.5 py-2.5 text-sm text-ink-700">
                    <span className="mb-1 block text-xs font-semibold uppercase text-ink-400">Bemor holati</span>
                    <p className="leading-relaxed">{appointment.note}</p>
                  </div>
                )}

                {appointment.status === "doctor_rejected" && appointment.reject_reason && (
                  <div className="rounded-2xl bg-danger/10 px-3.5 py-2.5 text-sm text-danger">
                    <span className="mb-1 block text-xs font-semibold uppercase text-danger/70">Rad etish sababi</span>
                    <p className="leading-relaxed">{appointment.reject_reason}</p>
                  </div>
                )}

                {(canCancel || canReview || (appointment.status === "completed" && isReviewed)) && (
                  <div className="flex flex-wrap items-center gap-2 border-t border-surface-100 pt-3">
                    {canReview && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          openReview(appointment);
                        }}
                      >
                        <Star size={16} />
                        Shifokorni baholang
                      </Button>
                    )}
                    {appointment.status === "completed" && isReviewed && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
                        <Star size={14} className="fill-success text-success" />
                        Baholandi
                      </span>
                    )}
                    {canCancel && (
                      <Button
                        variant="danger"
                        size="sm"
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setCancelFor(appointment);
                        }}
                      >
                        <XCircle size={16} />
                        Bekor qilish
                      </Button>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={Boolean(reviewFor)} onClose={() => setReviewFor(null)} title="Shifokorni baholang">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-500">
            {reviewFor?.doctor_name || "Shifokor"} bilan qabulingiz qanday o&apos;tdi?
          </p>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink-700">Baho</span>
            <div className="flex gap-1.5" aria-label="Reyting tanlash">
              {Array.from({ length: 5 }, (_, index) => {
                const value = index + 1;
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={value <= rating}
                    onClick={() => {
                      setRating(value);
                      setReviewError("");
                    }}
                    className={cn(
                      "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 active:scale-90",
                      value <= rating ? "text-warning" : "text-surface-200 hover:text-ink-400"
                    )}
                  >
                    <Star size={30} className={cn(value <= rating && "fill-warning")} />
                  </button>
                );
              })}
            </div>
          </div>
          <TextareaField
            label="Izoh"
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              setReviewError("");
            }}
            placeholder="Shifokor haqida fikringiz"
          />
          <label className="flex items-start gap-3 rounded-2xl border border-surface-200 bg-surface-50 px-3.5 py-3 text-sm text-ink-600">
            <input
              type="checkbox"
              checked={publicConsent}
              onChange={(event) => {
                setPublicConsent(event.target.checked);
                setReviewError("");
              }}
              className="mt-0.5 h-4 w-4 shrink-0 accent-brand-500"
            />
            <span className="leading-relaxed">
              Tasdiqlansa, reyting va izohim ommaga ko&apos;rsatilishiga roziman. To&apos;liq F.I.O. o&apos;rniga
              moderatsiyalangan taxallus chiqadi.
            </span>
          </label>
          {reviewError && <small className="text-xs font-medium text-danger">{reviewError}</small>}
          <div className="flex gap-2">
            <Button variant="secondary" size="lg" type="button" className="flex-1" onClick={() => setReviewFor(null)}>
              Bekor qilish
            </Button>
            <Button
              size="lg"
              type="button"
              className="flex-1"
              disabled={submitting || !publicConsent}
              onClick={() => void submitReview()}
            >
              <Star size={17} />
              {submitting ? "Yuborilmoqda…" : "Yuborish"}
            </Button>
          </div>
        </div>
      </Modal>

      <CancelAppointmentSheet
        appointment={cancelFor}
        onClose={() => setCancelFor(null)}
        onConfirm={(appointment, reason) => onCancel?.(appointment, reason)}
      />
    </div>
  );
}
