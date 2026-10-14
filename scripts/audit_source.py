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
FORBIDDEN_UI_BRAND_PATTERNS = {
    "legacy_hadith_brand": re.compile(r"منابع حدیثی آفلاین نور"),
    "legacy_similarity_brand": re.compile(r"داده(?:‌|\s)*های مشابه(?:‌|\s)*یاب جامع التفاسیر [۴4]"),
    "legacy_product_name": re.compile(r"جامع التفاسیر [۴4]|(?:Jame|Jami)\s+Tafasir\s+4", re.IGNORECASE),
    "legacy_vendor_name": re.compile(r"NoorSoft|مشکات(?:‌|-)?صوت|Meshkat", re.IGNORECASE),
    "legacy_lexicon_brand": re.compile(r"برگرفته از منابع .*نور"),
    "platform_marketing_copy": re.compile(r"نسخه.*ویندوز.*اندروید"),
}
UI_SOURCE_ROOTS = (
    ROOT / "src",
    ROOT / "android/src/main/res/values",
)


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


def check_release_configuration(report: dict) -> None:
    package = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))
    package_version = str(package.get("version", ""))
    android_gradle = (ROOT / "android/build.gradle.kts").read_text(encoding="utf-8")
    version_name_match = re.search(r'\bversionName\s*=\s*"([^"]+)"', android_gradle)
    version_code_match = re.search(r"\bversionCode\s*=\s*(\d+)", android_gradle)
    android_version_name = version_name_match.group(1) if version_name_match else None
    android_version_code = int(version_code_match.group(1)) if version_code_match else None

    semantic_version = re.fullmatch(r"(\d+)\.(\d+)\.(\d+)", package_version)
    expected_version_code = None
    if semantic_version:
        major, minor, patch = (int(part) for part in semantic_version.groups())
        expected_version_code = major * 10000 + minor * 100 + patch

    workflow_paths = sorted((ROOT / ".github/workflows").glob("*.yml"))
    workflow_text = "\n".join(path.read_text(encoding="utf-8") for path in workflow_paths)
    action_references = re.findall(r"^\s*uses:\s*([^@\s]+)@([^\s#]+)", workflow_text, re.MULTILINE)
    unpinned_actions = [
        f"{action}@{revision}"
        for action, revision in action_references
        if not action.startswith("./") and not re.fullmatch(r"[0-9a-f]{40}", revision)
    ]
    required_secret_names = {
        "KEYSTORE_BASE64",
        "KEYSTORE_PASSWORD",
        "KEY_ALIAS",
        "KEY_PASSWORD",
        "WINDOWS_CSC_BASE64",
        "WINDOWS_CSC_PASSWORD",
    }
    referenced_secret_names = set(re.findall(r"secrets\.([A-Z0-9_]+)", workflow_text))

    report["release"] = {
        "package_version": package_version,
        "android_version_name": android_version_name,
        "android_version_code": android_version_code,
        "expected_android_version_code": expected_version_code,
        "versions_match": package_version == android_version_name,
        "version_code_matches": expected_version_code == android_version_code,
        "workflow_files": [path.relative_to(ROOT).as_posix() for path in workflow_paths],
        "unpinned_external_actions": unpinned_actions,
        "missing_release_secret_references": sorted(required_secret_names - referenced_secret_names),
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


def check_brand_sanitization(report: dict) -> None:
    hits = []
    for source_root in UI_SOURCE_ROOTS:
        if not source_root.is_dir():
            continue
        for path in source_root.rglob("*"):
            if not path.is_file() or path.suffix.lower() not in TEXT_SUFFIXES:
                continue
            text = path.read_text(encoding="utf-8", errors="ignore")
            for name, pattern in FORBIDDEN_UI_BRAND_PATTERNS.items():
                if pattern.search(text):
                    hits.append({"file": path.relative_to(ROOT).as_posix(), "kind": name})
    report["brand_sanitization"] = {"forbidden_ui_brand_hits": hits}


def main() -> int:
    report = {"schema": "jame-mansour-source-audit", "version": 1}
    check_quran(report)
    check_android(report)
    check_desktop(report)
    check_release_configuration(report)
    check_source_tree(report)
    check_brand_sanitization(report)
    quran = report["quran"]
    android = report["android"]
    windows = report["windows"]
    release = report["release"]
    tree = report["source_tree"]
    branding = report["brand_sanitization"]
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
    if not release["versions_match"] or not release["version_code_matches"]:
        failures.append("release_version_mismatch")
    if len(release["workflow_files"]) < 2 or release["unpinned_external_actions"]:
        failures.append("release_workflow_supply_chain")
    if release["missing_release_secret_references"]:
        failures.append("release_signing_secrets")
    if tree["sensitive_files"] or tree["secret_pattern_hits"] or tree["forbidden_generated_cache_files"]:
        failures.append("source_tree_hygiene")
    if branding["forbidden_ui_brand_hits"]:
        failures.append("forbidden_ui_branding")
    report["result"] = "PASS" if not failures else "FAIL"
    report["failures"] = failures
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if not failures else 2


if __name__ == "__main__":
    sys.exit(main())
