"use client";

/* eslint-disable @next/next/no-img-element */

import {
  Bell,
  Building2,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
  CreditCard,
  FileText,
  Heart,
  Home,
  LockKeyhole,
  Map,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Phone,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  Stethoscope,
  User,
  type LucideIcon
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";

type ViewId =
  | "home"
  | "services"
  | "clinics"
  | "appointment"
  | "map"
  | "records"
  | "doctors"
  | "register"
  | "profile"
  | "more";

type RegisterRole = "user" | "doctor";
type TelegramAuthStatus = "loading" | "authenticated" | "guest" | "error";

type TelegramUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
};

type TelegramThemeParams = {
  bg_color?: string;
  text_color?: string;
  hint_color?: string;
  link_color?: string;
  button_color?: string;
  button_text_color?: string;
  secondary_bg_color?: string;
};

type TelegramWebApp = {
  initData: string;
  initDataUnsafe?: { user?: TelegramUser };
  colorScheme?: "light" | "dark";
  themeParams?: TelegramThemeParams;
  viewportHeight?: number;
  stableViewportHeight?: number;
  ready: () => void;
  expand: () => void;
  close: () => void;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
  disableVerticalSwipes?: () => void;
  onEvent?: (eventType: string, callback: () => void) => void;
  offEvent?: (eventType: string, callback: () => void) => void;
  BackButton?: {
    show: () => void;
    hide: () => void;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
  };
  MainButton?: {
    text: string;
    setText: (text: string) => void;
    show: () => void;
    hide: () => void;
    enable: () => void;
    disable: () => void;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
  };
  HapticFeedback?: {
    impactOccurred: (style: "light" | "medium" | "heavy" | "rigid" | "soft") => void;
    notificationOccurred: (type: "error" | "success" | "warning") => void;
    selectionChanged: () => void;
  };
};

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp;
    };
  }
}

type Doctor = {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  reviews: number;
  experience: string;
  clinic: string;
  district: string;
  address: string;
  phone: string;
  nextSlot: string;
  image: string;
  accent: string;
};

type Clinic = {
  name: string;
  district: string;
  address: string;
  workTime: string;
  rating: number;
  image: string;
};

type Shortcut = {
  id: ViewId;
  label: string;
  Icon: LucideIcon;
};

const districts = [
  "Barchasi",
  "Yunusobod",
  "Yakkasaroy",
  "Mirobod",
  "Chilonzor",
  "Shayxontohur",
  "Mirzo Ulugbek"
];

const doctors: Doctor[] = [
  {
    id: "anna",
    name: "Dr. Dilnoza Karimova",
    specialty: "Ortodont",
    rating: 4.9,
    reviews: 112,
    experience: "12 yil",
    clinic: "Smile Dent",
    district: "Yakkasaroy",
    address: "Bobur kochasi 18",
    phone: "+998 90 112 45 67",
    nextSlot: "Bugun, 14:30",
    image:
      "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=420&q=85",
    accent: "#22b8ad"
  },
  {
    id: "ivan",
    name: "Dr. Jamshid Rasulov",
    specialty: "Jarroh stomatolog",
    rating: 4.8,
    reviews: 96,
    experience: "8 yil",
    clinic: "Denta Pro",
    district: "Mirobod",
    address: "Nukus kochasi 44",
    phone: "+998 93 771 20 30",
    nextSlot: "Ertaga, 11:00",
    image:
      "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=420&q=85",
    accent: "#1d7eea"
  },
  {
    id: "maria",
    name: "Dr. Malika Sodiqova",
    specialty: "Terapevt",
    rating: 5.0,
    reviews: 128,
    experience: "10 yil",
    clinic: "Neo Dental",
    district: "Yunusobod",
    address: "Amir Temur 77",
    phone: "+998 95 440 19 19",
    nextSlot: "20-iyun, 09:30",
    image:
      "https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&w=420&q=85",
    accent: "#ef476f"
  },
  {
    id: "dmitry",
    name: "Dr. Sardor Aliyev",
    specialty: "Ortoped",
    rating: 4.7,
    reviews: 87,
    experience: "11 yil",
    clinic: "Dental House",
    district: "Chilonzor",
    address: "Bunyodkor 9",
    phone: "+998 91 230 78 00",
    nextSlot: "21-iyun, 16:00",
    image:
      "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=420&q=85",
    accent: "#7c3aed"
  }
];

const clinics: Clinic[] = [
  {
    name: "Smile Dent",
    district: "Yakkasaroy",
    address: "Bobur kochasi 18",
    workTime: "08:00 - 21:00",
    rating: 4.9,
    image:
      "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=640&q=85"
  },
  {
    name: "Denta Pro",
    district: "Mirobod",
    address: "Nukus kochasi 44",
    workTime: "24/7 navbatchi",
    rating: 4.8,
    image:
      "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?auto=format&fit=crop&w=640&q=85"
  },
  {
    name: "Neo Dental",
    district: "Yunusobod",
    address: "Amir Temur 77",
    workTime: "08:30 - 18:00",
    rating: 5.0,
    image:
      "https://images.unsplash.com/photo-1609840114035-3c981b782dfe?auto=format&fit=crop&w=640&q=85"
  }
];

