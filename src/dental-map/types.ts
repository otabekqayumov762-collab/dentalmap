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
  | "login"
  | "profile"
  | "myAppointments"
  | "feedback"
  | "notifications"
  | "more"
  | "doctorRequests"
  | "doctorSchedule"
  | "doctorEdit";

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
    showProgress?: (leaveActive?: boolean) => void;
    hideProgress?: () => void;
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
  /** Daily time slots the doctor is free (HH:MM). Drives the booking picker. */
  slots?: string[];
};

export type DoctorReview = {
  id: string;
  appointmentId?: string;
  doctorId: string;
  clinic?: string;
  clinicDistrict?: string;
  clinicAddress?: string;
  author: string;
  rating: number;
  text: string;
  date: string;
  status: "approved" | "pending" | "rejected";
};

export type Clinic = {
  id: string;
  name: string;
  district: string;
  address: string;
  workTime: string;
  rating: number;
  image?: string;
  /** Map coordinates (for partner clinics we place on the map). */
  lat?: number;
  lng?: number;
  /** Marks a clinic we have a contract with. */
  partner?: boolean;
};

export type Shortcut = {
  id: ViewId;
  label: string;
  Icon: LucideIcon;
};

export type ApiList<T> = {
  results?: T[];
};

export type ApiUser = {
  id: string;
  full_name?: string;
  phone?: string;
  email?: string;
  role?: "user" | "doctor" | "admin";
  telegram_username?: string;
  /** Nested patient profile from `/api/users/me/` (read-only server-side today). */
  profile?: {
    gender?: string;
    age?: number | null;
    city?: string;
    district?: string;
    address?: string;
  } | null;
  doctor_profile?: {
    id: string;
    approval_status: string;
    is_published: boolean;
    subscription_expires_at?: string | null;
    is_subscription_active?: boolean;
  } | null;
};

export type ApiDoctor = {
  id: string;
  full_name?: string;
  specialty?: string;
  experience_years?: number;
  work_time?: string;
  photo?: string;
  clinic_name?: string;
  description?: string;
  doctor_phone?: string;
  clinic_district?: string;
  clinic_address?: string;
  clinic_location_url?: string;
  directions?: string;
  rating?: string | number;
  reviews_count?: number;
  approval_status?: string;
  is_published?: boolean;
  subscription_expires_at?: string | null;
  is_subscription_active?: boolean;
};

export type ApiAppointment = {
  id: string;
  patient?: string;
  doctor: string;
  doctor_name?: string;
  full_name: string;
  phone: string;
  gender?: string;
  age?: number | null;
  appointment_date: string;
  appointment_time: string;
  note?: string;
  status: "pending" | "doctor_confirmed" | "doctor_rejected" | "user_cancelled" | "completed" | "no_show";
  reject_reason?: string;
  created_at?: string;
};

export type ApiReview = {
  id: string;
  appointment?: string;
  appointment_date?: string;
  appointment_time?: string;
  doctor: string;
  doctor_name?: string;
  clinic_name?: string;
  clinic_district?: string;
  clinic_address?: string;
  patient_name?: string;
  rating: number;
  comment?: string;
  status: "pending" | "approved" | "rejected";
  created_at?: string;
};

export type ApiWeeklyAvailability = {
  id: string;
  doctor?: string;
  weekday: number;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
  is_active: boolean;
  note?: string;
};

export type ApiClinicBranch = {
  id: string;
  clinic_name?: string;
  district?: string;
  address?: string;
  phone?: string;
  work_time?: string;
  is_active?: boolean;
  latitude?: string | number | null;
  longitude?: string | number | null;
};

export type ApiClinic = {
  id: string;
  name?: string;
  rating?: string | number;
  branches?: ApiClinicBranch[];
};
