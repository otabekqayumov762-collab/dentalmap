"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  apiRequest,
  fetchServices,
  fetchSpecialties,
  flattenClinics,
  getApiUrl,
  isBackendConfigured,
  isStaticPreviewHost,
  mapDoctor,
  mapReview,
  normalizeApiList,
  normalizeSchedule,
  isOfflineMode,
  parseApiError
} from "../api/dentalMapApi";
import { fallbackClinics, fallbackDoctors, fallbackReviews } from "../catalog";
import {
  getAccessToken,
  getRefreshToken,
  restoreAuthTokens,
  storeAuthTokens,
  type AuthPayload
} from "../lib/tokenStore";
import { getFreshTelegramInitData } from "../lib/telegramInitData";
import { clearSensitiveStorage, migrateSensitiveStorage } from "../lib/sensitiveStorage";
import { buildLocalAccount, clearLocalAccount, getLocalAccount, saveLocalAccount } from "../lib/localAccount";
import { validatePhotoFile } from "../lib/fileUpload";
import { requireTelegramOnboardingInitData } from "../lib/onboarding";
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
  Service,
  Specialty,
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
  const demoCatalogEnabled = isOfflineMode();
  const [apiDoctors, setApiDoctors] = useState<Doctor[]>(() => (demoCatalogEnabled ? fallbackDoctors : []));
  const [apiClinics, setApiClinics] = useState<Clinic[]>(() => (demoCatalogEnabled ? fallbackClinics : []));
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState("");
  // The signed-in user's OWN reviews (dedupe source for "already reviewed").
  const [doctorReviews, setDoctorReviews] = useState<DoctorReview[]>(() => (demoCatalogEnabled ? fallbackReviews : []));
  // Approved PUBLIC reviews of the doctor currently open in the detail view.
  // Kept separate from doctorReviews so a detail-view load never clobbers the
  // user's own review list (which would re-offer already-reviewed appointments).
  const [publicDoctorReviews, setPublicDoctorReviews] = useState<DoctorReview[]>([]);
  const [appointments, setAppointments] = useState<ApiAppointment[]>([]);
  const [doctorProfile, setDoctorProfile] = useState<ApiDoctor | null>(null);
  const [doctorSchedule, setDoctorSchedule] = useState<ApiWeeklyAvailability[]>([]);
  const [privateLoading, setPrivateLoading] = useState(false);
  const [doctorActionError, setDoctorActionError] = useState("");
  const [currentUser, setCurrentUser] = useState<ApiUser | null>(null);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [authStatus, setAuthStatus] = useState<TelegramAuthStatus>("loading");
  const [authMessage, setAuthMessage] = useState("Telegram Mini App tayyorlanmoqda.");
  // Session generation counter: bumped on logout/login/register so any in-flight
  // refreshPrivateData from the PREVIOUS session can never resurrect its state
  // (ghost session on a shared device after logout).
  const sessionRef = useRef(0);
  // One link-telegram attempt per session (see the healing effect below).
  const linkAttemptedRef = useRef(false);

  useEffect(() => {
    migrateSensitiveStorage();
  }, []);

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

    // Snapshot the session so a logout (or account switch) mid-flight makes every
    // setState below a no-op instead of resurrecting the previous user's data.
    const session = sessionRef.current;
    const isStale = () => sessionRef.current !== session;

    try {
      setPrivateLoading(true);
      setDoctorActionError("");
      const [meResult, appointmentResult, reviewResult] = await Promise.allSettled([
        apiRequest<ApiUser>("/api/users/me/", { token }),
        apiRequest<ApiList<ApiAppointment> | ApiAppointment[]>("/api/appointments/?ordering=-created_at", { token }),
        apiRequest<ApiList<ApiReview> | ApiReview[]>("/api/reviews/?ordering=-created_at", { token })
      ]);
      if (isStale()) {
        return;
      }

      const nextUser = meResult.status === "fulfilled" ? meResult.value : null;
      if (nextUser) {
        setCurrentUser(nextUser);
      } else if (!getAccessToken()) {
        // /users/me failed AND the token store is now empty: the refresh-token
        // exchange failed and cleared the session. Surface it instead of silently
        // dumping the user on the auth wall with stale/empty data.
        setCurrentUser(null);
        setAuthStatus("guest");
        setAuthMessage("Sessiya muddati tugadi. Iltimos, qayta kiring.");
        return;
      } else if (meResult.status === "rejected") {
        setDoctorActionError(
          meResult.reason instanceof Error ? meResult.reason.message : "Ma'lumotlar yuklanmadi."
        );
      }
      if (appointmentResult.status === "fulfilled") {
        setAppointments(normalizeApiList(appointmentResult.value));
      }
      if (reviewResult.status === "fulfilled") {
        setDoctorReviews(normalizeApiList(reviewResult.value).map(mapReview));
      }
      if (
        nextUser &&
        (appointmentResult.status === "rejected" || reviewResult.status === "rejected")
      ) {
        setDoctorActionError("Ma'lumotlarning bir qismi yuklanmadi. Yangilashni qayta urinib ko'ring.");
      }

      if (nextUser && (nextUser.role === "doctor" || nextUser.doctor_profile)) {
        const [profileResult, scheduleResult] = await Promise.allSettled([
          apiRequest<ApiDoctor>("/api/doctors/me/", { token }),
          apiRequest<ApiList<ApiWeeklyAvailability> | ApiWeeklyAvailability[]>(
            "/api/availability/weekly/?ordering=weekday,start_time",
            { token }
          )
        ]);
        if (isStale()) {
          return;
        }
        if (profileResult.status === "fulfilled") {
          setDoctorProfile(profileResult.value);
        }
        if (scheduleResult.status === "fulfilled") {
          setDoctorSchedule(normalizeSchedule(scheduleResult.value));
        }
        if (profileResult.status === "rejected") {
          setDoctorActionError("Doktor profili yuklanmadi. Yangilashni qayta urinib ko'ring.");
        }
      }
    } catch (error) {
      if (!isStale()) {
        setDoctorActionError(error instanceof Error ? error.message : "Ma'lumotlar yuklanmadi.");
      }
    } finally {
      if (!isStale()) {
        setPrivateLoading(false);
      }
    }
  }, []);

  // Load approved reviews for a single doctor — called lazily by the doctor DETAIL
  // view, so the public catalog never pulls the entire /api/reviews/ list on first paint.
  const loadDoctorReviews = useCallback(async (doctorId: string) => {
    if (!doctorId || isOfflineMode() || !isBackendConfigured()) {
      return;
    }

    try {
      const response = await fetch(
        getApiUrl(`/api/reviews/?doctor=${encodeURIComponent(doctorId)}&status=approved`),
        { cache: "no-store", credentials: "omit" }
      );
      if (!response.ok) {
        return;
      }
      const payload = (await response.json()) as ApiList<ApiReview>;
      // Write to the PUBLIC per-doctor state, never to doctorReviews — replacing
      // the user's own review list here re-offered already-reviewed appointments.
      setPublicDoctorReviews(normalizeApiList(payload).map(mapReview));
    } catch {
      // Reviews are non-critical for the detail view; keep any existing state.
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
        setAuthMessage("Avvalgi sessiya tiklandi.");
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

      const initData = getFreshTelegramInitData(telegramApp);
      if (!initData && !telegramUser) {
        setAuthStatus("guest");
        setAuthMessage("Telegram foydalanuvchisi aniqlanmadi. Bot ichidan oching.");
        return;
      }

      if (!isBackendConfigured()) {
        setAuthStatus("error");
        setAuthMessage("Ilova vaqtincha ulanmayapti. Keyinroq urinib ko'ring.");
        return;
      }

      // Only ever send SIGNED initData — never an unsigned telegram_user object
      // (that path is spoofable and is an account-takeover vector).
      if (!initData) {
        setAuthStatus("guest");
        setAuthMessage("Telegram imzosi topilmadi.");
        return;
      }

      let allowStoredFallback = true;
      try {
        setAuthStatus("loading");
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), 8000);
        const authBody = { init_data: initData };
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
          if ([400, 401, 403].includes(response.status)) {
            // A rejected Telegram signature is an authentication failure, not a
            // transient outage. Never resurrect an unrelated stored session.
            allowStoredFallback = false;
            storeAuthTokens({});
            setCurrentUser(null);
          }
          throw new Error("Telegram orqali kirish vaqtincha ishlamadi.");
        }

        const payload = (await response.json()) as AuthPayload;
        if (
          !payload.user ||
          typeof payload.user !== "object" ||
          typeof payload.user.id !== "string" ||
          typeof payload.tokens?.access !== "string" ||
          !payload.tokens.access
        ) {
          throw new Error("Telegram server javobi noto'g'ri.");
        }
        if (telegramUser && payload.user.telegram_id !== telegramUser.id) {
          storeAuthTokens({});
          setCurrentUser(null);
          allowStoredFallback = false;
          throw new Error("Telegram foydalanuvchisi server javobiga mos emas.");
        }
        storeAuthTokens(payload);
        setCurrentUser(payload.user);
        setAuthStatus("authenticated");
        setAuthMessage("Telegram sessiya tayyor.");
        void refreshPrivateData(payload.tokens?.access || "");
      } catch {
        // Transient Telegram auth failures (network/timeout/5xx) may use the
        // previous tab session. Explicit signature/auth rejection fails closed.
        const restoredToken =
          allowStoredFallback && telegramUser ? restoreAuthTokens(telegramUser.id) : "";
        if (restoredToken) {
          setAuthStatus("authenticated");
          setAuthMessage("Avvalgi sessiya tiklandi.");
          void refreshPrivateData(restoredToken);
          return;
        }
        setAuthStatus("error");
        setAuthMessage("Telegram orqali kirish vaqtincha ishlamadi. Ilovani qayta ochib urinib ko'ring.");
        telegramApp.HapticFeedback?.notificationOccurred("error");
      }
    }

    void authenticate();
  }, [telegramInitialized, webApp, telegramUser, refreshPrivateData]);

  // Public catalog (doctors, clinics, reviews) with graceful fallback.
  useEffect(() => {
    const controller = new AbortController();

    async function loadBackendData() {
      if (demoCatalogEnabled) {
        setApiDoctors(fallbackDoctors);
        setApiClinics(fallbackClinics);
        setAppointments(getLocalAppointments());
        setDoctorReviews([...getLocalReviews().map(mapReview), ...fallbackReviews]);
        setDataError("");
        setDataLoading(false);
        return;
      }

      if (!isBackendConfigured()) {
        setApiDoctors([]);
        setApiClinics([]);
        setDataError("Ma'lumotlar vaqtincha yuklanmadi. Ilovani qayta ochib urinib ko'ring.");
        setDataLoading(false);
        return;
      }

      // Admin-managed specialty/service lists (independent, resilient fetch so a
      // doctors failure never blocks it and vice-versa). Empty [] on failure
      // engages the catalog fallback in the consuming forms.
      void Promise.all([
        fetchSpecialties(controller.signal),
        fetchServices(controller.signal)
      ]).then(([specialtyList, serviceList]) => {
        if (!controller.signal.aborted) {
          setSpecialties(specialtyList);
          setServices(serviceList);
        }
      });

      try {
        setDataLoading(true);
        setDataError("");
        // The doctor LIST only needs reviews_count (already denormalized on each
        // doctor), so we intentionally skip the unfiltered /api/reviews/ fetch here
        // and load reviews lazily per doctor via loadDoctorReviews() on the detail view.
        const [doctorResponse, clinicResponse] = await Promise.all([
          fetch(getApiUrl("/api/doctors/?ordering=-created_at"), {
            cache: "no-store",
            credentials: "omit",
            signal: controller.signal
          }),
          fetch(getApiUrl("/api/clinics/"), {
            cache: "no-store",
            credentials: "omit",
            signal: controller.signal
          })
        ]);
        if (!doctorResponse.ok || !clinicResponse.ok) {
          throw new Error("Backend data request failed");
        }
        const [doctorPayload, clinicPayload] = (await Promise.all([
          doctorResponse.json(),
          clinicResponse.json()
        ])) as [ApiList<ApiDoctor>, ApiList<ApiClinic>];
        setApiDoctors(normalizeApiList(doctorPayload).map(mapDoctor));
        setApiClinics(flattenClinics(normalizeApiList(clinicPayload)));
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setDataError("Ma'lumotlar vaqtincha yuklanmadi. Ilovani qayta ochib urinib ko'ring.");
          setApiDoctors([]);
          setApiClinics([]);
        }
      } finally {
        setDataLoading(false);
      }
    }

    void loadBackendData();

    return () => controller.abort();
  }, [demoCatalogEnabled]);

  // Offline: reload local appointments/reviews when the signed-in account changes
  // (e.g. switching between the patient and doctor local accounts).
  useEffect(() => {
    if (isOfflineMode() && currentUser) {
      setAppointments(getLocalAppointments());
      setDoctorReviews([...getLocalReviews().map(mapReview), ...fallbackReviews]);
    }
  }, [currentUser]);

  // Heal pre-fix accounts: users who registered via the form before init_data
  // was attached have telegram_id=NULL, so the bot can't message them (the
  // clinic-location file never arrives). When the app runs inside Telegram and
  // the signed-in user has no telegram_id, link it once per session — the
  // backend HMAC-verifies init_data before trusting the id.
  useEffect(() => {
    if (
      linkAttemptedRef.current ||
      !getFreshTelegramInitData(webApp) ||
      isOfflineMode() ||
      !currentUser ||
      currentUser.telegram_id
    ) {
      return;
    }
    const token = getAccessToken();
    if (!token) {
      return;
    }
    linkAttemptedRef.current = true;
    const initData = getFreshTelegramInitData(webApp);
    void apiRequest<ApiUser>("/api/auth/link-telegram/", {
      token,
      method: "POST",
      body: JSON.stringify({ init_data: initData })
    })
      .then((linked) => {
        if (!linked.telegram_id || (telegramUser && linked.telegram_id !== telegramUser.id)) {
          storeAuthTokens({});
          setCurrentUser(null);
          return;
        }
        storeAuthTokens({
          user: linked,
          tokens: { access: getAccessToken(), refresh: getRefreshToken() }
        });
        setCurrentUser(linked);
      })
      .catch(() => {
        // Fail-soft: a conflict/invalid signature must never disturb the session.
      });
  }, [webApp, currentUser, telegramUser]);

  const ensureTelegramLinked = useCallback(
    async (token: string) => {
      if (isOfflineMode()) {
        return currentUser;
      }
      if (currentUser?.telegram_id) {
        return currentUser;
      }
      const initData = getFreshTelegramInitData(webApp);
      if (!initData) {
        throw new Error("Qabul xabari borishi uchun Dental Mapni Telegram botdagi tugma orqali qayta oching.");
      }

      const linked = await apiRequest<ApiUser>("/api/auth/link-telegram/", {
        token,
        method: "POST",
        body: JSON.stringify({ init_data: initData })
      });
      if (!linked.telegram_id) {
        throw new Error("Telegram profilingiz ulanmagan. Botni qayta ochib urinib ko'ring.");
      }
      if (telegramUser && linked.telegram_id !== telegramUser.id) {
        storeAuthTokens({});
        setCurrentUser(null);
        throw new Error("Telegram akkaunti joriy sessiyaga mos emas.");
      }
      storeAuthTokens({
        user: linked,
        tokens: { access: getAccessToken(), refresh: getRefreshToken() }
      });
      setCurrentUser(linked);
      return linked;
    },
    [currentUser, telegramUser, webApp]
  );

  const loginWithPassword = useCallback(
    async (login: string, password: string) => {
      if (isOfflineMode()) {
        // Local (no-backend) mode: restore a previously created local account.
        const local = getLocalAccount();
        if (local) {
          setCurrentUser(local);
          setAuthStatus("authenticated");
          setAuthMessage("Tizimga kirildi.");
          return "";
        }
        return "Avval ro'yxatdan o'ting.";
      }
      try {
        // Backend login = SimpleJWT: POST /api/auth/token/ {phone,password} -> flat {access,refresh}.
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), 10000);
        const response = await (async () => {
          try {
            return await fetch(getApiUrl("/api/auth/token/"), {
              method: "POST",
              cache: "no-store",
              credentials: "omit",
              signal: controller.signal,
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ phone: login, password })
            });
          } finally {
            window.clearTimeout(timeout);
          }
        })();
        if (!response.ok) {
          return "Telefon yoki parol noto'g'ri.";
        }
        const tokens = (await response.json()) as { access?: string; refresh?: string };
        if (typeof tokens.access !== "string" || !tokens.access) {
          return "Kirish serveridan noto'g'ri javob olindi.";
        }
        // The token endpoint returns no user. Fetch the profile without the
        // generic refresh retry so a previous account's refresh token can never
        // participate while a new account is being established.
        const profileController = new AbortController();
        const profileTimeout = window.setTimeout(() => profileController.abort(), 10000);
        const profileResponse = await (async () => {
          try {
            return await fetch(getApiUrl("/api/users/me/"), {
              cache: "no-store",
              credentials: "omit",
              signal: profileController.signal,
              headers: { Authorization: `Bearer ${tokens.access}` }
            });
          } finally {
            window.clearTimeout(profileTimeout);
          }
        })();
        if (!profileResponse.ok) {
          return "Foydalanuvchi profili yuklanmadi. Qayta urinib ko'ring.";
        }
        const me = (await profileResponse.json()) as ApiUser;
        if (!me || typeof me.id !== "string") {
          return "Kirish serveridan noto'g'ri profil javobi olindi.";
        }
        sessionRef.current += 1;
        storeAuthTokens({ user: me, tokens: { access: tokens.access, refresh: tokens.refresh } });
        setCurrentUser(me);
        setAuthStatus("authenticated");
        setAuthMessage("Tizimga kirildi.");
        void refreshPrivateData(tokens.access || "");
        return "";
      } catch {
        return "Kirishda xatolik. Keyinroq urinib ko'ring.";
      }
    },
    [refreshPrivateData]
  );

  const logout = useCallback(() => {
    const accessToken = getAccessToken();
    const refreshToken = getRefreshToken();
    if (accessToken && refreshToken && isBackendConfigured() && !isOfflineMode()) {
      try {
        // Revocation is best-effort for UX, but start it before erasing the only
        // local copy. The backend verifies that the refresh belongs to the
        // authenticated access-token user and treats duplicate logout as 204.
        void fetch(getApiUrl("/api/auth/logout/"), {
          method: "POST",
          cache: "no-store",
          credentials: "omit",
          keepalive: true,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ refresh: refreshToken })
        }).catch(() => undefined);
      } catch {
        // Local cleanup must still complete when the API URL is unavailable.
      }
    }
    // Invalidate any in-flight refreshPrivateData so it can't resurrect the
    // previous user's session after logout.
    sessionRef.current += 1;
    clearLocalAccount();
    storeAuthTokens({});
    // Don't leak profile, booking drafts or offline medical data to the next
    // person on a shared device. Saved-doctor cleanup is owned by the app shell.
    clearSensitiveStorage();
    setCurrentUser(null);
    setAppointments([]);
    setDoctorReviews(fallbackReviews);
    setPublicDoctorReviews([]);
    setDoctorProfile(null);
    setDoctorSchedule([]);
    setAuthStatus("guest");
    setAuthMessage("Tizimdan chiqildi.");
  }, []);

  /**
   * Persist the patient's editable profile fields.
   * - OFFLINE: reflect the edits into the in-memory session user (ProfileView owns
   *   the sessionStorage seed used for offline restore).
   * - ONLINE: PATCH `/api/users/me/` with exactly the fields UserSerializer exposes
   *   (full_name, phone, nested profile.district/address).
   *
   * Returns "" on success, otherwise a human-readable error/status message.
   */
  const updateUserProfile = useCallback(
    async (payload: { name: string; phone: string; district: string; address: string }) => {
      if (isOfflineMode()) {
        setCurrentUser((current) =>
          current
            ? {
                ...current,
                full_name: payload.name,
                phone: payload.phone,
                profile: { ...(current.profile ?? {}), district: payload.district, address: payload.address }
              }
            : current
        );
        return "";
      }

      const token = getAccessToken();
      if (!token) {
        return "Profilni saqlash uchun avtorizatsiya kerak.";
      }

      try {
        const updated = await apiRequest<ApiUser>("/api/users/me/", {
          token,
          method: "PATCH",
          body: JSON.stringify({
            full_name: payload.name,
            phone: payload.phone,
            profile: { district: payload.district, address: payload.address }
          })
        });
        setCurrentUser(updated);
        webApp?.HapticFeedback?.notificationOccurred("success");
        return "";
      } catch (error) {
        webApp?.HapticFeedback?.notificationOccurred("error");
        return error instanceof Error ? error.message : "Profil saqlanmadi.";
      }
    },
    [webApp]
  );

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
    const initData = getFreshTelegramInitData(webApp);
    const bodyWithTelegram = initData ? { ...body, init_data: initData } : body;
    if (initData) {
      try {
        await ensureTelegramLinked(token);
      } catch {
        // Appointment creation also verifies init_data and links Telegram in the
        // same transaction. This fallback prevents a lost booking notification if
        // the preflight link request fails while signed init_data is still present.
      }
    }
    const appointment = await apiRequest<ApiAppointment>("/api/appointments/", {
      token,
      method: "POST",
      body: JSON.stringify(bodyWithTelegram)
    });
    setAppointments((current) => [appointment, ...current]);
    return appointment;
  }, [ensureTelegramLinked, webApp]);

  const registerUser = useCallback(
    async (formData: FormData) => {
      if (isOfflineMode()) {
        const local = buildLocalAccount(formData, "user");
        saveLocalAccount(local);
        setCurrentUser(local);
        setAuthStatus("authenticated");
        return;
      }
      formData.set("role", "user");
      // ROOT-CAUSE FIX ("location ishlamayapti"): inside Telegram, attach the
      // SIGNED initData so the backend stamps telegram_id on (or upgrades) the
      // account. Without it the user row has telegram_id=NULL, the bot can never
      // message the patient (clinic-location file is skipped), and the next
      // /api/auth/telegram/ call silently creates a second empty account.
      const initData = getFreshTelegramInitData(webApp);
      requireTelegramOnboardingInitData(currentUser, initData);
      if (initData) {
        formData.set("init_data", initData);
      }
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 30000);
      const response = await (async () => {
        try {
          return await fetch(getApiUrl("/api/auth/register/"), {
            method: "POST",
            cache: "no-store",
            credentials: "omit",
            signal: controller.signal,
            body: formData
          });
        } finally {
          window.clearTimeout(timeout);
        }
      })();
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(parseApiError(payload, "Profil yuborilmadi. Qayta urinib ko'ring."));
      }
      const payload = (await response.json()) as AuthPayload;
      if (!payload.user || !payload.tokens?.access) {
        throw new Error("Ro'yxatdan o'tish serveri noto'g'ri javob qaytardi.");
      }
      if (telegramUser && payload.user.telegram_id !== telegramUser.id) {
        throw new Error("Telegram akkaunti ro'yxatdan o'tgan profilga mos emas.");
      }
      sessionRef.current += 1;
      storeAuthTokens(payload);
      setCurrentUser(payload.user || null);
      // Mirror the offline branch: a successful registration IS an authenticated
      // session — without this the status banner kept showing guest/error.
      setAuthStatus("authenticated");
      setAuthMessage("Ro'yxatdan o'tildi.");
      void refreshPrivateData(payload.tokens?.access || "");
    },
    [currentUser, refreshPrivateData, telegramUser, webApp]
  );

  const registerDoctor = useCallback(
    async (formData: FormData) => {
      const photoFile = formData.get("photo_file");
      if (photoFile instanceof File && photoFile.name) {
        const photoError = validatePhotoFile(photoFile);
        if (photoError) {
          throw new Error(photoError);
        }
      }
      if (isOfflineMode()) {
        const local = buildLocalAccount(formData, "doctor");
        saveLocalAccount(local);
        setCurrentUser(local);
        setAuthStatus("authenticated");
        return;
      }
      formData.set("role", "doctor");
      // Same telegram_id linking as registerUser — the bot must be able to
      // notify doctors too, and reopening inside Telegram must resolve to THIS
      // account instead of provisioning a second empty one.
      const initData = getFreshTelegramInitData(webApp);
      requireTelegramOnboardingInitData(currentUser, initData);
      if (initData) {
        formData.set("init_data", initData);
      }
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 30000);
      const response = await (async () => {
        try {
          return await fetch(getApiUrl("/api/auth/register/"), {
            method: "POST",
            cache: "no-store",
            credentials: "omit",
            signal: controller.signal,
            body: formData
          });
        } finally {
          window.clearTimeout(timeout);
        }
      })();
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(parseApiError(payload, "Ma'lumotlar yuborilmadi. Qayta urinib ko'ring."));
      }
      const payload = (await response.json()) as AuthPayload;
      if (!payload.user || !payload.tokens?.access) {
        throw new Error("Ro'yxatdan o'tish serveri noto'g'ri javob qaytardi.");
      }
      if (telegramUser && payload.user.telegram_id !== telegramUser.id) {
        throw new Error("Telegram akkaunti ro'yxatdan o'tgan profilga mos emas.");
      }
      sessionRef.current += 1;
      storeAuthTokens(payload);
      setCurrentUser(payload.user || null);
      setAuthStatus("authenticated");
      setAuthMessage("Ro'yxatdan o'tildi.");
      void refreshPrivateData(payload.tokens?.access || "");
    },
    [currentUser, refreshPrivateData, telegramUser, webApp]
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
        return "Sharh faqat yakunlangan qabuldan keyin yuboriladi.";
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
      } else if (photoFile instanceof File) {
        const photoError = validatePhotoFile(photoFile);
        if (photoError) {
          setDoctorActionError(photoError);
          return;
        }
      }
      const experience = String(formData.get("experience_years") || "").trim();
      if (experience) {
        formData.set("experience_years", String(Number(experience) || 0));
      }
      // Backend validate_clinic_location_url rejects EVERY value that isn't a
      // Yandex/Google Maps link — including "". A doctor without a saved map link
      // could therefore never save ANY profile change. Omit the field when blank
      // so untouched-empty saves succeed; a non-blank value is still validated.
      const clinicLocationUrl = String(formData.get("clinic_location_url") || "").trim();
      if (!clinicLocationUrl) {
        formData.delete("clinic_location_url");
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
      const form = event.currentTarget;
      const formData = new FormData(form);
      const schedulePayload = {
        weekday: Number(formData.get("weekday") || 0),
        start_time: String(formData.get("start_time") || "09:00"),
        end_time: String(formData.get("end_time") || "18:00"),
        slot_duration_minutes: Number(formData.get("slot_duration_minutes") || 30),
        is_active: true,
        note: ""
      };
      const optimisticId = `optimistic-${Date.now()}`;
      const optimisticItem: ApiWeeklyAvailability = {
        id: optimisticId,
        ...schedulePayload
      };

      try {
        setPrivateLoading(true);
        setDoctorActionError("");
        setDoctorSchedule((current) => normalizeSchedule([...current, optimisticItem]));
        const item = await apiRequest<ApiWeeklyAvailability>("/api/availability/weekly/", {
          token,
          method: "POST",
          body: JSON.stringify(schedulePayload)
        });
        setDoctorSchedule((current) =>
          normalizeSchedule(current.map((entry) => (entry.id === optimisticId ? item : entry)))
        );
        form.reset();
        webApp?.HapticFeedback?.notificationOccurred("success");
      } catch (error) {
        setDoctorSchedule((current) => current.filter((entry) => entry.id !== optimisticId));
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
    async (appointment: ApiAppointment, reason = "") => {
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
        const trimmedReason = reason.trim();
        const next = await apiRequest<ApiAppointment>(`/api/appointments/${appointment.id}/cancel/`, {
          token,
          method: "POST",
          body: trimmedReason ? JSON.stringify({ reject_reason: trimmedReason }) : undefined
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
        await apiRequest<void>(`/api/availability/weekly/${item.id}/`, { token, method: "DELETE" });
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
    publicDoctorReviews,
    appointments,
    doctorProfile,
    doctorSchedule,
    privateLoading,
    doctorActionError,
    currentUser,
    specialties,
    services,
    authStatus,
    authMessage,
    reviewableAppointmentByDoctor,
    refreshPrivateData,
    loadDoctorReviews,
    loginWithPassword,
    logout,
    createAppointment,
    updateUserProfile,
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
