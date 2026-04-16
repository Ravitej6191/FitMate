package com.fitmate.app;

import android.app.Activity;
import android.content.Intent;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.auth.api.signin.GoogleSignIn;
import com.google.android.gms.auth.api.signin.GoogleSignInAccount;
import com.google.android.gms.auth.api.signin.GoogleSignInClient;
import com.google.android.gms.auth.api.signin.GoogleSignInOptions;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.tasks.Task;

@CapacitorPlugin(name = "GoogleSignIn")
public class GoogleSignInPlugin extends Plugin {

    private static final String TAG = "GoogleSignInPlugin";
    private GoogleSignInClient googleSignInClient;

    @PluginMethod
    public void signIn(PluginCall call) {
        String webClientId = call.getString("webClientId", "");
        if (webClientId == null || webClientId.isEmpty() ||
                webClientId.equals("YOUR_WEB_CLIENT_ID.apps.googleusercontent.com")) {
            call.reject("WEB_CLIENT_ID_NOT_SET");
            return;
        }

        try {
            GoogleSignInOptions gso = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                    .requestIdToken(webClientId)
                    .requestEmail()
                    .requestProfile()
                    .build();

            googleSignInClient = GoogleSignIn.getClient(getActivity(), gso);
            Intent signInIntent = googleSignInClient.getSignInIntent();
            startActivityForResult(call, signInIntent, "handleSignInResult");
        } catch (Exception e) {
            Log.e(TAG, "signIn setup error: " + e.getMessage(), e);
            call.reject("SIGN_IN_SETUP_FAILED: " + e.getMessage());
        }
    }

    @ActivityCallback
    private void handleSignInResult(PluginCall call, ActivityResult result) {
        if (call == null) return;

        // RESULT_CANCELED means the picker was dismissed OR Google rejected the
        // request before even showing the picker (e.g. error 10 = SHA-1 mismatch).
        if (result.getResultCode() != Activity.RESULT_OK) {
            Log.w(TAG, "Sign-in result not OK, code=" + result.getResultCode());
            call.reject("SIGN_IN_CANCELLED");
            return;
        }

        Intent data = result.getData();
        if (data == null) {
            Log.w(TAG, "Sign-in result data is null");
            call.reject("SIGN_IN_NO_DATA");
            return;
        }

        try {
            Task<GoogleSignInAccount> task = GoogleSignIn.getSignedInAccountFromIntent(data);
            GoogleSignInAccount account = task.getResult(ApiException.class);

            JSObject ret = new JSObject();
            ret.put("id",       safeStr(account.getId()));
            ret.put("name",     safeStr(account.getDisplayName()));
            ret.put("email",    safeStr(account.getEmail()));
            ret.put("photoUrl", account.getPhotoUrl() != null ? account.getPhotoUrl().toString() : "");
            ret.put("idToken",  safeStr(account.getIdToken()));
            call.resolve(ret);

        } catch (ApiException e) {
            int code = e.getStatusCode();
            Log.w(TAG, "ApiException status code: " + code);
            // 10  = DEVELOPER_ERROR  → SHA-1 not registered in Firebase console
            // 12501 = cancelled by user
            // 12500 = general sign-in failed
            if (code == 12501) {
                call.reject("SIGN_IN_CANCELLED");
            } else if (code == 10) {
                call.reject("SHA1_NOT_REGISTERED");
            } else {
                call.reject("SIGN_IN_FAILED_" + code);
            }
        } catch (Exception e) {
            Log.e(TAG, "Unexpected sign-in error: " + e.getMessage(), e);
            call.reject("SIGN_IN_ERROR: " + e.getMessage());
        }
    }

    @PluginMethod
    public void signOut(PluginCall call) {
        if (googleSignInClient == null) {
            GoogleSignInOptions gso = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN).build();
            googleSignInClient = GoogleSignIn.getClient(getActivity(), gso);
        }
        googleSignInClient.signOut().addOnCompleteListener(task -> call.resolve());
    }

    @PluginMethod
    public void getCurrentUser(PluginCall call) {
        GoogleSignInAccount account = GoogleSignIn.getLastSignedInAccount(getContext());
        if (account == null) {
            call.resolve();
            return;
        }
        JSObject ret = new JSObject();
        ret.put("id",       safeStr(account.getId()));
        ret.put("name",     safeStr(account.getDisplayName()));
        ret.put("email",    safeStr(account.getEmail()));
        ret.put("photoUrl", account.getPhotoUrl() != null ? account.getPhotoUrl().toString() : "");
        call.resolve(ret);
    }

    private static String safeStr(String val) {
        return val != null ? val : "";
    }
}
