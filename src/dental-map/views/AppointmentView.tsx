import { AlertCircle, CalendarDays, CheckCircle2, Clock, Minus, Plus } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { genderOptions, slots } from "../catalog";
import { DoctorAvatar, SectionTitle } from "../components/common";
import type { Doctor } from "../types";

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
      <div className="appointment-success-screen">
        <span className="success-burst" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
        </span>
        <span className="success-icon">
          <CheckCircle2 size={40} />
        </span>
        <strong>So&apos;rov yuborildi</strong>
        <p>Administrator so&apos;rovni ko&apos;rib chiqadi. Shifokor tasdiqlagandan keyin xabar yuboriladi.</p>
        <div className="success-summary">
          <span>{doctor.name}</span>
          <b>
            {appointmentDate || "Kun tanlanmagan"}
            <em>{selectedSlot}</em>
          </b>
        </div>
      </div>
    );
  }

  return (
    <div className="view-stack">
      <article className="selected-doctor">
        <DoctorAvatar doctor={doctor} size="md" />
        <div>
          <strong>{doctor.name}</strong>
          <span>{doctor.specialty}</span>
          <small>
            {doctor.clinic}, {doctor.district}
          </small>
        </div>
      </article>

      <SectionTitle title="Vaqt belgilash" />
      <div className="slot-grid">
        {slots.length > 0 ? (
          slots.map((slot) => (
            <button
              key={slot}
              className={selectedSlot === slot ? "slot active" : "slot"}
              type="button"
              onClick={() => {
                onSelectSlot(slot);
                setFormError("");
              }}
            >
              <Clock size={15} />
              {slot}
            </button>
          ))
        ) : (
          <div className="admin-status slot-empty">
            <Clock size={18} />
            <span>
              <strong>Bo&apos;sh vaqtlar ulanmagan</strong>
              <small>Jadval backend/admin paneldan kelganda shu yerda chiqadi.</small>
            </span>
          </div>
        )}
      </div>

      <form id="appointment-form" className="consult-form appointment-form" noValidate onSubmit={handleSubmit}>
        <label>
          <span>F.I.O.</span>
          <input
            name="fullName"
            autoComplete="name"
            value={draft.fullName}
            placeholder="Ism familiya"
            onChange={(event) => updateDraft("fullName", event.target.value)}
          />
        </label>
        <label>
          <span>Telefon raqam</span>
          <input
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={draft.phone}
            placeholder="+998 90 123 45 67"
            onChange={(event) => updateDraft("phone", event.target.value)}
          />
        </label>
        <div className="appointment-two-fields">
          <div className="field-block">
            <span className="field-label">Jinsi</span>
            <input type="hidden" name="gender" value={draft.gender} />
            <div className="gender-row">
              {genderOptions.map((option) => (
                <button
                  key={option}
                  className={draft.gender === option ? "gender-option active" : "gender-option"}
                  type="button"
                  aria-pressed={draft.gender === option}
                  onClick={() => updateDraft("gender", option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
          <label className="field-block">
            <span className="field-label">Yoshi</span>
            <input
              name="age"
              type="number"
              inputMode="numeric"
              min="1"
              max="100"
              value={draft.age}
              placeholder="26"
              onChange={(event) => updateDraft("age", event.target.value.replace(/\D/g, "").slice(0, 3))}
            />
          </label>
        </div>
        <div className="date-field" role="group" aria-labelledby="appointment-date-label">
          <span id="appointment-date-label" className="field-label">Kun belgilash</span>
          <input type="hidden" name="appointmentDate" value={appointmentDate} />
          <div className="date-composer">
            <span className="date-composer-icon">
              <CalendarDays size={17} />
            </span>
            <div className="date-stepper">
              <span>Kun</span>
              <div>
                <button type="button" aria-label="Kunni kamaytirish" onClick={() => updateDatePart("day", -1)}>
                  <Minus size={14} />
                </button>
                <strong>{draft.dateParts.day}</strong>
                <button type="button" aria-label="Kunni oshirish" onClick={() => updateDatePart("day", 1)}>
                  <Plus size={14} />
                </button>
              </div>
            </div>
            <div className="date-stepper">
              <span>Oy</span>
              <div>
                <button type="button" aria-label="Oyni kamaytirish" onClick={() => updateDatePart("month", -1)}>
                  <Minus size={14} />
                </button>
                <strong>{draft.dateParts.month}</strong>
                <button type="button" aria-label="Oyni oshirish" onClick={() => updateDatePart("month", 1)}>
                  <Plus size={14} />
                </button>
              </div>
            </div>
            <div className="date-stepper">
              <span>Yil</span>
              <div>
                <button type="button" aria-label="Yilni kamaytirish" onClick={() => updateDatePart("year", -1)}>
                  <Minus size={14} />
                </button>
                <strong>{draft.dateParts.year}</strong>
                <button type="button" aria-label="Yilni oshirish" onClick={() => updateDatePart("year", 1)}>
                  <Plus size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
        <label>
          <span>Izoh</span>
          <textarea
            name="note"
            value={draft.note}
            placeholder="Shikoyat yoki qo'shimcha izoh"
            onChange={(event) => updateDraft("note", event.target.value)}
          />
        </label>
        {formError && (
          <div className="form-error" role="alert">
            <AlertCircle size={17} />
            <span>{formError}</span>
          </div>
        )}
        {submitError && (
          <div className="form-error" role="alert">
            <AlertCircle size={17} />
            <span>{submitError}</span>
          </div>
        )}
        <button className="primary-btn submit" type="submit" disabled={sent || submitting}>
          <CheckCircle2 size={18} />
          {submitting ? "Yuborilmoqda" : sent ? "Yuborildi" : "Qabulga yozilish"}
        </button>
      </form>
    </div>
  );
}
