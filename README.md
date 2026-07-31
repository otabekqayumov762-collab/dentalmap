# dentalmap

Dental Map uchun Next.js mini ilova frontendi.

## Lokal ishga tushirish

```bash
cp .env.example .env.local
npm ci
npm run dev
```

Brauzerda `http://127.0.0.1:3000` manzilini oching.

## Tekshiruv va production build

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run security:bundle
npm run security:budget
npm run test:e2e
npm start
```

`npm run test:e2e` o'zi `build:e2e` ni chaqiradi. Buning sababi: e2e testlar
`https://api.dental.example` va `https://billing.dental.example` originlarini
`page.route()` bilan mocklaydi, Playwright esa faqat **bundle haqiqatda
chaqiradigan** originni ushlab qoladi. Shuning uchun e2e build shu originlarga
pin qilingan — aks holda so'rovlar real API'ga ketadi, mocklar ishlamaydi va
testlar kodga aloqasi yo'q sabab bilan yiqiladi. Tayyor `out/` bo'lsa
`npm run test:e2e:no-build` bilan qayta build qilmasdan ishlatish mumkin.

`npm run security:budget` — birinchi paint budjeti. `components/DentalMapApp.tsx`
hamma view'ni bitta joyda render qiladi, shuning uchun bitta oddiy `import`
og'ir view'ni critical path'ga qaytarib qo'yadi. Yangi og'ir view
`src/dental-map/views/lazyViews.tsx` orqali `next/dynamic` bilan qo'shiladi.

`npm run build` environment qiymatlarini tekshiradi, statik export yaratadi va
buildga mos CSP/hashli Nginx konfiguratsiyasini private `generated/nginx.conf`
ichiga yozadi. Nginx konfiguratsiyasi va `_headers` public `out/` katalogiga
hech qachon qo'yilmaydi. Productionda Docker image orqali `out/` bilan
`generated/nginx.conf`ni birga deploy qiling.

`NEXT_PUBLIC_*` qiymatlar browser bundle ichida ochiq ko'rinadi. Ularga secret,
bot token yoki private webhook yozmang. Yandex browser API key ishlatilsa, uni
provider panelida sayt originlari bilan cheklang. Real bemor ma'lumotlarini
`NEXT_PUBLIC_LOCAL_MODE` demo rejimida ishlatmang.
S3/CDN media ishlatilsa `NEXT_PUBLIC_MEDIA_URL`ni public media base URLga qo'ying;
u CSP `img-src` originini ochadi va backenddagi `AWS_S3_CUSTOM_DOMAIN` bilan mos
bo'lishi kerak. Same-origin media uchun uni bo'sh qoldiring.

Majburiy production qiymatlari:

- `NEXT_PUBLIC_SUPPORT_URL` — biznesga tegishli haqiqiy support Telegram URL.
- `NEXT_PUBLIC_PAYME_CHECKOUT_HOSTS` — vergul bilan ajratilgan aniq HTTPS Payme
  hostlari; wildcard va host suffixlari qabul qilinmaydi.
- `NEXT_PUBLIC_AUTH_TOKEN_MODE=cookie` — refresh token faqat backend o'rnatadigan
  `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/` cookie ichida saqlanadi. Frontend
  CSRF endpointi va `credentials: include` bilan ishlaydi. `legacy-session` faqat
  favqulodda migratsiya uchun `ALLOW_LEGACY_SESSION_AUTH=true` bilan ochiladi.

Backend CORS `Access-Control-Allow-Credentials: true` va aniq frontend originini
qaytarishi, auth mutationlari esa CSRF headerini tekshirishi shart. Payme hosted
checkout URLi faqat yuqoridagi exact-host allowlistdan ochiladi; qaytish URLiga
Telegram query/hash credentiallari ko'chirilmaydi.

Auth javob contracti: login/register/Telegram auth
`{user, tokens: {access}}`, refresh `{access}`, logout `204`. Refresh token JSON
javob yoki browser storage ichiga chiqmaydi. Chrome E2E testlari uchun lokalda
Google Chrome o'rnatilgan bo'lishi kerak (`npx playwright install chrome`).

Compose/Nginx to'liq non-root UID/GID 101 bilan ichki `8080` portda ishlaydi,
filesystem read-only, temporary kataloglar `tmpfs`, privilege escalation va
Linux capability'lari o'chirilgan. Reverse proxy upstreamini `8080`ga yo'naltiring.
