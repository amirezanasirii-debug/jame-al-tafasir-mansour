"""Build independent, offline, verse-addressed tafsir packs from a local install.

The source application and its databases are opened read-only through its local
Elasticsearch service.  The output contains only scholarly text and source
metadata; no source UI, code, icons, or database structure is copied.

The default selection is deliberately small: three Persian works and one Arabic
hadith-oriented commentary.  Existing Qur'an text is never changed.
"""

from __future__ import annotations

import argparse
import base64
import gzip
import hashlib
import json
import os
import sys
import urllib.request
import zlib
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable

from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives.padding import PKCS7


ELASTIC_URL = "http://127.0.0.1:9201"
COMMENTARY_INDEX = "jamitafasir4_ayah_commentary"
PAGE_INDEX = "jamitafasir4_data-indices"
AYAH_INDEX = "jamitafasir4_meta_ayah"
KEY: bytes | None = None
IV: bytes | None = None


@dataclass(frozen=True)
class Source:
    slug: str
    book_id: int
    series_id: str
    title: str
    author: str
    publisher: str
    language: str
    version: str


SOURCES = (
    Source(
        "al-mizan-fa",
        121,
        "01910",
        "تفسیر المیزان (ترجمه)",
        "علامه سید محمدحسین طباطبایی",
        "دفتر انتشارات اسلامی جامعهٔ مدرسین حوزهٔ علمیهٔ قم",
        "fa",
        "۲۰ جلد",
    ),
    Source(
        "nemuneh-selected-fa",
        166,
        "02006",
        "برگزیدهٔ تفسیر نمونه",
        "آیت‌الله ناصر مکارم شیرازی و همکاران",
        "دار الکتب الإسلامیة",
        "fa",
        "۵ جلد",
    ),
    Source(
        "majma-al-bayan-fa",
        236,
        "02083",
        "ترجمهٔ تفسیر مجمع‌البیان",
        "فضل بن حسن طبرسی",
        "انتشارات فراهانی",
        "fa",
        "۲۷ جلد",
    ),
    Source(
        "nur-al-thaqalayn-ar",
        171,
        "01904",
        "تفسیر نورالثقلین",
        "عبدعلی بن جمعه حویزی",
        "اسماعیلیان",
        "ar",
        "۵ جلد",
    ),
)


