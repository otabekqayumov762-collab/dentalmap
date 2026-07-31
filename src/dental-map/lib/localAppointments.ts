// Local (no-backend) persistence for appointments + reviews so the full booking
// → doctor confirms → patient reviews loop is testable offline. sessionStorage
// keeps medical/demo data scoped to the current browser tab.

import type { ApiAppointment, ApiReview } from "../types";

const APPT_KEY = "dentalmap_local_appointments";
const REVIEW_KEY = "dentalmap_local_reviews";

function read<T>(key: string): T[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.sessionStorage.getItem(key);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function write<T>(key: string, list: T[]) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.sessionStorage.setItem(key, JSON.stringify(list));
  } catch {
    // storage may be unavailable in private embedded browsers
  }
}

export function getLocalAppointments(): ApiAppointment[] {
  return read<ApiAppointment>(APPT_KEY);
}

export function addLocalAppointment(appointment: ApiAppointment): ApiAppointment[] {
  const next = [appointment, ...getLocalAppointments()];
  write(APPT_KEY, next);
  return next;
}

export function updateLocalAppointment(id: string, patch: Partial<ApiAppointment>): ApiAppointment[] {
  const next = getLocalAppointments().map((item) => (item.id === id ? { ...item, ...patch } : item));
  write(APPT_KEY, next);
  return next;
}

export function getLocalReviews(): ApiReview[] {
  return read<ApiReview>(REVIEW_KEY);
}

export function addLocalReview(review: ApiReview): ApiReview[] {
  const next = [review, ...getLocalReviews()];
  write(REVIEW_KEY, next);
  return next;
}
