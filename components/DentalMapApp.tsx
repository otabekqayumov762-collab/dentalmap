"use client";

/* eslint-disable @next/next/no-img-element */

import {
  Baby,
  Bell,
  Bone,
  Building2,
  CalendarDays,
  Camera,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  Heart,
  HeartPulse,
  Home,
  Map,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Phone,
  ScanLine,
  Search,
  ShieldCheck,
  ShieldPlus,
  SlidersHorizontal,
  SmilePlus,
  Sparkles,
  Star,
  Stethoscope,
  Upload,
  User,
  type LucideIcon
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

type ViewId =
  | "home"
  | "services"
  | "clinics"
  | "appointment"
  | "map"
  | "doctors"
  | "doctorDetail"
  | "register"
  | "profile"
  | "feedback"
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
  locationUrl?: string;
  phone: string;
  nextSlot: string;
  image?: string;
  accent: string;
};

type Clinic = {
  id: string;
  name: string;
  district: string;
  address: string;
  workTime: string;
  rating: number;
  image?: string;
};

type Shortcut = {
  id: ViewId;
  label: string;
  Icon: LucideIcon;
};

const districts = [
  "Barchasi",
  "Mirzo Ulugbek",
  "Yakkasaroy",
  "Almazor",
  "Bektemir",
  "Mirobod",
  "Sergili",
  "Chilonzor",
  "Shayxontohur",
  "Yunusobod",
  "Yashnobod",
  "Uchtepa",
  "Yangi hayot"
];

type ApiList<T> = {
  results?: T[];
};

type ApiDoctor = {
  id: string;
  full_name?: string;
  specialty?: string;
  experience_years?: number;
  work_time?: string;
  photo?: string;
  clinic_name?: string;
  doctor_phone?: string;
  clinic_district?: string;
  clinic_address?: string;
  clinic_location_url?: string;
  rating?: string | number;
  reviews_count?: number;
};

type ApiClinicBranch = {
  id: string;
  clinic_name?: string;
  district?: string;
  address?: string;
  phone?: string;
  work_time?: string;
  is_active?: boolean;
};

type ApiClinic = {
  id: string;
  name?: string;
  rating?: string | number;
  branches?: ApiClinicBranch[];
};

const fallbackDoctors: Doctor[] = [
  {
    id: "demo-dilnoza",
    name: "Dilnoza Karimova",
    specialty: "Ortodont",
    rating: 4.9,
    reviews: 112,
    experience: "12 yil",
    clinic: "Smile Dent",
    district: "Yakkasaroy",
    address: "Bobur ko'chasi 18",
    locationUrl: "https://www.google.com/maps/search/?api=1&query=Smile+Dent+Toshkent",
    phone: "+998 90 112 45 67",
    nextSlot: "Bugun, 14:30",
    image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=420&q=85",
    accent: "#22b8ad"
  },
  {
    id: "demo-jamshid",
    name: "Jamshid Rasulov",
    specialty: "Jarroh stomatolog",
    rating: 4.8,
    reviews: 96,
    experience: "8 yil",
    clinic: "Denta Pro",
    district: "Mirobod",
    address: "Nukus ko'chasi 44",
    locationUrl: "https://www.google.com/maps/search/?api=1&query=Denta+Pro+Toshkent",
    phone: "+998 93 771 20 30",
    nextSlot: "Ertaga, 11:00",
    image: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=420&q=85",
    accent: "#1d7eea"
  },
  {
    id: "demo-malika",
    name: "Malika Sodiqova",
    specialty: "Terapevt",
    rating: 5.0,
    reviews: 128,
    experience: "10 yil",
    clinic: "Neo Dental",
    district: "Yunusobod",
    address: "Amir Temur 77",
    locationUrl: "https://www.google.com/maps/search/?api=1&query=Neo+Dental+Toshkent",
    phone: "+998 95 440 19 19",
    nextSlot: "Bugun, 16:00",
    image: "https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&w=420&q=85",
    accent: "#ef476f"
  },
  {
    id: "demo-sardor",
    name: "Sardor Aliyev",
    specialty: "Ortoped",
    rating: 4.7,
    reviews: 87,
    experience: "11 yil",
    clinic: "Dental House",
    district: "Chilonzor",
    address: "Bunyodkor 9",
    locationUrl: "https://www.google.com/maps/search/?api=1&query=Dental+House+Toshkent",
    phone: "+998 91 230 78 00",
    nextSlot: "Ertaga, 09:30",
    image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=420&q=85",
    accent: "#7c3aed"
  }
];

