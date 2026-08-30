import React, { useState } from "react";
import { KnowledgeItem } from "../types";
import {
  Trash2,
  ExternalLink,
  Search,
  Download,
  Copy,
  Check,
  Layers,
  FileCode,
  Globe,
  Share2,
  FileText,
  Clock,
  Sparkles,
} from "lucide-react";

interface BrainInventoryProps {
  items: KnowledgeItem[];
  onDeleteItem: (id: string) => Promise<void>;
  onClearAll?: () => Promise<void>;
  onSelectForRecall: (title: string) => void;
}

export const BrainInventory: React.FC<BrainInventoryProps> = ({
  items,
  onDeleteItem,
  onClearAll,
  onSelectForRecall,
}) => {
  const [filterType, setFilterType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const categories = [
    { id: "all", label: "All Items" },
    { id: "url", label: "URLs & GitHub" },
    { id: "note", label: "Notes & Memos" },
    { id: "code", label: "Code & SQL" },
    { id: "document", label: "Docs & Research" },
    { id: "social", label: "Social & Reels" },
  ];

  const filtered = items.filter((item) => {
    const matchesType = filterType === "all" || item.type === filterType;
    const matchesSearch =
      searchQuery.trim() === "" ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesType && matchesSearch;
  });

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportJSON = () => {
    const blob = new Blob([JSON.stringify(items, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `second-brain-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "url":
        return <Globe className="w-3.5 h-3.5 text-emerald-400" />;
      case "code":
        return <FileCode className="w-3.5 h-3.5 text-indigo-400" />;
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
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1f1f1f]">
        <div>
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <span>Knowledge Base Inventory</span>
            <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-800/60 text-cyan-300 font-bold">
              {items.length} Nodes Indexed
            </span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1 font-mono">
            Vectorized URLs, GitHub repos, docs, and notes embedded with 768-dim Google AI Studio embeddings.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {items.length > 0 && onClearAll && (
            <button
              onClick={onClearAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono bg-red-950/40 hover:bg-red-950/80 text-red-300 border border-red-800/50 hover:border-red-600 transition cursor-pointer"
              title="Delete all stored knowledge nodes"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
              <span>Clear All</span>
            </button>
          )}

          <button
            onClick={handleExportJSON}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-mono bg-[#0e0e0e] hover:bg-[#181818] text-zinc-200 border border-[#2a2a2a] hover:border-zinc-500 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Export Backup (.json)</span>
          </button>
        </div>
      </div>

      {/* Filter Chips & Sub-Search */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Type pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilterType(cat.id)}
              className={`px-3 py-1 text-xs font-mono rounded-md whitespace-nowrap transition cursor-pointer ${
                filterType === cat.id
                  ? "bg-cyan-950/70 text-cyan-200 font-semibold border border-cyan-600/70 shadow-[0_0_10px_rgba(6,182,212,0.2)]"
                  : "bg-[#0a0a0a] text-zinc-400 hover:text-white border border-[#222222] hover:border-zinc-600"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="relative min-w-[240px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter memories by keyword or tag..."
            className="w-full bg-[#080808] border border-[#222222] focus:border-cyan-500/80 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none font-mono"
          />
        </div>
      </div>

      {/* Inventory Items List */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-[#1f1f1f] bg-[#070707] p-12 text-center">
          <Layers className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
          <h3 className="text-sm font-medium text-zinc-300">No matching memories found</h3>
          <p className="text-xs text-zinc-500 mt-1 font-mono">
            Try switching filters or dump new knowledge using the input console above.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="group rounded-xl bg-[#080808] border border-[#1e1e1e] hover:border-zinc-600 p-5 transition-all flex flex-col gap-3 relative shadow-md hover:shadow-lg"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-md border text-[11px] font-mono font-medium flex items-center gap-1.5 ${getTypeStyle(item.type)}`}>
                    {getTypeIcon(item.type)}
                    <span className="uppercase tracking-wider">{item.type}</span>
                  </span>
                  {item.metadata?.domain && (
                    <>
                      <span className="text-zinc-600">•</span>
                      <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/30 px-2 py-0.5 rounded border border-cyan-900/40">
                        {item.metadata.domain}
                      </span>
                    </>
                  )}
                  <span className="text-zinc-600">•</span>
                  <span className="text-[10px] font-mono text-zinc-400 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-zinc-500" />
                    {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onSelectForRecall(item.title)}
                    className="px-2.5 py-1 rounded bg-[#121212] hover:bg-cyan-950/50 text-cyan-300 hover:text-cyan-200 border border-[#2a2a2a] hover:border-cyan-700/60 text-xs font-mono transition flex items-center gap-1 cursor-pointer"
                    title="Run semantic retrieval query for this topic"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="hidden sm:inline text-[11px]">Recall</span>
                  </button>

                  <button
                    onClick={() => handleCopy(item.sourceUrl || item.rawContent, item.id)}
                    className="p-1.5 rounded hover:bg-[#181818] text-zinc-400 hover:text-white transition cursor-pointer"
                    title="Copy content"
                  >
                    {copiedId === item.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>

                  <button
                    onClick={() => onDeleteItem(item.id)}
                    className="p-1.5 rounded hover:bg-red-950/50 text-zinc-500 hover:text-red-400 transition cursor-pointer"
                    title="Delete item from Second Brain"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Title & Summary */}
              <div>
                <h4 className="text-sm font-semibold text-white group-hover:text-cyan-200 transition">
                  {item.title}
                </h4>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed line-clamp-2 font-sans">
                  {item.summary}
                </p>
              </div>

              {/* Tags & External Link */}
              <div className="flex items-center justify-between pt-2.5 border-t border-[#1a1a1a]">
                <div className="flex flex-wrap gap-1.5">
                  {item.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#111111] text-zinc-300 border border-[#242424]"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>

                {item.sourceUrl && (
                  <a
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-300 hover:text-emerald-200 bg-emerald-950/40 hover:bg-emerald-950/70 px-2.5 py-1 rounded border border-emerald-800/50 transition cursor-pointer font-medium"
                  >
                    <span>Open Link</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
