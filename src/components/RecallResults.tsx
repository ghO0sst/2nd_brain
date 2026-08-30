import React, { useState } from "react";
import { RecallResult, KnowledgeItem } from "../types";
import {
  ExternalLink,
  Sparkles,
  Layers,
  Copy,
  Check,
  Code,
  FileText,
  Globe,
  Share2,
  MessageSquare,
  Eye,
  X,
} from "lucide-react";

interface RecallResultsProps {
  result: RecallResult | null;
  onSelectForChat?: (item: KnowledgeItem) => void;
}

export const RecallResults: React.FC<RecallResultsProps> = ({
  result,
  onSelectForChat,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<KnowledgeItem | null>(null);

  if (!result) return null;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "url":
        return <Globe className="w-3.5 h-3.5 text-emerald-400" />;
      case "code":
        return <Code className="w-3.5 h-3.5 text-indigo-400" />;
      case "document":
        return <FileText className="w-3.5 h-3.5 text-sky-400" />;
      case "drive":
        return <Globe className="w-3.5 h-3.5 text-blue-400" />;
      case "gmail":
      case "social":
        return <Share2 className="w-3.5 h-3.5 text-rose-400" />;
      default:
        return <Layers className="w-3.5 h-3.5 text-amber-400" />;
    }
  };

  const getTypeStyle = (type: string) => {
    switch (type) {
      case "url":
        return "bg-emerald-950/40 text-emerald-300 border-emerald-800/50";
      case "code":
        return "bg-indigo-950/40 text-indigo-300 border-indigo-800/50";
      case "document":
        return "bg-sky-950/40 text-sky-300 border-sky-800/50";
      case "drive":
        return "bg-blue-950/40 text-blue-300 border-blue-800/50";
      case "gmail":
      case "social":
        return "bg-rose-950/40 text-rose-300 border-rose-800/50";
      default:
        return "bg-amber-950/40 text-amber-300 border-amber-800/50";
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto mt-8 space-y-6">
      {/* Gemini AI Synthesis Card with Vibrant Accent */}
      <div className="rounded-xl bg-gradient-to-b from-[#0e0f18] to-[#050505] border border-cyan-900/40 p-5 shadow-2xl relative overflow-hidden border-l-4 border-l-cyan-500">
        <div className="flex items-center justify-between pb-3 border-b border-[#1f2335] text-xs font-mono">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span className="text-cyan-200 font-semibold uppercase tracking-wider">
              Gemini Cognitive Synthesis
            </span>
          </div>
          <span className="text-[10px] text-cyan-400/80 bg-cyan-950/60 border border-cyan-800/50 px-2 py-0.5 rounded font-mono uppercase tracking-wider">
            {result.matches.length} vector sources cited
          </span>
        </div>

        <div className="mt-3.5 text-sm leading-relaxed text-zinc-200 font-sans space-y-2 whitespace-pre-wrap">
          {result.synthesis}
        </div>
      </div>

      {/* Retrieved Sources Header */}
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400 flex items-center gap-2 font-bold">
          <span className="text-white">Ranked Memory Matches</span>
          <span className="text-zinc-500 font-normal">({result.matches.length} retrieved)</span>
        </h3>
        <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
          Cosine Distance Proximity
        </span>
      </div>

      {/* Ranked Source Cards */}
      <div className="space-y-3">
        {result.matches.map((item, idx) => {
          const score = item.relevanceScore ?? 85;
          const isHighMatch = score >= 80;
          const isMedMatch = score >= 65 && score < 80;

          return (
            <div
              key={item.id || idx}
              className="group rounded-xl bg-[#080808] border border-[#1f1f1f] hover:border-zinc-700 transition-all p-5 flex flex-col gap-3 relative shadow-md hover:shadow-lg"
            >
              {/* Card Header: Type, Score & Actions */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-md border text-[11px] font-mono font-medium flex items-center gap-1.5 ${getTypeStyle(item.type)}`}>
                    {getTypeIcon(item.type)}
                    <span className="uppercase tracking-wider">{item.type}</span>
                  </span>
                  {item.metadata?.domain && (
                    <>
                      <span className="text-[#333333]">•</span>
                      <span className="text-[11px] font-mono text-cyan-400/90 bg-cyan-950/30 px-2 py-0.5 rounded border border-cyan-900/30">
                        {item.metadata.domain}
                      </span>
                    </>
                  )}
                </div>

                {/* Similarity Score Pill */}
                <div className="flex items-center gap-2">
                  <div
                    className={`flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-mono font-semibold border ${
                      isHighMatch
                        ? "bg-emerald-950/60 text-emerald-300 border-emerald-700/60 shadow-[0_0_8px_rgba(16,185,129,0.2)]"
                        : isMedMatch
                        ? "bg-cyan-950/60 text-cyan-300 border-cyan-700/60"
                        : "bg-zinc-900 text-zinc-400 border-zinc-700"
                    }`}
                  >
                    <span>{score}% SEMANTIC MATCH</span>
                  </div>

                  <button
                    onClick={() => handleCopy(item.sourceUrl || item.rawContent, item.id)}
                    className="p-1.5 rounded hover:bg-[#1a1a1a] text-zinc-400 hover:text-white transition cursor-pointer"
                    title="Copy content or link"
                  >
                    {copiedId === item.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Title */}
              <div>
                <h4 className="text-sm font-semibold text-white group-hover:text-cyan-200 transition">
                  {item.title}
                </h4>
                <p className="mt-1 text-xs text-zinc-400 leading-relaxed font-sans">
                  {item.summary}
                </p>
              </div>

              {/* Tags & Actions */}
              <div className="flex items-center justify-between pt-2.5 border-t border-[#1a1a1a] text-xs font-mono">
                <div className="flex flex-wrap gap-1.5">
                  {item.tags.map((tag, tIdx) => (
                    <span
                      key={tIdx}
                      className="px-2 py-0.5 rounded text-[10px] bg-[#111111] text-zinc-300 border border-[#262626]"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPreviewItem(item)}
                    className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white transition px-2 py-1 rounded hover:bg-[#161616] cursor-pointer"
                  >
                    <Eye className="w-3 h-3" />
                    <span>Raw</span>
                  </button>

                  {item.sourceUrl && (
                    <a
                      href={item.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[11px] text-emerald-300 hover:text-emerald-200 bg-emerald-950/40 hover:bg-emerald-950/70 px-2.5 py-1 rounded border border-emerald-800/50 transition cursor-pointer font-medium"
                    >
                      <span>Open Link</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}

                  {onSelectForChat && (
                    <button
                      onClick={() => onSelectForChat(item)}
                      className="flex items-center gap-1 text-[11px] text-cyan-200 bg-cyan-950/40 hover:bg-cyan-950/70 px-2.5 py-1 rounded border border-cyan-800/50 transition cursor-pointer font-medium"
                    >
                      <MessageSquare className="w-3 h-3 text-cyan-400" />
                      <span>Chat</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Raw Item Content Preview Modal */}
      {previewItem && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-[#0a0a0a] border border-[#222222] rounded-lg p-6 shadow-2xl flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between pb-4 border-b border-[#1a1a1a]">
              <div>
                <span className="text-[10px] font-mono text-[#666666] uppercase tracking-wider">
                  Raw Memory Inspection
                </span>
                <h3 className="text-base font-medium text-white mt-0.5">
                  {previewItem.title}
                </h3>
              </div>
              <button
                onClick={() => setPreviewItem(null)}
                className="p-1 rounded hover:bg-[#161616] text-[#666666] hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 flex-1 overflow-y-auto font-mono text-xs text-zinc-300 bg-[#000000] p-4 rounded border border-[#1a1a1a] whitespace-pre-wrap leading-relaxed">
              {previewItem.rawContent}
            </div>

            <div className="mt-4 pt-3 border-t border-[#1a1a1a] flex items-center justify-between text-xs font-mono text-[#666666]">
              <span>Type: {previewItem.type}</span>
              <button
                onClick={() => handleCopy(previewItem.rawContent, "modal")}
                className="px-3 py-1.5 bg-white text-black rounded font-medium hover:bg-zinc-200 transition cursor-pointer text-xs font-mono"
              >
                {copiedId === "modal" ? "Copied!" : "Copy Full Raw Content"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
