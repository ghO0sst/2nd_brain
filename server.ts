import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// Initialize Google GenAI client
const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    })
  : null;

// Types
export interface KnowledgeItem {
  id: string;
  title: string;
  type: "url" | "note" | "document" | "code" | "drive" | "gmail" | "social";
  sourceUrl?: string;
  rawContent: string;
  summary: string;
  tags: string[];
  embedding?: number[];
  createdAt: string;
  metadata?: {
    author?: string;
    fileSize?: string;
    fileType?: string;
    domain?: string;
    readingTime?: string;
    snippetCount?: number;
  };
}

// In-memory knowledge store (clean state - only user-added items)
let knowledgeBase: KnowledgeItem[] = [];

// Helper: Cosine similarity
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length || vecA.length === 0) {
    return 0;
  }
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Helper: Fast deterministic embedding generator for lightning fast or offline indexing
function pseudoEmbedding(text: string, dimensions = 768): number[] {
  const vec = new Array(dimensions).fill(0);
  const clean = text.toLowerCase();
  for (let i = 0; i < clean.length; i++) {
    const charCode = clean.charCodeAt(i);
    const idx = (charCode * 37 + i * 19) % dimensions;
    vec[idx] += 1 / (1 + (i % 10));
  }
  // Normalize
  let sumSq = 0;
  for (let v of vec) sumSq += v * v;
  const mag = Math.sqrt(sumSq) || 1;
  return vec.map((v) => v / mag);
}

// Generate embedding using Google GenAI with strict 3-second timeout and instant fallback
async function generateEmbedding(text: string): Promise<number[]> {
  if (!ai) {
    return pseudoEmbedding(text);
  }
  
  const embedPromise = (async () => {
    const candidateModels = ["text-embedding-004", "gemini-embedding-2-preview"];
    for (const model of candidateModels) {
      try {
        const res: any = await ai.models.embedContent({
          model,
          contents: text,
        });
        const values = res.embeddings?.[0]?.values || res.embedding?.values;
        if (values && Array.isArray(values) && values.length > 0) {
          return values;
        }
      } catch {
        continue;
      }
    }
    return pseudoEmbedding(text);
  })();

  const timeoutPromise = new Promise<number[]>((resolve) =>
    setTimeout(() => resolve(pseudoEmbedding(text)), 3000)
  );

  return Promise.race([embedPromise, timeoutPromise]);
}

// Initialize seed embeddings in background
(async () => {
  for (const item of knowledgeBase) {
    if (!item.embedding) {
      item.embedding = await generateEmbedding(`${item.title}\n${item.summary}\n${item.rawContent}`);
    }
  }
})();

// API Routes
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", totalItems: knowledgeBase.length, aiConfigured: Boolean(ai) });
});

// GET all items
app.get("/api/items", (_req, res) => {
  const sanitized = knowledgeBase.map(({ embedding, ...rest }) => rest);
  res.json({ items: sanitized, count: sanitized.length });
});

