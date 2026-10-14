package org.jamealtafasir.mobile.data.content

import androidx.room3.ColumnInfo
import androidx.room3.Entity
import androidx.room3.ForeignKey
import androidx.room3.Index
import androidx.room3.PrimaryKey

@Entity(
    tableName = "quran_verses",
    indices = [Index(value = ["sura", "aya"], unique = true)],
)
data class QuranVerseEntity(
    @PrimaryKey val id: Long,
    val sura: Int,
    val aya: Int,
    @ColumnInfo(name = "arabic_text") val arabicText: String,
    @ColumnInfo(name = "normalized_text") val normalizedText: String,
    val juz: Int,
    val hizb: Int,
    val rub: Int,
    val page: Int,
    @ColumnInfo(name = "source_id") val sourceId: String,
)

@Entity(tableName = "translation_sources")
data class TranslationSourceEntity(
    @PrimaryKey val id: String,
    @ColumnInfo(name = "display_name") val displayName: String,
    val translator: String,
    val language: String,
    @ColumnInfo(name = "source_url") val sourceUrl: String,
    @ColumnInfo(name = "license_name") val licenseName: String,
    @ColumnInfo(name = "license_url") val licenseUrl: String,
    val version: String,
    @ColumnInfo(name = "retrieved_at") val retrievedAt: String,
)

@Entity(
    tableName = "translation_entries",
    foreignKeys = [
        ForeignKey(
            entity = TranslationSourceEntity::class,
            parentColumns = ["id"],
            childColumns = ["source_id"],
            onDelete = ForeignKey.CASCADE,
        ),
    ],
    indices = [
        Index(value = ["source_id"]),
        Index(value = ["source_id", "sura", "aya"], unique = true),
        Index(value = ["sura", "aya"]),
    ],
)
data class TranslationEntryEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    @ColumnInfo(name = "source_id") val sourceId: String,
    val sura: Int,
    val aya: Int,
    val text: String,
    @ColumnInfo(name = "normalized_text") val normalizedText: String,
)

@Entity(tableName = "tafsir_sources")
data class TafsirSourceEntity(
    @PrimaryKey val id: String,
    @ColumnInfo(name = "display_name") val displayName: String,
    val author: String,
    val language: String,
    val publisher: String,
    @ColumnInfo(name = "source_url") val sourceUrl: String,
    @ColumnInfo(name = "license_name") val licenseName: String,
    @ColumnInfo(name = "license_url") val licenseUrl: String,
    val version: String,
    @ColumnInfo(name = "retrieved_at") val retrievedAt: String,
)

@Entity(
    tableName = "tafsir_entries",
    foreignKeys = [
        ForeignKey(
            entity = TafsirSourceEntity::class,
            parentColumns = ["id"],
            childColumns = ["source_id"],
            onDelete = ForeignKey.CASCADE,
        ),
    ],
    indices = [
        Index(value = ["source_id"]),
        Index(value = ["source_id", "sura", "aya_from", "aya_to"], unique = true),
        Index(value = ["sura", "aya_from", "aya_to"]),
    ],
)
data class TafsirEntryEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    @ColumnInfo(name = "source_id") val sourceId: String,
    val sura: Int,
    @ColumnInfo(name = "aya_from") val ayaFrom: Int,
    @ColumnInfo(name = "aya_to") val ayaTo: Int,
    val text: String,
    @ColumnInfo(name = "normalized_text") val normalizedText: String,
    val volume: String? = null,
    val page: String? = null,
    val reference: String? = null,
)

@Entity(tableName = "hadith_sources")
data class HadithSourceEntity(
    @PrimaryKey val id: String,
    @ColumnInfo(name = "display_name") val displayName: String,
    val tradition: String,
    @ColumnInfo(name = "source_url") val sourceUrl: String,
    @ColumnInfo(name = "license_name") val licenseName: String,
    @ColumnInfo(name = "license_url") val licenseUrl: String,
    val version: String,
    @ColumnInfo(name = "retrieved_at") val retrievedAt: String,
)

@Entity(
    tableName = "hadith_entries",
    foreignKeys = [
        ForeignKey(
            entity = HadithSourceEntity::class,
            parentColumns = ["id"],
            childColumns = ["source_id"],
            onDelete = ForeignKey.CASCADE,
        ),
    ],
    indices = [Index(value = ["source_id"]), Index(value = ["book", "hadith_number"])],
)
data class HadithEntryEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    @ColumnInfo(name = "source_id") val sourceId: String,
    val book: String,
    val chapter: String? = null,
    val volume: String? = null,
    val page: String? = null,
    @ColumnInfo(name = "hadith_number") val hadithNumber: String,
    val narrator: String? = null,
    @ColumnInfo(name = "arabic_text") val arabicText: String,
    @ColumnInfo(name = "persian_translation") val persianTranslation: String? = null,
    @ColumnInfo(name = "normalized_text") val normalizedText: String,
    val grading: String? = null,
)