const shortcuts: Shortcut[] = [
  { id: "services", label: "Xizmatlar", Icon: SlidersHorizontal },
  { id: "clinics", label: "Klinikalar", Icon: Building2 },
  { id: "appointment", label: "Qabul", Icon: CalendarDays },
  { id: "map", label: "Xarita", Icon: MapPin },
  { id: "records", label: "Yozuvlar", Icon: FileText }
];

const tabs: Shortcut[] = [
  { id: "home", label: "Bosh", Icon: Home },
  { id: "map", label: "Xarita", Icon: Map },
  { id: "doctors", label: "Shifokor", Icon: Stethoscope },
  { id: "profile", label: "Profil", Icon: User },
  { id: "more", label: "Yana", Icon: MoreHorizontal }
];

const serviceItems = [
  "Konsultatsiya",
  "Tish davolash",
  "Tish olish",
  "Implant",
  "Breket",
  "Rentgen",
  "Oqartirish",
  "Bolalar stomatologiyasi"
];

const slots = ["09:30", "10:45", "12:15", "14:30", "16:00", "18:20"];

const paymentMethods = [
  ["click", "Click", "Telefon raqam orqali"],
  ["payme", "Payme", "Karta yoki balans orqali"],
  ["card", "Karta", "Uzcard yoki Humo"]
] as const;

const mapTiles = [
  [5670, 3061],
  [5671, 3061],
  [5672, 3061],
  [5670, 3062],
  [5671, 3062],
  [5672, 3062],
  [5670, 3063],
  [5671, 3063],
  [5672, 3063]
];

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8001";

