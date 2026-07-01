import { CheckCircle2, Clock, XCircle, type LucideIcon } from "lucide-react";
import type { Receipt, ReceiptStatus } from "../../api/paymentsApi";
import { cn } from "../../ui";

const STATUS: Record<ReceiptStatus, { label: string; text: string; Icon: LucideIcon; wrap: string; icon: string }> = {
  pending: {
    label: "Admin tasdig'i kutilmoqda",
    text: "Chek yuborildi. Administrator tekshiruvidan so'ng profil faollashadi.",
    Icon: Clock,
    wrap: "bg-amber-50 text-amber-800",
    icon: "text-amber-500"
  },
  approved: {
    label: "To'lov tasdiqlandi",
    text: "Obuna faol. Endi to'liq ishlashingiz mumkin.",
    Icon: CheckCircle2,
    wrap: "bg-emerald-50 text-emerald-800",
    icon: "text-emerald-500"
  },
  rejected: {
    label: "To'lov rad etildi",
    text: "Chek qabul qilinmadi. Iltimos, to'g'ri chek bilan qayta yuboring.",
    Icon: XCircle,
    wrap: "bg-rose-50 text-rose-700",
    icon: "text-rose-500"
  }
};

/** Compact status panel for the doctor's latest submitted receipt. */
export function ReceiptStatusCard({ receipt }: { receipt: Receipt }) {
  const meta = STATUS[receipt.status] ?? STATUS.pending;
  const { Icon } = meta;

  return (
    <div className={cn("flex flex-col gap-2 rounded-2xl px-4 py-3.5", meta.wrap)}>
      <div className="flex items-start gap-3">
        <Icon size={18} className={cn("mt-0.5 shrink-0", meta.icon)} />
        <span>
          <strong className="block text-sm font-semibold">{meta.label}</strong>
          <small className="block text-xs leading-snug opacity-90">{meta.text}</small>
        </span>
      </div>
      {receipt.status === "rejected" && receipt.reject_reason && (
        <p className="rounded-xl bg-white/70 px-3 py-2 text-xs font-medium">
          Sabab: {receipt.reject_reason}
        </p>
      )}
    </div>
  );
}
