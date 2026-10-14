package org.jamealtafasir.mobile.ui.designsystem.glass

import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring

const val GlassMotionDurationMillis = 220

fun <T> glassSpring() = spring<T>(
    dampingRatio = Spring.DampingRatioNoBouncy,
    stiffness = Spring.StiffnessMediumLow,
)
