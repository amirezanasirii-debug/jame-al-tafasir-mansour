#!/usr/bin/env bash
set -euo pipefail
mkdir -p apks
gh release download research-v2.8.0-preview.3 --pattern '*Android.apk' --dir apks
gh release download research-v2.9.0-preview.1 --pattern '*Android.apk' --dir apks
gh release download research-v2.9.0-preview.2 --pattern '*Android.apk' --dir apks
echo '7342dac96e2ea75bdbf314219804c9203f9a56f429d25d34d696e453781d80e7  apks/Mansour-Research-2.8.0-preview.3-Android.apk' | sha256sum -c
echo 'ff2065fab0818ee5ef597a840cec5617b79cbbd8d86bd07d82b4e2076f034854  apks/Mansour-Research-2.9.0-preview.1-Android.apk' | sha256sum -c
echo '89330436c9af4d3bd9181c88cb7d84b72bb5aa0b9980b9713d3aa4b5b371cd83  apks/Mansour-Research-2.9.0-preview.2-Android.apk' | sha256sum -c
echo '=== ANDROID VERSION ==='
adb shell getprop ro.build.version.release
echo '=== CLEAN 2.9 INSTALL ==='
if adb install --no-streaming apks/Mansour-Research-2.9.0-preview.1-Android.apk; then
  adb shell am start -W -n org.jamealtafasir.mobile/.MainActivity
  sleep 3
  adb uninstall org.jamealtafasir.mobile
fi
echo '=== CLEAN OPTIMIZED INSTALL ==='
adb install --no-streaming apks/Mansour-Research-2.9.0-preview.2-Android.apk
adb shell am start -W -n org.jamealtafasir.mobile/.MainActivity
sleep 8
adb shell pidof org.jamealtafasir.mobile
adb uninstall org.jamealtafasir.mobile
echo '=== PREVIOUS 2.8 INSTALL ==='
adb install --no-streaming apks/Mansour-Research-2.8.0-preview.3-Android.apk
echo '=== UPGRADE TO 2.9 ==='
adb install --no-streaming -r apks/Mansour-Research-2.9.0-preview.2-Android.apk
adb shell am start -W -n org.jamealtafasir.mobile/.MainActivity
sleep 8
adb shell pidof org.jamealtafasir.mobile
