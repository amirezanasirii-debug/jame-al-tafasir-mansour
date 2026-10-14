"""Inspect SQLite databases read-only before writing a source-specific importer."""

from __future__ import annotations

import argparse
import json
import sqlite3
import sys
from pathlib import Path


def quote_identifier(value: str) -> str:
    return '"' + value.replace('"', '""') + '"'


def inspect_database(path: Path, include_samples: bool) -> dict[str, object]:
    connection = sqlite3.connect(f"file:{path.as_posix()}?mode=ro", uri=True)
    connection.row_factory = sqlite3.Row
    try:
        table_names = [
            row[0]
            for row in connection.execute(
                "SELECT name FROM sqlite_master "
                "WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
            )
        ]
        tables = []
        for table_name in table_names:
            quoted = quote_identifier(table_name)
            columns = [
                {"name": row[1], "type": row[2], "not_null": bool(row[3]), "pk": row[5]}
                for row in connection.execute(f"PRAGMA table_info({quoted})")
            ]
            try:
                row_count = connection.execute(f"SELECT COUNT(*) FROM {quoted}").fetchone()[0]
            except sqlite3.DatabaseError as error:
                row_count = f"error: {error}"
            table = {"name": table_name, "row_count": row_count, "columns": columns}
            if include_samples:
                try:
                    rows = connection.execute(f"SELECT * FROM {quoted} LIMIT 3").fetchall()
                    table["samples"] = [dict(row) for row in rows]
                except sqlite3.DatabaseError as error:
                    table["samples"] = [{"error": str(error)}]
            tables.append(table)
        return {"path": str(path), "size": path.stat().st_size, "tables": tables}
    finally:
        connection.close()


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser()
    parser.add_argument("paths", nargs="+", type=Path)
    parser.add_argument("--samples", action="store_true")
    args = parser.parse_args()
    report = [inspect_database(path.resolve(), args.samples) for path in args.paths]
    print(json.dumps(report, ensure_ascii=False, indent=2, default=str))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
