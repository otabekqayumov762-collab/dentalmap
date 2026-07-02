import "../styles/superstat-bars.css";

import type { Metadata } from "next";
import type { ReactNode } from "react";
import {
  Activity,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  CreditCard,
  Gift,
  Globe2,
  HelpCircle,
  Languages,
  LineChart,
  Percent,
  Plus,
  ShieldCheck,
  Star,
  Target,
  Ticket,
  TrendingUp,
  UserCheck,
  Users,
  type LucideIcon
} from "lucide-react";

import { SuperstatAccessGate } from "@/src/dental-map/views/superstat/SuperstatAccessGate";
import { Badge, Button, Card, Field } from "@/src/dental-map/ui";

export const metadata: Metadata = {
  title: "SUPERSTAT | Dental Map",
  description: "Dental Map uchun foydalanuvchi, daromad va marketing statistikasi."
};

type Tone = "blue" | "green" | "amber" | "rose" | "indigo" | "slate";
type BadgeTone = "brand" | "success" | "warning" | "danger" | "neutral";

type Metric = {
  label: string;
  value: string;
  note: string;
  trend: string;
  Icon: LucideIcon;
  tone: Tone;
};

const overviewMetrics: Metric[] = [
  {
    label: "Foydalanuvchilar",
    value: "753",
    note: "Bugun +0 · Hafta +4 · Oy +751",
    trend: "Jami",
    Icon: Users,
    tone: "blue"
  },
  {
    label: "Haqiqiy daromad",
    value: "583 000 so'm",
    note: "Manual karta: 583 000 so'm · 19 ta",
    trend: "To'lovlar",
    Icon: CircleDollarSign,
    tone: "green"
  },
  {
    label: "Faol obunalar",
    value: "89",
    note: "Demo 76 · Tabiiy 1 · Oson 12",
    trend: "Aktiv",
    Icon: CreditCard,
    tone: "indigo"
  },
  {
    label: "Promokodlar",
    value: "23 / 23",
    note: "Ishlatilgan: 117",
    trend: "Faol",
    Icon: Percent,
    tone: "amber"
  }
];

const revenueBars = [
  ["Manual", "100"],
  ["Demo", "23"],
  ["Oson", "51"],
  ["Tabiiy", "26"],
  ["Promo", "42"],
  ["Sovg'a", "18"],
  ["Referal", "8"]
] as const;

const languageStats = [["uz", "753 foydalanuvchi", 100]] as const;

const subscriptionStats = [
  ["Demo", "76", "Faol obunalar ichida"],
  ["Tabiiy", "1", "Faol obunalar ichida"],
  ["Oson", "12", "Faol obunalar ichida"]
] as const;

const tariffRows = [
  ["Oson 6 oy", "14 marta", "299 000 so'm", "13 foyd."],
  ["Tabiiy 6 oy", "1 marta", "149 000 so'm", "1 foyd."],
  ["Demo 1 oy", "76 marta", "135 000 so'm", "67 foyd."],
  ["Oson 12 oy", "1 marta", "0 so'm", "1 foyd."]
] as const;

const goalStats = [
  ["Otam", "32 foyd.", "5.2%", "309 000 so'm", 52],
  ["O'zim", "402 foyd.", "64.7%", "254 000 so'm", 65],
  ["Sovg'a", "67 foyd.", "10.8%", "10 000 so'm", 11],
  ["Onam", "45 foyd.", "7.2%", "10 000 so'm", 7],
  ["guides", "75 foyd.", "12.1%", "0 so'm", 12]
] as const;

const giftStats = [
  ["Yaratilgan", "15", "Barcha sovg'a kodlari"],
  ["Faollashtirilgan", "11", "73.3% aktivatsiya"],
  ["Kutilayotgan", "4", "Hali ishlatilmagan"]
] as const;

const promoStats = [
  ["Faol promokod", "23", "Jami 23 ta"],
  ["Ishlatilgan", "117", "Barcha ishlatishlar"],
  ["Yaratish paneli", "Tayyor", "Admin orqali qo'shish"]
] as const;

const adminActivity = [
  ["Promokod yaratilgan", "23", "Admin harakati"],
  ["Sovg'a kodi yaratilgan", "15", "Admin harakati"],
  ["Savollar bazasi", "378", "Savollar soni"]
] as const;

