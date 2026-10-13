package ir.mansour.jamealtafasir
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

class MainActivity: ComponentActivity() {
 override fun onCreate(savedInstanceState: Bundle?) {
  super.onCreate(savedInstanceState)
  setContent { MansourApp() }
 }
}
@Composable fun MansourApp() {
 var page by remember { mutableIntStateOf(0) }
 val green = Color(0xFF073C2E)
 MaterialTheme(colorScheme=lightColorScheme(primary=green,secondary=Color(0xFFBE9A55))) {
  Scaffold(topBar={ Surface(color=green){ Text("جامع‌التفاسیر منصور",color=Color.White,modifier=Modifier.fillMaxWidth().padding(20.dp)) } },
   bottomBar={ NavigationBar { listOf("مطالعه","تفاسیر","درباره").forEachIndexed { i, name ->
    NavigationBarItem(selected=page==i,onClick={page=i},icon={Text("◈")},label={Text(name)})
   } } }) { padding ->
   Column(Modifier.padding(padding).padding(20.dp)) {
    when(page) {
     0 -> { Text("صفحه مطالعه",style=MaterialTheme.typography.headlineSmall)
      Spacer(Modifier.height(16.dp))
      Text("متن قرآن هنوز به منبع دارای مجوز و تأیید صحت متصل نشده است.")
      var expanded by remember { mutableStateOf(false) }
      Button(onClick={expanded=!expanded}) { Text(if(expanded) "بستن تفسیر" else "نمایش تفسیر") }
      if(expanded) Text("برای نمایش تفسیر، ابتدا بسته دارای مجوز معتبر نصب شود.")
     }
     1 -> { Text("کتابخانه تفاسیر",style=MaterialTheme.typography.headlineSmall)
      Text("هنوز هیچ بسته تفسیری نصب نشده است.") }
     else -> { Text("درباره برنامه",style=MaterialTheme.typography.headlineSmall)
      Text("نسخه ۲.۵.۰ آزمایشی؛ بدون داده‌های تفسیری دارای مجوز نامشخص.") }
    }
   }
  }
 }
}
