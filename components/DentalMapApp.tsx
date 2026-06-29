"use client";

import { ArrowLeft, Bell, Loader2, Search, Stethoscope } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { API_BASE_URL, flattenClinics, isStaticPreviewHost, mapDoctor } from "@/src/dental-map/api/dentalMapApi";
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
import { RegisterView } from "@/src/dental-map/views/RegisterView";
import { ServicesView } from "@/src/dental-map/views/ServicesView";
import type { ApiClinic, ApiDoctor, ApiList, Clinic, Doctor, DoctorReview, RegisterRole, TelegramAuthStatus, TelegramUser, TelegramWebApp, ViewId } from "@/src/dental-map/types";

const APPOINTMENT_LEADS_KEY = "dentalmap_appointment_leads";
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
  const [reviewEligibleDoctorIds, setReviewEligibleDoctorIds] = useState<string[]>([]);
  const [doctorReviews, setDoctorReviews] = useState<DoctorReview[]>(fallbackReviews);
  const [registrationError, setRegistrationError] = useState("");
  const [registerRole, setRegisterRole] = useState<RegisterRole>("user");
  const [userRegistered, setUserRegistered] = useState(false);
  const [doctorRegistrationSent, setDoctorRegistrationSent] = useState(false);
  const [doctorSubscriptionPaid, setDoctorSubscriptionPaid] = useState(false);
  const [savedDoctorIds, setSavedDoctorIds] = useState<string[]>([]);
  const [savedDoctorsHydrated, setSavedDoctorsHydrated] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);
  const [telegramUser, setTelegramUser] = useState<TelegramUser | null>(null);
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

  function submitDoctorReview(doctorId: string, rating: number, text: string) {
    setDoctorReviews((current) => [
      {
        id: `review-${doctorId}-${Date.now()}`,
        doctorId,
        author: telegramUser?.first_name || "Siz",
        rating,
        text,
        date: "Bugun",
        status: "pending"
      },
      ...current
    ]);
    webApp?.HapticFeedback?.notificationOccurred("success");
  }

  function sendConsultation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selectedDoctor) {
      const formData = new FormData(event.currentTarget);
      persistAppointmentLead({
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
      });
    }
    submitConsultation();
  }

  function sendUserRegistration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitUserRegistration();
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
    formData.set("password", `Dmap-${Date.now()}-Doctor!`);
    formData.set("experience_years", experienceYears);

    try {
      setRegistrationError("");
      const response = await fetch(`${API_BASE_URL}/api/auth/register/`, {
        method: "POST",
        body: formData
      });
      if (!response.ok) {
        throw new Error(`Doctor register ${response.status}`);
      }
      submitDoctorRegistration();
    } catch {
      setRegistrationError("Anketa backendga yuborilmadi. Maydonlarni to'liq to'ldiring.");
      webApp?.HapticFeedback?.notificationOccurred("error");
    }
  }

  const submitConsultation = useCallback(() => {
    setConsultationSent(true);
    if (selectedDoctor) {
      setReviewEligibleDoctorIds((current) =>
        current.includes(selectedDoctor.id) ? current : [...current, selectedDoctor.id]
      );
    }
    webApp?.HapticFeedback?.notificationOccurred("success");
  }, [selectedDoctor, webApp]);

  const submitUserRegistration = useCallback(() => {
    setUserRegistered(true);
    webApp?.HapticFeedback?.notificationOccurred("success");
  }, [webApp]);

  const submitDoctorRegistration = useCallback(() => {
    setDoctorRegistrationSent(true);
    webApp?.HapticFeedback?.notificationOccurred("success");
  }, [webApp]);

  const submitDoctorPayment = useCallback(() => {
    setDoctorSubscriptionPaid(true);
    webApp?.HapticFeedback?.notificationOccurred("success");
  }, [webApp]);

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
      setAuthStatus("guest");
      setAuthMessage("Telegramdan tashqarida ko'rish rejimi.");
      return;
    }

    const telegramApp = tg;
    tg.ready();
    tg.expand();
    tg.disableVerticalSwipes?.();
    tg.setHeaderColor?.(tg.themeParams?.secondary_bg_color ?? "#f8fbfc");
    tg.setBackgroundColor?.(tg.themeParams?.bg_color ?? "#f8fbfc");

    const applyTelegramTheme = () => {
      const params = tg.themeParams ?? {};
      const root = document.documentElement;
      root.dataset.telegramTheme = tg.colorScheme === "dark" ? "dark" : "light";
      root.style.setProperty("--tg-bg", params.bg_color ?? "#f8fbfc");
      root.style.setProperty("--tg-text", params.text_color ?? "#142033");
      root.style.setProperty("--tg-hint", params.hint_color ?? "#667085");
      root.style.setProperty("--tg-button", params.button_color ?? "#0f8fe8");
      root.style.setProperty("--tg-button-text", params.button_text_color ?? "#ffffff");
      root.style.setProperty("--tg-secondary-bg", params.secondary_bg_color ?? "#ffffff");
    };

    const syncViewport = () => {
      const height = tg.stableViewportHeight || tg.viewportHeight;
      if (height) {
        document.documentElement.style.setProperty("--tg-viewport-height", `${height}px`);
      }
    };

    applyTelegramTheme();
    syncViewport();
    tg.onEvent?.("themeChanged", applyTelegramTheme);
    tg.onEvent?.("viewportChanged", syncViewport);

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

      try {
        setAuthStatus("loading");
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), 8000);
        const authBody = telegramApp.initData
          ? { init_data: telegramApp.initData }
          : { telegram_user: user };
        const response = await (async () => {
          try {
            return await fetch(`${API_BASE_URL}/api/auth/telegram/`, {
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
        if (payload?.tokens?.access) {
          window.sessionStorage.setItem("dentalmap_access", payload.tokens.access);
          window.sessionStorage.setItem("dentalmap_refresh", payload.tokens.refresh);
        }
        setAuthStatus("authenticated");
        setAuthMessage("Telegram akkaunt backend bilan ulandi.");
      } catch {
        setAuthStatus("error");
        setAuthMessage("Telegram auth ishlamadi. Backend URL yoki bot tokenni tekshiring.");
        telegramApp.HapticFeedback?.notificationOccurred("error");
      }
    }

    void authenticate();

    return () => {
      tg.offEvent?.("themeChanged", applyTelegramTheme);
      tg.offEvent?.("viewportChanged", syncViewport);
    };
  }, []);

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
      if (isStaticPreviewHost()) {
        setApiDoctors(fallbackDoctors);
        setApiClinics(fallbackClinics);
        setDataError("");
        setDataLoading(false);
        return;
      }

      try {
        setDataLoading(true);
        setDataError("");
        const [doctorResponse, clinicResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/api/doctors/`, { cache: "no-store", signal: controller.signal }),
          fetch(`${API_BASE_URL}/api/clinics/`, { cache: "no-store", signal: controller.signal })
        ]);
        if (!doctorResponse.ok || !clinicResponse.ok) {
          throw new Error("Backend data request failed");
        }
        const [doctorPayload, clinicPayload] = (await Promise.all([
          doctorResponse.json(),
          clinicResponse.json()
        ])) as [ApiList<ApiDoctor>, ApiList<ApiClinic>];
        setApiDoctors((doctorPayload.results ?? []).map(mapDoctor));
        setApiClinics(flattenClinics(clinicPayload.results ?? []));
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
      if (activeView === "register" && registerRole === "user") {
        submitUserRegistration();
        return;
      }
      if (activeView === "register" && registerRole === "doctor" && !doctorRegistrationSent) {
        submitDoctorRegistration();
        return;
      }
      if (activeView === "register" && registerRole === "doctor" && doctorRegistrationSent && !doctorSubscriptionPaid) {
        submitDoctorPayment();
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
    webApp
  ]);

  return (
    <main className={`${isTelegram ? "mini-shell telegram-shell" : "mini-shell"}${isMapView ? " map-mode" : ""}`}>
      <section className={isMapView ? "mini-app map-mode" : "mini-app"} aria-label="Dental Map mini ilova">
        <div className="app-scroll" ref={scrollRef}>
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
              canWriteReview={reviewEligibleDoctorIds.includes(selectedDoctor.id)}
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
              registrationError={registrationError}
              onRoleChange={setRegisterRole}
              onUserSubmit={sendUserRegistration}
              onDoctorSubmit={sendDoctorRegistration}
              onDoctorPay={submitDoctorPayment}
              onNavigate={navigate}
            />
          )}

          {activeView === "profile" && (
            <ProfileView
              doctorRegistrationSent={doctorRegistrationSent}
              doctorSubscriptionPaid={doctorSubscriptionPaid}
              onNavigate={navigate}
            />
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
