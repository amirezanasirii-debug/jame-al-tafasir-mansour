package org.jamealtafasir.mobile.data.content

import androidx.room3.ColumnInfo
import androidx.room3.Entity
import androidx.room3.Fts4
import androidx.room3.PrimaryKey

@Fts4(contentEntity = QuranVerseEntity::class, prefix = [2, 3, 4])
@Entity(tableName = "quran_search_fts")
data class QuranSearchFts(
    @PrimaryKey @ColumnInfo(name = "rowid") val rowId: Long,
    @ColumnInfo(name = "normalized_text") val normalizedText: String,
)

@Fts4(contentEntity = TranslationEntryEntity::class, prefix = [2, 3, 4])
@Entity(tableName = "translation_search_fts")
data class TranslationSearchFts(
    @PrimaryKey @ColumnInfo(name = "rowid") val rowId: Long,
    @ColumnInfo(name = "normalized_text") val normalizedText: String,
)

@Fts4(contentEntity = TafsirEntryEntity::class, prefix = [2, 3, 4])
@Entity(tableName = "tafsir_search_fts")
data class TafsirSearchFts(
    @PrimaryKey @ColumnInfo(name = "rowid") val rowId: Long,
    @ColumnInfo(name = "normalized_text") val normalizedText: String,
)

@Fts4(contentEntity = HadithEntryEntity::class, prefix = [2, 3, 4])
@Entity(tableName = "hadith_search_fts")
data class HadithSearchFts(
    @PrimaryKey @ColumnInfo(name = "rowid") val rowId: Long,
    @ColumnInfo(name = "normalized_text") val normalizedText: String,
)

@Fts4(contentEntity = DuaLineEntity::class, prefix = [2, 3, 4])
@Entity(tableName = "dua_search_fts")
data class DuaSearchFts(
    @PrimaryKey @ColumnInfo(name = "rowid") val rowId: Long,
    @ColumnInfo(name = "normalized_text") val normalizedText: String,
)
