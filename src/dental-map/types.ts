import type { LucideIcon } from "lucide-react";

export type ViewId =
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

export type RegisterRole = "user" | "doctor";
export type TelegramAuthStatus = "loading" | "authenticated" | "guest" | "error";

export type TelegramUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
};

export type TelegramThemeParams = {
  bg_color?: string;
  text_color?: string;
  hint_color?: string;
  link_color?: string;
  button_color?: string;
  button_text_color?: string;
  secondary_bg_color?: string;
};

export type TelegramWebApp = {
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

export type Doctor = {
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

export type DoctorReview = {
  id: string;
  doctorId: string;
  author: string;
  rating: number;
  text: string;
  date: string;
  status: "approved" | "pending";
};

export type Clinic = {
  id: string;
  name: string;
  district: string;
  address: string;
  workTime: string;
  rating: number;
  image?: string;
};

export type Shortcut = {
  id: ViewId;
  label: string;
  Icon: LucideIcon;
};

export type ApiList<T> = {
  results?: T[];
};

export type ApiDoctor = {
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

export type ApiClinicBranch = {
  id: string;
  clinic_name?: string;
  district?: string;
  address?: string;
  phone?: string;
  work_time?: string;
  is_active?: boolean;
};

export type ApiClinic = {
  id: string;
  name?: string;
  rating?: string | number;
  branches?: ApiClinicBranch[];
};
