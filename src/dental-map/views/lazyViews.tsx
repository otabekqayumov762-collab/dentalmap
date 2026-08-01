"use client";

/**
 * Route-level code splitting for the single-page shell.
 *
 * `DentalMapApp` renders every view from one client component, so a static
 * `import` of all of them puts ~110 kB of view code (the map + leaflet, the
 * doctor cabinet, the payment flow, the appointment forms) into the chunk that
 * must download before the FIRST paint — even for a patient who only ever looks
 * at the home tab. Telegram Mini Apps open on mobile networks, so that is the
 * most expensive thing on the critical path.
 *
 * The rule applied here:
 *   - stays static: the shell's own first-paint views (home, the primary
 *     browse tabs, the gates and login) — splitting those would only trade
 *     bytes for a round trip on the path everybody takes;
 *   - becomes dynamic: anything reached by a deliberate second interaction
 *     (map, doctor detail, booking, profile, notifications, the doctor cabinet
 *     and the payment flow).
 *
 * `ssr: false` because none of these can be part of the exported HTML: the
 * initial state is always home/gate, so prerendering them would render markup
 * no first paint ever shows.
 *
 * Vendor CSS follows its view: `leaflet/dist/leaflet.css` is imported by
 * MapView itself (not `globals.css`), so webpack emits it in the map chunk and
 * only a user who opens the map pays for it.
 */

import { Loader2 } from "lucide-react";
import dynamic from "next/dynamic";

/**
 * Chunk-fetch placeholder. Deliberately quiet and un-animated apart from the
 * spinner: on a warm cache it is on screen for a frame or two, and a skeleton
 * that flashes is worse than a calm one.
 */
function ViewFallback() {
  return (
    <div className="flex min-h-[240px] items-center justify-center py-10" role="status" aria-live="polite">
      <Loader2 size={22} className="animate-spin text-brand-500" />
      <span className="sr-only">Yuklanmoqda</span>
    </div>
  );
}

/** Full-bleed variant: the map owns its viewport, so a centred card would jump. */
function MapFallback() {
  return (
    <div className="flex h-[var(--tg-viewport-height,100svh)] items-center justify-center" role="status" aria-live="polite">
      <Loader2 size={24} className="animate-spin text-brand-500" />
      <span className="sr-only">Xarita yuklanmoqda</span>
    </div>
  );
}

export const MapView = dynamic(() => import("./MapView").then((m) => m.MapView), {
  ssr: false,
  loading: MapFallback
});

export const DoctorDetailView = dynamic(() => import("./DoctorDetailView").then((m) => m.DoctorDetailView), {
  ssr: false,
  loading: ViewFallback
});

export const AppointmentView = dynamic(() => import("./AppointmentView").then((m) => m.AppointmentView), {
  ssr: false,
  loading: ViewFallback
});

export const AppointmentDetailView = dynamic(
  () => import("./AppointmentDetailView").then((m) => m.AppointmentDetailView),
  { ssr: false, loading: ViewFallback }
);

export const PatientAppointmentsView = dynamic(
  () => import("./PatientAppointmentsView").then((m) => m.PatientAppointmentsView),
  { ssr: false, loading: ViewFallback }
);

export const ProfileView = dynamic(() => import("./ProfileView").then((m) => m.ProfileView), {
  ssr: false,
  loading: ViewFallback
});

export const NotificationsView = dynamic(() => import("./NotificationsView").then((m) => m.NotificationsView), {
  ssr: false,
  loading: ViewFallback
});

export const FeedbackView = dynamic(() => import("./FeedbackView").then((m) => m.FeedbackView), {
  ssr: false,
  loading: ViewFallback
});

// The whole doctor cabinet (dashboard + schedule manager + profile form +
// request list) is behind a doctor login: patients never download it.
export const DoctorDashboardView = dynamic(
  () => import("./DoctorDashboardView").then((m) => m.DoctorDashboardView),
  { ssr: false, loading: ViewFallback }
);

// Payment is reached only after registration resolves to "subscription due".
export const DoctorPaymentView = dynamic(
  () => import("./payment/DoctorPaymentView").then((m) => m.DoctorPaymentView),
  { ssr: false, loading: ViewFallback }
);

// The 7-pane doctor signup wizard (OTP boxes, map link picker, region sheet,
// photo uploader). The DEFAULT path is patient registration, which never needs
// any of it — and the chunk is prefetched on the role toggle's pointer-down, so
// by the time "Shifokor" is released it is already in cache and no fetch ever
// lands mid-signup.
export const DoctorRegistrationForm = dynamic(
  () => import("./register/DoctorRegistrationForm").then((m) => m.DoctorRegistrationForm),
  { ssr: false, loading: ViewFallback }
);

/** Warm the wizard chunk before it is rendered. Safe to call repeatedly: the
 *  module registry dedupes, so extra taps cost nothing. */
export function prefetchDoctorRegistrationForm() {
  void import("./register/DoctorRegistrationForm");
}

// A sheet, not a view: it mounts at most once per completed appointment, so it
// has no business being in the first-paint chunk. `loading: null` because a
// spinner sliding up from the bottom would read as a broken sheet.
export const RatingPromptSheet = dynamic(() => import("./RatingPromptSheet").then((m) => m.RatingPromptSheet), {
  ssr: false,
  loading: () => null
});
