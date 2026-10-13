# Web content is local and no JavaScript interface is exposed. Keep only Android
# callbacks that are reached by the framework rather than direct Java calls.
-keepclassmembers class * extends android.app.Activity {
    public void *(android.view.View);
}

-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

