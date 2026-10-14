package org.jamealtafasir.mobile.ui.designsystem.glass

import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

@Composable
fun GlassCard(
    modifier: Modifier = Modifier,
    contentPadding: PaddingValues = PaddingValues(18.dp),
    tint: Color = Emerald700,
    content: @Composable () -> Unit,
) {
    GlassSurface(
        modifier = modifier,
        shape = RoundedCornerShape(26.dp),
        tint = tint,
        transparency = 0.38f,
        blurRadius = 22.dp,
        shadowElevation = 14.dp,
        contentPadding = contentPadding,
        content = content,
    )
}
