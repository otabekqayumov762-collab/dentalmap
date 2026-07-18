import { AlertTriangle, ChevronRight, Loader2 } from "lucide-react";
import { isOfflineMode } from "../api/dentalMapApi";
import { serviceItems } from "../catalog";
import { cn } from "../ui";
import type { Service, ViewId } from "../types";

export function ServicesView({
  services,
  loading = false,
  error = "",
  onRetry,
  onNavigate
}: {
  services: Service[];
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  onNavigate: (view: ViewId) => void;
}) {
  const tiles = services.length
    ? services.map((s) => ({ id: s.id, label: s.name }))
    : isOfflineMode()
      ? serviceItems
      : [];

  if (loading && tiles.length === 0) {
    return <p role="status" className="flex items-center gap-2 text-sm text-ink-500"><Loader2 size={16} className="animate-spin" />Xizmatlar yuklanmoqda…</p>;
  }
  if (error && tiles.length === 0) {
    return (
      <div role="alert" className="flex flex-col items-start gap-2 rounded-card bg-danger/10 p-4 text-danger">
        <p className="flex items-center gap-2 text-sm"><AlertTriangle size={16} />{error}</p>
        {onRetry && <button type="button" className="text-sm font-semibold underline" onClick={onRetry}>Qayta urinish</button>}
      </div>
    );
  }

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
