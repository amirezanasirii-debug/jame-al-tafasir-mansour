package org.jamealtafasir.mobile.ui.designsystem.glass

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun GlassTopBar(
    query: String,
    onQueryChange: (String) -> Unit,
    onMenuClick: () -> Unit,
    onThemeClick: () -> Unit,
    darkTheme: Boolean,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 10.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        GlassButton(onClick = onMenuClick) {
            Text(text = "☰", color = MaterialTheme.colorScheme.onSurface, fontSize = 21.sp)
        }
        GlassSearchField(
            value = query,
            onValueChange = onQueryChange,
            modifier = Modifier.weight(1f),
        )
        GlassButton(onClick = onThemeClick) {
            Text(
                text = if (darkTheme) "☀" else "☾",
                color = if (darkTheme) Gold500 else MaterialTheme.colorScheme.onSurface,
                fontSize = 20.sp,
            )
        }
    }
}