// Helper to process a single piece of content/URL into a KnowledgeItem
async function processSingleIngest(input: {
  text: string;
  sourceUrl?: string;
  type?: KnowledgeItem["type"];
  rawContent?: string;
}): Promise<KnowledgeItem> {
  let inputContent = (input.rawContent || input.text || "").trim();
  let detectedType: KnowledgeItem["type"] = input.type || "note";
  let url: string | undefined = input.sourceUrl;

  const urlRegex = /(https?:\/\/[^\s"'<>]+|github\.com\/[^\s"'<>]+)/i;
  const urlMatch = inputContent.match(urlRegex);
  if (urlMatch) {
    let matchedUrl = urlMatch[0];
    if (!matchedUrl.startsWith("http://") && !matchedUrl.startsWith("https://")) {
      matchedUrl = `https://${matchedUrl}`;
    }
    if (!url) {
      url = matchedUrl;
    }
  }

  // Determine domain & specialized types
  let domain: string | undefined = undefined;
  if (url) {
    try {
      domain = new URL(url).hostname.replace("www.", "");
    } catch {
      domain = "web";
    }

    if (url.includes("github.com")) detectedType = "url";
    else if (url.includes("drive.google.com") || url.includes("docs.google.com")) detectedType = "drive";
    else if (url.includes("instagram.com") || url.includes("twitter.com") || url.includes("x.com")) detectedType = "social";
    else if (url.includes("arxiv.org") || url.endsWith(".pdf")) detectedType = "document";
    else if (detectedType === "note") detectedType = "url";
  } else if (
    inputContent.includes("CREATE TABLE") ||
    inputContent.includes("function") ||
    inputContent.includes("const ") ||
    inputContent.includes("import ") ||
    inputContent.includes("def ")
  ) {
    detectedType = "code";
  }

  // Extra context if GitHub repo
  let extraContext = "";
  if (url && url.includes("github.com")) {
    try {
      const ghMatch = url.match(/github\.com\/([^/]+)\/([^/\s?#]+)/);
      if (ghMatch) {
        const owner = ghMatch[1];
        const repo = ghMatch[2].replace(/\.git$/, "");
        extraContext = `GitHub Repository: ${owner}/${repo}`;
      }
    } catch {
      // Continue if parsing fails
    }
  }

  let title = "Captured Knowledge Entry";
  let summary = inputContent.slice(0, 180);
  let tags: string[] = ["Captured"];

  if (url) {
    if (url.includes("github.com")) {
      const parts = url.split("/").filter(Boolean);
      const repoName = parts[parts.length - 1]?.replace(/\.git$/, "") || "Repository";
      const owner = parts[parts.length - 2] || "";
      title = owner ? `GitHub: ${owner}/${repoName}` : `GitHub: ${repoName}`;
      tags = ["GitHub", "Repository", "OpenSource", repoName];
    } else {
      title = domain ? `${domain.toUpperCase()} Resource` : "Web Article";
      tags = ["Web", domain || "Link"];
    }
  }

  // AI parsing for metadata with fast 4s timeout to guarantee instant response
  if (ai) {
    try {
      const prompt = `You are a high-speed knowledge indexer for a personal Second Brain.
Analyze this user memory input and return a JSON object with:
- "title": Specific, descriptive, accurate title (e.g. "GitHub: owner/repo - Description" or article/note title, max 60 chars)
- "summary": 2-3 sentence high-density summary of what this is, why it's useful, and key concepts.
- "tags": 3 to 5 concise categorized tags (e.g. ["GitHub", "AI", "Repo", "Python"])
- "type": "${detectedType}" (one of: url, note, document, code, drive, gmail, social)

${url ? `Source URL: ${url}` : ""}
${extraContext ? `Context: ${extraContext}` : ""}
User Input:
${inputContent.slice(0, 4000)}`;

      const aiCallPromise = ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.1,
        },
      });

      const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000));
      const aiResponse = await Promise.race([aiCallPromise, timeoutPromise]);

      if (aiResponse && aiResponse.text) {
        const parsed = JSON.parse(aiResponse.text || "{}");
        if (parsed.title) title = parsed.title;
        if (parsed.summary) summary = parsed.summary;
        if (Array.isArray(parsed.tags) && parsed.tags.length > 0) tags = parsed.tags;
        if (parsed.type) detectedType = parsed.type;
      }
    } catch (e: any) {
      if (inputContent.length > 0 && !url) {
        title = inputContent.split("\n")[0].slice(0, 60);
      }
    }
  } else {
    if (inputContent.length > 0 && !url) {
      title = inputContent.split("\n")[0].slice(0, 60);
    }
  }

  // Generate vector embedding
  const textToEmbed = `${title}\n${summary}\n${tags.join(" ")}\n${inputContent}\n${url || ""}`;
  const embedding = await generateEmbedding(textToEmbed);

  const newItem: KnowledgeItem = {
    id: "kb-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7),
    title,
    type: detectedType,
    sourceUrl: url,
    rawContent: inputContent,
    summary,
    tags,
    embedding,
    createdAt: new Date().toISOString(),
    metadata: {
      domain,
      readingTime: `${Math.max(1, Math.ceil(inputContent.split(/\s+/).length / 180))} min`,
    },
  };

  return newItem;
}

