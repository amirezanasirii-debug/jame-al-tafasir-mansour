package org.jamealtafasir.mobile;

import android.content.Context;
import android.net.Uri;
import org.json.*;
import java.io.*;
import java.security.MessageDigest;
import java.util.*;
import java.util.zip.*;

/** Only SHA256-pinned, data-only packs shipped in the asset catalog are accepted. */
final class BookPackStore {
 interface Progress { void send(JSONObject data); }
 private final Context context; private final File root; private final Progress progress;
 volatile boolean busy;
 BookPackStore(Context context,Progress progress){this.context=context;this.progress=progress;root=new File(context.getFilesDir(),"installed-full-books");}
 private JSONArray catalog() throws Exception {try(InputStream in=context.getAssets().open("full-books/packs.json")){return new JSONObject(new String(read(in,8000000),"UTF-8")).getJSONArray("packs");}}
 private static byte[] read(InputStream in,int max)throws Exception{ByteArrayOutputStream out=new ByteArrayOutputStream();byte[] b=new byte[65536];int n;while((n=in.read(b))!=-1){if(out.size()+n>max)throw new IOException("Size limit exceeded");out.write(b,0,n);}return out.toByteArray();}
 private static String hex(byte[] b){StringBuilder s=new StringBuilder();for(byte v:b)s.append(String.format(java.util.Locale.ROOT,"%02x",v&255));return s.toString();}
 private boolean installed(JSONObject p){try(InputStream in=new FileInputStream(new File(new File(root,p.getString("id")),"installed.json"))){return new JSONObject(new String(read(in,4096),"UTF-8")).getString("sha256").equals(p.getString("sha256"));}catch(Exception e){return false;}}
 synchronized String status(){JSONObject result=new JSONObject();JSONArray list=new JSONArray();try{JSONArray all=catalog();for(int i=0;i<all.length();i++){JSONObject p=all.getJSONObject(i);list.put(new JSONObject().put("id",p.getString("id")).put("installed",installed(p)));}result.put("packs",list).put("busy",busy);}catch(Exception e){try{result.put("packs",list).put("busy",busy);}catch(Exception ignored){}}return result.toString();}
 private static boolean valid(String p){return p.matches("[a-zA-Z0-9_/-]+\\.(?:json(?:\\.gz)?|jpe?g|png|gif|webp|bmp)")&&!p.startsWith("/")&&!p.contains("//")&&!p.contains("..");}
 File resolve(String p){if(!valid(p))return null;try{JSONArray all=catalog();for(int i=0;i<all.length();i++){JSONObject item=all.getJSONObject(i);if(!installed(item))continue;File f=new File(new File(new File(root,item.getString("id")),"files"),p);if(f.isFile())return f;}}catch(Exception ignored){}return null;}
 void emit(String state,String id,String message,int files,int total){try{JSONObject d=new JSONObject().put("state",state).put("files",files).put("total",total);if(id!=null)d.put("id",id);if(message!=null)d.put("message",message);progress.send(d);}catch(Exception ignored){}}
 synchronized boolean reserve(){if(busy)return false;busy=true;return true;}
 void cancel(){busy=false;emit("cancelled",null,null,0,0);}
 void importUri(Uri uri){File temp=null,stage=null;try{
  emit("verifying",null,null,0,0);root.mkdirs();temp=File.createTempFile("bookpack-",".zip",context.getCacheDir());MessageDigest sha=MessageDigest.getInstance("SHA-256");long bytes=0;byte[] buffer=new byte[65536];
  try(InputStream in=context.getContentResolver().openInputStream(uri);OutputStream out=new FileOutputStream(temp)){if(in==null)throw new IOException("Cannot open selected file");int n;while((n=in.read(buffer))!=-1){bytes+=n;if(bytes>1900000000L)throw new IOException("Pack too large");sha.update(buffer,0,n);out.write(buffer,0,n);}}
  String digest=hex(sha.digest());JSONObject item=null;JSONArray all=catalog();for(int i=0;i<all.length();i++){JSONObject p=all.getJSONObject(i);if(digest.equals(p.getString("sha256"))&&bytes==p.getLong("bytes"))item=p;}if(item==null)throw new IOException("Unknown or damaged book pack");String id=item.getString("id");if(!id.matches("[a-zA-Z0-9_-]+"))throw new IOException("Invalid pack id");if(installed(item)){busy=false;emit("complete",id,null,0,0);return;}
  stage=new File(root,".staging-"+UUID.randomUUID());if(!stage.mkdirs())throw new IOException("Cannot create staging folder");
  try(ZipInputStream zip=new ZipInputStream(new BufferedInputStream(new FileInputStream(temp)))){
   ZipEntry entry=zip.getNextEntry();if(entry==null||!entry.getName().equals("pack.json")||entry.getMethod()!=ZipEntry.STORED)throw new IOException("Missing pack manifest");JSONObject manifest=new JSONObject(new String(read(zip,33554432),"UTF-8"));if(!"mansour-book-pack-v1".equals(manifest.getString("format"))||!id.equals(manifest.getString("id")))throw new IOException("Invalid manifest");JSONArray files=manifest.getJSONArray("files");if(files.length()>100000)throw new IOException("Too many files");Map<String,JSONObject> expected=new HashMap<>();for(int i=0;i<files.length();i++){JSONObject f=files.getJSONObject(i);String p=f.getString("path");long size=f.getLong("size");if(!valid(p)||expected.containsKey(p)||size<0||size>33554432||!f.getString("sha256").matches("[a-f0-9]{64}"))throw new IOException("Invalid entry");expected.put(p,f);}
   int count=0;long expanded=0;while((entry=zip.getNextEntry())!=null){String p=entry.getName();JSONObject spec=expected.remove(p);if(spec==null||entry.isDirectory()||entry.getMethod()!=ZipEntry.STORED)throw new IOException("Unexpected ZIP entry");File dest=new File(new File(stage,"files"),p);if(!dest.getCanonicalPath().startsWith(stage.getCanonicalPath()+File.separator))throw new IOException("Unsafe path");dest.getParentFile().mkdirs();MessageDigest h=MessageDigest.getInstance("SHA-256");long size=0;try(OutputStream out=new FileOutputStream(dest)){int n;while((n=zip.read(buffer))!=-1){size+=n;expanded+=n;if(size>spec.getLong("size")||expanded>1900000000L)throw new IOException("Invalid file size");h.update(buffer,0,n);out.write(buffer,0,n);}}if(size!=spec.getLong("size")||!hex(h.digest()).equals(spec.getString("sha256")))throw new IOException("File integrity mismatch");count++;if(count%100==0)emit("extracting",id,null,count,files.length());}if(!expected.isEmpty())throw new IOException("Incomplete book pack");
  }
  try(OutputStream out=new FileOutputStream(new File(stage,"installed.json"))){out.write(new JSONObject().put("id",id).put("sha256",digest).toString().getBytes("UTF-8"));}
  File destination=new File(root,id);if(destination.exists()||!stage.renameTo(destination))throw new IOException("Cannot commit book pack");stage=null;busy=false;emit("complete",id,null,0,0);
 }catch(Exception e){emit("error",null,e.getMessage(),0,0);}finally{if(temp!=null)temp.delete();if(stage!=null)delete(stage);busy=false;}}
 private static void delete(File f){File[] children=f.listFiles();if(children!=null)for(File child:children)delete(child);f.delete();}
}
