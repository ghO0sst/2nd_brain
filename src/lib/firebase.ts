import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User,
} from "firebase/auth";
import firebaseConfig from "../../firebase-applet-config.json";

// Initialize Firebase App singleton
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Configure Google Auth Provider with Google Drive & Gmail Workspace Scopes
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope("https://www.googleapis.com/auth/drive.readonly");
googleProvider.addScope("https://www.googleapis.com/auth/drive.file");
googleProvider.addScope("https://www.googleapis.com/auth/gmail.readonly");
googleProvider.addScope("https://www.googleapis.com/auth/gmail.modify");
googleProvider.addScope("https://mail.google.com/");

// In-memory token cache (Do NOT persist to localStorage/sessionStorage for security)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

/**
 * Initialize Auth State Listener
 */
export const initAuth = (
  onAuthSuccess?: (user: User, token: string | null) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (onAuthSuccess) {
        onAuthSuccess(user, cachedAccessToken);
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) {
        onAuthFailure();
      }
    }
  });
};

/**
 * Sign in with Google Popup and obtain OAuth Bearer Access Token
 */
export const googleSignIn = async (): Promise<{
  user: User;
  accessToken: string;
} | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    
    if (!credential?.accessToken) {
      throw new Error("Failed to retrieve OAuth access token from Google sign in");
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    if (
      error?.code === "auth/popup-closed-by-user" ||
      error?.code === "auth/cancelled-popup-request" ||
      error?.code === "auth/user-cancelled" ||
      error?.message?.includes("popup-closed-by-user") ||
      error?.message?.includes("cancelled-popup-request")
    ) {
      // User closed the popup or cancelled the sign-in flow intentionally
      console.log("Google Sign-In popup closed by user.");
      return null;
    }
    console.error("Firebase Google Sign-In Error:", error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Retrieve the active in-memory OAuth Access Token
 */
export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

/**
 * Set or update the in-memory access token
 */
export const setCachedAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

/**
 * Sign out user and purge token from memory
 */
export const logout = async (): Promise<void> => {
  await signOut(auth);
  cachedAccessToken = null;
};
