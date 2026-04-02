"use client";

import { useState, useRef, useEffect } from "react";
import { Send, ChevronDown, Sparkles } from "lucide-react";
import {
  ChatMessage,
  DiagramVersion,
  ExcalidrawScene,
  GrokModelId,
  DEFAULT_MODEL_ID,
} from "@/lib/types";
import { StreamingElementParser } from "@/lib/streaming-element-parser";
import GrokReasoningBlock from "@/components/ui/grok-reasoning-block";

const MODEL_STORAGE_KEY = "grokessmap_model";

interface EditChatProps {
  versions: DiagramVersion[];
  currentVersion: number;
  onVersionChange: (version: number) => void;
  getCurrentScene: () => ExcalidrawScene;
  onNewVersion: (scene: ExcalidrawScene, summary: string) => void;
  /** Called with partial elements as they stream in for live diagram preview. */
  onStreamingElements?: (elements: Record<string, unknown>[]) => void;
  /** Called when streaming starts/stops so the parent can toggle isStreaming. */
  onStreamingStateChange?: (isStreaming: boolean) => void;
}

export default function EditChat({
  versions,
  currentVersion,
  onVersionChange,
  getCurrentScene,
  onNewVersion,
  onStreamingElements,
  onStreamingStateChange,
}: EditChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [reasoningText, setReasoningText] = useState("");
  const [versionDropdownOpen, setVersionDropdownOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setVersionDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || sending) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);
    setReasoningText("");

    try {
      const scene = getCurrentScene();
      // Read selected model from localStorage
      const modelId: GrokModelId =
        (localStorage.getItem(MODEL_STORAGE_KEY) as GrokModelId) || DEFAULT_MODEL_ID;

      const res = await fetch("/api/edit-diagram-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentExcalidraw: scene,
          instruction: trimmed,
          modelId,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to start streaming");
      }

      const reader = res.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      const decoder = new TextDecoder();
      let buffer = "";
      let result: { excalidraw: ExcalidrawScene; summary: string } | null = null;
      const elementParser = new StreamingElementParser();

      // Signal streaming started
      onStreamingStateChange?.(true);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        // Process SSE events
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              
              if (parsed.type === "reasoning") {
                setReasoningText((prev) => prev + parsed.text);
              } else if (parsed.type === "text") {
                // Feed text chunks to the element parser for live preview
                const newEls = elementParser.push(parsed.text);
                if (newEls.length > 0) {
                  onStreamingElements?.(elementParser.getAllElements());
                }
              } else if (parsed.type === "result") {
                result = parsed.data;
              } else if (parsed.type === "error") {
                throw new Error(parsed.error);
              }
            } catch {
              // Ignore JSON parse errors
            }
          }
        }
      }

      // Signal streaming ended
      onStreamingStateChange?.(false);

      if (!result) {
        throw new Error("No result received from API");
      }

      const nextVersion = versions.length + 1;
      onNewVersion(result.excalidraw, result.summary);

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: result.summary,
        timestamp: new Date().toISOString(),
        versionCreated: nextVersion,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `Error: ${err instanceof Error ? err.message : "Something went wrong"}`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setSending(false);
      setReasoningText("");
      onStreamingStateChange?.(false);
      // Re-focus the input
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const activeVersion = versions.find((v) => v.version === currentVersion);

  return (
    <div className="h-full flex flex-col bg-[#121212] border-l border-[#2a2a2a]">
      {/* ── Version selector ── */}
      <div className="shrink-0 px-3 py-2 border-b border-[#2a2a2a]" ref={dropdownRef}>
        <button
          onClick={() => setVersionDropdownOpen(!versionDropdownOpen)}
          className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-[#1a1a2e] border border-[#2a2a2a] hover:border-[#3a3a4a] transition-colors text-sm"
        >
          <span className="text-[#ccc] truncate">
            {activeVersion ? activeVersion.label : `v${currentVersion}`}
          </span>
          <ChevronDown className={`w-3.5 h-3.5 text-[#666] shrink-0 transition-transform ${versionDropdownOpen ? "rotate-180" : ""}`} />
        </button>

        {versionDropdownOpen && (
          <div className="absolute z-50 mt-1 left-3 right-3 bg-[#1a1a2e] border border-[#3a3a4a] rounded-lg shadow-xl max-h-48 overflow-y-auto">
            {versions.map((v) => (
              <button
                key={v.version}
                onClick={() => {
                  onVersionChange(v.version);
                  setVersionDropdownOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                  v.version === currentVersion
                    ? "bg-[#6c5ce7]/20 text-[#a78bfa]"
                    : "text-[#ccc] hover:bg-[#232329]"
                }`}
              >
                <div className="font-medium truncate">{v.label}</div>
                <div className="text-[10px] text-[#666] mt-0.5">
                  {new Date(v.timestamp).toLocaleTimeString()}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Chat messages ── */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <Sparkles className="w-8 h-8 text-[#6c5ce7]/40 mb-3" />
            <p className="text-[#666] text-sm leading-relaxed">
              Describe an edit and Grok will update the diagram.
            </p>
            <p className="text-[#555] text-xs mt-2">
              e.g. &ldquo;Add a review step between steps 3 and 4&rdquo;
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[90%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-[#6c5ce7] text-white"
                  : "bg-[#1e1e2e] text-[#ccc] border border-[#2a2a2a]"
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
              {msg.versionCreated && (
                <button
                  onClick={() => onVersionChange(msg.versionCreated!)}
                  className="mt-1.5 text-[10px] font-medium text-[#a78bfa] hover:text-[#c4b5fd] transition-colors"
                >
                  → View v{msg.versionCreated}
                </button>
              )}
            </div>
          </div>
        ))}

        {sending && (
          <div className="w-full">
            <GrokReasoningBlock
              reasoningText={reasoningText}
              isLoading={sending}
              title="Editing diagram..."
            />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Input ── */}
      <div className="shrink-0 px-3 pb-3 pt-1">
        <div className="flex items-end gap-2 bg-[#1a1a2e] border border-[#2a2a2a] rounded-xl px-3 py-2 focus-within:border-[#6c5ce7]/50 transition-colors">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe an edit…"
            disabled={sending}
            rows={1}
            className="flex-1 bg-transparent text-sm text-white placeholder-[#555] resize-none focus:outline-none min-h-[24px] max-h-[100px]"
            style={{ height: "auto" }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = Math.min(el.scrollHeight, 100) + "px";
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="shrink-0 p-1.5 rounded-lg bg-[#6c5ce7] text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#7c6cf7] transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}