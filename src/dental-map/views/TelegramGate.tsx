import { Send } from "lucide-react";
import { BrandLogo } from "../components/common";
import { openExternal } from "../lib/url";

const BOT_URL = process.env.NEXT_PUBLIC_BOT_URL || "";

/**
 * Shown when the app is opened outside Telegram. The mini app is only meant to
 * run inside the bot, so we block browser access with a clear call to action.
 */
export function TelegramGate() {
  return (
    <main className="grid min-h-[var(--tg-viewport-height)] place-items-center bg-surface-100 px-6">
      <section className="flex w-full max-w-sm flex-col items-center gap-5 rounded-card bg-surface-0 p-8 text-center shadow-card">
        <span className="inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-brand-50">
          <BrandLogo />
        </span>
        <div className="flex flex-col gap-1.5">
          <h1 className="text-xl font-extrabold tracking-tight text-ink-900">
            DENTAL <span className="text-brand-500">MAP</span>
          </h1>
          <p className="text-[0.95rem] leading-relaxed text-ink-500">
            Ilova faqat Telegram bot ichida ishlaydi. Iltimos, uni botimiz orqali oching.
          </p>
        </div>
        {BOT_URL && (
          <button
            type="button"
            onClick={() => openExternal(BOT_URL)}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-pill bg-brand-500 font-semibold text-white shadow-card transition-colors hover:bg-brand-600 active:scale-[0.98]"
          >
            <Send size={18} />
            Telegramda ochish
          </button>
        )}
        <small className="text-xs text-ink-400">Telegram &rarr; botni oching &rarr; “Ochish” tugmasini bosing</small>
      </section>
    </main>
  );
}
