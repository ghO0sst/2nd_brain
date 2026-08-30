import React, { useState, useEffect } from "react";
import {
  X,
  FolderGit2,
  Mail,
  FileText,
  ArrowRight,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Search,
  ExternalLink,
  Lock,
  Sparkles,
  FileCode,
  Calendar,
  User as UserIcon,
  HardDrive,
  Inbox,
  Star,
} from "lucide-react";
import {
  listGoogleDriveFiles,
  getGoogleDriveFileContent,
  listGmailMessages,
  GoogleDriveFile,
  GmailMessageSummary,
} from "../lib/workspace";
import { googleSignIn, getAccessToken } from "../lib/firebase";

interface DriveGmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onIngest: (payload: {
    text: string;
    sourceUrl?: string;
    type?: string;
    rawContent?: string;
  }) => Promise<void>;
  userEmail?: string | null;
  onOpenAuth?: () => void;
}

export const DriveGmailModal: React.FC<DriveGmailModalProps> = ({
  isOpen,
  onClose,
  onIngest,
  userEmail,
  onOpenAuth,
}) => {
  const [activeTab, setActiveTab] = useState<"drive" | "gmail" | "manual">("drive");

  // Google Drive state
  const [driveFiles, setDriveFiles] = useState<GoogleDriveFile[]>([]);
  const [driveSearch, setDriveSearch] = useState("");
  const [isLoadingDrive, setIsLoadingDrive] = useState(false);
  const [driveError, setDriveError] = useState<string | null>(null);
  const [ingestingFileId, setIngestingFileId] = useState<string | null>(null);

  // Gmail state
  const [gmailMessages, setGmailMessages] = useState<GmailMessageSummary[]>([]);
  const [gmailSearch, setGmailSearch] = useState("is:starred OR label:important");
  const [isLoadingGmail, setIsLoadingGmail] = useState(false);
  const [gmailError, setGmailError] = useState<string | null>(null);
  const [ingestingMsgId, setIngestingMsgId] = useState<string | null>(null);

  // Manual tab state
  const [manualUrl, setManualUrl] = useState("");
  const [manualContent, setManualContent] = useState("");
  const [manualTitle, setManualTitle] = useState("");
  const [isManualSubmitting, setIsManualSubmitting] = useState(false);

  // Global success badge
  const [successItemTitle, setSuccessItemTitle] = useState<string | null>(null);

  // Initial load when modal opens or tab changes
  useEffect(() => {
    if (isOpen) {
      if (activeTab === "drive" && driveFiles.length === 0) {
        loadDriveFiles();
      } else if (activeTab === "gmail" && gmailMessages.length === 0) {
        loadGmailMessages();
      }
    }
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  const loadDriveFiles = async (query = driveSearch) => {
    setIsLoadingDrive(true);
    setDriveError(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        setDriveError("Google OAuth authorization token not active. Please sign in.");
        return;
      }
      const files = await listGoogleDriveFiles(token, query);
      setDriveFiles(files);
    } catch (err: any) {
      console.error("Drive load error:", err);
      setDriveError(err.message || "Failed to query Google Drive");
    } finally {
      setIsLoadingDrive(false);
    }
  };

  const loadGmailMessages = async (query = gmailSearch) => {
    setIsLoadingGmail(true);
    setGmailError(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        setGmailError("Google OAuth authorization token not active. Please sign in.");
        return;
      }
      const messages = await listGmailMessages(token, query, 12);
      setGmailMessages(messages);
    } catch (err: any) {
      console.error("Gmail load error:", err);
      setGmailError(err.message || "Failed to query Gmail messages");
    } finally {
      setIsLoadingGmail(false);
    }
  };

  const handleIngestDriveFile = async (file: GoogleDriveFile) => {
    setIngestingFileId(file.id);
    try {
      const token = await getAccessToken();
      let fileBody = "";
      if (token) {
        fileBody = await getGoogleDriveFileContent(token, file.id, file.mimeType);
      }

      const formattedContent = `[Google Drive Document: ${file.name}]
File Type: ${file.mimeType}
Link: ${file.webViewLink || "https://drive.google.com"}
Modified: ${file.modifiedTime ? new Date(file.modifiedTime).toLocaleString() : "Unknown"}

Content Excerpt / Body:
${fileBody.slice(0, 10000)}`;

      await onIngest({
        text: formattedContent,
        sourceUrl: file.webViewLink || undefined,
        type: "drive",
      });

      setSuccessItemTitle(file.name);
      setTimeout(() => {
        setSuccessItemTitle(null);
      }, 3000);
    } catch (e: any) {
      console.error("Failed to ingest Drive file:", e);
      setDriveError(`Ingestion error: ${e.message}`);
    } finally {
      setIngestingFileId(null);
    }
  };

  const handleIngestGmailMessage = async (msg: GmailMessageSummary) => {
    setIngestingMsgId(msg.id);
    try {
      const formattedContent = `[Gmail Starred / Important Email]
Subject: ${msg.subject || "No Subject"}
From: ${msg.from || "Unknown"}
Date: ${msg.date || "Unknown"}
Thread ID: ${msg.threadId}

Email Content:
${(msg.body || msg.snippet || "").slice(0, 8000)}`;

      await onIngest({
        text: formattedContent,
        type: "gmail",
      });

      setSuccessItemTitle(msg.subject || "Email Conversation");
      setTimeout(() => {
        setSuccessItemTitle(null);
      }, 3000);
    } catch (e: any) {
      console.error("Failed to ingest Gmail message:", e);
      setGmailError(`Ingestion error: ${e.message}`);
    } finally {
      setIngestingMsgId(null);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualContent.trim() && !manualUrl.trim()) return;

    setIsManualSubmitting(true);
    try {
      const combined = `${manualTitle ? `Title: ${manualTitle}\n\n` : ""}${manualUrl ? `Source: ${manualUrl}\n\n` : ""}${manualContent}`;
      await onIngest({
        text: combined,
        sourceUrl: manualUrl || undefined,
        type: manualUrl.includes("drive") ? "drive" : "url",
      });
      setSuccessItemTitle(manualTitle || "Custom Note");
      setManualTitle("");
      setManualUrl("");
      setManualContent("");
      setTimeout(() => {
        setSuccessItemTitle(null);
      }, 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsManualSubmitting(false);
    }
  };

  const handleTriggerSignIn = async () => {
    try {
      const res = await googleSignIn();
      if (res) {
        if (activeTab === "drive") {
          await loadDriveFiles();
        } else if (activeTab === "gmail") {
          await loadGmailMessages();
        }
      }
    } catch (e: any) {
      if (
        e?.code === "auth/popup-closed-by-user" ||
        e?.code === "auth/cancelled-popup-request" ||
        e?.message?.includes("popup-closed-by-user")
      ) {
        return;
      }
      console.error("Sign-in trigger error:", e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-[#000000] border border-[#222222] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#1a1a1a] bg-[#050505] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-[#111111] border border-[#262626] flex items-center justify-center text-cyan-400">
              <FolderGit2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-mono font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                <span>Google Workspace Live Ingestion</span>
                <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-1.5 py-0.2 rounded font-mono">
                  OAuth 2.0
                </span>
              </h3>
              <p className="text-[11px] text-zinc-400 font-sans">
                Browse, search, and vectorize Google Docs & Gmail threads directly into your Second Brain
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#161616] text-[#666666] hover:text-white cursor-pointer transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-[#1a1a1a] px-6 pt-2 gap-2 bg-[#050505] overflow-x-auto">
          <button
            onClick={() => setActiveTab("drive")}
            className={`pb-2.5 px-3 text-xs font-mono border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === "drive"
                ? "border-cyan-400 text-cyan-300 font-semibold"
                : "border-transparent text-zinc-400 hover:text-white"
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>1. Google Drive & Docs</span>
          </button>
          <button
            onClick={() => setActiveTab("gmail")}
            className={`pb-2.5 px-3 text-xs font-mono border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === "gmail"
                ? "border-cyan-400 text-cyan-300 font-semibold"
                : "border-transparent text-zinc-400 hover:text-white"
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>2. Gmail Inbox & Notes</span>
          </button>
          <button
            onClick={() => setActiveTab("manual")}
            className={`pb-2.5 px-3 text-xs font-mono border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === "manual"
                ? "border-cyan-400 text-cyan-300 font-semibold"
                : "border-transparent text-zinc-400 hover:text-white"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>3. Manual Paste & Custom Link</span>
          </button>
        </div>

        {/* Ingestion Toast / Notification */}
        {successItemTitle && (
          <div className="bg-emerald-950/80 border-b border-emerald-800/80 px-6 py-2 flex items-center justify-between text-xs text-emerald-200 font-mono">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span>
                Vectorized & Ingested into Second Brain: <strong>{successItemTitle}</strong>
              </span>
            </div>
            <span className="text-[10px] text-emerald-400">768-dim Synced</span>
          </div>
        )}

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#000000] space-y-4 font-sans">
          {/* TAB 1: GOOGLE DRIVE */}
          {activeTab === "drive" && (
            <div className="space-y-4">
              {/* Drive Search and Controls */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={driveSearch}
                    onChange={(e) => setDriveSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") loadDriveFiles(driveSearch);
                    }}
                    placeholder="Search Google Drive by file name or keyword..."
                    className="w-full bg-[#080808] border border-[#1f1f1f] focus:border-cyan-600 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none font-mono"
                  />
                </div>
                <button
                  onClick={() => loadDriveFiles(driveSearch)}
                  disabled={isLoadingDrive}
                  className="px-3.5 py-2 rounded-lg bg-[#0e0e0e] hover:bg-[#1a1a1a] border border-[#222222] text-xs font-mono text-zinc-200 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoadingDrive ? "animate-spin" : ""}`} />
                  <span>Search</span>
                </button>
              </div>

              {/* Error or Auth Notice */}
              {driveError && (
                <div className="p-4 rounded-lg bg-amber-950/40 border border-amber-800/50 flex items-center justify-between gap-3 text-xs text-amber-200">
                  <div className="flex items-center gap-2 font-mono">
                    <Lock className="w-4 h-4 text-amber-400" />
                    <span>{driveError}</span>
                  </div>
                  <button
                    onClick={handleTriggerSignIn}
                    className="px-3 py-1 rounded bg-white text-black font-mono font-medium hover:bg-zinc-200 transition cursor-pointer"
                  >
                    Connect Google
                  </button>
                </div>
              )}

              {/* Loading State */}
              {isLoadingDrive ? (
                <div className="py-16 flex flex-col items-center justify-center gap-3 text-center">
                  <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
                  <div className="text-xs font-mono text-zinc-400">
                    Querying Google Drive API (drive.googleapis.com)...
                  </div>
                </div>
              ) : driveFiles.length > 0 ? (
                <div className="space-y-2.5">
                  <div className="text-[11px] font-mono text-zinc-400 flex items-center justify-between">
                    <span>Found {driveFiles.length} files in Google Drive:</span>
                    <span>Click "Vectorize &amp; Ingest" to index</span>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5">
                    {driveFiles.map((file) => {
                      const isIngesting = ingestingFileId === file.id;
                      const isDoc = file.mimeType.includes("document");
                      const isSheet = file.mimeType.includes("spreadsheet");
                      const isPdf = file.mimeType.includes("pdf");

                      return (
                        <div
                          key={file.id}
                          className="p-3.5 rounded-lg border border-[#1f1f1f] bg-[#070707] hover:border-[#333333] transition flex items-center justify-between gap-4 group"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="w-8 h-8 rounded bg-[#121212] border border-[#222222] flex items-center justify-center text-cyan-400 shrink-0">
                              {isDoc ? (
                                <FileText className="w-4 h-4 text-blue-400" />
                              ) : isSheet ? (
                                <FileCode className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <HardDrive className="w-4 h-4 text-cyan-400" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-white truncate">
                                  {file.name}
                                </span>
                                {file.webViewLink && (
                                  <a
                                    href={file.webViewLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-zinc-500 hover:text-zinc-300"
                                    title="Open in Google Drive"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500 mt-0.5">
                                <span>{file.mimeType.replace("application/vnd.google-apps.", "")}</span>
                                <span>•</span>
                                <span>
                                  {file.modifiedTime
                                    ? new Date(file.modifiedTime).toLocaleDateString()
                                    : "Recently"}
                                </span>
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => handleIngestDriveFile(file)}
                            disabled={isIngesting}
                            className="px-3 py-1.5 rounded-lg bg-cyan-950/70 hover:bg-cyan-900 border border-cyan-700/60 text-cyan-200 text-xs font-mono font-medium transition flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
                          >
                            {isIngesting ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                            )}
                            <span>{isIngesting ? "Vectorizing..." : "Ingest to Brain"}</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : !driveError ? (
                <div className="py-12 text-center space-y-3">
                  <HardDrive className="w-8 h-8 text-zinc-600 mx-auto" />
                  <p className="text-xs text-zinc-400 font-mono">
                    No files returned. Click below to load your Google Drive files or connect your account.
                  </p>
                  <button
                    onClick={() => loadDriveFiles()}
                    className="px-4 py-2 rounded-lg bg-white text-black text-xs font-mono font-medium hover:bg-zinc-200 transition cursor-pointer"
                  >
                    Load Drive Files
                  </button>
                </div>
              ) : null}
            </div>
          )}

          {/* TAB 2: GMAIL */}
          {activeTab === "gmail" && (
            <div className="space-y-4">
              {/* Gmail Search Query */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={gmailSearch}
                    onChange={(e) => setGmailSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") loadGmailMessages(gmailSearch);
                    }}
                    placeholder="Search Gmail filter (e.g. is:starred, label:important, receipt)..."
                    className="w-full bg-[#080808] border border-[#1f1f1f] focus:border-cyan-600 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none font-mono"
                  />
                </div>
                <button
                  onClick={() => loadGmailMessages(gmailSearch)}
                  disabled={isLoadingGmail}
                  className="px-3.5 py-2 rounded-lg bg-[#0e0e0e] hover:bg-[#1a1a1a] border border-[#222222] text-xs font-mono text-zinc-200 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoadingGmail ? "animate-spin" : ""}`} />
                  <span>Filter</span>
                </button>
              </div>

              {/* Preset quick filter tags */}
              <div className="flex items-center gap-2 overflow-x-auto text-[11px] font-mono">
                <button
                  onClick={() => {
                    setGmailSearch("is:starred");
                    loadGmailMessages("is:starred");
                  }}
                  className="px-2.5 py-1 rounded bg-[#0c0c0c] border border-[#222222] hover:border-zinc-400 text-zinc-300 flex items-center gap-1 cursor-pointer"
                >
                  <Star className="w-3 h-3 text-amber-400" />
                  <span>Starred Only</span>
                </button>
                <button
                  onClick={() => {
                    setGmailSearch("label:important");
                    loadGmailMessages("label:important");
                  }}
                  className="px-2.5 py-1 rounded bg-[#0c0c0c] border border-[#222222] hover:border-zinc-400 text-zinc-300 flex items-center gap-1 cursor-pointer"
                >
                  <Inbox className="w-3 h-3 text-cyan-400" />
                  <span>Important</span>
                </button>
                <button
                  onClick={() => {
                    setGmailSearch("subject:notes OR subject:ideas");
                    loadGmailMessages("subject:notes OR subject:ideas");
                  }}
                  className="px-2.5 py-1 rounded bg-[#0c0c0c] border border-[#222222] hover:border-zinc-400 text-zinc-300 flex items-center gap-1 cursor-pointer"
                >
                  <FileText className="w-3 h-3 text-emerald-400" />
                  <span>Notes &amp; Ideas</span>
                </button>
              </div>

              {/* Error or Auth Notice */}
              {gmailError && (
                <div className="p-4 rounded-lg bg-amber-950/40 border border-amber-800/50 flex items-center justify-between gap-3 text-xs text-amber-200">
                  <div className="flex items-center gap-2 font-mono">
                    <Lock className="w-4 h-4 text-amber-400" />
                    <span>{gmailError}</span>
                  </div>
                  <button
                    onClick={handleTriggerSignIn}
                    className="px-3 py-1 rounded bg-white text-black font-mono font-medium hover:bg-zinc-200 transition cursor-pointer"
                  >
                    Connect Google
                  </button>
                </div>
              )}

              {/* Loading State */}
              {isLoadingGmail ? (
                <div className="py-16 flex flex-col items-center justify-center gap-3 text-center">
                  <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
                  <div className="text-xs font-mono text-zinc-400">
                    Querying Gmail API (gmail.googleapis.com)...
                  </div>
                </div>
              ) : gmailMessages.length > 0 ? (
                <div className="space-y-2.5">
                  <div className="text-[11px] font-mono text-zinc-400 flex items-center justify-between">
                    <span>Found {gmailMessages.length} emails:</span>
                    <span>Click to vectorize context</span>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5">
                    {gmailMessages.map((msg) => {
                      const isIngesting = ingestingMsgId === msg.id;

                      return (
                        <div
                          key={msg.id}
                          className="p-3.5 rounded-lg border border-[#1f1f1f] bg-[#070707] hover:border-[#333333] transition flex items-start justify-between gap-4 group"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-medium text-white truncate">
                                {msg.subject || "Email Conversation"}
                              </span>
                            </div>
                            <div className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                              {msg.snippet || msg.body || "No preview text"}
                            </div>
                            <div className="flex items-center gap-3 text-[10px] font-mono text-zinc-500 mt-2">
                              <span className="truncate max-w-[200px]">{msg.from}</span>
                              <span>•</span>
                              <span>{msg.date ? new Date(msg.date).toLocaleDateString() : ""}</span>
                            </div>
                          </div>

                          <button
                            onClick={() => handleIngestGmailMessage(msg)}
                            disabled={isIngesting}
                            className="px-3 py-1.5 rounded-lg bg-cyan-950/70 hover:bg-cyan-900 border border-cyan-700/60 text-cyan-200 text-xs font-mono font-medium transition flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
                          >
                            {isIngesting ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                            )}
                            <span>{isIngesting ? "Vectorizing..." : "Ingest"}</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : !gmailError ? (
                <div className="py-12 text-center space-y-3">
                  <Mail className="w-8 h-8 text-zinc-600 mx-auto" />
                  <p className="text-xs text-zinc-400 font-mono">
                    No emails found for this filter. Load starred emails or connect your Google account.
                  </p>
                  <button
                    onClick={() => loadGmailMessages()}
                    className="px-4 py-2 rounded-lg bg-white text-black text-xs font-mono font-medium hover:bg-zinc-200 transition cursor-pointer"
                  >
                    Load Starred Emails
                  </button>
                </div>
              ) : null}
            </div>
          )}

          {/* TAB 3: MANUAL INGESTION */}
          {activeTab === "manual" && (
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-1.5">
                  Optional Title / Header
                </label>
                <input
                  type="text"
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  placeholder="e.g. Q3 Growth Strategy / Obsidian Daily Sync"
                  className="w-full bg-[#080808] border border-[#1f1f1f] focus:border-cyan-600 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-1.5">
                  Source URL / Google Doc Link
                </label>
                <input
                  type="url"
                  value={manualUrl}
                  onChange={(e) => setManualUrl(e.target.value)}
                  placeholder="https://docs.google.com/document/d/... or github.com/..."
                  className="w-full bg-[#080808] border border-[#1f1f1f] focus:border-cyan-600 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-1.5">
                  Document Body / Note Excerpt
                </label>
                <textarea
                  value={manualContent}
                  onChange={(e) => setManualContent(e.target.value)}
                  rows={5}
                  placeholder="Paste document text, research excerpt, markdown note, or prompt context..."
                  className="w-full bg-[#080808] border border-[#1f1f1f] focus:border-cyan-600 rounded-lg p-3 text-xs text-white placeholder-zinc-600 focus:outline-none resize-none font-sans leading-relaxed"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={(!manualUrl.trim() && !manualContent.trim()) || isManualSubmitting}
                  className="px-4 py-2 rounded-lg bg-white text-black text-xs font-mono font-medium hover:bg-zinc-200 disabled:bg-[#111111] disabled:text-[#444444] disabled:border-[#222222] transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  {isManualSubmitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      <span>Vectorize &amp; Ingest</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#1a1a1a] bg-[#050505] flex items-center justify-between text-[11px] font-mono text-zinc-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Google Drive + Gmail Live Workspace Integration</span>
          </div>
          <span>Automatic 768-dim Vector Embeddings</span>
        </div>
      </div>
    </div>
  );
};
