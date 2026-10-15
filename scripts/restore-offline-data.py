"""Download and verify the versioned offline research-data bundle.

The generated data is intentionally kept out of Git history. CI and release
builders restore the exact bundle only after its SHA-256 digest is verified.
"""

from __future__ import annotations

import argparse
import hashlib
from pathlib import Path
import shutil
import tempfile
import time
from urllib.request import Request, urlopen
from zipfile import ZipFile


DEFAULT_URL = (
    "https://github.com/amirezanasirii-debug/jame-al-tafasir-mansour/"
    "releases/download/offline-data-2026.10.15/"
    "Mansour-Offline-Data-2026.10.15.zip"
)
EXPECTED_SHA256 = "15b5f3135edd6968a313f1034f1641d601fd46d295f979ac64f845eaf65a1a3c"
BUFFER_SIZE = 1024 * 1024


def digest(path: Path) -> str:
    result = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(BUFFER_SIZE), b""):
            result.update(block)
    return result.hexdigest()


def download(url: str, output: Path, attempts: int = 4) -> None:
    request = Request(url, headers={"User-Agent": "Mansour-Release-Builder/2.7"})
    last_error: Exception | None = None
    for attempt in range(1, attempts + 1):
        try:
            with urlopen(request, timeout=90) as response, output.open("wb") as target:
                shutil.copyfileobj(response, target, length=BUFFER_SIZE)
            return
        except Exception as error:  # Network failures vary by platform.
            last_error = error
            output.unlink(missing_ok=True)
            if attempt < attempts:
                time.sleep(attempt * 3)
    raise RuntimeError(f"Offline bundle download failed after {attempts} attempts") from last_error


def safe_extract(archive: Path, destination: Path) -> None:
    root = destination.resolve()
    with ZipFile(archive) as bundle:
        for member in bundle.infolist():
            candidate = (destination / member.filename).resolve()
            if candidate != root and root not in candidate.parents:
                raise RuntimeError(f"Unsafe path in offline bundle: {member.filename}")
        bundle.extractall(destination)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", default=DEFAULT_URL)
    parser.add_argument("--sha256", default=EXPECTED_SHA256)
    parser.add_argument("--archive", type=Path, help="Use a local ZIP instead of downloading it.")
    parser.add_argument("--destination", type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()

    destination = args.destination.resolve()
    destination.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="mansour-offline-") as temporary:
        archive = args.archive.resolve() if args.archive else Path(temporary) / "offline-data.zip"
        if not args.archive:
            print(f"Downloading: {args.url}", flush=True)
            download(args.url, archive)
        if not archive.is_file():
            raise SystemExit(f"Offline bundle was not found: {archive}")

        actual = digest(archive)
        expected = args.sha256.strip().lower()
        if actual != expected:
            raise SystemExit(f"Offline bundle SHA-256 mismatch: expected {expected}, got {actual}")
        print(f"Verified SHA-256: {actual}", flush=True)
        safe_extract(archive, destination)

    required = (
        destination / "public" / "offline" / "manifest.json",
        destination / "public" / "offline" / "tafsir",
        destination / "public" / "offline" / "hadith",
        destination / "public" / "offline" / "similarity",
        destination / "public" / "vocabulary.json",
        destination / "public" / "audio",
    )
    missing = [str(path) for path in required if not path.exists()]
    if missing:
        raise SystemExit("Offline bundle is incomplete: " + ", ".join(missing))
    print("Offline research data restored successfully.", flush=True)


if __name__ == "__main__":
    main()
