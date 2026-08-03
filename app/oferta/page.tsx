import Link from "next/link";

const SUPPORT_URL = process.env.NEXT_PUBLIC_SUPPORT_URL?.trim() || "";

/**
 * Public offer (ommaviy oferta) — the contract a doctor accepts by paying.
 *
 * A payment provider asks for this before enabling card tokenisation, and the
 * reason is narrow and practical: when a charge goes wrong — taken twice, taken
 * without the cardholder noticing, taken after a cancellation — the offer is the
 * document that decides who does what. So the sections that matter most here are
 * the ones about money moving, not the boilerplate.
 *
 * Every value in the payment terms is the value the system actually enforces:
 * BillingSettings.doctor_monthly_price_uzs, DOCTOR_SUBSCRIPTION_DAYS, and the
 * publication gates in apps/doctors/rules.py. If those change, this changes.
 *
 * The company identity is intentionally left as a placeholder rather than
 * invented — see LEGAL-TODO in the repo root.
 */

const ISSUER = {
  name: process.env.NEXT_PUBLIC_LEGAL_NAME?.trim() || "",
  taxId: process.env.NEXT_PUBLIC_LEGAL_TAX_ID?.trim() || "",
  address: process.env.NEXT_PUBLIC_LEGAL_ADDRESS?.trim() || "",
  phone: process.env.NEXT_PUBLIC_LEGAL_PHONE?.trim() || ""
};

const PRICE = process.env.NEXT_PUBLIC_SUBSCRIPTION_PRICE?.trim() || "";
const PERIOD_DAYS = "30";

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="font-bold text-ink-900">
        <span className="text-brand-600">{n}.</span> {title}
      </h2>
      <div className="space-y-2 text-sm leading-relaxed">{children}</div>
    </section>
  );
}

