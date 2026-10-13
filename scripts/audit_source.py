#!/usr/bin/env python3
"""Fail-closed release audit for the shared React, Android and Windows source."""

from __future__ import annotations

import hashlib
import json
import re
import sys
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SKIP_DIRS = {".git", ".gradle", "node_modules", "dist", "build", "release", "__pycache__"}
TEXT_SUFFIXES = {".js", ".jsx", ".mjs", ".cjs", ".json", ".md", ".xml", ".kts", ".java", ".py", ".txt", ".yaml", ".yml"}
DANGEROUS_PERMISSIONS = {
    "android.permission.READ_SMS", "android.permission.SEND_SMS",
    "android.permission.REQUEST_INSTALL_PACKAGES", "android.permission.MANAGE_EXTERNAL_STORAGE",
    "android.permission.BIND_ACCESSIBILITY_SERVICE",
}
PLACEHOLDER_QURAN = (
    "قراءة وتدبر الآيات الكريمة",
    "آغاز سوره",
    "placeholder quran",
    "sample ayah",
)
SECRET_PATTERNS = {
    "google_api_key": re.compile(r"AIza[0-9A-Za-z_-]{30,}"),
    "github_token": re.compile(r"gh[pousr]_[A-Za-z0-9]{30,}"),
    "private_key": re.compile(r"BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY"),
}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def source_files():
    for path in ROOT.rglob("*"):
        if not path.is_file() or any(part in SKIP_DIRS for part in path.parts):
            continue
        yield path


def check_quran(report: dict) -> None:
    path = ROOT / "public/content.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    surahs = data.get("surahs", [])
    ayahs = data.get("ayahs", [])
    sources = data.get("sources", [])
    counts = Counter(item.get("surah_id") for item in ayahs)
    expected_counts = {item.get("id"): item.get("ayah_count") for item in surahs}
    placeholders = [
        item.get("id") for item in ayahs
        if any(marker.casefold() in str(item.get("text_original", "")).casefold() for marker in PLACEHOLDER_QURAN)
    ]
    required_source_fields = {"id", "kind", "title", "url", "license_name", "version"}
    incomplete_sources = [item.get("id") for item in sources if not required_source_fields.issubset(item) or not all(item.get(field) for field in required_source_fields)]
    report["quran"] = {
        "file": str(path.relative_to(ROOT)),
        "sha256": sha256(path),
        "surah_count": len(surahs),
        "ayah_count": len(ayahs),
        "surah_ids_1_to_114": sorted(item.get("id") for item in surahs) == list(range(1, 115)),
        "ayah_ids_1_to_6236": sorted(item.get("id") for item in ayahs) == list(range(1, 6237)),
        "per_surah_counts_match": counts == Counter(expected_counts),
        "placeholder_ayah_ids": placeholders,
        "source_count": len(sources),
        "incomplete_source_ids": incomplete_sources,
    }


def check_android(report: dict) -> None:
    manifest_path = ROOT / "android/src/main/AndroidManifest.xml"
    manifest = manifest_path.read_text(encoding="utf-8")
    gradle = (ROOT / "android/build.gradle.kts").read_text(encoding="utf-8")
    permissions = re.findall(r'<uses-permission[^>]+android:name="([^"]+)"', manifest)
    components = re.findall(r'<(activity|service|receiver|provider)\b([^>]*)>', manifest)
    missing_exported = [kind for kind, attributes in components if "android:exported=" not in attributes]
    value = lambda name: (re.search(rf"\b{name}\s*=\s*(?:\"([^\"]+)\"|(\d+))", gradle) or (None, None, None))
    app_id = value("applicationId")
    version_name = value("versionName")
    target_sdk = value("targetSdk")
    report["android"] = {
        "application_id": app_id[1] if app_id else None,
        "version_name": version_name[1] if version_name else None,
        "target_sdk": int(target_sdk[2]) if target_sdk and target_sdk[2] else None,
        "permissions": permissions,
        "dangerous_permissions": sorted(set(permissions) & DANGEROUS_PERMISSIONS),
        "uses_cleartext_false": 'android:usesCleartextTraffic="false"' in manifest,
        "components_missing_exported": missing_exported,
        "release_signing_external": "JAME_KEYSTORE_PATH" in gradle and "validateReleaseSigning" in gradle,
    }


def check_desktop(report: dict) -> None:
    desktop = (ROOT / "desktop/main.cjs").read_text(encoding="utf-8")
    report["windows"] = {
        "sandbox_enabled": "sandbox: true" in desktop,
        "context_isolation_enabled": "contextIsolation: true" in desktop,
        "node_integration_disabled": "nodeIntegration: false" in desktop,
        "navigation_restricted": "will-navigate" in desktop and "will-attach-webview" in desktop,
        "csp_present": "Content-Security-Policy" in desktop,
    }


def check_source_tree(report: dict) -> None:
    sensitive_files = []
    secret_hits = []
    for path in source_files():
        relative = path.relative_to(ROOT).as_posix()
        if path.suffix.lower() in {".jks", ".keystore", ".p12", ".pem", ".key"}:
            sensitive_files.append(relative)
        if path.suffix.lower() not in TEXT_SUFFIXES or path.stat().st_size > 2 * 1024 * 1024:
            continue
        text = path.read_text(encoding="utf-8", errors="ignore")
        for name, pattern in SECRET_PATTERNS.items():
            if pattern.search(text):
                secret_hits.append({"file": relative, "kind": name})
    report["source_tree"] = {
        "sensitive_files": sensitive_files,
        "secret_pattern_hits": secret_hits,
        "forbidden_generated_cache_files": [
            path.relative_to(ROOT).as_posix() for path in ROOT.rglob("*.pyc")
            if not any(part in SKIP_DIRS for part in path.parts)
        ],
    }


def main() -> int:
    report = {"schema": "jame-mansour-source-audit", "version": 1}
    check_quran(report)
    check_android(report)
    check_desktop(report)
    check_source_tree(report)
    quran = report["quran"]
    android = report["android"]
    windows = report["windows"]
    tree = report["source_tree"]
    failures = []
    if not all((quran["surah_count"] == 114, quran["ayah_count"] == 6236, quran["surah_ids_1_to_114"], quran["ayah_ids_1_to_6236"], quran["per_surah_counts_match"])):
        failures.append("quran_structure")
    if quran["placeholder_ayah_ids"]:
        failures.append("placeholder_quran_text")
    if quran["incomplete_source_ids"]:
        failures.append("incomplete_source_metadata")
    if android["dangerous_permissions"] or not android["uses_cleartext_false"] or android["components_missing_exported"]:
        failures.append("android_manifest_security")
    if not android["release_signing_external"]:
        failures.append("android_release_signing")
    if not all((windows["sandbox_enabled"], windows["context_isolation_enabled"], windows["node_integration_disabled"], windows["navigation_restricted"], windows["csp_present"])):
        failures.append("windows_web_security")
    if tree["sensitive_files"] or tree["secret_pattern_hits"] or tree["forbidden_generated_cache_files"]:
        failures.append("source_tree_hygiene")
    report["result"] = "PASS" if not failures else "FAIL"
    report["failures"] = failures
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if not failures else 2


if __name__ == "__main__":
    sys.exit(main())
