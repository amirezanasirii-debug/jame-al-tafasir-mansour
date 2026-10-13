# بیلد امضاشده و انتشار عمومی

این پروژه دو workflow دارد:

- `CI`: تست، ممیزی، بیلد وب آفلاین و ساخت APKهای Debug؛ این خروجی‌ها برای آزمون‌اند و نسخهٔ عمومی محسوب نمی‌شوند.
- `Signed release`: ساخت APKهای Release امضاشده، ساخت نصب‌کنندهٔ Windows با امضای Authenticode و انتشار فایل‌ها روی GitHub Release.

هیچ رمز، توکن، Keystore یا گواهی نباید در مخزن، فایل `.env`، APK یا EXE قرار گیرد. هر کلیدی که در چت، Issue، لاگ یا commit دیده شده است باید باطل و جایگزین شود.

## ۱. پیش‌نیاز انتشار عمومی

1. مخزن اصلی یا مخزن جداگانهٔ خروجی باید **Public** باشد؛ لینک فایل‌های Release یک مخزن Private برای عموم قابل استفاده نیست.
2. برای Android باید یک Keystore دائمی داشته باشید و تمام نسخه‌های بعدی را با همان کلید امضا کنید.
3. برای Windows باید گواهی Code Signing معتبر و مورد اعتماد Windows داشته باشید. امضای خودساخته هشدار SmartScreen را برطرف نمی‌کند.
4. الزامات ثبت و احراز هویت توسعه‌دهندهٔ Android را برای توزیع روی دستگاه‌های تأییدشده انجام دهید: <https://developer.android.com/developer-verification>

امضای معتبر احتمال هشدار را کم می‌کند، اما حذف کامل هشدار Play Protect یا SmartScreen قابل تضمین نیست؛ سابقهٔ ناشر، تعداد نصب، مسیر توزیع و تحلیل خودکار پلتفرم‌ها نیز مؤثرند.

## ۲. ساخت Keystore اندروید

این دستور را یک‌بار، روی رایانهٔ امن و خارج از پوشهٔ مخزن اجرا کنید:

```powershell
keytool -genkeypair -v `
  -keystore C:\Secure\JameMansour\release.jks `
  -alias jame `
  -keyalg RSA `
  -keysize 4096 `
  -validity 10000
```

از فایل و رمزها حداقل دو نسخهٔ پشتیبان رمزگذاری‌شده نگه دارید. گم‌شدن Keystore یعنی نسخه‌های جدید روی نصب فعلی کاربران قابل ارتقا نخواهند بود.

برای تبدیل فایل به Base64 در PowerShell، بدون چاپ مقدار روی صفحه:

```powershell
$bytes = [IO.File]::ReadAllBytes('C:\Secure\JameMansour\release.jks')
[Convert]::ToBase64String($bytes) | Set-Clipboard
Remove-Variable bytes
```

سپس در GitHub از مسیر `Settings > Secrets and variables > Actions` این Secretها را بسازید:

| Secret | مقدار |
| --- | --- |
| `KEYSTORE_BASE64` | متن Base64 که مستقیماً در فیلد Secret paste می‌شود |
| `KEYSTORE_PASSWORD` | رمز Keystore |
| `KEY_ALIAS` | برای دستور بالا: `jame` |
| `KEY_PASSWORD` | رمز کلید |

## ۳. گواهی امضای Windows

یک گواهی معتبر Code Signing از صادرکنندهٔ مورد اعتماد تهیه و در قالب PFX صادر کنید. اگر گواهی EV یا ابری قابل export نیست، باید از self-hosted runner امن یا اتصال رسمی همان صادرکننده استفاده شود؛ فایل کلید سخت‌افزاری را دور نزنید.

برای گواهی PFX قابل export:

```powershell
$bytes = [IO.File]::ReadAllBytes('C:\Secure\JameMansour\windows-signing.pfx')
[Convert]::ToBase64String($bytes) | Set-Clipboard
Remove-Variable bytes
```

Secretهای زیر را در GitHub بسازید:

| Secret | مقدار |
| --- | --- |
| `WINDOWS_CSC_BASE64` | متن Base64 گواهی PFX |
| `WINDOWS_CSC_PASSWORD` | رمز PFX |

workflow در صورت نبود Secret، امضای نامعتبر یا نبود خروجی عمداً Fail می‌شود. فایل PFX پس از پایان runner موقت از بین می‌رود و وارد Artifact نمی‌شود.

## ۴. اجرای بیلد

برای آزمون بدون انتشار، workflow `CI` را از تب Actions اجرا کنید. برای بیلد دستی امضاشده بدون ساخت Release، workflow `Signed release` را با `Run workflow` اجرا کنید؛ خروجی‌ها در Artifacts همان اجرا قرار می‌گیرند.

برای انتشار رسمی، نسخهٔ `package.json` و `android/build.gradle.kts` باید یکسان باشند. سپس:

```powershell
git switch main
git pull --ff-only
git tag -a v2.5.0 -m "Release 2.5.0"
git push origin v2.5.0
```

push شدن tag با الگوی `v*` باعث ساخت فایل‌های امضاشده، محاسبهٔ SHA-256 و ایجاد GitHub Release می‌شود.

## ۵. لینک‌های نصب

پس از موفقیت workflow و عمومی بودن مخزن:

```text
https://github.com/OWNER/REPOSITORY/releases/latest
```

الگوی لینک مستقیم هر فایل:

```text
https://github.com/OWNER/REPOSITORY/releases/download/v2.5.0/FILE_NAME
```

تا وقتی remote عمومی، tag و اجرای موفق Actions وجود نداشته باشد، لینک واقعی قابل ارائه نیست. از ساختن لینک حدسی یا معرفی Debug APK به‌عنوان نسخهٔ عمومی خودداری شود.

## ۶. کنترل نهایی قبل از انتشار

- تست `CI` سبز است و تست BLOCKED به‌عنوان PASS گزارش نشده است.
- SHA-256 دانلود با فایل `SHA256SUMS-*.txt` یکسان است.
- `apksigner verify --verbose --print-certs` برای هر APK موفق است.
- `Get-AuthenticodeSignature` برای نصب‌کنندهٔ Windows وضعیت `Valid` دارد.
- نصب ارتقایی Android روی نسخهٔ قبلی با همان package و همان Keystore آزموده شده است.
- Windows Defender، Play Protect و حداقل یک سرویس مستقل اسکن فایل بررسی شده‌اند.
- نصب و اجرای آفلاین روی Android 7، Android 11، Android 14 و یک نسخهٔ جدیدتر آزموده شده است.
