import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dental Map",
  description: "Shifokor, klinika, qabul, xarita va yozuvlar uchun Dental Map mini ilovasi.",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
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
      </head>
      <body>
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="afterInteractive" />
        {children}
      </body>
    </html>
  );
}
