"use client";

import { ArrowRight, CalendarCheck, Check, Search, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { CountUp } from "./CountUp";
import { LANGUAGES, LANGUAGE_LABELS, type Language } from "./content";
import { initialLanguage, rememberLanguage, useLanding } from "./useLanding";

const ICONS: Record<string, typeof Search> = {
  search: Search,
  calendar: CalendarCheck,
  check: Check,
  shield: ShieldCheck
};

/** A YouTube watch/short/embed link reduced to the id we can embed. */
function youtubeId(url: string) {
  const match = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/.exec(url);
  return match?.[1] ?? "";
}

function money(value: number) {
  return value.toLocaleString("uz-UZ").replace(/,/g, " ");
}

export function LandingPage() {
  const [lang, setLang] = useState<Language>(initialLanguage);
  const { content } = useLanding(lang);
  const bot = content.bot_url;

  const video = useMemo(() => {
    if (!content.video.url) return null;
    if (content.video.is_file) return { kind: "file" as const, src: content.video.url };
    const id = youtubeId(content.video.url);
    return id ? { kind: "youtube" as const, src: `https://www.youtube-nocookie.com/embed/${id}` } : null;
  }, [content.video]);

  function chooseLanguage(next: Language) {
    setLang(next);
    rememberLanguage(next);
  }

  // Rendered as a real anchor, not a button with a handler: it must still work
  // when JavaScript has not run, and it must be long-pressable on a phone.
  const cta = (extra = "") =>
    bot ? (
      <a
        href={bot}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center justify-center gap-2 rounded-full bg-brand-600 px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-brand-600/20 transition hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 ${extra}`}
      >
        {content.hero.cta}
        <ArrowRight className="h-5 w-5" aria-hidden />
      </a>
    ) : null;

  return (
    <div className="min-h-dvh bg-white text-ink-900 antialiased">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-6">
        <span className="text-lg font-extrabold tracking-tight">
          DENTAL<span className="text-brand-600">MAP</span>
        </span>
        <nav aria-label="Til" className="flex items-center gap-1 rounded-full bg-surface-100 p-1">
          {LANGUAGES.map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => chooseLanguage(code)}
              aria-current={code === lang ? "true" : undefined}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${
                code === lang ? "bg-white text-ink-900 shadow-sm" : "text-ink-500 hover:text-ink-700"
              }`}
            >
              {code}
              <span className="sr-only"> — {LANGUAGE_LABELS[code]}</span>
            </button>
          ))}
        </nav>
      </header>

      <main>
        {/* Hero.
            Two columns on desktop, because a single column of text against half
            a screen of nothing is what makes a page read as unfinished. The
            right-hand side is a phone rendered in CSS rather than a screenshot:
            it never goes stale when the app changes, it weighs nothing, and it
            stays sharp on every screen. */}
        <section className="relative overflow-hidden">
          {/* A single soft wash of brand colour behind the fold. The page stays
              white; this only stops it reading as flat paper. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 -top-40 h-[36rem] bg-[radial-gradient(60%_60%_at_50%_40%,var(--color-brand-50),transparent_70%)]"
          />
          <div className="relative mx-auto grid w-full max-w-6xl items-center gap-14 px-5 pb-20 pt-8 lg:grid-cols-[1.05fr_.95fr] lg:gap-8 lg:pt-14">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white/70 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-widest text-brand-700 backdrop-blur">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
                Telegram
              </span>
              <h1 className="mt-6 text-balance text-[2.6rem] font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
                {content.hero.title}
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-600">
                {content.hero.subtitle}
              </p>
              <div className="mt-9">{cta()}</div>

              {content.stats ? (
                <dl className="mt-12 flex flex-wrap gap-x-12 gap-y-6 border-t border-surface-200 pt-8">
                  {[
                    { value: content.stats.patients, label: content.stats.patients_label },
                    { value: content.stats.doctors, label: content.stats.doctors_label }
                  ].map((item) => (
                    <div key={item.label}>
                      <dd className="text-4xl font-extrabold tracking-tight text-ink-900 sm:text-5xl">
                        <CountUp value={item.value} />
                        <span className="text-brand-500">+</span>
                      </dd>
                      <dt className="mt-1 text-sm font-medium uppercase tracking-wider text-ink-400">
                        {item.label}
                      </dt>
                    </div>
                  ))}
                </dl>
              ) : null}
            </div>

            <PhoneMock />
          </div>
        </section>

        {/* How it works */}
        <section className="border-y border-surface-200 bg-surface-50">
          <div className="mx-auto w-full max-w-6xl px-5 py-20">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{content.steps_title}</h2>
            <ol className="mt-12 grid gap-8 sm:grid-cols-3">
              {content.steps.map((step, index) => {
                const Icon = ICONS[step.icon] ?? Check;
                return (
                  <li key={`${step.title}-${index}`} className="relative">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-brand-600 shadow-sm ring-1 ring-surface-200">
                      <Icon className="h-6 w-6" aria-hidden />
                    </div>
                    {/* The number carries the order, which is information the
                        icon cannot: these steps happen in sequence. */}
                    <div className="mt-5 text-xs font-bold uppercase tracking-widest text-brand-600">
                      {String(index + 1).padStart(2, "0")}
                    </div>
                    <h3 className="mt-2 text-xl font-semibold tracking-tight">{step.title}</h3>
                    <p className="mt-2.5 leading-relaxed text-ink-600">{step.body}</p>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        {/* Video */}
        {video ? (
          <section className="mx-auto w-full max-w-5xl px-5 py-20">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{content.video.title}</h2>
            <div className="mt-8 overflow-hidden rounded-3xl border border-surface-200 bg-black shadow-xl shadow-ink-900/5">
              {video.kind === "file" ? (
                <video
                  className="aspect-video w-full"
                  src={video.src}
                  poster={content.video.poster || undefined}
                  controls
                  playsInline
                  preload="metadata"
                />
              ) : (
                <iframe
                  className="aspect-video w-full"
                  src={video.src}
                  title={content.video.title}
                  loading="lazy"
                  allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              )}
            </div>
          </section>
        ) : null}

        {/* Doctor tariff */}
        {content.plans.length ? (
          <section className="border-t border-surface-200 bg-surface-50">
            <div className="mx-auto w-full max-w-6xl px-5 py-20">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{content.plans_title}</h2>
              {content.plans_note ? (
                <p className="mt-4 max-w-2xl leading-relaxed text-ink-600">{content.plans_note}</p>
              ) : null}
              <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {content.plans.map((plan, index) => (
                  <div
                    key={`${plan.name}-${index}`}
                    className={`flex flex-col rounded-3xl border bg-white p-8 ${
                      plan.featured
                        ? "border-brand-500 shadow-xl shadow-brand-600/10 ring-1 ring-brand-500"
                        : "border-surface-200"
                    }`}
                  >
                    <h3 className="text-lg font-semibold tracking-tight">{plan.name}</h3>
                    <div className="mt-5 flex items-baseline gap-1.5">
                      <span className="text-4xl font-extrabold tracking-tight tabular-nums">
                        {money(plan.price)}
                      </span>
                      <span className="text-sm font-medium text-ink-500">so&apos;m</span>
                    </div>
                    {plan.period ? (
                      <div className="mt-1 text-sm text-ink-500">{plan.period}</div>
                    ) : null}
                    {plan.features.length ? (
                      <ul className="mt-7 space-y-3 text-sm leading-relaxed text-ink-600">
                        {plan.features.map((feature) => (
                          <li key={feature} className="flex gap-2.5">
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    <div className="mt-8 pt-1">{cta("w-full")}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {/* Closing call to action */}
        <section className="mx-auto w-full max-w-6xl px-5 py-24 text-center">
          <h2 className="mx-auto max-w-2xl text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            {content.hero.title}
          </h2>
          <div className="mt-9 flex justify-center">{cta()}</div>
        </section>
      </main>

      <footer className="border-t border-surface-200">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-5 py-10 text-sm text-ink-500 sm:flex-row sm:items-center sm:justify-between">
          <span>© Dental Map</span>
          <div className="flex gap-5">
            <a className="hover:text-ink-700" href="/privacy/">
              Maxfiylik
            </a>
            <a className="hover:text-ink-700" href="/oferta/">
              Oferta
            </a>
            {bot ? (
              <a className="hover:text-ink-700" href={bot} target="_blank" rel="noopener noreferrer">
                Telegram
              </a>
            ) : null}
          </div>
        </div>
      </footer>
    </div>
  );
}


/**
 * The product, shown rather than described.
 *
 * Drawn in CSS instead of shipped as a screenshot: a screenshot of an app that
 * is still changing is out of date the week after it is taken, weighs a hundred
 * times more, and blurs on a retina screen. This stays sharp, weighs nothing,
 * and is the same brand palette as the app itself.
 *
 * Entirely decorative, so the whole thing is hidden from assistive technology:
 * a screen reader reading out a fake doctor's name as if it were content would
 * be worse than silence.
 */
function PhoneMock() {
  return (
    <div aria-hidden className="relative mx-auto hidden w-full max-w-[19rem] lg:block">
      <div className="absolute -inset-6 rounded-[3rem] bg-brand-100/40 blur-2xl" />
      <div className="relative rounded-[2.5rem] border border-surface-200 bg-white p-2.5 shadow-2xl shadow-ink-900/10">
        <div className="overflow-hidden rounded-[2rem] bg-surface-50">
          <div className="flex items-center justify-between px-5 pb-2 pt-4 text-[0.65rem] font-semibold text-ink-400">
            <span>9:41</span>
            <span className="h-1.5 w-16 rounded-full bg-ink-900/10" />
          </div>
          <div className="px-4 pb-5">
            <div className="flex items-center gap-2 rounded-xl border border-surface-200 bg-white px-3 py-2.5">
              <Search className="h-4 w-4 text-ink-400" />
              <span className="text-xs text-ink-400">Shifokor qidirish</span>
            </div>
            <div className="mt-3 space-y-2.5">
              {[
                { name: "Otabek Qayumov", role: "Implantolog", years: "9 yil" },
                { name: "Nilufar Karimova", role: "Ortodont", years: "6 yil" },
                { name: "Jasur Rahimov", role: "Terapevt", years: "12 yil" }
              ].map((doctor, index) => (
                <div
                  key={doctor.name}
                  className={`flex items-center gap-3 rounded-2xl border bg-white p-3 ${
                    index === 0 ? "border-brand-300 shadow-md shadow-brand-600/10" : "border-surface-200"
                  }`}
                >
                  <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-brand-200 to-brand-400" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[0.8rem] font-semibold text-ink-900">{doctor.name}</div>
                    <div className="text-[0.7rem] text-ink-500">
                      {doctor.role} · {doctor.years}
                    </div>
                  </div>
                  <div className="rounded-full bg-brand-50 px-2 py-1 text-[0.6rem] font-bold text-brand-700">
                    4.9
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-2xl bg-brand-600 px-4 py-3 text-center text-xs font-semibold text-white">
              Qabulga yozilish
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
