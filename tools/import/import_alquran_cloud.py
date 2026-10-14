"""Fetch verified Quran editions and create an offline SQLite package.

This script never edits public/content.json. Full import uses two official API
responses and refuses to publish an incomplete 114-surah/6236-ayah package.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import sqlite3
import sys
from datetime import date

sys.path.insert(0, str(Path(__file__).resolve().parent))
from http_client import fetch_json  # noqa: E402


HOST = "api.alquran.cloud"
EDITIONS = ("quran-simple", "fa.fooladvand")
ROOT = Path(__file__).resolve().parents[2]


def download_edition(edition: str) -> dict:
    payload = fetch_json(f"https://{HOST}/v1/quran/{edition}", allowed_hosts={HOST})
    if not isinstance(payload, dict) or payload.get("code") != 200 or not isinstance(payload.get("data"), dict):
        raise ValueError(f"Unexpected response for edition {edition}")
    return payload["data"]


def flatten(data: dict) -> list[tuple[int, int, str]]:
    chapters = data.get("surahs")
    if not isinstance(chapters, list) or len(chapters) != 114:
        raise ValueError("The source does not contain exactly 114 surahs")
    rows: list[tuple[int, int, str]] = []
    for chapter in chapters:
        sura = int(chapter.get("number", 0))
        for ayah in chapter.get("ayahs", []):
            number = int(ayah.get("numberInSurah", 0))
            text = ayah.get("text")
            if not (1 <= sura <= 114 and number >= 1 and isinstance(text, str) and text.strip()):
                raise ValueError(f"Invalid verse at {sura}:{number}")
            rows.append((sura, number, text))
    if len(rows) != 6236 or len({(sura, ayah) for sura, ayah, _ in rows}) != 6236:
        raise ValueError(f"Expected 6236 unique verses, found {len(rows)}")
    return rows


def build_database(output: Path) -> dict:
    output.parent.mkdir(parents=True, exist_ok=True)
    downloaded = {edition: flatten(download_edition(edition)) for edition in EDITIONS}
    if [row[:2] for row in downloaded[EDITIONS[0]]] != [row[:2] for row in downloaded[EDITIONS[1]]]:
        raise ValueError("Edition verse references do not align")
    temporary = output.with_suffix(output.suffix + ".tmp")
    temporary.unlink(missing_ok=True)
    connection = sqlite3.connect(temporary)
    try:
        connection.executescript((ROOT / "tools/import/schema.sql").read_text(encoding="utf-8"))
        source_payload = json.dumps(downloaded, ensure_ascii=False, separators=(",", ":")).encode()
        connection.execute(
            "INSERT INTO data_sources VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (
                "alquran-cloud", "AlQuran Cloud editions", "https://alquran.cloud/api",
                "AlQuran Cloud Terms and upstream edition terms",
                "https://alquran.cloud/terms-and-conditions", "api-v1", date.today().isoformat(),
                hashlib.sha256(source_payload).hexdigest(),
            ),
        )
        for edition, rows in downloaded.items():
            connection.executemany(
                "INSERT INTO quran_text(source_id, edition_id, sura, aya, text) VALUES (?, ?, ?, ?, ?)",
                (("alquran-cloud", edition, *row) for row in rows),
            )
        connection.commit()
        integrity = connection.execute("PRAGMA integrity_check").fetchone()[0]
        if integrity != "ok":
            raise ValueError(f"SQLite integrity check failed: {integrity}")
    finally:
        connection.close()
    temporary.replace(output)
    return {"output": str(output), "surahs": 114, "ayahs_per_edition": 6236, "editions": list(EDITIONS)}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    print(json.dumps(build_database(args.output.resolve()), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
