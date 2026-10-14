package org.jamealtafasir.mobile.ui.designsystem.glass

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/**
 * Lightweight layered-glass surface.
 *
 * Compose cannot sample pixels behind an arbitrary AndroidView without an
 * additional capture pipeline. This component therefore implements the safe
 * fallback requested by the design specification: translucent tint, dynamic
 * gradients, a specular border and a soft shadow. It never blurs its children.
 */
@Composable
fun GlassSurface(
    modifier: Modifier = Modifier,
    shape: Shape = RoundedCornerShape(28.dp),
    tint: Color = Emerald700,
    transparency: Float = 0.34f,
    blurRadius: Dp = 24.dp,
    borderGradient: Brush = Brush.linearGradient(
        colors = listOf(
            Color.White.copy(alpha = 0.48f),
            Gold500.copy(alpha = 0.42f),
            Color.White.copy(alpha = 0.12f),
        ),
    ),
    shadowElevation: Dp = 16.dp,
    contentPadding: PaddingValues = PaddingValues(0.dp),
    enabled: Boolean = true,
    content: @Composable () -> Unit,
) {
    val configuration = LocalGlassConfiguration.current
    val requestedHaze = (blurRadius.value / 80f).coerceIn(0.06f, 0.34f)
    val performanceFactor = if (configuration.lowPerformanceMode) 0.62f else 1f
    val alpha = if (enabled) transparency.coerceIn(0.08f, 0.92f) else 0.18f
    val glassBrush = Brush.linearGradient(
        colors = listOf(
            Color.White.copy(alpha = requestedHaze * performanceFactor),
            tint.copy(alpha = alpha),
            Emerald900.copy(alpha = (alpha + 0.16f).coerceAtMost(0.92f)),
        ),
    )

    Box(
        modifier = modifier
            .shadow(shadowElevation, shape, clip = false)
            .clip(shape)
            .background(glassBrush)
            .border(BorderStroke(1.dp, borderGradient), shape)
            .padding(contentPadding),
    ) {
        content()
    }
}
