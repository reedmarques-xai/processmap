"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import GrokThinkingLottie from "./grok-thinking-lottie";

interface GrokReasoningBlockProps {
  reasoningText: string;
  isLoading: boolean;
  title?: string;
}

export default function GrokReasoningBlock({
  reasoningText,
  isLoading,
  title = "Grok is thinking...",
}: GrokReasoningBlockProps) {
  const [expanded, setExpanded] = useState(true);
  const reasoningRef = useRef<HTMLDivElement>(null);

  // Auto-scroll reasoning text to bottom
  useEffect(() => {
    if (reasoningRef.current && reasoningText && expanded) {
      reasoningRef.current.scrollTop = reasoningRef.current.scrollHeight;
    }
  }, [reasoningText, expanded]);

  if (!isLoading) return null;

  return (
    <div className="bg-surface rounded-lg border border-amber-500/30 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-amber-500/10 border-b border-amber-500/20 hover:bg-amber-500/15 transition-colors"
      >
        <GrokThinkingLottie size={20} />
        <p className="text-xs text-amber-400 font-medium uppercase tracking-wider">
          {title}
        </p>
        <div className="ml-auto flex items-center gap-2">
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-amber-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-amber-400" />
          )}
        </div>
      </button>
      {expanded && (
        <div
          ref={reasoningRef}
          className="p-3 h-48 overflow-y-auto font-mono text-xs text-amber-200/80 whitespace-pre-wrap break-words bg-amber-950/20"
        >
          {reasoningText || (
            <span className="text-amber-400/50 italic">Waiting for reasoning...</span>
          )}
          <span className="inline-block w-2 h-4 bg-amber-400/60 animate-pulse ml-0.5" />
        </div>
      )}
    </div>
  );
}
