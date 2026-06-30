/* eslint-disable @next/next/no-img-element */

import { Heart, MapPin, ShieldCheck, Star, Stethoscope } from "lucide-react";
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

export function DoctorCard({
  doctor,
  isSaved,
  onToggleSaved,
  onOpen,
  onAppointment
}: {
  doctor: Doctor;
  isSaved: boolean;
  onToggleSaved: () => void;
  onOpen: () => void;
  onAppointment: () => void;
}) {
  const tone = accentTone[doctorAccentClass(doctor.accent)] ?? accentTone["accent-teal"];

  return (
    <Card
      as="article"
      interactive
      className="flex flex-col gap-3"
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
    >
      <div className="relative">
        <button
          className={cn(
            "flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-2xl",
            tone.softBg,
            tone.text
          )}
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onOpen();
          }}
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
            "absolute right-2 top-2 inline-flex h-9 w-9 items-center justify-center rounded-full shadow-card transition-colors active:scale-95",
            isSaved
              ? "bg-danger text-white"
              : "bg-surface-0/90 text-ink-500 backdrop-blur hover:text-danger"
          )}
          type="button"
          aria-label={isSaved ? `${doctor.name} saqlanganlardan olib tashlash` : `${doctor.name}ni saqlash`}
          aria-pressed={isSaved}
          onClick={(event) => {
            event.stopPropagation();
            onToggleSaved();
          }}
        >
          <Heart size={16} className={isSaved ? "fill-current" : undefined} />
        </button>
        <span
          className={cn(
            "absolute left-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-surface-0/90 shadow-card backdrop-blur",
            tone.text
          )}
        >
          <ShieldCheck size={13} />
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <button
          type="button"
          className="text-left"
          onClick={(event) => {
            event.stopPropagation();
            onOpen();
          }}
        >
          <strong className="text-[0.95rem] font-semibold text-ink-900">{doctor.name}</strong>
        </button>
        <small className="text-xs text-ink-500">{doctor.specialty}</small>
        <span className="mt-0.5 inline-flex items-center gap-1 text-xs font-semibold text-ink-900">
          <Star size={14} className="text-warning" fill="currentColor" />
          {doctor.rating}
          <em className="font-normal not-italic text-ink-400">{doctor.reviews} sharh</em>
        </span>
        <span className="inline-flex items-center gap-1 text-xs text-ink-500">
          <MapPin size={14} className="text-ink-400" />
          {doctor.district}
        </span>
      </div>

      <Button
        variant="primary"
        size="sm"
        className="w-full"
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onAppointment();
        }}
      >
        Qabul
      </Button>
    </Card>
  );
}
