package org.jamealtafasir.mobile.data.user

import androidx.room3.ColumnInfo
import androidx.room3.Entity
import androidx.room3.Fts4
import androidx.room3.PrimaryKey

@Fts4(contentEntity = NoteEntity::class, prefix = [2, 3, 4])
@Entity(tableName = "notes_search_fts")
data class NoteSearchFts(
    @PrimaryKey @ColumnInfo(name = "rowid") val rowId: Long,
    @ColumnInfo(name = "plain_text") val plainText: String,
)