export default function DentalMapApp() {
  const [activeView, setActiveView] = useState<ViewId>("home");
  const [query, setQuery] = useState("");
  const [district, setDistrict] = useState("Barchasi");
  const [selectedDoctor, setSelectedDoctor] = useState(doctors[0]);
  const [selectedSlot, setSelectedSlot] = useState("14:30");
  const [consultationSent, setConsultationSent] = useState(false);
  const [registerRole, setRegisterRole] = useState<RegisterRole>("user");
  const [userRegistered, setUserRegistered] = useState(false);
  const [doctorRegistrationSent, setDoctorRegistrationSent] = useState(false);
  const [doctorSubscriptionPaid, setDoctorSubscriptionPaid] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);
  const [telegramUser, setTelegramUser] = useState<TelegramUser | null>(null);
  const [authStatus, setAuthStatus] = useState<TelegramAuthStatus>("loading");
  const [authMessage, setAuthMessage] = useState("Telegram Mini App tayyorlanmoqda.");

  const isTelegram = Boolean(webApp);

  const filteredDoctors = useMemo(() => {
    const search = query.trim().toLowerCase();

    return doctors.filter((doctor) => {
      const districtOk = district === "Barchasi" || doctor.district === district;
      const text = `${doctor.name} ${doctor.specialty} ${doctor.clinic} ${doctor.district}`.toLowerCase();

      return districtOk && text.includes(search);
    });
  }, [district, query]);

  const filteredClinics = useMemo(() => {
    const search = query.trim().toLowerCase();

    return clinics.filter((clinic) => {
      const districtOk = district === "Barchasi" || clinic.district === district;
      const text = `${clinic.name} ${clinic.district} ${clinic.address}`.toLowerCase();

      return districtOk && text.includes(search);
    });
  }, [district, query]);

  function openAppointment(doctor: Doctor) {
    webApp?.HapticFeedback?.selectionChanged();
    setSelectedDoctor(doctor);
    setActiveView("appointment");
  }

  function sendConsultation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitConsultation();
  }

  function sendUserRegistration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitUserRegistration();
  }

  function sendDoctorRegistration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitDoctorRegistration();
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

  const submitDoctorPayment = useCallback(() => {
    setDoctorSubscriptionPaid(true);
    webApp?.HapticFeedback?.notificationOccurred("success");
  }, [webApp]);

  function navigate(view: ViewId) {
    webApp?.HapticFeedback?.selectionChanged();
    setActiveView(view);
  }

  function closeApp() {
    if (webApp) {
      webApp.close();
      return;
    }
    setActiveView("home");
  }

  useEffect(() => {
    const tg = window.Telegram?.WebApp ?? null;
    setWebApp(tg);

    if (!tg) {
      document.documentElement.dataset.telegramTheme = "light";
      setAuthStatus("guest");
      setAuthMessage("Telegramdan tashqarida preview rejimi.");
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
      if (!telegramApp.initData && !user) {
        setAuthStatus("guest");
        setAuthMessage("Telegram user ma'lumoti kelmadi. Bot ichidan oching.");
        return;
      }

      try {
        setAuthStatus("loading");
        const response = await fetch(`${API_BASE_URL}/api/auth/telegram/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            init_data: telegramApp.initData,
            telegram_user: user
          })
        });

        if (!response.ok) {
          throw new Error(`Telegram auth ${response.status}`);
        }

        const payload = await response.json();
        if (payload?.tokens?.access) {
          window.localStorage.setItem("dentalmap_access", payload.tokens.access);
          window.localStorage.setItem("dentalmap_refresh", payload.tokens.refresh);
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
    if (!webApp?.BackButton) {
      return;
    }

    const handleBack = () => {
      setNotificationsOpen(false);
      setActiveView("home");
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
  }, [activeView, webApp]);

  useEffect(() => {
    const mainButton = webApp?.MainButton;
    if (!mainButton) {
      return;
    }

    const handleMainButton = () => {
      if (activeView === "home" || activeView === "doctors" || activeView === "clinics" || activeView === "map") {
        setActiveView("appointment");
        return;
      }
      if (activeView === "appointment") {
        submitConsultation();
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
        ? "Admin tasdiqiga yuborish"
        : activeView === "register" && registerRole === "doctor" && doctorRegistrationSent && !doctorSubscriptionPaid
          ? "50 000 so'm to'lash"
          : activeView === "register" && registerRole === "doctor"
            ? "Doktor anketasini yuborish"
            : activeView === "register"
              ? "User profilini yaratish"
              : "Qabulga yozilish";

    if (activeView === "records" || activeView === "profile" || activeView === "more" || doctorSubscriptionPaid) {
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
    doctorRegistrationSent,
    doctorSubscriptionPaid,
    registerRole,
    submitConsultation,
    submitDoctorPayment,
    submitDoctorRegistration,
    submitUserRegistration,
    webApp
  ]);

  return (
    <main className={isTelegram ? "mini-shell telegram-shell" : "mini-shell"}>
      <section className="mini-app" aria-label="Dental Map mini ilova">
        <header className="status-bar">
          <span>Dental Map</span>
          <strong>{isTelegram ? "Telegram Mini App" : "Preview"}</strong>
          <button type="button" onClick={closeApp}>
            Yopish
          </button>
        </header>

        <div className="app-scroll">
          <section className="brand-card">
            <div className="brand-row">
              <button className="brand-title" onClick={() => navigate("home")}>
                <span className="tooth-logo">
                  <ShieldCheck size={18} />
                </span>
                <strong>
                  DENTAL <span>MAP</span>
                </strong>
              </button>
              <button
                className={notificationsOpen ? "round-icon active" : "round-icon"}
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
                onOpenRegister={() => {
                  setNotificationsOpen(false);
                  navigate("register");
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

            <label className="district-select">
              <MapPin size={16} />
              <select
                value={district}
                onChange={(event) => setDistrict(event.target.value)}
                aria-label="Tuman"
              >
                {districts.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>

            <div className="shortcut-row" aria-label="Mini ilova bo'limlari">
              {shortcuts.map(({ id, label, Icon }) => (
                <button key={id} className="shortcut" onClick={() => navigate(id)}>
                  <Icon size={18} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </section>

          {activeView === "home" && (
            <HomeView
              doctors={filteredDoctors}
              doctor={selectedDoctor}
              consultationSent={consultationSent}
              onAppointment={openAppointment}
              onNavigate={navigate}
            />
          )}

          {activeView === "doctors" && (
            <DoctorsView doctors={filteredDoctors} onAppointment={openAppointment} />
          )}

          {activeView === "clinics" && (
            <ClinicsView clinics={filteredClinics} onNavigate={navigate} />
          )}

          {activeView === "services" && (
            <ServicesView onNavigate={navigate} />
          )}

          {activeView === "map" && (
            <MapView
              doctors={filteredDoctors}
              clinics={filteredClinics}
              onAppointment={openAppointment}
            />
          )}

          {activeView === "appointment" && (
            <AppointmentView
              doctor={selectedDoctor}
              selectedSlot={selectedSlot}
              onSelectSlot={setSelectedSlot}
              onSubmit={sendConsultation}
              sent={consultationSent}
            />
          )}

          {activeView === "register" && (
            <RegisterView
              role={registerRole}
              userRegistered={userRegistered}
              doctorRegistrationSent={doctorRegistrationSent}
              doctorSubscriptionPaid={doctorSubscriptionPaid}
              onRoleChange={setRegisterRole}
              onUserSubmit={sendUserRegistration}
              onDoctorSubmit={sendDoctorRegistration}
              onDoctorPay={submitDoctorPayment}
              onNavigate={navigate}
            />
          )}

          {activeView === "records" && <RecordsView />}

          {activeView === "profile" && (
            <ProfileView
              userRegistered={userRegistered}
              doctorRegistrationSent={doctorRegistrationSent}
              doctorSubscriptionPaid={doctorSubscriptionPaid}
              onNavigate={navigate}
            />
          )}

          {activeView === "more" && (
            <MoreView onNavigate={navigate} sent={consultationSent} />
          )}
        </div>

        <nav className="bottom-tabs" aria-label="Pastki navigatsiya">
          {tabs.map(({ id, label, Icon }) => (
            <button
              key={id}
              className={activeView === id ? "tab active" : "tab"}
              onClick={() => navigate(id)}
            >
              <Icon size={20} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </section>
    </main>
  );
}

function TelegramStatus({
  status,
  message,
  user,
  isTelegram
}: {
  status: TelegramAuthStatus;
  message: string;
  user: TelegramUser | null;
  isTelegram: boolean;
}) {
  const name = user
    ? [user.first_name, user.last_name].filter(Boolean).join(" ") || `@${user.username}` || `ID ${user.id}`
    : "Telegram user aniqlanmadi";

  return (
    <section className={`telegram-status ${status}`} aria-live="polite">
      <span className="telegram-dot" />
      <div>
        <strong>{isTelegram ? name : "Browser preview"}</strong>
        <small>{message}</small>
      </div>
    </section>
  );
}

function NotificationPanel({
  sent,
  onOpenAppointment,
  onOpenRegister
}: {
  sent: boolean;
  onOpenAppointment: () => void;
  onOpenRegister: () => void;
}) {
  return (
    <section className="notification-panel">
      <div>
        <strong>Bildirishnomalar</strong>
        <button type="button" onClick={onOpenAppointment}>
          Qabulni ochish
        </button>
      </div>
      <button className="notification-row" type="button" onClick={onOpenAppointment}>
        <span className="soft-icon">
          <CheckCircle2 size={17} />
        </span>
        <span>
          <strong>{sent ? "Admin tasdiqi kutilmoqda" : "Qabul formasi tayyor"}</strong>
          <small>
            {sent
              ? "Administrator sorovingizni ko'rib chiqmoqda."
              : "F.I.O, telefon, kun va vaqtni kiriting."}
          </small>
        </span>
      </button>
      <button className="notification-row" type="button" onClick={onOpenRegister}>
        <span className="soft-icon">
          <LockKeyhole size={17} />
        </span>
        <span>
          <strong>Ro&apos;yxatdan o&apos;tish</strong>
          <small>Oddiy user yoki doktor sifatida profil oching.</small>
        </span>
      </button>
      <button className="notification-row" type="button" onClick={onOpenAppointment}>
        <span className="soft-icon">
          <Clock size={17} />
        </span>
        <span>
          <strong>Bugungi bo&apos;sh vaqtlar</strong>
          <small>14:30 va 16:00 slotlari mavjud.</small>
        </span>
      </button>
    </section>
  );
}

function HomeView({
  doctors,
  doctor,
  consultationSent,
  onAppointment,
  onNavigate
}: {
  doctors: Doctor[];
  doctor: Doctor;
  consultationSent: boolean;
  onAppointment: (doctor: Doctor) => void;
  onNavigate: (view: ViewId) => void;
}) {
  return (
    <div className="view-stack">
      <SectionTitle
        title="Tavsiya etilgan shifokorlar"
        action="Barchasi"
        onAction={() => onNavigate("doctors")}
      />
      <div className="doctor-grid">
        {doctors.slice(0, 4).map((item) => (
          <DoctorCard key={item.id} doctor={item} onAppointment={() => onAppointment(item)} />
        ))}
      </div>

      <SectionTitle
        title="Yaqin qabul"
        action="Ochish"
        onAction={() => onNavigate("appointment")}
      />
      <button className="appointment-strip" onClick={() => onNavigate("appointment")}>
        <img src={doctor.image} alt={doctor.name} />
        <span>
          <strong>{doctor.name}</strong>
          <small>
            28-oktabr, 11:30 - {doctor.clinic}
          </small>
          <em>{consultationSent ? "Admin tasdiqini kutmoqda" : "Qabulga yozilish tayyor"}</em>
        </span>
        <ChevronRight size={18} />
      </button>

      <section className="info-card">
        <div>
          <span className="soft-icon">
            <MessageCircle size={18} />
          </span>
          <strong>Tez konsultatsiya</strong>
          <p>Jinsi, yoshi, F.I.O, telefon, kun va vaqtni kiritib sorov yuboring.</p>
        </div>
        <button className="primary-btn" onClick={() => onNavigate("appointment")}>
          Boshlash
        </button>
      </section>

      <section className="info-card">
        <div>
          <span className="soft-icon">
            <LockKeyhole size={18} />
          </span>
          <strong>Ro&apos;yxatdan o&apos;tish</strong>
          <p>Oddiy foydalanuvchi yoki doktor sifatida profil oching.</p>
        </div>
        <button className="secondary-btn" onClick={() => onNavigate("register")}>
          Rol tanlash
        </button>
      </section>
    </div>
  );
}

function DoctorsView({
  doctors,
  onAppointment
}: {
  doctors: Doctor[];
  onAppointment: (doctor: Doctor) => void;
}) {
  return (
    <div className="view-stack">
      <PageHead
        title="Shifokorlar"
        text="Tuman, klinika va mutaxassislik bo'yicha shifokor tanlang."
      />
      <div className="doctor-grid">
        {doctors.map((doctor) => (
          <DoctorCard key={doctor.id} doctor={doctor} onAppointment={() => onAppointment(doctor)} />
        ))}
      </div>
    </div>
  );
}

function ClinicsView({
  clinics,
  onNavigate
}: {
  clinics: Clinic[];
  onNavigate: (view: ViewId) => void;
}) {
  return (
    <div className="view-stack">
      <PageHead title="Klinikalar" text="Yaqin klinikalar, ish vaqti, reyting va manzil." />
      {clinics.map((clinic) => (
        <article className="clinic-card" key={clinic.name}>
          <img src={clinic.image} alt={clinic.name} />
          <div>
            <strong>{clinic.name}</strong>
            <span>
              <Star size={14} /> {clinic.rating} - {clinic.district}
            </span>
            <p>{clinic.address}</p>
            <small>{clinic.workTime}</small>
          </div>
          <button className="mini-btn" onClick={() => onNavigate("appointment")}>
            Qabulga yozilish
          </button>
        </article>
      ))}
    </div>
  );
}

function ServicesView({ onNavigate }: { onNavigate: (view: ViewId) => void }) {
  return (
    <div className="view-stack">
      <PageHead title="Xizmatlar" text="Stomatologik xizmatlar va konsultatsiya turi." />
      <div className="service-grid">
        {serviceItems.map((service) => (
          <button key={service} className="service-card" onClick={() => onNavigate("appointment")}>
            <span className="soft-icon">
              <ShieldCheck size={18} />
            </span>
            <strong>{service}</strong>
          </button>
        ))}
      </div>
    </div>
  );
}

function MapView({
  doctors,
  clinics,
  onAppointment
}: {
  doctors: Doctor[];
  clinics: Clinic[];
  onAppointment: (doctor: Doctor) => void;
}) {
  return (
    <div className="view-stack">
      <PageHead title="Xarita" text="Toshkent bo'yicha klinikalar va yaqin shifokorlar." />
      <section className="map-card" aria-label="Toshkent xaritasi">
        <div className="tile-map" aria-hidden="true">
          {mapTiles.map(([x, y]) => (
            <img
              key={`${x}-${y}`}
              src={`https://tile.openstreetmap.org/13/${x}/${y}.png`}
              alt=""
              loading="lazy"
            />
          ))}
        </div>
        <span className="map-marker clinic-marker-one">Smile Dent</span>
        <span className="map-marker clinic-marker-two">Denta Pro</span>
        <span className="map-marker user-marker">Siz</span>
        <div className="map-overlay">
          <span>
            <MapPin size={16} />
            Toshkent
          </span>
          <button type="button">Lokatsiyani yuborish</button>
        </div>
      </section>
      <div className="clinic-map-list">
        {clinics.slice(0, 3).map((clinic) => (
          <article key={clinic.name}>
            <Building2 size={16} />
            <span>
              <strong>{clinic.name}</strong>
              <small>
                {clinic.district}, {clinic.address}
              </small>
            </span>
          </article>
        ))}
      </div>
      <SectionTitle title="Yaqin shifokorlar" />
      {doctors.slice(0, 3).map((doctor) => (
        <button className="nearby-row" key={doctor.id} onClick={() => onAppointment(doctor)}>
          <img src={doctor.image} alt={doctor.name} />
          <span>
            <strong>{doctor.name}</strong>
            <small>
              {doctor.clinic} - {doctor.district}
            </small>
          </span>
          <ChevronRight size={18} />
        </button>
      ))}
    </div>
  );
}

