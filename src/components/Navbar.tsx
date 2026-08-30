import React from "react";
import { AppMode } from "../types";
import {
  Search,
  PlusCircle,
  MessageSquare,
  Database,
  Code,
  HardDrive,
  Mail,
  User as UserIcon,
  Lock,
} from "lucide-react";
import { User } from "firebase/auth";

interface NavbarProps {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  totalCount: number;
  user: User | null;
  userEmail: string | null;
  onOpenBlueprint: () => void;
  onOpenIntegrations: () => void;
  onOpenAuth: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  mode,
  setMode,
  totalCount,
  user,
  userEmail,
  onOpenBlueprint,
  onOpenIntegrations,
  onOpenAuth,
}) => {
  return (
    <header className="w-full border-b border-[#111111] bg-[#000000]/95 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-6 lg:px-10 py-3.5 flex items-center justify-between transition-all">
      {/* Brand & System Status */}
      <div className="flex items-center gap-4 lg:gap-6">
        <button
          onClick={() => setMode("recall")}
          className="flex items-center space-x-2.5 group text-left focus:outline-none cursor-pointer"
        >
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 group-hover:scale-125 transition-transform shadow-[0_0_8px_rgba(6,182,212,0.6)]" />
          <span className="text-sm font-semibold tracking-wider uppercase text-white font-mono">
            Second Brain
          </span>
        </button>

        <div className="hidden md:flex items-center space-x-4 text-[11px] font-mono text-zinc-500 uppercase tracking-tighter border-l border-[#1a1a1a] pl-4">
          <span className="flex items-center">
            <span className={`w-1.5 h-1.5 rounded-full mr-2 ${userEmail ? "bg-emerald-400 animate-pulse" : "bg-amber-500"}`} />
            {userEmail ? "Google Synced" : "Workspace Ready"}
          </span>
          <span>•</span>
          <span>Index: {totalCount} Items</span>
        </div>
      </div>

      {/* Mode Navigation with Distinct Color Themes */}
      <nav className="flex items-center bg-[#0a0a0a] border border-[#222222] rounded-lg p-1 gap-1">
        <button
          onClick={() => setMode("recall")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono transition cursor-pointer ${
            mode === "recall"
              ? "bg-cyan-950/70 text-cyan-200 font-semibold border border-cyan-700/60 shadow-[0_0_10px_rgba(6,182,212,0.2)]"
              : "text-zinc-400 hover:text-white hover:bg-[#141414]"
          }`}
          title="Semantic Search & Retrieval (Cmd+K)"
        >
          <Search className={`w-3.5 h-3.5 ${mode === "recall" ? "text-cyan-400" : "text-zinc-500"}`} />
          <span className="hidden sm:inline">Recall</span>
        </button>

        <button
          onClick={() => setMode("dump")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono transition cursor-pointer ${
            mode === "dump"
              ? "bg-emerald-950/70 text-emerald-200 font-semibold border border-emerald-700/60 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
              : "text-zinc-400 hover:text-white hover:bg-[#141414]"
          }`}
          title="Ingest URLs, Notes, PDFs & Files (Cmd+D)"
        >
          <PlusCircle className={`w-3.5 h-3.5 ${mode === "dump" ? "text-emerald-400" : "text-zinc-500"}`} />
          <span className="hidden sm:inline">Dump</span>
        </button>

        <button
          onClick={() => setMode("chat")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono transition cursor-pointer ${
            mode === "chat"
              ? "bg-violet-950/70 text-violet-200 font-semibold border border-violet-700/60 shadow-[0_0_10px_rgba(139,92,246,0.2)]"
              : "text-zinc-400 hover:text-white hover:bg-[#141414]"
          }`}
          title="Multi-turn AI Copilot (Cmd+J)"
        >
          <MessageSquare className={`w-3.5 h-3.5 ${mode === "chat" ? "text-violet-400" : "text-zinc-500"}`} />
          <span className="hidden sm:inline">Chat</span>
        </button>

        <button
          onClick={() => setMode("inventory")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono transition cursor-pointer ${
            mode === "inventory"
              ? "bg-sky-950/70 text-sky-200 font-semibold border border-sky-700/60 shadow-[0_0_10px_rgba(14,165,233,0.2)]"
              : "text-zinc-400 hover:text-white hover:bg-[#141414]"
          }`}
          title="Inventory Stream (Cmd+I)"
        >
          <Database className={`w-3.5 h-3.5 ${mode === "inventory" ? "text-sky-400" : "text-zinc-500"}`} />
          <span className="hidden sm:inline">Inventory</span>
        </button>
      </nav>

      {/* Auth, Workspace & Blueprint controls */}
      <div className="flex items-center space-x-2">
        {/* Google Workspace Button */}
        <button
          onClick={onOpenIntegrations}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-mono text-zinc-300 hover:text-white bg-[#0e0e0e] hover:bg-[#161616] border border-[#262626] hover:border-cyan-700 transition cursor-pointer"
          title="Google Drive & Gmail Live Ingestion"
        >
          <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden md:inline">Drive &amp; Gmail</span>
        </button>

        {/* Schema Blueprint Button */}
        <button
          onClick={onOpenBlueprint}
          className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono text-zinc-400 hover:text-white bg-[#0a0a0a] hover:bg-[#141414] border border-[#202020] transition cursor-pointer"
          title="Obsidian, Supabase pgvector & Gemini Blueprint"
        >
          <Code className="w-3.5 h-3.5 text-zinc-400" />
          <span>Blueprint</span>
        </button>

        {/* Firebase Authentication Button */}
        <button
          onClick={onOpenAuth}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition cursor-pointer ${
            userEmail
              ? "bg-[#0c0c0c] text-zinc-200 border border-[#2a2a2a] hover:border-zinc-400"
              : "bg-white text-black font-semibold hover:bg-zinc-200 border border-white"
          }`}
          title="Google Workspace & Firebase Auth"
        >
          {user?.photoURL ? (
            <img
              src={user.photoURL}
              alt="avatar"
              className="w-4 h-4 rounded-full"
              referrerPolicy="no-referrer"
            />
          ) : userEmail ? (
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
          ) : (
            <Lock className="w-3.5 h-3.5" />
          )}
          <span className="max-w-[100px] truncate hidden sm:inline">
            {user?.displayName ? user.displayName.split(" ")[0] : userEmail ? userEmail.split("@")[0] : "Sign In"}
          </span>
        </button>
      </div>
    </header>
  );
};
