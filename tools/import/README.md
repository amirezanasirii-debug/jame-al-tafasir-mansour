# Offline data import tools

These scripts are acquisition tools, not runtime dependencies. They only accept
HTTPS allowlisted sources, validate structure, write to a temporary file, run
SQLite integrity checks, and then atomically replace the requested output.

Examples:

```powershell
python tools/import/import_alquran_cloud.py --output staging/quran-alquran-cloud.sqlite
python tools/import/import_duas.py --source incoming/kumayl.json --json-output public/data/duas/kumayl.json --sqlite-output staging/kumayl.sqlite
python tools/import/import_crossref.py "Quran morphology" --output staging/crossref-quran.json
```

No script performs bulk HTML scraping. A dua package must use schema
`jame-mansour-dua` version 1 and include `source.url`, `source.license_name`,
`source.license_url`, `source.version`, and `source.retrieved_at`. Hadith imports
require those fields as command-line arguments. Network-fetched content is not
automatically accepted for public redistribution.

