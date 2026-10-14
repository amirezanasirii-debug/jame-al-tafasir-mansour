"""Fetch a single hadith and store it only with explicit provenance metadata."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import re
import sqlite3
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent))
from http_client import fetch_json  # noqa: E402


ROOT = Path(__file__).resolve().parents[2]
SAFE_ID = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--provider", choices=("shia", "sunni"), required=True)
    parser.add_argument("--book", required=True)
    parser.add_argument("--number", type=int, required=True)
    parser.add_argument("--title", required=True)
    parser.add_argument("--author", default="")
    parser.add_argument("--language", required=True)
    parser.add_argument("--license-name", required=True)
    parser.add_argument("--license-url", required=True)
    parser.add_argument("--version", required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    if not SAFE_ID.fullmatch(args.book) or args.number < 1:
        raise SystemExit("Invalid book id or hadith number")
    if args.provider == "shia":
        host = "www.thaqalayn-api.net"
        url = f"https://{host}/api/v2/{args.book}/{args.number}"
        payload = fetch_json(url, allowed_hosts={host})
        item = payload[0] if isinstance(payload, list) and payload else payload
        arabic = str(item.get("arabicText") or item.get("arabic") or item.get("text_ar") or "")
        translation = str(item.get("englishText") or item.get("english") or item.get("text_en") or "")
    else:
        host = "cdn.jsdelivr.net"
        url = f"https://{host}/gh/fawazahmed0/hadith-api@1/editions/{args.book}.min.json"
        payload = fetch_json(url, allowed_hosts={host})
        collection = payload.get("hadiths", [])
        item = next((row for row in collection if int(row.get("hadithnumber", 0)) == args.number), None)
        if item is None:
            raise SystemExit("Hadith not found")
        arabic = str(item.get("arabic") or item.get("hadithArabic") or "")
        translation = str(item.get("text") or item.get("hadithEnglish") or "")
    if not arabic.strip():
        raise SystemExit("The response did not contain Arabic text")

    output = args.output.resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    temporary = output.with_suffix(output.suffix + ".tmp")
    temporary.unlink(missing_ok=True)
    connection = sqlite3.connect(temporary)
    try:
        connection.executescript((ROOT / "tools/import/schema.sql").read_text(encoding="utf-8"))
        source_id = f"{args.provider}-{args.book}"
        connection.execute("INSERT INTO hadith_sources VALUES (?, ?, ?, ?, ?, ?, ?, ?)", (
            source_id, args.title, args.author, args.language, url,
            args.license_name, args.license_url, args.version,
        ))
        connection.execute("INSERT INTO hadith_entries VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", (
            source_id, args.book, args.number, None, str(item.get("chapter") or ""), arabic,
            translation, str(item.get("narrator") or ""), json.dumps(item.get("grades") or [], ensure_ascii=False), url,
        ))
        connection.commit()
    finally:
        connection.close()
    temporary.replace(output)
    print(json.dumps({"output": str(output), "source": source_id, "hadith": args.number}, ensure_ascii=False))


if __name__ == "__main__":
    main()

