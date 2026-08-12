import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { BOOT_FALLBACK_ID, BOOT_RETRY_ID, bootWatchdogScript } from "@/src/dental-map/lib/boot";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dental Map",
  description: "Shifokor, klinika, qabul, xarita va yozuvlar uchun Dental Map mini ilovasi.",
  icons: {
    icon: "/brand/dental-map-logo.png",
    shortcut: "/brand/dental-map-logo.png",
    apple: "/brand/dental-map-logo.png"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b8fb2"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uz" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var s=localStorage.getItem('dental-map-theme');var tg=window.Telegram&&window.Telegram.WebApp;var d=s?s==='dark':(tg&&tg.colorScheme?tg.colorScheme==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches);var e=document.documentElement;e.classList.toggle('dark',d);e.dataset.telegramTheme=d?'dark':'light';}catch(_){}})();"
          }}
        />
        {/* See src/dental-map/lib/boot.ts: reveals #dental-boot-fallback if the
            React root never signals that it mounted. Inline and in <head> so it
            starts counting before any other request can hang. */}
        <script dangerouslySetInnerHTML={{ __html: bootWatchdogScript }} />
      </head>
      <body>
        {/*
          Served from our own origin, and deliberately NOT "beforeInteractive".

          Under output:"export" a beforeInteractive script is not a plain <script>
          tag — Next queues it and next/dist/client/app-bootstrap.js drains the
          queue with a promise settled only by onload/onerror. A connection that
          HANGS (the usual DPI-throttle/blackhole shape for telegram.org on some
          UZ mobile operators) settles neither, so React never hydrates and the
          user stares at the prerendered spinner forever. Telegram does not inject
          the SDK; the webview fetches it over the user's own network, so this hit
          people inside the Telegram app too.

          Same-origin removes the third-party dependency, and afterInteractive
          keeps hydration off the script's critical path either way. useTelegram
          polls for the SDK for 2.5s and degrades to the browser path without it.
        */}
        <Script src="/telegram-web-app.js" strategy="afterInteractive" />
        {children}

        <noscript>
          <div className="fixed inset-0 z-50 grid place-items-center bg-surface-100 px-6">
            <p className="max-w-sm text-center text-sm text-ink-900">
              Dental Map ishlashi uchun JavaScript yoqilgan bo&apos;lishi kerak. Brauzer sozlamalarida
              JavaScriptni yoqing va sahifani qayta yuklang.
            </p>
          </div>
        </noscript>

        {/* Revealed by the boot watchdog when hydration never happens. Kept in the
            prerendered HTML (rather than injected by script) so its markup is
            ordinary JSX: Tailwind sees the classes, and the CSP needs no
            inline-style or inline-handler exception. */}
        <div id={BOOT_FALLBACK_ID} hidden role="alert" className="fixed inset-0 z-50 grid place-items-center bg-surface-100 px-6">
          <div className="max-w-sm text-center">
            <p className="text-lg font-semibold text-ink-900">Ilova ochilmadi</p>
            <p className="mt-2 text-sm text-ink-600">
              Internet aloqasi juda sekin yoki tarmoq ulanishni to&apos;sib qo&apos;yayotgan bo&apos;lishi
              mumkin. Mobil internet va Wi-Fi ni almashtirib, qayta urinib ko&apos;ring.
            </p>
            <p className="mt-2 text-sm text-ink-600">
              Yordam bermasa, botga <span className="font-semibold text-ink-900">/start</span> yuboring —
              yangi tugma keladi.
            </p>
            <button
              id={BOOT_RETRY_ID}
              type="button"
              className="mt-5 h-12 w-full rounded-pill bg-brand-500 font-semibold text-white shadow-card"
            >
              Qayta urinish
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
