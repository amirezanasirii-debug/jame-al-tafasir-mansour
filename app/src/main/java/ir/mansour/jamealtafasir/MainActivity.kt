package ir.mansour.jamealtafasir

import android.os.Bundle
import android.net.Uri
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import ir.mansour.jamealtafasir.data.TafsirRepository
import ir.mansour.jamealtafasir.data.TafsirEntry

private val Green=Color(0xFF073C2E)
class MainActivity: ComponentActivity() {
 override fun onCreate(savedInstanceState: Bundle?) { super.onCreate(savedInstanceState); setContent { MansourApp() } }
}
@Composable fun MansourApp() {
 val context=LocalContext.current
 val repository=remember { TafsirRepository(context) }
 var page by remember { mutableIntStateOf(0) }
 var refresh by remember { mutableIntStateOf(0) }
 var message by remember { mutableStateOf("") }
 val picker=rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri:Uri? ->
  if(uri!=null) {
   try { val count=repository.importPackage(uri); message="تعداد $count رکورد وارد شد"; refresh++ }
   catch(e:Exception) { message="خطا در بسته: ${e.message}" }
  }
 }
 MaterialTheme(colorScheme=lightColorScheme(primary=Green,secondary=Color(0xFFBE9A55))) {
  Scaffold(topBar={ Surface(color=Green) { Text("جامع‌التفاسیر منصور",color=Color.White,textAlign=TextAlign.Center,modifier=Modifier.fillMaxWidth().padding(20.dp)) } },
   bottomBar={ NavigationBar { listOf("مطالعه","جستجو","کتابخانه","درباره").forEachIndexed { i,label ->
    NavigationBarItem(selected=page==i,onClick={page=i},icon={Text("◈")},label={Text(label)})
   } } }) { inset ->
   Column(Modifier.fillMaxSize().padding(inset).padding(16.dp)) {
    if(message.isNotBlank()) Text(message,color=Green)
    when(page) {
     0 -> VerseScreen(repository,refresh)
     1 -> SearchScreen(repository,refresh)
     2 -> {
      Text("کتابخانه تفاسیر",style=MaterialTheme.typography.headlineSmall)
      Spacer(Modifier.height(12.dp))
      Button(onClick={picker.launch(arrayOf("application/octet-stream","application/x-sqlite3","*/*"))}) { Text("وارد کردن بسته SQLite دارای مجوز") }
      val sources=remember(refresh) { repository.sources() }
      if(sources.isEmpty()) Text("هنوز هیچ منبعی نصب نشده است.")
      sources.forEach { Text("${it.name} — ${it.author} — مجوز: ${it.license}",modifier=Modifier.padding(8.dp)) }
     }
     else -> {
      Text("درباره جامع‌التفاسیر منصور",style=MaterialTheme.typography.headlineSmall)
      Text("نسخه ۲.۵.۰ توسعه‌ای. داده قرآن یا تفسیر بدون مجوز توزیع نمی‌شود.")
      Text("بسته‌ها باید دارای اطلاعات منبع، ناشر و مجوز قابل بررسی باشند.")
     }
    }
   }
  }
 }
}
@Composable private fun VerseScreen(repository:TafsirRepository,refresh:Int) {
 var sura by remember { mutableStateOf("1") }
 var aya by remember { mutableStateOf("1") }
 var entries by remember { mutableStateOf(emptyList<TafsirEntry>()) }
 Text("مطالعه تفسیر آیه",style=MaterialTheme.typography.headlineSmall)
 Row(horizontalArrangement=Arrangement.spacedBy(8.dp)) {
  OutlinedTextField(sura,onValueChange={sura=it.filter(Char::isDigit).take(3)},label={Text("سوره")},modifier=Modifier.weight(1f))
  OutlinedTextField(aya,onValueChange={aya=it.filter(Char::isDigit).take(3)},label={Text("آیه")},modifier=Modifier.weight(1f))
 }
 Button(onClick={ entries=try { repository.entries(sura.toInt(),aya.toInt()) } catch(e:Exception) { emptyList() } }) { Text("نمایش تفاسیر") }
 if(entries.isEmpty()) Text("تفسیری برای این آیه بارگذاری نشده است.")
 EntryList(entries)
}
@Composable private fun SearchScreen(repository:TafsirRepository,refresh:Int) {
 var query by remember { mutableStateOf("") }
 var results by remember { mutableStateOf(emptyList<TafsirEntry>()) }
 Text("جستجو در تفاسیر",style=MaterialTheme.typography.headlineSmall)
 OutlinedTextField(value=query,onValueChange={query=it},label={Text("عبارت جستجو")},modifier=Modifier.fillMaxWidth())
 Button(onClick={results=try { repository.search(query) } catch(e:Exception) { emptyList() } }) { Text("جستجو") }
 EntryList(results)
}
@Composable private fun EntryList(entries:List<TafsirEntry>) {
 LazyColumn(verticalArrangement=Arrangement.spacedBy(8.dp)) {
  items(entries) { e ->
   Card(Modifier.fillMaxWidth()) {
    Column(Modifier.padding(14.dp)) {
     Text("${e.source} — سوره ${e.sura}، آیات ${e.from} تا ${e.to}",color=Green)
     Text(e.text)
    }
   }
  }
 }
}
