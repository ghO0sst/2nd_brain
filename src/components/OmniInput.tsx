import React, { useState, useRef, useEffect } from "react";
import { AppMode } from "../types";
import {
  Search,
  PlusCircle,
  ArrowRight,
  Upload,
  Link as LinkIcon,
  FileText,
  Sparkles,
  CheckCircle2,
  FileCode,
  Loader2,
} from "lucide-react";

interface OmniInputProps {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  onRecall: (query: string) => Promise<void>;
  onIngest: (payload: { text: string; sourceUrl?: string; type?: string }) => Promise<void>;
  isLoading: boolean;
}

export const OmniInput: React.FC<OmniInputProps> = ({
  mode,
  setMode,
  onRecall,
  onIngest,
  isLoading,
}) => {
  const [inputValue, setInputValue] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [ingestSuccess, setIngestSuccess] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isRecall = mode === "recall";

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        220
      )}px`;
    }
  }, [inputValue]);

  // Quick sample queries for semantic recall
  const sampleQueries = [
    "that one dark mode UI library I saved from GitHub",
    "React 19 server actions and optimistic state primitives",
    "attention transformer mechanism research paper",
    "pgvector HNSW index setup in Supabase SQL",
    "Tokyo Architecture Guide brutalist structures",
  ];

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const val = inputValue.trim();

    if (isRecall) {
      await onRecall(val);
    } else {
      let type = "note";
      let sourceUrl: string | undefined = undefined;

      // Extract any URL (including GitHub, web links, or links mixed with text)
      const urlRegex = /(https?:\/\/[^\s"'<>]+|github\.com\/[^\s"'<>]+)/i;
      const match = val.match(urlRegex);
      if (match) {
        let matchedUrl = match[0];
        if (!matchedUrl.startsWith("http://") && !matchedUrl.startsWith("https://")) {
          matchedUrl = `https://${matchedUrl}`;
        }
        sourceUrl = matchedUrl;
        type = "url";
      } else if (
        val.includes("CREATE TABLE") ||
        val.includes("function ") ||
        val.includes("const ") ||
        val.includes("import ") ||
        val.includes("def ")
      ) {
        type = "code";
      }

      await onIngest({ text: val, sourceUrl, type });
      setInputValue("");
      setIngestSuccess(true);
      setTimeout(() => setIngestSuccess(false), 3000);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Drag & drop file handler
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await processFile(e.target.files[0]);
    }
  };

  const processFile = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      setMode("dump");
      setInputValue(`[Uploaded File: ${file.name}]\n\n${content.slice(0, 5000)}`);
    };
    reader.readAsText(file);
  };

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col items-center">
      {/* Sleek Mode Switch Bar with Vibrant Highlights */}
      <div className="flex items-center justify-between w-full mb-3.5 px-1">
        <div className="flex items-center gap-1.5 bg-[#0a0a0a] border border-[#1f1f1f] p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setMode("recall")}
            className={`px-3.5 py-1.5 text-xs font-mono rounded-md flex items-center gap-1.5 transition cursor-pointer ${
              isRecall
                ? "bg-cyan-950/70 text-cyan-200 font-medium border border-cyan-700/60 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                : "text-zinc-400 hover:text-white hover:bg-[#141414]"
            }`}
          >
            <Search className={`w-3.5 h-3.5 ${isRecall ? "text-cyan-400" : "text-zinc-500"}`} />
            <span>Search & Recall</span>
          </button>
          <button
            type="button"
            onClick={() => setMode("dump")}
            className={`px-3.5 py-1.5 text-xs font-mono rounded-md flex items-center gap-1.5 transition cursor-pointer ${
              !isRecall
                ? "bg-emerald-950/70 text-emerald-200 font-medium border border-emerald-700/60 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                : "text-zinc-400 hover:text-white hover:bg-[#141414]"
            }`}
          >
            <PlusCircle className={`w-3.5 h-3.5 ${!isRecall ? "text-emerald-400" : "text-zinc-500"}`} />
            <span>Dump & Ingest</span>
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono text-zinc-400">
          <span className="text-[10px] bg-[#111111] text-zinc-300 px-2.5 py-1 rounded border border-[#2a2a2a] uppercase tracking-widest font-mono">
            {isRecall ? "⌘ K" : "⌘ D"}
          </span>
        </div>
      </div>

      {/* Main Center Console Box with Sophisticated Glowing Border */}
      <div className="w-full relative group">
        <div
          className={`absolute -inset-1 rounded-2xl blur-lg transition-opacity duration-300 pointer-events-none opacity-20 group-hover:opacity-35 ${
            isRecall ? "bg-cyan-600" : "bg-emerald-600"
          }`}
        />

        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`relative rounded-xl bg-[#000000] border transition-all duration-200 shadow-2xl ${
            dragActive
              ? "border-emerald-400 bg-[#06140e] ring-2 ring-emerald-500/50"
              : isRecall
              ? "border-[#2a2a2a] focus-within:border-cyan-500/70 focus-within:ring-1 focus-within:ring-cyan-500/30"
              : "border-[#2a2a2a] focus-within:border-emerald-500/70 focus-within:ring-1 focus-within:ring-emerald-500/30"
          }`}
        >
          {/* Top indicator bar with colored badges */}
          <div className="flex items-center justify-between px-5 pt-3.5 pb-2.5 text-[10px] font-mono border-b border-[#1a1a1a]">
            <div className="flex items-center space-x-2">
              <span
                className={`w-2 h-2 rounded-full animate-pulse ${
                  isRecall ? "bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]" : "bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]"
                }`}
              />
              <span
                className={`uppercase tracking-wider font-semibold ${
                  isRecall ? "text-cyan-300" : "text-emerald-300"
                }`}
              >
                {isRecall ? "Semantic Retrieval Engine" : "Multi-Source Knowledge Ingestion"}
              </span>
            </div>

            <div className="flex items-center space-x-3 text-zinc-400">
              {!isRecall && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#111111] hover:bg-[#1a1a1a] text-zinc-300 hover:text-white border border-[#2a2a2a] transition cursor-pointer"
                >
                  <Upload className="w-3 h-3 text-emerald-400" />
                  <span>Upload File / PDF</span>
                </button>
              )}
              <span className="text-[#333333]">|</span>
              <span className="text-zinc-500 font-mono">{isRecall ? "768-dim cosine" : "Fast AI Parser"}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-5">
            <div className="flex items-start gap-4">
              <div className="pt-2">
                {isRecall ? (
                  <Search className="w-5 h-5 text-cyan-400" />
                ) : (
                  <PlusCircle className="w-5 h-5 text-emerald-400" />
                )}
              </div>

              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={isRecall ? 1 : 3}
                placeholder={
                  isRecall
                    ? "Ask or describe anything (e.g. 'Sagar's Jarvis repo', 'React actions', 'Brutalist architecture')..."
                    : "Paste 1 or multiple URLs (e.g. paste 10 GitHub repos at once), notes, or code to auto-split and store..."
                }
                className="w-full bg-transparent border-0 resize-none text-white placeholder-zinc-500 focus:outline-none focus:ring-0 text-base md:text-lg font-normal leading-relaxed py-1"
                disabled={isLoading}
              />

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileInputChange}
                className="hidden"
                accept=".txt,.md,.json,.csv,.sql,.js,.ts,.tsx,.py,.pdf,.docx"
              />
            </div>

            {/* Action Row */}
            <div className="flex items-center justify-between pt-3.5 mt-2 border-t border-[#1a1a1a]">
              <div className="flex items-center gap-2">
                {!isRecall && (
                  <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                    <span className="flex items-center gap-1 text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded">
                      <LinkIcon className="w-3 h-3 text-emerald-400" /> GitHub & URLs
                    </span>
                    <span className="flex items-center gap-1 text-sky-400 bg-sky-950/40 border border-sky-800/40 px-2 py-0.5 rounded">
                      <Upload className="w-3 h-3 text-sky-400" /> PDF / DOCX
                    </span>
                    <span className="flex items-center gap-1 text-indigo-400 bg-indigo-950/40 border border-indigo-800/40 px-2 py-0.5 rounded">
                      <FileCode className="w-3 h-3 text-indigo-400" /> Code
                    </span>
                  </div>
                )}

                {ingestSuccess && (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-600/60 px-3 py-1 rounded-md font-mono animate-fade-in">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Memory vectorized & organized!</span>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="submit"
                  disabled={!inputValue.trim() || isLoading}
                  className={`px-5 py-2.5 rounded-lg text-xs font-mono font-semibold flex items-center gap-2 transition cursor-pointer active:scale-95 shadow-md ${
                    !inputValue.trim() || isLoading
                      ? "bg-[#111111] text-zinc-600 border border-[#222222] cursor-not-allowed"
                      : isRecall
                      ? "bg-cyan-500 hover:bg-cyan-400 text-black border border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                      : "bg-emerald-500 hover:bg-emerald-400 text-black border border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                  }`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{isRecall ? "Retrieving..." : "Vectorizing (<1s)..."}</span>
                    </>
                  ) : (
                    <>
                      <span>{isRecall ? "Semantic Recall" : "Dump Memory"}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Suggested Queries for Immediate Testing */}
      {isRecall && (
        <div className="w-full mt-4 flex flex-col items-start px-2">
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-400 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Try natural language recall queries:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {sampleQueries.map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setInputValue(q);
                  onRecall(q);
                }}
                className="text-xs text-zinc-300 hover:text-white bg-[#0a0a0a] hover:bg-[#161616] border border-[#222222] hover:border-cyan-800/60 hover:shadow-[0_0_8px_rgba(6,182,212,0.15)] px-3 py-1.5 rounded-md transition font-mono text-left cursor-pointer"
              >
                "{q}"
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
