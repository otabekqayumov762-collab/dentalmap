/* eslint-disable @next/next/no-img-element */

import { Heart, MapPin, ShieldCheck, Star, Stethoscope } from "lucide-react";
import type { CSSProperties } from "react";
import type { Doctor } from "../types";

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
  return (
    <article
      className="doctor-card"
      style={{ "--accent": doctor.accent } as CSSProperties}
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
      <div className="photo-box">
        <button
          className="photo-open"
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onOpen();
          }}
          aria-label={`${doctor.name} haqida batafsil`}
        >
          {doctor.image ? <img src={doctor.image} alt={doctor.name} /> : <Stethoscope size={34} />}
        </button>
        <button
          className={isSaved ? "heart-btn saved" : "heart-btn"}
          type="button"
          aria-label={isSaved ? `${doctor.name} saqlanganlardan olib tashlash` : `${doctor.name}ni saqlash`}
          aria-pressed={isSaved}
          onClick={(event) => {
            event.stopPropagation();
            onToggleSaved();
          }}
        >
          <Heart size={16} />
        </button>
        <span className="doctor-badge">
          <ShieldCheck size={13} />
        </span>
      </div>
      <div className="doctor-body">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onOpen();
          }}
        >
          <strong>{doctor.name}</strong>
        </button>
        <small>{doctor.specialty}</small>
        <span className="rating-line">
          <Star size={14} />
          {doctor.rating}
          <em>{doctor.reviews} sharh</em>
        </span>
        <span className="address-line">
          <MapPin size={14} />
          {doctor.district}
        </span>
      </div>
      <button
        className="appointment-btn"
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onAppointment();
        }}
      >
        Qabul
      </button>
    </article>
  );
}

