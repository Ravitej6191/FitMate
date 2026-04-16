'use client';
/**
 * JS bridge for GoogleSignInPlugin (com.fitmate.app.GoogleSignInPlugin).
 * No npm package required — bridges directly to the native Capacitor plugin.
 */
import { registerPlugin } from '@capacitor/core';

export interface GoogleSignInResult {
  id: string;
  name: string;
  email: string;
  photoUrl: string;
  idToken: string;
}

export interface GoogleSignInPlugin {
  /** Opens the Google account picker sheet. Rejects on cancel or failure. */
  signIn(options: { webClientId: string }): Promise<GoogleSignInResult>;
  /** Signs out of Google silently. */
  signOut(): Promise<void>;
  /** Returns the last signed-in account without UI, or resolves empty if none. */
  getCurrentUser(): Promise<Partial<GoogleSignInResult>>;
}

export const GoogleSignIn = registerPlugin<GoogleSignInPlugin>('GoogleSignIn');
