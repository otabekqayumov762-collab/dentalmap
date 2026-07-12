"use client";

import { ArrowLeft, Bell, Loader2, Moon, Search, SlidersHorizontal, Stethoscope, Sun, X } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isBackendConfigured, isStaticPreviewHost, isOfflineMode } from "@/src/dental-map/api/dentalMapApi";
import { districtToRegion, doctorTabs, shortcuts, tabs } from "@/src/dental-map/catalog";
import { getAccessToken } from "@/src/dental-map/lib/tokenStore";
import { isDarkActive, setPreference } from "@/src/dental-map/lib/theme";
import { normalizeGender } from "@/src/dental-map/lib/gender";
import { isTelegramPlaceholderUser } from "@/src/dental-map/lib/onboarding";
import { cn, RegionDistrictField, Select, ToastProvider, useToast } from "@/src/dental-map/ui";
import { useDentalData } from "@/src/dental-map/hooks/useDentalData";
import { useSavedDoctors } from "@/src/dental-map/hooks/useSavedDoctors";
import { useTelegram } from "@/src/dental-map/hooks/useTelegram";
import { useTelegramButtons } from "@/src/dental-map/hooks/useTelegramButtons";
import { useViewNavigation } from "@/src/dental-map/hooks/useViewNavigation";
import { BrandLogo, EmptyState } from "@/src/dental-map/components/common";
import { AppointmentDetailView } from "@/src/dental-map/views/AppointmentDetailView";
import { AppointmentView } from "@/src/dental-map/views/AppointmentView";
import { ClinicsView } from "@/src/dental-map/views/ClinicsView";
import { DoctorDetailView } from "@/src/dental-map/views/DoctorDetailView";
import { DoctorsView } from "@/src/dental-map/views/DoctorsView";
import { SavedDoctorsView } from "@/src/dental-map/views/SavedDoctorsView";
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
import { RatingPromptSheet } from "@/src/dental-map/views/RatingPromptSheet";
import { ServicesView } from "@/src/dental-map/views/ServicesView";
import { mapLinkValidationError } from "@/src/dental-map/views/register/LocationPickerField";
import type { ApiAppointment, Doctor, RegisterRole, ViewId } from "@/src/dental-map/types";

