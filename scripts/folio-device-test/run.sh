#!/usr/bin/env bash
set -euo pipefail
src=scripts/folio-device-test
out=$(mktemp -d)
bt=$(find "$ANDROID_HOME/build-tools" -maxdepth 1 -type d | sort -V | tail -1)
platform=$(find "$ANDROID_HOME/platforms" -mindepth 1 -maxdepth 1 -type d -name 'android-[0-9]*' | sort -V | tail -1)/android.jar
mkdir -p "$out/classes" "$out/dex"
javac -encoding UTF-8 -source 8 -target 8 -classpath "$platform" -d "$out/classes" "$src/FolioTest.java"
jar cf "$out/test.jar" -C "$out/classes" .
"$bt/d8" --lib "$platform" --min-api 24 --output "$out/dex" "$out/test.jar"
"$bt/aapt2" link -I "$platform" --manifest "$src/AndroidManifest.xml" -o "$out/test.apk"
(cd "$out/dex" && zip -q "$out/test.apk" classes.dex)
# The release has already undergone signed install and upgrade checks. Use a throwaway
# runner-only certificate for instrumentation. The production key is never sent to CI.
keytool -genkeypair -alias qa -keyalg RSA -keystore "$out/qa.p12" -storepass ephemeral -keypass ephemeral -dname CN=MansourTest -validity 2
for pair in "test:$out/test.apk" "app:apks/Mansour-Research-3.2.2-Android.apk"; do
  name=${pair%%:*}; input=${pair#*:}
  "$bt/zipalign" -f 4 "$input" "$out/$name-aligned.apk"
  "$bt/apksigner" sign --ks "$out/qa.p12" --ks-pass pass:ephemeral --out "$out/$name-signed.apk" "$out/$name-aligned.apk"
done
adb uninstall org.jamealtafasir.mobile
adb install --no-streaming "$out/app-signed.apk"
adb install -t "$out/test-signed.apk"
adb shell svc wifi disable
adb shell svc data disable
adb shell am instrument -w org.jamealtafasir.uitest/.FolioTest | tee instrument-result.txt
adb pull /sdcard/Android/data/org.jamealtafasir.mobile/files/folio-qa android-locale-matrix
grep -F 'MANSOUR_DEVICE_MATRIX_PASS 150' instrument-result.txt
