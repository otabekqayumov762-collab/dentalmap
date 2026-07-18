"use client";

import { AlertTriangle, ArrowRight, CheckCircle2, CreditCard, Loader2, RefreshCw } from "lucide-react";
import { useEffect } from "react";
import { SectionTitle } from "../../components/common";
import { Button, Card, Field, TextareaField } from "../../ui";
import { PaymentCardTile } from "./PaymentCardTile";
import { ReceiptFileField } from "./ReceiptFileField";
import { ReceiptStatusCard } from "./ReceiptStatusCard";
import { useDoctorPayment } from "./useDoctorPayment";

function formatUzs(value: number) {
  return `${value.toLocaleString("ru-RU").replace(/,/g, " ")} so'm`;
}

/**
 * Payment flow is intentionally disabled for the current Dental Map release.
 * Keep this component unmounted until Click/Payme/manual receipt rules are finalized.
 *
 * Doctor subscription payment step: transfer the fee to an admin card, then
 * upload the receipt for admin approval. Replaces the old auto-"paid" flow.
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
    payWithPayme
  } = useDoctorPayment({ defaultAmountUzs: demoSubscriptionAmountUzs });

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

  const approved = paid || latestReceipt?.status === "approved";
  const waitingForApproval = submitted || latestReceipt?.status === "pending";

  if (approved || waitingForApproval) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 rounded-2xl bg-brand-50 px-4 py-3.5">
          <CheckCircle2 size={18} className="shrink-0 text-brand-500" />
          <span>
            <strong className="block text-sm font-semibold text-ink-900">
              {approved ? "To'lov tasdiqlandi" : "Chek yuborildi"}
            </strong>
            <small className="block text-xs text-ink-500">
              {approved
                ? "Doktor kabinetidan foydalanishingiz mumkin."
                : "Chek tekshirilgandan keyin kabinet ochiladi."}
            </small>
          </span>
        </div>

        {latestReceipt && <ReceiptStatusCard receipt={latestReceipt} />}

        {approved ? (
          <Button type="button" size="lg" onClick={onPaid}>
            Ilovaga o&apos;tish
            <ArrowRight size={18} />
          </Button>
        ) : (
          <Button type="button" size="lg" disabled>
            Tekshiruv kutilmoqda
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 rounded-2xl bg-brand-50 px-4 py-3.5">
        <CheckCircle2 size={18} className="shrink-0 text-brand-500" />
        <span>
          <strong className="block text-sm font-semibold text-ink-900">
            Ro&apos;yxatdan o&apos;tish muvaffaqiyatli — ma&apos;lumotlaringiz qabul qilindi
          </strong>
          <small className="block text-xs text-ink-500">
            Endi obunani faollashtirish uchun to&apos;lovni amalga oshiring va chekni yuklang.
          </small>
        </span>
      </div>

      <Card className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-500">
            <CreditCard size={18} />
          </span>
          <span>
            <strong className="block text-sm font-bold text-ink-900">Shifokor obunasi</strong>
            <small className="block text-xs text-ink-500">
              {currentSubscriptionAmountUzs === null
                ? "Serverdagi obuna narxi tekshirilmoqda."
                : `Profil 1 oy davomida faol bo'ladi. To'lov: ${formatUzs(currentSubscriptionAmountUzs)}.`}
            </small>
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-surface-100 pt-3">
          <span className="font-medium text-ink-700">1 oylik obuna</span>
          <strong className="text-base font-bold text-brand-600">
            {currentSubscriptionAmountUzs === null ? "—" : formatUzs(currentSubscriptionAmountUzs)}
          </strong>
        </div>
        {subscriptionError && (
          <div role="alert" className="flex items-center gap-2 rounded-2xl bg-danger/10 px-3 py-2.5 text-danger">
            <AlertTriangle size={16} className="shrink-0" />
            <small>{subscriptionError}</small>
          </div>
        )}
      </Card>

      <Card className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-500">
            <CreditCard size={18} />
          </span>
          <span className="min-w-0">
            <strong className="block text-sm font-bold text-ink-900">Payme orqali onlayn to&apos;lov</strong>
            <small className="block text-xs text-ink-500">
              Darhol to&apos;lang — tasdiqlash avtomatik, chek yuklash shart emas.
            </small>
          </span>
        </div>

        {paymeError && (
          <div role="alert" className="flex items-center gap-3 rounded-2xl bg-danger/10 px-4 py-3 text-danger">
            <AlertTriangle size={18} className="shrink-0" />
            <small className="text-xs">{paymeError}</small>
          </div>
        )}

        {paymeStarted ? (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-ink-500">
              To&apos;lovni Payme sahifasida yakunlang, so&apos;ng tekshiring.
            </p>
            <Button type="button" variant="secondary" onClick={() => onRefresh?.()}>
              To&apos;ladim — tekshirish
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            onClick={() => void payWithPayme()}
            disabled={payingWithPayme || subscriptionLoading || currentSubscriptionAmountUzs === null}
          >
            {payingWithPayme ? <Loader2 size={18} className="animate-spin" /> : <CreditCard size={18} />}
            {payingWithPayme ? "Ochilmoqda…" : "Payme orqali to'lash"}
          </Button>
        )}
      </Card>

      <div className="flex items-center gap-3 py-1">
        <span className="h-px flex-1 bg-surface-200" />
        <span className="text-xs font-medium text-ink-400">yoki karta orqali</span>
        <span className="h-px flex-1 bg-surface-200" />
      </div>

      <div className="flex flex-col gap-2">
        <SectionTitle title="To'lov uchun karta" />
        <p className="text-xs text-ink-500">
          Quyidagi kartalardan biriga pul o&apos;tkazing, so&apos;ng chekni yuklang.
        </p>

        {cardsLoading ? (
          <div className="flex items-center gap-2 rounded-2xl bg-surface-50 px-4 py-6 text-sm text-ink-500">
            <Loader2 size={16} className="animate-spin" />
            Kartalar yuklanmoqda…
          </div>
        ) : loadError ? (
          <div className="flex items-center gap-3 rounded-2xl bg-danger/10 px-4 py-3 text-danger">
            <AlertTriangle size={18} className="shrink-0" />
            <small className="text-xs">{loadError}</small>
          </div>
        ) : cards.length === 0 ? (
          <div className="rounded-2xl bg-surface-50 px-4 py-6 text-center text-sm text-ink-500">
            Hozircha faol karta yo&apos;q. Administrator bilan bog&apos;laning.
          </div>
        ) : (
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
        )}
      </div>

      <Field
        label="To'lov summasi (so'm)"
        name="amount_uzs"
        type="number"
        inputMode="numeric"
        min={currentSubscriptionAmountUzs ?? undefined}
        value={amount}
        readOnly
        disabled={submitting || subscriptionLoading || currentSubscriptionAmountUzs === null}
        hint="Summa serverdagi faol obuna tarifi bo'yicha belgilanadi."
      />

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
        <div role="alert" className="flex items-center gap-3 rounded-2xl bg-danger/10 px-4 py-3 text-danger">
          <AlertTriangle size={18} className="shrink-0" />
          <span>
            <strong className="block text-sm font-semibold">Chek yuborilmadi</strong>
            <small className="block text-xs opacity-90">{submitError}</small>
          </span>
        </div>
      )}

      <Button
        id="doctor-payment-submit"
        type="button"
        size="lg"
        disabled={
          submitting ||
          cardsLoading ||
          subscriptionLoading ||
          currentSubscriptionAmountUzs === null ||
          cards.length === 0
        }
        onClick={() => void submit()}
      >
        {submitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
        {submitting ? "Yuborilmoqda…" : "Chekni yuborish"}
      </Button>
      {subscriptionError && (
        <Button type="button" variant="secondary" size="lg" onClick={retrySubscription}>
          <RefreshCw size={18} />
          Narxni qayta tekshirish
        </Button>
      )}
    </div>
  );
}