const referralStats = [
  ["Taklif qilingan", "3"],
  ["Unique tashabbuskorlar", "1"]
] as const;

const weeklyQuestions = [
  ["Yuborilgan", "409"],
  ["Javob berilgan", "216"],
  ["Javob ulushi", "52.8%"]
] as const;

const topPayers = [
  ["1", "8758062830 Otabek Qayumov", "Oson 6 oy", "299 000 so'm"],
  ["2", "@amina0725", "Tabiiy 6 oy", "149 000 so'm"],
  ["3", "@Joraboyeva_M", "Manual karta", "10 000 so'm"],
  ["4", "@sadoqatmirzaahmedova", "Manual karta", "10 000 so'm"],
  ["5", "@iam_the_lily", "Manual karta", "10 000 so'm"]
] as const;

const metricTone: Record<Tone, { iconWrap: string; badge: BadgeTone }> = {
  blue: { iconWrap: "bg-accent-500/10 text-accent-600", badge: "brand" },
  green: { iconWrap: "bg-success/10 text-success", badge: "success" },
  amber: { iconWrap: "bg-warning/10 text-warning", badge: "warning" },
  rose: { iconWrap: "bg-danger/10 text-danger", badge: "danger" },
  indigo: { iconWrap: "bg-accent-violet/10 text-accent-violet", badge: "neutral" },
  slate: { iconWrap: "bg-surface-100 text-ink-500", badge: "neutral" }
};

function MetricCard({ metric }: { metric: Metric }) {
  const { Icon } = metric;
  const tone = metricTone[metric.tone];

  return (
    <Card as="article" className="flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tone.iconWrap}`}>
          <Icon size={22} />
        </span>
        <Badge tone={tone.badge}>{metric.trend}</Badge>
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-ink-500">{metric.label}</p>
        <strong className="block text-2xl font-bold tracking-tight text-ink-900">{metric.value}</strong>
        <small className="block text-xs text-ink-400">{metric.note}</small>
      </div>
    </Card>
  );
}

function Panel({
  title,
  eyebrow,
  Icon,
  children,
  className
}: {
  title: string;
  eyebrow: string;
  Icon: LucideIcon;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card as="section" className={`flex flex-col gap-4 ${className ?? ""}`}>
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <Icon size={18} />
        </span>
        <div className="min-w-0">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-ink-400">{eyebrow}</p>
          <h2 className="truncate text-base font-bold text-ink-900">{title}</h2>
        </div>
      </div>
      {children}
    </Card>
  );
}

type StatItem = readonly [string, string, string?];

function StatList({ items, Icon }: { items: readonly StatItem[]; Icon: LucideIcon }) {
  return (
    <div className="flex flex-col gap-2.5">
      {items.map(([label, value, note]) => (
        <article
          key={label}
          className="flex items-center gap-3 rounded-2xl bg-surface-50 px-3.5 py-3"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-0 text-brand-600 shadow-card">
            <Icon size={18} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <b className="truncate text-sm font-semibold text-ink-900">{label}</b>
            {note ? <small className="truncate text-xs text-ink-400">{note}</small> : null}
          </span>
          <strong className="text-sm font-bold text-ink-900">{value}</strong>
        </article>
      ))}
    </div>
  );
}