@Entity(
    tableName = "ayah_hadith_links",
    foreignKeys = [
        ForeignKey(
            entity = HadithEntryEntity::class,
            parentColumns = ["id"],
            childColumns = ["hadith_id"],
            onDelete = ForeignKey.CASCADE,
        ),
    ],
    indices = [Index(value = ["hadith_id"]), Index(value = ["sura", "aya"])],
)
data class AyahHadithLinkEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    @ColumnInfo(name = "hadith_id") val hadithId: Long,
    val sura: Int,
    val aya: Int,
    @ColumnInfo(name = "relation_type") val relationType: String,
    @ColumnInfo(name = "curation_status") val curationStatus: String,
)

@Entity(
    tableName = "ayah_relation_links",
    indices = [
        Index(value = ["source_sura", "source_aya"]),
        Index(value = ["target_sura", "target_aya"]),
    ],
)
data class AyahRelationLinkEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    @ColumnInfo(name = "source_sura") val sourceSura: Int,
    @ColumnInfo(name = "source_aya") val sourceAya: Int,
    @ColumnInfo(name = "target_sura") val targetSura: Int,
    @ColumnInfo(name = "target_aya") val targetAya: Int,
    @ColumnInfo(name = "relation_type") val relationType: String,
    val score: Double,
    @ColumnInfo(name = "evidence_source") val evidenceSource: String,
    @ColumnInfo(name = "curation_status") val curationStatus: String,
)

@Entity(tableName = "dua_sources")
data class DuaSourceEntity(
    @PrimaryKey val id: String,
    @ColumnInfo(name = "display_name") val displayName: String,
    @ColumnInfo(name = "source_url") val sourceUrl: String,
    @ColumnInfo(name = "license_name") val licenseName: String,
    @ColumnInfo(name = "license_url") val licenseUrl: String,
    val version: String,
    @ColumnInfo(name = "retrieved_at") val retrievedAt: String,
)

@Entity(
    tableName = "duas",
    foreignKeys = [
        ForeignKey(
            entity = DuaSourceEntity::class,
            parentColumns = ["id"],
            childColumns = ["source_id"],
            onDelete = ForeignKey.CASCADE,
        ),
    ],
    indices = [Index(value = ["source_id"]), Index(value = ["slug"], unique = true)],
)
data class DuaEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    @ColumnInfo(name = "source_id") val sourceId: String,
    val slug: String,
    @ColumnInfo(name = "display_name") val displayName: String,
    @ColumnInfo(name = "audio_url") val audioUrl: String? = null,
)

@Entity(
    tableName = "dua_lines",
    foreignKeys = [
        ForeignKey(
            entity = DuaEntity::class,
            parentColumns = ["id"],
            childColumns = ["dua_id"],
            onDelete = ForeignKey.CASCADE,
        ),
    ],
    indices = [Index(value = ["dua_id"]), Index(value = ["dua_id", "line_number"], unique = true)],
)
data class DuaLineEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    @ColumnInfo(name = "dua_id") val duaId: Long,
    @ColumnInfo(name = "line_number") val lineNumber: Int,
    @ColumnInfo(name = "arabic_text") val arabicText: String,
    @ColumnInfo(name = "persian_translation") val persianTranslation: String,
    @ColumnInfo(name = "normalized_text") val normalizedText: String,
)

@Entity(
    tableName = "ayah_dua_links",
    foreignKeys = [
        ForeignKey(
            entity = DuaLineEntity::class,
            parentColumns = ["id"],
            childColumns = ["dua_line_id"],
            onDelete = ForeignKey.CASCADE,
        ),
    ],
    indices = [Index(value = ["dua_line_id"]), Index(value = ["sura", "aya"])],
)
data class AyahDuaLinkEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    @ColumnInfo(name = "dua_line_id") val duaLineId: Long,
    val sura: Int,
    val aya: Int,
    @ColumnInfo(name = "relation_note") val relationNote: String,
    @ColumnInfo(name = "curation_status") val curationStatus: String,
)

@Entity(tableName = "minbar_topics", indices = [Index(value = ["parent_id"])])
data class MinbarTopicEntity(
    @PrimaryKey val id: String,
    @ColumnInfo(name = "parent_id") val parentId: String? = null,
    val title: String,
    val description: String? = null,
    @ColumnInfo(name = "sort_order") val sortOrder: Int,
)

@Entity(
    tableName = "minbar_outline_items",
    foreignKeys = [
        ForeignKey(
            entity = MinbarTopicEntity::class,
            parentColumns = ["id"],
            childColumns = ["topic_id"],
            onDelete = ForeignKey.CASCADE,
        ),
    ],
    indices = [Index(value = ["topic_id"]), Index(value = ["topic_id", "sort_order"], unique = true)],
)
data class MinbarOutlineItemEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    @ColumnInfo(name = "topic_id") val topicId: String,
    @ColumnInfo(name = "section_type") val sectionType: String,
    @ColumnInfo(name = "sort_order") val sortOrder: Int,
    val text: String,
    @ColumnInfo(name = "source_reference") val sourceReference: String,
    @ColumnInfo(name = "curation_status") val curationStatus: String,
)
