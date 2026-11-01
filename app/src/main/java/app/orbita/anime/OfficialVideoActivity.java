package app.orbita.anime;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import java.util.HashMap;
import java.util.Map;

/** Isolated official YouTube player. No account bridge or local-file access. */
public class OfficialVideoActivity extends Activity {
    public static final String EXTRA_VIDEO_ID = "official_video_id";
    public static final String EXTRA_TITLE = "official_video_title";
    public static final String EXTRA_PUBLISHER = "official_video_publisher";

    private WebView player;
    private LinearLayout root;
    private View fullscreenView;
    private WebChromeClient.CustomViewCallback fullscreenCallback;
    private String videoId;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        videoId = getIntent().getStringExtra(EXTRA_VIDEO_ID);
        if (videoId == null || !videoId.matches("[A-Za-z0-9_-]{11}")) {
            finish();
            return;
        }
        getWindow().setStatusBarColor(Color.BLACK);
        getWindow().setNavigationBarColor(Color.BLACK);
        root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.BLACK);

        Button back = new Button(this);
        back.setText("‹ Voltar aos episódios");
        back.setTextColor(Color.WHITE);
        back.setBackgroundColor(0xFF151519);
        back.setOnClickListener(view -> finish());
        root.addView(back, new LinearLayout.LayoutParams(-1, -2));

        TextView title = new TextView(this);
        title.setText(getIntent().getStringExtra(EXTRA_TITLE));
        title.setTextColor(Color.WHITE);
        title.setTextSize(16);
        title.setPadding(dp(16), dp(10), dp(16), dp(10));
        root.addView(title, new LinearLayout.LayoutParams(-1, -2));

        player = new WebView(this);
        player.setBackgroundColor(Color.BLACK);
        WebSettings settings = player.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(true);
        root.addView(player, new LinearLayout.LayoutParams(-1, 0, 1));

        TextView source = new TextView(this);
        source.setText("Fonte: " + getIntent().getStringExtra(EXTRA_PUBLISHER)
                + " · Player oficial do YouTube. A disponibilidade depende do canal e da região.");
        source.setTextColor(0xFFBBBBBB);
        source.setPadding(dp(16), dp(10), dp(16), dp(6));
        root.addView(source, new LinearLayout.LayoutParams(-1, -2));

        Button external = new Button(this);
        external.setText("Abrir no YouTube");
        external.setTextColor(0xFFFF897C);
        external.setBackgroundColor(0xFF151519);
        external.setOnClickListener(view -> openYouTube());
        root.addView(external, new LinearLayout.LayoutParams(-1, -2));
        setContentView(root);

        player.setWebViewClient(new WebViewClient() {
            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) {
                    source.setText("Não foi possível carregar o player. Verifique sua conexão ou toque em Abrir no YouTube.");
                }
            }
        });
        player.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onShowCustomView(View view, CustomViewCallback callback) {
                if (fullscreenView != null) { callback.onCustomViewHidden(); return; }
                fullscreenView = view;
                fullscreenCallback = callback;
                root.setVisibility(View.GONE);
                ((FrameLayout) getWindow().getDecorView()).addView(view,
                        new FrameLayout.LayoutParams(-1, -1));
                getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_FULLSCREEN
                        | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
            }

            @Override
            public void onHideCustomView() { exitFullscreen(); }
        });

        // YouTube requires the application identity even for file-bundled apps.
        // https://developers.google.com/youtube/terms/required-minimum-functionality
        Map<String, String> headers = new HashMap<>();
        headers.put("Referer", "https://" + getPackageName() + "/");
        player.loadUrl("https://www.youtube.com/embed/" + videoId + "?playsinline=1", headers);
    }

    private int dp(int n) { return Math.round(n * getResources().getDisplayMetrics().density); }

    private void openYouTube() {
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse("https://www.youtube.com/watch?v=" + videoId));
            intent.putExtra(Intent.EXTRA_REFERRER, Uri.parse("android-app://" + getPackageName()));
            startActivity(intent);
        } catch (ActivityNotFoundException error) {
            Toast.makeText(this, "Nenhum aplicativo disponível para abrir este vídeo.", Toast.LENGTH_LONG).show();
        }
    }

    private void exitFullscreen() {
        if (fullscreenView == null) return;
        ((ViewGroup) fullscreenView.getParent()).removeView(fullscreenView);
        fullscreenView = null;
        root.setVisibility(View.VISIBLE);
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_VISIBLE);
        if (fullscreenCallback != null) fullscreenCallback.onCustomViewHidden();
        fullscreenCallback = null;
    }

    @Override
    public void onBackPressed() {
        if (fullscreenView != null) exitFullscreen();
        else super.onBackPressed();
    }

    @Override
    protected void onPause() {
        if (player != null) player.onPause();
        super.onPause();
    }

    @Override
    protected void onStop() {
        // Stop audio when leaving the screen, including opening the external app.
        if (player != null) player.loadUrl("about:blank");
        if (!isChangingConfigurations()) finish();
        super.onStop();
    }

    @Override
    protected void onDestroy() {
        exitFullscreen();
        if (player != null) {
            player.loadUrl("about:blank");
            player.stopLoading();
            player.setWebChromeClient(null);
            player.setWebViewClient(null);
            ((ViewGroup) player.getParent()).removeView(player);
            player.destroy();
            player = null;
        }
        super.onDestroy();
    }
}
