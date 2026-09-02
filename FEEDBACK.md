# Dental Map — buyurtmachi fikr-mulohazalari va ish qoidalari

Bu fayl bitta maqsad uchun: **loyiha egasi aytgan har bir narsa shu yerda turadi**,
va keyingi ish shundan boshlanadi. Yodda saqlashga tayanish — aynan shu sessiyada
bir necha marta ishni takrorlashga olib keldi.

Oxirgi yangilanish: 2026-yil 3-avgust

---

## 1. ISH QOIDALARI — bular buzilmasin

Bular loyiha egasi to'g'ridan-to'g'ri aytgan yoki xatolarim ustidan tuzatgan
qoidalar. Har birining yonida **nega** shu qoida paydo bo'lgani yozilgan, chunki
sababsiz qoida birinchi qiyinchilikda unutiladi.

### 1.1 Qulaysim va uysotol loyihalariga TEGMA

Serverda uchta loyiha yashaydi: `dental` (13 konteyner), `qulaysim` (8),
`uysotol` (3). Faqat dental'ga tegiladi.

Amalda bu nimani anglatadi:
- Docker kredensiallari **alohida** konfiguratsiyada: `/root/dental/.docker`.
  Umumiy `/root/.docker/config.json` **qulaysim akkauntiga** tegishli — u yerga
  yozish qulaysim'ni sindiradi. Har o'zgarishdan keyin md5 bilan tekshiriladi.
- `docker system prune -a` **hech qachon** — u uchala loyihaning eski image'larini,
  ya'ni rollback nishonlarini o'chiradi.
- `--volumes` bilan prune **hech qachon** — volume'lar bu ma'lumot.
- Reboot uchala loyihaga ta'sir qiladi → vaqtini egasi tanlaydi.

### 1.2 So'ralmagan narsani qo'shma

> «bunaqa narsa quy demagandim»

Telegram hisobi band bo'lganda sehrgar o'rniga panel qo'ygandim — so'ralmagan edi,
olib tashlandi. Muammoni hal qilish uchun eng kichik o'zgarishni qil, yangi ekran
o'ylab topma.

### 1.3 Brend ranglarini o'ldirma

> «nega ranglarni tuqlashtirib quyding»

Kontrast uchun teal→ko'k gradientni qoraytirgandim (`brand-700`). Bu noto'g'ri
savdo edi: **yorqin brendni saqlab, matnni qoraytirsa 6.13:1 chiqadi** — ya'ni
qoraytirilgan variantdan ham yaxshi o'qiladi.

Qoida: kontrast muammosi rangni o'ldirish uchun sabab emas. Avval matn rangini
o'zgartirib ko'r.

### 1.4 Kodga qarab «chiroyli» dema — brauzerda ko'r

