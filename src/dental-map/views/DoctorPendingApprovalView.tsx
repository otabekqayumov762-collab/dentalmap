"use client";

import { Clock, LogOut, RotateCw } from "lucide-react";
import { Button, Card } from "../ui";

/**
 * Shown to a doctor after registration while payment is temporarily disabled.
 * The doctor waits for admin approval; once approved (subscription active) the
 * app opens automatically on the next data refresh. Payment is intentionally
 * hidden for now — swap this back to DoctorPaymentView when billing is ready.
 */
export function DoctorPendingApprovalView({
  onRefresh,
  onLogout,
  refreshing = false
}: {
  onRefresh?: () => void;
  onLogout?: () => void;
  refreshing?: boolean;
}) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 px-2 text-center">
      <span className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-50 text-brand-500 shadow-card">
        <Clock size={38} />
      </span>
      <div className="flex max-w-xs flex-col gap-2">
        <strong className="text-xl font-bold text-ink-900">So&apos;rovingiz yuborildi</strong>
        <p className="text-sm leading-relaxed text-ink-500">
          Ma&apos;lumotlaringiz administrator tomonidan ko&apos;rib chiqilmoqda. Tasdiqlangandan so&apos;ng
          ilova avtomatik ochiladi va sizga xabar beramiz.
        </p>
      </div>

      <Card className="flex w-full max-w-xs items-center gap-3 text-left">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          <Clock size={18} />
        </span>
        <span>
          <strong className="block text-sm text-ink-900">Tasdiq kutilmoqda</strong>
          <small className="block text-xs text-ink-500">Odatda ish vaqtida ko&apos;rib chiqiladi.</small>
        </span>
      </Card>

      <div className="flex w-full max-w-xs flex-col gap-2.5">
        {onRefresh && (
          <Button type="button" size="lg" onClick={onRefresh} disabled={refreshing}>
            <RotateCw size={18} className={refreshing ? "animate-spin" : undefined} />
            {refreshing ? "Tekshirilmoqda..." : "Holatni yangilash"}
          </Button>
        )}
        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-pill border border-surface-200 bg-surface-0 font-semibold text-ink-600 transition-colors hover:bg-surface-100"
          >
            <LogOut size={18} />
            Chiqish
          </button>
        )}
      </div>
    </div>
  );
}
