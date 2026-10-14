"""Cache citation metadata from Crossref; article full text is never downloaded."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from urllib.parse import urlencode
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent))
from http_client import fetch_json  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("query")
    parser.add_argument("--rows", type=int, default=5)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    if not 2 <= len(args.query.strip()) <= 300:
        raise SystemExit("Query must contain 2 to 300 characters")
    rows = min(20, max(1, args.rows))
    query = urlencode({"query": args.query.strip(), "rows": rows, "select": "DOI,title,author,published,container-title,URL"})
    url = f"https://api.crossref.org/works?{query}"
    payload = fetch_json(url, allowed_hosts={"api.crossref.org"})
    output = args.output.resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    temporary = output.with_suffix(output.suffix + ".tmp")
    temporary.write_text(json.dumps({"source": url, "items": payload.get("message", {}).get("items", [])}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.replace(output)
    print(json.dumps({"output": str(output), "items": len(payload.get("message", {}).get("items", []))}, ensure_ascii=False))


if __name__ == "__main__":
    main()

