# لندینگ پاسخ‌بان

صفحه‌ی فرود فارسی و راست‌چین برای افزونه‌ی «پاسخ‌بان» (چت هوشمند و پشتیبانی آنلاین وردپرس)؛ با React، Vite،
TypeScript و پس‌زمینه‌ی سه‌بعدی Three.js، بر پایه‌ی ساختار، سیستم طراحی و روش ساخت لندینگ آوند.

- **نسخه‌ی لندینگ:** 1.0.0 (`package.json`)
- **نسخه‌ی افزونه:** 3.2.5. از خود افزونه خوانده شده: هدر `Version` در `pasokhban.php`، ثابت `PASOKHBAN_VERSION` و
  `Stable tag` در بسته‌ی `pasokhban.3.2.5.zip`. طبق چک‌لیست `product-landing/README.md` روی صفحه نمایش داده نمی‌شود
  (`SHOW_PLUGIN_VERSION = false` در `src/data/content.ts`).

## تحویلی: فقط این را آپلود کنید

`downloads/pasokhban-landing-1.0.0.zip`

محتویات zip (فایل `index.html`، پوشه‌ی `assets/` و فایل‌های عمومی مثل `pasokhban-mark.svg`، `og-cover.png` و
`licenses/`) را در هر پوشه‌ای از هاست آپلود کنید. نشانی‌ها نسبی‌اند، پس صفحه در زیرپوشه هم کار می‌کند. با دوبار کلیک
روی `index.html` (حالت `file://`) هم باز می‌شود.

> **هشدار:** فایل‌های سورس مخزن (`src/`، `package.json` و `index.html` ریشه‌ی مخزن) را آپلود نکنید. `index.html` ریشه‌ی
> مخزن ورودی Vite است و بدون بیلد اجرا نمی‌شود. اگر اشتباهاً آپلود شود، به‌جای صفحه‌ی سفید پیام راهنمای فارسی نشان
> می‌دهد.

## ویرایش محتوا

همه‌ی متن‌ها و مقادیر قابل تنظیم در یک فایل است: `src/data/content.ts`. هر مقدار تأییدنشده با `PLACEHOLDER`
علامت خورده است.

| مقدار | وضعیت فعلی | اثر |
| --- | --- | --- |
| `PURCHASE_URL` | خالی | همه‌ی دکمه‌های خرید به بخش قیمت‌ها اسکرول می‌کنند و متنشان «مشاهده‌ی قیمت‌ها» است. با پرکردن آن، همه‌ی دکمه‌ها به همان نشانی می‌روند و کارت‌های قیمت دکمه‌ی خرید می‌گیرند. |
| `PRICING_CONFIRMED` | `false` | هشدار «قیمت‌ها نهایی نشده‌اند» و برچسب «قیمت نمونه» نمایش داده می‌شود. |
| `LICENSE_TIERS` | نمونه | نام سطح‌ها، تعداد سایت و قیمت‌های تومان و دلار همه نمونه‌اند. |
| `GUIDE_URL`، `DOCS_URL` | خالی | لینک‌های راهنما و مستندات به بخش‌های همین صفحه برمی‌گردند. |
| `SITE_URL` | خالی | بعد از تعیین دامنه، `canonical` و نشانی کامل `og:image` ساخته می‌شود. |
| `ROI_DEFAULTS` | نمونه | پیش‌فرض‌های محاسبه‌گر (۶۰۰ گفتگو، ۴۰٪، ۴ دقیقه، ۲۰۰٬۰۰۰ تومان) آمار نیستند. |
| `ROADMAP.next.items` | خالی | تا اعلام رسمی، ستون «برنامه‌ی نسخه‌های بعد» پیام «اعلام نشده» نشان می‌دهد. |
| `SHOW_PLUGIN_VERSION` | `false` | با `true`، نسخه‌ی ۳.۲.۵ در هدر، فوتر و نقشه‌ی راه نمایش داده می‌شود. |

