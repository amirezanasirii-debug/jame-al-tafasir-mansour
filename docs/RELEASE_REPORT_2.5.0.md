# گزارش انتشار ۲.۵.۰

تاریخ بیلد: ۲۰۲۶-۱۰-۱۴

## وضعیت کیفیت

- بیلد تولیدی Vite: موفق؛ ۱٬۵۸۸ ماژول و cache آفلاین ۳۷ فایل.
- آزمون‌های JavaScript/داده/امنیت: ۳۹ موفق، بدون شکست، یک آزمون دادهٔ
  المیزان عمداً skip است چون بستهٔ دارای منشأ و مجوز قابل‌بررسی در ریپو نیست.
- ممیزی `scripts/audit_source.py`: `PASS`.
- تست واحد Android و `lintDirectRelease`: موفق، بدون خطای lint.
- متن پایه: ۱۱۴ سوره و ۶٬۲۳۶ آیه، بدون placeholder و با متادیتای منبع کامل.
- Microsoft Defender: هر سه APK و نصب‌کنندهٔ Windows جداگانه اسکن شدند و
  تهدیدی پیدا نشد.

## خروجی‌های Android

هر سه خروجی با یک کلید پایدار RSA-4096 امضا شده‌اند. گواهی و کلید خصوصی داخل
Git نیستند. `apksigner` طرح‌های APK Signature Scheme v2 و v3 را برای هر سه
فایل تأیید کرده است.

گواهی امضا (SHA-256):
`3d22551f3d43124ba7e1987bb67c7511f47fbd38b8994a14bfbb46fa04f43b3e`

| فایل | اندازه (بایت) | SHA-256 |
|---|---:|---|
| `Jame-al-Tafasir-Mansour-2.5.0-Direct-Android-Release.apk` | 9,716,473 | `f10263a0099f46ad38feb1a92bf6aa57d5aff7910be3ad917bcb0f4b57d8b64d` |
| `Jame-al-Tafasir-Mansour-2.5.0-Myket-Android-Release.apk` | 9,716,469 | `9e9d55eb73333cb65a6455c7cd7bbbbac1e61b2acff32be0ff78017f08af06a8` |
| `Jame-al-Tafasir-Mansour-2.5.0-Play-Android-Release.apk` | 9,716,470 | `2dc052d0ac926687018c55277bdf97a7d1b78b1cd640658d16421b8cd3473b19` |

مشخصات مشترک: package `org.jamealtafasir.mobile`، versionCode `20500`،
versionName `2.5.0`، minSdk 24، targetSdk 37، cleartext غیرفعال. در Manifest
مجوز SMS، Accessibility، مدیریت کل حافظه یا نصب بسته درخواست نشده است.

## خروجی Windows

| فایل | اندازه (بایت) | SHA-256 | Authenticode |
|---|---:|---|---|
| `Jame-al-Tafasir-Mansour-2.5.0-Windows-Setup.exe` | 114,594,791 | `9fa46ef7517cca8be7581a384636db3d9f7be20d119bbbd441fc122caa175b16` | امضانشده |

Electron با `sandbox: true`، `contextIsolation: true`،
`nodeIntegration: false`، CSP محدود و جلوگیری از navigation/webview بسته‌بندی
شده است. نصب‌کنندهٔ محلی گواهی Authenticode تجاری ندارد؛ بنابراین نبود هشدار
SmartScreen قابل تضمین نیست. Workflow انتشار فقط پس از قراردادن گواهی معتبر در
GitHub Secrets، امضای Windows را می‌پذیرد و وضعیت `Valid` را اجباری می‌کند.

## نکات نگهداری کلید

کلید Android در پوشهٔ خصوصی خارج از ریپو ساخته شده است. برای انتشار تمام
به‌روزرسانی‌های آینده باید دقیقاً همین کلید استفاده و یک نسخهٔ پشتیبان امن از
آن نگهداری شود. گم‌شدن کلید یعنی نسخه‌های بعدی روی نصب فعلی قابل ارتقا نیستند.
