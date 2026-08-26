/**
 * What the landing page says before the server has answered.
 *
 * The page ships with real copy rather than a skeleton, for two reasons. A
 * visitor on a phone on a slow Uzbek connection sees finished text on the first
 * paint instead of grey boxes; and a crawler that runs no JavaScript still finds
 * a page that describes the product.
 *
 * The owner's version arrives a moment later from /api/landing/ and replaces
 * this wholesale. So this is a floor, not a default to be maintained in step
 * with the database -- if the two ever disagree, the database is right.
 */

export const LANGUAGES = ["uz", "ru", "en"] as const;
export type Language = (typeof LANGUAGES)[number];

export const LANGUAGE_LABELS: Record<Language, string> = {
  uz: "O'zbekcha",
  ru: "Русский",
  en: "English"
};

export type LandingStep = { icon: string; title: string; body: string };
export type LandingPlan = {
  name: string;
  price: number;
  period: string;
  features: string[];
  featured: boolean;
};
export type LandingStats = {
  title: string;
  patients_label: string;
  doctors_label: string;
  patients: number;
  doctors: number;
};

export type LandingContent = {
  lang: Language;
  bot_url: string;
  hero: { title: string; subtitle: string; cta: string };
  steps_title: string;
  steps: LandingStep[];
  plans_title: string;
  plans_note: string;
  plans: LandingPlan[];
  video: { title: string; url: string; is_file: boolean; poster: string };
  stats: LandingStats | null;
};

const uz: Omit<LandingContent, "lang" | "bot_url"> = {
  hero: {
    title: "Tish shifokoringizni bir daqiqada toping",
    subtitle:
      "Yaqiningizdagi tekshirilgan shifokorlar, ochiq narxlar va bemalol yoziladigan qabul — hammasi Telegram ichida.",
    cta: "Botni ochish"
  },
  steps_title: "Qanday ishlaymiz",
  steps: [
    {
      icon: "search",
      title: "Shifokorni tanlang",
      body: "Hudud, mutaxassislik va narx bo'yicha saralang. Har bir profilda tajriba, klinika va haqiqiy sharhlar bor."
    },
    {
      icon: "calendar",
      title: "Vaqtni tanlang",
      body: "Shifokorning bo'sh soatlarini ko'rasiz va o'zingizga qulayini bosasiz. Qo'ng'iroq qilish shart emas."
    },
    {
      icon: "check",
      title: "Qabulga boring",
      body: "Eslatma o'z vaqtida keladi. Qabuldan keyin shifokorni baholaysiz — keyingi odamga shu yordam beradi."
    }
  ],
  plans_title: "Shifokorlar uchun",
  plans_note:
    "Bemorlar uchun ilova butunlay bepul. To'lov faqat shifokor profili ro'yxatda turishi uchun olinadi.",
  plans: [],
  video: { title: "Ilova qanday ishlaydi", url: "", is_file: false, poster: "" },
  stats: {
    title: "Bugungi holat",
    patients_label: "bemor",
    doctors_label: "shifokor",
    patients: 0,
    doctors: 0
  }
};

const ru: typeof uz = {
  hero: {
    title: "Найдите своего стоматолога за минуту",
    subtitle:
      "Проверенные врачи рядом с вами, понятные цены и запись без звонков — всё внутри Telegram.",
    cta: "Открыть бота"
  },
  steps_title: "Как это работает",
  steps: [
    {
      icon: "search",
      title: "Выберите врача",
      body: "Фильтруйте по району, специализации и цене. В каждом профиле — опыт, клиника и настоящие отзывы."
    },
    {
      icon: "calendar",
      title: "Выберите время",
      body: "Вы видите свободные часы врача и выбираете удобный. Звонить не нужно."
    },
    {
      icon: "check",
      title: "Приходите на приём",
      body: "Напоминание придёт вовремя. После приёма вы оцените врача — это поможет следующему человеку."
    }
  ],
  plans_title: "Для врачей",
  plans_note:
    "Для пациентов приложение бесплатно. Оплата — только за размещение профиля врача.",
  plans: [],
  video: { title: "Как работает приложение", url: "", is_file: false, poster: "" },
  stats: {
    title: "Сейчас на платформе",
    patients_label: "пациентов",
    doctors_label: "врачей",
    patients: 0,
    doctors: 0
  }
};

const en: typeof uz = {
  hero: {
    title: "Find your dentist in a minute",
    subtitle:
      "Verified dentists near you, prices in the open, and booking without a phone call — all inside Telegram.",
    cta: "Open the bot"
  },
  steps_title: "How it works",
  steps: [
    {
      icon: "search",
      title: "Pick a dentist",
      body: "Filter by district, speciality and price. Every profile shows experience, clinic and real reviews."
    },
    {
      icon: "calendar",
      title: "Pick a time",
      body: "You see the dentist's open hours and choose the one that suits you. No calling required."
    },
    {
      icon: "check",
      title: "Go to your appointment",
      body: "The reminder arrives on time. Afterwards you rate the dentist — which is what helps the next person."
    }
  ],
  plans_title: "For dentists",
  plans_note: "The app is free for patients. The fee is only for listing a dentist's profile.",
  plans: [],
  video: { title: "See it in use", url: "", is_file: false, poster: "" },
  stats: {
    title: "On the platform today",
    patients_label: "patients",
    doctors_label: "dentists",
    patients: 0,
    doctors: 0
  }
};

const FALLBACKS: Record<Language, Omit<LandingContent, "lang" | "bot_url">> = { uz, ru, en };

export function fallbackContent(lang: Language): LandingContent {
  return { lang, bot_url: "", ...FALLBACKS[lang] };
}

/** Only one of the three, whatever arrives. */
export function asLanguage(value: unknown): Language | null {
  const raw = String(value ?? "").trim().toLowerCase().slice(0, 2);
  return (LANGUAGES as readonly string[]).includes(raw) ? (raw as Language) : null;
}
