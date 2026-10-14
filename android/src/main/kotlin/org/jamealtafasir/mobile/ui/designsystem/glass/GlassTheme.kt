package org.jamealtafasir.mobile.ui.designsystem.glass

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color

val Emerald900 = Color(0xFF0B3B34)
val Emerald700 = Color(0xFF145749)
val Emerald500 = Color(0xFF237562)
val Gold500 = Color(0xFFE8C46A)
val Gold700 = Color(0xFFB99549)
val CreamPaper = Color(0xFFF6EFDC)
val SurfaceLight = Color(0xFFFAF8F3)
val SurfaceDark = Color(0xFF102D29)

data class GlassConfiguration(
    val darkTheme: Boolean,
    val lowPerformanceMode: Boolean,
    val reduceMotion: Boolean,
)

val LocalGlassConfiguration = staticCompositionLocalOf {
    GlassConfiguration(darkTheme = true, lowPerformanceMode = false, reduceMotion = false)
}

private val DarkColors = darkColorScheme(
    primary = Gold500,
    onPrimary = Emerald900,
    secondary = Emerald500,
    background = Emerald900,
    onBackground = Color(0xFFFFFAF0),
    surface = SurfaceDark,
    onSurface = Color(0xFFFFFAF0),
)

private val LightColors = lightColorScheme(
    primary = Emerald700,
    onPrimary = Color.White,
    secondary = Gold700,
    background = SurfaceLight,
    onBackground = Emerald900,
    surface = SurfaceLight,
    onSurface = Emerald900,
)

@Composable
fun MansourGlassTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    lowPerformanceMode: Boolean = false,
    reduceMotion: Boolean = false,
    content: @Composable () -> Unit,
) {
    CompositionLocalProvider(
        LocalGlassConfiguration provides GlassConfiguration(
            darkTheme = darkTheme,
            lowPerformanceMode = lowPerformanceMode,
            reduceMotion = reduceMotion,
        ),
    ) {
        MaterialTheme(
            colorScheme = if (darkTheme) DarkColors else LightColors,
            content = content,
        )
    }
}
