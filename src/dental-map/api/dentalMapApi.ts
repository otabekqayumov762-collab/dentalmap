import { formatUzDate } from "../lib/date";
import { groupSlots, type DaySlots } from "../lib/schedule";
import { getAccessToken, getRefreshToken, storeAuthTokens } from "../lib/tokenStore";
import type {
  ApiAppointment,
  ApiClinic,
  ApiDoctor,
  ApiReview,
  ApiWeeklyAvailability,
  Clinic,
  Doctor,
  DoctorReview,
  Service,
  Specialty
} from "../types";

const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/[/]+$/, "") || "";

function resolveApiBaseUrl() {
  if (typeof window !== "undefined" && configuredApiUrl) {
    try {
      const configured = new URL(configuredApiUrl);
      const localApi = configured.hostname === "localhost" || configured.hostname === "127.0.0.1";
      const localApp = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
      if (localApi && !localApp) {
        return window.location.origin;
      }
    } catch {
      return configuredApiUrl;
    }
  }

  return configuredApiUrl || (process.env.NODE_ENV === "development" ? "http://localhost:8000" : "");
}

export const API_BASE_URL = resolveApiBaseUrl();

export function isBackendConfigured() {
  return Boolean(API_BASE_URL);
}

/** When true, the app creates/uses local accounts instead of calling the backend
 *  (set NEXT_PUBLIC_LOCAL_MODE=true). Keeps backend code intact for later. */
export function isLocalMode() {
  return process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_LOCAL_MODE === "true";
}

/** Single decision point for "use local/offline behaviour instead of the API". */
export function isOfflineMode() {
  if (typeof window !== "undefined" && window.Telegram?.WebApp) {
    return isLocalMode();
  }
  return isLocalMode() || isStaticPreviewHost();
}

export function getApiUrl(path: string) {
  if (!API_BASE_URL) {
    throw new Error("Ilova server manzili sozlanmagan.");
  }

  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function isStaticPreviewHost() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.location.hostname.endsWith("github.io") || window.location.protocol === "file:";
}

export function normalizeApiList<T>(payload: { results?: T[] } | T[]): T[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  return Array.isArray(payload.results) ? payload.results : [];
}

/**
 * Exchanges the stored refresh token for a fresh access token via SimpleJWT
 * (`POST /api/auth/token/refresh/` → `{access, refresh?}`). A single in-flight
 * promise is shared so concurrent 401s trigger at most one refresh. On any
 * failure the tokens are cleared so the app falls back to the auth wall.
 */
let refreshInFlight: Promise<boolean> | null = null;

/** Human-readable message from a DRF ({detail}/{field:[...]}) or FastAPI 422
 *  ({detail:[{msg}]}) error body — avoids the "[object Object]" garble. */
export function parseApiError(payload: unknown, fallback = "Xatolik yuz berdi."): string {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }
  const detail = (payload as { detail?: unknown }).detail;
  if (typeof detail === "string") {
    return detail;
  }
  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => (typeof item === "string" ? item : (item as { msg?: string })?.msg))
      .filter((value): value is string => Boolean(value));
    if (messages.length) {
      return messages.join(" ");
    }
  }
  const values = Object.values(payload as Record<string, unknown>)
    .flat()
    .filter((value): value is string => typeof value === "string");
  return values.length ? values.join(" ") : fallback;
}

export async function refreshAccessToken(): Promise<boolean> {
  const refresh = getRefreshToken();
  if (!refresh) {
    return false;
  }
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const response = await fetch(getApiUrl("/api/auth/token/refresh/"), {
          method: "POST",
          cache: "no-store",
          credentials: "omit",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh })
        });
        if (!response.ok) {
          storeAuthTokens({});
          return false;
        }
        const data = (await response.json()) as { access?: string; refresh?: string };
        if (!data.access) {
          storeAuthTokens({});
          return false;
        }
        // SimpleJWT may rotate the refresh token; keep the old one if it doesn't.
        storeAuthTokens({ tokens: { access: data.access, refresh: data.refresh ?? refresh } });
        return true;
      } catch {
        storeAuthTokens({});
        return false;
      } finally {
        refreshInFlight = null;
      }
    })();
  }
  return refreshInFlight;
}

