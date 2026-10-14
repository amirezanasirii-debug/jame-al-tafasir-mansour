package org.jamealtafasir.mobile.data.content

import androidx.room3.Database
import androidx.room3.RoomDatabase

@Database(
    entities = [
        QuranVerseEntity::class,
        TranslationSourceEntity::class,
        TranslationEntryEntity::class,
        TafsirSourceEntity::class,
        TafsirEntryEntity::class,
        HadithSourceEntity::class,
        HadithEntryEntity::class,
        AyahHadithLinkEntity::class,
        AyahRelationLinkEntity::class,
        DuaSourceEntity::class,
        DuaEntity::class,
        DuaLineEntity::class,
        AyahDuaLinkEntity::class,
        MinbarTopicEntity::class,
        MinbarOutlineItemEntity::class,
        QuranSearchFts::class,
        TranslationSearchFts::class,
        TafsirSearchFts::class,
        HadithSearchFts::class,
        DuaSearchFts::class,
    ],
    version = 1,
    exportSchema = true,
)
abstract class ContentDatabase : RoomDatabase() {
    abstract fun contentDao(): ContentDao

    companion object {
        const val FILE_NAME = "mansour_content.db"
    }
}
