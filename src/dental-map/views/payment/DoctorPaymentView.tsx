"use client";

import { AlertTriangle, ArrowRight, CheckCircle2, CreditCard, Loader2 } from "lucide-react";
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
 * Doctor subscription payment step: transfer the fee to an admin card, then
 * upload the receipt for admin approval. Replaces the old auto-"paid" flow.
 */
export function DoctorPaymentView({
  subscriptionAmountUzs = 2150000,
  paid,
  onPaid
}: {
  subscriptionAmountUzs?: number;
  paid: boolean;
  onPaid: () => void;
}) {
  const {
    cards,
    cardsLoading,
    loadError,
    selectedCardId,
    setSelectedCardId,
    subscriptionAmountUzs: currentSubscriptionAmountUzs,
    amount,
    setAmount,
    note,
    setNote,
    file,
    setFile,
    submitting,
    submitError,
    submitted,
    latestReceipt,
    submit
  } = useDoctorPayment({ defaultAmountUzs: subscriptionAmountUzs });

  const approved = paid || latestReceipt?.status === "approved";
  const waitingForApproval = submitted || latestReceipt?.status === "pending";

  if (approved || waitingForApproval) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 rounded-2xl bg-brand-50 px-4 py-3.5">
          <CheckCircle2 size={18} className="shrink-0 text-brand-500" />
          <span>
            <strong className="block text-sm font-semibold text-ink-900">
              {approved ? "To'lov tasdiqlandi" : "Chek yuborildi — admin tasdig'ini kuting"}
            </strong>
            <small className="block text-xs text-ink-500">
              {approved
                ? "Doktor kabinetidan foydalanishingiz mumkin."
                : "Administrator chekni tekshirgandan keyin kabinet ochiladi."}
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
            Admin tasdig&apos;i kutilmoqda
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
            Shifokor ma&apos;lumotlari yuborildi
          </strong>
          <small className="block text-xs text-ink-500">
            Obunani faollashtirish uchun to&apos;lovni amalga oshiring va chekni yuklang.
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
              Profil 1 oy davomida faol bo&apos;ladi. Minimal to&apos;lov: {formatUzs(currentSubscriptionAmountUzs)}.
            </small>
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-surface-100 pt-3">
          <span className="font-medium text-ink-700">1 oylik obuna</span>
          <strong className="text-base font-bold text-brand-600">{formatUzs(currentSubscriptionAmountUzs)}</strong>
        </div>
      </Card>

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
        min={currentSubscriptionAmountUzs}
        value={amount}
        disabled={submitting}
        onChange={(event) => setAmount(event.target.value)}
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
        disabled={submitting || cardsLoading || cards.length === 0}
        onClick={() => void submit()}
      >
        {submitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
        {submitting ? "Yuborilmoqda…" : "Chekni yuborish"}
      </Button>
    </div>
  );
}
