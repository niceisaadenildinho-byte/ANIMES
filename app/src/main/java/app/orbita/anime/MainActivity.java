package app.orbita.anime;

import android.accounts.AccountManager;
import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import com.google.android.gms.common.AccountPicker;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.Arrays;

public class MainActivity extends Activity {
    private static final int RC_ACCOUNT_PICKER = 9001;
    private static final int RC_FILE_CHOOSER = 9002;
    private static final String PREFS = "orbita_account";
    private static final String KEY_EMAIL = "email";

    private WebView webView;
    private String currentEmail = "";
    private ValueCallback<Uri[]> fileChooserCallback;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(0xFF070708);
        getWindow().setNavigationBarColor(0xFF070708);

        SharedPreferences prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
        currentEmail = prefs.getString(KEY_EMAIL, "");

        if (currentEmail != null && !currentEmail.trim().isEmpty()) showApp();
        else showLoginScreen();
    }

    private void showLoginScreen() {
        currentEmail = "";
        if (webView != null) {
            webView.stopLoading();
            webView.destroy();
            webView = null;
        }

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setGravity(Gravity.CENTER);
        root.setPadding(dp(28), dp(28), dp(28), dp(28));
        root.setBackgroundColor(Color.rgb(7, 7, 8));

        TextView logo = new TextView(this);
        logo.setText("Niez Animes");
        logo.setTextColor(Color.WHITE);
        logo.setTextSize(34);
        logo.setGravity(Gravity.CENTER);
        logo.setTypeface(null, android.graphics.Typeface.BOLD);
        root.addView(logo, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT));

        TextView subtitle = new TextView(this);
        subtitle.setText("Entre com sua conta Google e continue sua jornada no Niez Animes.");
        subtitle.setTextColor(Color.rgb(170, 170, 180));
        subtitle.setTextSize(15);
        subtitle.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams subParams = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        subParams.setMargins(0, dp(12), 0, dp(28));
        root.addView(subtitle, subParams);

        Button googleButton = new Button(this);
        googleButton.setText("G  Entrar com Google");
        googleButton.setTextSize(16);
        googleButton.setAllCaps(false);
        googleButton.setTextColor(Color.rgb(15, 15, 18));
        googleButton.setBackgroundColor(Color.WHITE);
        googleButton.setPadding(dp(16), dp(12), dp(16), dp(12));
        googleButton.setOnClickListener(v -> startGoogleAccountPicker());
        root.addView(googleButton, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(54)));

        TextView note = new TextView(this);
        note.setText("🔒 Seus dados ficam protegidos. O Niez Animes nunca recebe sua senha do Google. A conta escolhida é usada apenas para identificar seu perfil neste dispositivo.");
        note.setTextColor(Color.rgb(125, 125, 136));
        note.setTextSize(12);
        note.setGravity(Gravity.CENTER);
        note.setLineSpacing(0, 1.12f);
        LinearLayout.LayoutParams noteParams = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        noteParams.setMargins(0, dp(20), 0, 0);
        root.addView(note, noteParams);

        setContentView(root);
    }

    private void startGoogleAccountPicker() {
        try {
            AccountPicker.AccountChooserOptions options = new AccountPicker.AccountChooserOptions.Builder()
                    .setAllowableAccountsTypes(Arrays.asList("com.google"))
                    .build();
            startActivityForResult(AccountPicker.newChooseAccountIntent(options), RC_ACCOUNT_PICKER);
        } catch (Exception e) {
            Toast.makeText(this, "Não foi possível abrir as contas Google neste celular.", Toast.LENGTH_LONG).show();
        }
    }

    private void openImageChooser() {
        try {
            Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
            intent.addCategory(Intent.CATEGORY_OPENABLE);
            intent.setType("image/*");
            startActivityForResult(Intent.createChooser(intent, "Escolher foto"), RC_FILE_CHOOSER);
        } catch (Exception e) {
            if (fileChooserCallback != null) {
                fileChooserCallback.onReceiveValue(null);
                fileChooserCallback = null;
            }
            Toast.makeText(this, "Não foi possível abrir sua galeria.", Toast.LENGTH_LONG).show();
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        if (requestCode == RC_FILE_CHOOSER) {
            if (fileChooserCallback != null) {
                Uri[] result = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
                fileChooserCallback.onReceiveValue(result);
                fileChooserCallback = null;
            }
            return;
        }

        if (requestCode != RC_ACCOUNT_PICKER) return;
        if (resultCode == RESULT_OK && data != null) {
            String email = data.getStringExtra(AccountManager.KEY_ACCOUNT_NAME);
            String type = data.getStringExtra(AccountManager.KEY_ACCOUNT_TYPE);
            if (email != null && !email.trim().isEmpty() && (type == null || "com.google".equals(type))) {
                currentEmail = email.trim();
                getSharedPreferences(PREFS, MODE_PRIVATE).edit().putString(KEY_EMAIL, currentEmail).apply();
                showApp();
                return;
            }
            Toast.makeText(this, "Não consegui identificar essa conta Google.", Toast.LENGTH_LONG).show();
        }
    }

    private void showApp() {
        webView = new WebView(this);
        webView.setBackgroundColor(0xFF070708);
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccessFromFileURLs(true);
        settings.setAllowUniversalAccessFromFileURLs(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setSupportZoom(false);
        settings.setMediaPlaybackRequiresUserGesture(false);

        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true);
        webView.addJavascriptInterface(new AccountBridge(), "OrbitaAccount");
        webView.setWebViewClient(new WebViewClient());
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
                if (fileChooserCallback != null) fileChooserCallback.onReceiveValue(null);
                fileChooserCallback = filePathCallback;
                openImageChooser();
                return true;
            }
        });
        webView.loadUrl("file:///android_asset/online_catalog.html");
    }

    private String displayNameFromEmail(String email) {
        if (email == null || email.trim().isEmpty()) return "Usuário Niez";
        String local = email.split("@")[0].replace('.', ' ').replace('_', ' ').replace('-', ' ').trim();
        if (local.isEmpty()) return "Usuário Niez";
        String[] parts = local.split("\\s+");
        StringBuilder out = new StringBuilder();
        for (String p : parts) {
            if (p.isEmpty()) continue;
            if (out.length() > 0) out.append(' ');
            out.append(Character.toUpperCase(p.charAt(0)));
            if (p.length() > 1) out.append(p.substring(1));
        }
        return out.length() == 0 ? "Usuário Niez" : out.toString();
    }

    private String accountJson() {
        JSONObject o = new JSONObject();
        try {
            o.put("name", displayNameFromEmail(currentEmail));
            o.put("email", currentEmail == null ? "" : currentEmail);
            o.put("id", currentEmail == null ? "" : currentEmail.toLowerCase());
            o.put("photo", "");
        } catch (JSONException ignored) {}
        return o.toString();
    }

    private class AccountBridge {
        @JavascriptInterface
        public void playOfficialVideo(String videoId, String title, String publisher) {
            if (videoId == null || !videoId.matches("[A-Za-z0-9_-]{11}")) return;
            final String safeTitle = title == null ? "Niez Animes" : title.substring(0, Math.min(title.length(), 200));
            final String safePublisher = publisher == null ? "YouTube" : publisher.substring(0, Math.min(publisher.length(), 200));
            runOnUiThread(() -> {
                Intent player = new Intent(MainActivity.this, OfficialVideoActivity.class);
                player.putExtra(OfficialVideoActivity.EXTRA_VIDEO_ID, videoId);
                player.putExtra(OfficialVideoActivity.EXTRA_TITLE, safeTitle);
                player.putExtra(OfficialVideoActivity.EXTRA_PUBLISHER, safePublisher);
                startActivity(player);
            });
        }

        @JavascriptInterface
        public void shareText(String title, String text) {
            final String safeTitle = title == null ? "Niez Animes" : title.substring(0, Math.min(title.length(), 200));
            final String safeText = text == null ? "" : text.substring(0, Math.min(text.length(), 4000));
            runOnUiThread(() -> {
                try {
                    Intent send = new Intent(Intent.ACTION_SEND);
                    send.setType("text/plain");
                    send.putExtra(Intent.EXTRA_SUBJECT, safeTitle);
                    send.putExtra(Intent.EXTRA_TEXT, safeText);
                    startActivity(Intent.createChooser(send, "Compartilhar anime"));
                } catch (Exception e) {
                    Toast.makeText(MainActivity.this, "Não foi possível compartilhar agora.", Toast.LENGTH_LONG).show();
                }
            });
        }

        @JavascriptInterface
        public String getAccountJson() {
            return accountJson();
        }

        @JavascriptInterface
        public void logout() {
            runOnUiThread(() -> {
                getSharedPreferences(PREFS, MODE_PRIVATE).edit().clear().apply();
                currentEmail = "";
                showLoginScreen();
            });
        }
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private void fallbackBack() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    @Override
    public void onBackPressed() {
        if (webView == null) {
            fallbackBack();
            return;
        }
        String js = "(function(){try{var f=document.getElementById('appFrame');var w=f&&f.contentWindow;if(w&&typeof w.NiezHandleBack==='function')return !!w.NiezHandleBack();}catch(e){}return false;})()";
        webView.evaluateJavascript(js, value -> {
            if (!"true".equals(value)) fallbackBack();
        });
    }

    @Override
    protected void onDestroy() {
        if (fileChooserCallback != null) {
            fileChooserCallback.onReceiveValue(null);
            fileChooserCallback = null;
        }
        if (webView != null) {
            webView.loadUrl("about:blank");
            webView.stopLoading();
            webView.setWebChromeClient(null);
            webView.setWebViewClient(null);
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
