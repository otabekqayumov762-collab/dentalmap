"use client";

import { CreditCard } from "lucide-react";
import { type KeyboardEvent } from "react";
import type { BillingCard } from "../../api/paymentsApi";
import { Badge, cn } from "../../ui";

/** One admin card, styled like a bank card and selectable (radio semantics). */
export function PaymentCardTile({
  card,
  selected,
  disabled,
  onSelect
}: {
  card: BillingCard;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
}) {
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!disabled) {
        onSelect();
      }
    }
  }

  return (
    <div
      role="radio"
      aria-checked={selected}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onClick={disabled ? undefined : onSelect}
      onKeyDown={onKeyDown}
      className={cn(
        "flex flex-col gap-3 rounded-card border p-4 transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400",
        disabled && "pointer-events-none opacity-55",
        selected
          ? "border-brand-400 bg-brand-50 shadow-card"
          : "cursor-pointer border-surface-100 bg-surface-0 hover:bg-surface-50"
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
            selected ? "bg-brand-500 text-white" : "bg-surface-100 text-ink-500"
          )}
        >
          <CreditCard size={18} />
        </span>
        <Badge tone={selected ? "brand" : "neutral"}>{card.bank_name}</Badge>
      </div>

      <p className="font-mono text-lg font-semibold tracking-[0.18em] text-ink-900">
        {card.masked_number}
      </p>

      <span className="text-xs font-medium uppercase tracking-wide text-ink-500">
        {card.holder_name}
      </span>
      <small className="text-[0.7rem] text-ink-400">
        Xavfsizlik uchun niqoblangan raqam nusxalanmaydi. To&apos;lov rekvizitini bankingizda tekshiring.
      </small>
    </div>
  );
}