function DentalMapAppInner() {
  const { toast } = useToast();
  const { webApp, telegramUser, initialized: telegramInitialized } = useTelegram();
  const { activeView, viewLoading, changeView, scrollRef } = useViewNavigation();
  const { savedDoctorIds, toggleSavedDoctor, clearSavedDoctors } = useSavedDoctors(webApp);
  const {
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
  } = useDentalData({ webApp, telegramUser, telegramInitialized });

  const [query, setQuery] = useState("");
  const [region, setRegion] = useState<string | null>(null);
  const [district, setDistrict] = useState("Barchasi");
  const [genderFilter, setGenderFilter] = useState<"" | "male" | "female">("");
  const [clinicFilter, setClinicFilter] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<ApiAppointment | null>(null);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [consultationSent, setConsultationSent] = useState(false);
  // Which doctor the pending request was actually sent for — the boolean alone
  // made Home label ANY selected doctor as "Administrator tasdiqini kutmoqda".
  const [consultationSentFor, setConsultationSentFor] = useState<string | null>(null);
  const [appointmentSubmitting, setAppointmentSubmitting] = useState(false);
  // Backend booking-conflict message (2-hour rule / slot already taken), surfaced
  // inline in the appointment form. Cleared on a fresh booking or a slot change.
  const [appointmentError, setAppointmentError] = useState<string | null>(null);
  const [registerRole, setRegisterRole] = useState<RegisterRole>("user");
  const [userRegistered, setUserRegistered] = useState(false);
  const [doctorRegistrationSent, setDoctorRegistrationSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [doctorStep, setDoctorStep] = useState(1);
  // Synchronous guard: blocks the rapid re-tap storm before React re-renders.
  const submittingRef = useRef(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const [ratingPromptOpen, setRatingPromptOpen] = useState(false);
  const landedRef = useRef(false);
  // One rating prompt per session: set once the auto-prompt has been shown so a
  // dismissal or a submit never re-triggers it (reset on logout via handleLogout).
  const ratingPromptShownRef = useRef(false);
  // Tracks a manual Home-filter change so the saved-district seeding effect
  // never clobbers a pick the user made themselves.
  const filterTouchedRef = useRef(false);

  // Region+district aware filtering with recommendation ordering. Doctors and
  // clinics only carry a `district`, so the region is derived via districtToRegion.
  // A chosen district narrows to it; a chosen region narrows to its districts;
  // survivors are then ranked selected-district → same-region → rest (nearest-first).
  const hasDistrict = district !== "Barchasi";
  const filtersActive = region !== null || hasDistrict || genderFilter !== "" || clinicFilter !== "";
  const resetFilters = useCallback(() => {
    filterTouchedRef.current = true;
    setRegion(null);
    setDistrict("Barchasi");
    setGenderFilter("");
    setClinicFilter("");
  }, []);

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

  // Distinct clinic names present across doctors + clinics, for the Home clinic
  // filter. Names can diverge slightly between the two sources, so the option
  // list is the UNION of both to minimise a "filters doctors but not clinics"
  // mismatch. "" (Hammasi klinikalar) shows everything.
  const clinicOptions = useMemo(() => {
    const names = new Set<string>();
    apiDoctors.forEach((doctor) => {
      if (doctor.clinic) {
        names.add(doctor.clinic);
      }
    });
    apiClinics.forEach((clinic) => {
      if (clinic.name) {
        names.add(clinic.name);
      }
    });
    const sorted = Array.from(names).sort((a, b) => a.localeCompare(b));
    return [
      { value: "", label: "Hammasi klinikalar" },
      ...sorted.map((name) => ({ value: name, label: name }))
    ];
  }, [apiDoctors, apiClinics]);

  const filteredDoctors = useMemo(() => {
    const search = query.trim().toLowerCase();

    const matched = apiDoctors.filter((doctor) => {
      const text = `${doctor.name} ${doctor.specialty} ${doctor.clinic} ${doctor.district}`.toLowerCase();
      return (
        matchesLocation(doctor.district) &&
        text.includes(search) &&
        (!genderFilter || doctor.gender === genderFilter) &&
        (!clinicFilter || doctor.clinic === clinicFilter)
      );
    });

    if (!hasDistrict && !region) {
      return matched;
    }
    return [...matched].sort((a, b) => locationRank(a.district) - locationRank(b.district));
  }, [apiDoctors, query, matchesLocation, locationRank, hasDistrict, region, genderFilter, clinicFilter]);

  const filteredClinics = useMemo(() => {
    const search = query.trim().toLowerCase();

    const matched = apiClinics.filter((clinic) => {
      const text = `${clinic.name} ${clinic.district} ${clinic.address}`.toLowerCase();
      return matchesLocation(clinic.district) && text.includes(search) && (!clinicFilter || clinic.name === clinicFilter);
    });

    if (!hasDistrict && !region) {
      return matched;
    }
    return [...matched].sort((a, b) => locationRank(a.district) - locationRank(b.district));
  }, [apiClinics, query, matchesLocation, locationRank, hasDistrict, region, clinicFilter]);

  const isDoctorAccount = currentUser?.role === "doctor" || Boolean(currentUser?.doctor_profile) || doctorRegistrationSent;
  const homeView: ViewId = isDoctorAccount ? "profile" : "home";
  const isMapView = activeView === "map";
  const isAppointmentSuccess = activeView === "appointment" && consultationSent;
  const showBottomNav = !isMapView && !isAppointmentSuccess;
  const navTabs = isDoctorAccount ? doctorTabs : tabs;
  const doctorViews: ViewId[] = ["profile", "doctorRequests", "doctorSchedule"];

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
          : activeView === "feedback" ||
              activeView === "myAppointments" ||
              activeView === "appointmentDetail" ||
              activeView === "notifications"
            ? "profile"
            : null;
  const showAppHeader = !isMapView && !isAppointmentSuccess;
  const showDiscoveryControls = !isDoctorAccount && activeView === "home";
  const showSearch = !isDoctorAccount && (activeView === "home" || activeView === "doctors" || activeView === "clinics");
  // Top-level tab screens don't get a back button — only genuine sub-pages do.
  const tabViews: ViewId[] = ["home", "map", "doctors", "profile", ...doctorViews];
  const showPageBack = !isMapView && !tabViews.includes(activeView);
  // The appointment detail renders its OWN in-page back button, so suppress the
  // chrome fallback back button there (avoids a visible duplicate) while still
  // letting the Telegram native BackButton stay wired via showPageBack.
  const ownsBackButton = activeView === "appointmentDetail";
  // The detail view belongs to the "Mening qabullarim" flow, so back returns there.
  const backTarget: ViewId = activeView === "appointmentDetail" ? "myAppointments" : homeView;

  // The appointment shown in the detail view, re-resolved from the live list so a
  // cancellation (or any status change) is reflected immediately, plus its doctor
  // from the loaded catalog (may be undefined → the view degrades gracefully).
  const detailAppointment = selectedAppointment
    ? appointments.find((item) => item.id === selectedAppointment.id) ?? selectedAppointment
    : null;
  const detailDoctor = detailAppointment
    ? apiDoctors.find((item) => item.id === detailAppointment.doctor)
    : undefined;

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
        specialties={specialties}
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
    setConsultationSentFor(selectedDoctor?.id ?? null);
    webApp?.HapticFeedback?.notificationOccurred("success");
  }, [selectedDoctor, webApp]);

  const submitUserRegistration = useCallback(() => {
    setUserRegistered(true);
    webApp?.HapticFeedback?.notificationOccurred("success");
  }, [webApp]);

  const submitDoctorRegistration = useCallback(() => {
    setDoctorRegistrationSent(true);
    changeView("profile");
    window.requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    });
    webApp?.HapticFeedback?.notificationOccurred("success");
  }, [changeView, scrollRef, webApp]);

  function openAppointment(doctor: Doctor) {
    webApp?.HapticFeedback?.selectionChanged();
    // Always start a fresh booking form. Previously this only reset the success
    // flag when switching to a DIFFERENT doctor, so re-booking the SAME doctor
    // showed a stale "So'rov yuborildi" success and blocked a new request.
    setConsultationSent(false);
    setAppointmentError(null);
    // Every booking starts with no pre-selected time (a previous doctor's pick
    // could otherwise leak into the new form in offline mode).
    setSelectedSlot("");
    setSelectedDoctor(doctor);
    changeView("appointment");
  }

  function openDoctor(doctor: Doctor) {
    webApp?.HapticFeedback?.selectionChanged();
    setSelectedDoctor(doctor);
    // Lazily pull this doctor's approved public reviews for the detail view.
    void loadDoctorReviews(doctor.id);
    changeView("doctorDetail");
  }

  function openAppointmentDetail(appointment: ApiAppointment) {
    webApp?.HapticFeedback?.selectionChanged();
    setSelectedAppointment(appointment);
    changeView("appointmentDetail");
  }

  function navigate(view: ViewId) {
    webApp?.HapticFeedback?.selectionChanged();
    if (view === "appointment") {
      if (!selectedDoctor) {
        changeView("doctors");
        return;
      }
      // EVERY entry into the appointment view starts a fresh booking. The
      // Telegram MainButton and notification paths previously skipped this
      // reset, resurrecting a stale success screen that blocked re-booking.
      setConsultationSent(false);
      setAppointmentError(null);
      setSelectedSlot("");
    }
    changeView(view);
  }

  async function handleLogin(login: string, password: string) {
    return loginWithPassword(login, password);
  }

  function handleLogout() {
    logout();
    clearSavedDoctors();
    setConsultationSent(false);
    setConsultationSentFor(null);
    setUserRegistered(false);
    setDoctorRegistrationSent(false);
    setSelectedDoctor(null);
    setSelectedSlot("");
    setRegisterRole("user");
    setDoctorStep(1);
    setAuthMode("login");
    landedRef.current = false;
    ratingPromptShownRef.current = false;
    setRatingPromptOpen(false);
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

    // Synchronous re-entry guard (same pattern as the registration handlers):
    // the Telegram MainButton fires requestSubmit() even while the in-form button
    // is disabled, so rapid taps produced duplicate POST /api/appointments/.
    if (submittingRef.current) {
      return;
    }
    if (!selectedDoctor) {
      setAppointmentError("Avval shifokor tanlang.");
      webApp?.HapticFeedback?.notificationOccurred("error");
      return;
    }
    submittingRef.current = true;
    try {
      const formData = new FormData(event.currentTarget);
      const profile = currentUser?.profile;
      const fullName = String(currentUser?.full_name || "").trim();
      const phone = String(currentUser?.phone || "").trim();
      if (!fullName || !phone) {
        toast.error("Profil ma'lumotlari to'liq emas. Profil bo'limida F.I.O. va telefonni to'ldiring.");
        webApp?.HapticFeedback?.notificationOccurred("error");
        return;
      }
      const appointmentDetails = {
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
        full_name: appointmentDetails.fullName,
        phone: appointmentDetails.phone,
        gender: normalizeGender(appointmentDetails.gender),
        age: appointmentDetails.age ? Number(appointmentDetails.age) : null,
        appointment_date: appointmentDetails.appointmentDate,
        appointment_time: selectedSlot,
        note: appointmentDetails.note
      };

      // Online mode must create a REAL backend appointment. Otherwise the UI would
      // show "So'rov yuborildi" while no bot notification/location can be sent.
      if (!isOfflineMode() && (!isBackendConfigured() || isStaticPreviewHost())) {
        setAppointmentError("Qabul so'rovi yuborilmadi. Ilovani qayta ochib urinib ko'ring.");
        webApp?.HapticFeedback?.notificationOccurred("error");
        return;
      }

      if (!isOfflineMode() && !token) {
        setAppointmentError("Avtorizatsiya talab qilinadi. Iltimos, ilovani qayta oching.");
        webApp?.HapticFeedback?.notificationOccurred("error");
        return;
      }

      if (isOfflineMode() || token) {
        try {
          setAppointmentSubmitting(true);
          setAppointmentError(null);
          await createAppointment(appointmentBody, token);
          submitConsultation();
          return;
        } catch (error) {
          // The backend rejects clashing bookings (2-soat rule / band vaqt) with a
          // field error; apiRequest surfaces its readable message via error.message.
          const message = error instanceof Error ? error.message : "Qabul so'rovi yuborilmadi.";
          setAppointmentError(message);
          webApp?.HapticFeedback?.notificationOccurred("error");
          return;
        } finally {
          setAppointmentSubmitting(false);
        }
      }

      setAppointmentError("Qabul so'rovini yuborib bo'lmadi. Ilovani qayta ochib urinib ko'ring.");
      webApp?.HapticFeedback?.notificationOccurred("error");
    } finally {
      submittingRef.current = false;
    }
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
      toast.error(error instanceof Error ? error.message : "Profil yuborilmadi. Qayta urinib ko'ring.");
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
    const clinicLocationUrl = String(formData.get("clinic_location_url") || "").trim();
    const rawExperience = String(formData.get("experience_years") || "").trim();
    const experienceYears = rawExperience.match(/\d+/)?.[0] ?? "0";
    const password = String(formData.get("password") || "");
    const passwordConfirm = String(formData.get("password_confirm") || "");

    if (fullName.length < 2 || phone.replace(/\D/g, "").length < 12) {
      toast.error("Shifokor F.I.O. va telefon raqamni to'liq kiriting.");
      return;
    }
    if (!specialty || !clinicName || !clinicDistrict) {
      toast.error("Mutaxassislik, klinika nomi va tumanni to'ldiring.");
      return;
    }
    const locationError = mapLinkValidationError(clinicLocationUrl);
    if (locationError) {
      toast.error(locationError);
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
    formData.set("clinic_location_url", clinicLocationUrl);
    formData.set("experience_years", experienceYears);
    // Normalize the collected gender (Erkak/Ayol → male/female) to mirror the
    // user path; step-1 validation is the required gate.
    const doctorGender = normalizeGender(String(formData.get("doctor_gender") || ""));
    if (doctorGender) {
      formData.set("doctor_gender", doctorGender);
    }
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
      toast.error(error instanceof Error ? error.message : "Ma'lumotlar yuborilmadi. Qayta urinib ko'ring.");
      webApp?.HapticFeedback?.notificationOccurred("error");
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  const nestedDoctorProfile = currentUser?.doctor_profile ?? null;
  const needsTelegramOnboarding = isTelegramPlaceholderUser(currentUser);
  const isAuthenticated = Boolean(currentUser) && !needsTelegramOnboarding;
  const telegramButtonView: ViewId = !isAuthenticated
    ? needsTelegramOnboarding || authMode === "register"
      ? "register"
      : "login"
    : activeView;

  // Most-recent COMPLETED-but-unreviewed appointment (the map is keyed by doctor
  // and built from the already `-created_at` ordered list, so we pick the newest
  // by created_at to prompt for the freshest visit first).
  const pendingReviewAppointment = useMemo(() => {
    const items = Array.from(reviewableAppointmentByDoctor.values());
    if (items.length === 0) {
      return null;
    }
    const createdMs = (item: ApiAppointment) => {
      const time = item.created_at ? new Date(item.created_at).getTime() : 0;
      return Number.isNaN(time) ? 0 : time;
    };
    return items.reduce((latest, item) => (createdMs(item) > createdMs(latest) ? item : latest));
  }, [reviewableAppointmentByDoctor]);

  // Auto-open the rating prompt ONCE per session: only for a patient who is past
  // the auth wall, sitting on a main tab (never mid-booking / detail flow), with a
  // pending reviewable visit. The ref guard makes it fire a single time.
  const ratingPromptViews: ViewId[] = ["home", "doctors", "clinics", "services", "map", "saved", "profile", "myAppointments"];
  useEffect(() => {
    if (
      ratingPromptShownRef.current ||
      !isAuthenticated ||
      isDoctorAccount ||
      !pendingReviewAppointment ||
      !ratingPromptViews.includes(activeView)
    ) {
      return;
    }
    ratingPromptShownRef.current = true;
    setRatingPromptOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isDoctorAccount, pendingReviewAppointment, activeView]);

  const handleRatingSubmit = useCallback(
    async (rating: number, comment: string) => {
      if (!pendingReviewAppointment) {
        return "";
      }
      const result = await submitDoctorReview(
        pendingReviewAppointment.doctor,
        rating,
        comment,
        pendingReviewAppointment.id
      );
      if (!result) {
        setRatingPromptOpen(false);
      }
      return result;
    },
    [pendingReviewAppointment, submitDoctorReview]
  );

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

  // First time a session resolves, send doctors straight to their dashboard.
  useEffect(() => {
    if (currentUser && !needsTelegramOnboarding && !landedRef.current) {
      landedRef.current = true;
      if (isDoctorAccount) {
        changeView("profile");
      }
    }
  }, [currentUser, needsTelegramOnboarding, isDoctorAccount, changeView]);

  useEffect(() => {
    if (
      !isAuthenticated ||
      isOfflineMode() ||
      !["notifications", "myAppointments", "appointmentDetail"].includes(activeView)
    ) {
      return;
    }

    const refreshVisibleData = () => {
      if (document.visibilityState !== "hidden") {
        void refreshPrivateData();
      }
    };

    refreshVisibleData();
    const interval = window.setInterval(refreshVisibleData, 15000);
    document.addEventListener("visibilitychange", refreshVisibleData);
    window.addEventListener("focus", refreshVisibleData);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshVisibleData);
      window.removeEventListener("focus", refreshVisibleData);
    };
  }, [activeView, isAuthenticated, refreshPrivateData]);

  useTelegramButtons({
    webApp,
    activeView: telegramButtonView,
    selectedDoctor,
    consultationSent,
    // Booking submits must also disable the MainButton (spinner + no re-taps).
    submitting: isSubmitting || appointmentSubmitting,
    showBack: showPageBack,
    onBack: () => navigate(backTarget),
    // Route through navigate() so the appointment view always enters via the
    // fresh-booking reset (stale success screen fix) — never raw changeView.
    changeView: navigate
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
  if (!isAuthenticated) {
    // Fail-closed: hold the spinner while a returning doctor's profile is still
    // resolving so the dashboard does not render with incomplete data.
    if (
      authStatus === "loading" ||
      // Session restored from a stored token (authStatus flips to "authenticated"
      // immediately) but currentUser is still being fetched — hold the spinner so a
      // reload on Home doesn't flash the login/register wall as if logged out.
      (authStatus === "authenticated" && !currentUser && privateLoading) ||
      (isDoctorAccount && privateLoading && !doctorProfile && !nestedDoctorProfile)
    ) {
      return (
        <main className="grid min-h-[var(--tg-viewport-height)] place-items-center bg-surface-100">
          <Loader2 size={26} className="animate-spin text-brand-500" />
        </main>
      );
    }
    return (
      <AuthGate
        mode={needsTelegramOnboarding ? "register" : authMode}
        registrationOnly={needsTelegramOnboarding}
        onModeChange={setAuthMode}
        onLogin={handleLogin}
        role={registerRole}
        specialties={specialties}
        services={services}
        userRegistered={userRegistered}
        submitting={isSubmitting}
        doctorStep={doctorStep}
        onDoctorStepChange={setDoctorStep}
        onRoleChange={handleRoleChange}
        onUserSubmit={sendUserRegistration}
        onDoctorSubmit={sendDoctorRegistration}
      />
    );
  }

  // Doctor subscription payment gate: after registering (or whenever the
  // subscription lapses) a doctor pays before the dashboard opens. Gated on
  // is_subscription_active, which the backend reports `true` whenever a paid
  // subscription is not required — so this stays a no-op unless billing is on.
  const activeDoctorProfile = nestedDoctorProfile ?? doctorProfile;
  if (isDoctorAccount && activeDoctorProfile?.is_subscription_active === false) {
    return (
      <main className="grid h-[var(--tg-viewport-height)] min-h-0 justify-items-center overflow-hidden bg-surface-100">
        <section className="h-full w-full min-w-0 max-w-[640px] overflow-y-auto overscroll-contain px-5 pb-[calc(3rem+env(safe-area-inset-bottom))] pt-[calc(2rem+env(safe-area-inset-top))] no-scrollbar">
          <DoctorPaymentView
            paid={false}
            onPaid={() => void refreshPrivateData()}
            onRefresh={() => void refreshPrivateData()}
          />
        </section>
      </main>
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
                  <div className="flex flex-col gap-3 rounded-card bg-surface-0 p-4 shadow-card">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-sm font-bold text-ink-900">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                          <SlidersHorizontal size={15} />
                        </span>
                        Shifokorni tanlash
                      </span>
                      {filtersActive && (
                        <button
                          type="button"
                          onClick={resetFilters}
                          className="inline-flex items-center gap-1 rounded-pill bg-surface-100 px-3 py-1 text-xs font-semibold text-ink-600 transition-colors hover:bg-surface-200"
                        >
                          <X size={13} />
                          Tozalash
                        </button>
                      )}
                    </div>
                    <RegionDistrictField
                      mode="filter"
                      region={region}
                      district={district === "Barchasi" ? null : district}
                      onSelect={(selection) => {
                        filterTouchedRef.current = true;
                        setRegion(selection.region);
                        setDistrict(selection.district ?? "Barchasi");
                      }}
                      placeholder="Barcha hududlar"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <Select
                        label="Jinsi"
                        value={genderFilter}
                        onChange={(next) => setGenderFilter(next as "" | "male" | "female")}
                        options={[
                          { value: "", label: "Hammasi" },
                          { value: "male", label: "Erkak" },
                          { value: "female", label: "Ayol" }
                        ]}
                      />
                      <Select
                        label="Klinika"
                        value={clinicFilter}
                        onChange={setClinicFilter}
                        options={clinicOptions}
                      />
                    </div>
                    <p className="border-t border-surface-100 pt-2.5 text-xs text-ink-400">
                      <b className="text-brand-600">{filteredDoctors.length}</b> ta shifokor topildi
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-2.5" aria-label="Bo'limlar">
                    {shortcuts.map(({ id, label, Icon }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => navigate(id)}
                        className={cn(
                          "flex flex-col items-center justify-center gap-2 rounded-2xl border py-3.5 text-sm font-semibold transition-colors",
                          activeView === id
                            ? "border-brand-300 bg-brand-50 text-brand-700"
                            : "border-surface-100 bg-surface-0 text-brand-600 shadow-card"
                        )}
                      >
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                          <Icon size={18} />
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

          {showPageBack && !ownsBackButton && !webApp?.BackButton && !isAppointmentSuccess && (
            <button
              className="my-3 inline-flex h-9 w-fit items-center gap-1.5 rounded-pill border border-surface-200 bg-surface-0 px-3.5 text-[13px] font-bold text-accent-700 shadow-card"
              type="button"
              onClick={() => navigate(backTarget)}
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
              consultationSent={consultationSent && consultationSentFor === selectedDoctor?.id}
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
              filtersActive={filtersActive}
              onResetFilters={resetFilters}
            />
          )}

          {activeView === "saved" && (
            <SavedDoctorsView
              doctors={apiDoctors.filter((doctor) => savedDoctorIds.includes(doctor.id))}
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
            <ServicesView services={services} onNavigate={navigate} />
          )}

          {activeView === "map" && (
            <MapView
              doctors={filteredDoctors}
              clinics={filteredClinics}
              district={district}
              onDistrictChange={(nextDistrict) => {
                filterTouchedRef.current = true;
                setDistrict(nextDistrict);
                setRegion(nextDistrict === "Barchasi" ? null : districtToRegion[nextDistrict] ?? null);
              }}
              onBack={() => navigate("home")}
              onAppointment={openAppointment}
            />
          )}

          {activeView === "doctorDetail" && selectedDoctor && (
            <DoctorDetailView
              doctor={selectedDoctor}
              // Lazily-loaded PUBLIC reviews for this doctor merged with the
              // session's own reviews (offline/fallback included), deduped by id.
              reviews={(() => {
                const merged = [...publicDoctorReviews, ...doctorReviews].filter(
                  (review) => review.doctorId === selectedDoctor.id && review.status === "approved"
                );
                const seen = new Set<string>();
                return merged.filter((review) =>
                  seen.has(review.id) ? false : (seen.add(review.id), true)
                );
              })()}
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
                submitError={appointmentError}
                onDismissError={() => setAppointmentError(null)}
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
              specialties={specialties}
              services={services}
              userRegistered={userRegistered}
              submitting={isSubmitting}
              doctorStep={doctorStep}
              onDoctorStepChange={setDoctorStep}
              onRoleChange={handleRoleChange}
              onUserSubmit={sendUserRegistration}
              onDoctorSubmit={sendDoctorRegistration}
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
              appointments={appointments}
              isDoctor={isDoctorAccount}
              pendingCount={appointments.filter((a) => a.status === "pending").length}
              onOpenAppointment={openAppointmentDetail}
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
              onOpenDetail={openAppointmentDetail}
              onCancel={(appointment, reason) => void cancelAppointment(appointment, reason)}
              onSubmitReview={(appointment, rating, text) =>
                submitDoctorReview(appointment.doctor, rating, text, appointment.id)
              }
              onBook={() => navigate("doctors")}
            />
          )}

          {activeView === "appointmentDetail" && detailAppointment && (
            <AppointmentDetailView
              appointment={detailAppointment}
              doctor={detailDoctor}
              onBack={() => navigate("myAppointments")}
              onCancel={(appointment, reason) => void cancelAppointment(appointment, reason)}
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

        <RatingPromptSheet
          open={ratingPromptOpen && Boolean(pendingReviewAppointment)}
          doctorName={pendingReviewAppointment?.doctor_name || "Shifokor"}
          onSubmit={handleRatingSubmit}
          onDismiss={() => setRatingPromptOpen(false)}
        />
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
