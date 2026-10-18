package org.jamealtafasir.mobile;

import android.annotation.SuppressLint;
import android.webkit.JavascriptInterface;
import android.content.ClipData;
import android.content.ClipboardManager;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import android.app.Activity;
import android.app.AlertDialog;
import android.webkit.JsResult;
import android.content.Intent;
import android.content.res.AssetFileDescriptor;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.TextView;
import android.widget.Toast;
import android.window.OnBackInvokedCallback;
import android.window.OnBackInvokedDispatcher;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class MainActivity extends Activity {
    private static final String APP_HOST = "app.jame.invalid";
    private static final Pattern CHROME_VERSION = Pattern.compile("Chrome/(\\d+)");
    private static final Set<String> ALLOWED_EXTERNAL_URLS = new HashSet<>(Arrays.asList(
            "https://tanzil.net",
            "https://tanzil.net/docs/quran_metadata",
            "https://quranenc.com/fa/browse/persian_ih",
            "https://quranenc.com/ar/browse/arabic_moyassar"
    ));

    private WebView webView;
    private String pendingExport;
    private ValueCallback<Uri[]> fileCallback;
    private OnBackInvokedCallback backInvokedCallback;

    @Override
    public void onCreate(Bundle state) {
        super.onCreate(state);
        FrameLayout frame = new FrameLayout(this);
        frame.setBackgroundColor(Color.rgb(18, 62, 53));
        frame.setOnApplyWindowInsetsListener((view, insets) -> {
            view.setPadding(
                    insets.getSystemWindowInsetLeft(),
                    insets.getSystemWindowInsetTop(),
                    insets.getSystemWindowInsetRight(),
                    insets.getSystemWindowInsetBottom()
            );
            return insets.consumeSystemWindowInsets();
        });
        setContentView(frame);

        try {
            webView = new WebView(this);
        } catch (RuntimeException exception) {
            showFatalMessage(frame, R.string.webview_missing);
            return;
        }

        if (!configureWebView(webView, frame)) {
            return;
        }
        registerPredictiveBackCallback();
        frame.addView(webView, new FrameLayout.LayoutParams(-1, -1));
        webView.loadUrl("https://" + APP_HOST + "/research.html");
        frame.requestApplyInsets();
    }

    @SuppressLint("SetJavaScriptEnabled")
    private boolean configureWebView(WebView target, FrameLayout frame) {
        WebSettings settings = target.getSettings();
        String userAgent = settings.getUserAgentString();
        Matcher match = CHROME_VERSION.matcher(userAgent);
        if (!match.find() || Integer.parseInt(match.group(1)) < 111) {
            target.destroy();
            webView = null;
            showFatalMessage(frame, R.string.webview_too_old);
            return false;
        }

        // JavaScript is required by the bundled React application. Requests are
        // restricted to our synthetic HTTPS host and protected by the CSP below.
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setUserAgentString(
                userAgent + " JameAndroid/" + BuildConfig.VERSION_NAME
                        + " (" + BuildConfig.DISTRIBUTION_CHANNEL + ")"
        );

        CookieManager.getInstance().setAcceptCookie(false);
        WebView.setWebContentsDebuggingEnabled(false);
        target.addJavascriptInterface(new ExportBridge(), "MansourAndroid");
        target.setWebViewClient(createWebViewClient());
        target.setWebChromeClient(createWebChromeClient());
        return true;
    }

    private void registerPredictiveBackCallback() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            backInvokedCallback = this::handleBackNavigation;
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                    OnBackInvokedDispatcher.PRIORITY_DEFAULT,
                    backInvokedCallback
            );
        }
    }

    private WebViewClient createWebViewClient() {
        return new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(
                    WebView view,
                    WebResourceRequest request
            ) {
                Uri uri = request.getUrl();
                if (!"https".equals(uri.getScheme())
                        || !APP_HOST.equals(uri.getHost())
                        || !"GET".equals(request.getMethod())) {
                    return errorResponse(403);
                }

                String path = uri.getPath();
                if (path == null || path.equals("/")) {
                    path = "/index.html";
                }
                if (path.contains("..") || path.contains("\\") || path.contains("\0")) {
                    return errorResponse(403);
                }

                try {
                    Map<String, String> headers = new HashMap<>();
                    headers.put(
                            "Content-Security-Policy",
                            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; "
                                    + "font-src 'self'; img-src 'self' data:; connect-src 'self'; "
                                    + "media-src 'self'; worker-src 'self'; object-src 'none'; "
                                    + "base-uri 'none'; frame-src 'none'"
                    );
                    headers.put("X-Content-Type-Options", "nosniff");
                    String assetPath = path.substring(1);
                    String range = request.getRequestHeaders().get("Range");
                    if (range != null && path.endsWith(".mp3")) {
                        return rangedAssetResponse(assetPath, range, headers);
                    }
                    return new WebResourceResponse(
                            mimeType(path),
                            "UTF-8",
                            200,
                            "OK",
                            headers,
                            getAssets().open(assetPath)
                    );
                } catch (IOException exception) {
                    return errorResponse(404);
                }
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if ("https".equals(uri.getScheme()) && APP_HOST.equals(uri.getHost())) {
                    return false;
                }

                boolean isAllowedSource = ALLOWED_EXTERNAL_URLS.contains(uri.toString());
                if (request.isForMainFrame() && isAllowedSource) {
                    try {
                        startActivity(new Intent(Intent.ACTION_VIEW, uri));
                    } catch (RuntimeException exception) {
                        Toast.makeText(
                                MainActivity.this,
                                R.string.browser_missing,
                                Toast.LENGTH_SHORT
                        ).show();
                    }
                }
                return true;
            }

            @Override
            public void onReceivedError(
                    WebView view,
                    WebResourceRequest request,
                    WebResourceError error
            ) {
                if (request.isForMainFrame()) {
                    Toast.makeText(
                            MainActivity.this,
                            R.string.page_open_failed,
                            Toast.LENGTH_LONG
                    ).show();
                }
            }
        };
    }

    private WebChromeClient createWebChromeClient() {
        return new WebChromeClient() {
            @Override
            public boolean onJsConfirm(WebView view, String url, String message, JsResult result) {
                new AlertDialog.Builder(MainActivity.this)
                        .setMessage(message)
                        .setPositiveButton("تأیید", (dialog, which) -> result.confirm())
                        .setNegativeButton("انصراف", (dialog, which) -> result.cancel())
                        .setOnCancelListener(dialog -> result.cancel())
                        .show();
                return true;
            }

            @Override
            public boolean onShowFileChooser(
                    WebView view,
                    ValueCallback<Uri[]> callback,
                    FileChooserParams params
            ) {
                if (fileCallback != null) {
                    fileCallback.onReceiveValue(null);
                }
                fileCallback = callback;
                Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("*/*");
                try {
                    startActivityForResult(intent, 81);
                } catch (RuntimeException exception) {
                    fileCallback.onReceiveValue(null);
                    fileCallback = null;
                }
                return true;
            }
        };
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == 82) {
            String payload = pendingExport;
            pendingExport = null;
            if (resultCode == RESULT_OK && data != null && data.getData() != null && payload != null) {
                Uri destination = data.getData();
                new Thread(() -> {
                    try (OutputStream output = getContentResolver().openOutputStream(destination, "wt")) {
                        if (output == null) throw new IOException("Cannot open destination");
                        output.write(payload.getBytes(StandardCharsets.UTF_8));
                        runOnUiThread(() -> Toast.makeText(this, "فایل ذخیره شد", Toast.LENGTH_SHORT).show());
                    } catch (IOException exception) {
                        runOnUiThread(() -> Toast.makeText(this, "ذخیرهٔ فایل انجام نشد؛ دوباره تلاش کنید", Toast.LENGTH_LONG).show());
                    }
                }, "mansour-export").start();
            }
        }
        if (requestCode == 81 && fileCallback != null) {
            Uri selectedUri = resultCode == RESULT_OK && data != null ? data.getData() : null;
            fileCallback.onReceiveValue(
                    selectedUri == null ? null : new Uri[]{selectedUri}
            );
            fileCallback = null;
        }
    }

    // Only bundled scripts run on the synthetic HTTPS origin; remote frames and
    // network requests are blocked by the client and CSP. No arbitrary file API.
    private final class ExportBridge {
        @JavascriptInterface
        public void saveDocument(String name, String body, String type) {
            if (body == null || body.length() > 20000000 || name == null) return;
            String mime = name.endsWith(".json") ? "application/json" : "text/markdown";
            String safeName = name.endsWith(".json") ? "mansour-research-backup.json" : "mansour-research-notes.md";
            runOnUiThread(() -> {
                if (pendingExport != null) return;
                pendingExport = body;
                Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType(mime);
                intent.putExtra(Intent.EXTRA_TITLE, safeName);
                try { startActivityForResult(intent, 82); }
                catch (RuntimeException exception) {
                    pendingExport = null;
                    Toast.makeText(MainActivity.this, "انتخابگر فایل در دسترس نیست", Toast.LENGTH_LONG).show();
                }
            });
        }

        @JavascriptInterface
        public void copyText(String text) {
            if (text == null || text.length() > 1000000) return;
            runOnUiThread(() -> ((ClipboardManager) getSystemService(CLIPBOARD_SERVICE))
                    .setPrimaryClip(ClipData.newPlainText("منصور", text)));
        }
    }

    private void showFatalMessage(FrameLayout frame, int messageResource) {
        TextView message = new TextView(this);
        message.setText(messageResource);
        message.setTextColor(Color.WHITE);
        message.setTextSize(20);
        message.setPadding(32, 48, 32, 32);
        message.setGravity(Gravity.CENTER);
        message.setTextDirection(View.TEXT_DIRECTION_RTL);
        frame.addView(message);
    }

    private static WebResourceResponse errorResponse(int statusCode) {
        String reason = statusCode == 404 ? "Not Found" : "Forbidden";
        return new WebResourceResponse(
                "text/plain",
                "UTF-8",
                statusCode,
                reason,
                Collections.emptyMap(),
                new ByteArrayInputStream(new byte[0])
        );
    }

    private WebResourceResponse rangedAssetResponse(
            String assetPath,
            String rangeHeader,
            Map<String, String> baseHeaders
    ) throws IOException {
        AssetFileDescriptor descriptor = getAssets().openFd(assetPath);
        long length = descriptor.getLength();
        Matcher matcher = Pattern.compile("bytes=(\\d+)-(\\d*)").matcher(rangeHeader);
        if (!matcher.matches()) {
            descriptor.close();
            return errorResponse(403);
        }
        long start = Long.parseLong(matcher.group(1));
        long requestedEnd = matcher.group(2).isEmpty()
                ? Math.min(length - 1, start + (1024L * 1024L) - 1)
                : Long.parseLong(matcher.group(2));
        long end = Math.min(length - 1, requestedEnd);
        if (start < 0 || start >= length || end < start) {
            descriptor.close();
            return new WebResourceResponse(
                    "text/plain", "UTF-8", 416, "Range Not Satisfiable",
                    Collections.singletonMap("Content-Range", "bytes */" + length),
                    new ByteArrayInputStream(new byte[0])
            );
        }
        InputStream stream = descriptor.createInputStream();
        long skipped = 0;
        while (skipped < start) {
            long step = stream.skip(start - skipped);
            if (step <= 0) throw new IOException("Could not seek bundled audio");
            skipped += step;
        }
        long responseLength = end - start + 1;
        Map<String, String> headers = new HashMap<>(baseHeaders);
        headers.put("Accept-Ranges", "bytes");
        headers.put("Content-Range", "bytes " + start + "-" + end + "/" + length);
        headers.put("Content-Length", Long.toString(responseLength));
        return new WebResourceResponse(
                "audio/mpeg", null, 206, "Partial Content", headers,
                new LimitedInputStream(stream, responseLength)
        );
    }

    private static final class LimitedInputStream extends InputStream {
        private final InputStream delegate;
        private long remaining;

        private LimitedInputStream(InputStream delegate, long remaining) {
            this.delegate = delegate;
            this.remaining = remaining;
        }

        @Override
        public int read() throws IOException {
            if (remaining <= 0) return -1;
            int value = delegate.read();
            if (value >= 0) remaining--;
            return value;
        }

        @Override
        public int read(byte[] buffer, int offset, int count) throws IOException {
            if (remaining <= 0) return -1;
            int read = delegate.read(buffer, offset, (int) Math.min(count, remaining));
            if (read > 0) remaining -= read;
            return read;
        }

        @Override
        public void close() throws IOException {
            delegate.close();
        }
    }

    private static String mimeType(String path) {
        if (path.endsWith(".html")) return "text/html";
        if (path.endsWith(".js") || path.endsWith(".mjs")) return "application/javascript";
        if (path.endsWith(".css")) return "text/css";
        if (path.endsWith(".json")) return "application/json";
        if (path.endsWith(".woff2")) return "font/woff2";
        if (path.endsWith(".woff")) return "font/woff";
        if (path.endsWith(".ttf")) return "font/ttf";
        if (path.endsWith(".png")) return "image/png";
        if (path.endsWith(".mp3")) return "audio/mpeg";
        return "application/octet-stream";
    }

    // API 33+ is handled by the registered OnBackInvokedCallback above. This
    // override remains solely for Android 7–12 compatibility.
    @SuppressLint("GestureBackNavigation")
    @Override
    public void onBackPressed() {
        handleBackNavigation();
    }

    private void handleBackNavigation() {
        if (webView == null) {
            finish();
            return;
        }
        webView.evaluateJavascript(
                "(typeof window.jameBack==='function' && window.jameBack())",
                value -> {
                    if (!"true".equals(value)) {
                        finish();
                    }
                }
        );
    }

    @Override
    protected void onPause() {
        if (webView != null) webView.onPause();
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) webView.onResume();
    }

    @Override
    protected void onDestroy() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
                && backInvokedCallback != null) {
            getOnBackInvokedDispatcher().unregisterOnBackInvokedCallback(backInvokedCallback);
            backInvokedCallback = null;
        }
        if (webView != null) {
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
