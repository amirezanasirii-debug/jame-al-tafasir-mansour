package org.jamealtafasir.mobile.data.user

import androidx.room3.Dao
import androidx.room3.Delete
import androidx.room3.Insert
import androidx.room3.OnConflictStrategy
import androidx.room3.Query
import androidx.room3.Update

@Dao
interface UserDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertCategory(category: BookmarkCategoryEntity): Long

    @Query("SELECT * FROM bookmark_categories ORDER BY sort_order, created_at")
    suspend fun categories(): List<BookmarkCategoryEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertBookmark(bookmark: BookmarkEntity): Long

    @Delete
    suspend fun deleteBookmark(bookmark: BookmarkEntity)

    @Query("SELECT * FROM bookmarks ORDER BY created_at DESC")
    suspend fun bookmarks(): List<BookmarkEntity>

    @Query("SELECT * FROM bookmarks WHERE sura = :sura AND aya = :aya LIMIT 1")
    suspend fun bookmark(sura: Int, aya: Int): BookmarkEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertNote(note: NoteEntity): Long

    @Update
    suspend fun updateNote(note: NoteEntity)

    @Delete
    suspend fun deleteNote(note: NoteEntity)

    @Query("SELECT * FROM notes ORDER BY updated_at DESC")
    suspend fun notes(): List<NoteEntity>

    @Query("SELECT * FROM notes WHERE sura = :sura AND aya = :aya ORDER BY updated_at DESC")
    suspend fun notesForAyah(sura: Int, aya: Int): List<NoteEntity>

    @Query(
        """
        SELECT n.* FROM notes_search_fts AS f
        JOIN notes AS n ON n.id = f.rowid
        WHERE notes_search_fts MATCH :matchQuery
        ORDER BY n.updated_at DESC
        LIMIT :limit
        """,
    )
    suspend fun searchNotes(matchQuery: String, limit: Int): List<NoteEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun saveReadingPosition(position: ReadingPositionEntity)

    @Query("SELECT * FROM reading_position WHERE id = 1")
    suspend fun readingPosition(): ReadingPositionEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun saveSearch(search: SearchHistoryEntity): Long

    @Query("SELECT * FROM search_history ORDER BY searched_at DESC LIMIT :limit")
    suspend fun recentSearches(limit: Int): List<SearchHistoryEntity>

    @Query("DELETE FROM search_history")
    suspend fun clearSearchHistory()
}
