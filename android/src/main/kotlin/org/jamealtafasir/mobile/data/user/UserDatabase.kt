package org.jamealtafasir.mobile.data.user

import androidx.room3.Database
import androidx.room3.RoomDatabase

@Database(
    entities = [
        BookmarkCategoryEntity::class,
        BookmarkEntity::class,
        NoteEntity::class,
        ReadingPositionEntity::class,
        SearchHistoryEntity::class,
        NoteSearchFts::class,
    ],
    version = 1,
    exportSchema = true,
)
abstract class UserDatabase : RoomDatabase() {
    abstract fun userDao(): UserDao

    companion object {
        const val FILE_NAME = "mansour_user.db"
    }
}
