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
    title: "Foydalanuvchi",
    subtitle: "Qabulga yozilish va konsultatsiya olish"
  },
  {
    id: "doctor",
    Icon: Stethoscope,
    title: "Shifokor",
    subtitle: "Anketa, klinika va obuna to'lovi"
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
    <div className="grid grid-cols-2 gap-3" aria-label="Rol tanlash">
      {roleOptions.map(({ id, Icon, title, subtitle }) => {
        const active = role === id;

        return (
          <button
            key={id}
            type="button"
            aria-pressed={active}
            onClick={() => onRoleChange(id)}
            className={cn(
              "flex flex-col gap-2.5 rounded-card border p-3.5 text-left transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 active:scale-[0.98]",
              active
                ? "border-brand-400 bg-brand-50 shadow-card"
                : "border-surface-100 bg-surface-0 hover:bg-surface-50"
            )}
          >
            <span
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full transition-colors",
                active ? "bg-brand-500 text-white" : "bg-surface-100 text-ink-500"
              )}
            >
              <Icon size={20} />
            </span>
            <span>
              <strong
                className={cn(
                  "block text-sm font-bold",
                  active ? "text-brand-700" : "text-ink-900"
                )}
              >
                {title}
              </strong>
              <small className="mt-0.5 block text-xs leading-snug text-ink-500">{subtitle}</small>
            </span>
          </button>
        );
      })}
    </div>
  );
}
