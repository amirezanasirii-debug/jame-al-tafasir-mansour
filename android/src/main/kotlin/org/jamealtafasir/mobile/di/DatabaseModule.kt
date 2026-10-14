package org.jamealtafasir.mobile.di

import android.content.Context
import androidx.room3.Room
import androidx.sqlite.driver.bundled.BundledSQLiteDriver
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton
import org.jamealtafasir.mobile.data.content.ContentDao
import org.jamealtafasir.mobile.data.content.ContentDatabase
import org.jamealtafasir.mobile.data.user.UserDao
import org.jamealtafasir.mobile.data.user.UserDatabase

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {
    @Provides
    @Singleton
    fun provideContentDatabase(@ApplicationContext context: Context): ContentDatabase =
        Room.databaseBuilder(context, ContentDatabase::class.java, ContentDatabase.FILE_NAME)
            .setDriver(BundledSQLiteDriver())
            .build()

    @Provides
    fun provideContentDao(database: ContentDatabase): ContentDao = database.contentDao()

    @Provides
    @Singleton
    fun provideUserDatabase(@ApplicationContext context: Context): UserDatabase =
        Room.databaseBuilder(context, UserDatabase::class.java, UserDatabase.FILE_NAME)
            .setDriver(BundledSQLiteDriver())
            .build()

    @Provides
    fun provideUserDao(database: UserDatabase): UserDao = database.userDao()
}