export async function apiRequest<T>(
  path: string,
  {
    token,
    method = "GET",
    body,
    signal,
    // Internal: set once we've already retried after a refresh, to prevent loops.
    retry = false
  }: {
    token?: string;
    method?: string;
    body?: BodyInit | null;
    signal?: AbortSignal;
    retry?: boolean;
  } = {}
): Promise<T> {
  const headers = new Headers();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (body && !(body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(getApiUrl(path), {
    method,
    cache: "no-store",
    credentials: "omit",
    headers,
    body,
    signal
  });

  // Access token likely expired (30 min TTL): refresh once and replay the request.
  if (response.status === 401 && token && !retry) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return apiRequest<T>(path, { token: getAccessToken(), method, body, signal, retry: true });
    }
  }

  if (!response.ok) {
    let message = `API request failed: ${response.status}`;
    try {
      message = parseApiError(await response.json(), message);
    } catch {
      // Response body is optional.
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

const accentColors = ["#22b8ad", "#1d7eea", "#ef476f", "#7c3aed", "#0f8fe8"];

export function mapDoctor(item: ApiDoctor, index: number): Doctor {
  return {
    id: item.id,
    name: item.full_name || "Shifokor",
    specialty: item.specialty || "Stomatolog",
    rating: Number(item.rating ?? 0),
    reviews: item.reviews_count ?? 0,
    experience: typeof item.experience_years === "number" ? `${item.experience_years} yil` : "",
    clinic: item.clinic_name || "Klinika tanlanmagan",
    district: item.clinic_district || "Tuman kiritilmagan",
    address: item.clinic_address || "",
    locationUrl: item.clinic_location_url || undefined,
    phone: item.doctor_phone || "",
    nextSlot: "",
    image: item.photo || undefined,
    accent: accentColors[index % accentColors.length],
    gender: item.gender || ""
  };
}

export function mapReview(item: ApiReview): DoctorReview {
  return {
    id: item.id,
    appointmentId: item.appointment,
    doctorId: item.doctor,
    clinic: item.clinic_name || undefined,
    clinicDistrict: item.clinic_district || undefined,
    clinicAddress: item.clinic_address || undefined,
    author: item.patient_name || "Foydalanuvchi",
    rating: Number(item.rating || 0),
    text: item.comment || "",
    date: item.created_at ? formatUzDate(item.created_at) : "Bugun",
    status: item.status
  };
}

export function appointmentStatusLabel(status: ApiAppointment["status"]) {
  const labels: Record<ApiAppointment["status"], string> = {
    pending: "Shifokor tasdig'i kutilmoqda",
    doctor_confirmed: "Tasdiqlangan",
    doctor_rejected: "Rad etilgan",
    user_cancelled: "Bekor qilingan",
    completed: "Yakunlangan",
    no_show: "Kelmagan"
  };
  return labels[status] || status;
}

export function weekdayLabel(weekday: number) {
  return ["Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba", "Yakshanba"][weekday] || "Kun";
}

export function normalizeSchedule(items: { results?: ApiWeeklyAvailability[] } | ApiWeeklyAvailability[]) {
  return normalizeApiList(items).sort((left, right) => left.weekday - right.weekday || left.start_time.localeCompare(right.start_time));
}

/**
 * Public bookable slots for a doctor, grouped by day. THROWS on network/HTTP
 * failure so the caller can distinguish "no slots" (empty array) from "could not
 * load" (error) and render the right state — a swallowed `[]` previously made an
 * error look identical to a doctor with no availability.
 */
export async function fetchDoctorDaySlots(doctorId: string): Promise<DaySlots[]> {
  // The endpoint is paginated ({count, page, pages, results}, page_size max 100).
  // Reading only page 1 silently truncated the schedule to the first ~3 days, so
  // later days looked like the doctor had no availability. Fetch every page.
  type SlotPage = {
    results?: Array<{ date?: string; start_time?: string }>;
    pages?: number;
  };
  const list: Array<{ date?: string; start_time?: string }> = [];
  let page = 1;
  let pages = 1;
  const MAX_PAGES = 10; // safety cap: 1000 slots is far beyond the booking window
  do {
    const response = await fetch(
      getApiUrl(
        `/api/availability/slots/active/?doctor=${encodeURIComponent(doctorId)}&page=${page}&page_size=100`
      ),
      { cache: "no-store" }
    );
    if (!response.ok) {
      throw new Error(`Bo'sh vaqtlarni yuklab bo'lmadi (${response.status}).`);
    }
    const data = (await response.json()) as SlotPage | Array<{ date?: string; start_time?: string }>;
    if (Array.isArray(data)) {
      list.push(...data);
      break;
    }
    list.push(...(data.results ?? []));
    pages = Number(data.pages ?? 1);
    page += 1;
  } while (page <= pages && page <= MAX_PAGES);
  return groupSlots(list);
}

export function flattenClinics(items: ApiClinic[]): Clinic[] {
  const toCoordinate = (value: string | number | null | undefined) => {
    if (value === null || value === undefined || value === "") {
      return undefined;
    }
    const coordinate = Number(value);
    return Number.isFinite(coordinate) ? coordinate : undefined;
  };

  return items.flatMap((clinic) => {
    const branches = clinic.branches?.filter((branch) => branch.is_active !== false) ?? [];
    if (branches.length === 0) {
      return [
        {
          id: clinic.id,
          name: clinic.name || "Klinika",
          district: "Tuman kiritilmagan",
          address: "",
          workTime: "",
          rating: Number(clinic.rating ?? 0)
        }
      ];
    }

    return branches.map((branch) => ({
      id: branch.id,
      name: branch.clinic_name || clinic.name || "Klinika",
      district: branch.district || "Tuman kiritilmagan",
      address: branch.address || "",
      workTime: branch.work_time || "",
      rating: Number(clinic.rating ?? 0),
      lat: toCoordinate(branch.latitude),
      lng: toCoordinate(branch.longitude)
    }));
  });
}

/**
 * Admin-managed "Asosiy yo'nalish" list (GET /api/specialties/). Returns a plain
 * JSON array. Swallows ALL errors (incl. AbortError and the getApiUrl "unset base
 * URL" throw) and returns [] so the caller falls back to the catalog constants.
 */
export async function fetchSpecialties(signal?: AbortSignal): Promise<Specialty[]> {
  try {
    const response = await fetch(getApiUrl("/api/specialties/"), { cache: "no-store", signal });
    if (!response.ok) {
      return [];
    }
    return normalizeApiList<Specialty>(await response.json());
  } catch {
    return [];
  }
}

/**
 * Admin-managed "Ko'rsatiladigan xizmatlar" list (GET /api/services/). Returns a
 * plain JSON array. Swallows ALL errors and returns [] so the caller falls back
 * to the catalog constants.
 */
export async function fetchServices(signal?: AbortSignal): Promise<Service[]> {
  try {
    const response = await fetch(getApiUrl("/api/services/"), { cache: "no-store", signal });
    if (!response.ok) {
      return [];
    }
    return normalizeApiList<Service>(await response.json());
  } catch {
    return [];
  }
}
