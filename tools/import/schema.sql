PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS data_sources (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    license_name TEXT NOT NULL,
    license_url TEXT NOT NULL,
    version TEXT NOT NULL,
    retrieved_at TEXT NOT NULL,
    sha256 TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS quran_text (
    source_id TEXT NOT NULL REFERENCES data_sources(id),
    edition_id TEXT NOT NULL,
    sura INTEGER NOT NULL CHECK (sura BETWEEN 1 AND 114),
    aya INTEGER NOT NULL CHECK (aya >= 1),
    text TEXT NOT NULL,
    PRIMARY KEY (edition_id, sura, aya)
);
CREATE INDEX IF NOT EXISTS idx_quran_reference ON quran_text(sura, aya);

CREATE TABLE IF NOT EXISTS hadith_sources (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    author TEXT,
    language TEXT NOT NULL,
    source_url TEXT NOT NULL,
    license_name TEXT NOT NULL,
    license_url TEXT NOT NULL,
    version TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS hadith_entries (
    source_id TEXT NOT NULL REFERENCES hadith_sources(id),
    book_id TEXT NOT NULL,
    hadith_number INTEGER NOT NULL CHECK (hadith_number >= 1),
    volume TEXT,
    chapter TEXT,
    arabic_text TEXT NOT NULL,
    translation_text TEXT,
    narrator TEXT,
    grading TEXT,
    source_reference TEXT NOT NULL,
    PRIMARY KEY (source_id, book_id, hadith_number)
);

CREATE TABLE IF NOT EXISTS dua_sources (
    id TEXT PRIMARY KEY,
    title_fa TEXT NOT NULL,
    title_ar TEXT,
    source_url TEXT NOT NULL,
    license_name TEXT NOT NULL,
    license_url TEXT NOT NULL,
    version TEXT NOT NULL,
    retrieved_at TEXT NOT NULL,
    sha256 TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS dua_verses (
    dua_id TEXT NOT NULL REFERENCES dua_sources(id),
    verse_number INTEGER NOT NULL CHECK (verse_number >= 1),
    arabic_text TEXT NOT NULL,
    persian_translation TEXT NOT NULL,
    audio_url TEXT,
    PRIMARY KEY (dua_id, verse_number)
);

