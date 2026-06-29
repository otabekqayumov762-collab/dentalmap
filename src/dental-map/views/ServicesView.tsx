import { serviceItems } from "../catalog";
import type { ViewId } from "../types";

export function ServicesView({ onNavigate }: { onNavigate: (view: ViewId) => void }) {
  return (
    <div className="view-stack">
      <div className="service-grid">
        {serviceItems.map(({ id, label, Icon }) => (
          <button key={id} className="service-card" onClick={() => onNavigate("doctors")}>
            <span className="soft-icon">
              <Icon size={18} />
            </span>
            <strong>{label}</strong>
          </button>
        ))}
      </div>
    </div>
  );
}
