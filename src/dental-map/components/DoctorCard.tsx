/* eslint-disable @next/next/no-img-element */

import { Heart, MapPin, Star, Stethoscope } from "lucide-react";
import { memo } from "react";
import { Button, Card, cn } from "../ui";
import { doctorAccentClass } from "./accent";
import type { Doctor } from "../types";

/** Maps the legacy accent class (from accent.ts) onto Tailwind token utilities. */
const accentTone: Record<string, { text: string; softBg: string }> = {
  "accent-teal": { text: "text-accent-teal", softBg: "bg-accent-teal/10" },
  "accent-blue": { text: "text-accent-blue", softBg: "bg-accent-blue/10" },
  "accent-rose": { text: "text-accent-rose", softBg: "bg-accent-rose/10" },
  "accent-violet": { text: "text-accent-violet", softBg: "bg-accent-violet/10" },
  "accent-sky": { text: "text-accent-sky", softBg: "bg-accent-sky/10" }
};

/**
 * The callbacks take the doctor (or its id) instead of being pre-bound by the
 * caller on purpose: `onOpen={() => onOpenDoctor(doctor)}` would hand this card
 * three brand-new function props on every parent render, so the memo below
 * would never hit. With this shape the list views pass their stable
 * `useCallback` handlers straight through, and only the cards whose own doctor
 * or saved-state actually changed re-render — the rest survive a search
 * keystroke or a filter change untouched.
 */
function DoctorCardComponent({
  doctor,
  isSaved,
  onToggleSaved,
  onOpen,
  onAppointment
}: {
  doctor: Doctor;
  isSaved: boolean;
  onToggleSaved: (doctorId: string) => void;
  onOpen: (doctor: Doctor) => void;
  onAppointment: (doctor: Doctor) => void;
}) {
  const tone = accentTone[doctorAccentClass(doctor.accent)] ?? accentTone["accent-teal"];

  return (
    <Card
      as="article"
      className="flex flex-col gap-3"
    >
      <div className="relative">
        <button
          className={cn(
            "flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-2xl",
            tone.softBg,
            tone.text
          )}
          type="button"
          onClick={() => onOpen(doctor)}
          aria-label={`${doctor.name} haqida batafsil`}
        >
          {doctor.image ? (
            <img src={doctor.image} alt={doctor.name} className="h-full w-full object-cover" />
          ) : (
            <Stethoscope size={34} />
          )}
        </button>
        <button
          className={cn(
            "absolute right-2 top-2 inline-flex h-10 w-10 items-center justify-center rounded-full shadow-card transition-colors active:scale-95",
            isSaved
              ? "bg-danger text-white"
              : "bg-surface-0/90 text-ink-500 backdrop-blur hover:text-danger"
          )}
          type="button"
          aria-label={isSaved ? `${doctor.name} saqlanganlardan olib tashlash` : `${doctor.name}ni saqlash`}
          aria-pressed={isSaved}
          onClick={() => onToggleSaved(doctor.id)}
        >
          <Heart size={16} className={isSaved ? "fill-current" : undefined} />
        </button>
      </div>

      <div className="flex min-w-0 flex-col gap-1">
        <button
          type="button"
          className="min-w-0 text-left"
          onClick={() => onOpen(doctor)}
        >
          <strong className="block truncate text-[0.95rem] font-semibold text-ink-900">{doctor.name}</strong>
        </button>
        <small className="block truncate text-xs text-ink-500">{doctor.specialty}</small>
        <span className="mt-0.5 inline-flex items-center gap-1 text-xs font-semibold text-ink-900">
          <Star size={14} className="shrink-0 text-warning" fill="currentColor" />
          {doctor.rating}
          <em className="truncate font-normal not-italic text-ink-400">{doctor.reviews} sharh</em>
        </span>
        <span className="inline-flex min-w-0 items-center gap-1 text-xs text-ink-500">
          <MapPin size={14} className="shrink-0 text-ink-400" />
          <span className="truncate">{doctor.district}</span>
        </span>
      </div>

      <Button
        variant="primary"
        size="sm"
        className="w-full"
        type="button"
        onClick={() => onAppointment(doctor)}
      >
        Qabul
      </Button>
    </Card>
  );
}

/**
 * Doctor lists are the only place in the app that renders the same component
 * dozens of times, and they sit under the shell's search/filter state, so every
 * keystroke used to re-render every card. Memo keeps that to the cards that
 * actually changed. Default shallow compare is enough: `doctor` objects come
 * from the data hook by reference and `isSaved` is a boolean.
 */
export const DoctorCard = memo(DoctorCardComponent);
