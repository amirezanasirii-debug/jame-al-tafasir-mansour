package org.jamealtafasir.mobile.ui.designsystem.glass

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun GlassModalDrawer(
    visible: Boolean,
    items: List<GlassNavigationItem>,
    selectedId: String,
    onDismiss: () -> Unit,
    onSelected: (GlassNavigationItem) -> Unit,
    modifier: Modifier = Modifier,
) {
    AnimatedVisibility(
        visible = visible,
        modifier = modifier.fillMaxSize(),
        enter = fadeIn(),
        exit = fadeOut(),
    ) {
        Box(Modifier.fillMaxSize()) {
            Box(
                Modifier.fillMaxSize()
                    .background(Color(0x99001410))
                    .clickable(onClick = onDismiss),
            )
            AnimatedVisibility(
                visible = visible,
                modifier = Modifier.align(Alignment.CenterEnd),
                enter = slideInHorizontally(initialOffsetX = { it }),
                exit = slideOutHorizontally(targetOffsetX = { it }),
            ) {
                GlassSurface(
                    modifier = Modifier.fillMaxHeight().fillMaxWidth(0.88f).widthIn(max = 360.dp),
                    transparency = 0.72f,
                    blurRadius = 34.dp,
                    shadowElevation = 28.dp,
                    contentPadding = androidx.compose.foundation.layout.PaddingValues(18.dp),
                ) {
                    Column(
                        modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                        ) {
                            GlassButton(onClick = onDismiss) { Text("×", fontSize = 25.sp) }
                            Column(modifier = Modifier.weight(1f), horizontalAlignment = Alignment.End) {
                                Text(
                                    text = "جامع التفاسیر منصور",
                                    color = MaterialTheme.colorScheme.onSurface,
                                    fontSize = 18.sp,
                                    fontWeight = FontWeight.Bold,
                                )
                                Text(
                                    text = "پژوهش و مطالعه قرآن",
                                    color = Gold500,
                                    fontSize = 11.sp,
                                )
                            }
                            Text(text = "۞", color = Gold500, fontSize = 34.sp)
                        }
                        Spacer(Modifier.height(4.dp))
                        items.forEach { item ->
                            GlassButton(
                                onClick = { onSelected(item) },
                                selected = selectedId == item.id,
                                modifier = Modifier.fillMaxWidth(),
                            ) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                                ) {
                                    Text(text = item.symbol, color = Gold500, fontSize = 20.sp)
                                    Text(
                                        text = item.label,
                                        modifier = Modifier.weight(1f),
                                        color = MaterialTheme.colorScheme.onSurface,
                                        fontSize = 14.sp,
                                        fontWeight = if (selectedId == item.id) FontWeight.Bold else FontWeight.Normal,
                                    )
                                    Text(text = "‹", color = MaterialTheme.colorScheme.onSurface, fontSize = 20.sp)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
