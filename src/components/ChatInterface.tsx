import React, { useState, useRef, useEffect } from "react";
import { ChatMessage } from "../types";
import {
  Brain,
  Send,
  Sparkles,
  Bot,
  User,
  ExternalLink,
  Layers,
  Loader2,
  Trash2,
} from "lucide-react";

interface ChatInterfaceProps {
  onSendMessage: (
    messages: { role: string; content: string }[],
    reasoningMode: "fast" | "deep"
  ) => Promise<{
    reply: string;
    referencedMemories?: { title: string; type: string; url?: string; similarity: number }[];
  }>;
  initialMessage?: string;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  onSendMessage,
  initialMessage,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Greetings. I am your Second Brain AI Copilot. I have indexed your links, notes, research papers, and code snippets. Ask me anything vague or specific to retrieve and synthesize knowledge.",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [input, setInput] = useState(initialMessage || "");
  const [isLoading, setIsLoading] = useState(false);
  const [reasoningMode, setReasoningMode] = useState<"fast" | "deep">("fast");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setInput("");

    const newMsg: ChatMessage = {
      id: "msg-" + Date.now(),
      role: "user",
      content: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const updated = [...messages, newMsg];
    setMessages(updated);
    setIsLoading(true);

    try {
      const payload = updated
        .filter((m) => m.id !== "welcome")
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await onSendMessage(payload, reasoningMode);

      const botMsg: ChatMessage = {
        id: "bot-" + Date.now(),
        role: "assistant",
        content: res.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        referencedMemories: res.referencedMemories,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: "err-" + Date.now(),
          role: "assistant",
          content: "Encountered an issue querying memory: " + (err.message || "Unknown error"),
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: "Conversation history reset. Your indexed Second Brain memory remains active.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  };

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col h-[70vh] bg-[#000000] border border-[#222222] rounded-lg overflow-hidden shadow-2xl">
      {/* Chat Top Bar */}
      <div className="px-5 py-3.5 border-b border-[#1a1a1a] bg-[#050505] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded bg-[#0a0a0a] border border-[#222222] flex items-center justify-center">
            <Brain className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <h3 className="text-xs font-mono font-semibold text-white uppercase tracking-wider">
              Second Brain Cognitive Dialogue
            </h3>
            <p className="text-[10px] font-mono text-[#666666]">
              Grounded in stored vector memory
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Reasoning Toggle */}
          <button
            onClick={() => setReasoningMode((prev) => (prev === "fast" ? "deep" : "fast"))}
            className={`px-2.5 py-1 rounded text-[10px] font-mono border transition flex items-center gap-1 cursor-pointer ${
              reasoningMode === "deep"
                ? "bg-[#161616] text-white border-[#333333]"
                : "bg-[#000000] text-[#666666] border-[#1a1a1a] hover:text-white"
            }`}
            title="Toggle High Reasoning Synthesis"
          >
            <Sparkles className="w-2.5 h-2.5" />
            <span>{reasoningMode === "deep" ? "Deep Reasoning" : "Fast Synthesis"}</span>
          </button>

          <button
            onClick={handleClear}
            className="p-1.5 rounded hover:bg-[#111111] text-[#666666] hover:text-white transition cursor-pointer"
            title="Reset Chat"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 font-sans bg-[#000000]">
        {messages.map((m) => {
          const isBot = m.role === "assistant";
          return (
            <div
              key={m.id}
              className={`flex items-start gap-3 ${isBot ? "justify-start" : "justify-end"}`}
            >
              {isBot && (
                <div className="w-7 h-7 rounded bg-[#0a0a0a] border border-[#222222] flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-4 h-4 text-[#666666]" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-lg p-4 text-sm leading-relaxed ${
                  isBot
                    ? "bg-[#080808] text-zinc-200 border border-[#1a1a1a]"
                    : "bg-white text-black font-medium"
                }`}
              >
                <div className="whitespace-pre-wrap">{m.content}</div>

                {/* Grounded Memory Citations */}
                {isBot && m.referencedMemories && m.referencedMemories.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-[#1a1a1a] space-y-1.5">
                    <div className="text-[10px] font-mono text-[#666666] uppercase tracking-wider flex items-center gap-1 font-bold">
                      <Layers className="w-3 h-3 text-[#666666]" />
                      <span>Retrieved Knowledge Nodes</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {m.referencedMemories.map((ref, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-[#000000] text-zinc-300 border border-[#222222]"
                        >
                          <span className="truncate max-w-[180px]">{ref.title}</span>
                          <span className="text-[#666666]">({ref.similarity}%)</span>
                          {ref.url && (
                            <a
                              href={ref.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#666666] hover:text-white"
                            >
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div
                  className={`mt-2 text-[10px] font-mono ${
                    isBot ? "text-[#444444]" : "text-zinc-600 text-right"
                  }`}
                >
                  {m.timestamp}
                </div>
              </div>

              {!isBot && (
                <div className="w-7 h-7 rounded bg-[#111111] border border-[#222222] flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded bg-[#0a0a0a] border border-[#222222] flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-[#666666]" />
            </div>
            <div className="rounded-lg p-4 bg-[#080808] border border-[#1a1a1a] text-xs font-mono text-[#666666] flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-white" />
              <span>Scanning vector memory and generating cognitive response...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <form
        onSubmit={handleSend}
        className="p-3 border-t border-[#1a1a1a] bg-[#000000] flex items-center gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about your indexed links, papers, or code..."
          className="flex-1 bg-[#050505] border border-[#1a1a1a] rounded-lg px-4 py-2.5 text-xs md:text-sm text-white placeholder-[#444444] focus:outline-none focus:border-[#333333] font-sans"
        />

        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className={`p-2.5 rounded-lg transition cursor-pointer ${
            !input.trim() || isLoading
              ? "bg-[#111111] text-[#444444] border border-[#222222] cursor-not-allowed"
              : "bg-white text-black hover:bg-zinc-200 active:scale-95 border border-white"
          }`}
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
