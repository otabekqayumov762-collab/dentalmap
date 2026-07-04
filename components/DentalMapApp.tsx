"use client";

import { ArrowLeft, Bell, Loader2, Moon, Search, Stethoscope, Sun, X } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isBackendConfigured, isStaticPreviewHost, isOfflineMode } from "@/src/dental-map/api/dentalMapApi";
import { districtToRegion, doctorTabs, shortcuts, tabs } from "@/src/dental-map/catalog";
import { getAccessToken } from "@/src/dental-map/lib/tokenStore";
import { isDarkActive, setPreference } from "@/src/dental-map/lib/theme";
import { normalizeGender, persistAppointmentLead } from "@/src/dental-map/lib/appointmentLead";
import { cn, RegionDistrictField, ToastProvider, useToast } from "@/src/dental-map/ui";
import { useDentalData } from "@/src/dental-map/hooks/useDentalData";
import { useSavedDoctors } from "@/src/dental-map/hooks/useSavedDoctors";
import { useTelegram } from "@/src/dental-map/hooks/useTelegram";
import { useTelegramButtons } from "@/src/dental-map/hooks/useTelegramButtons";
import { useViewNavigation } from "@/src/dental-map/hooks/useViewNavigation";
import { BrandLogo, EmptyState, TelegramStatus } from "@/src/dental-map/components/common";
import { AppointmentView } from "@/src/dental-map/views/AppointmentView";
import { ClinicsView } from "@/src/dental-map/views/ClinicsView";
import { DoctorDetailView } from "@/src/dental-map/views/DoctorDetailView";
import { DoctorsView } from "@/src/dental-map/views/DoctorsView";
import { FeedbackView } from "@/src/dental-map/views/FeedbackView";
import { AuthGate, type AuthMode } from "@/src/dental-map/views/AuthGate";
import { HomeView } from "@/src/dental-map/views/HomeView";
import { LoginView } from "@/src/dental-map/views/LoginView";
import { MapView } from "@/src/dental-map/views/MapView";
import { NotificationsView } from "@/src/dental-map/views/NotificationsView";
import { PatientAppointmentsView } from "@/src/dental-map/views/PatientAppointmentsView";
import { TelegramGate } from "@/src/dental-map/views/TelegramGate";
import { ProfileView } from "@/src/dental-map/views/ProfileView";
import { DoctorDashboardView, type DoctorSection } from "@/src/dental-map/views/DoctorDashboardView";
import { RegisterView } from "@/src/dental-map/views/RegisterView";
import { DoctorPaymentView } from "@/src/dental-map/views/payment/DoctorPaymentView";
import { ServicesView } from "@/src/dental-map/views/ServicesView";
import type { Doctor, RegisterRole, ViewId } from "@/src/dental-map/types";

