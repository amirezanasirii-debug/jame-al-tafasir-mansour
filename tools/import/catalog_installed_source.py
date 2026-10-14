"""Read the installed research-library catalogue without modifying it."""

from __future__ import annotations

import argparse
import json
import sqlite3
import sys
from pathlib import Path


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser()
    parser.add_argument("database", type=Path)
    parser.add_argument("terms", nargs="*")
    parser.add_argument("--limit", type=int, default=250)
    parser.add_argument("--include-documents", action="store_true")
    args = parser.parse_args()

    database = args.database.resolve()
    connection = sqlite3.connect(f"file:{database.as_posix()}?mode=ro", uri=True)
    connection.row_factory = sqlite3.Row
    try:
        terms = [term.strip() for term in args.terms if term.strip()]
        where = ""
        values: list[object] = []
        if terms:
            clauses = []
            for term in terms:
                clauses.append("(s.title LIKE ? OR s.shortTitle LIKE ? OR a.name LIKE ?)")
                like = f"%{term}%"
                values.extend((like, like, like))
            where = "WHERE " + " OR ".join(clauses)
        values.append(max(1, args.limit))
        query = f"""
            SELECT s.id, s.title, s.shortTitle, s.serialCount,
                   a.name AS author, p.name AS publisher,
                   GROUP_CONCAT(DISTINCT sl.value) AS languages
            FROM Series s
            LEFT JOIN Author a ON a.id = s.AuthorId
            LEFT JOIN Publisher p ON p.id = s.PublisherId
            LEFT JOIN Series_languages sl ON sl.id = s.id
            {where}
            GROUP BY s.id, s.title, s.shortTitle, s.serialCount, a.name, p.name
            ORDER BY s.title
            LIMIT ?
        """
        result = []
        for row in connection.execute(query, values):
            item = dict(row)
            if args.include_documents:
                documents = connection.execute(
                    "SELECT id, serialNo, partTitle, schemaVersion, dataVersion, info "
                    "FROM Document WHERE SeriesId = ? ORDER BY serialNo",
                    (row["id"],),
                ).fetchall()
                item["documents"] = [dict(document) for document in documents]
            result.append(item)
        print(json.dumps(result, ensure_ascii=False, indent=2, default=str))
    finally:
        connection.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
