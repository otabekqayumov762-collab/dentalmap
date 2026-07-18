import Link from "next/link";

const SUPPORT_URL = process.env.NEXT_PUBLIC_SUPPORT_URL?.trim() || "";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-surface-100 px-5 py-8 text-ink-700">
      <article className="mx-auto flex max-w-2xl flex-col gap-5 rounded-card bg-surface-0 p-6 shadow-card">
        <header>
          <p className="text-xs font-bold uppercase tracking-wide text-brand-600">Dental Map</p>
          <h1 className="mt-1 text-2xl font-extrabold text-ink-900">Maxfiylik va ma&apos;lumotlarni boshqarish</h1>
          <p className="mt-2 text-sm text-ink-500">Oxirgi yangilanish: 2026-yil 18-iyul</p>
        </header>

        <section className="space-y-2">
          <h2 className="font-bold text-ink-900">Nimalar yig&apos;iladi</h2>
          <p className="text-sm leading-relaxed">
            Profil va aloqa ma&apos;lumotlari, shifokor/klinika ma&apos;lumotlari, qabul sanasi-vaqti,
            bemor o&apos;zi kiritgan qisqa izoh, to&apos;lov holati, xizmat xabarlari hamda xavfsizlik
            jurnallari. Karta rekvizitlari Dental Map formasida yig&apos;ilmaydi; Payme to&apos;lovi Payme
            sahifasida yakunlanadi.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-bold text-ink-900">Maqsad va ulashish</h2>
          <p className="text-sm leading-relaxed">
            Ma&apos;lumotlar akkauntni yuritish, qabulni tashkil etish, shifokor bilan bog&apos;lash,
            to&apos;lovni tasdiqlash, firibgarlikdan himoya va yordam ko&apos;rsatish uchun ishlatiladi.
            Zarur qismi tanlangan shifokor/klinika, Payme va infratuzilma provayderlariga berilishi
            mumkin; reklama uchun sotilmaydi.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-bold text-ink-900">Sharhlar</h2>
          <p className="text-sm leading-relaxed">
            Sharh faqat yakunlangan qabuldan keyin va alohida rozilik bilan yuboriladi. Tasdiqlangan
            sharh ommaga ko&apos;rsatilishi mumkin, lekin bemorning to&apos;liq F.I.O.si chiqarilmaydi;
            faqat moderatsiyalangan taxallus va sharh mazmuni ko&apos;rinadi.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-bold text-ink-900">Saqlash va o&apos;chirish</h2>
          <p className="text-sm leading-relaxed">
            Akkaunt va qabul yozuvlari xizmat ishlayotgan davrda saqlanadi. Qonuniy, moliyaviy yoki
            nizolarni ko&apos;rib chiqish majburiyati bo&apos;lgan yozuvlar talab etilgan muddatgacha qolishi
            mumkin; qolgan ma&apos;lumotlar o&apos;chirish so&apos;rovi tasdiqlangach faol tizimlardan o&apos;chiriladi,
            zaxira nusxalaridan esa rejalashtirilgan aylanish muddati tugaganda yo&apos;qoladi.
          </p>
          <p className="text-sm leading-relaxed">
            Nusxa olish, tuzatish yoki akkauntni o&apos;chirish uchun rasmiy yordam kanaliga yozing.
            Shaxsni tasdiqlash talab qilinishi mumkin.
          </p>
        </section>

        <div className="flex flex-wrap gap-3 border-t border-surface-100 pt-4">
          <Link href="/" className="rounded-pill bg-surface-100 px-4 py-2 text-sm font-semibold text-ink-700">
            Ilovaga qaytish
          </Link>
          {SUPPORT_URL && (
            <a
              href={SUPPORT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-pill bg-brand-500 px-4 py-2 text-sm font-semibold text-white"
            >
              Ma&apos;lumotlar bo&apos;yicha yordam
            </a>
          )}
        </div>
      </article>
    </main>
  );
}
