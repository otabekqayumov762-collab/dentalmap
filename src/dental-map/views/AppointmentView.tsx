import { AlertCircle, CalendarDays, CheckCircle2, Clock, Home, Loader2, MapPin, RotateCw } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { fetchDoctorDaySlots, isOfflineMode } from "../api/dentalMapApi";
import { DoctorAvatar, SectionTitle } from "../components/common";
import { upcomingDays, type DaySlots } from "../lib/schedule";
import { isSafeMapUrl, openExternal } from "../lib/url";
import type { Doctor } from "../types";
import { Button, Card, TextareaField, cn, useToast } from "../ui";

const draftKey = "dentalmap_appointment_draft";
const defaultNote = "";

function readSaved<T>(key: string): Partial<T> {
  try {
    const raw = window.sessionStorage.getItem(key);
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Partial<T>) : {};
  } catch {
    return {};
  }
}

export function AppointmentView({
  doctor,
  selectedSlot,
  onSelectSlot,
  onSubmit,
  sent,
  submitting,
  submitError,
  onDismissError,
  onBackToMenu
}: {
  doctor: Doctor;
  selectedSlot: string;
  onSelectSlot: (slot: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  sent: boolean;
  submitting: boolean;
  submitError?: string | null;
  onDismissError?: () => void;
  onBackToMenu: () => void;
}) {
  const { toast } = useToast();
  const [note, setNote] = useState(defaultNote);
  const [sharePhoneConsent, setSharePhoneConsent] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Backend: real bookable slots from the doctor's schedule. Offline: synthesized.
  // Online slots go through an explicit loading/ready/error machine so we never
  // render fake DEFAULT_SLOTS during the fetch and never silently blank an error.
  const offline = isOfflineMode();
  const [remoteDays, setRemoteDays] = useState<DaySlots[]>([]);
  const [slotsStatus, setSlotsStatus] = useState<"loading" | "ready" | "error">(offline ? "ready" : "loading");
  const [retryNonce, setRetryNonce] = useState(0);
  useEffect(() => {
    if (offline) {
      setSlotsStatus("ready");
      return;
    }
    let cancelled = false;
    setSlotsStatus("loading");
    fetchDoctorDaySlots(doctor.id)
      .then((result) => {
        if (!cancelled) {
          setRemoteDays(result);
          setSlotsStatus("ready");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSlotsStatus("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [doctor.id, offline, retryNonce]);

  // In online mode ONLY real backend slots drive the UI (never DEFAULT_SLOTS).
  const days = useMemo(
    () => (offline ? upcomingDays(doctor.slots) : remoteDays),
    [offline, remoteDays, doctor.slots]
  );
  const [selectedDate, setSelectedDate] = useState("");
  const currentDay = useMemo(
    () => days.find((day) => day.iso === selectedDate) ?? days[0],
    [days, selectedDate]
  );
  const daySlots = useMemo(() => currentDay?.slots ?? [], [currentDay]);

  useEffect(() => {
    const saved = readSaved<{ note: string }>(draftKey);
    setNote(saved.note || "");
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || sent) {
      return;
    }
    try {
      window.sessionStorage.setItem(draftKey, JSON.stringify({ note }));
    } catch {
      // Local draft is optional and can fail in private embedded browsers.
    }
  }, [note, hydrated, sent]);

  // Keep a valid day selected, and drop a stale time when the day has no such slot.
  useEffect(() => {
    if (days.length && !days.some((day) => day.iso === selectedDate)) {
      setSelectedDate(days[0].iso);
    }
  }, [days, selectedDate]);

  useEffect(() => {
    if (selectedSlot && !daySlots.includes(selectedSlot)) {
      onSelectSlot("");
    }
  }, [daySlots, selectedSlot, onSelectSlot]);

  // A booking rejection (slot just taken / 2-hour rule) means the grid is stale:
  // refetch availability and drop the failed slot so the user picks from fresh
  // data instead of re-submitting the same taken slot into the same error.
  useEffect(() => {
    if (!submitError) {
      return;
    }
    onSelectSlot("");
    if (!offline) {
      setRetryNonce((nonce) => nonce + 1);
    }
  }, [submitError, offline, onSelectSlot]);

  // Success: clear the persisted note draft so the previous complaint never
  // pre-fills the NEXT booking (possibly for a different doctor/problem).
  useEffect(() => {
    if (!sent) {
      return;
    }
    setNote("");
    try {
      window.sessionStorage.removeItem(draftKey);
    } catch {
      // storage may be unavailable
    }
  }, [sent]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedDate) {
      toast.error("Qabul kunini tanlang.");
      return;
    }
    if (!selectedSlot || !daySlots.includes(selectedSlot)) {
      toast.error("Qabul vaqtini tanlang.");
      return;
    }
    if (note.trim().length < 3) {
      toast.error("Bemor holatini qisqa yozing.");
      return;
    }
    if (!sharePhoneConsent) {
      toast.error("Telefon raqamingiz shifokorga yuborilishiga rozilik bering.");
      return;
    }
    onSubmit(event);
  }

  const selectedDayLabel = currentDay ? `${currentDay.weekdayLabel}, ${currentDay.dayNum}` : selectedDate;

  if (sent) {
    return (
      <div className="flex min-h-[72vh] flex-col items-center justify-center px-2 text-center">
        <span className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-brand-50 text-brand-500 shadow-card">
          <CheckCircle2 size={40} />
        </span>
        <strong className="text-xl font-bold text-ink-900">So&apos;rov yuborildi</strong>
        <Card className="mt-6 flex w-full max-w-xs flex-col items-center gap-1">
          <span className="text-sm font-medium text-ink-700">{doctor.name}</span>
          <b className="flex items-center gap-2 text-base font-bold text-ink-900">
            <CalendarDays size={16} className="text-brand-500" />
            {selectedDayLabel}
            <em className="not-italic font-semibold text-brand-600">{selectedSlot}</em>
          </b>
        </Card>
        {/* Guaranteed in-app clinic location: the patient gets the address here
            even if the Telegram bot can't message them. */}
        <Card className="mt-3 flex w-full max-w-xs flex-col gap-2 text-left">
          <span className="flex items-center gap-2 text-sm font-bold text-ink-900">
            <MapPin size={16} className="shrink-0 text-brand-500" />
            Klinika manzili
          </span>
          <span className="text-sm font-medium text-ink-700">{doctor.clinic}</span>
          <small className="text-xs leading-relaxed text-ink-500">
            {[doctor.address, doctor.district].filter(Boolean).join(", ") || doctor.district}
          </small>
          {isSafeMapUrl(doctor.locationUrl) && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="mt-1 w-full"
              onClick={() => openExternal(doctor.locationUrl)}
            >
              <MapPin size={16} />
              Lokatsiyani ochish
            </Button>
          )}
        </Card>
        <Button type="button" size="lg" className="mt-6 w-full max-w-xs" onClick={onBackToMenu}>
          <Home size={18} />
          Asosiy menuga qaytish
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card as="article" className="flex items-center gap-3">
        <DoctorAvatar doctor={doctor} size="md" />
        <div className="min-w-0">
          <strong className="block truncate text-ink-900">{doctor.name}</strong>
          <span className="block text-sm text-ink-500">{doctor.specialty}</span>
          <small className="block truncate text-xs text-ink-400">
            {doctor.clinic}, {doctor.district}
          </small>
        </div>
      </Card>

      <SectionTitle title="Qabul kunini tanlang" />
      {slotsStatus === "loading" ? (
        <Card className="flex items-center gap-3 text-ink-500">
          <Loader2 size={18} className="shrink-0 animate-spin text-brand-500" />
          <span>
            <strong className="block text-sm text-ink-700">Bo&apos;sh vaqtlar yuklanmoqda</strong>
            <small className="block text-xs text-ink-400">Shifokorning jadvali tekshirilmoqda…</small>
          </span>
        </Card>
      ) : slotsStatus === "error" ? (
        <Card className="flex flex-col gap-3">
          <div className="flex items-center gap-3 text-danger">
            <AlertCircle size={18} className="shrink-0" />
            <span>
              <strong className="block text-sm">Bo&apos;sh vaqtlarni yuklab bo&apos;lmadi</strong>
              <small className="block text-xs text-danger/80">Internet aloqasini tekshirib, qayta urinib ko&apos;ring.</small>
            </span>
          </div>
          <button
            type="button"
            onClick={() => setRetryNonce((nonce) => nonce + 1)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-pill border border-surface-200 bg-surface-0 px-4 text-sm font-bold text-brand-600 transition-colors hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 active:scale-[0.98]"
          >
            <RotateCw size={16} />
            Qayta urinish
          </button>
        </Card>
      ) : days.length > 0 ? (
        <>
          <div className="-mx-1 flex gap-2 overflow-x-auto no-scrollbar px-1 pb-1">
            {days.map((day) => {
              const active = selectedDate === day.iso;
              return (
                <button
                  key={day.iso}
                  type="button"
                  onClick={() => {
                    setSelectedDate(day.iso);
                    onDismissError?.();
                  }}
                  className={
                    "flex min-w-[3.6rem] shrink-0 flex-col items-center gap-0.5 rounded-2xl border px-3 py-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 active:scale-[0.97] " +
                    (active
                      ? "border-brand-500 bg-brand-500 text-white shadow-card"
                      : "border-surface-200 bg-surface-0 text-ink-700 hover:border-brand-300")
                  }
                >
                  <span className={"text-[0.7rem] font-medium " + (active ? "text-white/80" : "text-ink-400")}>
                    {day.weekdayLabel}
                  </span>
                  <strong className="text-lg font-bold tabular-nums leading-none">{day.dayNum}</strong>
                </button>
              );
            })}
          </div>

          <div className="rounded-card border border-surface-200 bg-surface-0 p-3 shadow-card">
            <div className="mb-3 flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                <Clock size={20} />
              </span>
              <span className="min-w-0 flex-1">
                <strong className="block text-sm font-extrabold text-ink-900">Bo&apos;sh vaqtlar</strong>
                <small className="block truncate text-xs font-medium text-ink-500">{selectedDayLabel}</small>
              </span>
              <span className="rounded-pill bg-surface-100 px-3 py-1 text-xs font-bold text-ink-600">
                {daySlots.length} ta
              </span>
            </div>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(82px,1fr))] gap-2">
              {daySlots.map((slot) => {
                const active = selectedSlot === slot;
                return (
                  <button
                    key={slot}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      onSelectSlot(slot);
                      onDismissError?.();
                    }}
                    className={cn(
                      "relative flex h-12 items-center justify-center rounded-2xl border text-base font-extrabold tabular-nums transition",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 active:scale-[0.97]",
                      active
                        ? "border-brand-500 bg-brand-500 text-white shadow-card"
                        : "border-surface-200 bg-surface-50 text-ink-700 hover:border-brand-300 hover:bg-brand-50"
                    )}
                  >
                    {active && (
                      <span className="absolute left-3 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-white/85" />
                    )}
                    {slot}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        <Card className="flex items-center gap-3 text-ink-500">
          <Clock size={18} className="shrink-0 text-ink-400" />
          <span>
            <strong className="block text-sm text-ink-700">Bo&apos;sh vaqt yo&apos;q</strong>
            <small className="block text-xs text-ink-400">Shifokor hozircha bo&apos;sh vaqt kiritmagan.</small>
          </span>
        </Card>
      )}

      <form id="appointment-form" className="mt-1 flex flex-col gap-4" noValidate onSubmit={handleSubmit}>
        <input type="hidden" name="appointmentDate" value={selectedDate} />
        <TextareaField
          label="Bemor holati"
          name="note"
          value={note}
          required
          maxLength={1000}
          placeholder="Masalan: tish og'riyapti, milk shishgan yoki tekshiruv kerak"
          onChange={(event) => {
            setNote(event.target.value);
          }}
        />

        <label className="flex items-start gap-3 rounded-2xl border border-surface-200 bg-surface-50 px-3.5 py-3 text-sm text-ink-700">
          <input
            type="checkbox"
            name="sharePhoneConsent"
            checked={sharePhoneConsent}
            onChange={(event) => setSharePhoneConsent(event.target.checked)}
            className="mt-0.5 size-5 shrink-0 rounded border-surface-300 text-brand-500 focus:ring-brand-400"
          />
          <span className="leading-relaxed">
            Telefon raqamim tanlangan shifokorga qabulni tasdiqlash va bog&apos;lanish uchun yuborilishiga roziman.
          </span>
        </label>

        {submitError && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3.5 text-danger"
          >
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <span className="min-w-0 flex-1 text-sm font-semibold leading-snug">{submitError}</span>
          </div>
        )}

        <Button type="submit" size="lg" disabled={sent || submitting || slotsStatus !== "ready" || days.length === 0}>
          <CheckCircle2 size={18} />
          {submitting ? "Yuborilmoqda…" : "Qabulga yozilish"}
        </Button>
      </form>
    </div>
  );
}
