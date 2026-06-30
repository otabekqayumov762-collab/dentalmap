import { AlertCircle, CalendarDays, CheckCircle2, Clock, Minus, Plus } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { genderOptions, slots } from "../catalog";
import { DoctorAvatar, SectionTitle } from "../components/common";
import type { Doctor } from "../types";
import { Button, Card, Chip, Field, IconButton, TextareaField } from "../ui";

type DateParts = {
  day: string;
  month: string;
  year: string;
};

type AppointmentDraft = {
  fullName: string;
  phone: string;
  age: string;
  note: string;
  gender: string;
  dateParts: DateParts;
};

const draftKey = "dentalmap_appointment_draft";

function defaultDateParts(): DateParts {
  const today = new Date();
  return {
    day: String(today.getDate()).padStart(2, "0"),
    month: String(today.getMonth() + 1).padStart(2, "0"),
    year: String(today.getFullYear())
  };
}

function createDefaultDraft(): AppointmentDraft {
  return {
    fullName: "",
    phone: "",
    age: "",
    note: "",
    gender: "",
    dateParts: defaultDateParts()
  };
}

const defaultDraft = createDefaultDraft();

function buildDateValue(parts: DateParts) {
  if (parts.day.length < 1 || parts.month.length < 1 || parts.year.length !== 4) {
    return "";
  }

  const day = Number(parts.day);
  const month = Number(parts.month);
  const year = Number(parts.year);
  const date = new Date(year, month - 1, day);

  if (
    !day ||
    !month ||
    !year ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return "";
  }

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

const datePartLabels: Record<keyof DateParts, string> = {
  day: "Kun",
  month: "Oy",
  year: "Yil"
};

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
  const appointmentDate = buildDateValue(draft.dateParts);

  useEffect(() => {
    try {
      const rawDraft = window.localStorage.getItem(draftKey);
      if (rawDraft) {
        const parsedDraft = JSON.parse(rawDraft) as Partial<AppointmentDraft>;
        setDraft({
          ...defaultDraft,
          ...parsedDraft,
          dateParts: {
            ...defaultDraft.dateParts,
            ...(parsedDraft.dateParts ?? {})
          }
        });
      }
    } catch {
      setDraft(defaultDraft);
    } finally {
      setHydrated(true);
    }
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

  function updateDraft<Key extends keyof AppointmentDraft>(key: Key, value: AppointmentDraft[Key]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setFormError("");
  }

  function updateDatePart(part: keyof DateParts, delta: number) {
    setDraft((current) => {
      const currentYear = new Date().getFullYear();
      const rawValue = Number(current.dateParts[part]) || (part === "year" ? currentYear : 1);
      const minValue = part === "year" ? currentYear : 1;
      const maxValue = part === "day" ? 31 : part === "month" ? 12 : 2030;
      const nextValue = Math.min(maxValue, Math.max(minValue, rawValue + delta));

      return {
        ...current,
        dateParts: {
          ...current.dateParts,
          [part]: part === "year" ? String(nextValue) : String(nextValue).padStart(2, "0")
        }
      };
    });
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
    if (!appointmentDate) {
      setFormError("Qabul kunini to'g'ri kiriting.");
      return;
    }
    if (!selectedSlot) {
      setFormError("Qabul vaqtini tanlang.");
      return;
    }

    setFormError("");
    onSubmit(event);
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center px-2 py-10 text-center">
        <span className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-brand-50 text-brand-500 shadow-card">
          <CheckCircle2 size={40} />
        </span>
        <strong className="text-xl font-bold text-ink-900">So&apos;rov yuborildi</strong>
        <p className="mt-2 max-w-xs text-sm leading-relaxed text-ink-500">
          Administrator so&apos;rovni ko&apos;rib chiqadi. Shifokor tasdiqlagandan keyin xabar yuboriladi.
        </p>
        <Card className="mt-6 flex w-full max-w-xs flex-col items-center gap-2">
          <span className="text-sm font-medium text-ink-700">{doctor.name}</span>
          <b className="flex flex-col items-center gap-1 text-base font-bold text-ink-900">
            {appointmentDate || "Kun tanlanmagan"}
            <em className="not-italic text-sm font-semibold text-brand-600">{selectedSlot}</em>
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
          <span className="block text-sm text-ink-600">{doctor.specialty}</span>
          <small className="block truncate text-xs text-ink-400">
            {doctor.clinic}, {doctor.district}
          </small>
        </div>
      </Card>

      <SectionTitle title="Vaqt belgilash" />
      {slots.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {slots.map((slot) => (
            <Chip
              key={slot}
              active={selectedSlot === slot}
              onClick={() => {
                onSelectSlot(slot);
                setFormError("");
              }}
            >
              <Clock size={15} />
              {slot}
            </Chip>
          ))}
        </div>
      ) : (
        <Card className="flex items-center gap-3 text-ink-600">
          <Clock size={18} className="shrink-0 text-ink-400" />
          <span>
            <strong className="block text-sm text-ink-700">Bo&apos;sh vaqtlar ulanmagan</strong>
            <small className="block text-xs text-ink-400">
              Jadval backend/admin paneldan kelganda shu yerda chiqadi.
            </small>
          </span>
        </Card>
      )}

      <form id="appointment-form" className="flex flex-col gap-4" noValidate onSubmit={handleSubmit}>
        <Field
          label="F.I.O."
          name="fullName"
          autoComplete="name"
          value={draft.fullName}
          placeholder="Ism familiya"
          onChange={(event) => updateDraft("fullName", event.target.value)}
        />
        <Field
          label="Telefon raqam"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={draft.phone}
          placeholder="+998 90 123 45 67"
          onChange={(event) => updateDraft("phone", event.target.value)}
        />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className="mb-1.5 block text-sm font-medium text-ink-700">Jinsi</span>
            <input type="hidden" name="gender" value={draft.gender} />
            <div className="flex flex-wrap gap-2">
              {genderOptions.map((option) => (
                <Chip
                  key={option}
                  active={draft.gender === option}
                  onClick={() => updateDraft("gender", option)}
                >
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
        <div role="group" aria-labelledby="appointment-date-label">
          <span id="appointment-date-label" className="mb-1.5 block text-sm font-medium text-ink-700">
            Kun belgilash
          </span>
          <input type="hidden" name="appointmentDate" value={appointmentDate} />
          <Card className="flex items-center gap-2 p-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
              <CalendarDays size={17} />
            </span>
            {(Object.keys(datePartLabels) as Array<keyof DateParts>).map((part) => (
              <div key={part} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-xs font-medium text-ink-400">{datePartLabels[part]}</span>
                <div className="flex items-center gap-1">
                  <IconButton
                    type="button"
                    aria-label={`${datePartLabels[part]}ni kamaytirish`}
                    className="h-8 w-8"
                    onClick={() => updateDatePart(part, -1)}
                  >
                    <Minus size={14} />
                  </IconButton>
                  <strong className="min-w-9 text-center text-base font-bold text-ink-900">
                    {draft.dateParts[part]}
                  </strong>
                  <IconButton
                    type="button"
                    aria-label={`${datePartLabels[part]}ni oshirish`}
                    className="h-8 w-8"
                    onClick={() => updateDatePart(part, 1)}
                  >
                    <Plus size={14} />
                  </IconButton>
                </div>
              </div>
            ))}
          </Card>
        </div>
        <TextareaField
          label="Izoh"
          name="note"
          value={draft.note}
          placeholder="Shikoyat yoki qo'shimcha izoh"
          onChange={(event) => updateDraft("note", event.target.value)}
        />
        {formError && (
          <div
            className="flex items-center gap-2 rounded-2xl bg-rose-50 px-3 py-2.5 text-sm font-medium text-danger"
            role="alert"
          >
            <AlertCircle size={17} className="shrink-0" />
            <span>{formError}</span>
          </div>
        )}
        {submitError && (
          <div
            className="flex items-center gap-2 rounded-2xl bg-rose-50 px-3 py-2.5 text-sm font-medium text-danger"
            role="alert"
          >
            <AlertCircle size={17} className="shrink-0" />
            <span>{submitError}</span>
          </div>
        )}
        <Button type="submit" size="lg" disabled={sent || submitting}>
          <CheckCircle2 size={18} />
          {submitting ? "Yuborilmoqda" : sent ? "Yuborildi" : "Qabulga yozilish"}
        </Button>
      </form>
    </div>
  );
}