// POST ingest new item (URL, Note, Document, Code, Drive, or Multi-URL bulk paste)
app.post("/api/ingest", async (req, res) => {
  try {
    const { text, type = "note", sourceUrl, rawContent } = req.body;
    if (!text && !rawContent && !sourceUrl) {
      return res.status(400).json({ error: "Missing content or URL to ingest" });
    }

    const inputContent = (rawContent || text || "").trim();

    // 1. Detect multiple URLs in the pasted text (e.g. 10 GitHub repos pasted on separate lines or in text)
    const multiUrlRegex = /(https?:\/\/[^\s"'<>]+|github\.com\/[^\s"'<>]+)/gi;
    const allMatches: string[] = Array.from(new Set(inputContent.match(multiUrlRegex) || []));

    // If multiple distinct URLs were pasted (e.g., 2 to 20 URLs)
    if (allMatches.length > 1) {
      // Process in parallel with concurrency
      const cleanUrls = allMatches.map((rawUrl) => {
        let u = rawUrl;
        if (!u.startsWith("http://") && !u.startsWith("https://")) {
          u = `https://${u}`;
        }
        return u;
      });

      const results = await Promise.allSettled(
        cleanUrls.map((cleanUrl) =>
          processSingleIngest({
            text: cleanUrl,
            sourceUrl: cleanUrl,
            type: "url",
            rawContent: cleanUrl,
          })
        )
      );

      const createdItems: KnowledgeItem[] = [];
      for (const res of results) {
        if (res.status === "fulfilled" && res.value) {
          knowledgeBase.unshift(res.value);
          createdItems.push(res.value);
        }
      }

      const cleanItems = createdItems.map(({ embedding: _omit, ...rest }) => rest);
      return res.json({
        success: true,
        isMulti: true,
        count: cleanItems.length,
        items: cleanItems,
        item: cleanItems[0] || null,
        totalItems: knowledgeBase.length,
      });
    }

    // 2. Single item ingestion
    const newItem = await processSingleIngest({
      text: inputContent,
      sourceUrl,
      type,
      rawContent: inputContent,
    });

    knowledgeBase.unshift(newItem);

    const { embedding: _omit, ...cleanItem } = newItem;
    res.json({
      success: true,
      isMulti: false,
      item: cleanItem,
      items: [cleanItem],
      totalItems: knowledgeBase.length,
    });
  } catch (error: any) {
    console.error("Ingest error:", error);
    res.status(500).json({ error: error.message || "Failed to ingest item" });
  }
});

// POST Semantic Search & Recall
app.post("/api/recall", async (req, res) => {
  try {
    const { query, topK = 5, reasoningMode = "fast" } = req.body;
    if (!query || typeof query !== "string") {
      return res.status(400).json({ error: "Query is required" });
    }

    // 1. Convert query to vector embedding
    const queryVec = await generateEmbedding(query);

    // 2. Perform cosine similarity against all stored items
    const scored = knowledgeBase.map((item) => {
      const sim = item.embedding ? cosineSimilarity(queryVec, item.embedding) : 0;
      return { item, similarity: Math.round(sim * 1000) / 1000 };
    });

    // Sort by highest similarity
    scored.sort((a, b) => b.similarity - a.similarity);
    const topMatches = scored.slice(0, topK);

    // 3. Generate Gemini Synthesis Answer
    let aiSynthesis = "";
    let reasoningNotes = "";

    if (ai && topMatches.length > 0) {
      try {
        const contextStr = topMatches
          .map(
            (m, i) => `[Source ${i + 1} | Score: ${(m.similarity * 100).toFixed(1)}%]
Title: ${m.item.title}
Type: ${m.item.type}
URL: ${m.item.sourceUrl || "N/A"}
Tags: ${m.item.tags.join(", ")}
Summary: ${m.item.summary}
Content excerpt: ${m.item.rawContent.slice(0, 400)}`
          )
          .join("\n\n---\n\n");

        const prompt = `You are Second Brain's intelligent semantic retrieval engine.
The user asked the following vague or specific recall query:
"${query}"

Here are the top retrieved matches from their Second Brain vector database:
${contextStr}

Your instructions:
1. Provide a direct, confident, concise, and conversational answer recalling the exact item(s) they are looking for.
2. Explicitly cite the specific sources with markdown links or bold titles.
3. If they asked a vague query (e.g. "that one dark mode library from GitHub"), pinpoint the exact match, clarify why it fits, and mention key details.
4. Keep formatting clean and terminal-like (use concise bullet points and bold headers).`;

        const modelToUse = reasoningMode === "deep" ? "gemini-3.7-flash" : "gemini-3.7-flash";

        const response = await ai.models.generateContent({
          model: modelToUse,
          contents: prompt,
          config: {
            temperature: 0.3,
          },
        });

        aiSynthesis = response.text || "";
      } catch (err: any) {
        console.error("Recall synthesis note:", err?.message);
        aiSynthesis = `Retrieved **${topMatches.length} matching entries** with highest semantic proximity to "${query}".`;
      }
    } else {
      aiSynthesis = `Found **${topMatches.length} items** in your Second Brain matching "${query}".`;
    }

    const matchesSanitized = topMatches.map((m) => {
      const { embedding, ...clean } = m.item;
      return {
        ...clean,
        relevanceScore: Math.min(100, Math.max(0, Math.round(m.similarity * 100))),
      };
    });

    res.json({
      query,
      synthesis: aiSynthesis,
      matches: matchesSanitized,
      totalIndexed: knowledgeBase.length,
    });
  } catch (error: any) {
    console.error("Recall error:", error);
    res.status(500).json({ error: error.message || "Failed to execute recall" });
  }
});

// Function Declaration for Google AI Studio / Gemini SDK
const searchBusinessBrainDeclaration = {
  name: "search_business_brain",
  description:
    "Searches the company's internal Obsidian knowledge vault for facts regarding offers, pricing, guarantees, sales objection scripts, SOPs, workflows, client results, and systems. ALWAYS call this tool before answering questions about the business.",
  parameters: {
    type: "OBJECT",
    properties: {
      query: {
        type: "STRING",
        description: "The factual concept or question to search for, phrased as a concise natural-language search.",
      },
      match_count: {
        type: "INTEGER",
        description: "Number of knowledge chunks to return (default is 4, max 8).",
      },
      filter_type: {
        type: "STRING",
        description: "Optional folder/note type filter: 'offer' | 'objection' | 'script' | 'sop' | 'system' | 'client' | 'research'.",
      },
      filter_niche: {
        type: "STRING",
        description: "Optional market segment or niche filter (e.g. 'solar', 'general').",
      },
    },
    required: ["query"],
  },
};

// Tool execution helper
async function executeSearchBusinessBrain(args: {
  query: string;
  match_count?: number;
  filter_type?: string;
  filter_niche?: string;
}) {
  const { query, match_count = 4, filter_type, filter_niche } = args;
  const queryVec = await generateEmbedding(query);
  
  let candidates = knowledgeBase.map((item) => {
    const sim = item.embedding ? cosineSimilarity(queryVec, item.embedding) : 0;
    return { item, similarity: Math.round(sim * 1000) / 1000 };
  });

  if (filter_type) {
    candidates = candidates.filter(
      (c) => c.item.type === filter_type || (c.item.metadata as any)?.type === filter_type
    );
  }

  candidates.sort((a, b) => b.similarity - a.similarity);
  const topMatches = candidates.slice(0, match_count);

  if (topMatches.length === 0 || topMatches[0].similarity < 0.15) {
    return {
      status: "NOT_IN_BRAIN",
      message: "That's not in the brain yet. No matching knowledge chunks found.",
      chunks: [],
    };
  }

  return {
    status: "FOUND",
    chunks: topMatches.map((m) => ({
      title: m.item.title,
      type: m.item.type,
      confidence: (m.item.metadata as any)?.confidence || "medium",
      path: m.item.sourceUrl || `90_Vault/${m.item.title}.md`,
      content: `${m.item.summary}\n\n${m.item.rawContent.slice(0, 1200)}`,
      similarity: m.similarity,
    })),
  };
}
app.post("/api/chat", async (req, res) => {
  try {
    const { messages, reasoningMode = "fast" } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Messages array required" });
    }

    const lastMessage = messages[messages.length - 1]?.content || "";

    // Generate embedding for current turn to pull relevant memory
    const turnVec = await generateEmbedding(lastMessage);
    const scored = knowledgeBase.map((item) => ({
      item,
      sim: item.embedding ? cosineSimilarity(turnVec, item.embedding) : 0,
    }));
    scored.sort((a, b) => b.sim - a.sim);
    const relevantMemories = scored.slice(0, 4);

    const memoryContext = relevantMemories
      .map(
        (m, i) => `Memory [${i + 1}]: "${m.item.title}" (${m.item.type})
Source: ${m.item.sourceUrl || "Direct Note"}
Tags: ${m.item.tags.join(", ")}
Content: ${m.item.summary} | ${m.item.rawContent.slice(0, 300)}`
      )
      .join("\n\n");

    if (ai) {
      const formattedContents = messages.map((m: any) => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.content }],
      }));

      // Strict Agent System Prompt Enforcing Refusal & Citation
      const systemInstruction = `You answer questions about this business using ONLY the business brain.

## How to answer
1. ALWAYS call search_business_brain first for any factual question about the business, offer, pricing, guarantees, policies, objections, client results, or SOPs. Never answer from your general training knowledge.
2. If the first search is thin, search again with different wording.
3. Answer from the returned chunks only.
4. Cite the file path (e.g. 10_Business/Pricing.md) of every note you drew upon at the end of your answer.

## Refusing — this matters more than answering
If search_business_brain returns status "NOT_IN_BRAIN" or no relevant chunks exist, you MUST say:
"That's not in the brain yet."
Then state what you searched for. Do NOT fill gaps from general knowledge. A wrong answer about this business is worse than no answer.

## Never state a performance number
If asked for results, leads, cost per lead, conversion rates or ROI and the brain has no exact figures, do NOT invent or approximate one under any circumstances.

## Weighting & Confidence Rules
- confidence: high — may be stated as definitive fact.
- confidence: medium — works well, but do not overclaim.
- confidence: low — flag explicitly to the user that you are relying on an untested hypothesis.
- status: draft is unfinished thinking; archived is retired knowledge.

## Style
Quote the owner's phrasing verbatim for rebuttals, scripts, and value propositions rather than summarizing. Be direct, crisp, and brief.`;

      // 1. First Turn with Function Calling
      const firstResponse = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: formattedContents,
        config: {
          systemInstruction,
          temperature: 0.2,
          tools: [{ functionDeclarations: [searchBusinessBrainDeclaration as any] }],
        },
      });

      let finalReply = "";
      const calledFunctions = firstResponse.functionCalls;

      if (calledFunctions && calledFunctions.length > 0) {
        const call = calledFunctions[0];
        const searchResult = await executeSearchBusinessBrain(call.args as any);

        // Feed tool result back to Gemini
        const previousCandidate = firstResponse.candidates?.[0]?.content;
        const toolResponsePart = {
          functionResponse: {
            name: "search_business_brain",
            response: { result: searchResult },
          },
        };

        const followUpContents = [
          ...formattedContents,
          previousCandidate,
          { role: "user", parts: [toolResponsePart] },
        ];

        const secondResponse = await ai.models.generateContent({
          model: "gemini-3.7-flash",
          contents: followUpContents as any,
          config: {
            systemInstruction,
            temperature: 0.2,
            tools: [{ functionDeclarations: [searchBusinessBrainDeclaration as any] }],
          },
        });

        finalReply = secondResponse.text || "That's not in the brain yet.";

        return res.json({
          reply: finalReply,
          toolCalled: true,
          toolArgs: call.args,
          referencedMemories: searchResult.chunks.map((c) => ({
            title: c.title,
            type: c.type,
            url: c.path,
            similarity: Math.round(c.similarity * 100),
          })),
        });
      } else {
        finalReply = firstResponse.text || "That's not in the brain yet.";
      }

      return res.json({
        reply: finalReply,
        referencedMemories: relevantMemories.map((m) => ({
          title: m.item.title,
          type: m.item.type,
          url: m.item.sourceUrl,
          similarity: Math.round(m.sim * 100),
        })),
      });
    } else {
      return res.json({
        reply: `Second Brain fallback response: I found ${relevantMemories.length} relevant entries in your local memory. Configure your GEMINI_API_KEY in settings to enable full cognitive synthesis!`,
        referencedMemories: relevantMemories.map((m) => ({
          title: m.item.title,
          type: m.item.type,
          url: m.item.sourceUrl,
          similarity: Math.round(m.sim * 100),
        })),
      });
    }
  } catch (error: any) {
    console.error("Chat error:", error);
    res.status(500).json({ error: error.message || "Failed to process chat" });
  }
});

// DELETE all items
app.delete("/api/items", (_req, res) => {
  knowledgeBase = [];
  res.json({ success: true, count: 0 });
});

// DELETE single item
app.delete("/api/items/:id", (req, res) => {
  const { id } = req.params;
  const initialLen = knowledgeBase.length;
  knowledgeBase = knowledgeBase.filter((item) => item.id !== id);
  res.json({ success: true, deleted: initialLen > knowledgeBase.length, remaining: knowledgeBase.length });
});

// Vite middleware for dev or static serving for prod
async function setupViteOrStatic() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Second Brain server running on http://0.0.0.0:${PORT}`);
  });
}

setupViteOrStatic();
