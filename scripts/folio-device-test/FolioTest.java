package org.jamealtafasir.uitest;

import android.app.Activity;
import android.app.Instrumentation;
import android.content.Intent;
import android.graphics.Bitmap;
import android.os.Bundle;
import android.os.SystemClock;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebView;
import java.io.File;
import java.io.FileOutputStream;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.json.JSONArray;
import org.json.JSONObject;

public final class FolioTest extends Instrumentation {
    private WebView web;
    @Override public void onCreate(Bundle args) { super.onCreate(args); start(); }
    private WebView findWeb(View view) {
        if (view instanceof WebView) return (WebView)view;
        if (view instanceof ViewGroup) {
            ViewGroup group=(ViewGroup)view;
            for (int i=0;i<group.getChildCount();i++) {
                WebView found=findWeb(group.getChildAt(i));
                if(found!=null)return found;
            }
        }
        return null;
    }
    private String js(String expression) throws Exception {
        AtomicReference<String> value=new AtomicReference<>();
        CountDownLatch done=new CountDownLatch(1);
        String script="(()=>{try{return String("+expression+")}catch(e){return 'FAIL '+e.stack}})()";
        runOnMainSync(()-> web.evaluateJavascript(script,result->{value.set(result);done.countDown();}));
        if(!done.await(10,TimeUnit.SECONDS))throw new Exception("WebView timeout: "+expression);
        String text=new JSONArray("["+value.get()+"]").getString(0);
        if(text.startsWith("FAIL "))throw new Exception(text);
        return text;
    }
    private void require(String expression) throws Exception {
        if(!"true".equals(js(expression)))throw new Exception(expression);
    }
    private void language(String locale) throws Exception {
        String id=JSONObject.quote(locale);
        js("(()=>{const select=document.querySelector('[data-interface-locale]');select.value="+id+";select.dispatchEvent(new Event('change'));return true})()");
        require("document.documentElement.lang==="+id);
        require("document.documentElement.dir==='"+(locale.equals("en")?"ltr":"rtl")+"'");
    }
    private void picture(File dir,String name) throws Exception {
        Bitmap bitmap=getUiAutomation().takeScreenshot();
        if(bitmap==null)throw new Exception("Cannot capture "+name);
        try(FileOutputStream out=new FileOutputStream(new File(dir,name))){
            if(!bitmap.compress(Bitmap.CompressFormat.PNG,100,out))throw new Exception("Cannot save "+name);
        }finally{bitmap.recycle();}
    }
    @Override public void onStart() {
        Bundle report=new Bundle();
        try{
            Intent intent=getTargetContext().getPackageManager().getLaunchIntentForPackage(getTargetContext().getPackageName());
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            Activity activity=startActivitySync(intent);
            runOnMainSync(()->web=findWeb(activity.getWindow().getDecorView()));
            if(web==null)throw new Exception("WebView unavailable");
            for(int i=0;i<90&&!js("!!document.querySelector('[data-interface-locale]')").equals("true");i++)SystemClock.sleep(300);
            require("document.body.dataset.ready==='true'");
            File dir=getTargetContext().getExternalFilesDir("folio-qa");
            if(dir==null)throw new Exception("Screenshot directory unavailable");
            String snapshot="JSON.stringify(['surah','verse','translation','tafsir-one','nb-text'].map(id=>document.getElementById(id).value).concat(document.querySelector('#quran-text').textContent,document.querySelector('#audio').paused,document.querySelector('#audio').currentTime))";
            js("document.querySelector('[data-go=notebook]').click()");
            js("document.querySelector('#nb-new').click()");
            js("(()=>{const n=document.querySelector('#nb-text');n.value='مسودة — draft ۳';n.dispatchEvent(new Event('input'));n.focus();n.setSelectionRange(1,3);return true})()");
            String draft=js(snapshot);
            for(String loc:new String[]{"en","ar","fa-IR"}){
                language(loc);
                if(!draft.equals(js(snapshot)))throw new Exception("Locale changed research session");
                require("document.activeElement.id==='nb-text' && document.activeElement.selectionStart===1");
            }
            String[] views={"home","reader","notebook","search","settings"};
            String[] actions={".study-nav button",".folio-modes button","[data-go=notebook]","[data-command=source-search]","#nav [data-view=settings]"};
            JSONArray matrix=new JSONArray();
            for(String loc:new String[]{"fa-IR","en","ar"}){
                language(loc);
                for(String theme:new String[]{"ivory","sepia","midnight","amoled","high-contrast"}){
                    js("document.querySelector('[data-choice="+theme+"]').click()");
                    for(int size:new int[]{16,26}){
                        js("(()=>{const q=document.querySelector('#setting-font');q.value="+size+";q.dispatchEvent(new Event('input'));return true})()");
                        for(int i=0;i<views.length;i++){
                            js("document.querySelector("+JSONObject.quote(actions[i])+").click()");
                            SystemClock.sleep(220);
                            require("document.body.dataset.view==='"+(views[i].equals("search")?"library":views[i])+"'");
                            require("document.documentElement.scrollWidth<=innerWidth+1");
                            String file=loc+"-"+theme+"-"+size+"-"+views[i]+".png";
                            picture(dir,file);
                            matrix.put(new JSONObject().put("locale",loc).put("theme",theme).put("font",size).put("view",views[i]).put("image",file));
                        }
                    }
                }
            }
            try(FileOutputStream out=new FileOutputStream(new File(dir,"matrix.json"))){
                out.write(matrix.toString(2).getBytes(java.nio.charset.StandardCharsets.UTF_8));
            }
            report.putString("stream","MANSOUR_DEVICE_MATRIX_PASS "+matrix.length());
            finish(Activity.RESULT_OK,report);
        }catch(Throwable error){
            report.putString("stream",android.util.Log.getStackTraceString(error));finish(Activity.RESULT_CANCELED,report);
        }
    }
}
