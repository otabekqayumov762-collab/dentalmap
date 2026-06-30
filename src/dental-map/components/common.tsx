/* eslint-disable @next/next/no-img-element */

import { CheckCircle2, ChevronRight, MapPin, Stethoscope, type LucideIcon } from "lucide-react";
import { Chip, cn } from "../ui";
import { doctorAccentClass } from "./accent";
import { districts } from "../catalog";
import type { Doctor, TelegramAuthStatus, TelegramUser } from "../types";

/** Maps the legacy accent class (from accent.ts) onto Tailwind token utilities. */
const accentTone: Record<string, { text: string; softBg: string }> = {
  "accent-teal": { text: "text-accent-teal", softBg: "bg-accent-teal/10" },
  "accent-blue": { text: "text-accent-blue", softBg: "bg-accent-blue/10" },
  "accent-rose": { text: "text-accent-rose", softBg: "bg-accent-rose/10" },
  "accent-violet": { text: "text-accent-violet", softBg: "bg-accent-violet/10" },
  "accent-sky": { text: "text-accent-sky", softBg: "bg-accent-sky/10" }
};

function toneFor(accent: string) {
  return accentTone[doctorAccentClass(accent)] ?? accentTone["accent-teal"];
}

export function BrandLogo() {
  return (
    <svg className="h-11 w-11 shrink-0" viewBox="0 0 44 44" aria-hidden="true" focusable="false">
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

const statusDot: Record<TelegramAuthStatus, string> = {
  loading: "bg-warning",
  authenticated: "bg-success",
  guest: "bg-ink-400",
  error: "bg-danger"
};

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
    <section
      className="flex items-center gap-3 rounded-card bg-surface-0 px-4 py-3 shadow-card"
      aria-live="polite"
    >
      <span
        className={cn(
          "h-2.5 w-2.5 shrink-0 rounded-full",
          statusDot[status],
          status === "loading" && "animate-pulse"
        )}
      />
      <div className="min-w-0">
        <strong className="block truncate text-sm font-semibold text-ink-900">
          {isTelegram ? name : "Brauzer ko'rinishi"}
        </strong>
        <small className="block truncate text-xs text-ink-500">{message}</small>
      </div>
    </section>
  );
}

export function EmptyState({ title, text, Icon }: { title: string; text: string; Icon: LucideIcon }) {
  return (
    <section className="flex flex-col items-center gap-2 rounded-card bg-surface-50 px-6 py-10 text-center">
      <span className="mb-1 inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
        <Icon size={18} />
      </span>
      <strong className="text-base font-semibold text-ink-900">{title}</strong>
      <p className="max-w-xs text-sm text-ink-500">{text}</p>
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
    <section className="min-w-0 rounded-card bg-surface-0 p-4 shadow-card" aria-label="Hudud tanlash">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="flex items-center gap-2.5">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
            <MapPin size={15} />
          </span>
          <span className="flex flex-col">
            <strong className="text-sm font-semibold text-ink-900">Tuman</strong>
            <em className="text-xs not-italic text-ink-500">
              {value === "Barchasi" ? "Barcha hududlar" : value}
            </em>
          </span>
        </span>
        <small className="text-xs font-medium text-ink-400">{districts.length - 1} ta</small>
      </div>
      <div className="-mx-1 flex gap-2 overflow-x-auto no-scrollbar px-1 pb-1" role="list">
        {districts.map((item) => (
          <Chip key={item} active={value === item} onClick={() => onChange(item)} className="shrink-0">
            {item}
          </Chip>
        ))}
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
    <fieldset className="m-0 min-w-0 border-0 p-0">
      <legend className="mb-1.5 block text-sm font-medium text-ink-700">{label}</legend>
      <input type="hidden" name={name} value={value} />
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = value === option;

          return (
            <Chip key={option} active={active} onClick={() => onChange(option)}>
              <span>{option}</span>
              {active && <CheckCircle2 size={14} />}
            </Chip>
          );
        })}
      </div>
    </fieldset>
  );
}

const avatarSize: Record<"sm" | "md" | "lg", string> = {
  sm: "h-10 w-10",
  md: "h-14 w-14",
  lg: "h-20 w-20"
};

export function DoctorAvatar({ doctor, size = "md" }: { doctor: Doctor; size?: "sm" | "md" | "lg" }) {
  const tone = toneFor(doctor.accent);

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-2xl",
        avatarSize[size],
        tone.softBg,
        tone.text
      )}
    >
      {doctor.image ? (
        <img src={doctor.image} alt={doctor.name} className="h-full w-full object-cover" />
      ) : (
        <Stethoscope size={size === "lg" ? 34 : 22} />
      )}
    </span>
  );
}

export function NotificationPanel({ sent, onOpenAppointment }: { sent: boolean; onOpenAppointment: () => void }) {
  return (
    <section className="rounded-card bg-surface-0 p-4 shadow-card">
      <div className="mb-3 flex items-center justify-between gap-3">
        <strong className="text-sm font-semibold text-ink-900">Bildirishnomalar</strong>
        <button
          type="button"
          onClick={onOpenAppointment}
          className="text-sm font-medium text-brand-600 transition-colors hover:text-brand-700"
        >
          Qabulni ochish
        </button>
      </div>
      <button
        className="flex w-full items-center gap-3 rounded-2xl bg-surface-50 p-3 text-left transition-colors hover:bg-surface-100"
        type="button"
        onClick={onOpenAppointment}
      >
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          <CheckCircle2 size={17} />
        </span>
        <span className="min-w-0">
          <strong className="block text-sm font-semibold text-ink-900">
            {sent ? "Administrator tasdiqi kutilmoqda" : "Qabul formasi tayyor"}
          </strong>
          <small className="block text-xs text-ink-500">
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
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-lg font-bold text-ink-900">{title}</h2>
      {action && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center gap-0.5 text-sm font-medium text-brand-600 transition-colors hover:text-brand-700"
        >
          {action}
          <ChevronRight size={15} />
        </button>
      )}
    </div>
  );
}
