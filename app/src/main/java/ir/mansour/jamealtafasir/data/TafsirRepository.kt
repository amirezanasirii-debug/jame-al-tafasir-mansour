package ir.mansour.jamealtafasir.data

import android.content.Context
import android.net.Uri
import android.database.sqlite.SQLiteDatabase
import java.io.File
import java.text.Normalizer

data class TafsirEntry(val source: String, val sura: Int, val from: Int, val to: Int, val text: String)

class TafsirRepository(private val context: Context) {
    private val catalog = TafsirDatabase(context)
    fun sources() = catalog.listSources()

    fun entries(sura: Int, aya: Int): List<TafsirEntry> {
        require(sura in 1..114 && aya in 1..286)
        val result = mutableListOf<TafsirEntry>()
        catalog.readableDatabase.rawQuery(
            "SELECT s.name_fa,e.sura,e.aya_from,e.aya_to,e.text_original FROM tafsir_entries e JOIN tafsir_sources s ON s.id=e.source_id WHERE e.sura=? AND e.aya_from<=? AND e.aya_to>=? ORDER BY s.name_fa LIMIT 100",
            arrayOf(sura.toString(),aya.toString(),aya.toString())
        ).use { c ->
            while(c.moveToNext()) result.add(TafsirEntry(c.getString(0),c.getInt(1),c.getInt(2),c.getInt(3),c.getString(4)))
        }
        return result
    }

    fun search(query: String): List<TafsirEntry> {
        val normalized = normalize(query)
        if(normalized.length < 2) return emptyList()
        val result = mutableListOf<TafsirEntry>()
        catalog.readableDatabase.rawQuery(
            "SELECT s.name_fa,e.sura,e.aya_from,e.aya_to,e.text_original FROM tafsir_entries e JOIN tafsir_sources s ON s.id=e.source_id WHERE e.id IN (SELECT rowid FROM tafsir_fts WHERE tafsir_fts MATCH ?) LIMIT 50",
            arrayOf(normalized.split(' ').filter { it.isNotBlank() }.joinToString(" ") { "\"" + it.replace("\"","") + "\"" })
        ).use { c ->
            while(c.moveToNext()) result.add(TafsirEntry(c.getString(0),c.getInt(1),c.getInt(2),c.getInt(3),c.getString(4)))
        }
        return result
    }

    fun importPackage(uri: Uri): Int {
        val temp = File.createTempFile("mansour_import_", ".sqlite", context.cacheDir)
        try {
            context.contentResolver.openInputStream(uri)?.use { input ->
                temp.outputStream().use { output ->
                    val buffer=ByteArray(65536); var total=0L
                    while(true) {
                        val count=input.read(buffer); if(count<0) break
                        total+=count; require(total <= 100L*1024*1024) { "بسته بیش از ۱۰۰ مگابایت است" }
                        output.write(buffer,0,count)
                    }
                }
            } ?: error("فایل قابل خواندن نیست")
            val incoming=SQLiteDatabase.openDatabase(temp.path,null,SQLiteDatabase.OPEN_READONLY)
            try {
                require(incoming.rawQuery("PRAGMA integrity_check",null).use { it.moveToFirst() && it.getString(0)=="ok" }) { "ساختار SQLite معتبر نیست" }
                val sources=mutableListOf<Array<String>>()
                incoming.rawQuery("SELECT id,name_fa,author,language,origin_url,license,version FROM tafsir_sources",null).use { c ->
                    while(c.moveToNext()) {
                        require(sources.size<100) { "تعداد منابع بیش از حد مجاز است" }
                        val a=Array(7) { c.getString(it) ?: "" }
                        require(a.all { it.isNotBlank() } && a[0].length<=100) { "فراداده منبع ناقص است" }
                        sources.add(a)
                    }
                }
                require(sources.isNotEmpty()) { "منبع تفسیری یافت نشد" }
                val db=catalog.writableDatabase
                db.beginTransaction()
                var imported=0
                try {
                    for(a in sources) {
                        db.execSQL("INSERT OR IGNORE INTO tafsir_sources(id,name_fa,author,language,origin_url,license,version) VALUES(?,?,?,?,?,?,?)",a)
                    }
                    incoming.rawQuery("SELECT source_id,sura,aya_from,aya_to,text_original FROM tafsir_entries",null).use { c ->
                        while(c.moveToNext()) {
                            require(imported<200000) { "بسته بیش از حد بزرگ است" }
                            val source=c.getString(0); val sura=c.getInt(1); val from=c.getInt(2); val to=c.getInt(3); val text=c.getString(4)
                            require(sources.any { it[0]==source } && sura in 1..114 && from in 1..286 && to in from..286 && !text.isNullOrBlank() && text.length<=200000) { "رکورد نامعتبر" }
                            db.execSQL("INSERT INTO tafsir_entries(source_id,sura,aya_from,aya_to,text_original) VALUES(?,?,?,?,?)",arrayOf(source,sura,from,to,text))
                            val id=db.rawQuery("SELECT last_insert_rowid()",null).use { it.moveToFirst(); it.getLong(0) }
                            db.execSQL("INSERT INTO tafsir_fts(rowid,normalized_text) VALUES(?,?)",arrayOf(id,normalize(text)))
                            imported++
                        }
                    }
                    require(imported>0) { "بسته خالی است" }
                    db.setTransactionSuccessful()
                } finally { db.endTransaction() }
                return imported
            } finally { incoming.close() }
        } finally { temp.delete() }
    }
    companion object {
        fun normalize(input:String):String = Normalizer.normalize(input,Normalizer.Form.NFKC)
            .replace('ي','ی').replace('ك','ک')
            .replace(Regex("[\\u064B-\\u065F\\u0670\\u06D6-\\u06ED\\u0640]"),"")
            .replace(Regex("\\s+")," ").trim()
    }
}
