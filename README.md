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
npm start
```

`npm run build` environment qiymatlarini tekshiradi, statik export yaratadi va
`out/_headers` hamda `out/nginx.conf` ichiga buildga mos CSP/hashlarni yozadi.
Productionda aynan `out/` artefaktini deploy qiling; source `public/_headers`
faqat fallback hisoblanadi.

`NEXT_PUBLIC_*` qiymatlar browser bundle ichida ochiq ko'rinadi. Ularga secret,
bot token yoki private webhook yozmang. Yandex browser API key ishlatilsa, uni
provider panelida sayt originlari bilan cheklang. Real bemor ma'lumotlarini
`NEXT_PUBLIC_LOCAL_MODE` demo rejimida ishlatmang.
S3/CDN media ishlatilsa `NEXT_PUBLIC_MEDIA_URL`ni public media base URLga qo'ying;
u CSP `img-src` originini ochadi va backenddagi `AWS_S3_CUSTOM_DOMAIN` bilan mos
bo'lishi kerak. Same-origin media uchun uni bo'sh qoldiring.

Compose runtime port `80` contractini saqlaydi, lekin filesystem read-only,
temporary Nginx kataloglari `tmpfs`, privilege escalation yopiq va Linux
capability'lari minimal ro'yxatga tushirilgan. To'liq non-root Nginxga o'tish
ichki portni `8080` qilishni va reverse-proxy service contractini birga yangilashni
talab qiladi.
