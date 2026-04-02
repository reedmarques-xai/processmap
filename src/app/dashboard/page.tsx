"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import Header from "@/components/header";
import TranscriptUpload from "@/components/transcript-upload";
import UseCaseSelector from "@/components/use-case-selector";
import ProcessMapViewer from "@/components/process-map-editor";
import HistoryList from "@/components/history-list";
import ExamplesDrawer from "@/components/examples-drawer";
import { getSavedMaps, saveMap } from "@/lib/storage";
import { StreamingElementParser } from "@/lib/streaming-element-parser";
import { SavedMap, GrokExcalidrawResult, ExcalidrawScene, GrokModelId, DEFAULT_MODEL_ID, UseCase, ExtractUseCasesResult } from "@/lib/types";

const MODEL_STORAGE_KEY = "grokessmap_model";

type FlowStep = "upload" | "select-use-case";

/** Trigger a browser file download from a string. */
function triggerDownload(filename: string, content: string) {
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

/** Download both a .json result file and a valid .excalidraw file. */
function downloadFiles(result: GrokExcalidrawResult) {
  const stem = result.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "process-map";

  // 1. Full JSON (title + summary + excalidraw data)
  triggerDownload(`${stem}.json`, JSON.stringify(result, null, 2));

  // 2. Valid .excalidraw file (scene only)
  const scene = {
    type: "excalidraw",
    version: 2,
    source: "https://excalidraw.com",
    elements: result.excalidraw.elements,
    appState: result.excalidraw.appState ?? {},
    files: result.excalidraw.files ?? {},
  };
  triggerDownload(`${stem}.excalidraw`, JSON.stringify(scene, null, 2));
}

export default function DashboardPage() {
  const router = useRouter();
  const [maps, setMaps] = useState<SavedMap[]>([]);
  const [extractingUseCases, setExtractingUseCases] = useState(false);
  const [generatingMap, setGeneratingMap] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Multi-step flow state
  const [flowStep, setFlowStep] = useState<FlowStep>("upload");
  const [currentTranscript, setCurrentTranscript] = useState<string>("");
  const [extractedUseCases, setExtractedUseCases] = useState<ExtractUseCasesResult | null>(null);
  
  // Reasoning text for real-time display
  const [reasoningText, setReasoningText] = useState<string>("");
  const [mapReasoningText, setMapReasoningText] = useState<string>("");

  // Live streaming preview of the diagram being generated
  const [streamingScene, setStreamingScene] = useState<ExcalidrawScene | null>(null);

  // Check auth
  useEffect(() => {
    const auth = localStorage.getItem("grokessmap_auth");
    if (auth !== "true") {
      router.replace("/");
      return;
    }
    setMaps(getSavedMaps());
  }, [router]);

  const refreshMaps = useCallback(() => {
    setMaps(getSavedMaps());
  }, []);

  // Step 1: Extract use cases from transcript with streaming
  const handleExtractUseCases = async (transcript: string) => {
    setExtractingUseCases(true);
    setError(null);
    setCurrentTranscript(transcript);
    setReasoningText("");

    try {
      const modelId: GrokModelId =
        (localStorage.getItem(MODEL_STORAGE_KEY) as GrokModelId) || DEFAULT_MODEL_ID;

      const res = await fetch("/api/extract-use-cases-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, modelId }),
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

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        // Process SSE events
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            
            if (data === "[DONE]") {
              continue;
            }

            try {
              const parsed = JSON.parse(data);
              
              if (parsed.type === "reasoning") {
                setReasoningText((prev) => prev + parsed.text);
              } else if (parsed.type === "result") {
                setExtractedUseCases(parsed.data);
                setFlowStep("select-use-case");
              } else if (parsed.type === "error") {
                throw new Error(parsed.error);
              }
            } catch (parseErr) {
              // Ignore JSON parse errors for incomplete data
              if (data !== "[DONE]") {
                console.warn("Failed to parse SSE data:", data);
              }
            }
          }
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
    } finally {
      setExtractingUseCases(false);
      setReasoningText("");
    }
  };

  // Step 2: Generate process map for selected use case with streaming
  const handleGenerateForUseCase = async (useCase: UseCase) => {
    setGeneratingMap(true);
    setError(null);
    setMapReasoningText("");
    setStreamingScene(null);

    try {
      const modelId: GrokModelId =
        (localStorage.getItem(MODEL_STORAGE_KEY) as GrokModelId) || DEFAULT_MODEL_ID;

      const res = await fetch("/api/generate-process-map-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: currentTranscript, useCase, modelId }),
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
      let grokResult: GrokExcalidrawResult | null = null;
      const elementParser = new StreamingElementParser();

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
                setMapReasoningText((prev) => prev + parsed.text);
              } else if (parsed.type === "text") {
                // Feed text to the element parser for live diagram preview
                const newEls = elementParser.push(parsed.text);
                if (newEls.length > 0) {
                  setStreamingScene({
                    elements: elementParser.getAllElements(),
                    appState: {},
                    files: {},
                  });
                }
              } else if (parsed.type === "result") {
                grokResult = parsed.data;
              } else if (parsed.type === "error") {
                throw new Error(parsed.error);
              }
            } catch (parseErr) {
              if (data !== "[DONE]") {
                console.warn("Failed to parse SSE data:", data);
              }
            }
          }
        }
      }

      if (!grokResult) {
        throw new Error("No result received from API");
      }

      // Download the JSON + .excalidraw files
      downloadFiles(grokResult);

      // Create a saved map directly from Grok's Excalidraw output
      const mapId = uuidv4();
      const now = new Date().toISOString();
      const newMap: SavedMap = {
        id: mapId,
        title: grokResult.title,
        summary: grokResult.summary,
        transcript: currentTranscript,
        excalidrawData: grokResult.excalidraw,
        createdAt: now,
        updatedAt: now,
      };

      saveMap(newMap);
      router.push(`/editor/${mapId}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
    } finally {
      setGeneratingMap(false);
      setMapReasoningText("");
      setStreamingScene(null);
    }
  };

  // Go back to upload step
  const handleBackToUpload = () => {
    setFlowStep("upload");
    setExtractedUseCases(null);
    setError(null);
  };

  // Use wider container for use case selection or streaming preview
  const showStreamingPreview = generatingMap && streamingScene && streamingScene.elements.length > 0;
  const containerClass = showStreamingPreview
    ? "max-w-7xl"
    : flowStep === "select-use-case" 
      ? "max-w-4xl" 
      : "max-w-2xl";

  return (
    <div className="min-h-screen bg-background">
      <ExamplesDrawer />
      <Header />

      <main className={`${containerClass} mx-auto px-4 py-8 transition-all duration-300`}>
        {/* New Process Map Section */}
        <div className="mb-10">
          <h2 className="text-lg font-semibold mb-1">New Process Map</h2>
          <p className="text-muted text-sm mb-5">
            {flowStep === "upload"
              ? "Upload a Gong transcript and AI will identify use cases for you to map"
              : "Select a use case to generate its process map"}
          </p>

          {flowStep === "upload" && (
            <TranscriptUpload
              onGenerate={handleExtractUseCases}
              loading={extractingUseCases}
              reasoningText={reasoningText}
            />
          )}

          {flowStep === "select-use-case" && extractedUseCases && (
            <div className={showStreamingPreview ? "flex gap-6 items-start" : ""}>
              <div className={showStreamingPreview ? "w-[380px] shrink-0" : ""}>
                <UseCaseSelector
                  useCases={extractedUseCases.useCases}
                  transcriptSummary={extractedUseCases.transcriptSummary}
                  onSelectUseCase={handleGenerateForUseCase}
                  onBack={handleBackToUpload}
                  loading={generatingMap}
                  reasoningText={mapReasoningText}
                />
              </div>

              {/* Live diagram preview during generation */}
              {showStreamingPreview && (
                <div className="flex-1 min-w-0 rounded-xl border border-border overflow-hidden bg-surface" style={{ height: "600px" }}>
                  <div className="px-3 py-2 border-b border-border bg-surface flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs text-muted">
                      Building diagram… {streamingScene!.elements.length} elements
                    </span>
                  </div>
                  <div className="h-[calc(100%-36px)]">
                    <ProcessMapViewer sceneData={streamingScene!} isStreaming={true} />
                  </div>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-border my-8" />

        {/* History */}
        <HistoryList maps={maps} onDelete={refreshMaps} />
      </main>
    </div>
  );
}