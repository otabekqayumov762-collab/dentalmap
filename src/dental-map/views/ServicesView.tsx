import { ChevronRight } from "lucide-react";
import { serviceItems } from "../catalog";
import { cn } from "../ui";
import type { Service, ViewId } from "../types";

export function ServicesView({ services, onNavigate }: { services: Service[]; onNavigate: (view: ViewId) => void }) {
  // Admin-managed services when available, else the offline catalog fallback.
  const tiles = services.length ? services.map((s) => ({ id: s.id, label: s.name })) : serviceItems;

  return (
    <div className="grid grid-cols-2 gap-3">
      {tiles.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          onClick={() => onNavigate("doctors")}
          className={cn(
            "flex items-center justify-between gap-2 rounded-card border border-surface-100 bg-surface-0 p-4 text-left shadow-card",
            "transition-transform hover:-translate-y-0.5 active:scale-[0.98]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"
          )}
        >
          <strong className="text-sm font-semibold text-ink-900">{label}</strong>
          <ChevronRight size={16} className="shrink-0 text-brand-500" />
        </button>
      ))}
    </div>
  );
}
