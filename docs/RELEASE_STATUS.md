# Jame al-Tafasir Mansour 2.5.0 — Development Status

Status: DEVELOPMENT ONLY. NOT RELEASED.

The public repository currently contains only a README on main. Version 2.4.0 release binaries are not source code.

Before a 2.5.0 release:
- Commit and review the Android and Windows source code.
- Build Android APK and Windows executable in CI.
- Run automated tests and install tests on real devices.
- Verify APK applicationId, signing certificate and upgrade compatibility with 2.4.0.
- Verify tafsir and Quran text licenses before bundling data.
- Sign binaries using owner-controlled secrets; publish checksums.
- Do not replace the current 2.4.0 release until these gates pass.
