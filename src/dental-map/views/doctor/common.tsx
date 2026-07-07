import { ChevronDown, type LucideIcon } from "lucide-react";
import type { ReactNode, SelectHTMLAttributes } from "react";
import { appointmentStatusLabel } from "../../api/dentalMapApi";
import type { ApiAppointment } from "../../types";
import { cn } from "../../ui";

export type Tone = "brand" | "success" | "warning" | "danger" | "neutral";

/** Icon + title + subtitle header, shared across doctor Kabinet sections. */
export function SectionHeader({ Icon, title, subtitle }: { Icon: LucideIcon; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
        <Icon size={18} />
      </span>
      <div className="min-w-0">
        <strong className="block text-base font-bold text-ink-900">{title}</strong>
        {subtitle && <span className="block text-xs text-ink-500">{subtitle}</span>}
      </div>
    </div>
  );
}

/** Muted uppercase group label (iOS-settings style) — matches the patient profile. */
export function GroupLabel({ children }: { children: ReactNode }) {
  return (
    <span className="mb-2 ml-1 block text-[0.7rem] font-semibold uppercase tracking-wide text-ink-400">{children}</span>
  );
}

/** Labelled native <select> that matches the Select primitive but stays uncontrolled for FormData. */
export function NativeSelect({
  label,
  className,
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & { label: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink-700">{label}</span>
      <div className="relative">
        <select
          className={cn(
            "w-full appearance-none rounded-2xl border border-surface-200 bg-surface-50 px-4 py-3 pr-10 text-ink-900",
            "transition-colors focus:border-brand-400 focus:bg-surface-0 focus:outline-none focus:ring-2 focus:ring-brand-100",
            className
          )}
          {...rest}
        >
          {children}
        </select>
        <ChevronDown size={18} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
      </div>
    </label>
  );
}

export function statusTone(status: ApiAppointment["status"]): Tone {
  if (status === "pending") {
    return "warning";
  }
  if (status === "doctor_confirmed") {
    return "brand";
  }
  if (status === "completed") {
    return "success";
  }
  if (status === "doctor_rejected" || status === "user_cancelled" || status === "no_show") {
    return "danger";
  }
  return "neutral";
}

export { appointmentStatusLabel };

export function approvalTone(status?: string): Tone {
  if (status === "approved") {
    return "success";
  }
  if (status === "rejected") {
    return "danger";
  }
  return "warning";
}

export function approvalLabel(status?: string) {
  if (status === "approved") {
    return "Tasdiqlangan";
  }
  if (status === "rejected") {
    return "Rad etilgan";
  }
  return "Profil tayyorlanmoqda";
}

export function formatDate(value?: string | null) {
  if (!value) {
    return "";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }
  // Plain dd.mm.yyyy — the uz-UZ short month renders as an ugly "M08".
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(parsed.getDate())}.${pad(parsed.getMonth() + 1)}.${parsed.getFullYear()}`;
}
