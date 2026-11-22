#!/usr/bin/env bash
set -euo pipefail
candidate=apks/Mansour-Research-3.2.0-Android.apk
previous=apks/Mansour-Research-2.9.0-preview.2-Android.apk
package=org.jamealtafasir.mobile
echo "a8da70b6ebd77d48e5274543e74d06262546c1d9810ec564d9bba165a0b8d993  $candidate" | sha256sum -c
gh release download research-v2.9.0-preview.2 --pattern '*Android.apk' --dir apks
echo "fbd1c800f6a8c3bca153fff2860dc0e5091c97e519bff6e72be9c2eff63e49ab  $previous" | sha256sum -c
launch() {
  adb shell am start -W -n "$package/.MainActivity"
  sleep 5
  adb shell pidof "$package"
}
adb install --no-streaming "$candidate"
launch
adb uninstall "$package"
adb install --no-streaming "$previous"
launch
adb install --no-streaming -r "$candidate"
launch
adb shell dumpsys package "$package" > installed-package.txt
grep -F 'versionName=3.2.0' installed-package.txt
