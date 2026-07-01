"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  apiRequest,
  flattenClinics,
  getApiUrl,
  isBackendConfigured,
  isStaticPreviewHost,
  isLocalMode,
  mapDoctor,
  mapReview,
  normalizeApiList,
  normalizeSchedule,
  isOfflineMode
} from "../api/dentalMapApi";
import { fallbackClinics, fallbackDoctors, fallbackReviews } from "../catalog";
import { getAccessToken, restoreAuthTokens, storeAuthTokens } from "../lib/tokenStore";
import { buildLocalAccount, clearLocalAccount, getLocalAccount, saveLocalAccount } from "../lib/localAccount";
import {
  addLocalAppointment,
  addLocalReview,
  getLocalAppointments,
  getLocalReviews,
  updateLocalAppointment
} from "../lib/localAppointments";
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
  TelegramAuthStatus,
  TelegramUser,
  TelegramWebApp
} from "../types";

type UseDentalDataArgs = {
  webApp: TelegramWebApp | null;
  telegramUser: TelegramUser | null;
  telegramInitialized: boolean;
};

/**
 * Central data layer for the mini app: public catalog, Telegram-backed auth,
 * private doctor data, and every server-mutating action. Keeps the UI shell free
 * of network and session concerns.
 */
export function useDentalData({ webApp, telegramUser, telegramInitialized }: UseDentalDataArgs) {
  const [apiDoctors, setApiDoctors] = useState<Doctor[]>(fallbackDoctors);
  const [apiClinics, setApiClinics] = useState<Clinic[]>(fallbackClinics);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState("");
  const [doctorReviews, setDoctorReviews] = useState<DoctorReview[]>(fallbackReviews);
  const [appointments, setAppointments] = useState<ApiAppointment[]>([]);
  const [doctorProfile, setDoctorProfile] = useState<ApiDoctor | null>(null);
  const [doctorSchedule, setDoctorSchedule] = useState<ApiWeeklyAvailability[]>([]);
  const [privateLoading, setPrivateLoading] = useState(false);
  const [doctorActionError, setDoctorActionError] = useState("");
  const [currentUser, setCurrentUser] = useState<ApiUser | null>(null);
  const [authStatus, setAuthStatus] = useState<TelegramAuthStatus>("loading");
  const [authMessage, setAuthMessage] = useState("Telegram Mini App tayyorlanmoqda.");

  const reviewableAppointmentByDoctor = useMemo(() => {
    const reviewedAppointmentIds = new Set(
      doctorReviews
        .map((review) => review.appointmentId)
        .filter((appointmentId): appointmentId is string => Boolean(appointmentId))
    );
    const pairs = appointments
      .filter((appointment) => appointment.status === "completed" && !reviewedAppointmentIds.has(appointment.id))
      .map((appointment) => [appointment.doctor, appointment] as const);

    return new Map(pairs);
  }, [appointments, doctorReviews]);

  const refreshPrivateData = useCallback(async (token = getAccessToken()) => {
    if (!token || isOfflineMode()) {
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
          apiRequest<ApiList<ApiWeeklyAvailability> | ApiWeeklyAvailability[]>(
            "/api/availability/weekly/?ordering=weekday,start_time",
            { token }
          )
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

  // Telegram-backed authentication, run once after host detection settles.
  useEffect(() => {
    if (!telegramInitialized) {
      return;
    }

    if (!webApp) {
      const restoredToken = restoreAuthTokens();
      if (restoredToken) {
        setAuthStatus("authenticated");
        setAuthMessage("Avvalgi sessiya tiklandi.");
        void refreshPrivateData(restoredToken);
        return;
      }
      const local = getLocalAccount();
      if (local && isOfflineMode()) {
        setCurrentUser(local);
        setAuthStatus("authenticated");
        setAuthMessage("Local akkaunt tiklandi.");
      } else {
        setAuthStatus("guest");
        setAuthMessage("Telegramdan tashqarida ko'rish rejimi.");
      }
      return;
    }

    const telegramApp = webApp;

    async function authenticate() {
      if (isStaticPreviewHost()) {
        setAuthStatus("guest");
        setAuthMessage("24/7 statik ko'rish rejimi.");
        return;
      }

      if (!telegramApp.initData && !telegramUser) {
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
          : { telegram_user: telegramUser };
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

        const payload = await response.json();
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
  }, [telegramInitialized, webApp, telegramUser, refreshPrivateData]);

  // Public catalog (doctors, clinics, reviews) with graceful fallback.
  useEffect(() => {
    const controller = new AbortController();

    async function loadBackendData() {
      if (isOfflineMode()) {
        setApiDoctors(fallbackDoctors);
        setApiClinics(fallbackClinics);
        setAppointments(getLocalAppointments());
        setDoctorReviews([...getLocalReviews().map(mapReview), ...fallbackReviews]);
        setDataError(isStaticPreviewHost() || isLocalMode() ? "" : "Backend URL sozlanmagan. 24/7 ko'rish rejimi ishlayapti.");
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

  // Offline: reload local appointments/reviews when the signed-in account changes
  // (e.g. switching between the patient and doctor local accounts).
  useEffect(() => {
    if (isOfflineMode() && currentUser) {
      setAppointments(getLocalAppointments());
      setDoctorReviews([...getLocalReviews().map(mapReview), ...fallbackReviews]);
    }
  }, [currentUser]);

  const loginWithPassword = useCallback(
    async (login: string, password: string) => {
      if (isOfflineMode()) {
        // Local (no-backend) mode: restore a previously created local account.
        const local = getLocalAccount();
        if (local) {
          setCurrentUser(local);
          setAuthStatus("authenticated");
          setAuthMessage("Local akkaunt bilan kirildi.");
          return "";
        }
        return "Avval ro'yxatdan o'ting (local rejim).";
      }
      try {
        const response = await fetch(getApiUrl("/api/auth/login/"), {
          method: "POST",
          cache: "no-store",
          credentials: "omit",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ login, password })
        });
        if (!response.ok) {
          return "Login yoki parol noto'g'ri.";
        }
        const payload = await response.json();
        storeAuthTokens(payload);
        setCurrentUser(payload.user || null);
        setAuthStatus("authenticated");
        setAuthMessage("Tizimga kirildi.");
        void refreshPrivateData(payload.tokens?.access || "");
        return "";
      } catch {
        return "Kirishda xatolik. Keyinroq urinib ko'ring.";
      }
    },
    [refreshPrivateData]
  );

  const logout = useCallback(() => {
    clearLocalAccount();
    storeAuthTokens({});
    setCurrentUser(null);
    setAppointments([]);
    setDoctorProfile(null);
    setDoctorSchedule([]);
    setAuthStatus("guest");
    setAuthMessage("Tizimdan chiqildi.");
  }, []);

  const createAppointment = useCallback(async (body: Record<string, unknown>, token: string) => {
    if (isOfflineMode()) {
      const local: ApiAppointment = {
        id: `local-appt-${Date.now()}`,
        doctor: String(body.doctor ?? ""),
        doctor_name: typeof body.doctor_name === "string" ? body.doctor_name : "",
        full_name: String(body.full_name ?? ""),
        phone: String(body.phone ?? ""),
        gender: typeof body.gender === "string" ? body.gender : "",
        age: typeof body.age === "number" ? body.age : null,
        appointment_date: String(body.appointment_date ?? ""),
        appointment_time: String(body.appointment_time ?? ""),
        note: typeof body.note === "string" ? body.note : "",
        status: "pending",
        created_at: new Date().toISOString()
      };
      setAppointments(addLocalAppointment(local));
      return local;
    }
    const appointment = await apiRequest<ApiAppointment>("/api/appointments/", {
      token,
      method: "POST",
      body: JSON.stringify(body)
    });
    setAppointments((current) => [appointment, ...current]);
    return appointment;
  }, []);

  const registerUser = useCallback(
    async (formData: FormData) => {
      if (isOfflineMode()) {
        const local = buildLocalAccount(formData, "user");
        saveLocalAccount(local);
        setCurrentUser(local);
        setAuthStatus("authenticated");
        return;
      }
      const response = await fetch(getApiUrl("/api/auth/register/"), {
        method: "POST",
        body: formData
      });
      if (!response.ok) {
        throw new Error(`User register ${response.status}`);
      }
      const payload = await response.json();
      storeAuthTokens(payload);
      setCurrentUser(payload.user || null);
      void refreshPrivateData(payload.tokens?.access || "");
    },
    [refreshPrivateData]
  );

  const registerDoctor = useCallback(
    async (formData: FormData) => {
      if (isOfflineMode()) {
        const local = buildLocalAccount(formData, "doctor");
        saveLocalAccount(local);
        setCurrentUser(local);
        setAuthStatus("authenticated");
        return;
      }
      const response = await fetch(getApiUrl("/api/auth/register/"), {
        method: "POST",
        body: formData
      });
      if (!response.ok) {
        throw new Error(`Doctor register ${response.status}`);
      }
      const payload = await response.json();
      storeAuthTokens(payload);
      setCurrentUser(payload.user || null);
      void refreshPrivateData(payload.tokens?.access || "");
    },
    [refreshPrivateData]
  );

  const submitDoctorReview = useCallback(
    async (doctorId: string, rating: number, text: string, appointmentId?: string) => {
      if (isOfflineMode()) {
        const apiReview: ApiReview = {
          id: `local-review-${Date.now()}`,
          appointment: appointmentId,
          doctor: doctorId,
          patient_name: currentUser?.full_name || "Bemor",
          rating,
          comment: text,
          status: "approved",
          created_at: new Date().toISOString()
        };
        addLocalReview(apiReview);
        setDoctorReviews((current) => [mapReview(apiReview), ...current]);
        webApp?.HapticFeedback?.notificationOccurred("success");
        return "";
      }

      const appointment = appointmentId
        ? { id: appointmentId }
        : reviewableAppointmentByDoctor.get(doctorId);
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
    },
    [currentUser, reviewableAppointmentByDoctor, webApp]
  );

  const submitDoctorProfileUpdate = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
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
    },
    [webApp]
  );

  const submitDoctorSchedule = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
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
    },
    [webApp]
  );

  const runDoctorAppointmentAction = useCallback(
    async (
      appointment: ApiAppointment,
      action: "confirm" | "reject" | "complete" | "mark_no_show",
      reason = ""
    ) => {
      if (isOfflineMode()) {
        const statusByAction = {
          confirm: "doctor_confirmed",
          reject: "doctor_rejected",
          complete: "completed",
          mark_no_show: "no_show"
        } as const;
        setAppointments(
          updateLocalAppointment(appointment.id, {
            status: statusByAction[action],
            reject_reason: action === "reject" ? reason : appointment.reject_reason
          })
        );
        webApp?.HapticFeedback?.notificationOccurred("success");
        return;
      }

      const token = getAccessToken();
      if (!token) {
        setDoctorActionError("Qabulni boshqarish uchun avtorizatsiya kerak.");
        return;
      }

      try {
        setPrivateLoading(true);
        setDoctorActionError("");
        const nextAppointment = await apiRequest<ApiAppointment>(
          `/api/appointments/${appointment.id}/${action}/`,
          {
            token,
            method: "POST",
            body: action === "reject" ? JSON.stringify({ reject_reason: reason }) : undefined
          }
        );
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
    },
    [webApp]
  );

  const cancelAppointment = useCallback(
    async (appointment: ApiAppointment) => {
      if (isOfflineMode()) {
        setAppointments(updateLocalAppointment(appointment.id, { status: "user_cancelled" }));
        webApp?.HapticFeedback?.notificationOccurred("success");
        return;
      }

      const token = getAccessToken();
      if (!token) {
        setDoctorActionError("Qabulni bekor qilish uchun avtorizatsiya kerak.");
        return;
      }

      try {
        setPrivateLoading(true);
        setDoctorActionError("");
        const next = await apiRequest<ApiAppointment>(`/api/appointments/${appointment.id}/cancel/`, {
          token,
          method: "POST"
        });
        setAppointments((current) => current.map((item) => (item.id === next.id ? next : item)));
        webApp?.HapticFeedback?.notificationOccurred("success");
      } catch (error) {
        setDoctorActionError(error instanceof Error ? error.message : "Qabul bekor qilinmadi.");
        webApp?.HapticFeedback?.notificationOccurred("error");
      } finally {
        setPrivateLoading(false);
      }
    },
    [webApp]
  );

  const deleteAvailability = useCallback(
    async (item: ApiWeeklyAvailability) => {
      const token = getAccessToken();
      if (!token) {
        setDoctorActionError("Jadvalni o'chirish uchun avtorizatsiya kerak.");
        return;
      }

      try {
        setPrivateLoading(true);
        setDoctorActionError("");
        const response = await fetch(getApiUrl(`/api/availability/weekly/${item.id}/`), {
          method: "DELETE",
          cache: "no-store",
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!response.ok) {
          throw new Error(`Delete availability ${response.status}`);
        }
        setDoctorSchedule((current) => current.filter((entry) => entry.id !== item.id));
        webApp?.HapticFeedback?.notificationOccurred("success");
      } catch (error) {
        setDoctorActionError(error instanceof Error ? error.message : "Jadval o'chirilmadi.");
        webApp?.HapticFeedback?.notificationOccurred("error");
      } finally {
        setPrivateLoading(false);
      }
    },
    [webApp]
  );

  return {
    apiDoctors,
    apiClinics,
    dataLoading,
    dataError,
    doctorReviews,
    appointments,
    doctorProfile,
    doctorSchedule,
    privateLoading,
    doctorActionError,
    currentUser,
    authStatus,
    authMessage,
    reviewableAppointmentByDoctor,
    refreshPrivateData,
    loginWithPassword,
    logout,
    createAppointment,
    registerUser,
    registerDoctor,
    submitDoctorReview,
    submitDoctorProfileUpdate,
    submitDoctorSchedule,
    runDoctorAppointmentAction,
    cancelAppointment,
    deleteAvailability
  };
}
