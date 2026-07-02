import type { Metadata } from "next";
import {
  Activity,
  BarChart3,
  CircleAlert,
  ExternalLink,
  FileJson,
  LockKeyhole,
  ServerCog,
  ShieldCheck,
  Stethoscope,
  TableProperties,
  type LucideIcon
} from "lucide-react";

import { Badge, Card } from "@/src/dental-map/ui";

export const metadata: Metadata = {
  title: "SUPERSTAT | Dental Map",
  description: "Dental Map backoffice statistikasi uchun xavfsiz kirish sahifasi."
};

type Tone = "brand" | "success" | "warning" | "danger" | "neutral";

type Action = {
  title: string;
  text: string;
  href: string;
  label: string;
  Icon: LucideIcon;
  tone: Tone;
};

const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/[/]+$/, "") || "http://localhost:8000";

const actions: Action[] = [
  {
    title: "Real SUPERSTAT",
    text: "Foydalanuvchi, doktor, qabul, to'lov va Google Sheets holati Django admin sessiyasi bilan ochiladi.",
    href: `${configuredApiUrl}/admin/superstat/`,
    label: "Admin panelni ochish",
    Icon: BarChart3,
    tone: "brand"
  },
  {
    title: "JSON API",
    text: "Xuddi shu statistika mashina o'qiydigan formatda. Endpoint admin huquqini talab qiladi.",
    href: `${configuredApiUrl}/api/admin/superstat/`,
    label: "JSON ma'lumot",
    Icon: FileJson,
    tone: "neutral"
  },
  {
    title: "Backend health",
    text: "Public liveness endpoint. Deploy yoki lokal muhitda backend tirikligini tez tekshirish uchun.",
    href: `${configuredApiUrl}/api/health/`,
    label: "Health check",
    Icon: Activity,
    tone: "success"
  },
  {
    title: "DRF hujjatlar",
    text: "Local DEBUG rejimda API schema va endpointlarni ko'rish uchun dokumentatsiya sahifasi.",
    href: `${configuredApiUrl}/api/docs/`,
    label: "API docs",
    Icon: ServerCog,
    tone: "warning"
  }
];

const toneClasses: Record<Tone, string> = {
  brand: "bg-brand-50 text-brand-700",
  success: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-700",
  danger: "bg-rose-50 text-rose-600",
  neutral: "bg-surface-100 text-ink-600"
};

function ActionCard({ action }: { action: Action }) {
  const { Icon } = action;

  return (
    <Card as="article" className="flex min-h-56 flex-col justify-between gap-5">
      <div className="flex items-start justify-between gap-3">
        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${toneClasses[action.tone]}`}>
          <Icon size={23} />
        </span>
        <Badge tone={action.tone}>{action.label}</Badge>
      </div>
      <div className="space-y-2">
        <h2 className="text-lg font-bold tracking-tight text-ink-900">{action.title}</h2>
        <p className="text-sm leading-relaxed text-ink-500">{action.text}</p>
      </div>
      <a
        href={action.href}
        target="_blank"
        rel="noreferrer"
        className="inline-flex h-11 items-center justify-center gap-2 rounded-pill bg-brand-500 px-4 text-sm font-semibold text-white shadow-card transition-colors hover:bg-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 active:scale-[0.98]"
      >
        <ExternalLink size={16} />
        Ochish
      </a>
    </Card>
  );
}

function GuardRail({
  Icon,
  title,
  text
}: {
  Icon: LucideIcon;
  title: string;
  text: string;
}) {
  return (
    <article className="flex items-start gap-3 rounded-2xl bg-surface-50 px-4 py-3.5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-0 text-brand-600 shadow-card">
        <Icon size={18} />
      </span>
      <span className="min-w-0">
        <b className="block text-sm font-semibold text-ink-900">{title}</b>
        <small className="block pt-1 text-xs leading-relaxed text-ink-500">{text}</small>
      </span>
    </article>
  );
}

export default function SuperstatPage() {
  return (
    <main className="min-h-screen bg-surface-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-6 rounded-card border border-surface-100 bg-surface-0 p-5 shadow-card lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <Badge tone="brand">
              <ShieldCheck size={14} />
              SUPERSTAT
            </Badge>
            <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">Backoffice statistikasi</h1>
            <p className="max-w-2xl text-sm leading-relaxed text-ink-500">
              Real operatsion raqamlar public frontda ko&apos;rsatilmaydi. Statistik panel, Google Sheets holati va JSON
              endpoint Django admin loginidan keyin ochiladi.
            </p>
          </div>
          <aside className="flex flex-col gap-1 rounded-2xl bg-surface-50 p-4 lg:w-80 lg:shrink-0">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-400">Backend manzili</span>
            <strong className="break-all text-sm font-bold text-ink-900">{configuredApiUrl}</strong>
            <small className="text-xs leading-relaxed text-ink-500">
              Productionda bu qiymat `NEXT_PUBLIC_API_URL` orqali domen bilan beriladi.
            </small>
          </aside>
        </header>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Superstat havolalari">
          {actions.map((action) => (
            <ActionCard key={action.title} action={action} />
          ))}
        </section>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card as="section" className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <LockKeyhole size={18} />
              </span>
              <div>
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-ink-400">Security</p>
                <h2 className="text-base font-bold text-ink-900">Public frontda nimani ko&apos;rsatmaymiz</h2>
              </div>
            </div>
            <GuardRail Icon={Stethoscope} title="Bemor yoki to'lovchi ismlari" text="PII faqat admin sessiyasi ichida qoladi." />
            <GuardRail
              Icon={TableProperties}
              title="Daromad va Google Sheets holati"
              text="Operatsion moliyaviy raqamlar public routega chiqmaydi."
            />
            <GuardRail
              Icon={CircleAlert}
              title="Admin action formalar"
              text="Promokod va sozlamalar faqat Django admin orqali o'zgartiriladi."
            />
          </Card>

          <Card as="section" className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <ServerCog size={18} />
              </span>
              <div>
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-ink-400">Integration</p>
                <h2 className="text-base font-bold text-ink-900">Ulanish tartibi</h2>
              </div>
            </div>
            <GuardRail Icon={LockKeyhole} title="Django admin hisob bilan kiring" text="Avval `/admin/` sessiyasi ochiq bo'lishi kerak." />
            <GuardRail Icon={BarChart3} title="Real dashboard" text="`/admin/superstat/` real bazadan statistikani ko'rsatadi." />
            <GuardRail Icon={FileJson} title="JSON payload" text="`/api/admin/superstat/` admin huquqli ma'lumot qaytaradi." />
          </Card>
        </div>
      </div>
    </main>
  );
}
