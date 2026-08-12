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

/**
 * What the user is told when an auth endpoint answers 429.
 *
 * A throttle is the one auth failure that cures itself, so it must not share
 * wording with a dead network: "Xavfsiz sessiya tayyorlanmadi." reads as a
 * broken app and invites the user to keep tapping, which spends the same bucket.
 */
export const THROTTLED_MESSAGE = "Server band. Bir daqiqadan so'ng qayta urinib ko'ring.";

/** A 429 from an auth endpoint, distinguishable from every other failure so the
 *  caller can decline to "recover" by spending the bucket it just emptied. */
export class ThrottledError extends Error {
  readonly retryAfterSeconds: number | null;

  constructor(retryAfterSeconds: number | null = null) {
    super(THROTTLED_MESSAGE);
    this.name = "ThrottledError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/** Checked by name as well as by prototype: the error crosses async boundaries
 *  and, once bundled, `instanceof` alone is a class-identity bet. */
export function isThrottledError(error: unknown): error is ThrottledError {
  if (error instanceof ThrottledError) {
    return true;
  }
  return Boolean(error) && typeof error === "object" && (error as Error).name === "ThrottledError";
}

/** DRF sends `Retry-After: <whole seconds>`. A missing header, an HTTP-date or
 *  a proxy that stripped it all read as "no idea", never as zero. */
export function parseRetryAfterSeconds(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }
  const seconds = Number(value.trim());
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : null;
}

/** Response shape both a real `Response` and the tests satisfy. */
type RetryAfterCarrier = { headers?: { get?: (name: string) => string | null } };

export function throttledErrorFrom(response: RetryAfterCarrier): ThrottledError {
  return new ThrottledError(parseRetryAfterSeconds(response.headers?.get?.("Retry-After")));
}

/**
 * The CSRF pre-flight gets ONE retry, and only when the server itself promises
 * a wait no longer than this. Cold-start awaits this call, so sleeping out a
 * full 60-second window would hold the boot spinner far past the point where the
 * user gives up; a long wait is reported instead of waited out. The ceiling also
 * caps the amplification: two requests, never a loop.
 */
export const CSRF_RETRY_CEILING_MS = 2000;

/** Obtain Django's CSRF token before an HttpOnly-cookie auth mutation. Kept in
 * memory; the corresponding non-HttpOnly CSRF cookie is managed by the browser. */
export async function getAuthCsrfToken(): Promise<string> {
  if (!usesRefreshCookie()) {
    return "";
  }
  if (!csrfInFlight) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REFRESH_TIMEOUT_MS);
    csrfInFlight = (async () => {
      const request = () =>
        fetch(getApiUrl("/api/auth/csrf/"), {
          method: "GET",
          cache: "no-store",
          credentials: "include",
          // Bounded for the same reason as the refresh below: session restore
          // awaits this, so a socket that hangs would hold the boot spinner forever.
          signal: controller.signal
        });
      let response = await request();
      if (response.status === 429) {
        const retryAfterSeconds = parseRetryAfterSeconds(response.headers?.get?.("Retry-After"));
        const waitMs = retryAfterSeconds === null ? null : retryAfterSeconds * 1000;
        if (waitMs !== null && waitMs <= CSRF_RETRY_CEILING_MS) {
          await new Promise((resolve) => setTimeout(resolve, waitMs));
          response = await request();
        }
      }
      if (response.status === 429) {
        // This is where the Mini App used to die: the cold-start pre-flight is
        // on the same throttle bucket as the mutations it protects, and a plain
        // throw here was indistinguishable from an outage. Raised as itself so
        // the cold-start handler stops retrying into an empty bucket.
        throw throttledErrorFrom(response);
      }
      if (!response.ok) {
        throw new Error("Xavfsiz sessiya tayyorlanmadi.");
      }
      const payload = (await response.json()) as { csrf_token?: unknown };
      if (typeof payload.csrf_token !== "string" || !payload.csrf_token) {
        throw new Error("CSRF server javobi noto'g'ri.");
      }
      return payload.csrf_token;
    })().finally(() => {
      clearTimeout(timeout);
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

/**
 * Does this refresh response mean the session itself is over?
 *
 * Only the server refusing the refresh credential does. Everything else is
 * transient and must NOT end the session:
 *   - 429: the backend auth throttle is keyed on the client's public IP, and
 *     Uzbek carriers (Ucell/Beeline/UzMobile) put thousands of subscribers
 *     behind one CGNAT address — so a handful of strangers opening the app
 *     used to log everybody on that carrier out and dump them on the auth wall.
 *   - 5xx / network errors: a blip, not a verdict on the token.
 */
export function endsSessionOnRefresh(status: number): boolean {
  return status === 401 || status === 403;
}

/**
 * A refresh that never settles is worse than one that fails: the cookie-mode
 * session restore in useDentalData awaits this before it will render anything,
 * so a hung socket leaves the user on the boot spinner with no message at all.
 * Bound it the same way the Telegram auth call is bounded.
 */
export const REFRESH_TIMEOUT_MS = 8000;

export async function refreshAccessToken(): Promise<boolean> {
  const refresh = getRefreshToken();
  const cookieMode = usesRefreshCookie();
  if (!cookieMode && !refresh) {
    return false;
  }
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REFRESH_TIMEOUT_MS);
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
          signal: controller.signal,
          body: cookieMode ? undefined : JSON.stringify({ refresh })
        });
        if (!response.ok) {
          if (endsSessionOnRefresh(response.status)) {
            storeAuthTokens({});
          }
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
        // Network failure, abort, or the CSRF pre-flight throwing (it is on the
        // same throttled scope). Keep the tokens: the next attempt may succeed.
        return false;
      } finally {
        clearTimeout(timeout);
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

