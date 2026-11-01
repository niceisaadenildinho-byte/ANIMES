package app.orbita.anime;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import com.google.android.gms.auth.api.signin.GoogleSignIn;
import com.google.android.gms.auth.api.signin.GoogleSignInAccount;
import com.google.android.gms.auth.api.signin.GoogleSignInClient;
import com.google.android.gms.auth.api.signin.GoogleSignInOptions;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.tasks.Task;

import org.json.JSONException;
import org.json.JSONObject;

public class MainActivity extends Activity {
    private static final int RC_SIGN_IN = 9001;

    private WebView webView;
    private GoogleSignInClient googleSignInClient;
    private GoogleSignInAccount currentAccount;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(0xFF070708);
        getWindow().setNavigationBarColor(0xFF070708);

        GoogleSignInOptions gso = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                .requestEmail()
                .requestProfile()
                .build();
        googleSignInClient = GoogleSignIn.getClient(this, gso);

        currentAccount = GoogleSignIn.getLastSignedInAccount(this);
        if (currentAccount != null) {
            showApp(currentAccount);
        } else {
            showLoginScreen();
        }
    }

    private void showLoginScreen() {
        currentAccount = null;
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
        logo.setText("Órbita Anime");
        logo.setTextColor(Color.WHITE);
        logo.setTextSize(34);
        logo.setGravity(Gravity.CENTER);
        logo.setTypeface(null, android.graphics.Typeface.BOLD);
        root.addView(logo, new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT));

        TextView subtitle = new TextView(this);
        subtitle.setText("Entre com uma conta Google para acessar seu perfil, listas e progresso.");
        subtitle.setTextColor(Color.rgb(170, 170, 180));
        subtitle.setTextSize(15);
        subtitle.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams subParams = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT);
        subParams.setMargins(0, dp(12), 0, dp(28));
        root.addView(subtitle, subParams);

        Button googleButton = new Button(this);
        googleButton.setText("G  Entrar com Google");
        googleButton.setTextSize(16);
        googleButton.setAllCaps(false);
        googleButton.setTextColor(Color.rgb(15, 15, 18));
        googleButton.setBackgroundColor(Color.WHITE);
        googleButton.setPadding(dp(16), dp(12), dp(16), dp(12));
        googleButton.setOnClickListener(v -> startGoogleSignIn());
        LinearLayout.LayoutParams buttonParams = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                dp(54));
        root.addView(googleButton, buttonParams);

        TextView note = new TextView(this);
        note.setText("O Órbita Anime usa apenas a conta escolhida no Google. Não é login do ChatGPT.");
        note.setTextColor(Color.rgb(105, 105, 115));
        note.setTextSize(12);
        note.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams noteParams = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT);
        noteParams.setMargins(0, dp(20), 0, 0);
        root.addView(note, noteParams);

        setContentView(root);
    }

    private void startGoogleSignIn() {
        Intent signInIntent = googleSignInClient.getSignInIntent();
        startActivityForResult(signInIntent, RC_SIGN_IN);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != RC_SIGN_IN) return;

        Task<GoogleSignInAccount> task = GoogleSignIn.getSignedInAccountFromIntent(data);
        try {
            GoogleSignInAccount account = task.getResult(ApiException.class);
            currentAccount = account;
            showApp(account);
        } catch (ApiException e) {
            Toast.makeText(this, "Não foi possível entrar com essa conta. Tente novamente.", Toast.LENGTH_LONG).show();
        }
    }

    private void showApp(GoogleSignInAccount account) {
        currentAccount = account;
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

        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true);
        webView.addJavascriptInterface(new AccountBridge(), "OrbitaAccount");
        webView.setWebViewClient(new WebViewClient());
        webView.setWebChromeClient(new WebChromeClient());
        webView.loadUrl("file:///android_asset/online_catalog.html");
    }

    private String accountJson() {
        JSONObject o = new JSONObject();
        try {
            if (currentAccount != null) {
                o.put("name", currentAccount.getDisplayName() == null ? "" : currentAccount.getDisplayName());
                o.put("email", currentAccount.getEmail() == null ? "" : currentAccount.getEmail());
                o.put("id", currentAccount.getId() == null ? "" : currentAccount.getId());
                o.put("photo", currentAccount.getPhotoUrl() == null ? "" : currentAccount.getPhotoUrl().toString());
            }
        } catch (JSONException ignored) {}
        return o.toString();
    }

    private class AccountBridge {
        @JavascriptInterface
        public String getAccountJson() {
            return accountJson();
        }

        @JavascriptInterface
        public void logout() {
            runOnUiThread(() -> googleSignInClient.signOut().addOnCompleteListener(task -> showLoginScreen()));
        }
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
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
