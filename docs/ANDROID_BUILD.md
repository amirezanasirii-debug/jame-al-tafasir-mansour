# ساخت Android

پروژهٔ Android با Gradle Kotlin DSL ساخته می‌شود و محتوای تولیدشدهٔ Vite از پوشهٔ `dist/` را داخل APK قرار می‌دهد. نمایش محتوا در زمان مطالعه به شبکه وابسته نیست.

## نسخه‌های ابزار

- Android Gradle Plugin: 9.4.0
- Gradle Wrapper: 9.6.0
- Java: 17
- compileSdk / targetSdk: 37
- minSdk: 24

## گونه‌های انتشار

| Flavor | کانال | به‌روزرسانی مستقیم | کاربرد |
| --- | --- | --- | --- |
| `direct` | انتشار مستقیم | آماده برای پیاده‌سازی در فاز بعد | وب‌سایت یا GitHub Releases عمومی |
| `myket` | مایکت | خاموش | انتشار در مایکت |
| `play` | Google Play | خاموش | انتشار در Google Play |

در این فاز هیچ مجوز `REQUEST_INSTALL_PACKAGES` و هیچ کد نصب APK اضافه نشده است. این جداسازی مانع ورود ناخواستهٔ قابلیت نصب مستقیم به نسخه‌های فروشگاهی می‌شود.

## پیش‌نیازها

1. JDK 17 در `JAVA_HOME`.
2. Android SDK 36 و Build Tools 36 در `ANDROID_HOME`.
3. Node.js و `pnpm` برای ساخت رابط.

ساخت Debug هر سه کانال:

```powershell
pnpm run package:android:debug
```

ساخت Release مستقیم:

```powershell
pnpm run package:android
```

اگر دسترسی مستقیم به Google Maven ممکن نبود، آینه را فقط برای همان اجرا تعیین کنید:

```powershell
$env:JAME_GOOGLE_MAVEN_MIRROR = 'https://maven.aliyun.com/repository/google'
pnpm run package:android:debug
```

## امضای Release

کلید و رمزها نباید در مخزن قرار بگیرند. چهار متغیر زیر را در محیط محلی یا GitHub Secrets تعریف کنید:

```text
JAME_KEYSTORE_PATH
JAME_KEYSTORE_PASSWORD
JAME_KEY_ALIAS
JAME_KEY_PASSWORD
```

برای سازگاری با خروجی‌های قبلی، اسکریپت همچنین `JAME_SIGNING_DIR` را می‌پذیرد؛ این پوشه باید بیرون مخزن دارای `release.jks` و `password.txt` باشد. از همان کلید نسخه‌های قبلی برای همهٔ به‌روزرسانی‌ها استفاده کنید.

اسکریپت پس از ساخت، امضای APK را با `apksigner` بررسی، اطلاعات بسته را با `aapt` چاپ و SHA-256 را محاسبه می‌کند. Release بدون تنظیم امضا عمداً متوقف می‌شود. R8 و حذف منابع بلااستفاده نیز برای Release فعال‌اند.