عنوان، توضیحات، Open Graph و JSON-LD صفحه هم هنگام بیلد از همین فایل ساخته می‌شوند (`vite.config.ts`).

## دستورها

```bash
npm install
npm run dev               # سرور توسعه روی 0.0.0.0:5173
npm run build             # بیلد معمولی در dist/ (اسکریپت ماژولی؛ فقط روی سرور HTTP)
npm run build:standalone  # بیلد مستقل در dist-standalone/ (یک <script defer> کلاسیک؛ file:// و HTTP)
npm run package           # بیلد مستقل + ساخت downloads/pasokhban-landing-<version>.zip
npm run qa                # QA با Chrome بدون سر؛ نیاز به CHROME_PATH
```

QA (`scripts/qa.mjs`) مرورگر را بدون `--disable-web-security` اجرا می‌کند و این موارد را می‌سنجد:

- باز شدن نسخه‌ی مستقل با `file://` و با سرور HTTP در زیرپوشه؛
- بارگذاری قلم وزیرمتن و نبود خطای کنسول؛
- نبود سرریز افقی یا عنصر بریده‌شده در عرض‌های ۳۹۰، ۱۲۸۰ و ۱۴۴۰؛
- چسبان ماندن هدر و دیده‌شدن همه‌ی بخش‌ها در هر دو تم؛
- کاهش حرکت؛ بدون WebGL که فقط لوگوی ثابت می‌ماند؛
- کف ۱۳ پیکسلی متن و هدف‌های لمسی ۴۴ پیکسلی؛
- axe-core در سطح WCAG 2.1 AA؛
- اتصال همه‌ی دکمه‌های خرید به `PURCHASE_URL`؛
- برچسب دموها و رفتار فرم‌ها؛
- نبود `download`، `.zip` و نام‌های ممنوع در `src` و خروجی.

```bash
CHROME_PATH=/path/to/chrome npm run qa   # گزارش در qa-output/report.json
CHROME_PATH=/path/to/chrome node scripts/render-images.mjs   # ساخت دوباره‌ی og-cover.png و apple-touch-icon.png
```

## ساختار

```
src/data/content.ts        همه‌ی متن‌ها و ثابت‌ها (تنها منبع محتوا)
src/components/            ۱۴ بخش صفحه، هدر، فوتر، SiteScene (پس‌زمینه‌ی سه‌بعدی)، HeroCore3D (هسته‌ی سه‌بعدی هیرو)
src/hooks/                 useSectionReveal، useTilt (اقتباس از آوند)، useActiveSection، تب‌ها
src/styles/global.css      سیستم طراحی (توکن‌ها، تم روشن و تیره، واکنش‌گرایی)
design-system/pasokhban/   MASTER.md؛ مرجع طراحی
scripts/                   standalone-html.mjs، package-zip.mjs، qa.mjs، render-images.mjs
public/                    نشان پاسخ‌بان، og-cover.png، apple-touch-icon.png، مجوز قلم‌ها
downloads/                 zip آماده‌ی آپلود
product-landing/           لندینگ ایستای قبلی؛ فقط منبع محتوا (بدون تغییر)
```

## منابع محتوا

- `product-landing/index.html`، `product-landing/guide.html` و `product-landing/README.md` در همین مخزن؛
- `AUDIT-AND-REDESIGN.md`؛
- برای تطبیق ادعاها: کد و `readme.txt` بسته‌ی افزونه‌ی ۳.۲.۵ (مخزن `Masoumiofficial/pasokhban`)، از جمله:
  - پنج سرویس‌دهنده‌ی هوش مصنوعی؛
  - ۳۷ بررسی سلامت در ۸ گروه؛
  - قفل یک‌ساعته پس از ۶ تلاش ناموفق استعلام سفارش؛
  - فهرست سفید آپلود و منع SVG؛
  - پیامک با کاوه‌نگار، ملی‌پیامک و SMS.ir.
