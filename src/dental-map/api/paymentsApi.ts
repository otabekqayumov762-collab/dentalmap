import { getAccessToken } from "../lib/tokenStore";
import { API_BASE_URL, normalizeApiList, parseApiError, refreshAccessToken } from "./dentalMapApi";

/**
 * Thin client for the FastAPI billing API (base = app origin + `/api/v1`).
 * Kept separate from dentalMapApi.ts on purpose — this talks to the v1 billing
 * surface (admin cards + receipt uploads) using the stored bearer token.
 */

const API_V1_PREFIX = "/api/v1";
// FastAPI usually runs on its own origin/port in dev (Django 8010, FastAPI 8011).
// NEXT_PUBLIC_API_V1_URL, when set, is the FULL v1 base (incl. /api/v1).
const configuredV1Base = process.env.NEXT_PUBLIC_API_V1_URL?.trim().replace(/\/+$/, "") || "";

export type BillingCard = {
  id: string | number;
  holder_name: string;
  masked_number: string;
  bank_name: string;
};

export type ReceiptStatus = "pending" | "approved" | "rejected";

export type Receipt = {
  id: string | number;
  amount_uzs: number;
  status: ReceiptStatus;
  card_holder: string;
  created_at: string;
  reject_reason?: string | null;
};

export type ReceiptCreated = {
  id: string | number;
  status: ReceiptStatus;
};

export type BillingSubscription = {
  amount_uzs: number;
  currency: "UZS" | string;
  display: string;
};

/** Absolute URL for a v1 billing endpoint. Throws if the backend is unset. */
export function getApiV1Url(path: string) {
  const suffix = path.startsWith("/") ? path : `/${path}`;
  if (configuredV1Base) {
    return `${configuredV1Base}${suffix}`;
  }
  if (!API_BASE_URL) {
    throw new Error("Ilova server manzili sozlanmagan.");
  }
  return `${API_BASE_URL}${API_V1_PREFIX}${suffix}`;
}

async function requestV1<T>(
  path: string,
  {
    method = "GET",
    body,
    signal,
    retry = false
  }: { method?: string; body?: BodyInit | null; signal?: AbortSignal; retry?: boolean } = {}
): Promise<T> {
  const headers = new Headers();
  const token = getAccessToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  // Never set Content-Type for FormData — the browser adds the multipart boundary.
  if (body && !(body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(getApiV1Url(path), {
    method,
    cache: "no-store",
    credentials: "omit",
    headers,
    body,
    signal
  });

  // Access token expired: refresh once and replay (same as the Django client).
  if (response.status === 401 && token && !retry) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return requestV1<T>(path, { method, body, signal, retry: true });
    }
  }

  if (!response.ok) {
    let message = `Billing request failed: ${response.status}`;
    try {
      message = parseApiError(await response.json(), message);
    } catch {
      // Body is optional.
    }
    throw new Error(message);
  }

  return (await response.json()) as T;
}

/** Active admin cards a doctor can transfer the subscription fee to. */
export async function fetchCards(signal?: AbortSignal): Promise<BillingCard[]> {
  const payload = await requestV1<{ results?: BillingCard[] } | BillingCard[]>("/billing/cards/", { signal });
  return normalizeApiList(payload);
}

/** Current doctor subscription price configured in the admin panel. */
export function fetchSubscription(signal?: AbortSignal): Promise<BillingSubscription> {
  return requestV1<BillingSubscription>("/billing/subscription/", { signal });
}

/** Upload a payment receipt (multipart: card_id, amount_uzs, note?, file). */
export function submitReceipt(formData: FormData): Promise<ReceiptCreated> {
  return requestV1<ReceiptCreated>("/billing/receipts/", { method: "POST", body: formData });
}

/** Receipts the current doctor has submitted, newest first when the API sorts. */
export async function fetchReceipts(signal?: AbortSignal): Promise<Receipt[]> {
  const payload = await requestV1<{ results?: Receipt[] } | Receipt[]>("/billing/receipts/", { signal });
  return normalizeApiList(payload);
}
