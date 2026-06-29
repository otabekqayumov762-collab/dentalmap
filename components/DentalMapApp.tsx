"use client";

import { ArrowLeft, Bell, Loader2, Search, Stethoscope } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  apiRequest,
  flattenClinics,
  getApiUrl,
  isBackendConfigured,
  isStaticPreviewHost,
  mapDoctor,
  mapReview,
  normalizeApiList,
  normalizeSchedule
} from "@/src/dental-map/api/dentalMapApi";
import { fallbackClinics, fallbackDoctors, fallbackReviews, shortcuts, tabs } from "@/src/dental-map/catalog";
import { BrandLogo, DistrictFilter, EmptyState, NotificationPanel, TelegramStatus } from "@/src/dental-map/components/common";
import { AppointmentView } from "@/src/dental-map/views/AppointmentView";
import { ClinicsView } from "@/src/dental-map/views/ClinicsView";
import { DoctorDetailView } from "@/src/dental-map/views/DoctorDetailView";
import { DoctorsView } from "@/src/dental-map/views/DoctorsView";
import { FeedbackView } from "@/src/dental-map/views/FeedbackView";
import { HomeView } from "@/src/dental-map/views/HomeView";
import { MapView } from "@/src/dental-map/views/MapView";
import { MoreView } from "@/src/dental-map/views/MoreView";
import { ProfileView } from "@/src/dental-map/views/ProfileView";
import { DoctorDashboardView } from "@/src/dental-map/views/DoctorDashboardView";
import { RegisterView } from "@/src/dental-map/views/RegisterView";
import { ServicesView } from "@/src/dental-map/views/ServicesView";
import type {
  ApiAppointment,
  ApiClinic,
  ApiDoctor,
  ApiList,
  ApiReview,
  ApiUser,
  ApiWeeklyAvailability,
  Clinic,
  Doctor,
  DoctorReview,
  RegisterRole,
  TelegramAuthStatus,
  TelegramUser,
  TelegramWebApp,
  ViewId
} from "@/src/dental-map/types";

const APPOINTMENT_LEADS_KEY = "dentalmap_appointment_leads";
const AUTH_STORAGE_KEY = "dentalmap_auth_tokens";
const SHEETS_WEBHOOK_URL =
  process.env.NEXT_PUBLIC_SHEETS_WEBHOOK_URL || process.env.NEXT_PUBLIC_GOOGLE_SHEETS_WEBHOOK_URL || "";

type AppointmentLead = {
  id: string;
  createdAt: string;
  doctorId: string;
  doctorName: string;
  clinic: string;
  district: string;
  selectedSlot: string;
  fullName: string;
  phone: string;
  gender: string;
  age: string;
  appointmentDate: string;
  note: string;
};

type AuthPayload = {
  user?: ApiUser;
  tokens?: {
    access?: string;
    refresh?: string;
  };
};

let authTokens: NonNullable<AuthPayload["tokens"]> = {};

function storeAuthTokens(payload: AuthPayload) {
  authTokens = {
    access: payload.tokens?.access,
    refresh: payload.tokens?.refresh
  };
  try {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authTokens));
  } catch {
    // Auth still works for the current session.
  }
}

function getAccessToken() {
  return authTokens.access || "";
}

function restoreAuthTokens() {
  try {
    const rawValue = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!rawValue) {
      return "";
    }
    const parsedValue = JSON.parse(rawValue) as NonNullable<AuthPayload["tokens"]>;
    authTokens = {
      access: typeof parsedValue.access === "string" ? parsedValue.access : "",
      refresh: typeof parsedValue.refresh === "string" ? parsedValue.refresh : ""
    };
    return authTokens.access || "";
  } catch {
    return "";
  }
}

function createTemporaryPassword(role: "User" | "Doctor") {
  const cryptoApi = globalThis.crypto;
  if (!cryptoApi?.getRandomValues) {
    throw new Error("Secure random generator is unavailable");
  }
  const bytes = new Uint8Array(18);
  cryptoApi.getRandomValues(bytes);
  const token = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `Dmap-${role}-${token}-Aa1!`;
}

