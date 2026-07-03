import { Stethoscope, User, type LucideIcon } from "lucide-react";
import type { RegisterRole } from "../../types";
import { cn } from "../../ui";

const roleOptions: Array<{
  id: RegisterRole;
  Icon: LucideIcon;
  title: string;
  subtitle: string;
}> = [
  {
    id: "user",
    Icon: User,
    title: "Mijoz",
    subtitle: "Qabulga yozilish"
  },
  {
    id: "doctor",
    Icon: Stethoscope,
    title: "Shifokor",
    subtitle: "Klinika profili"
  }
];

export function RegisterRoleToggle({
  role,
  onRoleChange
}: {
  role: RegisterRole;
  onRoleChange: (role: RegisterRole) => void;
}) {
  return (
    <div className="rounded-card border border-surface-200 bg-surface-0 p-2 shadow-card" aria-label="Rol tanlash">
      <div className="grid grid-cols-2 gap-2">
        {roleOptions.map(({ id, Icon, title, subtitle }) => {
          const active = role === id;

          return (
            <button
              key={id}
              type="button"
              aria-pressed={active}
              onClick={() => onRoleChange(id)}
              className={cn(
                "relative flex min-h-[86px] items-center gap-3 rounded-[22px] border p-3 text-left transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 active:scale-[0.98]",
                active
                  ? "border-brand-400 bg-brand-500 text-white shadow-card dark:border-brand-300 dark:bg-brand-400 dark:text-surface-0"
                  : "border-transparent bg-surface-50 text-ink-700 hover:bg-surface-100"
              )}
            >
              <span
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-colors",
                  active ? "bg-white/16 text-white" : "bg-surface-0 text-brand-600"
                )}
              >
                <Icon size={21} />
              </span>
              <span className="min-w-0">
                <strong className="block truncate text-sm font-extrabold">{title}</strong>
                <small className={cn("mt-0.5 block truncate text-xs font-semibold", active ? "text-white/78" : "text-ink-500")}>
                  {subtitle}
                </small>
              </span>
              {active && (
                <span className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-brand-300 dark:bg-brand-500" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
