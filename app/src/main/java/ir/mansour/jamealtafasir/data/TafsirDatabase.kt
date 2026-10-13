package ir.mansour.jamealtafasir.data

import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper

data class TafsirSource(val id: String, val name: String, val author: String, val license: String)

class TafsirDatabase(context: Context): SQLiteOpenHelper(context, "mansour_tafsir_v1.sqlite", null, 1) {
 override fun onCreate(db: SQLiteDatabase) {
  db.execSQL("""CREATE TABLE tafsir_sources(
   id TEXT PRIMARY KEY NOT NULL,
   name_fa TEXT NOT NULL,
   author TEXT NOT NULL,
   language TEXT NOT NULL,
   origin_url TEXT NOT NULL,
   license TEXT NOT NULL,
   version TEXT NOT NULL
  )""")
  db.execSQL("""CREATE TABLE tafsir_entries(
   id INTEGER PRIMARY KEY AUTOINCREMENT,
   source_id TEXT NOT NULL REFERENCES tafsir_sources(id),
   sura INTEGER NOT NULL CHECK(sura BETWEEN 1 AND 114),
   aya_from INTEGER NOT NULL CHECK(aya_from BETWEEN 1 AND 286),
   aya_to INTEGER NOT NULL CHECK(aya_to >= aya_from AND aya_to <= 286),
   text_original TEXT NOT NULL
  )""")
  db.execSQL("CREATE INDEX idx_tafsir_verse ON tafsir_entries(sura,aya_from,aya_to)")
  db.execSQL("CREATE VIRTUAL TABLE tafsir_fts USING fts5(normalized_text)")
 }
 override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
  throw IllegalStateException("Migration required; existing tafsir data will not be deleted.")
 }
 fun listSources(): List<TafsirSource> {
  val items=mutableListOf<TafsirSource>()
  readableDatabase.rawQuery("SELECT id,name_fa,author,license FROM tafsir_sources ORDER BY name_fa",null).use { c ->
   while(c.moveToNext()) items.add(TafsirSource(c.getString(0),c.getString(1),c.getString(2),c.getString(3)))
  }
  return items
 }
}