function createIdempotencyKey() {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.randomUUID) {
    return `miniapp-payment-${cryptoApi.randomUUID()}`;
  }
  if (cryptoApi?.getRandomValues) {
    const bytes = new Uint8Array(16);
    cryptoApi.getRandomValues(bytes);
    return `miniapp-payment-${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
  }
  return `miniapp-payment-${Date.now()}`;
}

function normalizeGender(value: string) {
  if (value === "Erkak") {
    return "male";
  }
  if (value === "Ayol") {
    return "female";
  }
  return value;
}

function persistAppointmentLead(lead: AppointmentLead) {
  try {
    const rawValue = window.localStorage.getItem(APPOINTMENT_LEADS_KEY);
    const existingLeads = rawValue ? JSON.parse(rawValue) : [];
    const leads = Array.isArray(existingLeads) ? existingLeads : [];
    window.localStorage.setItem(APPOINTMENT_LEADS_KEY, JSON.stringify([lead, ...leads].slice(0, 100)));
  } catch {
    // The lead is still submitted in the current session even if local storage is blocked.
  }

  if (!SHEETS_WEBHOOK_URL) {
    return;
  }

  void fetch(SHEETS_WEBHOOK_URL, {
    method: "POST",
    mode: "no-cors",
    body: JSON.stringify(lead)
  }).catch(() => {
    // Network sync is best-effort; local queue above keeps the request recoverable.
  });
}

export default function DentalMapApp() {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const viewLoadingTimerRef = useRef<number | null>(null);
  const paymentIdempotencyKeyRef = useRef<string | null>(null);
  const paymentSubmittingRef = useRef(false);
  const [activeView, setActiveView] = useState<ViewId>("home");
  const [viewLoading, setViewLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [district, setDistrict] = useState("Barchasi");
  const [apiDoctors, setApiDoctors] = useState<Doctor[]>(fallbackDoctors);
  const [apiClinics, setApiClinics] = useState<Clinic[]>(fallbackClinics);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedSlot, setSelectedSlot] = useState("14:30");
  const [consultationSent, setConsultationSent] = useState(false);
  const [doctorReviews, setDoctorReviews] = useState<DoctorReview[]>(fallbackReviews);
  const [appointments, setAppointments] = useState<ApiAppointment[]>([]);
  const [doctorProfile, setDoctorProfile] = useState<ApiDoctor | null>(null);
  const [doctorSchedule, setDoctorSchedule] = useState<ApiWeeklyAvailability[]>([]);
  const [privateLoading, setPrivateLoading] = useState(false);
  const [appointmentSubmitting, setAppointmentSubmitting] = useState(false);
  const [appointmentSubmitError, setAppointmentSubmitError] = useState("");
  const [doctorActionError, setDoctorActionError] = useState("");
  const [registrationError, setRegistrationError] = useState("");
  const [registerRole, setRegisterRole] = useState<RegisterRole>("user");
  const [userRegistered, setUserRegistered] = useState(false);
  const [doctorRegistrationSent, setDoctorRegistrationSent] = useState(false);
  const [doctorSubscriptionPaid, setDoctorSubscriptionPaid] = useState(false);
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [savedDoctorIds, setSavedDoctorIds] = useState<string[]>([]);
  const [savedDoctorsHydrated, setSavedDoctorsHydrated] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);
  const [telegramUser, setTelegramUser] = useState<TelegramUser | null>(null);
  const [currentUser, setCurrentUser] = useState<ApiUser | null>(null);
  const [authStatus, setAuthStatus] = useState<TelegramAuthStatus>("loading");
  const [authMessage, setAuthMessage] = useState("Telegram Mini App tayyorlanmoqda.");

  const isTelegram = Boolean(webApp);

  const filteredDoctors = useMemo(() => {
    const search = query.trim().toLowerCase();
    const allDistricts = district === "Barchasi";

    return apiDoctors.filter((doctor) => {
      const text = `${doctor.name} ${doctor.specialty} ${doctor.clinic} ${doctor.district}`.toLowerCase();
      const matchesDistrict = allDistricts || doctor.district === district;

      return matchesDistrict && text.includes(search);
    });
  }, [apiDoctors, district, query]);

  const filteredClinics = useMemo(() => {
    const search = query.trim().toLowerCase();
    const allDistricts = district === "Barchasi";

    return apiClinics.filter((clinic) => {
      const text = `${clinic.name} ${clinic.district} ${clinic.address}`.toLowerCase();
      const matchesDistrict = allDistricts || clinic.district === district;

      return matchesDistrict && text.includes(search);
    });
  }, [apiClinics, district, query]);

  const activeTabId: ViewId | null =
    activeView === "home" ||
    activeView === "map" ||
    activeView === "doctors" ||
    activeView === "profile" ||
    activeView === "more"
      ? activeView
      : activeView === "doctorDetail" || activeView === "appointment"
        ? "doctors"
        : activeView === "services" || activeView === "clinics"
          ? "home"
          : activeView === "feedback"
            ? "more"
            : null;
  const isMapView = activeView === "map";
  const isAppointmentSuccess = activeView === "appointment" && consultationSent;
  const showAppHeader = !isMapView && !isAppointmentSuccess;
  const showDiscoveryControls = activeView === "home";
  const showPageBack = !isMapView && activeView !== "home";
  const reviewableAppointmentByDoctor = useMemo(() => {
    const reviewedAppointmentIds = new Set(
      doctorReviews.map((review) => review.appointmentId).filter((appointmentId): appointmentId is string => Boolean(appointmentId))
    );
    const pairs = appointments
      .filter((appointment) => appointment.status === "completed" && !reviewedAppointmentIds.has(appointment.id))
      .map((appointment) => [appointment.doctor, appointment] as const);

    return new Map(pairs);
  }, [appointments, doctorReviews]);
  const isDoctorAccount = currentUser?.role === "doctor" || Boolean(currentUser?.doctor_profile) || doctorRegistrationSent;

  const changeView = useCallback((view: ViewId) => {
    setViewLoading(true);
    setActiveView(view);

    if (viewLoadingTimerRef.current) {
      window.clearTimeout(viewLoadingTimerRef.current);
    }
    viewLoadingTimerRef.current = window.setTimeout(() => {
      setViewLoading(false);
      viewLoadingTimerRef.current = null;
    }, 260);
  }, []);

  function openAppointment(doctor: Doctor) {
    webApp?.HapticFeedback?.selectionChanged();
    if (selectedDoctor?.id !== doctor.id) {
      setConsultationSent(false);
    }
    setAppointmentSubmitError("");
    setSelectedDoctor(doctor);
    changeView("appointment");
  }

  function openDoctor(doctor: Doctor) {
    webApp?.HapticFeedback?.selectionChanged();
    setSelectedDoctor(doctor);
    changeView("doctorDetail");
  }

  function toggleSavedDoctor(doctorId: string) {
    webApp?.HapticFeedback?.selectionChanged();
    setSavedDoctorIds((current) =>
      current.includes(doctorId)
        ? current.filter((id) => id !== doctorId)
        : [...current, doctorId]
    );
  }

  async function submitDoctorReview(doctorId: string, rating: number, text: string) {
    const appointment = reviewableAppointmentByDoctor.get(doctorId);
    const token = getAccessToken();

    if (!appointment || !token || isStaticPreviewHost() || !isBackendConfigured()) {
      return "Sharh faqat yakunlangan qabuldan keyin backend orqali yuboriladi.";
    }

    try {
      const review = await apiRequest<ApiReview>("/api/reviews/", {
        token,
        method: "POST",
        body: JSON.stringify({
          appointment: appointment.id,
          rating,
          comment: text
        })
      });
      setDoctorReviews((current) => [mapReview(review), ...current]);
      webApp?.HapticFeedback?.notificationOccurred("success");
      return "";
    } catch (error) {
      webApp?.HapticFeedback?.notificationOccurred("error");
      return error instanceof Error ? error.message : "Sharh yuborilmadi.";
    }
  }

  async function sendConsultation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAppointmentSubmitError("");

    if (selectedDoctor) {
      const formData = new FormData(event.currentTarget);
      const lead = {
        id: `appointment-${Date.now()}`,
        createdAt: new Date().toISOString(),
        doctorId: selectedDoctor.id,
        doctorName: selectedDoctor.name,
        clinic: selectedDoctor.clinic,
        district: selectedDoctor.district,
        selectedSlot,
        fullName: String(formData.get("fullName") || "").trim(),
        phone: String(formData.get("phone") || "").trim(),
        gender: String(formData.get("gender") || "").trim(),
        age: String(formData.get("age") || "").trim(),
        appointmentDate: String(formData.get("appointmentDate") || "").trim(),
        note: String(formData.get("note") || "").trim()
      };
      const token = getAccessToken();

      if (token && isBackendConfigured() && !isStaticPreviewHost()) {
        try {
          setAppointmentSubmitting(true);
          const appointment = await apiRequest<ApiAppointment>("/api/appointments/", {
            token,
            method: "POST",
            body: JSON.stringify({
              doctor: selectedDoctor.id,
              full_name: lead.fullName,
              phone: lead.phone,
              gender: normalizeGender(lead.gender),
              age: lead.age ? Number(lead.age) : null,
              appointment_date: lead.appointmentDate,
              appointment_time: selectedSlot,
              note: lead.note
            })
          });
          setAppointments((current) => [appointment, ...current]);
          persistAppointmentLead(lead);
          submitConsultation();
          return;
        } catch (error) {
          const message = error instanceof Error ? error.message : "Qabul so'rovi yuborilmadi.";
          setAppointmentSubmitError(message);
          webApp?.HapticFeedback?.notificationOccurred("error");
          return;
        } finally {
          setAppointmentSubmitting(false);
        }
      }

      persistAppointmentLead(lead);
    }
    submitConsultation();
  }

  async function sendUserRegistration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const fullName = String(formData.get("full_name") || "").trim();
    const phone = String(formData.get("phone") || "").trim();
    const city = String(formData.get("city") || "").trim() || "Toshkent";
    const age = String(formData.get("age") || "").trim();

    formData.set("role", "user");
    formData.set("full_name", fullName);
    formData.set("phone", phone);
    formData.set("city", city);
    const gender = normalizeGender(String(formData.get("gender") || ""));
    if (gender) {
      formData.set("gender", gender);
    }
    if (!age) {
      formData.delete("age");
    }

    try {
      setRegistrationError("");
      formData.set("password", createTemporaryPassword("User"));
      const response = await fetch(getApiUrl("/api/auth/register/"), {
        method: "POST",
        body: formData
      });
      if (!response.ok) {
        throw new Error(`User register ${response.status}`);
      }
      const payload = (await response.json()) as AuthPayload;
      storeAuthTokens(payload);
      setCurrentUser(payload.user || null);
      submitUserRegistration();
      void refreshPrivateData(payload.tokens?.access || "");
    } catch {
      setRegistrationError("Profil backendga yuborilmadi. F.I.O. va telefon raqamni tekshiring.");
      webApp?.HapticFeedback?.notificationOccurred("error");
    }
  }

  async function sendDoctorRegistration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const phone = String(formData.get("doctor_phone") || formData.get("phone") || "").trim();
    const rawExperience = String(formData.get("experience_years") || "").trim();
    const experienceYears = rawExperience.match(/\d+/)?.[0] ?? "0";

    formData.set("role", "doctor");
    formData.set("phone", phone);
    formData.set("experience_years", experienceYears);

    try {
      setRegistrationError("");
      formData.set("password", createTemporaryPassword("Doctor"));
      const response = await fetch(getApiUrl("/api/auth/register/"), {
        method: "POST",
        body: formData
      });
      if (!response.ok) {
        throw new Error(`Doctor register ${response.status}`);
      }
      const payload = (await response.json()) as AuthPayload;
      storeAuthTokens(payload);
      setCurrentUser(payload.user || null);
      submitDoctorRegistration();
      void refreshPrivateData(payload.tokens?.access || "");
    } catch {
      setRegistrationError("Anketa backendga yuborilmadi. Maydonlarni to'liq to'ldiring.");
      webApp?.HapticFeedback?.notificationOccurred("error");
    }
  }

  const submitConsultation = useCallback(() => {
    setConsultationSent(true);
    webApp?.HapticFeedback?.notificationOccurred("success");
  }, [webApp]);

  const submitUserRegistration = useCallback(() => {
    setUserRegistered(true);
    webApp?.HapticFeedback?.notificationOccurred("success");
  }, [webApp]);

  const submitDoctorRegistration = useCallback(() => {
    setDoctorRegistrationSent(true);
    webApp?.HapticFeedback?.notificationOccurred("success");
  }, [webApp]);

  const submitDoctorPayment = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (paymentSubmittingRef.current || doctorSubscriptionPaid) {
      return;
    }
    const token = getAccessToken();
    if (!token) {
      setRegistrationError("To'lov yuborilmadi. Avval shifokor anketasini qayta yuboring.");
      webApp?.HapticFeedback?.notificationOccurred("error");
      return;
    }

    const formData = new FormData(event.currentTarget);
    const method = String(formData.get("method") || "manual");
    const paymentPhone = String(formData.get("payment_phone") || "").trim();
    const receiptNumber = String(formData.get("receipt_number") || "").trim();

    try {
      setRegistrationError("");
      paymentSubmittingRef.current = true;
      setPaymentSubmitting(true);
      paymentIdempotencyKeyRef.current ??= createIdempotencyKey();
      const response = await fetch(getApiUrl("/api/billing/payments/initiate/"), {
        method: "POST",
        cache: "no-store",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          method,
          payment_phone: paymentPhone,
          receipt_number: receiptNumber,
          idempotency_key: paymentIdempotencyKeyRef.current
        })
      });
      if (!response.ok) {
        throw new Error(`Payment initiate ${response.status}`);
      }
      setDoctorSubscriptionPaid(true);
      webApp?.HapticFeedback?.notificationOccurred("success");
    } catch {
      setRegistrationError("To'lov backendga yuborilmadi. Telefon yoki chek raqamini tekshiring.");
      webApp?.HapticFeedback?.notificationOccurred("error");
    } finally {
      paymentSubmittingRef.current = false;
      setPaymentSubmitting(false);
    }
  }, [doctorSubscriptionPaid, webApp]);

  const refreshPrivateData = useCallback(async (token = getAccessToken()) => {
    if (!token || !isBackendConfigured() || isStaticPreviewHost()) {
      return;
    }

    try {
      setPrivateLoading(true);
      setDoctorActionError("");
      const [mePayload, appointmentPayload, reviewPayload] = await Promise.all([
        apiRequest<ApiUser>("/api/users/me/", { token }),
        apiRequest<ApiList<ApiAppointment> | ApiAppointment[]>("/api/appointments/?ordering=-created_at", { token }),
        apiRequest<ApiList<ApiReview> | ApiReview[]>("/api/reviews/?ordering=-created_at", { token })
      ]);
      const nextUser = mePayload;
      setCurrentUser(nextUser);
      setAppointments(normalizeApiList(appointmentPayload));
      setDoctorReviews(normalizeApiList(reviewPayload).map(mapReview));

      if (nextUser.role === "doctor" || nextUser.doctor_profile) {
        const [profileResult, scheduleResult] = await Promise.allSettled([
          apiRequest<ApiDoctor>("/api/doctors/me/", { token }),
          apiRequest<ApiList<ApiWeeklyAvailability> | ApiWeeklyAvailability[]>("/api/availability/weekly/?ordering=weekday,start_time", { token })
        ]);
        if (profileResult.status === "fulfilled") {
          setDoctorProfile(profileResult.value);
        }
        if (scheduleResult.status === "fulfilled") {
          setDoctorSchedule(normalizeSchedule(scheduleResult.value));
        }
      }
    } catch (error) {
      setDoctorActionError(error instanceof Error ? error.message : "Ma'lumotlar yuklanmadi.");
    } finally {
      setPrivateLoading(false);
    }
  }, []);

  async function submitDoctorProfileUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = getAccessToken();
    if (!token) {
      setDoctorActionError("Doktor profilini saqlash uchun avtorizatsiya kerak.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    const photoFile = formData.get("photo_file");
    if (photoFile instanceof File && !photoFile.name) {
      formData.delete("photo_file");
    }
    const experience = String(formData.get("experience_years") || "").trim();
    if (experience) {
      formData.set("experience_years", String(Number(experience) || 0));
    }

    try {
      setPrivateLoading(true);
      setDoctorActionError("");
      const profile = await apiRequest<ApiDoctor>("/api/doctors/me/", {
        token,
        method: "PATCH",
        body: formData
      });
      setDoctorProfile(profile);
      setCurrentUser((current) =>
        current
          ? {
              ...current,
              doctor_profile: {
                id: profile.id,
                approval_status: profile.approval_status || "pending",
                is_published: Boolean(profile.is_published),
                subscription_expires_at: profile.subscription_expires_at
              }
            }
          : current
      );
      webApp?.HapticFeedback?.notificationOccurred("success");
    } catch (error) {
      setDoctorActionError(error instanceof Error ? error.message : "Doktor profili saqlanmadi.");
      webApp?.HapticFeedback?.notificationOccurred("error");
    } finally {
      setPrivateLoading(false);
    }
  }

  async function submitDoctorSchedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = getAccessToken();
    if (!token) {
      setDoctorActionError("Jadval qo'shish uchun avtorizatsiya kerak.");
      return;
    }
    const formData = new FormData(event.currentTarget);

    try {
      setPrivateLoading(true);
      setDoctorActionError("");
      const item = await apiRequest<ApiWeeklyAvailability>("/api/availability/weekly/", {
        token,
        method: "POST",
        body: JSON.stringify({
          weekday: Number(formData.get("weekday") || 0),
          start_time: String(formData.get("start_time") || "09:00"),
          end_time: String(formData.get("end_time") || "18:00"),
          slot_duration_minutes: Number(formData.get("slot_duration_minutes") || 30),
          is_active: true,
          note: String(formData.get("note") || "")
        })
      });
      setDoctorSchedule((current) => normalizeSchedule([item, ...current]));
      event.currentTarget.reset();
      webApp?.HapticFeedback?.notificationOccurred("success");
    } catch (error) {
      setDoctorActionError(error instanceof Error ? error.message : "Jadval qo'shilmadi.");
      webApp?.HapticFeedback?.notificationOccurred("error");
    } finally {
      setPrivateLoading(false);
    }
  }

  async function runDoctorAppointmentAction(
    appointment: ApiAppointment,
    action: "confirm" | "reject" | "complete" | "mark_no_show",
    reason = ""
  ) {
    const token = getAccessToken();
    if (!token) {
      setDoctorActionError("Qabulni boshqarish uchun avtorizatsiya kerak.");
      return;
    }

    try {
      setPrivateLoading(true);
      setDoctorActionError("");
      const nextAppointment = await apiRequest<ApiAppointment>(`/api/appointments/${appointment.id}/${action}/`, {
        token,
        method: "POST",
        body: action === "reject" ? JSON.stringify({ reject_reason: reason }) : undefined
      });
      setAppointments((current) =>
        current.map((item) => (item.id === nextAppointment.id ? nextAppointment : item))
      );
      webApp?.HapticFeedback?.notificationOccurred("success");
    } catch (error) {
      setDoctorActionError(error instanceof Error ? error.message : "Qabul holati o'zgarmadi.");
      webApp?.HapticFeedback?.notificationOccurred("error");
    } finally {
      setPrivateLoading(false);
    }
  }

  function navigate(view: ViewId) {
    webApp?.HapticFeedback?.selectionChanged();
    if (view === "appointment" && !selectedDoctor) {
      changeView("doctors");
      return;
    }
    changeView(view);
  }

  useEffect(() => {
    const tg = window.Telegram?.WebApp ?? null;
    setWebApp(tg);

    if (!tg) {
      document.documentElement.dataset.telegramTheme = "light";
      const restoredToken = restoreAuthTokens();
      if (restoredToken) {
        setAuthStatus("authenticated");
        setAuthMessage("Avvalgi sessiya tiklandi.");
        void refreshPrivateData(restoredToken);
      } else {
        setAuthStatus("guest");
        setAuthMessage("Telegramdan tashqarida ko'rish rejimi.");
      }
      return;
    }

    const telegramApp = tg;
    tg.ready();
    tg.expand();
    tg.disableVerticalSwipes?.();
    tg.setHeaderColor?.(tg.themeParams?.secondary_bg_color ?? "#f8fbfc");
    tg.setBackgroundColor?.(tg.themeParams?.bg_color ?? "#f8fbfc");

    const applyTelegramTheme = () => {
      const root = document.documentElement;
      root.dataset.telegramTheme = tg.colorScheme === "dark" ? "dark" : "light";
    };

    applyTelegramTheme();
    tg.onEvent?.("themeChanged", applyTelegramTheme);

    const user = tg.initDataUnsafe?.user ?? null;
    setTelegramUser(user);

    async function authenticate() {
      if (isStaticPreviewHost()) {
        setAuthStatus("guest");
        setAuthMessage("24/7 statik ko'rish rejimi.");
        return;
      }

      if (!telegramApp.initData && !user) {
        setAuthStatus("guest");
        setAuthMessage("Telegram foydalanuvchisi aniqlanmadi. Bot ichidan oching.");
        return;
      }

      if (!isBackendConfigured()) {
        setAuthStatus("error");
        setAuthMessage("Backend URL sozlanmagan.");
        return;
      }

      try {
        setAuthStatus("loading");
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), 8000);
        const authBody = telegramApp.initData
          ? { init_data: telegramApp.initData }
          : { telegram_user: user };
        const response = await (async () => {
          try {
            return await fetch(getApiUrl("/api/auth/telegram/"), {
              method: "POST",
              cache: "no-store",
              credentials: "omit",
              signal: controller.signal,
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(authBody)
            });
          } finally {
            window.clearTimeout(timeout);
          }
        })();

        if (!response.ok) {
          throw new Error(`Telegram auth ${response.status}`);
        }

        const payload = (await response.json()) as AuthPayload;
        storeAuthTokens(payload);
        setCurrentUser(payload.user || null);
        setAuthStatus("authenticated");
        setAuthMessage("Telegram akkaunt backend bilan ulandi.");
        void refreshPrivateData(payload.tokens?.access || "");
      } catch {
        setAuthStatus("error");
        setAuthMessage("Telegram auth ishlamadi. Backend URL yoki bot tokenni tekshiring.");
        telegramApp.HapticFeedback?.notificationOccurred("error");
      }
    }

    void authenticate();

    return () => {
      tg.offEvent?.("themeChanged", applyTelegramTheme);
    };
  }, [refreshPrivateData]);

  useEffect(() => {
    try {
      const rawValue = window.localStorage.getItem("dentalmap_saved_doctors");
      if (rawValue) {
        const parsedValue = JSON.parse(rawValue);
        if (Array.isArray(parsedValue)) {
          setSavedDoctorIds(parsedValue.filter((item): item is string => typeof item === "string"));
        }
      }
    } catch {
      setSavedDoctorIds([]);
    } finally {
      setSavedDoctorsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!savedDoctorsHydrated) {
      return;
    }

    try {
      window.localStorage.setItem("dentalmap_saved_doctors", JSON.stringify(savedDoctorIds));
    } catch {
      // Storage may be unavailable in embedded/private browser contexts.
    }
  }, [savedDoctorIds, savedDoctorsHydrated]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadBackendData() {
      if (isStaticPreviewHost() || !isBackendConfigured()) {
        setApiDoctors(fallbackDoctors);
        setApiClinics(fallbackClinics);
        setDataError(isStaticPreviewHost() ? "" : "Backend URL sozlanmagan. 24/7 ko'rish rejimi ishlayapti.");
        setDataLoading(false);
        return;
      }

      try {
        setDataLoading(true);
        setDataError("");
        const [doctorResponse, clinicResponse, reviewResponse] = await Promise.all([
          fetch(getApiUrl("/api/doctors/"), { cache: "no-store", signal: controller.signal }),
          fetch(getApiUrl("/api/clinics/"), { cache: "no-store", signal: controller.signal }),
          fetch(getApiUrl("/api/reviews/"), { cache: "no-store", signal: controller.signal })
        ]);
        if (!doctorResponse.ok || !clinicResponse.ok || !reviewResponse.ok) {
          throw new Error("Backend data request failed");
        }
        const [doctorPayload, clinicPayload, reviewPayload] = (await Promise.all([
          doctorResponse.json(),
          clinicResponse.json(),
          reviewResponse.json()
        ])) as [ApiList<ApiDoctor>, ApiList<ApiClinic>, ApiList<ApiReview>];
        setApiDoctors(normalizeApiList(doctorPayload).map(mapDoctor));
        setApiClinics(flattenClinics(normalizeApiList(clinicPayload)));
        setDoctorReviews(normalizeApiList(reviewPayload).map(mapReview));
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setDataError("Backend vaqtincha ulanmagan. 24/7 ko'rish rejimi ishlayapti.");
          setApiDoctors(fallbackDoctors);
          setApiClinics(fallbackClinics);
        }
      } finally {
        setDataLoading(false);
      }
    }

    void loadBackendData();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!selectedDoctor && apiDoctors.length > 0) {
      setSelectedDoctor(apiDoctors[0]);
    }
  }, [apiDoctors, selectedDoctor]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [activeView]);

  useEffect(() => {
    return () => {
      if (viewLoadingTimerRef.current) {
        window.clearTimeout(viewLoadingTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!webApp?.BackButton) {
      return;
    }

    const handleBack = () => {
      setNotificationsOpen(false);
      changeView("home");
    };

    if (activeView === "home") {
      webApp.BackButton.hide();
    } else {
      webApp.BackButton.show();
      webApp.BackButton.onClick(handleBack);
    }

    return () => {
      webApp.BackButton?.offClick(handleBack);
    };
  }, [activeView, changeView, webApp]);

  useEffect(() => {
    const mainButton = webApp?.MainButton;
    if (!mainButton) {
      return;
    }

    const handleMainButton = () => {
      if (activeView === "home" || activeView === "doctors" || activeView === "clinics" || activeView === "map") {
        if (selectedDoctor) {
          changeView("appointment");
        } else {
          changeView("doctors");
        }
        return;
      }
      if (activeView === "appointment") {
        const appointmentForm = document.getElementById("appointment-form");
        if (appointmentForm instanceof HTMLFormElement) {
          appointmentForm.requestSubmit();
        } else {
          submitConsultation();
        }
        return;
      }
      if (activeView === "register" && registerRole === "doctor" && doctorRegistrationSent && !doctorSubscriptionPaid) {
        const paymentForm = document.getElementById("doctor-payment-form");
        if (paymentForm instanceof HTMLFormElement) {
          paymentForm.requestSubmit();
        }
        return;
      }
      if (activeView === "register" && registerRole === "user" && userRegistered) {
        return;
      }
      if (activeView === "register") {
        const formId = registerRole === "doctor" ? "doctor-register-form" : "user-register-form";
        const registerForm = document.getElementById(formId);
        if (registerForm instanceof HTMLFormElement) {
          registerForm.requestSubmit();
        }
      }
    };

    const buttonText =
      activeView === "appointment"
        ? "Qabulga yozilish"
        : activeView === "register" && registerRole === "doctor" && doctorRegistrationSent && !doctorSubscriptionPaid
          ? "50 000 so'm to'lash"
          : activeView === "register" && registerRole === "doctor"
            ? "Shifokor anketasini yuborish"
            : activeView === "register"
              ? "Profil yaratish"
              : "Qabulga yozilish";

    if (
      activeView === "profile" ||
      activeView === "more" ||
      activeView === "feedback" ||
      activeView === "doctorDetail" ||
      (activeView === "register" && registerRole === "user" && userRegistered) ||
      doctorSubscriptionPaid
    ) {
      mainButton.hide();
    } else {
      mainButton.setText(buttonText);
      mainButton.enable();
      mainButton.show();
      mainButton.onClick(handleMainButton);
    }

    return () => {
      mainButton.offClick(handleMainButton);
    };
  }, [
    activeView,
    changeView,
    doctorRegistrationSent,
    doctorSubscriptionPaid,
    registerRole,
    selectedDoctor,
    submitConsultation,
    submitDoctorPayment,
    submitDoctorRegistration,
    submitUserRegistration,
    userRegistered,
    webApp
  ]);

  return (
    <main className={`${isTelegram ? "mini-shell telegram-shell" : "mini-shell"}${isMapView ? " map-mode" : ""}`}>
      <section className={isMapView ? "mini-app map-mode" : "mini-app"} aria-label="Dental Map mini ilova">
        <div className={isAppointmentSuccess ? "app-scroll success-scroll-lock" : "app-scroll"} ref={scrollRef}>
          {showAppHeader && (
            <>
              <section className="brand-card">
                <div className="brand-row">
                  <button className="brand-title" type="button" onClick={() => navigate("home")}>
                    <span className="tooth-logo">
                      <BrandLogo />
                    </span>
                    <strong>
                      DENTAL <span>MAP</span>
                    </strong>
                  </button>
                  <button
                    className={notificationsOpen ? "round-icon active" : "round-icon"}
                    type="button"
                    aria-label="Bildirishnomalar"
                    onClick={() => setNotificationsOpen((open) => !open)}
                  >
                    <Bell size={18} />
                  </button>
                </div>

                <TelegramStatus
                  status={authStatus}
                  message={authMessage}
                  user={telegramUser}
                  isTelegram={isTelegram}
                />

                {notificationsOpen && (
                  <NotificationPanel
                    sent={consultationSent}
                    onOpenAppointment={() => {
                      setNotificationsOpen(false);
                      navigate("appointment");
                    }}
                  />
                )}

                <label className="search-field">
                  <Search size={17} />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Shifokor yoki klinika qidirish..."
                  />
                </label>

              </section>

              {showDiscoveryControls && (
                <section className="filter-shortcuts">
                  <DistrictFilter value={district} onChange={setDistrict} />
                  <div className="shortcut-row" aria-label="Bo'limlar">
                    {shortcuts.map(({ id, label, Icon }) => (
                      <button
                        key={id}
                        className={activeView === id ? "shortcut active" : "shortcut"}
                        type="button"
                        onClick={() => navigate(id)}
                      >
                        <Icon size={18} />
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}

          {showPageBack && (
            <button className="view-back-button" type="button" onClick={() => navigate("home")}>
              <ArrowLeft size={17} />
              <span>Ortga</span>
            </button>
          )}

          {activeView === "home" && (
            <HomeView
              doctors={filteredDoctors}
              doctor={selectedDoctor}
              loading={dataLoading}
              dataError={dataError}
              consultationSent={consultationSent}
              onAppointment={openAppointment}
              onOpenDoctor={openDoctor}
              savedDoctorIds={savedDoctorIds}
              onToggleSaved={toggleSavedDoctor}
              onNavigate={navigate}
            />
          )}

          {activeView === "doctors" && (
            <DoctorsView
              doctors={filteredDoctors}
              loading={dataLoading}
              dataError={dataError}
              onAppointment={openAppointment}
              onOpenDoctor={openDoctor}
              savedDoctorIds={savedDoctorIds}
              onToggleSaved={toggleSavedDoctor}
            />
          )}

          {activeView === "clinics" && (
            <ClinicsView clinics={filteredClinics} loading={dataLoading} dataError={dataError} onNavigate={navigate} />
          )}

          {activeView === "services" && (
            <ServicesView onNavigate={navigate} />
          )}

          {activeView === "map" && (
            <MapView
              doctors={filteredDoctors}
              clinics={filteredClinics}
              query={query}
              district={district}
              onQueryChange={setQuery}
              onDistrictChange={setDistrict}
              onBack={() => navigate("home")}
              onAppointment={openAppointment}
            />
          )}

          {activeView === "doctorDetail" && selectedDoctor && (
            <DoctorDetailView
              doctor={selectedDoctor}
              reviews={doctorReviews.filter(
                (review) => review.doctorId === selectedDoctor.id && review.status === "approved"
              )}
              canWriteReview={reviewableAppointmentByDoctor.has(selectedDoctor.id)}
              isSaved={savedDoctorIds.includes(selectedDoctor.id)}
              onAppointment={openAppointment}
              onToggleSaved={() => toggleSavedDoctor(selectedDoctor.id)}
              onReviewSubmit={(rating, text) => submitDoctorReview(selectedDoctor.id, rating, text)}
            />
          )}

          {activeView === "appointment" && (
            selectedDoctor ? (
              <AppointmentView
                doctor={selectedDoctor}
                selectedSlot={selectedSlot}
                onSelectSlot={setSelectedSlot}
                onSubmit={sendConsultation}
                sent={consultationSent}
                submitting={appointmentSubmitting}
                submitError={appointmentSubmitError}
              />
            ) : (
              <EmptyState
                title="Avval shifokor tanlang"
                text="Qabul formasini ochish uchun ro'yxatdan shifokorni tanlang."
                Icon={Stethoscope}
              />
            )
          )}

          {activeView === "register" && (
            <RegisterView
              role={registerRole}
              userRegistered={userRegistered}
              doctorRegistrationSent={doctorRegistrationSent}
              doctorSubscriptionPaid={doctorSubscriptionPaid}
              paymentSubmitting={paymentSubmitting}
              registrationError={registrationError}
              onRoleChange={(role) => {
                setRegistrationError("");
                setRegisterRole(role);
              }}
              onUserSubmit={sendUserRegistration}
              onDoctorSubmit={sendDoctorRegistration}
              onDoctorPay={submitDoctorPayment}
              onNavigate={navigate}
            />
          )}

          {activeView === "profile" && (
            isDoctorAccount ? (
              <DoctorDashboardView
                user={currentUser}
                profile={doctorProfile}
                appointments={appointments}
                schedule={doctorSchedule}
                loading={privateLoading}
                error={doctorActionError}
                onRefresh={() => void refreshPrivateData()}
                onProfileSubmit={submitDoctorProfileUpdate}
                onScheduleSubmit={submitDoctorSchedule}
                onAppointmentAction={runDoctorAppointmentAction}
              />
            ) : (
              <ProfileView
                doctorRegistrationSent={doctorRegistrationSent}
                doctorSubscriptionPaid={doctorSubscriptionPaid}
                onNavigate={navigate}
              />
            )
          )}

          {activeView === "more" && (
            <MoreView onNavigate={navigate} sent={consultationSent} />
          )}

          {activeView === "feedback" && (
            <FeedbackView />
          )}
        </div>

        {viewLoading && (
          <div className="view-loading" role="status" aria-live="polite">
            <Loader2 size={22} />
            <span>Yuklanmoqda</span>
          </div>
        )}

        {!isMapView && (
          <nav className="bottom-tabs" aria-label="Pastki navigatsiya">
            {tabs.map(({ id, label, Icon }) => (
              <button
                key={id}
                className={activeTabId === id ? "tab active" : "tab"}
                type="button"
                onClick={() => navigate(id)}
              >
                <Icon size={20} />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        )}
      </section>
    </main>
  );
}
