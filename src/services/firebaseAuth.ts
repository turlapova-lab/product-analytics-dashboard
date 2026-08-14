import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

declare global {
  interface Window {
    google?: any;
  }
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);

export interface GoogleUserInfo {
  user: User | null;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  accessToken: string | null;
}

let cachedAccessToken: string | null = null;

/**
 * Perform Google Sign-In forcing account selection modal first ('prompt: select_account')
 */
export async function googleSignInWithAccountSelect(): Promise<{
  user: User;
  accessToken: string;
}> {
  const provider = new GoogleAuthProvider();
  provider.addScope('https://www.googleapis.com/auth/spreadsheets.readonly');
  provider.addScope('https://www.googleapis.com/auth/drive.readonly');

  // CRITICAL: Force Google to show the account selection screen first!
  provider.setCustomParameters({
    prompt: 'select_account',
  });

  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);

    if (!credential?.accessToken) {
      throw new Error('Google Auth token was not returned.');
    }

    cachedAccessToken = credential.accessToken;
    return {
      user: result.user,
      accessToken: credential.accessToken,
    };
  } catch (err: any) {
    if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
      console.log('Google Auth popup closed or cancelled by user.');
    } else {
      console.error('Firebase Google Sign-In error:', err);
    }
    throw err;
  }
}

/**
 * Sign out from Google Auth
 */
export async function googleSignOut(): Promise<void> {
  await signOut(auth);
  cachedAccessToken = null;
}

/**
 * Get currently cached access token
 */
export function getCachedToken(): string | null {
  return cachedAccessToken;
}

/**
 * Set cached access token
 */
export function setCachedToken(token: string | null): void {
  cachedAccessToken = token;
}

/**
 * GIS Token Client Fallback with prompt: select_account
 */
export function triggerGsiTokenClient(
  onSuccess: (accessToken: string) => void,
  onError?: (err: any) => void
): void {
  if (typeof window !== 'undefined' && window.google?.accounts?.oauth2) {
    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: firebaseConfig.oAuthClientId,
        scope: 'https://www.googleapis.com/auth/spreadsheets.readonly https://www.googleapis.com/auth/drive.readonly',
        prompt: 'select_account', // Force account selection!
        callback: (response: any) => {
          if (response.error) {
            if (onError) onError(response.error);
            return;
          }
          if (response.access_token) {
            cachedAccessToken = response.access_token;
            onSuccess(response.access_token);
          }
        },
      });
      client.requestAccessToken();
    } catch (err) {
      if (onError) onError(err);
    }
  } else {
    if (onError) onError(new Error('Google Identity Services SDK not loaded yet.'));
  }
}
