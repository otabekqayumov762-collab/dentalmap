"use client";

import { ArrowLeft, Bell, Loader2, Search, Stethoscope, X } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getApiUrl, isBackendConfigured, isStaticPreviewHost, isOfflineMode } from "@/src/dental-map/api/dentalMapApi";
import { shortcuts, tabs } from "@/src/dental-map/catalog";
import { getAccessToken } from "@/src/dental-map/lib/tokenStore";
import { createIdempotencyKey, createTemporaryPassword } from "@/src/dental-map/lib/secure";
import { normalizeGender, persistAppointmentLead } from "@/src/dental-map/lib/appointmentLead";
import { cn } from "@/src/dental-map/ui";
import { useDentalData } from "@/src/dental-map/hooks/useDentalData";
import { useSavedDoctors } from "@/src/dental-map/hooks/useSavedDoctors";
import { useTelegram } from "@/src/dental-map/hooks/useTelegram";
import { useTelegramButtons } from "@/src/dental-map/hooks/useTelegramButtons";
import { useViewNavigation } from "@/src/dental-map/hooks/useViewNavigation";
import { BrandLogo, DistrictFilter, EmptyState, TelegramStatus } from "@/src/dental-map/components/common";
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
import { DoctorDashboardView } from "@/src/dental-map/views/DoctorDashboardView";
import { RegisterView } from "@/src/dental-map/views/RegisterView";
import { ServicesView } from "@/src/dental-map/views/ServicesView";
import type { Doctor, RegisterRole, ViewId } from "@/src/dental-map/types";

