"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Upload, FileText, X, Sparkles, ClipboardPaste, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import GrokThinkingLottie from "@/components/ui/grok-thinking-lottie";

interface TranscriptUploadProps {
  onGenerate: (transcript: string) => void;
  loading: boolean;
  reasoningText?: string;
}

const MAX_FILE_SIZE = 500 * 1024; // 500KB

export default function TranscriptUpload({
  onGenerate,
  loading,
  reasoningText = "",
}: TranscriptUploadProps) {
  const [transcript, setTranscript] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [mode, setMode] = useState<"upload" | "paste">("upload");
  const [reasoningExpanded, setReasoningExpanded] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const reasoningRef = useRef<HTMLDivElement>(null);

  // Auto-scroll reasoning text to bottom
  useEffect(() => {
    if (reasoningRef.current && reasoningText && reasoningExpanded) {
      reasoningRef.current.scrollTop = reasoningRef.current.scrollHeight;
    }
  }, [reasoningText, reasoningExpanded]);

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith(".txt")) {
      alert("Please upload a .txt file");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      alert("File is too large. Maximum size is 500KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setTranscript(text);
      setFileName(file.name);
      setMode("paste"); // show the text preview
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleClear = () => {
    setTranscript("");
    setFileName(null);
    setMode("upload");
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setTranscript(text);
        setMode("paste");
      }
    } catch {
      // Clipboard API might not be available
    }
  };

  const previewLines = transcript
    ? transcript.split("\n").filter(Boolean).slice(0, 5)
    : [];

  return (
    <div className="space-y-4">
      {/* Mode Tabs */}
      <div className="flex gap-1 bg-surface rounded-lg p-1">
        <button
          onClick={() => setMode("upload")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all",
            mode === "upload"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted hover:text-foreground"
          )}
        >
          <Upload className="w-4 h-4" />
          Upload File
        </button>
        <button
          onClick={() => setMode("paste")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all",
            mode === "paste"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted hover:text-foreground"
          )}
        >
          <ClipboardPaste className="w-4 h-4" />
          Paste Text
        </button>
      </div>

      {mode === "upload" && !transcript ? (
        /* Drop Zone */
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200",
            dragOver
              ? "border-accent bg-accent/5 scale-[1.01]"
              : "border-border hover:border-border-hover hover:bg-surface/50"
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
          <Upload
            className={cn(
              "w-10 h-10 mx-auto mb-4 transition-colors",
              dragOver ? "text-accent" : "text-muted"
            )}
          />
          <p className="text-foreground font-medium mb-1">
            Drop your Gong transcript here
          </p>
          <p className="text-muted text-sm">
            or click to browse — accepts .txt files up to 500KB
          </p>
        </div>
      ) : (
        /* Text Area / Preview */
        <div className="space-y-3">
          {fileName && (
            <div className="flex items-center gap-2 text-sm">
              <FileText className="w-4 h-4 text-accent" />
              <span className="text-muted">{fileName}</span>
              <button
                onClick={handleClear}
                className="ml-auto p-1 rounded hover:bg-surface-hover text-muted hover:text-foreground transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Paste your Gong transcript here...&#10;&#10;Speaker 1: So walk me through your current process...&#10;Speaker 2: Sure, first we receive the request via email..."
            rows={10}
            className="w-full bg-surface border border-border rounded-xl p-4 text-sm text-foreground
              placeholder:text-muted/50 resize-none
              focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20
              transition-all"
          />

          {/* Paste from clipboard button */}
          {!transcript && (
            <button
              onClick={handlePasteFromClipboard}
              className="w-full flex items-center justify-center gap-2 py-2 text-sm text-muted hover:text-foreground transition-colors"
            >
              <ClipboardPaste className="w-4 h-4" />
              Paste from clipboard
            </button>
          )}

          {/* Preview - show reasoning when loading, otherwise show transcript preview */}
          {loading ? (
            <div className="space-y-3">
              {/* Reasoning Section (collapsible) - always show when loading */}
              <div className="bg-surface rounded-lg border border-amber-500/30 overflow-hidden">
                <button
                  onClick={() => setReasoningExpanded(!reasoningExpanded)}
                  className="w-full flex items-center gap-2 px-3 py-2 bg-amber-500/10 border-b border-amber-500/20 hover:bg-amber-500/15 transition-colors"
                >
                  <GrokThinkingLottie size={20} />
                  <p className="text-xs text-amber-400 font-medium uppercase tracking-wider">
                    Grok is thinking...
                  </p>
                  <div className="ml-auto flex items-center gap-2">
                    {reasoningExpanded ? (
                      <ChevronUp className="w-4 h-4 text-amber-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-amber-400" />
                    )}
                  </div>
                </button>
                {reasoningExpanded && (
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
            </div>
          ) : previewLines.length > 0 ? (
            <div className="bg-surface rounded-lg p-3 border border-border">
              <p className="text-xs text-muted mb-2 uppercase tracking-wider font-medium">
                Preview
              </p>
              {previewLines.map((line, i) => (
                <p key={i} className="text-xs text-foreground/70 truncate">
                  {line}
                </p>
              ))}
              {transcript.split("\n").filter(Boolean).length > 5 && (
                <p className="text-xs text-muted mt-1">
                  ...and {transcript.split("\n").filter(Boolean).length - 5} more
                  lines
                </p>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* Generate button / loading indicator */}
      {loading ? (
        <div className="w-full rounded-xl bg-surface border border-border p-4">
          <div className="flex items-center justify-center gap-2.5">
            <div className="w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin shrink-0" />
            <span className="text-sm text-foreground font-medium">
              Analyzing transcript...
            </span>
          </div>
        </div>
      ) : (
        <button
          onClick={() => onGenerate(transcript)}
          disabled={!transcript.trim()}
          className="w-full flex items-center justify-center gap-2 h-12 rounded-xl
            bg-accent hover:bg-accent-hover text-white font-medium
            disabled:opacity-40 disabled:cursor-not-allowed
            transition-all duration-200"
        >
          <Sparkles className="w-5 h-5" />
          Analyze Transcript
        </button>
      )}
    </div>
  );
}