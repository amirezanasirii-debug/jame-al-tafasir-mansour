package org.jamealtafasir.mobile.data.user

import androidx.room3.ColumnInfo
import androidx.room3.Entity
import androidx.room3.ForeignKey
import androidx.room3.Index
import androidx.room3.PrimaryKey

@Entity(tableName = "bookmark_categories", indices = [Index(value = ["name"], unique = true)])
data class BookmarkCategoryEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val name: String,
    val color: Long,
    @ColumnInfo(name = "sort_order") val sortOrder: Int,
    @ColumnInfo(name = "created_at") val createdAt: Long,
)

@Entity(
    tableName = "bookmarks",
    foreignKeys = [
        ForeignKey(
            entity = BookmarkCategoryEntity::class,
            parentColumns = ["id"],
            childColumns = ["category_id"],
            onDelete = ForeignKey.SET_NULL,
        ),
    ],
    indices = [
        Index(value = ["category_id"]),
        Index(value = ["sura", "aya"], unique = true),
        Index(value = ["created_at"]),
    ],
)
data class BookmarkEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val sura: Int,
    val aya: Int,
    @ColumnInfo(name = "category_id") val categoryId: Long? = null,
    @ColumnInfo(name = "created_at") val createdAt: Long,
)

@Entity(
    tableName = "notes",
    indices = [Index(value = ["sura", "aya"]), Index(value = ["updated_at"])],
)
data class NoteEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val sura: Int? = null,
    val aya: Int? = null,
    val title: String,
    @ColumnInfo(name = "plain_text") val plainText: String,
    @ColumnInfo(name = "rich_text_json") val richTextJson: String,
    val tags: String,
    @ColumnInfo(name = "source_snapshot_json") val sourceSnapshotJson: String? = null,
    @ColumnInfo(name = "created_at") val createdAt: Long,
    @ColumnInfo(name = "updated_at") val updatedAt: Long,
)

@Entity(tableName = "reading_position")
data class ReadingPositionEntity(
    @PrimaryKey val id: Int = SINGLETON_ID,
    val sura: Int,
    val aya: Int,
    val page: Int,
    @ColumnInfo(name = "scroll_offset") val scrollOffset: Int,
    @ColumnInfo(name = "updated_at") val updatedAt: Long,
) {
    companion object {
        const val SINGLETON_ID = 1
    }
}

@Entity(
    tableName = "search_history",
    indices = [Index(value = ["normalized_query"], unique = true), Index(value = ["searched_at"])],
)
data class SearchHistoryEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val query: String,
    @ColumnInfo(name = "normalized_query") val normalizedQuery: String,
    val scope: String,
    @ColumnInfo(name = "searched_at") val searchedAt: Long,
)
