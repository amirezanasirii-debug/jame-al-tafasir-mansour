"""Headless integration tests for desktop tafsir SQL queries."""
import sqlite3
import unittest

class TafsirSchemaTests(unittest.TestCase):
    def setUp(self):
        self.db=sqlite3.connect(":memory:")
        self.db.executescript("""
            CREATE TABLE tafsir_sources(id TEXT PRIMARY KEY,name_fa TEXT,author TEXT,license TEXT);
            CREATE TABLE tafsir_entries(id INTEGER PRIMARY KEY,source_id TEXT,sura INTEGER,aya_from INTEGER,aya_to INTEGER,text_original TEXT);
            INSERT INTO tafsir_sources VALUES('sample','نمونه آزمایشی','تست','test-only');
            INSERT INTO tafsir_entries(source_id,sura,aya_from,aya_to,text_original) VALUES('sample',1,1,3,'متن آزمایشی برای جستجو');
        """)
    def tearDown(self): self.db.close()
    def test_verse_range_lookup(self):
        for aya in (1,2,3):
            count=self.db.execute("SELECT COUNT(*) FROM tafsir_entries WHERE sura=? AND aya_from<=? AND aya_to>=?",(1,aya,aya)).fetchone()[0]
            self.assertEqual(count,1)
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM tafsir_entries WHERE sura=1 AND aya_from<=4 AND aya_to>=4").fetchone()[0],0)
    def test_search(self):
        count=self.db.execute("SELECT COUNT(*) FROM tafsir_entries WHERE text_original LIKE ?",("%آزمایشی%",)).fetchone()[0]
        self.assertEqual(count,1)
    def test_integrity(self):
        self.assertEqual(self.db.execute("PRAGMA integrity_check").fetchone()[0],"ok")

if __name__=="__main__": unittest.main()