def post(path: str, body: dict[str, Any], timeout: int = 120) -> dict[str, Any]:
    request = urllib.request.Request(
        f"{ELASTIC_URL}{path}",
        data=json.dumps(body, ensure_ascii=False).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return json.load(response)


def iter_scroll(index: str, query: dict[str, Any], source_fields: list[str]) -> Iterable[dict[str, Any]]:
    result = post(
        f"/{index}/_search?scroll=5m",
        {"size": 1000, "query": query, "_source": source_fields},
    )
    scroll_id = result.get("_scroll_id")
    try:
        while True:
            hits = result.get("hits", {}).get("hits", [])
            if not hits:
                return
            for hit in hits:
                yield hit["_source"]
            result = post("/_search/scroll", {"scroll": "5m", "scroll_id": scroll_id})
            scroll_id = result.get("_scroll_id", scroll_id)
    finally:
        if scroll_id:
            try:
                post("/_search/scroll", {"scroll_id": [scroll_id]})
            except Exception:
                pass


def decrypt_text(payload: str) -> str:
    if KEY is None or IV is None:
        raise RuntimeError("source decryption material was not supplied")
    encrypted = base64.b64decode(payload)
    decryptor = Cipher(algorithms.AES(KEY), modes.CBC(IV)).decryptor()
    padded = decryptor.update(encrypted) + decryptor.finalize()
    unpadder = PKCS7(128).unpadder()
    raw = unpadder.update(padded) + unpadder.finalize()
    if len(raw) >= 6 and raw[4:6] in (b"x\x9c", b"x\xda", b"x\x01"):
        raw = zlib.decompress(raw[4:])
    parsed = json.loads(raw.decode("utf-8"))
    return "".join(parsed) if isinstance(parsed, list) else str(parsed)


IGNORED_CODEPOINTS = (
    set(range(2, 33))
    | {127, 133, 160, 5760, 6158, 8206, 8207, 8232, 8233, 8239, 8287, 8288, 65279, 1600, 1648}
    | set(range(8192, 8206))
    | set(range(1552, 1563))
    | set(range(1611, 1632))
    | set(range(1750, 1757))
    | set(range(1759, 1765))
    | {1767, 1768}
    | set(range(1770, 1774))
    | set(range(2276, 2304))
)


def meaningful_offset(text: str, target: int) -> int:
    count = 0
    for offset, character in enumerate(text):
        if count == target:
            return offset
        if ord(character) not in IGNORED_CODEPOINTS:
            count += 1
    return len(text)


def extract_range(pages: dict[tuple[str, int], str], series_id: str, address: dict[str, Any]) -> str:
    volume = int(address["Volume"])
    document_id = f"{series_id}_{volume:03d}"
    first_page = int(address["BookFromPage"])
    last_page = int(address["BookToPage"])
    start = int(address.get("StartIndexInFromPage") or 0)
    end = int(address.get("EndIndexInToPage") or 0)
    fragments: list[str] = []
    for page_number in range(first_page, last_page + 1):
        text = pages.get((document_id, page_number), "")
        if not text:
            continue
        left = meaningful_offset(text, start) if page_number == first_page else 0
        right = meaningful_offset(text, end) if page_number == last_page and end else len(text)
        if right > left:
            fragments.append(text[left:right])
    return "\n".join(fragments).strip()


def chunked(values: list[int], size: int = 250) -> Iterable[list[int]]:
    for offset in range(0, len(values), size):
        yield values[offset : offset + size]


def load_ayah_map() -> dict[int, tuple[int, int]]:
    response = post(f"/{AYAH_INDEX}/_search", {"size": 7000, "query": {"match_all": {}}, "_source": ["Id", "SurahNo", "AyahNo"]})
    return {
        int(item["_source"]["Id"]): (int(item["_source"]["SurahNo"]), int(item["_source"]["AyahNo"]))
        for item in response["hits"]["hits"]
    }


def load_records(source: Source) -> list[dict[str, Any]]:
    query = {
        "bool": {
            "filter": [
                {"term": {"BookId": source.book_id}},
                {"term": {"Type": "Commentary"}},
            ]
        }
    }
    fields = ["Id", "AyahId", "PartOrder", "hasFirstOfAyah", "Address"]
    return list(iter_scroll(COMMENTARY_INDEX, query, fields))


def load_pages(records: list[dict[str, Any]], source: Source) -> dict[tuple[str, int], str]:
    required: dict[str, set[int]] = defaultdict(set)
    for record in records:
        for address in record.get("Address") or []:
            volume = int(address["Volume"])
            document_id = f"{source.series_id}_{volume:03d}"
            required[document_id].update(range(int(address["BookFromPage"]), int(address["BookToPage"]) + 1))

    pages: dict[tuple[str, int], str] = {}
    total = sum(len(page_numbers) for page_numbers in required.values())
    loaded = 0
    for document_id, page_numbers in sorted(required.items()):
        for batch in chunked(sorted(page_numbers)):
            query = {
                "bool": {
                    "filter": [
                        {"term": {"DocumentId": document_id}},
                        {"terms": {"PageNo": batch}},
                        {"term": {"StoryName": "MainText"}},
                    ]
                }
            }
            response = post(
                f"/{PAGE_INDEX}/_search",
                {
                    "size": len(batch) * 3,
                    "query": query,
                    "_source": ["DocumentId", "PageNo", "ItemSerialNo", "Text__Encrypted_Compressed"],
                },
            )
            grouped: dict[int, list[tuple[int, str]]] = defaultdict(list)
            for hit in response["hits"]["hits"]:
                item = hit["_source"]
                encrypted_text = item.get("Text__Encrypted_Compressed")
                if not encrypted_text:
                    continue
                grouped[int(float(item["PageNo"]))].append(
                    (int(item.get("ItemSerialNo") or 0), decrypt_text(encrypted_text))
                )
            for page_number, stories in grouped.items():
                pages[(document_id, page_number)] = "".join(text for _, text in sorted(stories))
            loaded += len(batch)
            print(f"  pages {loaded}/{total}", end="\r", flush=True)
    print(f"  pages {loaded}/{total}")
    return pages


def write_pack(output_root: Path, source: Source, ayah_map: dict[int, tuple[int, int]]) -> dict[str, Any]:
    print(f"[{source.slug}] reading verse links")
    records = load_records(source)
    print(f"[{source.slug}] {len(records)} linked entries; reading local pages")
    pages = load_pages(records, source)
    entries: dict[int, list[dict[str, Any]]] = defaultdict(list)
    for record in sorted(records, key=lambda item: (int(item["AyahId"]), int(item.get("PartOrder") or 0))):
        ayah_id = int(record["AyahId"])
        location = ayah_map.get(ayah_id)
        if not location or location[1] == 0:
            continue
        fragments = [extract_range(pages, source.series_id, address) for address in (record.get("Address") or [])]
        text = "\n\n".join(fragment for fragment in fragments if fragment).strip()
        if not text:
            continue
        surah, ayah = location
        entries[surah].append(
            {
                "ayah_id": ayah_id - (surah - 1),
                "surah": surah,
                "ayah": ayah,
                "text": text,
                "part": int(record.get("PartOrder") or 1),
                "source_address": record.get("Address") or [],
            }
        )

    source_dir = output_root / source.slug
    source_dir.mkdir(parents=True, exist_ok=True)
    total_entries = 0
    total_uncompressed = 0
    total_compressed = 0
    shard_hashes: dict[str, str] = {}
    for surah in range(1, 115):
        payload = {
            "schema": 1,
            "source": source.slug,
            "surah": surah,
            "entries": entries.get(surah, []),
        }
        raw = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        target = source_dir / f"{surah:03d}.json.gz"
        with target.open("wb") as stream:
            with gzip.GzipFile(filename="", mode="wb", fileobj=stream, mtime=0, compresslevel=9) as archive:
                archive.write(raw)
        total_entries += len(payload["entries"])
        total_uncompressed += len(raw)
        total_compressed += target.stat().st_size
        shard_hashes[f"{surah:03d}"] = hashlib.sha256(target.read_bytes()).hexdigest()

    return {
        "id": source.slug,
        "book_id": source.book_id,
        "series_id": source.series_id,
        "title": source.title,
        "author": source.author,
        "publisher": source.publisher,
        "language": source.language,
        "version": source.version,
        "kind": "tafsir",
        "storage": "bundled-gzip-shards",
        "offline": True,
        "coverage": total_entries,
        "uncompressed_bytes": total_uncompressed,
        "compressed_bytes": total_compressed,
        "attribution_required": True,
        "permission_basis": "مجوز اعلام‌شده توسط صاحب پروژه؛ نام اثر، مؤلف و ناشر حفظ شده است",
        "shards": shard_hashes,
    }


def main() -> int:
    global KEY, IV
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=Path("public/data/tafsir"))
    parser.add_argument("--sources", nargs="*", choices=[source.slug for source in SOURCES])
    args = parser.parse_args()
    key_value = os.environ.get("MANSOUR_SOURCE_AES_KEY_B64", "")
    iv_value = os.environ.get("MANSOUR_SOURCE_AES_IV_B64", "")
    if not key_value or not iv_value:
        parser.error("set MANSOUR_SOURCE_AES_KEY_B64 and MANSOUR_SOURCE_AES_IV_B64 for the authorized local source")
    KEY = base64.b64decode(key_value)[:16]
    IV = base64.b64decode(iv_value)
    if len(KEY) != 16 or len(IV) != 16:
        parser.error("authorized source AES key and IV must decode to 16 bytes")
    selected = [source for source in SOURCES if not args.sources or source.slug in args.sources]
    output = args.output.resolve()
    output.mkdir(parents=True, exist_ok=True)
    ayah_map = load_ayah_map()
    manifest = {
        "schema": 1,
        "generated_from": "local-authorized-library",
        "offline": True,
        "sources": [write_pack(output, source, ayah_map) for source in selected],
    }
    (output / "index.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(json.dumps({"output": str(output), "sources": manifest["sources"]}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
