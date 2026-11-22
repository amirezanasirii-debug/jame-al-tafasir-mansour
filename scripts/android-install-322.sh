#!/usr/bin/env bash
set -euo pipefail
candidate=apks/Mansour-Research-3.2.2-Android.apk
previous=apks/Mansour-Research-2.9.0-preview.2-Android.apk
package=org.jamealtafasir.mobile
echo "2f717c257bdb7b4160e5e8891b02d00902c93e83c138b368384c8a7bf4a4ee62  $candidate" | sha256sum -c
gh release download research-v2.9.0-preview.2 --pattern '*Android.apk' --dir apks
echo "fbd1c800f6a8c3bca153fff2860dc0e5091c97e519bff6e72be9c2eff63e49ab  $previous" | sha256sum -c
launch() {
  adb shell am start -W -n "$package/.MainActivity"
  sleep 5
  adb shell pidof "$package"
}
adb shell svc wifi disable
adb shell svc data disable
adb install --no-streaming "$candidate"
launch
adb uninstall "$package"
adb install --no-streaming "$previous"
launch
adb install --no-streaming -r "$candidate"
launch
adb shell dumpsys package "$package" > installed-package.txt
grep -F 'versionName=3.2.2' installed-package.txt