Dizayn ishini skrinshot olmasdan «tayyor» deb aytganimda, ekranda to'rtta oq
plita ustma-ust turgan, inputlar fon bilan bir xil rangda (1.00:1, ya'ni
**ko'rinmas**), va butun sahifa 98px chapga surilgan edi.

Qoida: har bir dizayn o'zgarishi **390x844 va 360x800 da, yorug' va qorong'i
rejimda** render qilinadi va rasm ochib ko'riladi.

### 1.5 To'liq test suite'ni yugurtir

Butun sessiya davomida `pytest tests/` qilardim — **374** test. CI esa oddiy
`pytest` qiladi va `apps/bookings/tests.py`, `apps/reviews/tests.py` ni ham oladi
— **392** test. Farqdagi test bir marta yiqildi va buni **CI topdi, men emas**.

Qoida: `pytest` (prefikssiz). Frontendda: `lint` + `typecheck` + `test` +
`build` + `security:budget` + `test:e2e` + `test:e2e:otp`.

### 1.6 Test bo'sh emasligini isbotla

Bu sessiyada **kamida to'rt marta** testim noto'g'ri sababdan o'tgan:
- SSRF qorovuli: host DNS'da yo'q edi → test o'tdi, qorovul sinалmadi
- SSRF qorovuli (2-urinish): host redirect qilmasdi → yana o'tdi
- N+1 qorovuli: FastAPI TestClient marshrutni boshqa threadda yugurtiradi, ya'ni
  so'rovlar sanoqqa umuman tushmasdi
- Dublikat telefon: xato `validate()` da ushlanardi, test esa `create()` yo'lini
  sinamoqchi edi

Qoida: **mutatsiya**. Qorovulni o'chir, test yiqilishini ko'r, keyin qaytar.
Yiqilmasa — test yolg'on gapiryapti.

### 1.7 Sirlarni chatga yozdirma

Sessiya davomida chatga yozilgan va shu sababli **kuygan** hisoblanadigan sirlar:
Payme production va test kalitlari, ikkita GitHub PAT. Har safar ogohlantirilgan.

Qoida: sir kerak bo'lsa — `!` bilan terminaldan, `read -s` orqali kiritish
buyrug'ini ber. Hech qachon «menga yubor» dema.

### 1.8 Deploy tekshiruvi SHA bo'yicha

CI natijasini «oxirgi yugurish» bo'yicha o'qigandim. Push'dan keyin yangi
yugurish ro'yxatga chiqmagan bo'lsa, u **oldingisini** o'qib «success» derdi —
bir marta shu sababli mavjud bo'lmagan image'ni tortmoqchi bo'ldim.

Qoida: `gh run list --json headSha` bilan **commit SHA'si bo'yicha** kutiladi.

### 1.9 Agentlar

Egasi bir necha marta «agentlar bilan qil» dedi. Lekin workflow **uch marta**
yiqildi (`ENOTFOUND`, agent qotib qolishi). Yiqilganda uchinchi marta kutish
o'rniga qo'lda davom etish tezroq chiqdi.

Qoida: workflow ishga tushir, lekin u yiqilsa kutib o'tirma — natijasi kelgan
scoutlarning ma'lumotini ol va qo'lda davom et.

---

## 2. QILINGAN ISHLAR

Hammasi serverda ishlayapti.

### 2.1 Infratuzilma va CI

| Nima | Holat |
|---|---|
| Uchala repoda CI (`dental-back`, `dental-bot`, `dental-map`) | Yashil, GHCR image quradi |
| Server tuzatildi (Caddy 502) | `reverse_proxy` `api` → `dental-api-1` |
| Uchala servis CI image'idan ishlaydi | Kod serverga tushmaydi |
| Reboot | Yadro 6.8.0-134 → 136, eski `libc` ushlagan 176 jarayon → 0 |
| E2e ikkala konfiguratsiyada | `test:e2e` (OTP o'chiq = production) + `test:e2e:otp` |

### 2.2 To'lov

| Nima | Holat |
|---|---|
| Payme production | Live, kassa `6a591544e3d68189d325adde` |
| Narx adminkadan | `BillingSettings` = 1000 so'm |
| **Haqiqiy karta bilan to'lov** | ✅ O'tdi — tranzaksiya `6a6d30bb81de1bb922f00d05` |
| Webhook xavfsizligi | Imzosizni `-32504` bilan rad etadi |
| Karta o'tkazmasi bloki | Faol karta bo'lmasa ko'rinmaydi |
| Online chek | Qurildi, dizayn qilindi, logotip bilan |
| Chek ilova ichida sahifa | Tashqi brauzerga chiqmaydi |

### 2.3 Ro'yxatdan o'tish

| Nima | Holat |
|---|---|
| Shifokor: qadamli sehrgar | 7 panel |
| Bemor: qadamli sehrgar | 3 panel (tuman olib tashlandi) |
| Sehrgarda chrome yo'qoladi | Bitta «Chiqish» tugmasi qoladi |
| Qadam indikatori | Segmentli, har qadamga bitta |
| OTP (eSKIZ) | Kod tayyor, **o'chiq** — `OTP_ROLLOUT_PENDING=True` |
| Taksonomiya | 7 yo'nalish + 8 xizmat seed qilindi |
| Xarita havolasi | Google «Share» qisqa havolasi endi ishlaydi |

### 2.4 Dizayn tizimi

| Nima | Oldin | Keyin |
|---|---|---|
| Radiuslar | 5 xil, 108 ta shkaladan tashqari | **0** |
| Ixtiyoriy matn o'lchamlari | 8 xil | **0** |
| Fokus retseptlari | 6 xil | 1 (uch pseudo-klassda) |
| Control chegarasi | 2 standart | 1 |
| Input foni | 1.05:1 (ya'ni yo'q) | Haqiqiy fon |
| `ink-400` matn sifatida | 46 joy | Hint darajasi `ink-500` ga |
| Sheet qatorlari | 1.00:1 (ko'rinmas) | Ko'rinadi |
| Qorong'i soya | O'lik CSS | `.dark .shadow-card` bilan tirik |
| Bo'sh joy | Hammasi 16px | 4 daraja ritm |

### 2.5 H6 qoidalari

- To'lovsiz shifokor ko'rinmaydi (`DOCTOR_SUBSCRIPTION_REQUIRED=True`)
- Ish kuni bo'lmasa nashr etilmaydi (`publication_blockers`)
- Kunlik Telegram eslatmasi beat'da faol

### 2.6 Huquqiy hujjatlar

- **Ommaviy oferta** — https://dental.77.37.54.14.sslip.io/oferta va Word fayl
- **Loyiha holati** — Payme'ning «ishlab turgan proyekt» talabiga javob
- Ikkalasi bir matndan yasalgan (bir-biriga zid bo'lmasligi uchun)

---

## 3. TUZATILGAN XATOLAR

Egasi topgan yoki men yo'lda topganlar. Har biri testga bog'langan.

| Xato | Sabab |
|---|---|
| «Bu telefon raqam ro'yxatdan o'tgan» — bo'sh raqamga | `telegram_id` unikal cheklovi buzilardi, kod esa **telefonni** ayblardi |
| Shifokor umuman ro'yxatdan o'tolmasdi | 1-qadam hech qachon yuborilmaydigan SMS uchun rozilik talab qilardi |
| Butun sahifa 98px chapga surilgan | `lg` o'lchamiga `w-full` qotirilgan → ikkita tugma 200% kenglik so'rardi |
| Qorong'ida asosiy tugma o'qilmasdi | `text-ink-900` qorong'ida oqqa aylanadi, gradient esa aylanmaydi |
| Logotip qorong'ida oq kvadrat | Opaque PNG, ichida ~170px oq hoshiya, `scale-[1.55]` bilan yashirilgan |
| «Share link yuboring» — lekin u hech qachon o'tmasdi | Qisqa havolada koordinata yo'q, validator esa talab qilardi |
| Admin har shifokorning chekiga havola olardi | `payment_payload` shartsiz `receipt_url` yasardi |
| Chekda inglizcha `manual` | Usul yorlig'i xom DB kalitiga tushardi |
| SMS qayta yuborish 120 soniya kutdirardi | Kutish olib tashlandi; xarajat va abuse himoyasi soatlik/IP limitlarda qoldi |
| Xalqaro raqamlarga SMS | Global telefon shabloni, mamlakat cheklovi yo'q |
| Staging'da jimgina tupik | Kod yuborilmasa ham «yuborildi» derdi |
| Ikkita bir xil tugma | Telegram MainButton ilovaning tugmasini takrorlardi |

---

## 4. KUTAYOTGANLAR — egasidan javob kerak

| # | Nima | Kimdan |
|---|---|---|
| 1 | **Payme Subscribe kaliti** | Payme'dan. Usiz ilova ichida karta to'lovi ham, oylik avtomatik yechish ham qurilmaydi |
| 2 | **Avtomatik to'lov yoqilganmi?** | Payme'dan. `recurrent` bayrog'i shunga bog'liq |
| 3 | **Token muddati qancha?** | Payme'dan. Hujjatda yozilmagan |
| 4 | **eSKIZ ma'lumotlari** | OTP kodi tayyor, faqat sozlama kerak |
| 5 | **Tashkilot rekvizitlari** | Nomi, STIR, manzil — ommaviy oferta va chek uchun |
| 6 | **GitHub tokenini almashtirish** | Chatda qoldi. Keyin `dental-map` paketi private qilinadi (**hozir ochiq**) |
| 7 | **Payme kalitlarini almashtirish** | Chatda qoldi |

---

## 5. QOLGAN ISH

### 5.1 Kalit kelishi bilan

- Ilova ichida karta to'lovi (`cards.create` client-side — karta raqami serverga tegmaydi)
- Oylik avtomatik yechish + yechishdan oldin Telegram ogohlantirish + imtiyoz muddati
- OTP ni yoqish

### 5.2 Ko'rilmagan ekranlar

Bu sessiyada faqat **ro'yxatdan o'tish** va **chek** ko'z bilan tekshirildi.
Qolganlari hech qachon skrinshot qilinmagan:

Xarita · Bosh sahifa · Shifokorlar ro'yxati · Shifokor sahifasi · Qabulga
yozilish · Mening qabullarim · Qabul tafsiloti · Bildirishnomalar · Profil ·
Taklif/shikoyat · Shifokor kabineti · Klinikalar · Xizmatlar · Saqlanganlar ·
Baholash oynasi · Kirish · Adminka

### 5.3 Chiqarilmagan o'zgarishlar

Commit qilingan, deploy **to'xtatilgan** (egasi so'ragan):

- Bemor sehrgari 4 → 3 qadam (tuman olib tashlandi)
- Telegram MainButton yashirildi (takroriy tugma)
- `requestFullscreen()` — Telegram sarlavhasini olib tashlaydi

---

## 6. BILINISHI KERAK BO'LGAN NARSALAR

### 6.1 Nega ilova ba'zan ochilmaydi

Bot **eski xabarlaridagi** tugma eski server IP'siga ishora qiladi
(`168.231.125.251` — o'lik). Telegram inline tugmaga URL'ni yuborilgan paytda
muhrlaydi va u abadiy o'zgarmaydi.

Bizning tomonda hamma narsa to'g'ri: bot kodida qotirilgan URL yo'q, serverdagi
sozlama to'g'ri, Telegram menyu tugmasi to'g'ri.

**Yechim:** eski xabarni bosmaslik. `/start` yoki menyu tugmasi.

### 6.2 sslip.io domeni

Hozirgi manzil — `dental.77.37.54.14.sslip.io`. Bu haqiqiy domen emas, IP'ning
DNS ko'rinishi. Ba'zi operatorlar `sslip.io` ni bloklashi mumkin.

Haqiqiy domen olinsa (masalan `dentalmap.uz`): Caddy sertifikatni o'zi oladi,
CI'dagi `NEXT_PUBLIC_API_URL` va BotFather manzili yangilanadi.

### 6.3 Server

| | |
|---|---|
| IP | `77.37.54.14` |
| SSH | `ssh dental-production` |
| Katalog | `/root/dental/` (sudo) |
| Adminka | `/dm-panel-f45278/` |
| Rollback | Har deploy skripti oxirida buyruq chop etadi |
| DB zaxira | Har deploy oldidan, `/root/dental/backups/pre-deploy/` |