function AppointmentView({
  doctor,
  selectedSlot,
  onSelectSlot,
  onSubmit,
  sent
}: {
  doctor: Doctor;
  selectedSlot: string;
  onSelectSlot: (slot: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  sent: boolean;
}) {
  return (
    <div className="view-stack">
      <PageHead title="Qabul" text="Qabul sanasi va konsultatsiya ma'lumotlari." />

      <article className="selected-doctor">
        <img src={doctor.image} alt={doctor.name} />
        <div>
          <strong>{doctor.name}</strong>
          <span>{doctor.specialty}</span>
          <small>
            {doctor.clinic}, {doctor.district}
          </small>
        </div>
      </article>

      <SectionTitle title="Vaqt belgilash" />
      <div className="slot-grid">
        {slots.map((slot) => (
          <button
            key={slot}
            className={selectedSlot === slot ? "slot active" : "slot"}
            onClick={() => onSelectSlot(slot)}
          >
            <Clock size={15} />
            {slot}
          </button>
        ))}
      </div>

      <form className="consult-form" onSubmit={onSubmit}>
        <label>
          <span>F.I.O.</span>
          <input defaultValue="Aziz Karimov" />
        </label>
        <label>
          <span>Telefon raqam</span>
          <input defaultValue="+998 90 555 22 11" />
        </label>
        <div className="two-fields">
          <label>
            <span>Jinsi</span>
            <select defaultValue="Erkak">
              <option>Erkak</option>
              <option>Ayol</option>
            </select>
          </label>
          <label>
            <span>Yoshi</span>
            <input type="number" defaultValue="28" min="1" max="100" />
          </label>
        </div>
        <label>
          <span>Kun belgilash</span>
          <input type="date" defaultValue="2026-06-20" />
        </label>
        <label>
          <span>Izoh</span>
          <textarea defaultValue="Tish og'rig'i bor, konsultatsiya kerak." />
        </label>
        <button className="primary-btn submit" type="submit">
          <CheckCircle2 size={18} />
          Admin tasdiqiga yuborish
        </button>
      </form>

      <div className={sent ? "admin-status sent" : "admin-status"}>
        <CheckCircle2 size={18} />
        <span>
          <strong>{sent ? "Sorov yuborildi" : "Admin tasdiqi"}</strong>
          <small>
            {sent
              ? "Administrator qabul vaqtini tekshiradi va holatni yangilaydi."
              : "Forma yuborilgandan keyin admin tasdiq jarayoni boshlanadi."}
          </small>
        </span>
      </div>
    </div>
  );
}

function RegisterView({
  role,
  userRegistered,
  doctorRegistrationSent,
  doctorSubscriptionPaid,
  onRoleChange,
  onUserSubmit,
  onDoctorSubmit,
  onDoctorPay,
  onNavigate
}: {
  role: RegisterRole;
  userRegistered: boolean;
  doctorRegistrationSent: boolean;
  doctorSubscriptionPaid: boolean;
  onRoleChange: (role: RegisterRole) => void;
  onUserSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onDoctorSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onDoctorPay: () => void;
  onNavigate: (view: ViewId) => void;
}) {
  const [method, setMethod] = useState<(typeof paymentMethods)[number][0]>("click");

  return (
    <div className="view-stack">
      <PageHead
        title="Ro'yxatdan o'tish"
        text="Avval rolni tanlang: oddiy foydalanuvchi yoki doktor."
      />

      <div className="role-toggle" aria-label="Rol tanlash">
        <button
          className={role === "user" ? "role-option active" : "role-option"}
          type="button"
          onClick={() => onRoleChange("user")}
        >
          <User size={20} />
          <span>
            <strong>Oddiy user</strong>
            <small>Qabulga yozilish va konsultatsiya olish</small>
          </span>
        </button>
        <button
          className={role === "doctor" ? "role-option active" : "role-option"}
          type="button"
          onClick={() => onRoleChange("doctor")}
        >
          <Stethoscope size={20} />
          <span>
            <strong>Doktor</strong>
            <small>Anketa, klinika va obuna to&apos;lovi</small>
          </span>
        </button>
      </div>

      {role === "user" ? (
        <>
          <form className="consult-form" onSubmit={onUserSubmit}>
            <label>
              <span>F.I.O.</span>
              <input defaultValue="Aziz Karimov" />
            </label>
            <label>
              <span>Telefon raqam</span>
              <input defaultValue="+998 90 555 22 11" />
            </label>
            <div className="two-fields">
              <label>
                <span>Jinsi</span>
                <select defaultValue="Erkak">
                  <option>Erkak</option>
                  <option>Ayol</option>
                </select>
              </label>
              <label>
                <span>Yoshi</span>
                <input type="number" defaultValue="28" min="1" max="100" />
              </label>
            </div>
            <label>
              <span>Shahar</span>
              <input defaultValue="Toshkent" />
            </label>
            <label>
              <span>Tuman</span>
              <select defaultValue="Yakkasaroy">
                {districts.slice(1).map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Yashash joyi</span>
              <textarea defaultValue="Bobur kochasi, 18-uy" />
            </label>
            <button className="primary-btn submit" type="submit">
              <CheckCircle2 size={18} />
              User profilini yaratish
            </button>
          </form>

          {userRegistered && (
            <div className="admin-status sent">
              <CheckCircle2 size={18} />
              <span>
                <strong>User profili tayyor</strong>
                <small>Endi qabulga yozilish va shifokor tanlash mumkin.</small>
              </span>
            </div>
          )}
        </>
      ) : (
        <>
          <form className="consult-form doctor-register-form" onSubmit={onDoctorSubmit}>
            <label>
              <span>D.R F.I.O.</span>
              <input defaultValue="Dr. Dilnoza Karimova" />
            </label>
            <label>
              <span>D.R mutaxassisligi haqida ma&apos;lumot</span>
              <select defaultValue="Davolovchi stomatolog">
                <option>Davolovchi stomatolog</option>
                <option>Protezchi</option>
                <option>Ortodont</option>
                <option>Jarroh stomatolog</option>
              </select>
            </label>
            <div className="two-fields">
              <label>
                <span>Ish staji</span>
                <input defaultValue="15 yil" />
              </label>
              <label>
                <span>Ish vaqti</span>
                <input defaultValue="09:00 - 18:00" />
              </label>
            </div>
            <label>
              <span>Rasmi</span>
              <input
                defaultValue="https://images.unsplash.com/photo-1559839734-2b71ea197ec2"
                placeholder="Rasm URL manzili"
              />
            </label>
            <label>
              <span>Ishlaydigan klinika nomi</span>
              <input defaultValue="Smile Dent" />
            </label>
            <label>
              <span>Izoh</span>
              <textarea defaultValue="Ortodontiya va estetik davolash bo'yicha konsultatsiya beradi." />
            </label>
            <div className="two-fields">
              <label>
                <span>Reytingi</span>
                <input type="number" defaultValue="4.9" min="0" max="5" step="0.1" />
              </label>
              <label>
                <span>Reytinglar soni</span>
                <input type="number" defaultValue="112" min="0" />
              </label>
            </div>
            <label>
              <span>D.R tel raqami</span>
              <input defaultValue="+998 90 112 45 67" />
            </label>
            <div className="two-fields">
              <label>
                <span>Klinika tumani</span>
                <select defaultValue="Yakkasaroy">
                  {districts.slice(1).map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Klinika joylashuvi</span>
                <input defaultValue="Bobur kochasi 18" />
              </label>
            </div>
            <label>
              <span>Klinikagacham borish</span>
              <textarea defaultValue="Lokatsiya tashlab beriladi, xaritada klinikagacha yo'l ko'rsatiladi." />
            </label>
            <button className="primary-btn submit" type="submit">
              <CheckCircle2 size={18} />
              Doktor anketasini yuborish
            </button>
          </form>

          {doctorRegistrationSent ? (
            <>
              <div className="admin-status sent">
                <CheckCircle2 size={18} />
                <span>
                  <strong>Doktor ma&apos;lumotlari yuborildi</strong>
                  <small>Endi 1 oylik obuna to&apos;lovini qiling.</small>
                </span>
              </div>

              <section className="bill-card">
                <div className="bill-top">
                  <span className="soft-icon">
                    <CreditCard size={18} />
                  </span>
                  <span>
                    <strong>Doktor obunasi</strong>
                    <small>Profil 1 oy davomida aktiv bo&apos;ladi.</small>
                  </span>
                </div>
                <div className="bill-row">
                  <span>1 oylik obuna</span>
                  <b>50 000 so&apos;m</b>
                </div>
                <div className="bill-row">
                  <span>Admin sozlamasi</span>
                  <b>Narx admin paneldan o&apos;zgaradi</b>
                </div>
                <div className="bill-total">
                  <span>Jami</span>
                  <strong>50 000 so&apos;m</strong>
                </div>
              </section>

              <SectionTitle title="To'lov usuli" />
              <div className="payment-methods">
                {paymentMethods.map(([id, name, text]) => (
                  <button
                    key={id}
                    className={method === id ? "payment-method active" : "payment-method"}
                    type="button"
                    onClick={() => setMethod(id)}
                  >
                    <CreditCard size={18} />
                    <span>
                      <strong>{name}</strong>
                      <small>{text}</small>
                    </span>
                  </button>
                ))}
              </div>

              <section className="consult-form">
                <label>
                  <span>To&apos;lov telefon raqami</span>
                  <input defaultValue="+998 90 112 45 67" />
                </label>
                <label>
                  <span>Chek raqami</span>
                  <input
                    defaultValue={doctorSubscriptionPaid ? "DR-50000-2026" : ""}
                    placeholder="Masalan: DR-50000"
                  />
                </label>
                <button className="primary-btn submit" type="button" onClick={onDoctorPay}>
                  <CheckCircle2 size={18} />
                  {doctorSubscriptionPaid ? "To'lov yuborilgan" : "50 000 so'm to'lash"}
                </button>
              </section>

              <section className="payment-timeline" aria-label="Doktor obuna jarayoni">
                <div className="timeline-row done">
                  <CheckCircle2 size={17} />
                  <span>
                    <strong>Anketa to&apos;ldirildi</strong>
                    <small>Doktor ma&apos;lumotlari admin tekshiruviga tayyor.</small>
                  </span>
                </div>
                <div className={doctorSubscriptionPaid ? "timeline-row done" : "timeline-row active"}>
                  <CreditCard size={17} />
                  <span>
                    <strong>{doctorSubscriptionPaid ? "To'lov yuborildi" : "To'lov kutilmoqda"}</strong>
                    <small>1 oy uchun 50 000 so&apos;m obuna to&apos;lovi.</small>
                  </span>
                </div>
                <div className={doctorSubscriptionPaid ? "timeline-row active" : "timeline-row"}>
                  <Clock size={17} />
                  <span>
                    <strong>Admin tasdig&apos;i</strong>
                    <small>
                      {doctorSubscriptionPaid
                        ? "Admin doktor profilini va to'lov chekini tasdiqlaydi."
                        : "To'lov yuborilgandan keyin admin tasdiqi boshlanadi."}
                    </small>
                  </span>
                </div>
              </section>
            </>
          ) : (
            <div className="admin-status">
              <Clock size={18} />
              <span>
                <strong>To&apos;lov keyingi bosqichda</strong>
                <small>Avval doktor ma&apos;lumotlarini to&apos;liq yuboring.</small>
              </span>
            </div>
          )}
        </>
      )}

      <button className="secondary-btn" type="button" onClick={() => onNavigate("profile")}>
        Profilga qaytish
      </button>
    </div>
  );
}

function RecordsView() {
  const records = [
    ["Ortodont konsultatsiyasi", "Dr. Dilnoza Karimova", "12-iyun 2026"],
    ["Panoramik rentgen", "Denta Pro", "03-iyun 2026"],
    ["Gigiyena", "Neo Dental", "24-may 2026"]
  ];

  return (
    <div className="view-stack">
      <PageHead title="Yozuvlarim" text="Qabul tarixi, xulosa va retseptlar." />
      {records.map(([title, place, date]) => (
        <article className="record-card" key={title}>
          <span className="soft-icon">
            <ClipboardList size={18} />
          </span>
          <div>
            <strong>{title}</strong>
            <small>{place}</small>
            <em>{date}</em>
          </div>
        </article>
      ))}
    </div>
  );
}

function ProfileView({
  userRegistered,
  doctorRegistrationSent,
  doctorSubscriptionPaid,
  onNavigate
}: {
  userRegistered: boolean;
  doctorRegistrationSent: boolean;
  doctorSubscriptionPaid: boolean;
  onNavigate: (view: ViewId) => void;
}) {
  return (
    <div className="view-stack">
      <PageHead title="Profil" text="Kirish, telefon, lokatsiya va xavfsizlik." />
      <section className="profile-card">
        <div className="profile-avatar">
          <User size={34} />
        </div>
        <strong>Aziz Karimov</strong>
        <span>+998 90 555 22 11</span>
        <button className="primary-btn">
          <Phone size={17} />
          Telefonni tasdiqlash
        </button>
      </section>

      <button className="settings-row" onClick={() => onNavigate("register")}>
        <LockKeyhole size={18} />
        <span>
          <strong>Kirish / Ro&apos;yxatdan o&apos;tish</strong>
          <small>
            {doctorRegistrationSent
              ? "Doktor anketasi yuborilgan"
              : userRegistered
                ? "User profili yaratilgan"
                : "Oddiy user yoki doktor sifatida kirish"}
          </small>
        </span>
        <ChevronRight size={18} />
      </button>
      {doctorRegistrationSent && (
        <div className={doctorSubscriptionPaid ? "admin-status sent" : "admin-status"}>
          {doctorSubscriptionPaid ? <CheckCircle2 size={18} /> : <Clock size={18} />}
          <span>
            <strong>{doctorSubscriptionPaid ? "Doktor obunasi yuborildi" : "Doktor obunasi kutilmoqda"}</strong>
            <small>
              {doctorSubscriptionPaid
                ? "Admin to'lov chekini tasdiqlaydi."
                : "Ro'yxatdan o'tish oynasida 50 000 so'm to'lov qiling."}
            </small>
          </span>
        </div>
      )}
      <button className="settings-row">
        <Bell size={18} />
        <span>
          <strong>Bildirishnomalar</strong>
          <small>Admin tasdiqi va eslatmalar</small>
        </span>
        <ChevronRight size={18} />
      </button>
    </div>
  );
}

function MoreView({
  onNavigate,
  sent
}: {
  onNavigate: (view: ViewId) => void;
  sent: boolean;
}) {
  const rows: Array<Shortcut & { description: string; badge?: string }> = [
    {
      id: "register",
      label: "Ro'yxatdan o'tish",
      Icon: LockKeyhole,
      description: "User yoki doktor profilini oching",
      badge: "Kerakli"
    },
    {
      id: "services",
      label: "Xizmatlar",
      Icon: SlidersHorizontal,
      description: "Davolash va konsultatsiya turlari"
    },
    {
      id: "clinics",
      label: "Klinikalar",
      Icon: Building2,
      description: "Manzil, reyting va ish vaqti"
    },
    {
      id: "appointment",
      label: "Qabul",
      Icon: CalendarCheck,
      description: "Kun va vaqtni tanlash"
    },
    {
      id: "records",
      label: "Yozuvlarim",
      Icon: ClipboardList,
      description: "So'rovlaringiz holati"
    },
    {
      id: "profile",
      label: "Profil",
      Icon: User,
      description: "Telefon va xavfsizlik"
    }
  ];

  return (
    <div className="view-stack">
      <PageHead title="Yana" text="Barcha bo'limlar va qabul holati." />
      <div className={sent ? "admin-status sent" : "admin-status"}>
        <CheckCircle2 size={18} />
        <span>
          <strong>{sent ? "Admin tasdiq jarayonida" : "Faol so'rov yo'q"}</strong>
          <small>{sent ? "So'rovingiz administratorga yuborildi." : "Qabul formasini to'ldiring."}</small>
        </span>
      </div>
      <div className="menu-grid">
        {rows.map(({ id, label, description, badge, Icon }, index) => (
          <button
            key={id}
            className={index === 0 ? "menu-card featured" : "menu-card"}
            onClick={() => onNavigate(id)}
            type="button"
          >
            <span className="menu-icon">
              <Icon size={22} />
            </span>
            <span className="menu-copy">
            <strong>{label}</strong>
              <small>{description}</small>
            </span>
            <span className="menu-action">{badge ?? <ChevronRight size={18} />}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function DoctorCard({
  doctor,
  onAppointment
}: {
  doctor: Doctor;
  onAppointment: () => void;
}) {
  return (
    <article className="doctor-card" style={{ "--accent": doctor.accent } as CSSProperties}>
      <div className="photo-box">
        <img src={doctor.image} alt={doctor.name} />
        <button className="heart-btn" aria-label={`${doctor.name}ni saqlash`}>
          <Heart size={16} />
        </button>
        <span className="doctor-badge">
          <ShieldCheck size={13} />
        </span>
      </div>
      <div className="doctor-body">
        <strong>{doctor.name}</strong>
        <small>{doctor.specialty}</small>
        <span className="rating-line">
          <Star size={14} />
          {doctor.rating}
          <em>{doctor.reviews} sharh</em>
        </span>
        <span className="address-line">
          <MapPin size={14} />
          {doctor.district}
        </span>
      </div>
      <button className="appointment-btn" onClick={onAppointment}>
        Qabul
      </button>
    </article>
  );
}

function SectionTitle({
  title,
  action,
  onAction
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="section-title">
      <h2>{title}</h2>
      {action && (
        <button onClick={onAction}>
          {action}
          <ChevronRight size={15} />
        </button>
      )}
    </div>
  );
}

function PageHead({ title, text }: { title: string; text: string }) {
  return (
    <section className="page-head">
      <h1>{title}</h1>
      <p>{text}</p>
    </section>
  );
}
