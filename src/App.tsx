/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { AppMode, KnowledgeItem, RecallResult } from "./types";
import { Navbar } from "./components/Navbar";
import { OmniInput } from "./components/OmniInput";
import { RecallResults } from "./components/RecallResults";
import { BrainInventory } from "./components/BrainInventory";
import { ChatInterface } from "./components/ChatInterface";
import { SchemaBlueprintModal } from "./components/SchemaBlueprintModal";
import { DriveGmailModal } from "./components/DriveGmailModal";
import { AuthModal } from "./components/AuthModal";
import { Sparkles } from "lucide-react";
import { initAuth, setCachedAccessToken } from "./lib/firebase";
import { User } from "firebase/auth";

export default function App() {
  const [mode, setMode] = useState<AppMode>("recall");
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [recallResult, setRecallResult] = useState<RecallResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isBlueprintOpen, setIsBlueprintOpen] = useState(false);
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>("gh0ost1969@gmail.com");
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [chatInitialPrompt, setChatInitialPrompt] = useState<string>("");

  // Initialize Firebase Auth Listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setAuthUser(user);
        setUserEmail(user.email || "gh0ost1969@gmail.com");
        if (token) {
          setCachedAccessToken(token);
        }
      },
      () => {
        setAuthUser(null);
        setUserEmail(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Load items on mount
  useEffect(() => {
    fetchItems();
  }, []);

  // Global Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setMode("recall");
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "d") {
        e.preventDefault();
        setMode("dump");
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        setMode("chat");
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "i") {
        e.preventDefault();
        setMode("inventory");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const fetchItems = async () => {
    try {
      const res = await fetch("/api/items");
      const data = await res.json();
      if (data.items) {
        setItems(data.items);
      }
    } catch (e) {
      console.error("Failed to load items:", e);
    }
  };

  const handleRecall = async (query: string) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/recall", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, topK: 5 }),
      });
      const data = await res.json();
      setRecallResult(data);
    } catch (e: any) {
      console.error("Recall error:", e);
      setStatusNotice("Failed to query semantic index");
      setTimeout(() => setStatusNotice(null), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleIngest = async (payload: {
    text: string;
    sourceUrl?: string;
    type?: string;
    rawContent?: string;
  }) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.isMulti && Array.isArray(data.items)) {
          setItems((prev) => [...data.items, ...prev]);
          setStatusNotice(`Auto-detected & indexed ${data.items.length} separate items!`);
        } else if (data.item) {
          setItems((prev) => [data.item, ...prev]);
          setStatusNotice(`Vectorized & Indexed: "${data.item.title}"`);
        }
        setTimeout(() => setStatusNotice(null), 3500);
      } else {
        setStatusNotice(data.error || "Failed to process knowledge items");
        setTimeout(() => setStatusNotice(null), 3500);
      }
    } catch (e: any) {
      console.error("Ingest error:", e);
      setStatusNotice("Failed to ingest item. Check network connection.");
      setTimeout(() => setStatusNotice(null), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      const res = await fetch(`/api/items/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setItems((prev) => prev.filter((it) => it.id !== id));
        if (recallResult) {
          setRecallResult((prev) =>
            prev
              ? {
                  ...prev,
                  matches: prev.matches.filter((m) => m.id !== id),
                }
              : null
          );
        }
      }
    } catch (e) {
      console.error("Delete error:", e);
    }
  };

  const handleClearAllItems = async () => {
    try {
      const res = await fetch("/api/items", { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setItems([]);
        setRecallResult(null);
        setStatusNotice("Cleared all stored knowledge entries");
        setTimeout(() => setStatusNotice(null), 3000);
      }
    } catch (e) {
      console.error("Clear all error:", e);
    }
  };

  const handleChat = async (
    messages: { role: string; content: string }[],
    reasoningMode: "fast" | "deep"
  ) => {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, reasoningMode }),
    });
    return await res.json();
  };

  const handleSelectForChat = (item: KnowledgeItem) => {
    setChatInitialPrompt(`Synthesize and extract insights from "${item.title}" with my other memories.`);
    setMode("chat");
  };

  const handleSelectForRecall = (title: string) => {
    setMode("recall");
    handleRecall(title);
  };

  return (
    <div className="min-h-screen bg-[#000000] text-white selection:bg-white selection:text-black flex flex-col font-sans">
      {/* Top Navbar */}
      <Navbar
        mode={mode}
        setMode={setMode}
        totalCount={items.length}
        user={authUser}
        userEmail={userEmail}
        onOpenBlueprint={() => setIsBlueprintOpen(true)}
        onOpenIntegrations={() => setIsWorkspaceOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col items-center">
        {/* Status Toast */}
        {statusNotice && (
          <div className="fixed bottom-6 right-6 z-50 bg-[#0a0a0a] border border-[#333333] text-zinc-100 text-xs font-mono px-4 py-2.5 rounded-lg shadow-2xl flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>{statusNotice}</span>
          </div>
        )}

        {/* View Layouts */}
        {mode === "recall" || mode === "dump" ? (
          <div className="w-full flex flex-col items-center">
            {/* Sophisticated Dark Hero Header */}
            <div className="w-full max-w-2xl text-center mt-4 mb-8">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-light tracking-tight text-white mb-3">
                Enter a thought, link, or file.
              </h1>
              <p className="text-[#666666] text-xs sm:text-sm italic font-serif">
                Searching through personal context, Google Docs, Gmail, and vector embeddings...
              </p>
            </div>

            {/* Omni Central Input with Glow */}
            <OmniInput
              mode={mode}
              setMode={setMode}
              onRecall={handleRecall}
              onIngest={handleIngest}
              isLoading={isLoading}
            />

            {/* Semantic Recall Results */}
            {mode === "recall" && recallResult && (
              <RecallResults
                result={recallResult}
                onSelectForChat={handleSelectForChat}
              />
            )}

            {/* Recent Ingestions Grid Section */}
            {mode === "recall" && !recallResult && items.length > 0 && (
              <div className="mt-14 w-full max-w-4xl">
                <div className="flex items-center justify-between mb-6 px-1">
                  <h2 className="text-xs uppercase tracking-widest text-zinc-400 font-mono font-bold flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                    <span>Recent Ingested Memories</span>
                  </h2>
                  <div className="h-[1px] flex-1 mx-6 bg-[#1f1f1f]" />
                  <button
                    onClick={() => setMode("inventory")}
                    className="text-xs uppercase tracking-wider text-cyan-400 hover:text-cyan-300 transition font-mono cursor-pointer font-semibold"
                  >
                    View All ({items.length}) →
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                  {items.slice(0, 3).map((item, idx) => (
                    <div
                      key={item.id || idx}
                      onClick={() => {
                        if (item.title) {
                          handleRecall(item.title);
                        }
                      }}
                      className="border border-[#222222] hover:border-cyan-700/60 p-5 rounded-xl bg-[#080808] hover:bg-[#0e0e0e] hover:shadow-[0_0_15px_rgba(6,182,212,0.1)] transition-all cursor-pointer group flex flex-col justify-between min-h-[130px]"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] text-cyan-400 font-mono uppercase tracking-wider bg-cyan-950/40 border border-cyan-900/40 px-2 py-0.5 rounded">
                            {item.metadata?.domain || item.type}
                          </span>
                          <span className="text-[10px] font-mono text-zinc-500">
                            {new Date(item.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="text-sm text-white font-semibold mb-1 group-hover:text-cyan-200 line-clamp-1">
                          {item.title}
                        </div>
                        <div className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                          {item.summary}
                        </div>
                      </div>
                      <div className="mt-3 pt-2.5 border-t border-[#1a1a1a] flex items-center justify-between text-[11px] font-mono text-zinc-500 group-hover:text-cyan-300">
                        <span>Click to Recall</span>
                        <span className="text-cyan-400">•</span>
                        <span>Vectorized</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : mode === "chat" ? (
          <div className="w-full mt-2">
            <ChatInterface
              onSendMessage={handleChat}
              initialMessage={chatInitialPrompt}
            />
          </div>
        ) : (
          <div className="w-full mt-2">
            <BrainInventory
              items={items}
              onDeleteItem={handleDeleteItem}
              onClearAll={handleClearAllItems}
              onSelectForRecall={handleSelectForRecall}
            />
          </div>
        )}
      </main>

      {/* Sophisticated Dark Footer */}
      <footer className="w-full border-t border-[#111111] bg-[#000000] px-6 sm:px-10 py-6 flex flex-col sm:flex-row items-center justify-between text-[10px] uppercase tracking-widest text-[#444444] font-semibold gap-4">
        <div className="flex space-x-6 sm:space-x-8">
          <button
            onClick={() => setIsBlueprintOpen(true)}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Settings &amp; Blueprint
          </button>
          <button
            onClick={() => setIsWorkspaceOpen(true)}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Google Drive &amp; Gmail
          </button>
          <button
            onClick={() => {
              setChatInitialPrompt("How does Google AI Studio semantic vector recall work with Supabase pgvector?");
              setMode("chat");
            }}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Help &amp; Docs
          </button>
        </div>
        <div className="text-[10px] font-mono text-[#333333] uppercase">
          Session: Active • 768-dim Vector Space • Firebase Auth
        </div>
      </footer>

      {/* Schema & Blueprint Modal */}
      <SchemaBlueprintModal
        isOpen={isBlueprintOpen}
        onClose={() => setIsBlueprintOpen(false)}
      />

      {/* Workspace & Drive Modal */}
      <DriveGmailModal
        isOpen={isWorkspaceOpen}
        onClose={() => setIsWorkspaceOpen(false)}
        onIngest={handleIngest}
        userEmail={userEmail}
        onOpenAuth={() => setIsAuthOpen(true)}
      />

      {/* Auth & Security Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        user={authUser}
        userEmail={userEmail}
        onLoginSuccess={(user, token) => {
          setAuthUser(user);
          setUserEmail(user.email || null);
          setCachedAccessToken(token);
          setStatusNotice(`Authenticated as ${user.email}`);
          setTimeout(() => setStatusNotice(null), 3000);
        }}
        onLogoutSuccess={() => {
          setAuthUser(null);
          setUserEmail(null);
          setCachedAccessToken(null);
          setStatusNotice("Signed out from Google OAuth session");
          setTimeout(() => setStatusNotice(null), 3000);
        }}
      />
    </div>
  );
}
