"use client";

import { CalendarClock, CheckCircle2, ShieldAlert } from "lucide-react";
import type { PublicationBlocker } from "../../types";
import { Card } from "../../ui";

type ChecklistEntry = {
  icon: typeof CalendarClock;
  title: string;
  hint: string;
  /** Which dashboard section fixes this, when the doctor can fix it themselves. */
  section?: "schedule" | "profile";
};

const ENTRIES: Record<PublicationBlocker, ChecklistEntry> = {
  schedule_incomplete: {
    icon: CalendarClock,
    title: "Qabul vaqtlarini kiriting",
    hint: "Ishlaydigan kunlaringiz uchun vaqt oralig'ini qo'ying — kamida bitta kun yetarli.",
    section: "schedule"
  },
  rejected: {
    icon: ShieldAlert,
    title: "Profil rad etilgan",
    hint: "Sabab bo'yicha qo'llab-quvvatlash xizmatiga murojaat qiling."
  },
  blocked: {
    icon: ShieldAlert,
    title: "Profil bloklangan",
    hint: "Qo'llab-quvvatlash xizmatiga murojaat qiling."
  }
};

/**
 * Explains why the doctor is not in patient lists yet. Publication is self-serve:
 * the profile goes live automatically once every item here is resolved, so this
 * must never promise an admin review.
 */
export function PublicationChecklist({
  blockers,
  isPublished,
  onNavigate
}: {
  blockers?: PublicationBlocker[];
  isPublished: boolean;
  onNavigate?: (section: "schedule" | "profile") => void;
}) {
  const items = (blockers ?? []).filter((key): key is PublicationBlocker => key in ENTRIES);

  if (isPublished && items.length === 0) {
    return (
      <div
        className="flex items-center gap-2 rounded-card bg-success/10 px-4 py-3 text-sm font-medium text-success"
        role="status"
      >
        <CheckCircle2 size={17} className="shrink-0" />
        <span>Profilingiz bemorlar ro&apos;yxatida ko&apos;rinib turadi.</span>
      </div>
    );
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <Card className="flex flex-col gap-3 border-warning/40 bg-warning/5" role="status">
      <div>
        <h3 className="text-sm font-bold text-ink-900">Profil hali ro&apos;yxatda ko&apos;rinmayapti</h3>
        <p className="mt-0.5 text-xs leading-relaxed text-ink-500">
          Quyidagilarni to&apos;ldirsangiz, profilingiz avtomatik ravishda ro&apos;yxatga chiqadi —
          hech kimning tasdig&apos;ini kutish shart emas.
        </p>
      </div>
      <ul className="flex flex-col gap-2">
        {items.map((key) => {
          const entry = ENTRIES[key];
          const Icon = entry.icon;
          const actionable = entry.section && onNavigate;
          return (
            <li key={key} className="flex items-start gap-2.5 rounded-card bg-surface-0 px-3 py-2.5">
              <Icon size={16} className="mt-0.5 shrink-0 text-warning" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink-900">{entry.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-ink-500">{entry.hint}</p>
              </div>
              {actionable ? (
                <button
                  type="button"
                  onClick={() => onNavigate?.(entry.section!)}
                  className="shrink-0 self-center rounded-pill bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white"
                >
                  Ochish
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
