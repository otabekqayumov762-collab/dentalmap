"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isOfflineMode } from "../../api/dentalMapApi";
import {
  fetchCards,
  fetchReceipts,
  fetchSubscription,
  submitReceipt,
  type BillingCard,
  type Receipt
} from "../../api/paymentsApi";

const MAX_FILE_BYTES = 8 * 1024 * 1024;

/** Two placeholder admin cards so offline/local demos still look real. */
const DEMO_CARDS: BillingCard[] = [
  { id: "demo-uzcard", holder_name: "DENTAL MAP MCHJ", masked_number: "8600 •••• •••• 9012", bank_name: "Uzcard" },
  { id: "demo-humo", holder_name: "DENTAL MAP MCHJ", masked_number: "9860 •••• •••• 0987", bank_name: "Humo" }
];

function formatUzs(value: number) {
  return `${value.toLocaleString("ru-RU").replace(/,/g, " ")} so'm`;
}

export function useDoctorPayment({ defaultAmountUzs }: { defaultAmountUzs: number }) {
  const offline = isOfflineMode();

  const [cards, setCards] = useState<BillingCard[]>([]);
  const [cardsLoading, setCardsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedCardId, setSelectedCardId] = useState<string | number | null>(null);
  const [subscriptionAmountUzs, setSubscriptionAmountUzs] = useState(defaultAmountUzs);

  const [amount, setAmount] = useState(String(defaultAmountUzs));
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [latestReceipt, setLatestReceipt] = useState<Receipt | null>(null);
  const submittingRef = useRef(false);

  useEffect(() => {
    if (offline) {
      setCards(DEMO_CARDS);
      setSelectedCardId(DEMO_CARDS[0].id);
      setSubscriptionAmountUzs(defaultAmountUzs);
      setCardsLoading(false);
      return;
    }

    const controller = new AbortController();
    setCardsLoading(true);
    setLoadError("");
    (async () => {
      try {
        const [cardList, receipts, subscription] = await Promise.all([
          fetchCards(controller.signal),
          fetchReceipts(controller.signal).catch(() => [] as Receipt[]),
          fetchSubscription(controller.signal).catch(() => ({
            amount_uzs: defaultAmountUzs,
            currency: "UZS",
            display: formatUzs(defaultAmountUzs)
          }))
        ]);
        setCards(cardList);
        setSubscriptionAmountUzs(subscription.amount_uzs);
        setAmount((current) => (current === String(defaultAmountUzs) ? String(subscription.amount_uzs) : current));
        setSelectedCardId((current) => current ?? cardList[0]?.id ?? null);
        if (receipts[0]) {
          setLatestReceipt(receipts[0]);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setLoadError(error instanceof Error ? error.message : "Kartalarni yuklab bo'lmadi.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setCardsLoading(false);
        }
      }
    })();

    return () => controller.abort();
  }, [defaultAmountUzs, offline]);

  const submit = useCallback(async () => {
    // A pending receipt (already submitted, awaiting admin review) blocks
    // resubmission the same way a fresh "submitted" flag does.
    if (submittingRef.current || submitted || latestReceipt?.status === "pending") {
      return;
    }
    const amountValue = Number(amount);
    if (selectedCardId === null) {
      setSubmitError("Iltimos, to'lov uchun kartani tanlang.");
      return;
    }
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      setSubmitError("To'lov summasini to'g'ri kiriting.");
      return;
    }
    if (amountValue < subscriptionAmountUzs) {
      setSubmitError(`Minimal to'lov ${formatUzs(subscriptionAmountUzs)}. Kam summa qabul qilinmaydi.`);
      return;
    }
    if (!file) {
      setSubmitError("Iltimos, chek faylini biriktiring.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setSubmitError("Fayl hajmi 8 MB dan oshmasligi kerak.");
      return;
    }

    setSubmitError("");
    submittingRef.current = true;
    setSubmitting(true);

    const selectedCard = cards.find((card) => card.id === selectedCardId);

    if (offline) {
      // Local demo: skip the network, show a simulated pending receipt.
      await new Promise((resolve) => window.setTimeout(resolve, 600));
      setLatestReceipt({
        id: `demo-${Date.now()}`,
        amount_uzs: amountValue,
        status: "pending",
        card_holder: selectedCard?.holder_name ?? "",
        created_at: new Date().toISOString()
      });
      setSubmitted(true);
      submittingRef.current = false;
      setSubmitting(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.set("card_id", String(selectedCardId));
      formData.set("amount_uzs", String(Math.round(amountValue)));
      if (note.trim()) {
        formData.set("note", note.trim());
      }
      formData.set("file", file);

      const created = await submitReceipt(formData);
      setLatestReceipt({
        id: created.id,
        amount_uzs: amountValue,
        status: created.status ?? "pending",
        card_holder: selectedCard?.holder_name ?? "",
        created_at: new Date().toISOString()
      });
      setSubmitted(true);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Chek yuborilmadi. Qayta urinib ko'ring.");
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [amount, cards, file, latestReceipt, note, offline, selectedCardId, submitted, subscriptionAmountUzs]);

  return {
    cards,
    cardsLoading,
    loadError,
    selectedCardId,
    setSelectedCardId,
    subscriptionAmountUzs,
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
  };
}
