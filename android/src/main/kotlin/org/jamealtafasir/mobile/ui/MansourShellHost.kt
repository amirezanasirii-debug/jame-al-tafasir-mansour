package org.jamealtafasir.mobile.ui

import android.app.ActivityManager
import android.content.Context
import android.os.PowerManager
import android.provider.Settings
import android.webkit.WebView
import android.widget.FrameLayout
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.imePadding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.ComposeView
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.platform.ViewCompositionStrategy
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.viewinterop.AndroidView
import org.jamealtafasir.mobile.ui.designsystem.glass.GlassBottomNavigation
import org.jamealtafasir.mobile.ui.designsystem.glass.GlassModalDrawer
import org.jamealtafasir.mobile.ui.designsystem.glass.GlassNavigationItem
import org.jamealtafasir.mobile.ui.designsystem.glass.GlassTopBar
import org.jamealtafasir.mobile.ui.designsystem.glass.MansourGlassTheme
import org.json.JSONObject

private val bottomNavigationItems = listOf(
    GlassNavigationItem("home", "خانه", "⌂"),
    GlassNavigationItem("quran", "قرآن کریم", "▤"),
    GlassNavigationItem("library", "کتابخانه", "▥"),
    GlassNavigationItem("hadith", "احادیث مرتبط", "❞"),
    GlassNavigationItem("notes", "یادداشت‌ها", "✎"),
)

private val drawerItems = listOf(
    GlassNavigationItem("home", "خانه", "⌂"),
    GlassNavigationItem("quran", "قرآن کریم", "▤"),
    GlassNavigationItem("library", "کتابخانه", "▥"),
    GlassNavigationItem("similarity", "مطالعه مشابه", "⌗"),
    GlassNavigationItem("hadith", "احادیث مرتبط", "❞"),
    GlassNavigationItem("vocabulary", "واژه‌نامه", "文"),
    GlassNavigationItem("notes", "یادداشت‌ها", "✎"),
    GlassNavigationItem("saved", "نشان‌ها", "♧"),
    GlassNavigationItem("settings", "تنظیمات", "⚙"),
    GlassNavigationItem("support", "حمایت از توسعه", "♡"),
)

object MansourShellHost {
    @JvmStatic
    fun install(
        activity: ComponentActivity,
        parent: FrameLayout,
        webView: WebView,
    ) {
        val activityManager = activity.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
        val powerManager = activity.getSystemService(Context.POWER_SERVICE) as PowerManager
        val lowPerformanceMode = activityManager.isLowRamDevice || powerManager.isPowerSaveMode
        val reduceMotion = runCatching {
            Settings.Global.getFloat(
                activity.contentResolver,
                Settings.Global.ANIMATOR_DURATION_SCALE,
                1f,
            ) == 0f
        }.getOrDefault(false)
        val composeView = ComposeView(activity).apply {
            setViewCompositionStrategy(ViewCompositionStrategy.DisposeOnViewTreeLifecycleDestroyed)
            setContent {
                MansourShell(
                    webView = webView,
                    lowPerformanceMode = lowPerformanceMode,
                    reduceMotion = reduceMotion,
                )
            }
        }
        parent.addView(
            composeView,
            FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT,
            ),
        )
    }
}

@Composable
private fun MansourShell(
    webView: WebView,
    lowPerformanceMode: Boolean,
    reduceMotion: Boolean,
) {
    var darkTheme by rememberSaveable { mutableStateOf(true) }
    var drawerOpen by rememberSaveable { mutableStateOf(false) }
    var selectedId by rememberSaveable { mutableStateOf("home") }
    var query by rememberSaveable { mutableStateOf("") }

    fun dispatch(functionName: String, value: String? = null) {
        val argument = value?.let(JSONObject::quote) ?: ""
        val invocation = if (value == null) "$functionName()" else "$functionName($argument)"
        webView.evaluateJavascript("window.$invocation", null)
    }

    fun navigate(item: GlassNavigationItem) {
        selectedId = item.id
        drawerOpen = false
        dispatch("mansourNativeNavigate", item.id)
    }

    BackHandler(enabled = drawerOpen) { drawerOpen = false }

    CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Rtl) {
        MansourGlassTheme(
            darkTheme = darkTheme,
            lowPerformanceMode = lowPerformanceMode,
            reduceMotion = reduceMotion,
        ) {
            Box(Modifier.fillMaxSize()) {
                AndroidView(
                    factory = { webView },
                    modifier = Modifier.fillMaxSize(),
                )

                GlassTopBar(
                    query = query,
                    onQueryChange = { nextQuery ->
                        query = nextQuery
                        dispatch("mansourNativeSearch", nextQuery)
                    },
                    onMenuClick = { drawerOpen = true },
                    onThemeClick = {
                        darkTheme = !darkTheme
                        dispatch("mansourNativeToggleTheme")
                    },
                    darkTheme = darkTheme,
                    modifier = Modifier.align(Alignment.TopCenter),
                )

                GlassBottomNavigation(
                    items = bottomNavigationItems,
                    selectedId = selectedId,
                    onSelected = ::navigate,
                    modifier = Modifier.align(Alignment.BottomCenter).imePadding(),
                )

                GlassModalDrawer(
                    visible = drawerOpen,
                    items = drawerItems,
                    selectedId = selectedId,
                    onDismiss = { drawerOpen = false },
                    onSelected = ::navigate,
                )
            }
        }
    }
}
