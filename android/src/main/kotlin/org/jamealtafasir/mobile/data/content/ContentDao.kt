package org.jamealtafasir.mobile.data.content

import androidx.room3.Dao
import androidx.room3.Insert
import androidx.room3.OnConflictStrategy
import androidx.room3.Query

data class QuranSearchResult(
    val id: Long,
    val sura: Int,
    val aya: Int,
    @androidx.room3.ColumnInfo(name = "arabic_text") val arabicText: String,
)

data class TranslationSearchResult(
    val id: Long,
    @androidx.room3.ColumnInfo(name = "source_id") val sourceId: String,
    @androidx.room3.ColumnInfo(name = "source_name") val sourceName: String,
    val sura: Int,
    val aya: Int,
    val text: String,
)

data class TafsirSearchResult(
    val id: Long,
    @androidx.room3.ColumnInfo(name = "source_id") val sourceId: String,
    @androidx.room3.ColumnInfo(name = "source_name") val sourceName: String,
    val sura: Int,
    @androidx.room3.ColumnInfo(name = "aya_from") val ayaFrom: Int,
    @androidx.room3.ColumnInfo(name = "aya_to") val ayaTo: Int,
    val text: String,
)

@Dao
interface ContentDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertQuranVerses(entries: List<QuranVerseEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertTranslationSources(sources: List<TranslationSourceEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertTranslationEntries(entries: List<TranslationEntryEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertTafsirSources(sources: List<TafsirSourceEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertTafsirEntries(entries: List<TafsirEntryEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertHadithSources(sources: List<HadithSourceEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertHadithEntries(entries: List<HadithEntryEntity>): List<Long>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAyahHadithLinks(entries: List<AyahHadithLinkEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAyahRelations(entries: List<AyahRelationLinkEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertDuaSources(sources: List<DuaSourceEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertDuas(entries: List<DuaEntity>): List<Long>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertDuaLines(entries: List<DuaLineEntity>): List<Long>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAyahDuaLinks(entries: List<AyahDuaLinkEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertMinbarTopics(entries: List<MinbarTopicEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertMinbarOutlineItems(entries: List<MinbarOutlineItemEntity>)

    @Query("SELECT * FROM quran_verses WHERE sura = :sura ORDER BY aya")
    suspend fun versesForSura(sura: Int): List<QuranVerseEntity>

    @Query(
        """
        SELECT * FROM tafsir_entries
        WHERE source_id = :sourceId
          AND sura = :sura
          AND :aya BETWEEN aya_from AND aya_to
        ORDER BY aya_from, aya_to
        """,
    )
    suspend fun tafsirForAyah(sourceId: String, sura: Int, aya: Int): List<TafsirEntryEntity>

    @Query(
        """
        SELECT q.id, q.sura, q.aya, q.arabic_text
        FROM quran_search_fts AS f
        JOIN quran_verses AS q ON q.id = f.rowid
        WHERE quran_search_fts MATCH :matchQuery
        ORDER BY q.id
        LIMIT :limit
        """,
    )
    suspend fun searchQuran(matchQuery: String, limit: Int): List<QuranSearchResult>

    @Query(
        """
        SELECT e.id, e.source_id, s.display_name AS source_name, e.sura, e.aya, e.text
        FROM translation_search_fts AS f
        JOIN translation_entries AS e ON e.id = f.rowid
        JOIN translation_sources AS s ON s.id = e.source_id
        WHERE translation_search_fts MATCH :matchQuery
        ORDER BY e.sura, e.aya
        LIMIT :limit
        """,
    )
    suspend fun searchTranslations(matchQuery: String, limit: Int): List<TranslationSearchResult>

    @Query(
        """
        SELECT e.id, e.source_id, s.display_name AS source_name,
               e.sura, e.aya_from, e.aya_to, e.text
        FROM tafsir_search_fts AS f
        JOIN tafsir_entries AS e ON e.id = f.rowid
        JOIN tafsir_sources AS s ON s.id = e.source_id
        WHERE tafsir_search_fts MATCH :matchQuery
        ORDER BY e.sura, e.aya_from, e.aya_to
        LIMIT :limit
        """,
    )
    suspend fun searchTafsir(matchQuery: String, limit: Int): List<TafsirSearchResult>
}
