import React, { useState } from "react";
import {
  X,
  Database,
  Code,
  Copy,
  Check,
  Sparkles,
  Terminal,
  Layers,
  ArrowRight,
} from "lucide-react";

interface SchemaBlueprintModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SchemaBlueprintModal: React.FC<SchemaBlueprintModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"obsidian" | "sql" | "edgefn" | "n8n" | "embeddings">("obsidian");

  if (!isOpen) return null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const obsidianBlueprint = `# ========================================================
# OBSIDIAN BUSINESS BRAIN — 9-FOLDER STANDARD TAXONOMY
# ========================================================

00_Capture/      # Raw unprocessed dumps (transcripts, quick notes)
10_Business/     # Offer, ICP, positioning, pricing, guarantees
20_Marketing/    # Campaigns, ad angles, hooks, content plans
30_Sales/        # Call scripts, objections + rebuttals, proposals
40_Clients/      # One note per client, results, case studies
50_Operations/   # SOPs, onboarding, fulfilment, delivery standards
60_Systems/      # Workflows, prompts, integrations, architecture
70_Knowledge/    # Research, competitor teardowns, post-mortems
80_People/       # Contacts, partners, contractors
90_Vault/        # Templates, schema.md, router.md, dashboards

# ========================================================
# FRONTMATTER SCHEMA (90_Vault/schema.md)
# ========================================================
---
type: objection          # offer | ad-angle | playbook | objection | script | sop | system
title: Price objection — solar
status: active           # draft | active | archived
niche: solar             # market segment or 'general'
client:                  # plain string, never wikilink
confidence: high         # high | medium | low
ai_index: true           # true | false (false = never leaves machine)
source: 
created: 2026-01-15      # YYYY-MM-DD (unquoted)
updated: 2026-01-15      # YYYY-MM-DD (unquoted)
tags: [objection, pricing]
---

# Price objection — solar

## The rebuttal
> Answer first — the two lines you'd actually say out loud.

"I understand budget is top of mind. Most solar buyers look at initial quote rather than 10-year degradation. Our tier-1 panels yield 18% higher lifetime power, making cost-per-watt 22% lower."

## What they actually mean
They fear making an expensive unrecoverable mistake.

## Why it works
Reframes the metric from upfront purchase price to lifetime cost-per-kilowatt-hour.

## What not to say
Never say "we are cheaper than the other guy".`;

  const edgeFunctionCode = `// Supabase Edge Function: /supabase/functions/brain/index.ts
import { createClient } from "jsr:@supabase/supabase-js@2";

// Built-in free local embeddings or Gemini
const model = new Supabase.ai.Session("gte-small");

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const API_KEY = Deno.env.get("BRAIN_API_KEY")!;

async function embed(text: string): Promise<number[]> {
  return (await model.run(text, { mean_pool: true, normalize: true })) as number[];
}

async function search(query: string, matchCount: number) {
  const query_embedding = await embed(query);
  const { data, error } = await supabase.rpc("match_brain_chunks", {
    query_embedding,
    match_count: matchCount,
    filter_type: null,
    filter_niche: null,
    filter_client: null,
  });
  if (error) throw new Error(error.message);
  return data ?? [];
}

Deno.serve(async (req) => {
  const key = req.headers.get("x-brain-key") ?? req.headers.get("x-vapi-secret");
  if (key !== API_KEY) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();

    // 1. Voice Agent (Vapi) Tool Call
    if (body?.message?.type === "tool-calls") {
      const calls = body.message.toolCallList ?? [];
      const results = [];
      for (const call of calls) {
        const query = call?.arguments?.query ?? "";
        let text: string;
        if (!query) {
          text = "No query was provided.";
        } else {
          const matches = await search(query, 3);
          text = matches.length
            ? matches.map((m: any) =>
                \`[\${m.confidence ?? "unknown"} confidence | source: \${m.path}]\\n\${m.content}\`
              ).join("\\n\\n---\\n\\n")
            : "NOT_IN_BRAIN. Nothing covers this. Tell the caller you'll find out and follow up. Do not guess.";
        }
        results.push({ toolCallId: call.id, result: text });
      }
      return Response.json({ results });
    }

    // 2. Ingestion Pipeline (n8n batch embed)
    if (body.mode === "embed") {
      const inputs: string[] = body.inputs ?? [];
      const embeddings = [];
      for (const t of inputs) embeddings.push(await embed(t));
      return Response.json({ embeddings });
    }

    // 3. Chat Agent Search
    if (body.mode === "search") {
      if (!body.query) return Response.json({ error: "query required" }, { status: 400 });
      const data = await search(body.query, body.match_count ?? 6);
      return Response.json({
        matches: data.map((d: any) => ({
          path: d.path, title: d.title, heading: d.heading, content: d.content,
          type: d.type, niche: d.niche, confidence: d.confidence, updated: d.updated,
          similarity: Number(d.similarity.toFixed(4)),
        })),
      });
    }

    return Response.json({ error: "unrecognised request" }, { status: 400 });
  } catch (e: any) {
    return Response.json({
      results: [{ toolCallId: "unknown", result: "The knowledge system is temporarily unavailable. Tell caller you will follow up." }]
    });
  }
});`;

  const n8nWorkflowSummary = `// ========================================================
// n8n AUTOMATED GITHUB -> SUPABASE SYNC PIPELINE (Every 15 min)
// ========================================================

1. [Schedule Trigger] (Runs every 15 mins)
2. [Get Repo Tree] (GitHub API: GET /repos/{owner}/{repo}/git/trees/{branch}?recursive=1)
3. [Get Indexed Hashes] (Supabase: GET /rest/v1/brain_file_hashes?select=path,file_hash)
4. [Diff Changed Files] (Compares GitHub blob sha vs Supabase sha — zero cost change detection)
5. [Loop Over Items]
   - Fetch note raw markdown from GitHub
   - Parse YAML frontmatter (skip if ai_index: false)
   - Split by '## ' headings, prepend 'Title > Heading' to every chunk (max 1500 chars)
   - POST /functions/v1/brain (mode: 'embed')
   - DELETE /rest/v1/brain_chunks?path=eq.{path}
   - POST /rest/v1/brain_chunks (inserts new vector chunks)
6. [Find Orphans] -> DELETE removed files from brain_chunks`;

  const sqlSchema = `-- ========================================================
-- 1. Enable pgvector extension
-- ========================================================
CREATE EXTENSION IF NOT EXISTS vector;

-- ========================================================
-- 2. Create the unified brain_chunks table
-- ========================================================
CREATE TABLE IF NOT EXISTS brain_chunks (
  id          BIGSERIAL PRIMARY KEY,
  path        TEXT NOT NULL,
  title       TEXT,
  heading     TEXT,
  content     TEXT NOT NULL,
  type        TEXT,
  niche       TEXT,
  client      TEXT,
  confidence  TEXT,
  updated     DATE,
  file_hash   TEXT NOT NULL,
  embedding   VECTOR(384), -- 384 for gte-small (or 768 for Gemini)
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ========================================================
-- 3. HNSW cosine index for sub-50ms vector search
-- ========================================================
CREATE INDEX IF NOT EXISTS brain_chunks_embedding_idx
  ON brain_chunks USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS brain_chunks_path_idx  ON brain_chunks (path);
CREATE INDEX IF NOT EXISTS brain_chunks_type_idx  ON brain_chunks (type);
CREATE INDEX IF NOT EXISTS brain_chunks_niche_idx ON brain_chunks (niche);

-- RLS on with NO policies = public keys get nothing.
-- Only the service/secret key can read this.
ALTER TABLE brain_chunks ENABLE ROW LEVEL SECURITY;

-- ========================================================
-- 4. View for fast Git diffing & orphan detection
-- ========================================================
CREATE OR REPLACE VIEW brain_file_hashes AS
  SELECT path, MIN(file_hash) AS file_hash, COUNT(*) AS chunk_count
  FROM brain_chunks GROUP BY path;

-- ========================================================
-- 5. Stored Procedure for Semantic Vector Retrieval (RPC)
-- ========================================================
CREATE OR REPLACE FUNCTION match_brain_chunks (
  query_embedding VECTOR(384),
  match_count     INT  DEFAULT 6,
  filter_type     TEXT DEFAULT NULL,
  filter_niche    TEXT DEFAULT NULL,
  filter_client   TEXT DEFAULT NULL
)
RETURNS TABLE (
  id BIGINT,
  path TEXT,
  title TEXT,
  heading TEXT,
  content TEXT,
  type TEXT,
  niche TEXT,
  client TEXT,
  confidence TEXT,
  updated DATE,
  similarity FLOAT
)
LANGUAGE sql STABLE
AS $$
  SELECT
    c.id, c.path, c.title, c.heading, c.content,
    c.type, c.niche, c.client, c.confidence, c.updated,
    1 - (c.embedding <=> query_embedding) AS similarity
  FROM brain_chunks c
  WHERE
        (filter_type   IS NULL OR c.type   = filter_type)
    AND (filter_client IS NULL OR c.client = filter_client)
    AND (filter_niche  IS NULL OR c.niche  = filter_niche OR c.niche = 'general')
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$;`;

  const embeddingsGuide = `// ========================================================
// 1. Install official Google GenAI SDK:
// npm install @google/genai
// ========================================================

import { GoogleGenAI } from "@google/genai";

// Initialize server-side Gemini client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

/**
 * Generate 768-dimensional vector embedding for text
 * Model: gemini-embedding-2-preview
 */
export async function getEmbedding(text: string): Promise<number[]> {
  const response = await ai.models.embedContent({
    model: "gemini-embedding-2-preview",
    contents: text,
  });

  if (!response.embedding?.values) {
    throw new Error("No embedding returned from Google AI Studio");
  }

  return response.embedding.values;
}

/**
 * Ingestion Pipeline: Analyze text, generate summary + tags + embedding
 */
export async function processAndEmbed(rawText: string, sourceUrl?: string) {
  // Step 1: Intelligent structuring with Gemini 3.7 Flash
  const analysis = await ai.models.generateContent({
    model: "gemini-3.7-flash",
    contents: \`Analyze this knowledge dump. Return JSON:
{
  "title": "Concise specific title",
  "summary": "2-3 sentence executive synthesis",
  "tags": ["Tag1", "Tag2"],
  "type": "url" | "note" | "document" | "code" | "social"
}
Content: \${rawText}\`,
    config: { responseMimeType: "application/json" },
  });

  const parsed = JSON.parse(analysis.text || "{}");

  // Step 2: Vector embedding
  const textToEmbed = \`\${parsed.title}\\n\${parsed.summary}\\n\${parsed.tags.join(" ")}\\n\${rawText}\`;
  const embedding = await getEmbedding(textToEmbed);

  return { ...parsed, rawText, sourceUrl, embedding };
}`;

  const nextjsBoilerplate = `// app/api/recall/route.ts (Next.js App Router Semantic Search Route)
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();

    // 1. Generate query embedding
    const embedRes = await ai.models.embedContent({
      model: "text-embedding-004",
      contents: query,
    });
    const queryVector = embedRes.embedding?.values;

    // 2. Query Supabase pgvector RPC
    const { data: matches, error } = await supabase.rpc("match_knowledge", {
      query_embedding: queryVector,
      match_threshold: 0.35,
      match_count: 4,
    });

    if (error) throw error;

    // 3. Gemini Synthesizer
    const context = matches
      .map((m: any, i: number) => \`[Source \${i+1}: \${m.title}] (\${m.source_url || 'Note'})\\n\${m.summary}\`)
      .join("\\n\\n");

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: \`User asked: "\${query}". Context from Second Brain: \${context}. Provide a direct, conversational recall answer.\`,
    });

    return NextResponse.json({
      synthesis: response.text,
      matches,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}`;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-4xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#1a1a1a] flex items-center justify-between bg-[#050505]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-[#000000] border border-[#222222] flex items-center justify-center">
              <Database className="w-4 h-4 text-zinc-200" />
            </div>
            <div>
              <h3 className="text-sm font-mono font-semibold text-white uppercase tracking-wider">
                PRD Architecture & Implementation Blueprint
              </h3>
              <p className="text-xs text-[#666666] font-mono">
                Supabase pgvector schema, Google AI Studio embeddings, & Next.js code
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-[#161616] text-[#666666] hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-6 pt-3 pb-2 border-b border-[#1a1a1a] flex items-center gap-2 overflow-x-auto bg-[#050505]">
          <button
            onClick={() => setActiveTab("obsidian")}
            className={`px-3 py-1.5 rounded text-xs font-mono transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === "obsidian"
                ? "bg-violet-950/70 text-violet-200 font-medium border border-violet-700/60 shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-violet-400" />
            <span>1. Obsidian Vault & Schema</span>
          </button>

          <button
            onClick={() => setActiveTab("sql")}
            className={`px-3 py-1.5 rounded text-xs font-mono transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === "sql"
                ? "bg-cyan-950/70 text-cyan-200 font-medium border border-cyan-700/60 shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Database className="w-3.5 h-3.5 text-cyan-400" />
            <span>2. Supabase SQL & Vector Table</span>
          </button>

          <button
            onClick={() => setActiveTab("edgefn")}
            className={`px-3 py-1.5 rounded text-xs font-mono transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === "edgefn"
                ? "bg-emerald-950/70 text-emerald-200 font-medium border border-emerald-700/60 shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            <span>3. Edge Function & Vapi</span>
          </button>

          <button
            onClick={() => setActiveTab("n8n")}
            className={`px-3 py-1.5 rounded text-xs font-mono transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === "n8n"
                ? "bg-amber-950/70 text-amber-200 font-medium border border-amber-700/60 shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Code className="w-3.5 h-3.5 text-amber-400" />
            <span>4. n8n GitHub Ingestion</span>
          </button>

          <button
            onClick={() => setActiveTab("embeddings")}
            className={`px-3 py-1.5 rounded text-xs font-mono transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === "embeddings"
                ? "bg-sky-950/70 text-sky-200 font-medium border border-sky-700/60 shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            <span>5. Gemini Embeddings</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 font-mono text-xs text-zinc-300 bg-[#000000] space-y-4">
          {activeTab === "obsidian" && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] text-zinc-400">
                  Obsidian 9-Folder Business Taxonomy & Strict YAML Frontmatter Schema:
                </span>
                <button
                  onClick={() => handleCopy(obsidianBlueprint, "obsidian")}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#0a0a0a] hover:bg-[#111111] text-zinc-300 border border-[#222222] hover:border-[#333333] transition cursor-pointer"
                >
                  {copiedKey === "obsidian" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === "obsidian" ? "Copied!" : "Copy Markdown"}</span>
                </button>
              </div>
              <pre className="p-4 rounded bg-[#050505] border border-[#1a1a1a] overflow-x-auto text-zinc-300 leading-relaxed">
                {obsidianBlueprint}
              </pre>
            </div>
          )}

          {activeTab === "sql" && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] text-zinc-400">
                  Execute this SQL inside the Supabase SQL Editor to enable pgvector, HNSW index, and match_brain_chunks:
                </span>
                <button
                  onClick={() => handleCopy(sqlSchema, "sql")}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#0a0a0a] hover:bg-[#111111] text-zinc-300 border border-[#222222] hover:border-[#333333] transition cursor-pointer"
                >
                  {copiedKey === "sql" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === "sql" ? "Copied!" : "Copy SQL"}</span>
                </button>
              </div>
              <pre className="p-4 rounded bg-[#050505] border border-[#1a1a1a] overflow-x-auto text-zinc-300 leading-relaxed">
                {sqlSchema}
              </pre>
            </div>
          )}

          {activeTab === "edgefn" && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] text-zinc-400">
                  Supabase Deno Edge Function (/functions/v1/brain) for sub-second retrieval & Vapi voice calls:
                </span>
                <button
                  onClick={() => handleCopy(edgeFunctionCode, "edgefn")}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#0a0a0a] hover:bg-[#111111] text-zinc-300 border border-[#222222] hover:border-[#333333] transition cursor-pointer"
                >
                  {copiedKey === "edgefn" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === "edgefn" ? "Copied!" : "Copy Edge Function"}</span>
                </button>
              </div>
              <pre className="p-4 rounded bg-[#050505] border border-[#1a1a1a] overflow-x-auto text-zinc-300 leading-relaxed">
                {edgeFunctionCode}
              </pre>
            </div>
          )}

          {activeTab === "n8n" && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] text-zinc-400">
                  n8n GitHub Mirror Sync & Heading-Aware Chunking Pipeline (Runs every 15 min):
                </span>
                <button
                  onClick={() => handleCopy(n8nWorkflowSummary, "n8n")}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#0a0a0a] hover:bg-[#111111] text-zinc-300 border border-[#222222] hover:border-[#333333] transition cursor-pointer"
                >
                  {copiedKey === "n8n" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === "n8n" ? "Copied!" : "Copy Summary"}</span>
                </button>
              </div>
              <pre className="p-4 rounded bg-[#050505] border border-[#1a1a1a] overflow-x-auto text-zinc-300 leading-relaxed">
                {n8nWorkflowSummary}
              </pre>
            </div>
          )}

          {activeTab === "embeddings" && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] text-zinc-400">
                  Google AI Studio (@google/genai) Embedding & Ingestion Pipeline:
                </span>
                <button
                  onClick={() => handleCopy(embeddingsGuide, "emb")}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#0a0a0a] hover:bg-[#111111] text-zinc-300 border border-[#222222] hover:border-[#333333] transition cursor-pointer"
                >
                  {copiedKey === "emb" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === "emb" ? "Copied!" : "Copy TypeScript"}</span>
                </button>
              </div>
              <pre className="p-4 rounded bg-[#050505] border border-[#1a1a1a] overflow-x-auto text-zinc-300 leading-relaxed">
                {embeddingsGuide}
              </pre>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-[#1a1a1a] bg-[#050505] flex items-center justify-between text-xs font-mono text-[#666666]">
          <span>Google AI Studio • Supabase pgvector (768-dim)</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-white text-black font-medium hover:bg-zinc-200 transition cursor-pointer"
          >
            Close Blueprint
          </button>
        </div>
      </div>
    </div>
  );
};
