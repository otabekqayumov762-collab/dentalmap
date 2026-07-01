import { formatUzDate } from "../lib/date";
import type {
  ApiAppointment,
  ApiClinic,
  ApiDoctor,
  ApiReview,
  ApiWeeklyAvailability,
  Clinic,
  Doctor,
  DoctorReview
} from "../types";

const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/[/]+$/, "") || "";

export const API_BASE_URL =
  configuredApiUrl || (process.env.NODE_ENV === "development" ? "http://localhost:8000" : "");

export function isBackendConfigured() {
  return Boolean(API_BASE_URL);
}

/** When true, the app creates/uses local accounts instead of calling the backend
 *  (set NEXT_PUBLIC_LOCAL_MODE=true). Keeps backend code intact for later. */
export function isLocalMode() {
  return process.env.NEXT_PUBLIC_LOCAL_MODE === "true";
}

/** Single decision point for "use local/offline behaviour instead of the API". */
export function isOfflineMode() {
  return isLocalMode() || !isBackendConfigured() || isStaticPreviewHost();
}

export function getApiUrl(path: string) {
  if (!API_BASE_URL) {
    throw new Error("NEXT_PUBLIC_API_URL is required before calling the backend API.");
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

export async function apiRequest<T>(
  path: string,
  {
    token,
    method = "GET",
    body,
    signal
  }: {
    token?: string;
    method?: string;
    body?: BodyInit | null;
    signal?: AbortSignal;
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

  if (!response.ok) {
    let message = `API request failed: ${response.status}`;
    try {
      const errorPayload = await response.json();
      if (typeof errorPayload?.detail === "string") {
        message = errorPayload.detail;
      } else if (typeof errorPayload === "object" && errorPayload) {
        message = Object.values(errorPayload).flat().join(" ");
      }
    } catch {
      // Response body is optional.
    }
    throw new Error(message);
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
    accent: accentColors[index % accentColors.length]
  };
}

export function mapReview(item: ApiReview): DoctorReview {
  return {
    id: item.id,
    appointmentId: item.appointment,
    doctorId: item.doctor,
    author: item.patient_name || "Foydalanuvchi",
    rating: Number(item.rating || 0),
    text: item.comment || "",
    date: item.created_at ? formatUzDate(item.created_at) : "Bugun",
    status: item.status
  };
}

export function appointmentStatusLabel(status: ApiAppointment["status"]) {
  const labels: Record<ApiAppointment["status"], string> = {
    pending: "Doktor tasdig'i kutilmoqda",
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

export function flattenClinics(items: ApiClinic[]): Clinic[] {
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
      rating: Number(clinic.rating ?? 0)
    }));
  });
}
