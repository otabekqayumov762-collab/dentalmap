"use client";

import { Check, Copy, CreditCard } from "lucide-react";
import { useState, type KeyboardEvent } from "react";
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
  const [copied, setCopied] = useState(false);

  async function copyNumber() {
    try {
      await navigator.clipboard.writeText(card.masked_number.replace(/\s+/g, ""));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard may be blocked — the number stays visible for manual copy.
    }
  }

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

      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium uppercase tracking-wide text-ink-500">
          {card.holder_name}
        </span>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            void copyNumber();
          }}
          className={cn(
            "inline-flex items-center gap-1 rounded-pill px-2.5 py-1 text-xs font-semibold transition-colors",
            copied ? "bg-success/10 text-success" : "bg-surface-100 text-ink-600 hover:bg-surface-200"
          )}
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? "Nusxa olindi" : "Nusxa olish"}
        </button>
      </div>
    </div>
  );
}
