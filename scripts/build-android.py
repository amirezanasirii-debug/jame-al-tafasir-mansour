"""Build, sign, verify, and stage Android APK variants with Gradle.

Signing credentials are read only from environment variables. For backward
compatibility, JAME_SIGNING_DIR may point to a private directory containing
release.jks and password.txt (created by create_android_signing.py).
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys


ROOT = Path(__file__).resolve().parents[1]
ANDROID_MODULE = ROOT / "android"
RELEASE_DIR = ROOT / "release"
FLAVORS = ("direct", "myket", "play")


def run(command: list[str], *, env: dict[str, str] | None = None) -> None:
    display = " ".join(command)
    print(f"\n> {display}", flush=True)
    subprocess.run(command, cwd=ROOT, env=env, check=True)


def wrapper_command() -> list[str]:
    wrapper = ROOT / ("gradlew.bat" if os.name == "nt" else "gradlew")
    if not wrapper.is_file():
        raise SystemExit(f"Gradle wrapper not found: {wrapper}")
    return [str(wrapper)]


def read_version() -> str:
    package = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))
    return str(package["version"])


def signing_environment(build_type: str) -> dict[str, str]:
    environment = os.environ.copy()
    if build_type != "release":
        return environment

    required = (
        "JAME_KEYSTORE_PATH",
        "JAME_KEYSTORE_PASSWORD",
        "JAME_KEY_ALIAS",
        "JAME_KEY_PASSWORD",
    )
    if all(environment.get(name) for name in required):
        return environment

    signing_dir_value = environment.get("JAME_SIGNING_DIR")
    if signing_dir_value:
        signing_dir = Path(signing_dir_value).expanduser().resolve()
        keystore = signing_dir / "release.jks"
        password_file = signing_dir / "password.txt"
        if keystore.is_file() and password_file.is_file():
            password = password_file.read_text(encoding="utf-8").strip()
            environment.update(
                {
                    "JAME_KEYSTORE_PATH": str(keystore),
                    "JAME_KEYSTORE_PASSWORD": password,
                    "JAME_KEY_ALIAS": environment.get("JAME_KEY_ALIAS", "jame"),
                    "JAME_KEY_PASSWORD": password,
                }
            )
            return environment

    missing = ", ".join(name for name in required if not environment.get(name))
    raise SystemExit(
        "Release signing is not configured. Set JAME_KEYSTORE_PATH, "
        "JAME_KEYSTORE_PASSWORD, JAME_KEY_ALIAS and JAME_KEY_PASSWORD; or "
        f"set JAME_SIGNING_DIR. Missing: {missing}"
    )


def sdk_root(environment: dict[str, str]) -> Path:
    value = environment.get("ANDROID_HOME") or environment.get("ANDROID_SDK_ROOT")
    if not value:
        raise SystemExit("ANDROID_HOME (or ANDROID_SDK_ROOT) is not set.")
    root = Path(value).expanduser().resolve()
    if not root.is_dir():
        raise SystemExit(f"Android SDK directory does not exist: {root}")
    return root


def sdk_tool(root: Path, name: str) -> Path:
    build_tools = root / "build-tools"
    if not build_tools.is_dir():
        raise SystemExit(f"Android build-tools not found under: {build_tools}")

    versions = sorted(
        (item for item in build_tools.iterdir() if item.is_dir()),
        key=lambda item: tuple(int(part) if part.isdigit() else part for part in item.name.split(".")),
        reverse=True,
    )
    suffixes = (".bat", ".exe", "") if os.name == "nt" else ("",)
    for version in versions:
        for suffix in suffixes:
            candidate = version / f"{name}{suffix}"
            if candidate.is_file():
                return candidate
    raise SystemExit(f"Could not find Android SDK tool: {name}")


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def output_apk(flavor: str, build_type: str) -> Path:
    return (
        ANDROID_MODULE
        / "build"
        / "outputs"
        / "apk"
        / flavor
        / build_type
        / f"android-{flavor}-{build_type}.apk"
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--flavor", choices=(*FLAVORS, "all"), default="direct")
    parser.add_argument("--build-type", choices=("debug", "release"), default="release")
    parser.add_argument(
        "--skip-web",
        action="store_true",
        help="Reuse the existing dist directory instead of rebuilding the Vite app.",
    )
    args = parser.parse_args()

    environment = signing_environment(args.build_type)
    android_sdk = sdk_root(environment)
    flavors = FLAVORS if args.flavor == "all" else (args.flavor,)

    if not args.skip_web:
        package_manager = shutil.which("pnpm") or shutil.which("pnpm.cmd")
        if not package_manager:
            raise SystemExit("pnpm is required to build the web assets.")
        run([package_manager, "run", "build"], env=environment)

    build_type_title = args.build_type.capitalize()
    tasks = [f":android:assemble{flavor.capitalize()}{build_type_title}" for flavor in flavors]
    gradle = wrapper_command()
    mirror = environment.get("JAME_GOOGLE_MAVEN_MIRROR", "").strip()
    if mirror:
        gradle.append(f"-Pjame.googleMavenMirror={mirror}")
    gradle_flags = ["--no-daemon", "--no-configuration-cache"]
    if environment.get("JAME_GRADLE_OFFLINE", "").strip().lower() in {"1", "true", "yes"}:
        gradle_flags.append("--offline")
    run([*gradle, *gradle_flags, *tasks], env=environment)

    aapt = sdk_tool(android_sdk, "aapt")
    apksigner = sdk_tool(android_sdk, "apksigner")
    RELEASE_DIR.mkdir(parents=True, exist_ok=True)
    version = read_version()

    for flavor in flavors:
        source = output_apk(flavor, args.build_type)
        if not source.is_file():
            raise SystemExit(f"Expected APK was not produced: {source}")

        output = RELEASE_DIR / (
            f"Jame-al-Tafasir-Mansour-{version}-{flavor.capitalize()}-"
            f"Android-{args.build_type.capitalize()}.apk"
        )
        shutil.copy2(source, output)
        run([str(apksigner), "verify", "--verbose", "--print-certs", str(output)])
        run([str(aapt), "dump", "badging", str(output)])
        print(f"APK: {output}")
        print(f"SHA-256: {sha256(output)}")


if __name__ == "__main__":
    try:
        main()
    except subprocess.CalledProcessError as error:
        raise SystemExit(error.returncode) from error