export default function DentalMapApp() {
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
    registerUser,
    registerDoctor,
    submitDoctorReview,
    submitDoctorProfileUpdate,
    submitDoctorSchedule,
    runDoctorAppointmentAction,
    cancelAppointment,
    deleteAvailability
  } = useDentalData({ webApp, telegramUser, telegramInitialized });

  const paymentIdempotencyKeyRef = useRef<string | null>(null);
  const paymentSubmittingRef = useRef(false);
  const [query, setQuery] = useState("");
  const [district, setDistrict] = useState("Barchasi");
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedSlot, setSelectedSlot] = useState("14:30");
  const [consultationSent, setConsultationSent] = useState(false);
  const [appointmentSubmitting, setAppointmentSubmitting] = useState(false);
  const [appointmentSubmitError, setAppointmentSubmitError] = useState("");
  const [registrationError, setRegistrationError] = useState("");
  const [registerRole, setRegisterRole] = useState<RegisterRole>("user");
  const [userRegistered, setUserRegistered] = useState(false);
  const [doctorRegistrationSent, setDoctorRegistrationSent] = useState(false);
  const [doctorSubscriptionPaid, setDoctorSubscriptionPaid] = useState(false);
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const landedRef = useRef(false);

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

  const isDoctorAccount = currentUser?.role === "doctor" || Boolean(currentUser?.doctor_profile) || doctorRegistrationSent;
  const homeView: ViewId = isDoctorAccount ? "profile" : "home";
  const isMapView = activeView === "map";
  const isAppointmentSuccess = activeView === "appointment" && consultationSent;
  // Doctors work entirely inside the Kabinet (dashboard), so no bottom nav.
  const showBottomNav = !isMapView && !isAppointmentSuccess && !isDoctorAccount;

  const activeTabId: ViewId | null =
    activeView === "home" || activeView === "map" || activeView === "doctors" || activeView === "profile"
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
  const tabViews: ViewId[] = ["home", "map", "doctors", "profile"];
  const showPageBack = !isMapView && !tabViews.includes(activeView);

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
    setUserRegistered(false);
    setDoctorRegistrationSent(false);
    setDoctorSubscriptionPaid(false);
    setRegisterRole("user");
    setAuthMode("login");
    landedRef.current = false;
    changeView("home");
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
      await registerUser(formData);
      submitUserRegistration();
    } catch {
      setRegistrationError("Profil backendga yuborilmadi. F.I.O. va telefon raqamni tekshiring.");
      webApp?.HapticFeedback?.notificationOccurred("error");
    }
  }

  async function sendDoctorRegistration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const phone = String(formData.get("doctor_phone") || formData.get("phone") || "").trim();
    const rawExperience = String(formData.get("experience_years") || "").trim();
    const experienceYears = rawExperience.match(/\d+/)?.[0] ?? "0";

    formData.set("role", "doctor");
    formData.set("phone", phone);
    formData.set("experience_years", experienceYears);

    try {
      setRegistrationError("");
      formData.set("password", createTemporaryPassword("Doctor"));
      await registerDoctor(formData);
      submitDoctorRegistration();
    } catch {
      setRegistrationError("Anketa backendga yuborilmadi. Maydonlarni to'liq to'ldiring.");
      webApp?.HapticFeedback?.notificationOccurred("error");
    }
  }

  const submitDoctorPayment = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (paymentSubmittingRef.current || doctorSubscriptionPaid) {
        return;
      }
      if (isOfflineMode()) {
        // Local mode: accept the subscription without a backend charge.
        setDoctorSubscriptionPaid(true);
        webApp?.HapticFeedback?.notificationOccurred("success");
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
    },
    [doctorSubscriptionPaid, webApp]
  );

  useEffect(() => {
    if (!selectedDoctor && apiDoctors.length > 0) {
      setSelectedDoctor(apiDoctors[0]);
    }
  }, [apiDoctors, selectedDoctor]);

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
    activeView,
    registerRole,
    selectedDoctor,
    userRegistered,
    doctorRegistrationSent,
    doctorSubscriptionPaid,
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
  const doctorRegistrationPending =
    authMode === "register" && registerRole === "doctor" && doctorRegistrationSent && !doctorSubscriptionPaid;
  const isAuthenticated = Boolean(currentUser) && !doctorRegistrationPending;

  if (!isAuthenticated) {
    if (authStatus === "loading") {
      return (
        <main className="grid min-h-[var(--tg-viewport-height)] place-items-center bg-surface-100">
          <Loader2 size={26} className="animate-spin text-brand-500" />
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
        paymentSubmitting={paymentSubmitting}
        registrationError={registrationError}
        onRoleChange={(role) => {
          setRegistrationError("");
          setRegisterRole(role);
        }}
        onUserSubmit={sendUserRegistration}
        onDoctorSubmit={sendDoctorRegistration}
        onDoctorPay={submitDoctorPayment}
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
              <section className="sticky top-0 z-40 -mx-5 grid gap-3 border-b border-surface-200 bg-surface-0 px-5 py-4 shadow-[0_8px_18px_rgba(32,55,76,0.08)]">
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
                  <DistrictFilter value={district} onChange={setDistrict} />
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

          {showPageBack && (
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
            !currentUser && !isDoctorAccount ? (
              <LoginView onLogin={handleLogin} onNavigate={navigate} />
            ) : isDoctorAccount ? (
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
                onScheduleDelete={(item) => void deleteAvailability(item)}
                onNavigate={navigate}
                onLogout={handleLogout}
              />
            ) : (
              <ProfileView
                doctorRegistrationSent={doctorRegistrationSent}
                doctorSubscriptionPaid={doctorSubscriptionPaid}
                onNavigate={navigate}
                onLogout={handleLogout}
              />
            )
          )}


          {activeView === "feedback" && (
            <FeedbackView />
          )}

          {activeView === "notifications" && (
            <NotificationsView sent={consultationSent} onOpenAppointment={() => navigate("appointment")} />
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
            />
          )}
        </div>

        {viewLoading && (
          <div
            className="absolute left-1/2 top-[86px] z-[70] inline-flex h-10 -translate-x-1/2 items-center gap-2 rounded-pill border border-surface-200 bg-white/95 px-3.5 text-[13px] font-bold text-accent-700 shadow-float backdrop-blur"
            role="status"
            aria-live="polite"
          >
            <Loader2 size={22} className="animate-spin" />
            <span>Yuklanmoqda</span>
          </div>
        )}

        {showBottomNav && (
          <nav
            className="absolute inset-x-3.5 bottom-[calc(10px+env(safe-area-inset-bottom))] z-30 grid grid-cols-4 gap-1.5 rounded-[20px] border border-surface-200 bg-white/95 p-1.5 shadow-[0_-10px_24px_rgba(32,55,76,0.13)] backdrop-blur"
            aria-label="Pastki navigatsiya"
          >
            {tabs.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => navigate(id)}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 rounded-2xl py-2 text-[11px] font-semibold transition-colors",
                  activeTabId === id ? "bg-brand-50 text-brand-600" : "text-ink-400 hover:text-ink-500"
                )}
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
