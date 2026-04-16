'use client';
/**
 * FitMate Auth — Google Sign-In via a custom Capacitor 8 native plugin.
 * No external npm package needed — uses GoogleSignInPlugin.java directly.
 *
 * Setup checklist (one-time, per developer):
 *  1. Create a Firebase project → add Android app (package: com.fitmate.app)
 *  2. Download google-services.json → place in android/app/google-services.json
 *  3. Firebase Console → Authentication → Sign-in method → enable Google
 *  4. Google Cloud Console → APIs & Services → Credentials →
 *     find "Web client (auto created by Google Service)" → copy Client ID
 *  5. Paste it as WEB_CLIENT_ID below
 *  6. npx cap sync android  (syncs the native plugin)
 *  7. Build in Android Studio → run on device
 *
 * NOTE: Google Sign-In requires a physical device or an emulator with
 * Google Play Services. It will NOT work on the web (browser) dev server.
 */

import { Capacitor } from '@capacitor/core';
import { GoogleSignIn } from './google-auth-plugin';

// ── ✏️  Replace with your Web Client ID from Google Cloud Console ─────────────
export const WEB_CLIENT_ID = '689370436935-4cub5f8plqe1q921s6e9b1lotnd3pif3.apps.googleusercontent.com';
// ─────────────────────────────────────────────────────────────────────────────

export type AuthType = 'google' | 'guest';

export type GoogleUser = {
  name: string;
  email: string;
  photoUrl?: string;
  id?: string;
  idToken?: string;
};

const AUTH_TYPE_KEY   = 'fitmate_auth_type';
const GOOGLE_USER_KEY = 'fitmate_google_user';

// ── Auth type helpers ─────────────────────────────────────────────────────────

export function getAuthType(): AuthType | null {
  try {
    const v = localStorage.getItem(AUTH_TYPE_KEY);
    if (v === 'google' || v === 'guest') return v;
  } catch { /* ignore */ }
  return null;
}

export function setAuthType(type: AuthType): void {
  try { localStorage.setItem(AUTH_TYPE_KEY, type); } catch { /* ignore */ }
}

export function clearAuthType(): void {
  try { localStorage.removeItem(AUTH_TYPE_KEY); } catch { /* ignore */ }
}

// ── Stored Google user ────────────────────────────────────────────────────────

export function getStoredGoogleUser(): GoogleUser | null {
  try {
    const raw = localStorage.getItem(GOOGLE_USER_KEY);
    if (raw) return JSON.parse(raw) as GoogleUser;
  } catch { /* ignore */ }
  return null;
}

function storeGoogleUser(user: GoogleUser): void {
  try { localStorage.setItem(GOOGLE_USER_KEY, JSON.stringify(user)); } catch { /* ignore */ }
}

export function clearGoogleUser(): void {
  try { localStorage.removeItem(GOOGLE_USER_KEY); } catch { /* ignore */ }
}

// ── Sign-in ───────────────────────────────────────────────────────────────────

/**
 * Opens the native Google account picker.
 * Returns the signed-in user, or null if:
 *  - Running in a browser (not native)
 *  - User cancelled
 *  - webClientId is not configured yet
 */
export type SignInError = 'cancelled' | 'sha1_missing' | 'unknown';

/**
 * Opens the native Google account picker.
 * Returns { user } on success, or { error } on failure.
 * Returns null when running in browser (no native platform).
 */
export async function signInWithGoogle(): Promise<
  | { user: GoogleUser; error?: never }
  | { error: SignInError; user?: never }
  | null
> {
  if (!Capacitor.isNativePlatform()) {
    return null; // browser / dev server — no native auth
  }

  try {
    const result = await GoogleSignIn.signIn({ webClientId: WEB_CLIENT_ID });
    const user: GoogleUser = {
      name:     result.name     || 'User',
      email:    result.email    || '',
      photoUrl: result.photoUrl || undefined,
      id:       result.id       || undefined,
      idToken:  result.idToken  || undefined,
    };
    storeGoogleUser(user);
    setAuthType('google');
    return { user };

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[FitMate] signInWithGoogle error:', msg);

    if (msg.includes('SIGN_IN_CANCELLED')) return { error: 'cancelled' };
    if (msg.includes('SHA1_NOT_REGISTERED')) return { error: 'sha1_missing' };
    return { error: 'unknown' };
  }
}

// ── Sign-out ──────────────────────────────────────────────────────────────────

/**
 * Signs out of Google and clears stored credentials.
 * Does NOT reset app data — call resetStore() separately if a full wipe is needed.
 */
export async function signOutGoogle(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try { await GoogleSignIn.signOut(); } catch { /* ignore */ }
  }
  clearGoogleUser();
  clearAuthType();
}

// ── Silent restore on app launch ──────────────────────────────────────────────

/**
 * Checks for an existing Google session without showing any UI.
 * Updates the stored user if the account is still valid.
 * Call once in ClientProviders after the store is initialised.
 */
export async function trySilentGoogleRestore(): Promise<GoogleUser | null> {
  if (!Capacitor.isNativePlatform()) return null;
  if (getAuthType() !== 'google') return null;
  try {
    const result = await GoogleSignIn.getCurrentUser();
    if (result?.email) {
      const user: GoogleUser = {
        name:     result.name     || 'User',
        email:    result.email,
        photoUrl: result.photoUrl || undefined,
        id:       result.id       || undefined,
      };
      storeGoogleUser(user);
      return user;
    }
  } catch { /* ignore */ }
  return null;
}