export default function OfertaPage() {
  return (
    <main className="min-h-screen bg-surface-100 px-5 py-8 text-ink-700">
      <article className="mx-auto flex max-w-2xl flex-col gap-5 rounded-card bg-surface-0 p-6 shadow-card">
        <header>
          <p className="text-xs font-bold uppercase tracking-wide text-brand-600">Dental Map</p>
          <h1 className="mt-1 text-2xl font-extrabold text-ink-900">Ommaviy oferta</h1>
          <p className="mt-2 text-sm text-ink-500">Oxirgi yangilanish: 2026-yil 3-avgust</p>
        </header>

        {(!ISSUER.name || !ISSUER.taxId) && (
          <div className="rounded-card border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-ink-900">
            <strong className="block font-bold">Diqqat: rekvizitlar to&apos;ldirilmagan</strong>
            Xizmat ko&apos;rsatuvchining rasmiy nomi va STIR raqami hali kiritilmagan. Oferta huquqiy
            kuchga ega bo&apos;lishi uchun ular to&apos;ldirilishi shart.
          </div>
        )}

        <Section n="1" title="Umumiy qoidalar">
          <p>
            Ushbu hujjat O&apos;zbekiston Respublikasi Fuqarolik kodeksining 367-moddasiga muvofiq
            ommaviy oferta hisoblanadi. Dental Map platformasidan foydalanish va obuna to&apos;lovini
            amalga oshirish oferta shartlarini to&apos;liq qabul qilish (aksept) deb tan olinadi.
          </p>
          <ul className="ml-4 list-disc space-y-1">
            <li>
              <strong>Xizmat ko&apos;rsatuvchi:</strong> {ISSUER.name || "— (to'ldirilishi kerak)"}
            </li>
            <li>
              <strong>STIR:</strong> {ISSUER.taxId || "— (to'ldirilishi kerak)"}
            </li>
            <li>
              <strong>Manzil:</strong> {ISSUER.address || "— (to'ldirilishi kerak)"}
            </li>
            <li>
              <strong>Aloqa:</strong>{" "}
              {SUPPORT_URL ? (
                <a className="font-semibold text-brand-600 underline" href={SUPPORT_URL}>
                  Telegram qo&apos;llab-quvvatlash
                </a>
              ) : (
                "— (to'ldirilishi kerak)"
              )}
              {ISSUER.phone ? `, ${ISSUER.phone}` : ""}
            </li>
          </ul>
        </Section>

        <Section n="2" title="Xizmat predmeti">
          <p>
            Dental Map — stomatologiya shifokorlari va bemorlarni bog&apos;lovchi katalog va qabulga
            yozilish platformasi. Xizmat ko&apos;rsatuvchi shifokorga platformada profil yuritish,
            qabul so&apos;rovlarini qabul qilish va ish jadvalini boshqarish imkonini beradi.
          </p>
          <p>
            Xizmat ko&apos;rsatuvchi tibbiy yordam ko&apos;rsatmaydi va shifokor bilan bemor
            o&apos;rtasidagi davolash munosabatlarining tarafi emas. Tibbiy xizmat sifati, narxi va
            oqibatlari uchun javobgarlik shifokor va/yoki klinikaga tegishli.
          </p>
        </Section>

        <Section n="3" title="Obuna va to'lov">
          <p>
            Shifokor profili bemorlarga ko&apos;rinishi uchun faol obuna talab qilinadi. Obuna
            narxi{PRICE ? ` — ${PRICE}` : ""} va muddati <strong>{PERIOD_DAYS} kun</strong>.
            Amaldagi narx to&apos;lov sahifasida to&apos;lovdan oldin ko&apos;rsatiladi va shu narx
            hisoblanadi.
          </p>
          <p>
            To&apos;lov Payme to&apos;lov tizimi orqali amalga oshiriladi. Karta rekvizitlari
            to&apos;lov tizimi tomonida kiritiladi va Xizmat ko&apos;rsatuvchi serverlarida
            saqlanmaydi.
          </p>
          <p>
            To&apos;lov muvaffaqiyatli o&apos;tgach obuna darhol faollashadi va shifokor to&apos;lov
            tasdiqnomasini (chek) ilova ichida ko&apos;rishi va yuklab olishi mumkin.
          </p>
          <p className="rounded-card bg-surface-50 px-3.5 py-3">
            <strong className="block font-bold text-ink-900">Muhim</strong>
            To&apos;lov obunani faollashtiradi, lekin profil bemorlar ro&apos;yxatida
            ko&apos;rinishi uchun shifokor kamida bitta ish kuni jadvalini va klinika joylashuvini
            kiritishi shart. Bu shartlar bajarilmasa, to&apos;lov qilingan bo&apos;lsa ham profil
            nashr etilmaydi — sababi shifokor kabinetida ko&apos;rsatib turiladi.
          </p>
        </Section>

        <Section n="4" title="Avtomatik to'lov">
          <p>
            Shifokor xohishiga ko&apos;ra avtomatik to&apos;lovni yoqishi mumkin. Bunda obuna
            muddati tugashi bilan navbatdagi to&apos;lov saqlangan karta orqali avtomatik yechiladi.
          </p>
          <ul className="ml-4 list-disc space-y-1">
            <li>Avtomatik to&apos;lov faqat shifokorning ochiq roziligi bilan yoqiladi.</li>
            <li>
              Yechishdan oldin shifokorga Telegram orqali xabar yuboriladi: sana va summa
              ko&apos;rsatiladi.
            </li>
            <li>
              Avtomatik to&apos;lovni istalgan vaqtda, hech qanday sababni tushuntirmasdan bekor
              qilish mumkin — kabinetdagi bitta tugma bilan. Bekor qilish keyingi yechishlarni
              to&apos;xtatadi.
            </li>
            <li>
              Saqlangan karta ma&apos;lumoti to&apos;lov tizimi tomonida saqlanadi. Xizmat
              ko&apos;rsatuvchi karta raqamini ko&apos;rmaydi va saqlamaydi.
            </li>
          </ul>
        </Section>

        <Section n="5" title="Pul qaytarish va nosozliklar">
          <p>
            Bu bo&apos;lim to&apos;lov noto&apos;g&apos;ri o&apos;tgan holatlar uchun. Har bir
            holatda murojaat qilish uchun{" "}
            {SUPPORT_URL ? (
              <a className="font-semibold text-brand-600 underline" href={SUPPORT_URL}>
                qo&apos;llab-quvvatlash kanali
              </a>
            ) : (
              "qo'llab-quvvatlash kanali"
            )}{" "}
            ishlatiladi. Murojaatga <strong>3 (uch) ish kuni</strong> ichida javob beriladi.
          </p>
          <ul className="ml-4 list-disc space-y-1">
            <li>
              <strong>Ikki marta yechilgan bo&apos;lsa.</strong> Bir xil obuna davri uchun ikki
              marta pul yechilgani aniqlansa, ortiqcha summa to&apos;liq qaytariladi. Qaytarish
              to&apos;lov tizimi orqali, pul yechilgan kartaga amalga oshiriladi.
            </li>
            <li>
              <strong>Ruxsatsiz yechilgan bo&apos;lsa.</strong> Shifokor tasdiqlamagan yoki
              avtomatik to&apos;lov bekor qilingandan keyin amalga oshirilgan yechish
              noto&apos;g&apos;ri hisoblanadi va to&apos;liq qaytariladi.
            </li>
            <li>
              <strong>Xizmat ko&apos;rsatilmagan bo&apos;lsa.</strong> Pul yechilgan, lekin Xizmat
              ko&apos;rsatuvchi tomonidagi texnik nosozlik sababli obuna faollashmagan bo&apos;lsa,
              obuna qo&apos;lda faollashtiriladi yoki summa to&apos;liq qaytariladi — tanlov
              shifokorda.
            </li>
            <li>
              <strong>Xizmatdan foydalanilgan davr.</strong> Obuna faol bo&apos;lgan va profil
              bemorlarga ko&apos;rinib turgan davr uchun pul qaytarilmaydi. Foydalanilmagan
              to&apos;liq davr uchun qaytarish so&apos;rovi ko&apos;rib chiqiladi.
            </li>
          </ul>
          <p>
            Qaytarish qarori qabul qilingandan keyin summa to&apos;lov tizimi qoidalariga muvofiq,
            odatda <strong>10 (o&apos;n) ish kuni</strong> ichida kartaga qaytadi.
          </p>
        </Section>

        <Section n="6" title="Taraflarning majburiyatlari">
          <p>
            <strong>Xizmat ko&apos;rsatuvchi:</strong> platformaning ishlashini ta&apos;minlaydi,
            to&apos;lovni tasdiqlaydi, obunani faollashtiradi, chek beradi, ma&apos;lumotlarni{" "}
            <Link className="font-semibold text-brand-600 underline" href="/privacy">
              maxfiylik siyosati
            </Link>{" "}
            bo&apos;yicha himoya qiladi.
          </p>
          <p>
            <strong>Shifokor:</strong> haqiqiy va to&apos;g&apos;ri ma&apos;lumot kiritadi, tibbiy
            faoliyat uchun zarur ruxsatnomalarga ega bo&apos;ladi, qabul so&apos;rovlariga
            o&apos;z vaqtida javob beradi, jadvalini yangilab turadi.
          </p>
          <p>
            Noto&apos;g&apos;ri yoki yolg&apos;on ma&apos;lumot kiritilganda Xizmat ko&apos;rsatuvchi
            profilni nashrdan chiqarish yoki akkauntni to&apos;xtatish huquqini saqlaydi.
          </p>
        </Section>

        <Section n="7" title="Javobgarlik chegarasi">
          <p>
            Xizmat ko&apos;rsatuvchi tibbiy xizmat sifati, shifokor va bemor o&apos;rtasidagi
            kelishuv, hamda uchinchi taraf xizmatlari (to&apos;lov tizimi, Telegram, xarita
            provayderlari) ishidagi uzilishlar uchun javobgar emas.
          </p>
          <p>
            Xizmat ko&apos;rsatuvchining moliyaviy javobgarligi har qanday holatda shifokor
            to&apos;lagan oxirgi obuna summasidan oshmaydi.
          </p>
        </Section>

        <Section n="8" title="Ofertani o'zgartirish">
          <p>
            Xizmat ko&apos;rsatuvchi ofertaga o&apos;zgartirish kiritishi mumkin. O&apos;zgarish shu
            sahifada e&apos;lon qilinadi va e&apos;lon qilingan kundan kuchga kiradi. Narx yoki
            to&apos;lov shartlari o&apos;zgarsa, faol obunachilarga kamida <strong>7 kun</strong>{" "}
            oldin xabar beriladi va o&apos;zgarish faqat keyingi obuna davridan qo&apos;llanadi.
          </p>
        </Section>

        <Section n="9" title="Nizolarni hal qilish">
          <p>
            Nizolar avvalo muzokara yo&apos;li bilan hal qilinadi. Kelishuvga erishilmasa, nizo
            O&apos;zbekiston Respublikasi qonunchiligiga muvofiq sud tartibida ko&apos;rib chiqiladi.
          </p>
        </Section>

        <footer className="border-t border-surface-200 pt-4 text-sm">
          <Link className="font-semibold text-brand-600 underline" href="/privacy">
            Maxfiylik siyosati
          </Link>
        </footer>
      </article>
    </main>
  );
}
