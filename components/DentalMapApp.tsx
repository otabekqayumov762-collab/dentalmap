"use client";

import { ArrowLeft, Bell, Loader2, Search, Stethoscope } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getApiUrl, isBackendConfigured, isStaticPreviewHost } from "@/src/dental-map/api/dentalMapApi";
import { shortcuts, tabs } from "@/src/dental-map/catalog";
import { getAccessToken } from "@/src/dental-map/lib/tokenStore";
import { createIdempotencyKey, createTemporaryPassword } from "@/src/dental-map/lib/secure";
import { normalizeGender, persistAppointmentLead } from "@/src/dental-map/lib/appointmentLead";
import { useDentalData } from "@/src/dental-map/hooks/useDentalData";
import { useSavedDoctors } from "@/src/dental-map/hooks/useSavedDoctors";
import { useTelegram } from "@/src/dental-map/hooks/useTelegram";
import { useTelegramButtons } from "@/src/dental-map/hooks/useTelegramButtons";
import { useViewNavigation } from "@/src/dental-map/hooks/useViewNavigation";
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
    reviewableAppointmentByDoctor,
    refreshPrivateData,
    createAppointment,
    registerUser,
    registerDoctor,
    submitDoctorReview,
    submitDoctorProfileUpdate,
    submitDoctorSchedule,
    runDoctorAppointmentAction
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
  const [notificationsOpen, setNotificationsOpen] = useState(false);

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
  const isDoctorAccount = currentUser?.role === "doctor" || Boolean(currentUser?.doctor_profile) || doctorRegistrationSent;

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
          await createAppointment(
            {
              doctor: selectedDoctor.id,
              full_name: lead.fullName,
              phone: lead.phone,
              gender: normalizeGender(lead.gender),
              age: lead.age ? Number(lead.age) : null,
              appointment_date: lead.appointmentDate,
              appointment_time: selectedSlot,
              note: lead.note
            },
            token
          );
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

  useTelegramButtons({
    webApp,
    activeView,
    registerRole,
    selectedDoctor,
    userRegistered,
    doctorRegistrationSent,
    doctorSubscriptionPaid,
    changeView,
    closeNotifications: useCallback(() => setNotificationsOpen(false), []),
    submitConsultation
  });

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
