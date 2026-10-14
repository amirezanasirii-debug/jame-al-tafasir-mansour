"""Validate aligned Arabic/Persian dua JSON and build an offline SQLite pack.

Input is local by default. HTTPS input requires an explicit allowlisted host.
The importer does not scrape HTML and refuses packages without provenance.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import re
import sqlite3
import sys
from urllib.parse import urlparse

sys.path.insert(0, str(Path(__file__).resolve().parent))
from http_client import fetch_json  # noqa: E402


ROOT = Path(__file__).resolve().parents[2]
SAFE_ID = re.compile(r"^[a-z0-9][a-z0-9_-]{0,63}$")


def read_source(source: str, allow_host: str | None) -> tuple[dict, bytes]:
    parsed = urlparse(source)
    if parsed.scheme:
        if not allow_host or parsed.hostname != allow_host:
            raise ValueError("Remote source host must be explicitly allowlisted")
        payload = fetch_json(source, allowed_hosts={allow_host})
        raw = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode()
        return payload, raw
    path = Path(source).resolve()
    raw = path.read_bytes()
    return json.loads(raw), raw


def validate(payload: object) -> dict:
    if not isinstance(payload, dict) or payload.get("schema") != "jame-mansour-dua" or payload.get("version") != 1:
        raise ValueError("Unsupported dua schema")
    dua_id = payload.get("id")
    if not isinstance(dua_id, str) or not SAFE_ID.fullmatch(dua_id):
        raise ValueError("Invalid dua id")
    source = payload.get("source")
    required_source = ("url", "license_name", "license_url", "version", "retrieved_at")
    if not isinstance(source, dict) or any(not str(source.get(key, "")).strip() for key in required_source):
        raise ValueError("Complete source and license metadata is required")
    verses = payload.get("verses")
    if not isinstance(verses, list) or not verses:
        raise ValueError("At least one aligned verse is required")
    for expected, verse in enumerate(verses, 1):
        if not isinstance(verse, dict) or verse.get("verse_number") != expected:
            raise ValueError(f"Verse numbering is not contiguous at {expected}")
        if not str(verse.get("arabic", "")).strip() or not str(verse.get("persian", "")).strip():
            raise ValueError(f"Arabic/Persian alignment is incomplete at {expected}")
    return payload


def write_outputs(payload: dict, raw: bytes, json_output: Path, sqlite_output: Path) -> dict:
    json_output.parent.mkdir(parents=True, exist_ok=True)
    sqlite_output.parent.mkdir(parents=True, exist_ok=True)
    canonical = json.dumps(payload, ensure_ascii=False, indent=2) + "\n"
    json_temporary = json_output.with_suffix(json_output.suffix + ".tmp")
    json_temporary.write_text(canonical, encoding="utf-8")
    sqlite_temporary = sqlite_output.with_suffix(sqlite_output.suffix + ".tmp")
    sqlite_temporary.unlink(missing_ok=True)
    connection = sqlite3.connect(sqlite_temporary)
    try:
        connection.executescript((ROOT / "tools/import/schema.sql").read_text(encoding="utf-8"))
        source = payload["source"]
        connection.execute(
            "INSERT INTO dua_sources VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                payload["id"], payload["title_fa"], payload.get("title_ar"), source["url"],
                source["license_name"], source["license_url"], source["version"],
                source["retrieved_at"], hashlib.sha256(raw).hexdigest(),
            ),
        )
        connection.executemany(
            "INSERT INTO dua_verses VALUES (?, ?, ?, ?, ?)",
            ((payload["id"], item["verse_number"], item["arabic"], item["persian"], item.get("audio_url")) for item in payload["verses"]),
        )
        connection.commit()
        if connection.execute("PRAGMA integrity_check").fetchone()[0] != "ok":
            raise ValueError("SQLite integrity check failed")
    finally:
        connection.close()
    json_temporary.replace(json_output)
    sqlite_temporary.replace(sqlite_output)
    return {"id": payload["id"], "verses": len(payload["verses"]), "json": str(json_output), "sqlite": str(sqlite_output)}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", required=True, help="Local JSON path or an allowlisted HTTPS URL")
    parser.add_argument("--allow-host", help="Exact host allowed for a remote source")
    parser.add_argument("--json-output", type=Path, required=True)
    parser.add_argument("--sqlite-output", type=Path, required=True)
    args = parser.parse_args()
    payload, raw = read_source(args.source, args.allow_host)
    report = write_outputs(validate(payload), raw, args.json_output.resolve(), args.sqlite_output.resolve())
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

