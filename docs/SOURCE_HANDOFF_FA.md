# راهنمای تحویل و ارتقای سورس جامع‌التفاسیر منصور

این سند مربوط به نسخهٔ `2.7.0` و Commit مبنا
`51d68744db576c3f2d7df8818d59c730ab02b160` است. برای ارتقا همیشه یک شاخهٔ جدید
از Commit پایدار بسازید و نسخهٔ منتشرشده را مستقیماً ویرایش نکنید.

## معماری واقعی پروژه

- رابط مشترک: React 19 + Vite 6، فارسی و RTL.
- Android: یک Activity جاوا و WebView امن که فایل‌های تولیدشدهٔ `dist/` را از
  داخل APK اجرا می‌کند.
- Windows: Electron با `contextIsolation` و `sandbox` و محتوای محلی.
- دادهٔ کاربر: `localStorage` با خروجی/ورودی JSON نسخه‌دار.
- دادهٔ پژوهشی: فایل‌های JSON قطعه‌بندی‌شده و فقط‌خواندنی؛ بستهٔ کامل از Git
  جداست و با اسکریپت دارای کنترل SHA-256 بازیابی می‌شود.

این نسخه Compose، Room یا Navigation Compose نیست. مهاجرت به آن‌ها یک بازنویسی
معماری محسوب می‌شود و نباید به‌عنوان تغییر کوچک روی همین شاخه انجام شود.

## نقشهٔ مهم فایل‌ها

| مسیر | مسئولیت |
|---|---|
| `src/App.jsx` | پوستهٔ برنامه، ناوبری و اتصال صفحات |
| `src/style.css` | سیستم ظاهر شیشه‌ای، RTL، تم و واکنش‌گرایی |
| `src/verseSearch.js` و `src/indexer.js` | نرمال‌سازی و جست‌وجوی آیات |
| `src/TafsirLibrary.jsx` و `src/VerseTafsir.jsx` | کتابخانه و نمایش تفسیر آیه‌محور |
| `src/RelatedHadith.jsx` | روایات مرتبط |
| `src/Similarity.jsx` | مشابه‌یاب آیات |
| `src/Vocabulary.jsx` | واژه‌نامه |
| `src/Notes.jsx` و `src/userBackup.js` | یادداشت، نشان و پشتیبان محلی |
| `src/MinshawiPlayer.jsx` | پلیر صوت آفلاین |
| `desktop/main.cjs` | پوسته و سیاست امنیتی Electron |
| `android/src/main/java/.../MainActivity.java` | WebView، فایل‌های محلی و پخش Range صوت |
| `android/build.gradle.kts` | نسخه، Flavorها، R8 و امضای Android |
| `package.json` | نسخه، فرمان‌ها و تنظیمات بسته‌بندی Windows |
| `scripts/restore-offline-data.py` | دریافت، کنترل هش و استخراج دیتای کامل |
| `scripts/build-android.py` | Build، امضا، کنترل APK و ساخت خروجی |
| `.github/workflows/ci.yml` | تست و Build رابط در GitHub |
| `.github/workflows/release.yml` | Build انتشار Android و Windows |

## بازیابی سورس و دیتای کامل

پیش‌نیازها: Git، Python 3.11 یا جدیدتر، Node.js 24، pnpm 11، JDK 17 و Android
SDK/Build Tools 36.

```powershell
git clone https://github.com/amirezanasirii-debug/jame-al-tafasir-mansour.git
cd jame-al-tafasir-mansour
git switch rebuild/v2.4-offline
python scripts/restore-offline-data.py
pnpm install --frozen-lockfile
pnpm test
pnpm run build
```

اسکریپت بازیابی، بستهٔ `offline-data-2026.10.15` را دانلود می‌کند و قبل از
استخراج، SHA-256 آن را با مقدار ثابت داخل اسکریپت تطبیق می‌دهد. پوشه‌های سنگین
دیتا عمداً در `.gitignore` هستند و نباید به تاریخچهٔ Git افزوده شوند.

