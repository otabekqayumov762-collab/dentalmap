import {
  Baby,
  Bone,
  Building2,
  CalendarDays,
  HeartPulse,
  Home,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  ScanLine,
  ShieldPlus,
  SlidersHorizontal,
  SmilePlus,
  Sparkles,
  Stethoscope,
  User
} from "lucide-react";
import type { Clinic, Doctor, DoctorReview, Shortcut } from "./types";

export const districts = [
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

export const fallbackDoctors: Doctor[] = [
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

export const fallbackClinics: Clinic[] = [
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

export const fallbackReviews: DoctorReview[] = [
  {
    id: "review-dilnoza-1",
    doctorId: "demo-dilnoza",
    author: "Azizbek",
    rating: 5,
    text: "Vaqtida qabul qildi, tushuntirishlari aniq.",
    date: "12 iyun",
    status: "approved"
  },
  {
    id: "review-jamshid-1",
    doctorId: "demo-jamshid",
    author: "Madina",
    rating: 5,
    text: "Jarrohlikdan oldin hammasini batafsil tushuntirdi.",
    date: "8 iyun",
    status: "approved"
  },
  {
    id: "review-malika-1",
    doctorId: "demo-malika",
    author: "Sardor",
    rating: 5,
    text: "Konsultatsiya tez va tartibli o'tdi.",
    date: "5 iyun",
    status: "approved"
  }
];

export const shortcuts: Shortcut[] = [
  { id: "services", label: "Xizmat", Icon: SlidersHorizontal },
  { id: "clinics", label: "Klinika", Icon: Building2 },
  { id: "appointment", label: "Qabul", Icon: CalendarDays },
  { id: "map", label: "Xarita", Icon: MapPin }
];

export const tabs: Shortcut[] = [
  { id: "home", label: "Bosh", Icon: Home },
  { id: "map", label: "Xarita", Icon: MapPin },
  { id: "doctors", label: "Shifokor", Icon: Stethoscope },
  { id: "profile", label: "Profil", Icon: User },
  { id: "more", label: "Yana", Icon: MoreHorizontal }
];

export const serviceItems = [
  { id: "consultation", label: "Konsultatsiya", Icon: MessageCircle },
  { id: "treatment", label: "Tish davolash", Icon: HeartPulse },
  { id: "extraction", label: "Tish olish", Icon: Bone },
  { id: "implant", label: "Implant", Icon: ShieldPlus },
  { id: "braces", label: "Breket", Icon: SmilePlus },
  { id: "xray", label: "Rentgen", Icon: ScanLine },
  { id: "whitening", label: "Oqartirish", Icon: Sparkles },
  { id: "kids", label: "Bolalar stomatologiyasi", Icon: Baby }
];

export const genderOptions = ["Erkak", "Ayol"];

export const specialtyOptions = ["Davolovchi stomatolog", "Protezchi", "Ortodont", "Jarroh stomatolog"];

export const feedbackTopics = ["Taklif", "Shikoyat", "Texnik muammo"];

export const slots = ["09:30", "10:45", "12:15", "14:30", "16:00", "18:20"];

export const paymentMethods = [
  ["click", "Click", "Telefon raqam orqali"],
  ["payme", "Payme", "Karta yoki balans orqali"],
  ["card", "Karta", "Uzcard yoki Humo"]
] as const;

export const mapTiles = [
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
