package org.jamealtafasir.mobile;

import android.annotation.SuppressLint;
import android.content.Intent;
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

import androidx.activity.ComponentActivity;

import org.jamealtafasir.mobile.ui.MansourShellHost;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class MainActivity extends ComponentActivity {
    private static final String APP_HOST = "app.jame.invalid";
    private static final Pattern CHROME_VERSION = Pattern.compile("Chrome/(\\d+)");
    private static final Set<String> ALLOWED_EXTERNAL_URLS = new HashSet<>(Arrays.asList(
            "https://tanzil.net",
            "https://tanzil.net/docs/quran_metadata",
            "https://quranenc.com/fa/browse/persian_ih",
            "https://quranenc.com/ar/browse/arabic_moyassar"
    ));

    private WebView webView;
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
        MansourShellHost.install(this, frame, webView);
        webView.loadUrl("https://" + APP_HOST + "/index.html?native-shell=1");
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
        target.setBackgroundColor(Color.TRANSPARENT);

        CookieManager.getInstance().setAcceptCookie(false);
        WebView.setWebContentsDebuggingEnabled(false);
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
                    return new WebResourceResponse(
                            mimeType(path),
                            "UTF-8",
                            200,
                            "OK",
                            headers,
                            getAssets().open(path.substring(1))
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
        if (requestCode == 81 && fileCallback != null) {
            Uri selectedUri = resultCode == RESULT_OK && data != null ? data.getData() : null;
            fileCallback.onReceiveValue(
                    selectedUri == null ? null : new Uri[]{selectedUri}
            );
            fileCallback = null;
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
