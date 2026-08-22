"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isOfflineMode } from "../../api/dentalMapApi";
import { validateReceiptFile } from "../../lib/fileUpload";
import { isAllowedPaymeCheckoutUrl, openReceiptDocument } from "../../lib/paymentSecurity";
import {
  fetchCards,
  fetchReceipts,
  fetchSubscription,
  initiatePayme,
  submitReceipt,
  type BillingCard,
  type Receipt
} from "../../api/paymentsApi";
import { PAYMENT_RETURN_URL } from "../../lib/publicConfig";

/** Open an exact allowlisted Payme URL, preferring Telegram's in-app browser. */
export function openPaymeCheckout(url: string) {
  if (typeof window === "undefined" || !isAllowedPaymeCheckoutUrl(url)) {
    return false;
  }
  const parsed = new URL(url);
  const tg = window.Telegram?.WebApp;
  if (tg?.openLink) {
    tg.openLink(parsed.href);
  } else {
    const opened = window.open(parsed.href, "_blank", "noopener,noreferrer");
    if (opened) {
      try {
        opened.opener = null;
      } catch {
        // noopener remains the primary protection for cross-origin windows.
      }
    }
  }
  return true;
}

/** Where Payme sends the phone after checkout.
 *
 * A Telegram link, not our own origin. Payme opens in the system browser on
 * iOS, so returning to our web URL loaded a second copy of the app in Safari
 * and left the real Mini App sitting behind Telegram, unrefreshed. The marker
 * rides along so whichever surface receives it can refresh the subscription.
 *
 * Empty when no Telegram link is configured, which the backend reads as "no
 * return URL" -- Payme then ends on its own receipt page. Worse than landing
 * back in the app, better than landing in a browser copy of it.
 */