const fallbackClinics: Clinic[] = [
  {
    id: "demo-smile-dent",
    name: "Smile Dent",
    district: "Yakkasaroy",
    address: "Bobur ko'chasi 18",
    workTime: "08:00 - 21:00",
    rating: 4.9
  },
  {
    id: "demo-denta-pro",
    name: "Denta Pro",
    district: "Mirobod",
    address: "Nukus ko'chasi 44",
    workTime: "24/7 navbatchi",
    rating: 4.8
  },
  {
    id: "demo-neo-dental",
    name: "Neo Dental",
    district: "Yunusobod",
    address: "Amir Temur 77",
    workTime: "08:30 - 18:00",
    rating: 5.0
  }
];

const shortcuts: Shortcut[] = [
  { id: "services", label: "Xizmat", Icon: SlidersHorizontal },
  { id: "clinics", label: "Klinika", Icon: Building2 },
  { id: "appointment", label: "Qabul", Icon: CalendarDays },
  { id: "map", label: "Xarita", Icon: MapPin }
];

const tabs: Shortcut[] = [
  { id: "home", label: "Bosh", Icon: Home },
  { id: "map", label: "Xarita", Icon: Map },
  { id: "doctors", label: "Shifokor", Icon: Stethoscope },
  { id: "profile", label: "Profil", Icon: User },
  { id: "more", label: "Yana", Icon: MoreHorizontal }
];

const serviceItems = [
  { id: "consultation", label: "Konsultatsiya", Icon: MessageCircle },
  { id: "treatment", label: "Tish davolash", Icon: HeartPulse },
  { id: "extraction", label: "Tish olish", Icon: Bone },
  { id: "implant", label: "Implant", Icon: ShieldPlus },
  { id: "braces", label: "Breket", Icon: SmilePlus },
  { id: "xray", label: "Rentgen", Icon: ScanLine },
  { id: "whitening", label: "Oqartirish", Icon: Sparkles },
  { id: "kids", label: "Bolalar stomatologiyasi", Icon: Baby }
];

const genderOptions = ["Erkak", "Ayol"];
const specialtyOptions = ["Davolovchi stomatolog", "Protezchi", "Ortodont", "Jarroh stomatolog"];
const feedbackTopics = ["Taklif", "Shikoyat", "Texnik muammo"];

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

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? (process.env.NODE_ENV === "production" ? "" : "http://127.0.0.1:8000");

function isStaticPreviewHost() {
  return typeof window !== "undefined" && API_BASE_URL === "" && window.location.hostname.endsWith("github.io");
}

const accentColors = ["#22b8ad", "#1d7eea", "#ef476f", "#7c3aed", "#0f8fe8"];

function mapDoctor(item: ApiDoctor, index: number): Doctor {
  return {
    id: item.id,
    name: item.full_name || "Shifokor",
    specialty: item.specialty || "Stomatolog",
    rating: Number(item.rating ?? 0),
    reviews: item.reviews_count ?? 0,
    experience: typeof item.experience_years === "number" ? `${item.experience_years} yil` : "",
    clinic: item.clinic_name || "Klinika tanlanmagan",
    district: item.clinic_district || "Tuman kiritilmagan",
    address: item.clinic_address || "",
    locationUrl: item.clinic_location_url || undefined,
    phone: item.doctor_phone || "",
    nextSlot: "",
    image: item.photo || undefined,
    accent: accentColors[index % accentColors.length]
  };
}

function flattenClinics(items: ApiClinic[]): Clinic[] {
  return items.flatMap((clinic) => {
    const branches = clinic.branches?.filter((branch) => branch.is_active !== false) ?? [];
    if (branches.length === 0) {
      return [
        {
          id: clinic.id,
          name: clinic.name || "Klinika",
          district: "Tuman kiritilmagan",
          address: "",
          workTime: "",
          rating: Number(clinic.rating ?? 0)
        }
      ];
    }

    return branches.map((branch) => ({
      id: branch.id,
      name: branch.clinic_name || clinic.name || "Klinika",
      district: branch.district || "Tuman kiritilmagan",
      address: branch.address || "",
      workTime: branch.work_time || "",
      rating: Number(clinic.rating ?? 0)
    }));
  });
}

