import { serviceItems } from "../catalog";
import { cn } from "../ui";
import type { ViewId } from "../types";

export function ServicesView({ onNavigate }: { onNavigate: (view: ViewId) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {serviceItems.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onNavigate("doctors")}
          className={cn(
            "flex flex-col items-start gap-3 rounded-card border border-surface-100 bg-surface-0 p-4 text-left shadow-card",
            "transition-transform hover:-translate-y-0.5 active:scale-[0.98]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"
          )}
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
            <Icon size={20} />
          </span>
          <strong className="text-sm font-semibold text-ink-900">{label}</strong>
        </button>
      ))}
    </div>
  );
}