function currentReturnUrl() {
  if (!PAYMENT_RETURN_URL) {
    return "";
  }
  const returnUrl = new URL(PAYMENT_RETURN_URL);
  // startapp is the direct-link Mini App's payload; start is the bot's. Setting
  // the one that matches the link shape keeps the marker readable either way.
  returnUrl.searchParams.set(
    returnUrl.pathname.replace(/^\/+|\/+$/g, "").includes("/") ? "startapp" : "start",
    "payment_return"
  );
  return returnUrl.href;
}

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
  const [subscriptionAmountUzs, setSubscriptionAmountUzs] = useState<number | null>(
    offline ? defaultAmountUzs : null
  );
  const [subscriptionLoading, setSubscriptionLoading] = useState(!offline);
  const [subscriptionError, setSubscriptionError] = useState("");
  const [pricingRevision, setPricingRevision] = useState(0);

  const [amount, setAmount] = useState(offline ? String(defaultAmountUzs) : "");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [latestReceipt, setLatestReceipt] = useState<Receipt | null>(null);
  const submittingRef = useRef(false);

  const [payingWithPayme, setPayingWithPayme] = useState(false);
  const [paymeError, setPaymeError] = useState("");
  const [paymeStarted, setPaymeStarted] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  useEffect(() => {
    if (offline) {
      setCards(DEMO_CARDS);
      setSelectedCardId(DEMO_CARDS[0].id);
      setSubscriptionAmountUzs(defaultAmountUzs);
      setSubscriptionLoading(false);
      setSubscriptionError("");
      setAmount(String(defaultAmountUzs));
      setCardsLoading(false);
      return;
    }

    const controller = new AbortController();
    setCardsLoading(true);
    setLoadError("");
    let active = true;

    setSubscriptionAmountUzs(null);
    setSubscriptionLoading(true);
    setSubscriptionError("");
    setAmount("");
    void fetchSubscription(controller.signal)
      .then((subscription) => {
        if (!active) {
          return;
        }
        const authoritativeAmount = Number(subscription.amount_uzs);
        if (!Number.isSafeInteger(authoritativeAmount) || authoritativeAmount <= 0) {
          throw new Error("Server noto'g'ri obuna narxini qaytardi.");
        }
        setSubscriptionAmountUzs(authoritativeAmount);
        setAmount(String(authoritativeAmount));
      })
      .catch((error) => {
        if (!active || controller.signal.aborted) {
          return;
        }
        setSubscriptionAmountUzs(null);
        setAmount("");
        setSubscriptionError(
          error instanceof Error ? error.message : "Obuna narxi yuklanmadi."
        );
      })
      .finally(() => {
        if (active && !controller.signal.aborted) {
          setSubscriptionLoading(false);
        }
      });

    void fetchReceipts(controller.signal)
      .then((receipts) => {
        if (active && receipts[0]) {
          setLatestReceipt(receipts[0]);
        }
      })
      .catch(() => {
        // Receipt history must not block the payment screen.
      });

    void (async () => {
      try {
        const cardList = await fetchCards(controller.signal);
        if (!active) {
          return;
        }
        setCards(cardList);
        setSelectedCardId((current) => current ?? cardList[0]?.id ?? null);
      } catch (error) {
        if (!controller.signal.aborted && active) {
          setLoadError(error instanceof Error ? error.message : "Kartalarni yuklab bo'lmadi.");
        }
      } finally {
        if (!controller.signal.aborted && active) {
          setCardsLoading(false);
        }
      }
    })();

    return () => {
      active = false;
      controller.abort();
    };
  }, [defaultAmountUzs, offline, pricingRevision]);

  const submit = useCallback(async () => {
    // A pending receipt (already submitted, awaiting admin review) blocks
    // resubmission the same way a fresh "submitted" flag does.
    if (submittingRef.current || submitted || latestReceipt?.status === "pending") {
      return;
    }
    const amountValue = Number(amount);
    if (subscriptionAmountUzs === null || subscriptionError) {
      setSubmitError("Tasdiqlangan obuna narxi yuklanmaguncha to'lov yuborilmaydi.");
      return;
    }
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
    const fileError = validateReceiptFile(file);
    if (fileError) {
      setSubmitError(fileError);
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
        created_at: new Date().toISOString(),
        // A demo id has no payment behind it, so there is no document to open.
        receipt_url: null
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
        created_at: new Date().toISOString(),
        // The document only exists once the payment is settled; a just-uploaded
        // receipt is still awaiting review.
        receipt_url: null
      });
      setSubmitted(true);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Chek yuborilmadi. Qayta urinib ko'ring.");
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [
    amount,
    cards,
    file,
    latestReceipt,
    note,
    offline,
    selectedCardId,
    submitted,
    subscriptionAmountUzs,
    subscriptionError
  ]);

  const payWithPayme = useCallback(async () => {
    if (offline) {
      setPaymeError("Onlayn to'lov demo rejimida mavjud emas.");
      return;
    }
    if (subscriptionAmountUzs === null || subscriptionError) {
      setPaymeError("Tasdiqlangan obuna narxi yuklanmaguncha Payme to'lovi ochilmaydi.");
      return;
    }
    setPaymeError("");
    setPayingWithPayme(true);
    try {
      const checkout = await initiatePayme(currentReturnUrl());
      if (Number(checkout.amount_uzs) !== subscriptionAmountUzs) {
        throw new Error("Payme summasi tasdiqlangan obuna narxiga mos emas.");
      }
      if (!openPaymeCheckout(checkout.checkout_url)) {
        throw new Error("Payme ruxsat etilgan checkout manzilini qaytarmadi.");
      }
      setPaymeStarted(true);
    } catch (error) {
      setPaymeError(error instanceof Error ? error.message : "Payme to'lovini boshlab bo'lmadi.");
    } finally {
      setPayingWithPayme(false);
    }
  }, [offline, subscriptionAmountUzs, subscriptionError]);

  const downloadReceipt = useCallback(
    (url: string) => {
      if (offline) {
        return;
      }
      if (openReceiptDocument(url)) {
        setDownloadError("");
        return;
      }
      setDownloadError("Chek havolasi yaroqsiz.");
    },
    [offline]
  );

  // Lets the view re-announce the same failure: a toast keyed on an unchanged
  // string would stay silent on a second tap.
  const clearDownloadError = useCallback(() => setDownloadError(""), []);

  return {
    cards,
    cardsLoading,
    loadError,
    selectedCardId,
    setSelectedCardId,
    subscriptionAmountUzs,
    subscriptionLoading,
    subscriptionError,
    retrySubscription: () => setPricingRevision((value) => value + 1),
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
  };
}