## اجرای توسعه

```powershell
pnpm dev
```

برای شبیه‌سازی نسخهٔ Production محلی:

```powershell
pnpm run build
pnpm start
```

## ساخت Windows

```powershell
pnpm run package:windows
```

خروجی در `release/` قرار می‌گیرد. امضای Authenticode اختیاری است؛ بدون گواهی
معتبر ممکن است SmartScreen برای فایل جدید هشدار نشان دهد.

## ساخت Android

مقادیر نسخه را در هر دو فایل زیر هماهنگ نگه دارید:

1. `package.json` → مقدار `version`
2. `android/build.gradle.kts` → مقادیر `versionCode` و `versionName`

کلید و رمز هرگز نباید داخل سورس یا ZIP قرار گیرند. برای Release متغیرهای زیر را
فقط در محیط امن یا GitHub Secrets تنظیم کنید:

```text
JAME_KEYSTORE_PATH
JAME_KEYSTORE_PASSWORD
JAME_KEY_ALIAS
JAME_KEY_PASSWORD
```

سپس:

```powershell
pnpm run package:android
```

خروجی مستقیم در `release/` قرار می‌گیرد. گواهی رسمی نسخهٔ فعلی دارای SHA-256
زیر است و نسخه‌های بعدی باید با همین کلید امضا شوند تا ارتقای نصب‌شده ممکن باشد:

```text
ECDE148BD8AD34BE6148731C888228920772364AB79FA8DE24046C8BAB706D73
```

راهنمای کامل‌تر در `docs/ANDROID_BUILD.md` است.

## روال پیشنهادی ارتقا

```powershell
git switch rebuild/v2.4-offline
git pull --ff-only
git switch -c feat/نام-قابلیت
```

بعد از هر تغییر:

```powershell
pnpm test
pnpm run build
git status
git add مسیرهای-مرتبط
git commit -m "feat: توضیح کوتاه تغییر"
```

برای رفع اشکال از پیشوند `fix:`، برای دیتا `data:`، برای ظاهر `ui:` و برای
امنیت `security:` استفاده کنید. هر Commit فقط یک تغییر منطقی داشته باشد.

## خطوط قرمز برای جلوگیری از خرابی

- نص قرآن، ترجمه و تفسیر را دستی اصلاح نکنید؛ تغییر محتوا فقط با منبع، نسخه و
  گزارش اعتبارسنجی انجام شود.
- `applicationId` اندروید (`org.jamealtafasir.mobile`) و گواهی امضا را تغییر
  ندهید؛ در غیر این صورت نسخهٔ جدید روی نسخهٔ قبلی نصب نمی‌شود.
- داده‌های کاربر را با پاک‌کردن کلیدهای `localStorage` یا تغییر بدون Migration
  از بین نبرید.
- فایل‌های `*.jks`، رمزها، توکن‌ها، `.env`، `node_modules`، `dist`، `release`
  و بسته‌های بزرگ محتوا را Commit نکنید.
- قبل از انتشار، مجوز و انتساب منابع را در `docs/DATA_SOURCES.md` و
  `docs/LICENSES.md` به‌روز کنید.
- APK را با `apksigner verify --verbose --print-certs` و هش فایل‌ها را با
  `Get-FileHash -Algorithm SHA256` کنترل کنید.

## خروجی‌های عمومی مرتبط

- Release نصب: `v2.7.0`
- بستهٔ داده: `offline-data-2026.10.15`
- شاخهٔ سورس پایدار: `rebuild/v2.4-offline`

فایل سورس شامل Keystore، رمز، توکن، `node_modules`، Cacheهای Gradle، فایل نصب و
دیتای سنگین نیست. این موارد یا باید با اسکریپت بازیابی شوند یا در محیط امن توسعه
نگه‌داری شوند.
