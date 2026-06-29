/* eslint-disable @next/next/no-img-element */

import { CheckCircle2, ChevronRight, MapPin, Stethoscope, type LucideIcon } from "lucide-react";
import { doctorAccentClass } from "./accent";
import { districts } from "../catalog";
import type { Doctor, TelegramAuthStatus, TelegramUser } from "../types";

export function BrandLogo() {
  return (
    <svg className="dental-logo" viewBox="0 0 44 44" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="dentalLogoFill" x1="9" x2="36" y1="7" y2="37" gradientUnits="userSpaceOnUse">
          <stop stopColor="#16A8B5" />
          <stop offset="1" stopColor="#1686EF" />
        </linearGradient>
      </defs>
      <path
        d="M22 4.8c8.7 0 15.8 7.1 15.8 15.8 0 10.9-13.2 18.3-15.1 19.3a1.5 1.5 0 0 1-1.4 0C19.4 38.9 6.2 31.5 6.2 20.6 6.2 11.9 13.3 4.8 22 4.8Z"
        fill="url(#dentalLogoFill)"
      />
      <path
        d="M16.4 14.2c1.8-2 3.9-.6 5.6-.6s3.8-1.4 5.6.6c2.5 2.7.5 6.5-.3 9.7-.7 2.8-.7 5.6-2.7 5.6-1.2 0-1.4-2.4-2.6-2.4s-1.4 2.4-2.6 2.4c-2 0-2-2.8-2.7-5.6-.8-3.2-2.8-7 .3-9.7Z"
        fill="#FFFFFF"
      />
      <path
        d="M17.8 20.6h8.4M22 16.4v8.4"
        stroke="#1686EF"
        strokeLinecap="round"
        strokeWidth="2.2"
      />
    </svg>
  );
}

export function TelegramStatus({
  status,
  message,
  user,
  isTelegram
}: {
  status: TelegramAuthStatus;
  message: string;
  user: TelegramUser | null;
  isTelegram: boolean;
}) {
  if (!isTelegram) {
    return null;
  }

  const name = user
    ? [user.first_name, user.last_name].filter(Boolean).join(" ") || `@${user.username}` || `ID ${user.id}`
    : "Telegram foydalanuvchisi aniqlanmadi";

  return (
    <section className={`telegram-status ${status}`} aria-live="polite">
      <span className="telegram-dot" />
      <div>
        <strong>{isTelegram ? name : "Brauzer ko'rinishi"}</strong>
        <small>{message}</small>
      </div>
    </section>
  );
}

export function EmptyState({ title, text, Icon }: { title: string; text: string; Icon: LucideIcon }) {
  return (
    <section className="empty-state">
      <span className="soft-icon">
        <Icon size={18} />
      </span>
      <strong>{title}</strong>
      <p>{text}</p>
    </section>
  );
}

export function DistrictFilter({
  value,
  onChange
}: {
  value: string;
  onChange: (district: string) => void;
}) {
  return (
    <section className="district-filter" aria-label="Hudud tanlash">
      <div className="district-filter-head">
        <span className="district-title">
          <span className="district-pin">
            <MapPin size={15} />
          </span>
          <span>
            <strong>Tuman</strong>
            <em>{value === "Barchasi" ? "Barcha hududlar" : value}</em>
          </span>
        </span>
        <small>{districts.length - 1} ta</small>
      </div>
      <div className="district-chip-row" role="list">
        {districts.map((item) => {
          const active = value === item;

          return (
            <button
              key={item}
              className={active ? "district-chip active" : "district-chip"}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(item)}
            >
              <span className="district-step-dot" />
              <span className="district-step-label">{item}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function ChoiceField({
  label,
  name,
  value,
  options,
  onChange
}: {
  label: string;
  name: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <fieldset className="choice-field">
      <legend>{label}</legend>
      <input type="hidden" name={name} value={value} />
      <div className="choice-row">
        {options.map((option) => {
          const active = value === option;

          return (
            <button
              key={option}
              className={active ? "choice-chip active" : "choice-chip"}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(option)}
            >
              <span>{option}</span>
              {active && <CheckCircle2 size={14} />}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function DoctorAvatar({ doctor, size = "md" }: { doctor: Doctor; size?: "sm" | "md" | "lg" }) {
  return (
    <span className={`doctor-avatar ${size} ${doctorAccentClass(doctor.accent)}`}>
      {doctor.image ? <img src={doctor.image} alt={doctor.name} /> : <Stethoscope size={size === "lg" ? 34 : 22} />}
    </span>
  );
}

export function NotificationPanel({ sent, onOpenAppointment }: { sent: boolean; onOpenAppointment: () => void }) {
  return (
    <section className="notification-panel">
      <div>
        <strong>Bildirishnomalar</strong>
        <button type="button" onClick={onOpenAppointment}>
          Qabulni ochish
        </button>
      </div>
      <button className="notification-row" type="button" onClick={onOpenAppointment}>
        <span className="soft-icon">
          <CheckCircle2 size={17} />
        </span>
        <span>
          <strong>{sent ? "Administrator tasdiqi kutilmoqda" : "Qabul formasi tayyor"}</strong>
          <small>
            {sent
              ? "Administrator so'rovingizni ko'rib chiqmoqda."
              : "F.I.O, telefon, kun va vaqtni kiriting."}
          </small>
        </span>
      </button>
    </section>
  );
}

export function SectionTitle({
  title,
  action,
  onAction
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="section-title">
      <h2>{title}</h2>
      {action && (
        <button type="button" onClick={onAction}>
          {action}
          <ChevronRight size={15} />
        </button>
      )}
    </div>
  );
}
