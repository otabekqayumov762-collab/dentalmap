import Link from "next/link";
import { PRIVACY_PATH } from "../lib/publicConfig";
import { cn } from "../ui";

export function PrivacyAcknowledgement({ error = false }: { error?: boolean }) {
  return (
    <label
      className={cn(
        "flex items-start gap-3 rounded-2xl border bg-surface-50 px-3.5 py-3 text-sm text-ink-600",
        error ? "border-danger" : "border-surface-200"
      )}
    >
      <input
        type="checkbox"
        name="privacy_acknowledged"
        value="yes"
        required
        aria-invalid={error || undefined}
        className="mt-0.5 h-4 w-4 shrink-0 accent-brand-500"
      />
      <span className="leading-relaxed">
        <Link
          href={PRIVACY_PATH}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-brand-600 underline underline-offset-2"
        >
          Maxfiylik, saqlash va o&apos;chirish qoidalari
        </Link>
        ni o&apos;qidim. Qabul va profil ma&apos;lumotlarim xizmat ko&apos;rsatish uchun qayta ishlanishini
        tushunaman.
      </span>
    </label>
  );
}
