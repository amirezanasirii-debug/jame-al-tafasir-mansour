# Web content is local. Keep Android callbacks and the limited document/clipboard
# bridge methods that are reached by the framework rather than direct Java calls.
-keepclassmembers class * extends android.app.Activity {
    public void *(android.view.View);
}

-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile


-keepclassmembers class * { @android.webkit.JavascriptInterface <methods>; }
