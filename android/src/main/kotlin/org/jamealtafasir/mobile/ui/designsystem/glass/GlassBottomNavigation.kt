package org.jamealtafasir.mobile.ui.designsystem.glass

import androidx.compose.animation.AnimatedContent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

data class GlassNavigationItem(
    val id: String,
    val label: String,
    val symbol: String,
)

@Composable
fun GlassBottomNavigation(
    items: List<GlassNavigationItem>,
    selectedId: String,
    onSelected: (GlassNavigationItem) -> Unit,
    modifier: Modifier = Modifier,
) {
    GlassSurface(
        modifier = modifier.fillMaxWidth().padding(horizontal = 10.dp, vertical = 8.dp),
        transparency = 0.48f,
        blurRadius = 30.dp,
        shadowElevation = 22.dp,
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 4.dp, vertical = 5.dp),
            horizontalArrangement = Arrangement.SpaceEvenly,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            items.forEach { item ->
                val selected = selectedId == item.id
                GlassButton(
                    onClick = { onSelected(item) },
                    selected = selected,
                    modifier = Modifier.weight(1f).padding(horizontal = 2.dp),
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        AnimatedContent(targetState = selected, label = "bottom-nav-icon") { active ->
                            Text(
                                text = item.symbol,
                                color = if (active) Gold500 else MaterialTheme.colorScheme.onSurface,
                                fontSize = if (active) 20.sp else 18.sp,
                            )
                        }
                        Text(
                            text = item.label,
                            color = if (selected) Gold500 else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.82f),
                            fontSize = 8.sp,
                            fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal,
                            maxLines = 1,
                        )
                    }
                }
            }
        }
    }
}
