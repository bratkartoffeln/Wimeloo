package de.sternenbaby.app;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.res.AssetFileDescriptor;
import android.graphics.Color;
import android.media.AudioManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.speech.tts.Voice;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.ConsoleMessage;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.window.OnBackInvokedDispatcher;

import java.io.ByteArrayInputStream;
import java.io.FilterInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import org.json.JSONException;
import org.json.JSONObject;

/** Native offline shell. Only packaged appassets URLs can reach the WebView. */
public final class MainActivity extends Activity {
    private static final String ASSET_HOST = "appassets.androidplatform.net";
    private static final String ASSET_PREFIX = "/assets/www/";
    private static final String START_URL = "https://" + ASSET_HOST + ASSET_PREFIX + "index.html";
    private static final int REQUEST_SAVE_EXPORT = 501;
    private static final int REQUEST_SAVE_IMPORT = 502;
    private static final String CONTENT_SECURITY_POLICY =
            "default-src 'self' data: blob:; " +
            "script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; " +
            "img-src 'self' data: blob:; media-src 'self' data: blob:; " +
            "font-src 'self' data:; connect-src 'self'; " +
            "object-src 'none'; frame-src 'none'; base-uri 'self'; form-action 'none'";

    private WebView webView;
    private TextToSpeech speech;
    private volatile boolean speechReady;
    private volatile boolean destroyed;
    private boolean fullscreen = true;
    private AlertDialog exitDialog;
    private byte[] pendingSaveExport;
    private boolean documentRequestOpen;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setVolumeControlStream(AudioManager.STREAM_MUSIC);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        if (Build.VERSION.SDK_INT >= 28) {
            WindowManager.LayoutParams attributes = getWindow().getAttributes();
            attributes.layoutInDisplayCutoutMode =
                    WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            getWindow().setAttributes(attributes);
        }
        if (Build.VERSION.SDK_INT >= 30) {
            getWindow().setDecorFitsSystemWindows(false);
        }

        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(238, 232, 255));
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        webView.setVerticalScrollBarEnabled(false);
        webView.setHorizontalScrollBarEnabled(false);
        webView.setKeepScreenOn(true);
        WebView.setWebContentsDebuggingEnabled(false);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setBlockNetworkLoads(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        // A child who cannot read must hear the bundled welcome without tapping first.
        // Only packaged offline media is allowed; the game pauses audio on nativepause.
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setTextZoom(100);
        settings.setDefaultTextEncodingName("UTF-8");
        settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
        settings.setGeolocationEnabled(false);
        if (Build.VERSION.SDK_INT >= 29) {
            settings.setForceDark(WebSettings.FORCE_DARK_OFF);
        }
        android.webkit.CookieManager.getInstance().setAcceptCookie(false);
        android.webkit.CookieManager.getInstance().setAcceptThirdPartyCookies(webView, false);

        webView.addJavascriptInterface(new AndroidBridge(), "AndroidBridge");
        webView.setWebViewClient(new OfflineClient());
        webView.setWebChromeClient(new WebChromeClient() {
            @Override public void onPermissionRequest(PermissionRequest request) {
                request.deny();
            }
            @Override public boolean onConsoleMessage(ConsoleMessage message) {
                // Deliberately do not send child activity or console text anywhere.
                return true;
            }
        });
        setContentView(webView);
        if (Build.VERSION.SDK_INT >= 33) {
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                    OnBackInvokedDispatcher.PRIORITY_DEFAULT, this::handleBack);
        }
        speech = new TextToSpeech(getApplicationContext(),
                status -> runOnUiThread(() -> configureSpeech(status)));
        applyFullscreen();
        webView.loadUrl(START_URL);
    }

    private void configureSpeech(int status) {
        if (destroyed || speech == null || status != TextToSpeech.SUCCESS) return;
        speech.setLanguage(Locale.GERMANY);
        Voice chosen = null;
        int chosenScore = Integer.MIN_VALUE;
        Set<Voice> voices = speech.getVoices();
        if (voices != null) {
            for (Voice voice : voices) {
                if (!isOfflineGermanVoice(voice)) continue;
                int score = voice.getQuality();
                if ("DE".equalsIgnoreCase(voice.getLocale().getCountry())) score += 10000;
                if (score > chosenScore) {
                    chosen = voice;
                    chosenScore = score;
                }
            }
        }
        if (chosen == null && isOfflineGermanVoice(speech.getVoice())) chosen = speech.getVoice();
        if (chosen != null && speech.setVoice(chosen) == TextToSpeech.SUCCESS) {
            speech.setSpeechRate(1.0f);
            speech.setPitch(1.05f);
            speechReady = true;
            dispatchEvent("nativespeechready");
        } else {
            speechReady = false;
            dispatchEvent("nativespeechunavailable");
        }
    }

    private boolean isOfflineGermanVoice(Voice voice) {
        if (voice == null || voice.isNetworkConnectionRequired()) return false;
        if (!"de".equalsIgnoreCase(voice.getLocale().getLanguage())) return false;
        Set<String> features = voice.getFeatures();
        return features == null || !features.contains(TextToSpeech.Engine.KEY_FEATURE_NOT_INSTALLED);
    }

    public final class AndroidBridge {
        /** Returns false if no installed German offline voice is currently ready. */
        @JavascriptInterface
        public boolean speak(String text) {
            return speakAtVolume(text, 1.0);
        }

        /** Separate name avoids JavaScript bridge overload ambiguity. */
        @JavascriptInterface
        public boolean speakAtVolume(String text, double volume) {
            if (!speechReady || destroyed || text == null || text.trim().isEmpty()) return false;
            final float level = Double.isNaN(volume) ? 1.0f : (float) Math.max(0.0, Math.min(1.0, volume));
            if (level <= 0.0f) return true;
            final String utterance = text.substring(0, Math.min(text.length(), 1200));
            runOnUiThread(() -> {
                if (!speechReady || destroyed || speech == null) return;
                Bundle parameters = new Bundle();
                parameters.putFloat(TextToSpeech.Engine.KEY_PARAM_VOLUME, level);
                int result = speech.speak(utterance, TextToSpeech.QUEUE_FLUSH, parameters, "sternenbaby");
                if (result == TextToSpeech.ERROR) {
                    speechReady = false;
                    dispatchEvent("nativespeechunavailable");
                }
            });
            return true;
        }

        @JavascriptInterface
        public void stopSpeaking() {
            runOnUiThread(() -> { if (speech != null) speech.stop(); });
        }

        @JavascriptInterface
        public boolean isSpeechAvailable() {
            return speechReady && !destroyed;
        }

        @JavascriptInterface
        public void setFullscreen(boolean enabled) {
            runOnUiThread(() -> {
                fullscreen = enabled;
                applyFullscreen();
            });
        }

        /** Parent controls only. Android asks the adult to choose a destination. */
        @JavascriptInterface
        public void exportSave(String json) {
            if (destroyed) return;
            try {
                final byte[] bytes = SaveTransfer.encode(json);
                new JSONObject(json);
                runOnUiThread(() -> chooseSaveExport(bytes));
            } catch (IOException | JSONException error) {
                runOnUiThread(() -> saveError("Die Sicherung konnte nicht vorbereitet werden."));
            }
        }

        /** Only reads a user-selected document; JavaScript reviews before replacement. */
        @JavascriptInterface
        public void importSave() {
            if (!destroyed) runOnUiThread(() -> chooseSaveImport());
        }
    }

    private void chooseSaveExport(byte[] bytes) {
        if (destroyed || documentRequestOpen) return;
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT)
                .addCategory(Intent.CATEGORY_OPENABLE)
                .setType("application/json")
                .putExtra(Intent.EXTRA_TITLE, "Wimeloo-Spielstand-" +
                        new SimpleDateFormat("yyyy-MM-dd", Locale.ROOT).format(new Date()) + ".json");
        pendingSaveExport = bytes;
        documentRequestOpen = true;
        try { startActivityForResult(intent, REQUEST_SAVE_EXPORT); }
        catch (ActivityNotFoundException | SecurityException error) {
            pendingSaveExport = null;
            documentRequestOpen = false;
            saveError("Auf diesem Gerät ist keine Dateiauswahl verfügbar.");
        }
    }

    private void chooseSaveImport() {
        if (destroyed || documentRequestOpen) return;
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT)
                .addCategory(Intent.CATEGORY_OPENABLE)
                .setType("*/*")
                .putExtra(Intent.EXTRA_MIME_TYPES, new String[]{"application/json", "text/plain", "application/octet-stream"});
        documentRequestOpen = true;
        try { startActivityForResult(intent, REQUEST_SAVE_IMPORT); }
        catch (ActivityNotFoundException | SecurityException error) {
            documentRequestOpen = false;
            saveError("Auf diesem Gerät ist keine Dateiauswahl verfügbar.");
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != REQUEST_SAVE_EXPORT && requestCode != REQUEST_SAVE_IMPORT) return;
        documentRequestOpen = false;
        final byte[] exportBytes = pendingSaveExport;
        pendingSaveExport = null;
        if (resultCode != RESULT_OK || data == null || data.getData() == null) {
            dispatchDetailEvent(requestCode == REQUEST_SAVE_EXPORT ? "nativesaveexport" : "nativesaveimport",
                    jsonDetail("cancelled", true));
            return;
        }
        final Uri uri = data.getData();
        // The system grants access only to the chosen URI. No broad storage permission.
        new Thread(() -> {
            try {
                if (requestCode == REQUEST_SAVE_EXPORT) {
                    if (exportBytes == null) throw new IOException("Die Sicherung wurde unterbrochen. Bitte erneut speichern.");
                    try (OutputStream output = getContentResolver().openOutputStream(uri, "wt")) {
                        if (output == null) throw new IOException("Die Datei konnte nicht geschrieben werden.");
                        output.write(exportBytes);
                        output.flush();
                    }
                    runOnUiThread(() -> dispatchDetailEvent("nativesaveexport", jsonDetail("ok", true)));
                } else {
                    final String json;
                    try (InputStream input = getContentResolver().openInputStream(uri)) {
                        json = SaveTransfer.read(input);
                    }
                    new JSONObject(json);
                    runOnUiThread(() -> dispatchDetailEvent("nativesaveimport", jsonDetail("json", json)));
                }
            } catch (IOException | SecurityException | JSONException error) {
                runOnUiThread(() -> saveError(requestCode == REQUEST_SAVE_EXPORT
                        ? "Die Sicherung konnte nicht gespeichert werden. Bitte einen anderen Speicherort wählen."
                        : "Die Datei konnte nicht als Spielstand gelesen werden. Bitte eine Wimeloo-Sicherung bis 1 MB auswählen."));
            }
        }, "sternenbaby-save-document").start();
    }

    private JSONObject jsonDetail(String key, Object value) {
        JSONObject detail = new JSONObject();
        try { detail.put(key, value); } catch (JSONException ignored) { }
        return detail;
    }

    private void saveError(String message) {
        dispatchDetailEvent("nativesaveerror", jsonDetail("message", message));
    }

    private void dispatchDetailEvent(String name, JSONObject detail) {
        if (webView == null || destroyed) return;
        String json = detail.toString().replace("\u2028", "\\u2028").replace("\u2029", "\\u2029");
        webView.evaluateJavascript("window.dispatchEvent(new CustomEvent(" + JSONObject.quote(name) +
                ", {detail:" + json + "}));", null);
    }

    private boolean isLocalUri(Uri uri) {
        if (!"https".equalsIgnoreCase(uri.getScheme()) || !ASSET_HOST.equals(uri.getHost())) return false;
        if (uri.getPort() != -1 && uri.getPort() != 443) return false;
        if (uri.getUserInfo() != null) return false;
        String path = uri.getPath();
        return path != null && path.startsWith(ASSET_PREFIX) &&
                !path.contains("..") && !path.contains("\\") && path.indexOf('\0') == -1;
    }

    private final class OfflineClient extends WebViewClient {
        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            if (!"GET".equalsIgnoreCase(request.getMethod())) return emptyResponse(405, "Method Not Allowed");
            String range = null;
            for (Map.Entry<String, String> header : request.getRequestHeaders().entrySet()) {
                if ("range".equalsIgnoreCase(header.getKey())) range = header.getValue();
            }
            return interceptAsset(request.getUrl(), range);
        }

        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, String url) {
            return interceptAsset(Uri.parse(url), null);
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            return !isLocalUri(request.getUrl());
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, String url) {
            return !isLocalUri(Uri.parse(url));
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            applyFullscreen();
            dispatchEvent("nativeappready");
            if (speechReady) dispatchEvent("nativespeechready");
        }

        @Override
        public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
            if (!request.isForMainFrame()) return;
            // A native recovery dialog avoids loading any remote error page.
            new AlertDialog.Builder(MainActivity.this)
                    .setTitle("Wimeloo")
                    .setMessage("Die Spielwelt konnte nicht geöffnet werden. Bitte starte die App erneut.")
                    .setPositiveButton("Noch einmal", (dialog, which) -> webView.loadUrl(START_URL))
                    .setNegativeButton("Schließen", (dialog, which) -> finish())
                    .show();
        }
    }

    private WebResourceResponse interceptAsset(Uri uri, String rangeHeader) {
        if (!isLocalUri(uri)) return emptyResponse(403, "Forbidden");
        String relative = uri.getPath().substring(ASSET_PREFIX.length());
        if (relative.isEmpty()) relative = "index.html";
        String mime = mimeType(relative);
        if (mime == null) return emptyResponse(415, "Unsupported Media Type");
        try {
            InputStream stream;
            long length = -1;
            boolean media = mime.startsWith("audio/") || mime.startsWith("video/");
            if (media) {
                try {
                    // Audio/video are stored uncompressed in the APK to make ranges seekable.
                    AssetFileDescriptor descriptor = getAssets().openFd("www/" + relative);
                    length = descriptor.getLength();
                    stream = descriptor.createInputStream();
                } catch (IOException compressedAsset) {
                    // A third-party build may compress an asset; complete playback still works.
                    stream = getAssets().open("www/" + relative);
                }
            } else {
                stream = getAssets().open("www/" + relative);
            }
            Map<String, String> headers = new HashMap<>();
            headers.put("Content-Security-Policy", CONTENT_SECURITY_POLICY);
            headers.put("X-Content-Type-Options", "nosniff");
            headers.put("Cache-Control", "no-store");
            headers.put("Referrer-Policy", "no-referrer");
            headers.put("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
            int status = 200;
            String reason = "OK";
            if (length >= 0) {
                headers.put("Accept-Ranges", "bytes");
                headers.put("Content-Length", Long.toString(length));
                if (rangeHeader != null) {
                    ByteRange range = ByteRange.parse(rangeHeader, length);
                    if (range == null) {
                        stream.close();
                        headers.put("Content-Range", "bytes */" + length);
                        headers.put("Content-Length", "0");
                        return new WebResourceResponse(mime, null, 416, "Range Not Satisfiable", headers,
                                new ByteArrayInputStream(new byte[0]));
                    }
                    long skipped = 0;
                    while (skipped < range.start) {
                        long count = stream.skip(range.start - skipped);
                        if (count == 0) {
                            if (stream.read() == -1) {
                                stream.close();
                                throw new IOException("Unexpected end of asset");
                            }
                            count = 1;
                        }
                        skipped += count;
                    }
                    stream = new LimitedInputStream(stream, range.length());
                    headers.put("Content-Length", Long.toString(range.length()));
                    headers.put("Content-Range", "bytes " + range.start + "-" + range.end + "/" + length);
                    status = 206;
                    reason = "Partial Content";
                }
            }
            boolean text = mime.startsWith("text/") || mime.endsWith("javascript") ||
                    mime.endsWith("json") || mime.endsWith("svg+xml");
            return new WebResourceResponse(mime, text ? "UTF-8" : null, status, reason, headers, stream);
        } catch (IOException exception) {
            return emptyResponse(404, "Not Found");
        }
    }

    private static String mimeType(String path) {
        String lower = path.toLowerCase(Locale.ROOT);
        if (lower.endsWith(".html")) return "text/html";
        if (lower.endsWith(".js") || lower.endsWith(".mjs")) return "application/javascript";
        if (lower.endsWith(".css")) return "text/css";
        if (lower.endsWith(".json")) return "application/json";
        if (lower.endsWith(".svg")) return "image/svg+xml";
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".webp")) return "image/webp";
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
        if (lower.endsWith(".gif")) return "image/gif";
        if (lower.endsWith(".ico")) return "image/x-icon";
        if (lower.endsWith(".woff2")) return "font/woff2";
        if (lower.endsWith(".woff")) return "font/woff";
        if (lower.endsWith(".ttf")) return "font/ttf";
        if (lower.endsWith(".mp3")) return "audio/mpeg";
        if (lower.endsWith(".ogg")) return "audio/ogg";
        if (lower.endsWith(".wav")) return "audio/wav";
        if (lower.endsWith(".m4a")) return "audio/mp4";
        if (lower.endsWith(".mp4")) return "video/mp4";
        if (lower.endsWith(".webm")) return "video/webm";
        return null;
    }

    private static WebResourceResponse emptyResponse(int status, String reason) {
        return new WebResourceResponse("text/plain", "UTF-8", status, reason,
                new HashMap<>(), new ByteArrayInputStream(new byte[0]));
    }

    private static final class LimitedInputStream extends FilterInputStream {
        private long remaining;
        LimitedInputStream(InputStream stream, long length) { super(stream); remaining = length; }
        @Override public int read() throws IOException {
            if (remaining <= 0) return -1;
            int value = super.read();
            if (value != -1) remaining--;
            return value;
        }
        @Override public int read(byte[] buffer, int offset, int count) throws IOException {
            if (count == 0) return 0;
            if (remaining <= 0) return -1;
            int value = in.read(buffer, offset, (int) Math.min(count, remaining));
            if (value > 0) remaining -= value;
            return value;
        }
        @Override public long skip(long count) throws IOException {
            long value = in.skip(Math.min(count, remaining));
            remaining -= value;
            return value;
        }
        @Override public int available() throws IOException {
            return (int) Math.min(in.available(), remaining);
        }
    }

    private void dispatchEvent(String name) {
        if (webView != null && !destroyed) {
            webView.evaluateJavascript("window.dispatchEvent(new Event('" + name + "'));", null);
        }
    }

    @Override
    public void onBackPressed() {
        handleBack();
    }

    private void handleBack() {
        if (webView == null || destroyed) { finish(); return; }
        webView.evaluateJavascript(
                "typeof window.onAndroidBack === 'function' ? window.onAndroidBack() === true : false",
                handled -> {
                    if ("true".equals(handled) || destroyed || isFinishing()) return;
                    if (exitDialog != null && exitDialog.isShowing()) return;
                    if (speech != null) speech.stop();
                    exitDialog = new AlertDialog.Builder(MainActivity.this)
                            .setTitle("Spielpause?")
                            .setMessage("Wir passen gut auf das Baby auf. Du kannst jederzeit wiederkommen.")
                            .setPositiveButton("Pause machen", (dialog, which) -> finish())
                            .setNegativeButton("Weiterspielen", (dialog, which) -> applyFullscreen())
                            .create();
                    exitDialog.show();
                });
    }

    private void applyFullscreen() {
        if (fullscreen) getWindow().addFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN);
        else getWindow().clearFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN);
        if (Build.VERSION.SDK_INT >= 30) {
            WindowInsetsController controller = getWindow().getInsetsController();
            if (controller != null) {
                controller.setSystemBarsBehavior(
                        WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
                if (fullscreen) controller.hide(WindowInsets.Type.systemBars());
                else controller.show(WindowInsets.Type.systemBars());
            }
        } else {
            int flags = View.SYSTEM_UI_FLAG_LAYOUT_STABLE;
            if (fullscreen) flags |= View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION |
                    View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN |
                    View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION;
            getWindow().getDecorView().setSystemUiVisibility(flags);
        }
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) applyFullscreen();
    }

    @Override
    protected void onPause() {
        dispatchEvent("nativepause");
        if (speech != null) speech.stop();
        if (webView != null) {
            webView.onPause();
            webView.pauseTimers();
        }
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) {
            webView.resumeTimers();
            webView.onResume();
            dispatchEvent("nativeresume");
        }
        applyFullscreen();
    }

    @Override
    protected void onDestroy() {
        destroyed = true;
        speechReady = false;
        if (exitDialog != null) exitDialog.dismiss();
        if (speech != null) {
            speech.stop();
            speech.shutdown();
            speech = null;
        }
        if (webView != null) {
            ViewGroup parent = (ViewGroup) webView.getParent();
            if (parent != null) parent.removeView(webView);
            webView.removeJavascriptInterface("AndroidBridge");
            webView.stopLoading();
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
