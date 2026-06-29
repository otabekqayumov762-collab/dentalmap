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

export const metadata: Metadata = {
  title: "SUPERSTAT | Dental Map",
  description: "Dental Map uchun foydalanuvchi, daromad va marketing statistikasi."
};

type Tone = "blue" | "green" | "amber" | "rose" | "indigo" | "slate";

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

function MetricCard({ metric }: { metric: Metric }) {
  const { Icon } = metric;

  return (
    <article className={`superstat-metric tone-${metric.tone}`}>
      <div>
        <span>{metric.label}</span>
        <strong>{metric.value}</strong>
        <small>{metric.note}</small>
      </div>
      <Icon size={22} />
      <b>{metric.trend}</b>
    </article>
  );
}

function Panel({
  title,
  eyebrow,
  Icon,
  children
}: {
  title: string;
  eyebrow: string;
  Icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <section className="superstat-panel">
      <div className="superstat-panel-head">
        <span>
          <Icon size={18} />
          {eyebrow}
        </span>
        <h2>{title}</h2>
      </div>
      {children}
    </section>
  );
}

export default function SuperstatPage() {
  return (
    <main className="superstat-page">
      <header className="superstat-header">
        <div>
          <span className="superstat-eyebrow">
            <BarChart3 size={18} />
            SUPERSTAT
          </span>
          <h1>Bot statistikasi</h1>
          <p>Foydalanuvchi, to&apos;lov, obuna, promokod va admin faoliyati bo&apos;yicha operatsion nazorat paneli.</p>
        </div>
        <aside>
          <span>Hisobot sanasi</span>
          <strong>29 iyun 2026</strong>
          <small>Frontend ko&apos;rinish tayyor, backend statistik API keyingi bosqichda ulanadi.</small>
        </aside>
      </header>

      <section className="superstat-metrics" aria-label={"Asosiy ko'rsatkichlar"}>
        {overviewMetrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </section>

      <section className="superstat-revenue">
        <div className="superstat-revenue-copy">
          <span>
            <TrendingUp size={18} />
            Haqiqiy daromad
          </span>
          <h2>Jami tushum: 583 000 so&apos;m</h2>
          <p>Foydalanuvchi to&apos;lovlari ichida hozircha manual karta to&apos;lovlari asosiy manba. 19 ta to&apos;lov alohida hisobga olinadi.</p>
          <div className="superstat-revenue-kpis">
            <b>Manual karta: 583 000 so&apos;m</b>
            <b>To&apos;lovlar soni: 19 ta</b>
            <b>Promokod ishlatilgan: 117</b>
          </div>
        </div>
        <div className="superstat-bars" aria-label="Daromad va faoliyat grafigi">
          {revenueBars.map(([label, height]) => (
            <span key={label}>
              <i className={`bar-fill bar-height-${height}`} />
              <b>{label}</b>
            </span>
          ))}
        </div>
      </section>

      <div className="superstat-grid">
        <Panel title="Til ulushi" eyebrow="Language" Icon={Languages}>
          <div className="superstat-progress-list">
            {languageStats.map(([label, value, percent]) => (
              <div key={label} className="superstat-progress-row">
                <span>
                  <b>{label}</b>
                  <em>{value}</em>
                </span>
                <i>
                  <b className={`progress-fill progress-width-${percent}`} />
                </i>
                <small>{percent}.0%</small>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Faol obunalar" eyebrow="Subscriptions" Icon={CreditCard}>
          <div className="superstat-status-list">
            {subscriptionStats.map(([label, value, note]) => (
              <article key={label}>
                <CheckCircle2 size={18} />
                <span>
                  <b>{label}</b>
                  <small>{note}</small>
                </span>
                <strong>{value}</strong>
              </article>
            ))}
          </div>
        </Panel>

        <Panel title={"Eng ko'p tanlangan tariflar"} eyebrow="92 marta" Icon={Star}>
          <div className="superstat-table-wrap">
            <table className="superstat-table">
              <thead>
                <tr>
                  <th>Tarif</th>
                  <th>Tanlov</th>
                  <th>Narx</th>
                  <th>Foydalanuvchi</th>
                </tr>
              </thead>
              <tbody>
                {tariffRows.map(([tariff, count, price, users]) => (
                  <tr key={tariff}>
                    <td>{tariff}</td>
                    <td>{count}</td>
                    <td>{price}</td>
                    <td>{users}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title={"Maqsadlar bo'yicha"} eyebrow="Segments" Icon={Target}>
          <div className="superstat-goals">
            {goalStats.map(([title, users, share, revenue, percent]) => (
              <article key={title}>
                <span>
                  <b>{title}</b>
                  <small>
                    {users} · {share}
                  </small>
                </span>
                <strong>{revenue}</strong>
                <i>
                  <b className={`progress-fill progress-width-${percent}`} />
                </i>
              </article>
            ))}
          </div>
        </Panel>

        <Panel title={"Sovg'a kodlari"} eyebrow="Gift codes" Icon={Gift}>
          <div className="superstat-status-list">
            {giftStats.map(([label, value, note]) => (
              <article key={label}>
                <Gift size={18} />
                <span>
                  <b>{label}</b>
                  <small>{note}</small>
                </span>
                <strong>{value}</strong>
              </article>
            ))}
          </div>
        </Panel>

        <Panel title="Promokodlar" eyebrow="Promocodes" Icon={Ticket}>
          <div className="superstat-status-list">
            {promoStats.map(([label, value, note]) => (
              <article key={label}>
                <Percent size={18} />
                <span>
                  <b>{label}</b>
                  <small>{note}</small>
                </span>
                <strong>{value}</strong>
              </article>
            ))}
          </div>
        </Panel>

        <Panel title="Promokod yaratish" eyebrow="Admin action" Icon={Plus}>
          <form className="superstat-promo-form">
            <label>
              <span>Kod</span>
              <input placeholder="DENTAL50" />
            </label>
            <label>
              <span>Chegirma</span>
              <input placeholder="50 000 so'm yoki 20%" />
            </label>
            <label>
              <span>Limit</span>
              <input placeholder="100" />
            </label>
            <button type="button">
              <Plus size={17} />
              Yaratish
            </button>
          </form>
        </Panel>

        <Panel title="Admin faoliyati" eyebrow="Operations" Icon={ShieldCheck}>
          <div className="superstat-admin-list">
            {adminActivity.map(([action, count, note]) => (
              <article key={action}>
                <UserCheck size={18} />
                <span>
                  <b>{action}</b>
                  <small>{note}</small>
                </span>
                <strong>{count}</strong>
              </article>
            ))}
          </div>
        </Panel>

        <Panel title="Referal" eyebrow="Referral" Icon={Globe2}>
          <div className="superstat-referral-grid compact">
            {referralStats.map(([label, value]) => (
              <article key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </article>
            ))}
          </div>
        </Panel>

        <Panel title="Haftalik savollar" eyebrow="Questions" Icon={HelpCircle}>
          <div className="superstat-status-list">
            {weeklyQuestions.map(([label, value]) => (
              <article key={label}>
                <ClipboardList size={18} />
                <span>
                  <b>{label}</b>
                  <small>Savollar statistikasi</small>
                </span>
                <strong>{value}</strong>
              </article>
            ))}
          </div>
        </Panel>

        <Panel title={"Top 5 to'lovchilar"} eyebrow="Top payers" Icon={LineChart}>
          <div className="superstat-table-wrap">
            <table className="superstat-table top-payers">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Mijoz</th>
                  <th>Tarif</th>
                  <th>To&apos;lov</th>
                </tr>
              </thead>
              <tbody>
                {topPayers.map(([rank, name, tariff, amount]) => (
                  <tr key={name}>
                    <td>{rank}</td>
                    <td>{name}</td>
                    <td>{tariff}</td>
                    <td>{amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Operatsion kuzatuv" eyebrow="System" Icon={Activity}>
          <div className="superstat-system-list">
            <article>
              <CalendarDays size={18} />
              <span>Bugungi foydalanuvchi o&apos;sishi</span>
              <strong>+0</strong>
            </article>
            <article>
              <ClipboardList size={18} />
              <span>Oy boshidan foydalanuvchilar</span>
              <strong>+751</strong>
            </article>
          </div>
        </Panel>
      </div>
    </main>
  );
}