function DentalMapAppInner() {
  const { toast } = useToast();
  const { webApp, telegramUser, initialized: telegramInitialized } = useTelegram();
  const { activeView, viewLoading, changeView, scrollRef } = useViewNavigation();
  const { savedDoctorIds, toggleSavedDoctor } = useSavedDoctors(webApp);
  const {
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
    refreshPrivateData,
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
  } = useDentalData({ webApp, telegramUser, telegramInitialized });

  const [query, setQuery] = useState("");
  const [region, setRegion] = useState<string | null>(null);
  const [district, setDistrict] = useState("Barchasi");
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedSlot, setSelectedSlot] = useState("14:30");
  const [consultationSent, setConsultationSent] = useState(false);
  const [appointmentSubmitting, setAppointmentSubmitting] = useState(false);
  const [registerRole, setRegisterRole] = useState<RegisterRole>("user");
  const [userRegistered, setUserRegistered] = useState(false);
  const [doctorRegistrationSent, setDoctorRegistrationSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [doctorStep, setDoctorStep] = useState(1);
  // Synchronous guard: blocks the rapid re-tap storm before React re-renders.
  const submittingRef = useRef(false);
  const [doctorSubscriptionPaid, setDoctorSubscriptionPaid] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const landedRef = useRef(false);
  // Tracks a manual Home-filter change so the saved-district seeding effect
  // never clobbers a pick the user made themselves.
  const filterTouchedRef = useRef(false);

  const isTelegram = Boolean(webApp);

  // Region+district aware filtering with recommendation ordering. Doctors and
  // clinics only carry a `district`, so the region is derived via districtToRegion.
  // A chosen district narrows to it; a chosen region narrows to its districts;
  // survivors are then ranked selected-district → same-region → rest (nearest-first).
  const hasDistrict = district !== "Barchasi";

  const matchesLocation = useCallback(
    (itemDistrict: string) => {
      if (hasDistrict) {
        return itemDistrict === district;
      }
      if (region) {
        return districtToRegion[itemDistrict] === region;
      }
      return true;
    },
    [hasDistrict, district, region]
  );

  const locationRank = useCallback(
    (itemDistrict: string) => {
      if (hasDistrict && itemDistrict === district) {
        return 0;
      }
      if (region && districtToRegion[itemDistrict] === region) {
        return 1;
      }
      return 2;
    },
    [hasDistrict, district, region]
  );

  const filteredDoctors = useMemo(() => {
    const search = query.trim().toLowerCase();

    const matched = apiDoctors.filter((doctor) => {
      const text = `${doctor.name} ${doctor.specialty} ${doctor.clinic} ${doctor.district}`.toLowerCase();
      return matchesLocation(doctor.district) && text.includes(search);
    });

    if (!hasDistrict && !region) {
      return matched;
    }
    return [...matched].sort((a, b) => locationRank(a.district) - locationRank(b.district));
  }, [apiDoctors, query, matchesLocation, locationRank, hasDistrict, region]);

  const filteredClinics = useMemo(() => {
    const search = query.trim().toLowerCase();

    const matched = apiClinics.filter((clinic) => {
      const text = `${clinic.name} ${clinic.district} ${clinic.address}`.toLowerCase();
      return matchesLocation(clinic.district) && text.includes(search);
    });

    if (!hasDistrict && !region) {
      return matched;
    }
    return [...matched].sort((a, b) => locationRank(a.district) - locationRank(b.district));
  }, [apiClinics, query, matchesLocation, locationRank, hasDistrict, region]);

  const isDoctorAccount = currentUser?.role === "doctor" || Boolean(currentUser?.doctor_profile) || doctorRegistrationSent;
  const homeView: ViewId = isDoctorAccount ? "profile" : "home";
  const isMapView = activeView === "map";
  const isAppointmentSuccess = activeView === "appointment" && consultationSent;
  const showBottomNav = !isMapView && !isAppointmentSuccess;
  const navTabs = isDoctorAccount ? doctorTabs : tabs;
  const doctorViews: ViewId[] = ["profile", "doctorRequests", "doctorSchedule", "doctorEdit"];

  const activeTabId: ViewId | null = isDoctorAccount
    ? doctorViews.includes(activeView)
      ? activeView
      : "profile"
    : activeView === "home" || activeView === "map" || activeView === "doctors" || activeView === "profile"
      ? activeView
      : activeView === "doctorDetail" || activeView === "appointment"
        ? "doctors"
        : activeView === "services" || activeView === "clinics"
          ? "home"
          : activeView === "feedback" || activeView === "myAppointments" || activeView === "notifications"
            ? "profile"
            : null;
  const showAppHeader = !isMapView && !isAppointmentSuccess;
  const showDiscoveryControls = !isDoctorAccount && activeView === "home";
  const showSearch = !isDoctorAccount && (activeView === "home" || activeView === "doctors" || activeView === "clinics");
  // Top-level tab screens don't get a back button — only genuine sub-pages do.
  const tabViews: ViewId[] = ["home", "map", "doctors", "profile", ...doctorViews];
  const showPageBack = !isMapView && !tabViews.includes(activeView);

  useEffect(() => {
    setIsDarkTheme(isDarkActive());
  }, []);

  function toggleTheme() {
    const nextDark = !isDarkTheme;
    setPreference(nextDark ? "dark" : "light");
    setIsDarkTheme(nextDark);
    webApp?.HapticFeedback?.selectionChanged();
  }

  function renderDoctorDashboard(section: DoctorSection) {
    return (
      <DoctorDashboardView
        section={section}
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
        onScheduleDelete={(item) => void deleteAvailability(item)}
        onNavigate={navigate}
        onLogout={handleLogout}
      />
    );
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
    window.requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    });
    webApp?.HapticFeedback?.notificationOccurred("success");
  }, [scrollRef, webApp]);

  function openAppointment(doctor: Doctor) {
    webApp?.HapticFeedback?.selectionChanged();
    // Always start a fresh booking form. Previously this only reset the success
    // flag when switching to a DIFFERENT doctor, so re-booking the SAME doctor
    // showed a stale "So'rov yuborildi" success and blocked a new request.
    setConsultationSent(false);
    setSelectedDoctor(doctor);
    changeView("appointment");
  }

  function openDoctor(doctor: Doctor) {
    webApp?.HapticFeedback?.selectionChanged();
    setSelectedDoctor(doctor);
    changeView("doctorDetail");
  }

  function navigate(view: ViewId) {
    webApp?.HapticFeedback?.selectionChanged();
    if (view === "appointment" && !selectedDoctor) {
      changeView("doctors");
      return;
    }
    changeView(view);
  }

  async function handleLogin(login: string, password: string) {
    return loginWithPassword(login, password);
  }

  function handleLogout() {
    logout();
    setConsultationSent(false);
    setUserRegistered(false);
    setDoctorRegistrationSent(false);
    setDoctorSubscriptionPaid(false);
    setRegisterRole("user");
    setDoctorStep(1);
    setAuthMode("login");
    landedRef.current = false;
    changeView("home");
  }

  function handleRoleChange(role: RegisterRole) {
    setRegisterRole(role);
    // Reset the doctor wizard when leaving the doctor path so it re-enters at step 1.
    if (role !== "doctor") {
      setDoctorStep(1);
    }
  }

  async function sendConsultation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (selectedDoctor) {
      const formData = new FormData(event.currentTarget);
      const profile = currentUser?.profile;
      const fullName = String(currentUser?.full_name || "").trim();
      const phone = String(currentUser?.phone || "").trim();
      if (!fullName || !phone) {
        toast.error("Profil ma'lumotlari to'liq emas. Profil bo'limida F.I.O. va telefonni to'ldiring.");
        webApp?.HapticFeedback?.notificationOccurred("error");
        return;
      }
      const lead = {
        id: `appointment-${Date.now()}`,
        createdAt: new Date().toISOString(),
        doctorId: selectedDoctor.id,
        doctorName: selectedDoctor.name,
        clinic: selectedDoctor.clinic,
        district: selectedDoctor.district,
        selectedSlot,
        fullName,
        phone,
        gender: String(profile?.gender || "").trim(),
        age: profile?.age ? String(profile.age) : "",
        appointmentDate: String(formData.get("appointmentDate") || "").trim(),
        note: String(formData.get("note") || "").trim()
      };
      const token = getAccessToken();
      const appointmentBody = {
        doctor: selectedDoctor.id,
        doctor_name: selectedDoctor.name,
        full_name: lead.fullName,
        phone: lead.phone,
        gender: normalizeGender(lead.gender),
        age: lead.age ? Number(lead.age) : null,
        appointment_date: lead.appointmentDate,
        appointment_time: selectedSlot,
        note: lead.note
      };

      if (isOfflineMode() || (token && isBackendConfigured() && !isStaticPreviewHost())) {
        try {
          setAppointmentSubmitting(true);
          await createAppointment(appointmentBody, token);
          persistAppointmentLead(lead);
          submitConsultation();
          return;
        } catch (error) {
          const message = error instanceof Error ? error.message : "Qabul so'rovi yuborilmadi.";
          toast.error(message);
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
    const password = String(formData.get("password") || "");
    const passwordConfirm = String(formData.get("password_confirm") || "");

    if (fullName.length < 2) {
      toast.error("F.I.O. ni to'liq kiriting.");
      return;
    }
    if (phone.replace(/\D/g, "").length < 12) {
      toast.error("Telefon raqamni to'liq kiriting.");
      return;
    }
    if (password.length < 8) {
      toast.error("Parol kamida 8 ta belgidan iborat bo'lishi kerak.");
      return;
    }
    if (password !== passwordConfirm) {
      toast.error("Parollar bir xil emas.");
      return;
    }

    formData.set("role", "user");
    formData.set("full_name", fullName);
    formData.set("phone", phone);
    formData.set("city", city);
    formData.delete("password_confirm");
    const gender = normalizeGender(String(formData.get("gender") || ""));
    if (gender) {
      formData.set("gender", gender);
    }
    if (!age) {
      formData.delete("age");
    }

    if (submittingRef.current) {
      return;
    }
    try {
      submittingRef.current = true;
      setIsSubmitting(true);
      await registerUser(formData);
      submitUserRegistration();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Profil backendga yuborilmadi.");
      webApp?.HapticFeedback?.notificationOccurred("error");
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  async function sendDoctorRegistration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const fullName = String(formData.get("full_name") || "").trim();
    const phone = String(formData.get("doctor_phone") || formData.get("phone") || "").trim();
    const specialty = String(formData.get("specialty") || "").trim();
    const clinicName = String(formData.get("clinic_name") || "").trim();
    const clinicDistrict = String(formData.get("clinic_district") || "").trim();
    const clinicAddress = String(formData.get("clinic_address") || "").trim();
    const rawExperience = String(formData.get("experience_years") || "").trim();
    const experienceYears = rawExperience.match(/\d+/)?.[0] ?? "0";
    const password = String(formData.get("password") || "");
    const passwordConfirm = String(formData.get("password_confirm") || "");

    if (fullName.length < 2 || phone.replace(/\D/g, "").length < 12) {
      toast.error("Shifokor F.I.O. va telefon raqamni to'liq kiriting.");
      return;
    }
    if (!specialty || !clinicName || !clinicDistrict || !clinicAddress) {
      toast.error("Mutaxassislik, klinika nomi, tuman va manzilni to'ldiring.");
      return;
    }
    if (password.length < 8) {
      toast.error("Parol kamida 8 ta belgidan iborat bo'lishi kerak.");
      return;
    }
    if (password !== passwordConfirm) {
      toast.error("Parollar bir xil emas.");
      return;
    }

    formData.set("role", "doctor");
    formData.set("full_name", fullName);
    formData.set("phone", phone);
    formData.set("doctor_phone", phone);
    formData.set("specialty", specialty);
    formData.set("clinic_name", clinicName);
    formData.set("clinic_district", clinicDistrict);
    formData.set("clinic_address", clinicAddress);
    formData.set("experience_years", experienceYears);
    // clinic_location_url is no longer collected — the location is sent to the
    // doctor via the Telegram bot after admin approval (backend treats it optional).
    formData.delete("clinic_location_url");
    formData.delete("password_confirm");

    if (submittingRef.current) {
      return;
    }
    try {
      submittingRef.current = true;
      setIsSubmitting(true);
      await registerDoctor(formData);
      submitDoctorRegistration();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ma'lumotlar backendga yuborilmadi.");
      webApp?.HapticFeedback?.notificationOccurred("error");
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  // The receipt upload itself lives in DoctorPaymentView (see views/payment).
  // Once a receipt is submitted (or the offline demo completes), this unlocks
  // entry into the app while the admin reviews the receipt asynchronously.
  const handleDoctorPaid = useCallback(() => {
    setDoctorSubscriptionPaid(true);
    webApp?.HapticFeedback?.notificationOccurred("success");
  }, [webApp]);

  // SERVER-DERIVED subscription truth. The payment gate must NOT rely on the
  // ephemeral `doctorRegistrationSent` local flag (it resets to false on reload,
  // which previously let an unpaid-but-registered doctor walk past the gate).
  // `/api/doctors/me/` (doctorProfile) and the nested `doctor_profile` on
  // `/api/users/me/` (currentUser) are both re-fetched on every reload, so the
  // gate is fully governed by the backend. A future-dated expiry is treated as
  // active as a fallback when the boolean flag is absent.
  const nestedDoctorProfile = currentUser?.doctor_profile ?? null;
  const isFutureDate = (value?: string | null) =>
    value ? new Date(value).getTime() > Date.now() : false;
  const subscriptionActive =
    Boolean(doctorProfile?.is_subscription_active) ||
    Boolean(nestedDoctorProfile?.is_subscription_active) ||
    isFutureDate(doctorProfile?.subscription_expires_at) ||
    isFutureDate(nestedDoctorProfile?.subscription_expires_at);
  // `doctorSubscriptionPaid` is kept ONLY as an additive same-session unlock right
  // after onPaid; it resets on reload so the server governs across sessions — this
  // is what closes the exploit (on reopen both local flags are false and the
  // server subscription is inactive → the doctor stays blocked).
  const doctorRegistrationPending = isDoctorAccount && !subscriptionActive && !doctorSubscriptionPaid;
  const isAuthenticated = Boolean(currentUser) && !doctorRegistrationPending;
  const telegramButtonView: ViewId = !isAuthenticated ? (authMode === "register" ? "register" : "login") : activeView;

  useEffect(() => {
    if (apiDoctors.length === 0) {
      return;
    }

    setSelectedDoctor((current) => {
      if (!current) {
        return null;
      }

      return apiDoctors.find((doctor) => doctor.id === current.id) ?? null;
    });
  }, [apiDoctors]);

  // Seed the Home location filter from the signed-in user's saved district once,
  // so they immediately see doctors/clinics near where they live. Never overrides
  // a manual pick (filterTouchedRef), and only applies for a district we can map
  // to a region — unknown/free-text districts fall back to "Barchasi".
  useEffect(() => {
    const saved = currentUser?.profile?.district;
    if (!saved || filterTouchedRef.current) {
      return;
    }
    const derived = districtToRegion[saved];
    if (!derived) {
      return;
    }
    setRegion(derived);
    setDistrict(saved);
  }, [currentUser?.profile?.district]);

  // First time a session resolves, send doctors straight to their dashboard.
  useEffect(() => {
    if (currentUser && !landedRef.current) {
      landedRef.current = true;
      if (isDoctorAccount) {
        changeView("profile");
      }
    }
  }, [currentUser, isDoctorAccount, changeView]);

  useTelegramButtons({
    webApp,
    activeView: telegramButtonView,
    registerRole,
    selectedDoctor,
    userRegistered,
    doctorRegistrationSent,
    doctorSubscriptionPaid,
    submitting: isSubmitting,
    doctorStep,
    showBack: showPageBack,
    onBack: () => navigate(homeView),
    changeView,
    submitConsultation
  });

  // Telegram-only mode (off by default so the app stays browsable). Flip
  // NEXT_PUBLIC_TELEGRAM_ONLY=true to block browser access behind the gate.
  const telegramOnly = process.env.NEXT_PUBLIC_TELEGRAM_ONLY === "true";
  const isInTelegram = Boolean(webApp?.initData) || Boolean(telegramUser);

  if (telegramOnly && !telegramInitialized) {
    return (
      <main className="grid min-h-[var(--tg-viewport-height)] place-items-center bg-surface-100">
        <Loader2 size={26} className="animate-spin text-brand-500" />
      </main>
    );
  }

  if (telegramOnly && !isInTelegram) {
    return <TelegramGate />;
  }

  // Auth wall: no entry without logging in or registering (as patient/doctor).
  // A doctor mid-registration must finish the subscription payment before entry.
  if (!isAuthenticated) {
    // Fail-closed: hold the spinner while a returning doctor's server
    // subscription state is still resolving so we neither flash the pay screen
    // nor briefly leak the app. The freshly-registered same-session case
    // (doctorRegistrationSent) skips this and goes straight to the pay step.
    if (
      authStatus === "loading" ||
      (isDoctorAccount && !doctorRegistrationSent && privateLoading && !doctorProfile)
    ) {
      return (
        <main className="grid min-h-[var(--tg-viewport-height)] place-items-center bg-surface-100">
          <Loader2 size={26} className="animate-spin text-brand-500" />
        </main>
      );
    }
    // An already-authenticated doctor who has not cleared the subscription gate
    // must land on the payment view — NOT the login wall (which would be a
    // dead-end for a logged-in account). DoctorPaymentView self-fetches receipts
    // + subscription, so a pending-receipt doctor sees the wait screen and an
    // unpaid doctor sees the pay form; both self-recover across reloads.
    if (currentUser && doctorRegistrationPending) {
      return (
        <main className="grid min-h-[var(--tg-viewport-height)] items-start justify-items-center bg-surface-100">
          <section
            className="relative h-[var(--tg-viewport-height)] w-full max-w-[640px] overflow-hidden bg-surface-100"
            aria-label="Shifokor obunasi"
          >
            <div className="h-full w-full overflow-y-auto overscroll-contain no-scrollbar px-5 py-6">
              <DoctorPaymentView paid={doctorSubscriptionPaid} onPaid={handleDoctorPaid} />
            </div>
          </section>
        </main>
      );
    }
    return (
      <AuthGate
        mode={authMode}
        onModeChange={setAuthMode}
        onLogin={handleLogin}
        role={registerRole}
        userRegistered={userRegistered}
        doctorRegistrationSent={doctorRegistrationSent}
        doctorSubscriptionPaid={doctorSubscriptionPaid}
        submitting={isSubmitting}
        doctorStep={doctorStep}
        onDoctorStepChange={setDoctorStep}
        onRoleChange={handleRoleChange}
        onUserSubmit={sendUserRegistration}
        onDoctorSubmit={sendDoctorRegistration}
        onDoctorPaid={handleDoctorPaid}
      />
    );
  }

  return (
    <main className="grid min-h-[var(--tg-viewport-height)] items-start justify-items-center bg-surface-100">
      <section
        className="relative h-[var(--tg-viewport-height)] w-full max-w-[640px] overflow-hidden bg-surface-100"
        aria-label="Dental Map mini ilova"
      >
        <div
          ref={scrollRef}
          className={cn(
            "h-full w-full overflow-y-auto overscroll-contain no-scrollbar px-5",
            isAppointmentSuccess
              ? "pb-0 overflow-hidden"
              : showBottomNav
                ? "pb-[calc(158px+env(safe-area-inset-bottom))]"
                : "pb-8"
          )}
        >
          {showAppHeader && (
            <>
              <section className="sticky top-0 z-40 -mx-5 grid gap-3 border-b border-surface-200 bg-surface-0 px-5 py-4 shadow-[0_8px_18px_rgba(32,55,76,0.08)] dark:shadow-none">
                <div className="flex items-center justify-between gap-3">
                  <button className="flex items-center gap-2.5" type="button" onClick={() => navigate(homeView)}>
                    <span className="inline-flex">
                      <BrandLogo />
                    </span>
                    <strong className="text-xl font-extrabold tracking-tight text-ink-900">
                      DENTAL <span className="text-brand-500">MAP</span>
                    </strong>
                  </button>
                  <div className="flex items-center gap-2">
                    {showSearch && (
                      <button
                        type="button"
                        aria-label="Qidirish"
                        aria-pressed={searchOpen}
                        onClick={() => setSearchOpen((open) => !open)}
                        className={cn(
                          "inline-flex h-11 w-11 items-center justify-center rounded-2xl border transition-colors",
                          searchOpen
                            ? "border-brand-300 bg-brand-50 text-brand-600"
                            : "border-surface-200 bg-surface-0 text-ink-500 hover:bg-surface-100"
                        )}
                      >
                        <Search size={18} />
                      </button>
                    )}
                    <button
                      type="button"
                      aria-label={isDarkTheme ? "Kunduzgi rejimga o'tish" : "Tungi rejimga o'tish"}
                      aria-pressed={isDarkTheme}
                      onClick={toggleTheme}
                      className={cn(
                        "inline-flex h-11 w-11 items-center justify-center rounded-2xl border transition-colors",
                        isDarkTheme
                          ? "border-brand-300 bg-brand-50 text-brand-600 dark:border-white/10 dark:bg-surface-100 dark:text-ink-700"
                          : "border-surface-200 bg-surface-0 text-ink-500 hover:bg-surface-100"
                      )}
                    >
                      {isDarkTheme ? <Sun size={18} /> : <Moon size={18} />}
                    </button>
                    <button
                      type="button"
                      aria-label="Bildirishnomalar"
                      onClick={() => navigate("notifications")}
                      className={cn(
                        "inline-flex h-11 w-11 items-center justify-center rounded-2xl border transition-colors",
                        activeView === "notifications"
                          ? "border-brand-300 bg-brand-50 text-brand-600"
                          : "border-surface-200 bg-surface-0 text-ink-500 hover:bg-surface-100"
                      )}
                    >
                      <Bell size={18} />
                    </button>
                  </div>
                </div>

                <TelegramStatus
                  status={authStatus}
                  message={authMessage}
                  user={telegramUser}
                  isTelegram={isTelegram}
                />

                {showSearch && searchOpen && (
                  <label className="flex h-12 animate-[modal-in_0.15s_ease-out] items-center gap-2.5 rounded-2xl border border-surface-200 bg-surface-50 px-4 text-ink-400 focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-100">
                    <Search size={17} />
                    <input
                      autoFocus
                      className="min-w-0 flex-1 bg-transparent text-ink-900 outline-none placeholder:text-ink-400"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Shifokor yoki klinika qidirish..."
                    />
                    {query && (
                      <button type="button" aria-label="Tozalash" onClick={() => setQuery("")} className="text-ink-400 hover:text-ink-600">
                        <X size={16} />
                      </button>
                    )}
                  </label>
                )}
              </section>

              {showDiscoveryControls && (
                <section className="mt-4 grid grid-cols-1 gap-3">
                  <div className="rounded-card bg-surface-0 p-4 shadow-card">
                    <RegionDistrictField
                      region={region}
                      district={district === "Barchasi" ? null : district}
                      onSelect={(selection) => {
                        filterTouchedRef.current = true;
                        setRegion(selection.region);
                        setDistrict(selection.district ?? "Barchasi");
                      }}
                      placeholder="Barcha hududlar"
                    />
                  </div>
                  <div className="flex min-w-0 gap-2.5 overflow-x-auto no-scrollbar pb-1" aria-label="Bo'limlar">
                    {shortcuts.map(({ id, label, Icon }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => navigate(id)}
                        className={cn(
                          "flex h-12 shrink-0 items-center gap-2 rounded-2xl border px-3.5 font-semibold transition-colors",
                          activeView === id
                            ? "border-brand-300 bg-brand-50 text-brand-700"
                            : "border-surface-100 bg-surface-0 text-brand-600 shadow-card"
                        )}
                      >
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                          <Icon size={16} />
                        </span>
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}

          {/* Breathing room between the sticky header and views that have no
              discovery controls or back button (doctor tabs, profile, etc.). */}
          {showAppHeader && !showDiscoveryControls && !showPageBack && <div className="h-4" aria-hidden="true" />}

          {showPageBack && !webApp?.BackButton && !isAppointmentSuccess && (
            <button
              className="my-3 inline-flex h-9 w-fit items-center gap-1.5 rounded-pill border border-surface-200 bg-surface-0 px-3.5 text-[13px] font-bold text-accent-700 shadow-card"
              type="button"
              onClick={() => navigate(homeView)}
            >
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
              district={district}
              onDistrictChange={(nextDistrict) => {
                filterTouchedRef.current = true;
                setDistrict(nextDistrict);
              }}
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
              isSaved={savedDoctorIds.includes(selectedDoctor.id)}
              onAppointment={openAppointment}
              onToggleSaved={() => toggleSavedDoctor(selectedDoctor.id)}
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
                onBackToMenu={() => navigate(homeView)}
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
              submitting={isSubmitting}
              doctorStep={doctorStep}
              onDoctorStepChange={setDoctorStep}
              onRoleChange={handleRoleChange}
              onUserSubmit={sendUserRegistration}
              onDoctorSubmit={sendDoctorRegistration}
              onDoctorPaid={handleDoctorPaid}
              onNavigate={navigate}
            />
          )}

          {activeView === "profile" && (
            !currentUser && !isDoctorAccount ? (
              <LoginView onLogin={handleLogin} onNavigate={navigate} />
            ) : isDoctorAccount ? (
              renderDoctorDashboard("kabinet")
            ) : (
              <ProfileView
                currentUser={currentUser}
                doctorRegistrationSent={doctorRegistrationSent}
                doctorSubscriptionPaid={doctorSubscriptionPaid}
                onNavigate={navigate}
                onLogout={handleLogout}
                onSaveProfile={updateUserProfile}
              />
            )
          )}

          {activeView === "doctorRequests" && isDoctorAccount && renderDoctorDashboard("appointments")}
          {activeView === "doctorSchedule" && isDoctorAccount && renderDoctorDashboard("schedule")}
          {activeView === "doctorEdit" && isDoctorAccount && renderDoctorDashboard("profile")}


          {activeView === "feedback" && (
            <FeedbackView />
          )}

          {activeView === "notifications" && (
            <NotificationsView
              sent={consultationSent}
              isDoctor={isDoctorAccount}
              pendingCount={appointments.filter((a) => a.status === "pending").length}
              onOpenAppointment={() => navigate("appointment")}
              onOpenRequests={() => navigate("doctorRequests")}
            />
          )}

          {activeView === "login" && <LoginView onLogin={handleLogin} onNavigate={navigate} />}

          {activeView === "myAppointments" && (
            <PatientAppointmentsView
              appointments={appointments}
              loading={privateLoading}
              error={doctorActionError}
              reviewedAppointmentIds={doctorReviews
                .map((review) => review.appointmentId)
                .filter((id): id is string => Boolean(id))}
              onRefresh={() => void refreshPrivateData()}
              onCancel={(appointment) => void cancelAppointment(appointment)}
              onSubmitReview={(appointment, rating, text) =>
                submitDoctorReview(appointment.doctor, rating, text, appointment.id)
              }
              onBook={() => navigate("doctors")}
            />
          )}
        </div>

        {viewLoading && (
          <div
            className="absolute left-1/2 top-[86px] z-[70] inline-flex h-10 -translate-x-1/2 items-center gap-2 rounded-pill border border-surface-200 bg-surface-0/95 px-3.5 text-[13px] font-bold text-accent-700 shadow-float backdrop-blur"
            role="status"
            aria-live="polite"
          >
            <Loader2 size={22} className="animate-spin" />
            <span>Yuklanmoqda</span>
          </div>
        )}

        {showBottomNav && (
          <nav
            className="absolute inset-x-5 bottom-[calc(12px+env(safe-area-inset-bottom))] z-30 grid gap-1 rounded-[22px] border border-surface-200/90 bg-surface-0/96 p-1.5 shadow-[0_-10px_24px_rgba(32,55,76,0.12)] backdrop-blur-xl dark:border-white/10 dark:bg-surface-0/90 dark:shadow-none"
            style={{ gridTemplateColumns: `repeat(${navTabs.length}, minmax(0, 1fr))` }}
            aria-label="Pastki navigatsiya"
          >
            {navTabs.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                aria-label={label}
                title={label}
                onClick={() => navigate(id)}
                className={cn(
                  "relative flex min-h-[54px] items-center justify-center rounded-[18px] transition-all",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300",
                  activeTabId === id
                    ? "bg-brand-50 text-brand-700 shadow-[inset_0_0_0_1px_rgba(55,126,208,0.08)]"
                    : "text-ink-400 hover:bg-surface-50 hover:text-ink-600"
                )}
              >
                <span
                  className={cn(
                    "grid h-7 w-7 place-items-center rounded-full transition-colors",
                    activeTabId === id ? "bg-surface-0 text-brand-600 shadow-sm" : "text-inherit"
                  )}
                >
                  <Icon size={20} strokeWidth={2.2} />
                </span>
                {activeTabId === id && (
                  <span className="absolute bottom-1.5 h-1 w-6 rounded-full bg-brand-500/70" aria-hidden="true" />
                )}
              </button>
            ))}
          </nav>
        )}
      </section>
    </main>
  );
}

export default function DentalMapApp() {
  return (
    <ToastProvider>
      <DentalMapAppInner />
    </ToastProvider>
  );
}
