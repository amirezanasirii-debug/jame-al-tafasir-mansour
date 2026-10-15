"""Convert authorized local commentary data to independent offline JSON packs.

Only scholarly text, verse links and bibliographic metadata are exported. The
source application is queried read-only; its UI, executable code and database
layout are not copied. Encryption material is read at runtime from the locally
installed client and is never written to output or logs.
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import json
import re
import sys
import urllib.request
import zlib
from collections import defaultdict
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Iterable

from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives.padding import PKCS7


ELASTIC_URL = "http://127.0.0.1:9201"
COMMENTARY_INDEX = "jamitafasir4_ayah_commentary"
PAGE_INDEX = "jamitafasir4_data-indices"
AYAH_INDEX = "jamitafasir4_meta_ayah"


@dataclass(frozen=True)
class Source:
    book_id: int
    series_id: str
    title: str
    author: str
    language: str
    publisher: str = "مشخصات ناشر در شناسنامهٔ چاپ منبع"
    version: str = "نسخهٔ نصب‌شدهٔ مجاز"


SOURCES = (
    Source(120, "01909", "المیزان في تفسیر القرآن", "علامه سید محمدحسین طباطبایی", "ar"),
    Source(121, "01910", "تفسیر المیزان (ترجمه)", "علامه سید محمدحسین طباطبایی", "fa"),
    Source(21, "01908", "تفسیر نمونه", "آیت‌الله ناصر مکارم شیرازی و همکاران", "fa"),
    Source(123, "01913", "مجمع البیان", "فضل بن حسن طبرسی", "ar"),
    Source(236, "02083", "ترجمهٔ تفسیر مجمع‌البیان", "فضل بن حسن طبرسی", "fa"),
    Source(171, "01904", "تفسیر نورالثقلین", "عبدعلی بن جمعه حویزی", "ar"),
    Source(122, "01911", "البرهان في تفسير القرآن", "هاشم بن سلیمان بحرانی", "ar"),
    Source(117, "01902", "التبيان في تفسير القرآن", "شیخ طوسی", "ar"),
    Source(146, "66815", "جامع البیان (تفسیر طبری)", "محمد بن جریر طبری", "ar"),
    Source(139, "01942", "التفسیر الکبیر (مفاتیح الغیب)", "فخر رازی", "ar"),
    Source(145, "01961", "الدر المنثور في التفسیر بالمأثور", "جلال‌الدین سیوطی", "ar"),
    Source(134, "01931", "روض الجنان و روح الجنان", "ابوالفتوح رازی", "fa"),
    Source(102, "01342", "تفسير الصافي", "فیض کاشانی", "ar"),
    Source(215, "02023", "تفسیر القرآن العظیم (ابن کثیر)", "اسماعیل بن عمر ابن‌کثیر", "ar"),
    Source(143, "01959", "الجامع لأحکام القرآن", "محمد بن احمد قرطبی", "ar"),
    Source(144, "01960", "الکشاف", "محمود بن عمر زمخشری", "ar"),
    Source(115, "01446", "تفسير القمي", "علی بن ابراهیم قمی", "ar"),
    Source(187, "01444", "تفسير العياشي", "محمد بن مسعود عیاشی", "ar"),
    Source(188, "01445", "تفسير فرات الكوفي", "فرات بن ابراهیم کوفی", "ar"),
    Source(118, "01905", "کشف الاسرار و عدة الابرار", "احمد بن محمد میبدی", "fa"),
    Source(1723, "35190", "مخزن العرفان در تفسیر قرآن", "بانو نصرت امین", "fa"),
    Source(317, "12751", "تفسیر نور", "محسن قرائتی", "fa"),
    Source(22, "01926", "أطیب البیان في تفسیر القرآن", "عبدالحسین طیب", "fa"),
    Source(133, "01930", "تفسیر احسن الحدیث", "علی‌اکبر قرشی", "fa"),
    Source(223, "02033", "تفسير الجلالين", "جلال‌الدین محلی و جلال‌الدین سیوطی", "ar"),
)


def post(path: str, body: dict[str, Any], timeout: int = 180) -> dict[str, Any]:
    request = urllib.request.Request(
        f"{ELASTIC_URL}{path}",
        data=json.dumps(body, ensure_ascii=False).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return json.load(response)


def iter_scroll(index: str, query: dict[str, Any], fields: list[str]) -> Iterable[dict[str, Any]]:
    result = post(f"/{index}/_search?scroll=10m", {"size": 1000, "query": query, "_source": fields})
    scroll_id = result.get("_scroll_id")
    try:
        while True:
            hits = result.get("hits", {}).get("hits", [])
            if not hits:
                return
            yield from (hit["_source"] for hit in hits)
            result = post("/_search/scroll", {"scroll": "10m", "scroll_id": scroll_id})
            scroll_id = result.get("_scroll_id", scroll_id)
    finally:
        if scroll_id:
            try:
                post("/_search/scroll", {"scroll_id": [scroll_id]})
            except Exception:
                pass


def load_crypto_material(client_script: Path) -> tuple[bytes, bytes]:
    text = client_script.read_text(encoding="utf-8", errors="ignore")
    key_match = re.search(r'getKeyBuffer\(\)\{return atob\("([A-Za-z0-9+/=]+)"\)', text)
    iv_match = re.search(r'getIVBuffer\(\)\{return atob\("([A-Za-z0-9+/=]+)"\)', text)
    if not key_match or not iv_match:
        raise RuntimeError("رمزگشای نصب محلی پیدا نشد")
    key = base64.b64decode(key_match.group(1))[:16]
    iv = base64.b64decode(iv_match.group(1))
    if len(key) != 16 or len(iv) != 16:
        raise RuntimeError("طول کلید نصب محلی معتبر نیست")
    return key, iv


def decrypt_text(payload: str, key: bytes, iv: bytes) -> str:
    decryptor = Cipher(algorithms.AES(key), modes.CBC(iv)).decryptor()
    padded = decryptor.update(base64.b64decode(payload)) + decryptor.finalize()
    unpadder = PKCS7(128).unpadder()
    raw = unpadder.update(padded) + unpadder.finalize()
    if len(raw) >= 6 and raw[4:6] in (b"x\x9c", b"x\xda", b"x\x01"):
        raw = zlib.decompress(raw[4:])
    parsed = json.loads(raw.decode("utf-8"))
    return "".join(parsed) if isinstance(parsed, list) else str(parsed)


IGNORED = (
    set(range(2, 33)) | {127, 133, 160, 5760, 6158, 8206, 8207, 8232, 8233, 8239, 8287, 8288, 65279, 1600, 1648}
    | set(range(8192, 8206)) | set(range(1552, 1563)) | set(range(1611, 1632))
    | set(range(1750, 1757)) | set(range(1759, 1765)) | {1767, 1768}
    | set(range(1770, 1774)) | set(range(2276, 2304))
)


def meaningful_offset(text: str, target: int) -> int:
    count = 0
    for offset, character in enumerate(text):
        if count == target:
            return offset
        if ord(character) not in IGNORED:
            count += 1
    return len(text)


def extract_range(pages: dict[tuple[str, int], str], series_id: str, address: dict[str, Any]) -> str:
    volume = int(address["Volume"])
    document_id = f"{series_id}_{volume:03d}"
    first_page, last_page = int(address["BookFromPage"]), int(address["BookToPage"])
    start, end = int(address.get("StartIndexInFromPage") or 0), int(address.get("EndIndexInToPage") or 0)
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


def chunks(values: list[int], size: int = 250) -> Iterable[list[int]]:
    for offset in range(0, len(values), size):
        yield values[offset:offset + size]


def load_ayah_map() -> dict[int, tuple[int, int]]:
    response = post(f"/{AYAH_INDEX}/_search", {"size": 7000, "query": {"match_all": {}}, "_source": ["Id", "SurahNo", "AyahNo"]})
    return {int(hit["_source"]["Id"]): (int(hit["_source"]["SurahNo"]), int(hit["_source"]["AyahNo"])) for hit in response["hits"]["hits"]}


def load_records(source: Source) -> list[dict[str, Any]]:
    query = {"bool": {"filter": [{"term": {"BookId": source.book_id}}, {"term": {"Type": "Commentary"}}]}}
    return list(iter_scroll(COMMENTARY_INDEX, query, ["Id", "AyahId", "PartOrder", "Address"]))


def load_pages(records: list[dict[str, Any]], source: Source, key: bytes, iv: bytes) -> dict[tuple[str, int], str]:
    required: dict[str, set[int]] = defaultdict(set)
    for record in records:
        for address in record.get("Address") or []:
            document_id = f"{source.series_id}_{int(address['Volume']):03d}"
            required[document_id].update(range(int(address["BookFromPage"]), int(address["BookToPage"]) + 1))
    pages: dict[tuple[str, int], str] = {}
    total, loaded = sum(map(len, required.values())), 0
    for document_id, page_numbers in sorted(required.items()):
        for batch in chunks(sorted(page_numbers)):
            query = {"bool": {"filter": [{"term": {"DocumentId": document_id}}, {"terms": {"PageNo": batch}}, {"term": {"StoryName": "MainText"}}]}}
            response = post(f"/{PAGE_INDEX}/_search", {"size": len(batch) * 3, "query": query, "_source": ["DocumentId", "PageNo", "ItemSerialNo", "Text__Encrypted_Compressed"]})
            grouped: dict[int, list[tuple[int, str]]] = defaultdict(list)
            for hit in response["hits"]["hits"]:
                item = hit["_source"]
                if item.get("Text__Encrypted_Compressed"):
                    grouped[int(float(item["PageNo"]))].append((int(item.get("ItemSerialNo") or 0), decrypt_text(item["Text__Encrypted_Compressed"], key, iv)))
            for page_number, stories in grouped.items():
                pages[(document_id, page_number)] = "".join(text for _, text in sorted(stories))
            loaded += len(batch)
            print(f"  pages {loaded}/{total}", end="\r", flush=True)
    print(f"  pages {loaded}/{total}")
    return pages


def write_pack(root: Path, source: Source, ayah_map: dict[int, tuple[int, int]], key: bytes, iv: bytes) -> dict[str, Any]:
    print(f"[{source.book_id}] {source.title}: reading links")
    records = load_records(source)
    pages = load_pages(records, source, key, iv)
    verses: dict[int, dict[str, list[dict[str, Any]]]] = defaultdict(lambda: defaultdict(list))
    texts: dict[int, dict[str, str]] = defaultdict(dict)
    for record in sorted(records, key=lambda item: (int(item["AyahId"]), int(item.get("PartOrder") or 0))):
        location = ayah_map.get(int(record["AyahId"]))
        if not location or not location[1]:
            continue
        surah, ayah = location
        refs = []
        for address in record.get("Address") or []:
            text = extract_range(pages, source.series_id, address)
            if not text:
                continue
            digest = hashlib.sha256(text.encode("utf-8")).hexdigest()[:20]
            texts[surah][digest] = text
            refs.append([digest, int(address.get("BookFromPage") or 0)])
        if refs:
            address = (record.get("Address") or [{}])[0]
            verses[surah][str(ayah)].append({"refs": refs, "volume": int(address.get("Volume") or 0), "part": int(record.get("PartOrder") or 1)})
    target_dir = root / str(source.book_id)
    target_dir.mkdir(parents=True, exist_ok=True)
    total_entries = total_bytes = 0
    hashes: dict[str, str] = {}
    for surah in range(1, 115):
        payload = {"schemaVersion": 2, "source": str(source.book_id), "surah": surah, "chunks": texts[surah], "verses": verses[surah]}
        raw = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        target = target_dir / f"{surah}.json"
        target.write_bytes(raw)
        total_bytes += len(raw)
        total_entries += sum(len(items) for items in verses[surah].values())
        hashes[str(surah)] = hashlib.sha256(raw).hexdigest()
    result = asdict(source) | {"id": str(source.book_id), "kind": "tafsir", "offline": True, "storage": "plain-json-deduplicated", "coverage": total_entries, "bytes": total_bytes, "shards": hashes}
    print(f"[{source.book_id}] {total_entries} entries, {total_bytes / 1024 / 1024:.1f} MiB")
    return result


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=Path("public/offline/tafsir"))
    parser.add_argument("--client-script", type=Path, required=True)
    parser.add_argument("--sources", nargs="*", type=int, choices=[source.book_id for source in SOURCES])
    args = parser.parse_args()
    key, iv = load_crypto_material(args.client_script)
    selected = [source for source in SOURCES if not args.sources or source.book_id in args.sources]
    args.output.mkdir(parents=True, exist_ok=True)
    ayah_map = load_ayah_map()
    manifest_path = args.output.parent / "manifest.json"
    legacy = json.loads(manifest_path.read_text(encoding="utf-8")) if manifest_path.exists() else {}
    generated = [write_pack(args.output, source, ayah_map, key, iv) for source in selected]
    previous = {str(item["id"]): item for item in legacy.get("sources", [])}
    for source_id, title in legacy.get("books", {}).items():
        previous.setdefault(str(source_id), {"id": str(source_id), "title": title, "author": "شناسنامهٔ اثر همراه متن", "language": "fa", "offline": True, "storage": "legacy-json-shards"})
    previous.update({str(item["id"]): item for item in generated})
    manifest = {"schema": 2, "offline": True, "generated_from": "authorized-local-library", "sources": list(previous.values())}
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"sources": len(generated), "output": str(args.output.resolve())}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
