import { formatUzDate } from "../lib/date";
import { groupSlots, type DaySlots } from "../lib/schedule";
import { authFetchCredentials, usesRefreshCookie } from "../lib/authMode";
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
 * Exchanges the backend-owned HttpOnly refresh cookie for `{access}`. The
 * explicitly gated legacy mode can still send a JSON refresh token during a
 * controlled migration. A single in-flight promise means concurrent 401s
 * trigger at most one exchange; failures clear the in-memory access token.
 */
let refreshInFlight: Promise<boolean> | null = null;
let csrfInFlight: Promise<string> | null = null;

/** Obtain Django's CSRF token before an HttpOnly-cookie auth mutation. Kept in
 * memory; the corresponding non-HttpOnly CSRF cookie is managed by the browser. */
export async function getAuthCsrfToken(): Promise<string> {
  if (!usesRefreshCookie()) {
    return "";
  }
  if (!csrfInFlight) {
    csrfInFlight = (async () => {
      const response = await fetch(getApiUrl("/api/auth/csrf/"), {
        method: "GET",
        cache: "no-store",
        credentials: "include"
      });
      if (!response.ok) {
        throw new Error("Xavfsiz sessiya tayyorlanmadi.");
      }
      const payload = (await response.json()) as { csrf_token?: unknown };
      if (typeof payload.csrf_token !== "string" || !payload.csrf_token) {
        throw new Error("CSRF server javobi noto'g'ri.");
      }
      return payload.csrf_token;
    })().finally(() => {
      csrfInFlight = null;
    });
  }
  return csrfInFlight;
}

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
  const cookieMode = usesRefreshCookie();
  if (!cookieMode && !refresh) {
    return false;
  }
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const csrfToken = cookieMode ? await getAuthCsrfToken() : "";
        const headers = new Headers();
        if (cookieMode) {
          headers.set("X-CSRFToken", csrfToken);
        } else {
          headers.set("Content-Type", "application/json");
        }
        const response = await fetch(getApiUrl("/api/auth/token/refresh/"), {
          method: "POST",
          cache: "no-store",
          credentials: authFetchCredentials(),
          headers,
          body: cookieMode ? undefined : JSON.stringify({ refresh })
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
        storeAuthTokens({
          tokens: {
            access: data.access,
            refresh: cookieMode ? undefined : data.refresh ?? refresh
          }
        });
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
    requestHeaders,
    // Internal: set once we've already retried after a refresh, to prevent loops.
    retry = false
  }: {
    token?: string;
    method?: string;
    body?: BodyInit | null;
    signal?: AbortSignal;
    requestHeaders?: HeadersInit;
    retry?: boolean;
  } = {}
): Promise<T> {
  const headers = new Headers(requestHeaders);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (body && !(body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(getApiUrl(path), {
    method,
    cache: "no-store",
    credentials: authFetchCredentials(),
    headers,
    body,
    signal
  });

  // Access token likely expired (30 min TTL): refresh once and replay the request.
  if (response.status === 401 && token && !retry) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return apiRequest<T>(path, {
        token: getAccessToken(),
        method,
        body,
        signal,
        requestHeaders,
        retry: true
      });
    }
  }

  if (!response.ok) {
    let message = "So'rov bajarilmadi. Qayta urinib ko'ring.";
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
    // Never render a patient's legal name in a public review. The backend may
    // provide a moderated pseudonym; older responses fail closed to a generic
    // label instead of exposing patient_name.
    author: item.author_display || "Tasdiqlangan bemor",
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
          rating: Number(clinic.rating ?? 0)
        }
      ];
    }

    return branches.map((branch) => ({
      id: branch.id,
      name: branch.clinic_name || clinic.name || "Klinika",
      district: branch.district || "Tuman kiritilmagan",
      address: branch.address || "",
      rating: Number(clinic.rating ?? 0),
      lat: toCoordinate(branch.latitude),
      lng: toCoordinate(branch.longitude)
    }));
  });
}

/** Admin-managed "Asosiy yo'nalish" list. Errors remain distinguishable from a
 * legitimate empty catalog so online registration never falls back to fake data. */
export async function fetchSpecialties(signal?: AbortSignal): Promise<Specialty[]> {
  const response = await fetch(getApiUrl("/api/specialties/"), { cache: "no-store", signal });
  if (!response.ok) {
    throw new Error(`Yo'nalishlar yuklanmadi (${response.status}).`);
  }
  return normalizeApiList<Specialty>(await response.json());
}

/** Admin-managed service list. Online failures are intentionally propagated. */
export async function fetchServices(signal?: AbortSignal): Promise<Service[]> {
  const response = await fetch(getApiUrl("/api/services/"), { cache: "no-store", signal });
  if (!response.ok) {
    throw new Error(`Xizmatlar yuklanmadi (${response.status}).`);
  }
  return normalizeApiList<Service>(await response.json());
}