function SuperstatDashboard() {
  return (
    <main className="min-h-screen bg-surface-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-6 rounded-card border border-surface-100 bg-surface-0 p-4 shadow-card lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <Badge tone="brand">
              <BarChart3 size={14} />
              SUPERSTAT
            </Badge>
            <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">Bot statistikasi</h1>
            <p className="max-w-2xl text-sm leading-relaxed text-ink-500">
              Foydalanuvchi, to&apos;lov, obuna, promokod va admin faoliyati bo&apos;yicha operatsion nazorat paneli.
            </p>
          </div>
          <aside className="flex flex-col gap-1 rounded-2xl bg-surface-50 p-4 lg:w-72 lg:shrink-0">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-400">Hisobot sanasi</span>
            <strong className="text-lg font-bold text-ink-900">29 iyun 2026</strong>
            <small className="text-xs leading-relaxed text-ink-500">
              Frontend ko&apos;rinish tayyor, backend statistik API keyingi bosqichda ulanadi.
            </small>
          </aside>
        </header>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label={"Asosiy ko'rsatkichlar"}>
          {overviewMetrics.map((metric) => (
            <MetricCard key={metric.label} metric={metric} />
          ))}
        </section>

        <Card as="section" className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-center">
          <div className="space-y-4">
            <Badge tone="success">
              <TrendingUp size={14} />
              Haqiqiy daromad
            </Badge>
            <h2 className="text-xl font-bold tracking-tight text-ink-900">Jami tushum: 583 000 so&apos;m</h2>
            <p className="text-sm leading-relaxed text-ink-500">
              Foydalanuvchi to&apos;lovlari ichida hozircha manual karta to&apos;lovlari asosiy manba. 19 ta to&apos;lov
              alohida hisobga olinadi.
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {[
                "Manual karta: 583 000 so'm",
                "To'lovlar soni: 19 ta",
                "Promokod ishlatilgan: 117"
              ].map((kpi) => (
                <b
                  key={kpi}
                  className="rounded-2xl bg-surface-50 px-3 py-2.5 text-xs font-semibold text-ink-700"
                >
                  {kpi}
                </b>
              ))}
            </div>
          </div>
          <div
            className="flex items-end justify-between gap-2 rounded-2xl bg-surface-50 p-4"
            aria-label="Daromad va faoliyat grafigi"
          >
            {revenueBars.map(([label, height]) => (
              <span key={label} className="flex flex-1 flex-col items-center gap-2">
                <span className="flex h-36 w-full items-end justify-center">
                  <i
                    className={`block w-full max-w-8 rounded-t-lg bg-gradient-to-t from-brand-500 to-accent-400 bar-height-${height}`}
                  />
                </span>
                <b className="text-[0.7rem] font-semibold text-ink-500">{label}</b>
              </span>
            ))}
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Panel title="Til ulushi" eyebrow="Language" Icon={Languages}>
            <div className="flex flex-col gap-3">
              {languageStats.map(([label, value, percent]) => (
                <div key={label} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <b className="text-sm font-bold uppercase text-ink-900">{label}</b>
                      <em className="text-xs not-italic text-ink-400">{value}</em>
                    </span>
                    <small className="text-sm font-semibold text-ink-700">{percent}.0%</small>
                  </div>
                  <i className="block h-2 w-full overflow-hidden rounded-pill bg-surface-100">
                    <b className={`block h-full rounded-pill bg-brand-500 progress-width-${percent}`} />
                  </i>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Faol obunalar" eyebrow="Subscriptions" Icon={CreditCard}>
            <StatList items={subscriptionStats} Icon={CheckCircle2} />
          </Panel>

          <Panel title={"Eng ko'p tanlangan tariflar"} eyebrow="92 marta" Icon={Star}>
            <div className="-mx-1 overflow-x-auto">
              <table className="w-full min-w-[22rem] text-sm">
                <thead>
                  <tr className="text-left text-[0.7rem] uppercase tracking-[0.08em] text-ink-400">
                    <th className="px-1 pb-2 font-semibold">Tarif</th>
                    <th className="px-1 pb-2 font-semibold">Tanlov</th>
                    <th className="px-1 pb-2 font-semibold">Narx</th>
                    <th className="px-1 pb-2 font-semibold">Foydalanuvchi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {tariffRows.map(([tariff, count, price, users]) => (
                    <tr key={tariff} className="text-ink-700">
                      <td className="px-1 py-2.5 font-semibold text-ink-900">{tariff}</td>
                      <td className="px-1 py-2.5">{count}</td>
                      <td className="px-1 py-2.5">{price}</td>
                      <td className="px-1 py-2.5">{users}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title={"Maqsadlar bo'yicha"} eyebrow="Segments" Icon={Target}>
            <div className="flex flex-col gap-3.5">
              {goalStats.map(([title, users, share, revenue, percent]) => (
                <article key={title} className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex min-w-0 flex-col">
                      <b className="truncate text-sm font-semibold text-ink-900">{title}</b>
                      <small className="text-xs text-ink-400">
                        {users} · {share}
                      </small>
                    </span>
                    <strong className="shrink-0 text-sm font-bold text-ink-900">{revenue}</strong>
                  </div>
                  <i className="block h-1.5 w-full overflow-hidden rounded-pill bg-surface-100">
                    <b className={`block h-full rounded-pill bg-gradient-to-r from-brand-500 to-accent-500 progress-width-${percent}`} />
                  </i>
                </article>
              ))}
            </div>
          </Panel>

          <Panel title={"Sovg'a kodlari"} eyebrow="Gift codes" Icon={Gift}>
            <StatList items={giftStats} Icon={Gift} />
          </Panel>

          <Panel title="Promokodlar" eyebrow="Promocodes" Icon={Ticket}>
            <StatList items={promoStats} Icon={Percent} />
          </Panel>

          <Panel title="Promokod yaratish" eyebrow="Admin action" Icon={Plus}>
            <form className="flex flex-col gap-3">
              <Field label="Kod" name="code" placeholder="DENTAL50" />
              <Field label="Chegirma" name="discount" placeholder="50 000 so'm yoki 20%" />
              <Field label="Limit" name="limit" placeholder="100" inputMode="numeric" />
              <Button type="button" className="mt-1">
                <Plus size={17} />
                Yaratish
              </Button>
            </form>
          </Panel>

          <Panel title="Admin faoliyati" eyebrow="Operations" Icon={ShieldCheck}>
            <StatList items={adminActivity} Icon={UserCheck} />
          </Panel>

          <Panel title="Referal" eyebrow="Referral" Icon={Globe2}>
            <div className="grid grid-cols-2 gap-3">
              {referralStats.map(([label, value]) => (
                <article key={label} className="flex flex-col gap-1 rounded-2xl bg-surface-50 px-4 py-3.5">
                  <span className="text-xs font-medium text-ink-500">{label}</span>
                  <strong className="text-xl font-bold text-ink-900">{value}</strong>
                </article>
              ))}
            </div>
          </Panel>

          <Panel title="Haftalik savollar" eyebrow="Questions" Icon={HelpCircle}>
            <StatList
              items={weeklyQuestions.map(([label, value]) => [label, value, "Savollar statistikasi"] as const)}
              Icon={ClipboardList}
            />
          </Panel>

          <Panel title={"Top 5 to'lovchilar"} eyebrow="Top payers" Icon={LineChart} className="md:col-span-2 xl:col-span-2">
            <div className="-mx-1 overflow-x-auto">
              <table className="w-full min-w-[26rem] text-sm">
                <thead>
                  <tr className="text-left text-[0.7rem] uppercase tracking-[0.08em] text-ink-400">
                    <th className="px-1 pb-2 font-semibold">#</th>
                    <th className="px-1 pb-2 font-semibold">Mijoz</th>
                    <th className="px-1 pb-2 font-semibold">Tarif</th>
                    <th className="px-1 pb-2 font-semibold">To&apos;lov</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {topPayers.map(([rank, name, tariff, amount]) => (
                    <tr key={name} className="text-ink-700">
                      <td className="px-1 py-2.5">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-600">
                          {rank}
                        </span>
                      </td>
                      <td className="px-1 py-2.5 font-semibold text-ink-900">{name}</td>
                      <td className="px-1 py-2.5">{tariff}</td>
                      <td className="px-1 py-2.5 font-semibold text-ink-900">{amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title="Operatsion kuzatuv" eyebrow="System" Icon={Activity}>
            <div className="flex flex-col gap-2.5">
              <article className="flex items-center gap-3 rounded-2xl bg-surface-50 px-3.5 py-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-0 text-brand-600 shadow-card">
                  <CalendarDays size={18} />
                </span>
                <span className="min-w-0 flex-1 text-sm font-semibold text-ink-900">
                  Bugungi foydalanuvchi o&apos;sishi
                </span>
                <strong className="text-sm font-bold text-ink-900">+0</strong>
              </article>
              <article className="flex items-center gap-3 rounded-2xl bg-surface-50 px-3.5 py-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-0 text-brand-600 shadow-card">
                  <ClipboardList size={18} />
                </span>
                <span className="min-w-0 flex-1 text-sm font-semibold text-ink-900">
                  Oy boshidan foydalanuvchilar
                </span>
                <strong className="text-sm font-bold text-ink-900">+751</strong>
              </article>
            </div>
          </Panel>
        </div>
      </div>
    </main>
  );
}

export default function SuperstatPage() {
  return (
    <SuperstatAccessGate>
      <SuperstatDashboard />
    </SuperstatAccessGate>
  );
}
