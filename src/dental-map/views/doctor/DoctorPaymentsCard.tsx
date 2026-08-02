"use client";

import { AlertTriangle, Loader2, ReceiptText, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { isOfflineMode } from "../../api/dentalMapApi";
import { fetchPayments, isBillingDisabledError, type PaymentHistoryItem } from "../../api/paymentsApi";
import { Badge, Button, Card } from "../../ui";
import { SectionHeader } from "./common";

const METHOD_LABELS: Record<string, string> = {
  payme: "Payme (onlayn)",
  manual_card: "Karta o'tkazmasi"
};

function formatUzs(value: number) {
  return `${value.toLocaleString("ru-RU").replace(/,/g, " ")} so'm`;
}

/** dd.mm.yyyy HH:MM in the device timezone — the same shape the document prints. */
function formatPaidAt(value?: string | null) {
  if (!value) {
    return "";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${pad(parsed.getDate())}.${pad(parsed.getMonth() + 1)}.${parsed.getFullYear()} ${pad(
    parsed.getHours()
  )}:${pad(parsed.getMinutes())}`;
}

function methodLabel(payment: PaymentHistoryItem) {
  return METHOD_LABELS[payment.method] || METHOD_LABELS[payment.provider] || "To'lov";
}

/**
 * The doctor's own settled-payment record, and the only durable place to reach a
 * "chek". The payment screen cannot be that place: its gate disappears the moment
 * the subscription turns active, and a Payme payer never reaches its approved
 * branch at all — their flow ends on the "to'ladim, tekshiring" step. Reading
 * payments rather than receipt uploads is what makes both routes visible here,
 * since a Payme payment has no uploaded receipt behind it.
 */
export function DoctorPaymentsCard({ onOpenReceipt }: { onOpenReceipt: (paymentId: string) => void }) {
  const offline = isOfflineMode();
  const [payments, setPayments] = useState<PaymentHistoryItem[]>([]);
  const [loading, setLoading] = useState(!offline);
  const [loadError, setLoadError] = useState("");
  // Billing switched off is not a failure the doctor can act on, so the whole
  // card disappears instead of showing a red alert with a retry that can never
  // succeed — during exactly the window ops are trying to make billing invisible.
  const [billingOff, setBillingOff] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    // Demo mode has no real payment ids, so there is nothing to ask the API for.
    if (offline) {
      return;
    }

    const controller = new AbortController();
    let active = true;
    setLoading(true);
    setLoadError("");
    setBillingOff(false);

    void fetchPayments(controller.signal)
      .then((items) => {
        if (active) {
          setPayments(items);
        }
      })
      .catch((error: unknown) => {
        if (active && !controller.signal.aborted) {
          setPayments([]);
          if (isBillingDisabledError(error)) {
            setBillingOff(true);
          } else {
            setLoadError("To'lovlar tarixi yuklanmadi.");
          }
        }
      })
      .finally(() => {
        if (active && !controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [offline, revision]);

  // Opens the in-app receipt page rather than the document. The document is
  // still one tap away from there, for the download itself — but looking at your
  // own receipt should not cost you the app.
  const openDocument = useCallback((paymentId: string) => onOpenReceipt(paymentId), [onOpenReceipt]);

  // Render nothing at all rather than an empty card with a heading: with billing
  // off there is no payment history to head.
  if (billingOff) {
    return null;
  }

  return (
    <Card className="flex flex-col gap-3.5">
      <SectionHeader Icon={ReceiptText} title="To'lovlar va cheklar" subtitle="Obuna to'lovlari tarixi" />

      {loading ? (
        <div className="flex items-center gap-2 rounded-card bg-surface-50 px-4 py-6 text-sm text-ink-500" role="status">
          <Loader2 size={16} className="animate-spin shrink-0" />
          To&apos;lovlar yuklanmoqda…
        </div>
      ) : loadError ? (
        <div role="alert" className="flex items-start gap-2.5 rounded-card bg-danger/10 px-3.5 py-3 text-danger">
          <AlertTriangle size={17} className="mt-0.5 shrink-0" />
          <span className="flex min-w-0 flex-1 flex-col gap-2">
            <small className="text-xs leading-relaxed">{loadError}</small>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="self-start"
              onClick={() => setRevision((value) => value + 1)}
            >
              <RefreshCw size={15} />
              Qayta urinish
            </Button>
          </span>
        </div>
      ) : payments.length === 0 ? (
        <p className="rounded-card bg-surface-50 px-4 py-6 text-center text-sm text-ink-500">
          Hozircha to&apos;lov qilinmagan.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-surface-100">
          {payments.map((payment) => {
            const documentUrl = typeof payment.receipt_url === "string" ? payment.receipt_url.trim() : "";
            const paidAt = formatPaidAt(payment.confirmed_at ?? payment.created_at);
            return (
              <li key={payment.id} className="flex flex-col gap-2.5 py-3 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-3">
                  <span className="min-w-0 flex-1">
                    <strong className="block truncate text-sm font-bold tabular-nums text-ink-900">
                      {formatUzs(payment.amount_uzs)}
                    </strong>
                    <small className="mt-0.5 block truncate text-xs text-ink-500">
                      {[paidAt, methodLabel(payment)].filter(Boolean).join(" · ")}
                    </small>
                  </span>
                  <Badge tone="success">To&apos;langan</Badge>
                </div>
                {documentUrl ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="self-start"
                    onClick={() => openDocument(String(payment.id))}
                  >
                    <ReceiptText size={15} />
                    Chekni ochish
                  </Button>
                ) : (
                  <small className="text-xs text-ink-500">Chek mavjud emas</small>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
