"use client";

import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Clock,
  CreditCard,
  Loader2,
  Lock,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Upload
} from "lucide-react";
import { useEffect } from "react";
import { Badge, Button, Card, TextareaField, useToast } from "../../ui";
import { PaymentCardTile } from "./PaymentCardTile";
import { ReceiptFileField } from "./ReceiptFileField";
import { ReceiptStatusCard } from "./ReceiptStatusCard";
import { useDoctorPayment } from "./useDoctorPayment";

function formatUzs(value: number) {
  return `${value.toLocaleString("ru-RU").replace(/,/g, " ")} so'm`;
}

const SUBSCRIPTION_BENEFITS = [
  "Bemorlar sizni qidiruvda topadi",
  "Qabul so'rovlari to'g'ridan-to'g'ri keladi",
  "Telegram bildirishnomalari"
];

/**
 * The fee is the single number a doctor is deciding on, so it gets the strongest
 * colour block on the screen instead of sitting in a text row.
 */
function PriceHero({ amountUzs, loading }: { amountUzs: number | null; loading: boolean }) {
  return (
    <div className="relative overflow-hidden rounded-card bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-5 shadow-float">
      {/* Decorative wash; aria-hidden + pointer-events-none so it never eats a tap. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-brand-400/25 blur-2xl"
      />
      <div className="relative flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-pill bg-surface-0/15 px-2.5 py-1 text-xs font-semibold text-surface-0">
            <BadgeCheck size={13} className="shrink-0" />
            Shifokor obunasi
          </span>
          <span className="text-xs font-medium text-brand-100">1 oy</span>
        </div>

        <div className="flex flex-col gap-0.5">
          {loading || amountUzs === null ? (
            <span className="inline-flex items-center gap-2 text-xl font-bold text-surface-0">
              <Loader2 size={20} className="animate-spin shrink-0" />
              Narx tekshirilmoqda…
            </span>
          ) : (
            <strong className="text-3xl font-bold leading-tight tracking-tight text-surface-0">
              {formatUzs(amountUzs)}
            </strong>
          )}
          <small className="text-xs text-brand-100">
            Profil 1 oy davomida bemorlar ro&apos;yxatida faol bo&apos;ladi.
          </small>
        </div>

        <ul className="flex flex-col gap-1.5 border-t border-surface-0/15 pt-3">
          {SUBSCRIPTION_BENEFITS.map((item) => (
            <li key={item} className="flex items-center gap-2 text-xs text-brand-50">
              <CheckCircle2 size={13} className="shrink-0 text-brand-200" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/**
 * Doctor subscription payment step. Two routes, deliberately unequal in weight:
 * Payme is instant and auto-confirmed (brand colour, elevated, "Tezkor"), while a
 * manual card transfer + receipt upload is the flat accent-coloured fallback.
 */
export function DoctorPaymentView({
  demoSubscriptionAmountUzs = 2150000,
  paid,
  onPaid,
  onRefresh
}: {
  /** Used only by explicit local/demo mode. Online pricing always comes from API. */
  demoSubscriptionAmountUzs?: number;
  paid: boolean;
  onPaid: () => void;
  onRefresh?: () => void;
}) {
  const {
    cards,
    cardsLoading,
    loadError,
    selectedCardId,
    setSelectedCardId,
    subscriptionAmountUzs: currentSubscriptionAmountUzs,
    subscriptionLoading,
    subscriptionError,
    retrySubscription,
    amount,
    note,
    setNote,
    file,
    setFile,
    submitting,
    submitError,
    submitted,
    latestReceipt,
    submit,
    payingWithPayme,
    paymeError,
    paymeStarted,
    payWithPayme,
    downloadReceipt,
    downloadError,
    clearDownloadError
  } = useDoctorPayment({ defaultAmountUzs: demoSubscriptionAmountUzs });
  const { toast } = useToast();
  // Card transfer is a real fallback only when an admin has published a card to
  // transfer TO. `loadError` counts as "no cards" here on purpose: a doctor who
  // cannot even see the card list has nothing to act on, and Payme still works.
  const showCardTransfer = !cardsLoading && !loadError && cards.length > 0;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const url = new URL(window.location.href);
    if (url.searchParams.get("payment_return") !== "payme") {
      return;
    }
    url.searchParams.delete("payment_return");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    onRefresh?.();
  }, [onRefresh]);

  // Clearing after the toast is what lets a second failed tap speak up again.
  useEffect(() => {
    if (!downloadError) {
      return;
    }
    toast.error(downloadError);
    clearDownloadError();
  }, [clearDownloadError, downloadError, toast]);

  const approved = paid || latestReceipt?.status === "approved";
  const waitingForApproval = submitted || latestReceipt?.status === "pending";

  if (approved || waitingForApproval) {
    return (
      <div className="flex flex-col gap-4">
        <div
          className={
            approved
              ? "flex items-start gap-3 rounded-card bg-success/10 px-4 py-4"
              : "flex items-start gap-3 rounded-card bg-warning/10 px-4 py-4"
          }
        >
          <span
            className={
              approved
                ? "flex size-10 shrink-0 items-center justify-center rounded-full bg-success/15 text-success"
                : "flex size-10 shrink-0 items-center justify-center rounded-full bg-warning/15 text-warning"
            }
          >
            {approved ? <CheckCircle2 size={20} /> : <Clock size={20} />}
          </span>
          <span className="min-w-0 flex-1">
            <strong className="block text-sm font-bold text-ink-900">
              {approved ? "To'lov tasdiqlandi" : "Chek yuborildi"}
            </strong>
            <small className="mt-0.5 block text-xs leading-relaxed text-ink-600">
              {approved
                ? "Doktor kabinetidan foydalanishingiz mumkin."
                : "Chek tekshirilgandan keyin kabinet ochiladi."}
            </small>
          </span>
        </div>

        {latestReceipt && (
          <ReceiptStatusCard
            receipt={latestReceipt}
            receiptUrl={latestReceipt.receipt_url ?? null}
            onDownload={downloadReceipt}
          />
        )}

        {approved ? (
          <Button type="button" size="lg" onClick={onPaid}>
            Ilovaga o&apos;tish
            <ArrowRight size={18} />
          </Button>
        ) : (
          <Button type="button" size="lg" disabled>
            <Clock size={18} />
            Tekshiruv kutilmoqda
          </Button>
        )}
      </div>
    );
  }

  const priceReady = currentSubscriptionAmountUzs !== null && !subscriptionLoading;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3 rounded-card bg-brand-50 px-4 py-3.5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-600">
          <CheckCircle2 size={17} />
        </span>
        <span className="min-w-0 flex-1">
          <strong className="block text-sm font-semibold text-ink-900">
            Ro&apos;yxatdan o&apos;tish muvaffaqiyatli — ma&apos;lumotlaringiz qabul qilindi
          </strong>
          <small className="mt-0.5 block text-xs leading-relaxed text-ink-600">
            Endi obunani faollashtirish uchun to&apos;lovni amalga oshiring va chekni yuklang.
          </small>
        </span>
      </div>

      <PriceHero amountUzs={currentSubscriptionAmountUzs} loading={subscriptionLoading} />

      {subscriptionError && (
        <div role="alert" className="flex items-start gap-3 rounded-card bg-danger/10 px-4 py-3 text-danger">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <span className="flex min-w-0 flex-1 flex-col gap-2">
            <small className="text-xs leading-relaxed">{subscriptionError}</small>
            <Button type="button" variant="secondary" size="sm" onClick={retrySubscription} className="self-start">
              <RefreshCw size={15} />
              Narxni qayta tekshirish
            </Button>
          </span>
        </div>
      )}

      {/* Tavsiya etilgan yo'l — brand rangi, ko'tarilgan soya */}
      <Card className="flex flex-col gap-3.5 border-brand-200 shadow-float">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-500 text-surface-0">
            <Sparkles size={20} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-2">
              <strong className="text-sm font-bold text-ink-900">Payme orqali onlayn</strong>
              <Badge tone="brand">Tezkor</Badge>
            </span>
            <small className="mt-0.5 block text-xs leading-relaxed text-ink-500">
              Darhol to&apos;lang — tasdiqlash avtomatik, chek yuklash shart emas.
            </small>
          </span>
        </div>

        {paymeError && (
          <div role="alert" className="flex items-start gap-2.5 rounded-2xl bg-danger/10 px-3.5 py-2.5 text-danger">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <small className="text-xs leading-relaxed">{paymeError}</small>
          </div>
        )}

        {paymeStarted ? (
          <div className="flex flex-col gap-2.5 rounded-2xl bg-brand-50 px-3.5 py-3">
            <p className="text-xs leading-relaxed text-ink-600">
              To&apos;lovni Payme sahifasida yakunlang, so&apos;ng tekshiring.
            </p>
            <Button type="button" variant="secondary" onClick={() => onRefresh?.()}>
              <RefreshCw size={17} />
              To&apos;ladim — tekshirish
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            size="lg"
            onClick={() => void payWithPayme()}
            disabled={payingWithPayme || !priceReady}
          >
            {payingWithPayme ? <Loader2 size={18} className="animate-spin" /> : <CreditCard size={18} />}
            {payingWithPayme ? "Ochilmoqda…" : "Payme orqali to'lash"}
          </Button>
        )}

        <p className="flex items-center gap-1.5 text-xs text-ink-400">
          <ShieldCheck size={13} className="shrink-0 text-brand-500" />
          To&apos;lov Payme&apos;ning xavfsiz sahifasida amalga oshiriladi.
        </p>
      </Card>

      {/* Karta o'tkazmasi faqat admin haqiqatan faol karta qo'yganda ko'rinadi.
          Kartasiz bu blok "Hozircha faol karta yo'q" deb turadi-yu, ostida summa,
          chek yuklash maydoni va o'chirilgan yuborish tugmasi qoladi — ya'ni
          shifokorga bajarib bo'lmaydigan ish taklif qiladi. Bunday holda butun
          zaxira yo'l yashiriladi va sahifa faqat Payme'dan iborat bo'ladi.
          Yuklanish paytida ham ko'rsatmaymiz: karta bormi-yo'qmi hali noma'lum,
          blok bir zumga ochilib keyin yo'qolsa sahifa sakraydi. */}
      {showCardTransfer && (
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-surface-200" />
        <span className="text-xs font-medium text-ink-400">yoki karta orqali</span>
        <span className="h-px flex-1 bg-surface-200" />
      </div>
      )}

      {/* Zaxira yo'l — accent rangi, tekis (soyasiz) */}
      {showCardTransfer && (
      <Card className="flex flex-col gap-3.5 border-surface-200 bg-surface-50 shadow-none">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-accent-100 text-accent-700">
            <Upload size={20} />
          </span>
          <span className="min-w-0 flex-1">
            <strong className="block text-sm font-bold text-ink-900">Karta o&apos;tkazmasi</strong>
            <small className="mt-0.5 block text-xs leading-relaxed text-ink-500">
              Quyidagi kartalardan biriga pul o&apos;tkazing, so&apos;ng chekni yuklang. Tasdiqlash
              administrator tomonidan qo&apos;lda amalga oshiriladi.
            </small>
          </span>
        </div>

        {/* showCardTransfer allaqachon yuklanish va xato holatlarini chetlab
            o'tgan, shuning uchun bu yerda faqat haqiqiy kartalar qoladi. */}
        <div className="flex flex-col gap-2.5">
          {cards.map((card) => (
            <PaymentCardTile
              key={card.id}
              card={card}
              selected={card.id === selectedCardId}
              disabled={submitting}
              onSelect={() => setSelectedCardId(card.id)}
            />
          ))}
        </div>

        {/* The amount is server-authoritative, so it is shown as a locked value
            instead of an input a doctor might believe they can change. */}
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-surface-0 px-4 py-3">
          <span className="flex items-center gap-2 text-xs font-medium text-ink-500">
            <Lock size={13} className="shrink-0" />
            To&apos;lov summasi
          </span>
          <strong className="text-sm font-bold text-ink-900">
            {currentSubscriptionAmountUzs === null ? "—" : formatUzs(currentSubscriptionAmountUzs)}
          </strong>
        </div>
        <input type="hidden" name="amount_uzs" value={amount} readOnly />

        <ReceiptFileField file={file} disabled={submitting} onFileChange={setFile} />

        <TextareaField
          label="Izoh (ixtiyoriy)"
          name="note"
          placeholder="Masalan, to'lov sanasi yoki qo'shimcha ma'lumot"
          value={note}
          disabled={submitting}
          onChange={(event) => setNote(event.target.value)}
        />

        {submitError && (
          <div role="alert" className="flex items-start gap-3 rounded-2xl bg-danger/10 px-4 py-3 text-danger">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <span className="min-w-0 flex-1">
              <strong className="block text-sm font-semibold">Chek yuborilmadi</strong>
              <small className="mt-0.5 block text-xs leading-relaxed opacity-90">{submitError}</small>
            </span>
          </div>
        )}

        <Button
          id="doctor-payment-submit"
          type="button"
          variant="secondary"
          size="lg"
          disabled={submitting || !priceReady}
          onClick={() => void submit()}
        >
          {submitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
          {submitting ? "Yuborilmoqda…" : "Chekni yuborish"}
        </Button>
      </Card>
      )}
    </div>
  );
}
