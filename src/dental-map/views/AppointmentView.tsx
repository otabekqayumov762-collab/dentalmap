import { AlertCircle, CalendarDays, CheckCircle2, Clock } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { fetchDoctorDaySlots, isOfflineMode } from "../api/dentalMapApi";
import { genderOptions } from "../catalog";
import { DoctorAvatar, SectionTitle } from "../components/common";
import { upcomingDays, type DaySlots } from "../lib/schedule";
import type { Doctor } from "../types";
import { Button, Card, Chip, Field, PhoneField } from "../ui";

type AppointmentDraft = {
  fullName: string;
  phone: string;
  age: string;
  gender: string;
};

const draftKey = "dentalmap_appointment_draft";
const profileKey = "dental-map-user-profile";
const defaultDraft: AppointmentDraft = { fullName: "", phone: "", age: "", gender: "" };

function readSaved<T>(key: string): Partial<T> {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Partial<T>) : {};
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
  submitError
}: {
  doctor: Doctor;
  selectedSlot: string;
  onSelectSlot: (slot: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  sent: boolean;
  submitting: boolean;
  submitError: string;
}) {
  const [draft, setDraft] = useState<AppointmentDraft>(defaultDraft);
  const [hydrated, setHydrated] = useState(false);
  const [formError, setFormError] = useState("");

  // Backend: real bookable slots from the doctor's schedule. Offline: synthesized.
  const [remoteDays, setRemoteDays] = useState<DaySlots[] | null>(null);
  useEffect(() => {
    if (isOfflineMode()) {
      setRemoteDays(null);
      return;
    }
    let cancelled = false;
    void fetchDoctorDaySlots(doctor.id).then((result) => {
      if (!cancelled) {
        setRemoteDays(result);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [doctor.id]);

  const days = useMemo(() => remoteDays ?? upcomingDays(doctor.slots), [remoteDays, doctor.slots]);
  const [selectedDate, setSelectedDate] = useState("");
  const currentDay = useMemo(
    () => days.find((day) => day.iso === selectedDate) ?? days[0],
    [days, selectedDate]
  );
  const daySlots = useMemo(() => currentDay?.slots ?? [], [currentDay]);

  useEffect(() => {
    // Prefill from the saved profile first (so the user's details auto-appear),
    // then fall back to any half-finished appointment draft.
    const profile = readSaved<{ name: string; phone: string }>(profileKey);
    const saved = readSaved<AppointmentDraft>(draftKey);
    setDraft({
      fullName: profile.name || saved.fullName || "",
      phone: profile.phone || saved.phone || "",
      age: saved.age || "",
      gender: saved.gender || ""
    });
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || sent) {
      return;
    }
    try {
      window.localStorage.setItem(draftKey, JSON.stringify(draft));
    } catch {
      // Local draft is optional and can fail in private embedded browsers.
    }
  }, [draft, hydrated, sent]);

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

  function updateDraft<Key extends keyof AppointmentDraft>(key: Key, value: AppointmentDraft[Key]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setFormError("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.fullName.trim()) {
      setFormError("Ism familiyani kiriting.");
      return;
    }
    if (!draft.phone.trim()) {
      setFormError("Telefon raqamni kiriting.");
      return;
    }
    if (!draft.gender) {
      setFormError("Jinsni tanlang.");
      return;
    }
    if (!draft.age.trim()) {
      setFormError("Yoshni kiriting.");
      return;
    }
    if (!selectedDate) {
      setFormError("Qabul kunini tanlang.");
      return;
    }
    if (!selectedSlot || !daySlots.includes(selectedSlot)) {
      setFormError("Qabul vaqtini tanlang.");
      return;
    }
    setFormError("");
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
        <p className="mt-2 max-w-xs text-sm leading-relaxed text-ink-500">
          Shifokor tasdiqlagandan keyin xabar yuboriladi.
        </p>
        <Card className="mt-6 flex w-full max-w-xs flex-col items-center gap-1">
          <span className="text-sm font-medium text-ink-700">{doctor.name}</span>
          <b className="flex items-center gap-2 text-base font-bold text-ink-900">
            <CalendarDays size={16} className="text-brand-500" />
            {selectedDayLabel}
            <em className="not-italic font-semibold text-brand-600">{selectedSlot}</em>
          </b>
        </Card>
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
      {days.length > 0 ? (
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
                    setFormError("");
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

          <span className="mt-1 flex items-center gap-2 text-sm font-medium text-ink-700">
            <Clock size={16} className="text-brand-500" />
            Bo&apos;sh vaqtlar
          </span>
          <div className="flex flex-wrap gap-2">
            {daySlots.map((slot) => (
              <Chip
                key={slot}
                active={selectedSlot === slot}
                onClick={() => {
                  onSelectSlot(slot);
                  setFormError("");
                }}
              >
                {slot}
              </Chip>
            ))}
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
        <Field
          label="F.I.O."
          name="fullName"
          autoComplete="name"
          value={draft.fullName}
          placeholder="Ism familiya"
          onChange={(event) => updateDraft("fullName", event.target.value)}
        />
        <PhoneField
          label="Telefon raqam"
          name="phone"
          value={draft.phone}
          onValueChange={(value) => updateDraft("phone", value)}
        />
        <div className="grid grid-cols-2 gap-3">
          <div className="min-w-0">
            <span className="mb-1.5 block text-sm font-medium text-ink-700">Jinsi</span>
            <input type="hidden" name="gender" value={draft.gender} />
            <div className="flex flex-wrap gap-2">
              {genderOptions.map((option) => (
                <Chip key={option} active={draft.gender === option} onClick={() => updateDraft("gender", option)}>
                  {option}
                </Chip>
              ))}
            </div>
          </div>
          <Field
            label="Yoshi"
            name="age"
            type="number"
            inputMode="numeric"
            min="1"
            max="100"
            value={draft.age}
            placeholder="26"
            onChange={(event) => updateDraft("age", event.target.value.replace(/\D/g, "").slice(0, 3))}
          />
        </div>

        {formError && (
          <div className="flex items-center gap-2 rounded-2xl bg-danger/10 px-3 py-2.5 text-sm font-medium text-danger" role="alert">
            <AlertCircle size={17} className="shrink-0" />
            <span>{formError}</span>
          </div>
        )}
        {submitError && (
          <div className="flex items-center gap-2 rounded-2xl bg-danger/10 px-3 py-2.5 text-sm font-medium text-danger" role="alert">
            <AlertCircle size={17} className="shrink-0" />
            <span>{submitError}</span>
          </div>
        )}
        <Button type="submit" size="lg" disabled={sent || submitting || days.length === 0}>
          <CheckCircle2 size={18} />
          {submitting ? "Yuborilmoqda…" : "Qabulga yozilish"}
        </Button>
      </form>
    </div>
  );
}
