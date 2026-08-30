import React, { useState } from "react";
import {
  X,
  Lock,
  CheckCircle2,
  Shield,
  User as UserIcon,
  LogOut,
  Sparkles,
  HardDrive,
  Mail,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { googleSignIn, logout, getAccessToken } from "../lib/firebase";
import { User } from "firebase/auth";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  userEmail: string | null;
  onLoginSuccess: (user: User, token: string) => void;
  onLogoutSuccess: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  user,
  userEmail,
  onLoginSuccess,
  onLogoutSuccess,
}) => {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setIsAuthenticating(true);
    setAuthError(null);
    try {
      const res = await googleSignIn();
      if (res) {
        onLoginSuccess(res.user, res.accessToken);
        setTimeout(() => {
          onClose();
        }, 800);
      }
    } catch (err: any) {
      if (
        err?.code === "auth/popup-closed-by-user" ||
        err?.code === "auth/cancelled-popup-request" ||
        err?.message?.includes("popup-closed-by-user")
      ) {
        return;
      }
      console.error("Sign-in failed:", err);
      setAuthError(err.message || "Google OAuth sign-in was cancelled or failed.");
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
      onLogoutSuccess();
      onClose();
    } catch (err: any) {
      console.error("Sign-out error:", err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#000000] border border-[#222222] rounded-xl shadow-2xl overflow-hidden flex flex-col font-sans">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#1a1a1a] bg-[#050505] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[#161616] border border-[#262626] flex items-center justify-center text-cyan-400">
              <Lock className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-xs font-mono font-semibold text-white uppercase tracking-wider">
              Firebase &amp; Google Workspace Auth
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-[#161616] text-[#666666] hover:text-white cursor-pointer transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 bg-[#000000] space-y-6">
          {userEmail ? (
            /* Active User Session */
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#080808] border border-[#222222] flex items-center gap-3">
                {user?.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || "User"}
                    className="w-10 h-10 rounded-full border border-cyan-500/50"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[#161616] border border-[#333333] flex items-center justify-center text-white">
                    <UserIcon className="w-5 h-5" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-white truncate">
                      {user?.displayName || userEmail}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-700/60 shrink-0">
                      Connected
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-zinc-400 truncate mt-0.5">
                    {userEmail}
                  </p>
                </div>
              </div>

              {/* Active Workspace Scopes */}
              <div className="border border-[#1f1f1f] rounded-xl p-4 bg-[#060606] space-y-2.5">
                <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 font-semibold flex items-center justify-between">
                  <span>Authorized Workspace APIs</span>
                  <span className="text-emerald-400">OAuth 2.0 PKCE</span>
                </div>
                <div className="flex flex-col gap-2 text-xs text-zinc-300 font-mono">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Google Drive (Live docs &amp; file reader)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Gmail API (Starred messages &amp; email context)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Firebase Auth (Secure user identity &amp; token cache)</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleSignOut}
                className="w-full py-2.5 rounded-lg border border-[#2a2a2a] hover:border-red-900 bg-[#0d0d0d] hover:bg-[#1a0505] text-xs font-mono text-zinc-300 hover:text-red-400 transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Disconnect &amp; Sign Out</span>
              </button>
            </div>
          ) : (
            /* Sign In Prompt */
            <div className="space-y-4">
              <div className="text-center space-y-1.5">
                <div className="w-10 h-10 rounded-full bg-cyan-950/50 border border-cyan-700/60 flex items-center justify-center text-cyan-400 mx-auto mb-2">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h4 className="text-base font-semibold text-white">
                  Connect Google Workspace
                </h4>
                <p className="text-xs text-zinc-400 leading-relaxed max-w-xs mx-auto">
                  Authorize Google Drive &amp; Gmail to vectorize your notes, Google Docs, and important emails directly into your Second Brain.
                </p>
              </div>

              {authError && (
                <div className="p-3 rounded-lg bg-red-950/50 border border-red-800 text-xs text-red-200 font-mono flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              {/* Official Google Sign-In Button */}
              <button
                onClick={handleGoogleSignIn}
                disabled={isAuthenticating}
                className="w-full py-2.5 px-4 bg-white text-black hover:bg-zinc-200 rounded-lg text-xs font-mono font-medium flex items-center justify-center gap-3 transition cursor-pointer active:scale-98 shadow-sm disabled:opacity-60"
              >
                {isAuthenticating ? (
                  <Loader2 className="w-4 h-4 animate-spin text-black" />
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#EA4335"
                      d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.8 2.9C6.6 7.4 9.1 5 12 5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.7-2.4 3.6l3.7 2.9c2.2-2 3.7-5 3.7-8.7z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.7 14.8c-.2-.7-.4-1.5-.4-2.3s.1-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.4 0 15.2s.7 5.5 1.9 7.9l3.8-2.9z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-2.9 0-5.4-2-6.3-4.7L1.9 17C3.7 20.9 7.5 23.5 12 23.5z"
                    />
                  </svg>
                )}
                <span>{isAuthenticating ? "Opening Google Auth..." : "Sign in with Google"}</span>
              </button>

              <div className="pt-2 border-t border-[#1a1a1a] flex items-center justify-between text-[10px] font-mono text-zinc-500">
                <div className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-zinc-400" />
                  <span>In-Memory Token Security</span>
                </div>
                <span>Firebase Authentication</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
