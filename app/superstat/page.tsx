import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SUPERSTAT | Dental Map",
  description: "Dental Map statistikasi faqat admin panelda ochiladi.",
};

const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/[/]+$/, "") || "http://localhost:8000";
const configuredAdminPath = process.env.NEXT_PUBLIC_ADMIN_URL?.trim().replace(/^\/+|\/+$/g, "") || "admin";
const adminSuperstatUrl = `${configuredApiUrl}/${configuredAdminPath}/superstat/`;

export default function SuperstatPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-surface-50 px-4 py-8 text-center">
      <meta httpEquiv="refresh" content={`0;url=${adminSuperstatUrl}`} />
      <section className="max-w-sm rounded-card border border-surface-100 bg-surface-0 p-6 shadow-card">
        <h1 className="text-lg font-bold text-ink-900">Admin panelga yo&apos;naltirilmoqda</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-500">
          SUPERSTAT faqat admin panelda ochiladi.
        </p>
        <a
          className="mt-5 inline-flex h-11 items-center justify-center rounded-pill bg-brand-500 px-5 text-sm font-semibold text-white"
          href={adminSuperstatUrl}
        >
          Admin superstatni ochish
        </a>
      </section>
    </main>
  );
}