export default function DentalMapApp() {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [activeView, setActiveView] = useState<ViewId>("home");
  const [query, setQuery] = useState("");
  const [district, setDistrict] = useState("Barchasi");
  const [apiDoctors, setApiDoctors] = useState<Doctor[]>(fallbackDoctors);
  const [apiClinics, setApiClinics] = useState<Clinic[]>(fallbackClinics);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedSlot, setSelectedSlot] = useState("14:30");
  const [consultationSent, setConsultationSent] = useState(false);
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
  const showDistrictFilter =
    activeView === "home" ||
    activeView === "doctors" ||
    activeView === "clinics" ||
    activeView === "map";

  function openAppointment(doctor: Doctor) {
    webApp?.HapticFeedback?.selectionChanged();
    setSelectedDoctor(doctor);
    setActiveView("appointment");
  }

  function openDoctor(doctor: Doctor) {
    webApp?.HapticFeedback?.selectionChanged();
    setSelectedDoctor(doctor);
    setActiveView("doctorDetail");
  }

  function toggleSavedDoctor(doctorId: string) {
    webApp?.HapticFeedback?.selectionChanged();
    setSavedDoctorIds((current) =>
      current.includes(doctorId)
        ? current.filter((id) => id !== doctorId)
        : [...current, doctorId]
    );
  }

  function sendConsultation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
    if (view === "appointment" && !selectedDoctor) {
      setActiveView("doctors");
      return;
    }
    setActiveView(view);
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
        if (selectedDoctor) {
          setActiveView("appointment");
        } else {
          setActiveView("doctors");
        }
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
        ? "Administrator tasdiqiga yuborish"
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
    <main className={isTelegram ? "mini-shell telegram-shell" : "mini-shell"}>
      <section className="mini-app" aria-label="Dental Map mini ilova">
        <div className="app-scroll" ref={scrollRef}>
          <section className="brand-card">
            <div className="brand-row">
              <button className="brand-title" type="button" onClick={() => navigate("home")}>
                <span className="tooth-logo">
                  <ShieldCheck size={18} />
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

          <section className="filter-shortcuts">
            {showDistrictFilter && <DistrictFilter value={district} onChange={setDistrict} />}
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
              onAppointment={openAppointment}
            />
          )}

          {activeView === "doctorDetail" && selectedDoctor && (
            <DoctorDetailView doctor={selectedDoctor} onAppointment={openAppointment} />
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
  if (!isTelegram) {
    return null;
  }

  const name = user
    ? [user.first_name, user.last_name].filter(Boolean).join(" ") || `@${user.username}` || `ID ${user.id}`
    : "Telegram foydalanuvchisi aniqlanmadi";

  return (
    <section className={`telegram-status ${status}`} aria-live="polite">
      <span className="telegram-dot" />
      <div>
        <strong>{isTelegram ? name : "Brauzer ko'rinishi"}</strong>
        <small>{message}</small>
      </div>
    </section>
  );
}

function EmptyState({ title, text, Icon }: { title: string; text: string; Icon: LucideIcon }) {
  return (
    <section className="empty-state">
      <span className="soft-icon">
        <Icon size={18} />
      </span>
      <strong>{title}</strong>
      <p>{text}</p>
    </section>
  );
}

function DistrictFilter({
  value,
  onChange
}: {
  value: string;
  onChange: (district: string) => void;
}) {
  return (
    <section className="district-filter" aria-label="Tumanlar">
      <div className="district-filter-head">
        <span>
          <MapPin size={17} />
          <strong>Tuman</strong>
        </span>
        <small>{value}</small>
      </div>
      <div className="district-chip-row">
        {districts.map((item) => {
          const active = value === item;

          return (
            <button
              key={item}
              className={active ? "district-chip active" : "district-chip"}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(item)}
            >
              <span>{item}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function ChoiceField({
  label,
  name,
  value,
  options,
  onChange
}: {
  label: string;
  name: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <fieldset className="choice-field">
      <legend>{label}</legend>
      <input type="hidden" name={name} value={value} />
      <div className="choice-row">
        {options.map((option) => {
          const active = value === option;

          return (
            <button
              key={option}
              className={active ? "choice-chip active" : "choice-chip"}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(option)}
            >
              <span>{option}</span>
              {active && <CheckCircle2 size={14} />}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function DoctorAvatar({ doctor, size = "md" }: { doctor: Doctor; size?: "sm" | "md" | "lg" }) {
  return (
    <span className={`doctor-avatar ${size}`} style={{ "--accent": doctor.accent } as CSSProperties}>
      {doctor.image ? <img src={doctor.image} alt={doctor.name} /> : <Stethoscope size={size === "lg" ? 34 : 22} />}
    </span>
  );
}

function NotificationPanel({ sent, onOpenAppointment }: { sent: boolean; onOpenAppointment: () => void }) {
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
          <strong>{sent ? "Administrator tasdiqi kutilmoqda" : "Qabul formasi tayyor"}</strong>
          <small>
            {sent
              ? "Administrator so'rovingizni ko'rib chiqmoqda."
              : "F.I.O, telefon, kun va vaqtni kiriting."}
          </small>
        </span>
      </button>
    </section>
  );
}

function HomeView({
  doctors,
  doctor,
  loading,
  dataError,
  consultationSent,
  onAppointment,
  onOpenDoctor,
  savedDoctorIds,
  onToggleSaved,
  onNavigate
}: {
  doctors: Doctor[];
  doctor: Doctor | null;
  loading: boolean;
  dataError: string;
  consultationSent: boolean;
  onAppointment: (doctor: Doctor) => void;
  onOpenDoctor: (doctor: Doctor) => void;
  savedDoctorIds: string[];
  onToggleSaved: (doctorId: string) => void;
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
          <DoctorCard
            key={item.id}
            doctor={item}
            onOpen={() => onOpenDoctor(item)}
            onAppointment={() => onAppointment(item)}
            isSaved={savedDoctorIds.includes(item.id)}
            onToggleSaved={() => onToggleSaved(item.id)}
          />
        ))}
      </div>
      {doctors.length === 0 && (
        <EmptyState
          title={loading ? "Shifokorlar yuklanmoqda" : "Shifokor topilmadi"}
          text={dataError || "Backendda tasdiqlangan shifokorlar ko'rinmayapti."}
          Icon={Stethoscope}
        />
      )}

      {doctor && (
        <>
          <SectionTitle
            title="Tanlangan shifokor"
            action="Qabul"
            onAction={() => onAppointment(doctor)}
          />
          <button className="appointment-strip" onClick={() => onOpenDoctor(doctor)}>
            <DoctorAvatar doctor={doctor} size="sm" />
            <span>
              <strong>{doctor.name}</strong>
              <small>{doctor.clinic}</small>
              <em>{consultationSent ? "Administrator tasdiqini kutmoqda" : "Qabulga yozilish tayyor"}</em>
            </span>
            <ChevronRight size={18} />
          </button>
        </>
      )}

      <section className="info-card">
        <div>
          <span className="soft-icon">
            <MessageCircle size={18} />
          </span>
          <strong>Tez konsultatsiya</strong>
          <p>Jinsi, yoshi, F.I.O, telefon, kun va vaqtni kiritib so&apos;rov yuboring.</p>
        </div>
        <button className="primary-btn" onClick={() => onNavigate("appointment")}>
          Boshlash
        </button>
      </section>
    </div>
  );
}

function DoctorsView({
  doctors,
  loading,
  dataError,
  onOpenDoctor,
  savedDoctorIds,
  onToggleSaved,
  onAppointment
}: {
  doctors: Doctor[];
  loading: boolean;
  dataError: string;
  onOpenDoctor: (doctor: Doctor) => void;
  savedDoctorIds: string[];
  onToggleSaved: (doctorId: string) => void;
  onAppointment: (doctor: Doctor) => void;
}) {
  return (
    <div className="view-stack">
      <div className="doctor-grid">
        {doctors.map((doctor) => (
          <DoctorCard
            key={doctor.id}
            doctor={doctor}
            onOpen={() => onOpenDoctor(doctor)}
            onAppointment={() => onAppointment(doctor)}
            isSaved={savedDoctorIds.includes(doctor.id)}
            onToggleSaved={() => onToggleSaved(doctor.id)}
          />
        ))}
      </div>
      {doctors.length === 0 && (
        <EmptyState
          title={loading ? "Shifokorlar yuklanmoqda" : "Shifokor topilmadi"}
          text={dataError || "Filterga mos yoki tasdiqlangan shifokor yo'q."}
          Icon={Stethoscope}
        />
      )}
    </div>
  );
}

function ClinicsView({
  clinics,
  loading,
  dataError,
  onNavigate
}: {
  clinics: Clinic[];
  loading: boolean;
  dataError: string;
  onNavigate: (view: ViewId) => void;
}) {
  return (
    <div className="view-stack">
      {clinics.map((clinic) => (
        <article className="clinic-card" key={clinic.id}>
          <span className="clinic-avatar">
            <Building2 size={24} />
          </span>
          <div>
            <strong>{clinic.name}</strong>
            <span className="clinic-meta">
              <em><Star size={14} /> {clinic.rating || "0.0"}</em>
              <em><MapPin size={14} /> {clinic.district}</em>
            </span>
            <p>{clinic.address || "Manzil kiritilmagan"}</p>
            <small>{clinic.workTime || "Ish vaqti kiritilmagan"}</small>
          </div>
          <button className="mini-btn" onClick={() => onNavigate("doctors")}>
            Shifokorlar
          </button>
        </article>
      ))}
      {clinics.length === 0 && (
        <EmptyState
          title={loading ? "Klinikalar yuklanmoqda" : "Klinika topilmadi"}
          text={dataError || "Backendda faol klinika ma'lumotlari yo'q."}
          Icon={Building2}
        />
      )}
    </div>
  );
}

function ServicesView({ onNavigate }: { onNavigate: (view: ViewId) => void }) {
  return (
    <div className="view-stack">
      <div className="service-grid">
        {serviceItems.map(({ id, label, Icon }) => (
          <button key={id} className="service-card" onClick={() => onNavigate("doctors")}>
            <span className="soft-icon">
              <Icon size={18} />
            </span>
            <strong>{label}</strong>
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
      <section className="map-card" aria-label="Toshkent xaritasi">
        <div className="tile-map" aria-hidden="true">
          {mapTiles.map(([x, y]) => (
            <img
              key={`${x}-${y}`}
              src={`https://tile.openstreetmap.org/13/${x}/${y}.png`}
              alt=""
              loading="lazy"
              decoding="async"
            />
          ))}
        </div>
        {clinics.slice(0, 2).map((clinic, index) => (
          <span key={clinic.id} className={index === 0 ? "map-marker clinic-marker-one" : "map-marker clinic-marker-two"}>
            {clinic.name}
          </span>
        ))}
        <span className="map-marker user-marker">Siz</span>
        <div className="map-overlay">
          <span>
            <MapPin size={16} />
            Toshkent
          </span>
          <button
            type="button"
            onClick={() => {
              window.open("https://www.google.com/maps/search/?api=1&query=stomatologiya+Toshkent", "_blank");
            }}
          >
            Marshrut
          </button>
        </div>
      </section>
      <div className="clinic-map-list">
        {clinics.slice(0, 3).map((clinic) => (
          <article key={clinic.id}>
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
          <DoctorAvatar doctor={doctor} size="sm" />
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
  const [gender, setGender] = useState("");

  return (
    <div className="view-stack">
      <article className="selected-doctor">
        <DoctorAvatar doctor={doctor} size="md" />
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
        {slots.length > 0 ? (
          slots.map((slot) => (
            <button
              key={slot}
              className={selectedSlot === slot ? "slot active" : "slot"}
              type="button"
              onClick={() => onSelectSlot(slot)}
            >
              <Clock size={15} />
              {slot}
            </button>
          ))
        ) : (
          <div className="admin-status slot-empty">
            <Clock size={18} />
            <span>
              <strong>Bo&apos;sh vaqtlar ulanmagan</strong>
              <small>Jadval backend/admin paneldan kelganda shu yerda chiqadi.</small>
            </span>
          </div>
        )}
      </div>

      <form className="consult-form" onSubmit={onSubmit}>
        <label>
          <span>F.I.O.</span>
          <input placeholder="F.I.O." />
        </label>
        <label>
          <span>Telefon raqam</span>
          <input placeholder="+998 ..." />
        </label>
        <div className="two-fields">
          <ChoiceField
            label="Jinsi"
            name="gender"
            value={gender}
            options={genderOptions}
            onChange={setGender}
          />
          <label>
            <span>Yoshi</span>
            <input type="number" min="1" max="100" placeholder="Yosh" />
          </label>
        </div>
        <label>
          <span>Kun belgilash</span>
          <input type="date" min="2026-06-22" />
        </label>
        <label>
          <span>Izoh</span>
          <textarea placeholder="Qisqa izoh" />
        </label>
        <button className="primary-btn submit" type="submit">
          <CheckCircle2 size={18} />
          Administrator tasdiqiga yuborish
        </button>
      </form>

      <div className={sent ? "admin-status sent" : "admin-status"}>
        <CheckCircle2 size={18} />
        <span>
          <strong>{sent ? "So'rov yuborildi" : "Administrator tasdiqi"}</strong>
          <small>
            {sent
              ? "Administrator qabul vaqtini tekshiradi va holatni yangilaydi."
              : "Forma yuborilgandan keyin administrator tasdiqlaydi."}
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
  registrationError,
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
  registrationError: string;
  onRoleChange: (role: RegisterRole) => void;
  onUserSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onDoctorSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onDoctorPay: () => void;
  onNavigate: (view: ViewId) => void;
}) {
  const [method, setMethod] = useState<(typeof paymentMethods)[number][0]>("click");
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(["consultation"]);
  const [photoFileName, setPhotoFileName] = useState("");
  const [userGender, setUserGender] = useState("");
  const [userDistrict, setUserDistrict] = useState("");
  const [doctorSpecialty, setDoctorSpecialty] = useState("");
  const [doctorDistrict, setDoctorDistrict] = useState("");

  function toggleService(serviceId: string) {
    setSelectedServiceIds((current) =>
      current.includes(serviceId)
        ? current.filter((id) => id !== serviceId)
        : [...current, serviceId]
    );
  }

  return (
    <div className="view-stack">
      <div className="role-toggle" aria-label="Rol tanlash">
        <button
          className={role === "user" ? "role-option active" : "role-option"}
          type="button"
          onClick={() => onRoleChange("user")}
        >
          <User size={20} />
          <span>
            <strong>Foydalanuvchi</strong>
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
            <strong>Shifokor</strong>
            <small>Anketa, klinika va obuna to&apos;lovi</small>
          </span>
        </button>
      </div>

      {role === "user" ? (
        <>
          <form className="consult-form" onSubmit={onUserSubmit}>
            <label>
              <span>F.I.O.</span>
              <input placeholder="F.I.O." />
            </label>
            <label>
              <span>Telefon raqam</span>
              <input placeholder="+998 ..." />
            </label>
            <div className="two-fields">
              <ChoiceField
                label="Jinsi"
                name="gender"
                value={userGender}
                options={genderOptions}
                onChange={setUserGender}
              />
              <label>
                <span>Yoshi</span>
                <input type="number" min="1" max="100" placeholder="Yosh" />
              </label>
            </div>
            <label>
              <span>Shahar</span>
              <input placeholder="Shahar" />
            </label>
            <ChoiceField
              label="Tuman"
              name="district"
              value={userDistrict}
              options={districts.slice(1)}
              onChange={setUserDistrict}
            />
            <label>
              <span>Yashash joyi</span>
              <textarea placeholder="Manzil" />
            </label>
            <button className="primary-btn submit" type="submit">
              <CheckCircle2 size={18} />
              Profil yaratish
            </button>
          </form>

          {userRegistered && (
            <div className="admin-status sent">
              <CheckCircle2 size={18} />
              <span>
                <strong>Profil tayyor</strong>
                <small>Endi qabulga yozilish va shifokor tanlash mumkin.</small>
              </span>
            </div>
          )}
        </>
      ) : (
        <>
          <form className="consult-form doctor-register-form" onSubmit={onDoctorSubmit}>
            <label>
              <span>Shifokor F.I.O.</span>
              <input name="full_name" placeholder="Shifokor F.I.O." />
            </label>
            <ChoiceField
              label="Asosiy yo'nalish"
              name="specialty"
              value={doctorSpecialty}
              options={specialtyOptions}
              onChange={setDoctorSpecialty}
            />
            <fieldset className="service-picker">
              <legend>Ko&apos;rsatadigan xizmatlar</legend>
              <input type="hidden" name="services" value={selectedServiceIds.join(",")} />
              <div className="service-pill-row">
                {serviceItems.map(({ id, label, Icon }) => {
                  const active = selectedServiceIds.includes(id);

                  return (
                    <button
                      key={id}
                      className={active ? "service-pill active" : "service-pill"}
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggleService(id)}
                    >
                      <Icon size={16} />
                      <span>{label}</span>
                      {active && <CheckCircle2 size={14} />}
                    </button>
                  );
                })}
              </div>
            </fieldset>
            <div className="two-fields">
              <label>
                <span>Ish staji</span>
                <input name="experience_years" placeholder="Masalan: 8 yil" />
              </label>
              <label>
                <span>Ish vaqti</span>
                <input name="work_time" placeholder="09:00 - 18:00" />
              </label>
            </div>
            <label className="upload-card">
              <input
                type="file"
                name="photo_file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => setPhotoFileName(event.currentTarget.files?.[0]?.name ?? "")}
              />
              <span className="upload-icon">
                <Camera size={20} />
              </span>
              <span className="upload-copy">
                <strong>{photoFileName || "Rasm yuklash"}</strong>
                <small>{photoFileName ? "Rasm tanlandi" : "JPG, PNG yoki WebP"}</small>
              </span>
              <Upload size={18} />
            </label>
            <label>
              <span>Ishlaydigan klinika nomi</span>
              <input name="clinic_name" placeholder="Klinika nomi" />
            </label>
            <label>
              <span>Izoh</span>
              <textarea name="description" placeholder="Qisqa ma'lumot" />
            </label>
            <div className="admin-status">
              <Star size={18} />
              <span>
                <strong>Reyting administrator orqali yuritiladi</strong>
                <small>Reyting va sharhlar tasdiqlangan qabul tarixidan hisoblanadi.</small>
              </span>
            </div>
            <label>
              <span>Shifokor telefon raqami</span>
              <input name="doctor_phone" placeholder="+998 ..." />
            </label>
            <div className="two-fields">
              <ChoiceField
                label="Klinika tumani"
                name="clinic_district"
                value={doctorDistrict}
                options={districts.slice(1)}
                onChange={setDoctorDistrict}
              />
              <label>
                <span>Klinika joylashuvi</span>
                <input name="clinic_address" placeholder="Manzil" />
              </label>
            </div>
            <label>
              <span>Klinika lokatsiya linki</span>
              <input
                name="clinic_location_url"
                type="url"
                placeholder="Google Maps yoki Yandex Maps linki"
              />
            </label>
            <label>
              <span>Klinikagacham borish</span>
              <textarea name="directions" placeholder="Mo'ljal yoki lokatsiya izohi" />
            </label>
            {registrationError && (
              <div className="admin-status error">
                <Clock size={18} />
                <span>
                  <strong>Yuborilmadi</strong>
                  <small>{registrationError}</small>
                </span>
              </div>
            )}
            <button className="primary-btn submit" type="submit">
              <CheckCircle2 size={18} />
              Shifokor anketasini yuborish
            </button>
          </form>

          {doctorRegistrationSent ? (
            <>
              <div className="admin-status sent">
                <CheckCircle2 size={18} />
                <span>
                  <strong>Shifokor ma&apos;lumotlari yuborildi</strong>
                  <small>Endi 1 oylik obuna to&apos;lovini qiling.</small>
                </span>
              </div>

              <section className="bill-card">
                <div className="bill-top">
                  <span className="soft-icon">
                    <CreditCard size={18} />
                  </span>
                  <span>
                    <strong>Shifokor obunasi</strong>
                    <small>Profil 1 oy davomida faol bo&apos;ladi.</small>
                  </span>
                </div>
                <div className="bill-row">
                  <span>1 oylik obuna</span>
                  <b>50 000 so&apos;m</b>
                </div>
                <div className="bill-row">
                  <span>Administrator sozlamasi</span>
                  <b>Narx administrator panelidan o&apos;zgaradi</b>
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
                  <input placeholder="+998 ..." />
                </label>
                <label>
                  <span>Chek raqami</span>
                  <input placeholder="Chek raqami" />
                </label>
                <button className="primary-btn submit" type="button" onClick={onDoctorPay}>
                  <CheckCircle2 size={18} />
                  {doctorSubscriptionPaid ? "To'lov yuborilgan" : "50 000 so'm to'lash"}
                </button>
              </section>

              <section className="payment-timeline" aria-label="Shifokor obuna jarayoni">
                <div className="timeline-row done">
                  <CheckCircle2 size={17} />
                  <span>
                    <strong>Anketa to&apos;ldirildi</strong>
                    <small>Shifokor ma&apos;lumotlari administrator tekshiruviga tayyor.</small>
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
                    <strong>Administrator tasdig&apos;i</strong>
                    <small>
                      {doctorSubscriptionPaid
                        ? "Administrator shifokor profilini va to'lov chekini tasdiqlaydi."
                        : "To'lov yuborilgandan keyin administrator tekshiruvi boshlanadi."}
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
                <small>Avval shifokor ma&apos;lumotlarini to&apos;liq yuboring.</small>
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

function ProfileView({
  doctorRegistrationSent,
  doctorSubscriptionPaid,
  onNavigate
}: {
  doctorRegistrationSent: boolean;
  doctorSubscriptionPaid: boolean;
  onNavigate: (view: ViewId) => void;
}) {
  return (
    <div className="view-stack">
      <section className="profile-card">
        <div className="profile-avatar">
          <User size={34} />
        </div>
        <strong>Telegram profili ulangan</strong>
        <span>Mini appga kirish bot orqali tasdiqlanadi.</span>
      </section>

      <button className="settings-row" type="button" onClick={() => onNavigate("appointment")}>
        <CalendarDays size={18} />
        <span>
          <strong>Qabulga yozilish</strong>
          <small>Tanlangan shifokor uchun kun va vaqtni yuboring.</small>
        </span>
        <ChevronRight size={18} />
      </button>
      {doctorRegistrationSent && (
        <div className={doctorSubscriptionPaid ? "admin-status sent" : "admin-status"}>
          {doctorSubscriptionPaid ? <CheckCircle2 size={18} /> : <Clock size={18} />}
          <span>
            <strong>{doctorSubscriptionPaid ? "Shifokor obunasi yuborildi" : "Shifokor obunasi kutilmoqda"}</strong>
            <small>
              {doctorSubscriptionPaid
                ? "Administrator to'lov chekini tasdiqlaydi."
                : "Administrator tekshiruvi uchun to'lov cheki kutiladi."}
            </small>
          </span>
        </div>
      )}
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
      id: "map",
      label: "Klinikagacha yo'l",
      Icon: MapPin,
      description: "Lokatsiya va marshrut"
    },
    {
      id: "feedback",
      label: "Taklif va shikoyat",
      Icon: MessageCircle,
      description: "Administratorga xabar yuborish"
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
      <div className={sent ? "admin-status sent" : "admin-status"}>
        <CheckCircle2 size={18} />
        <span>
          <strong>{sent ? "Administrator tekshiryapti" : "Faol so'rov yo'q"}</strong>
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

function FeedbackView() {
  const [sent, setSent] = useState(false);
  const [topic, setTopic] = useState("");

  function submitFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSent(true);
  }

  return (
    <div className="view-stack">
      <form className="consult-form" onSubmit={submitFeedback}>
        <label>
          <span>F.I.O.</span>
          <input placeholder="F.I.O." />
        </label>
        <label>
          <span>Telefon raqam</span>
          <input placeholder="+998 ..." />
        </label>
        <ChoiceField
          label="Mavzu"
          name="topic"
          value={topic}
          options={feedbackTopics}
          onChange={setTopic}
        />
        <label>
          <span>Xabar</span>
          <textarea placeholder="Xabaringizni yozing" />
        </label>
        <button className="primary-btn submit" type="submit">
          <CheckCircle2 size={18} />
          Administratorga yuborish
        </button>
      </form>
      {sent && (
        <div className="admin-status sent">
          <CheckCircle2 size={18} />
          <span>
            <strong>Xabar yuborildi</strong>
            <small>Administrator xabaringizni ko&apos;rib chiqadi.</small>
          </span>
        </div>
      )}
    </div>
  );
}

function DoctorCard({
  doctor,
  isSaved,
  onToggleSaved,
  onOpen,
  onAppointment
}: {
  doctor: Doctor;
  isSaved: boolean;
  onToggleSaved: () => void;
  onOpen: () => void;
  onAppointment: () => void;
}) {
  return (
    <article
      className="doctor-card"
      style={{ "--accent": doctor.accent } as CSSProperties}
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
    >
      <div className="photo-box">
        <button
          className="photo-open"
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onOpen();
          }}
          aria-label={`${doctor.name} haqida batafsil`}
        >
          {doctor.image ? <img src={doctor.image} alt={doctor.name} /> : <Stethoscope size={34} />}
        </button>
        <button
          className={isSaved ? "heart-btn saved" : "heart-btn"}
          type="button"
          aria-label={isSaved ? `${doctor.name} saqlanganlardan olib tashlash` : `${doctor.name}ni saqlash`}
          aria-pressed={isSaved}
          onClick={(event) => {
            event.stopPropagation();
            onToggleSaved();
          }}
        >
          <Heart size={16} />
        </button>
        <span className="doctor-badge">
          <ShieldCheck size={13} />
        </span>
      </div>
      <div className="doctor-body">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onOpen();
          }}
        >
          <strong>{doctor.name}</strong>
        </button>
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
      <button
        className="appointment-btn"
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onAppointment();
        }}
      >
        Qabul
      </button>
    </article>
  );
}

function DoctorDetailView({
  doctor,
  onAppointment
}: {
  doctor: Doctor;
  onAppointment: (doctor: Doctor) => void;
}) {
  return (
    <div className="view-stack">
      <section className="doctor-detail">
        <DoctorAvatar doctor={doctor} size="lg" />
        <div>
          <h1>{doctor.name}</h1>
          <p>{doctor.specialty}</p>
          <span className="rating-line">
            <Star size={15} /> {doctor.rating || "0.0"}
            <em>{doctor.reviews} sharh</em>
          </span>
        </div>
      </section>
      <section className="detail-list">
        <span>
          <Building2 size={17} />
          <strong>{doctor.clinic}</strong>
        </span>
        <span>
          <MapPin size={17} />
          <strong>{doctor.district}</strong>
          <small>{doctor.address || "Manzil kiritilmagan"}</small>
        </span>
        <span>
          <Phone size={17} />
          <strong>{doctor.phone || "Telefon kiritilmagan"}</strong>
        </span>
        <span>
          <Clock size={17} />
          <strong>{doctor.experience || "Tajriba kiritilmagan"}</strong>
        </span>
      </section>
      {doctor.locationUrl && (
        <button
          className="secondary-btn"
          type="button"
          onClick={() => window.open(doctor.locationUrl, "_blank", "noopener,noreferrer")}
        >
          <MapPin size={17} />
          Lokatsiyani ochish
        </button>
      )}
      <button className="primary-btn submit" type="button" onClick={() => onAppointment(doctor)}>
        <CalendarDays size={18} />
        Qabulga yozilish
      </button>
    </div>
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
        <button type="button" onClick={onAction}>
          {action}
          <ChevronRight size={15} />
        </button>
      )}
    </div>
  );
}
