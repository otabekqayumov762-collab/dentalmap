"use client";

import { AlertTriangle, CheckCircle2, Download, Loader2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { fetchReceiptData, isBillingDisabledError, type ReceiptData } from "../api/paymentsApi";
import { openReceiptDocument } from "../lib/paymentSecurity";
import { BrandLogo } from "../components/common";
import { Button, cn, inlineActionClass, useToast } from "../ui";

/**
 * The receipt, as a page inside the app.
 *
 * The printable document still exists and is still what a doctor saves as a PDF
 * or forwards to an accountant — but it lives on the API's origin, so opening it
 * meant leaving the mini app for Telegram's in-app browser. That is a bad place
 * to land just to LOOK at your own receipt: the app is gone, the back gesture
 * behaves differently, and nothing about it says Dental Map.
 *
 * So the same fields render natively here, and the document is reserved for the
 * one thing only it can do: be saved as a file.
 */

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  if (!value) {
    return null;
  }
  return (
    <div className="flex items-baseline gap-4 border-t border-surface-100 py-2.5 first:border-t-0">
      <dt className="w-[42%] shrink-0 text-[13px] text-ink-500">{label}</dt>
      <dd
        className={cn(
          "min-w-0 flex-1 text-right text-sm font-semibold tabular-nums text-ink-900",
          // Invoice and transaction references are compared character by
          // character against a bank statement, and are long enough to stretch
          // the row if they are not allowed to wrap inside their own column.
          mono ? "break-all font-mono text-xs font-medium" : "break-words"
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-card border border-surface-200 bg-surface-0 p-4 dark:bg-surface-50">
      <h2 className="mb-1 text-[11px] font-bold uppercase tracking-[0.11em] text-ink-400">{title}</h2>
      <dl className="m-0">{children}</dl>
    </section>
  );
}

export function ReceiptView({ paymentId, onBack }: { paymentId: string; onBack: () => void }) {
  const { toast } = useToast();
  const [data, setData] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setLoading(true);
    setError("");

    void fetchReceiptData(paymentId, controller.signal)
      .then((result) => {
        if (active) {
          setData(result);
        }
      })
      .catch((cause: unknown) => {
        if (!active || controller.signal.aborted) {
          return;
        }
        setData(null);
        setError(
          isBillingDisabledError(cause)
            ? "Chek hozircha mavjud emas."
            : "Chekni yuklab bo'lmadi. Qayta urinib ko'ring."
        );
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
  }, [paymentId, revision]);

  const download = useCallback(() => {
    const url = data?.receipt_url;
    // Same host guard as everywhere else: this URL arrives in an API response
    // and is handed to Telegram.WebApp.openLink, so it is not exempt.
    if (!url || !openReceiptDocument(url)) {
      toast.error("Chek havolasi yaroqsiz.");
    }
  }, [data, toast]);

  if (loading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center gap-2 text-sm text-ink-500" role="status">
        <Loader2 size={18} className="animate-spin" />
        Chek yuklanmoqda…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col gap-4">
        <div role="alert" className="flex items-start gap-2.5 rounded-card bg-danger/10 px-4 py-3.5 text-danger">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <span className="min-w-0 flex-1 text-sm font-medium">{error || "Chek topilmadi."}</span>
        </div>
        <div className="flex gap-3">
          <Button type="button" variant="secondary" size="lg" onClick={onBack}>
            Ortga
          </Button>
          <Button
            type="button"
            variant="gradient"
            size="lg"
            className="flex-1"
            onClick={() => setRevision((n) => n + 1)}
          >
            <RefreshCw size={17} />
            Qayta urinish
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* The amount and the status are what a receipt is opened for; everything
          below is reference material and is set quietly. */}
      <div className="rounded-card border border-surface-200 bg-surface-0 p-5 dark:bg-surface-50">
        <div className="flex items-center gap-2.5">
          <BrandLogo className="h-9 w-9" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-black tracking-tight text-ink-900">
              Dental <span className="text-brand-600">Map</span>
            </div>
            <div className="text-[10px] font-bold uppercase tracking-[0.11em] text-ink-400">
              To&apos;lov tasdiqnomasi
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-ink-400">Chek raqami</div>
            <div className="text-xs font-bold tabular-nums text-ink-900">{data.serial}</div>
          </div>
        </div>

        <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.11em] text-ink-400">
          To&apos;langan summa
        </p>
        <p className="mt-0.5 text-[2rem] font-black leading-tight tracking-tight tabular-nums text-ink-900">
          {data.amount_display}
        </p>
        <span className="mt-3 inline-flex items-center gap-1.5 rounded-pill bg-success/10 px-3 py-1.5 text-[13px] font-bold text-success">
          <CheckCircle2 size={15} />
          {data.status_label}
        </span>
        <p className="mt-3 text-sm text-ink-500">{data.service_label}</p>
      </div>

      {(data.issuer_legal_name || data.issuer_tax_id || data.issuer_address) && (
        <Section title="Xizmat ko'rsatuvchi">
          <Row label="Nomi" value={data.issuer_legal_name} />
          <Row label="STIR" value={data.issuer_tax_id} />
          <Row label="Manzil" value={data.issuer_address} />
        </Section>
      )}

      <Section title="To'lov">
        <Row label="To'lov sanasi" value={data.paid_at} />
        <Row label="Xizmat" value={data.service_label} />
        <Row label="Summa" value={data.amount_display} />
        <Row label="To'lov davri" value={`${data.period_start} – ${data.period_end}`} />
        <Row label="Hisob-faktura raqami" value={data.invoice_reference} mono />
        <Row label="To'lov usuli" value={data.method_label} />
        <Row label="Tranzaksiya ID" value={data.payme_id} mono />
        <Row label="Ichki to'lov ID" value={data.internal_payment_id} mono />
        <Row
          label="To'langan karta"
          value={data.card_masked_number ? `${data.card_holder} — ${data.card_masked_number}` : ""}
        />
        <Row label="Tasdiqlangan vaqt" value={data.reviewed_at} />
        <Row label="Tasdiqlagan" value={data.decided_by} />
      </Section>

      <Section title="To'lovchi">
        <Row label="To'lovchi" value={data.payer_name} />
        <Row label="Telefon" value={data.payer_phone} />
        <Row label="Klinika" value={data.clinic_name} />
        <Row label="Klinika manzili" value={data.clinic_address} />
        <Row label="Mutaxassislik" value={data.specialty} />
      </Section>

      <p className="px-1 text-xs leading-relaxed text-ink-400">
        Hujjat yaratilgan vaqt: {data.generated_at}. Ushbu hujjat Dental Map shifokor obunasi uchun to&apos;lov
        qilinganini tasdiqlaydi. Fiskal chek emas.
      </p>

      {data.receipt_url ? (
        <Button type="button" variant="gradient" size="lg" className="w-full" onClick={download}>
          <Download size={18} />
          PDF sifatida saqlash
        </Button>
      ) : (
        <p className="text-center text-xs text-ink-400">Yuklab olish havolasi hozircha mavjud emas.</p>
      )}
      <button type="button" className={cn(inlineActionClass, "self-center")} onClick={onBack}>
        Ortga
      </button>
    </div>
  );
}
