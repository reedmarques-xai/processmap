"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Download, Check, Pencil, MessageSquare, PanelRightClose } from "lucide-react";
import ProcessMapViewer from "@/components/process-map-editor";
import EditChat from "@/components/edit-chat";
import { getSavedMap, updateMapTitle, updateMapVersions } from "@/lib/storage";
import { SavedMap, DiagramVersion, ExcalidrawScene } from "@/lib/types";
import { downloadFile } from "@/lib/utils";

export default function EditorPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [map, setMap] = useState<SavedMap | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState("");
  const [chatOpen, setChatOpen] = useState(true);

  // ── Version management ──
  const [versions, setVersions] = useState<DiagramVersion[]>([]);
  const [currentVersion, setCurrentVersion] = useState(1);
  const versionsRef = useRef<DiagramVersion[]>([]);

  useEffect(() => {
    const auth = localStorage.getItem("grokessmap_auth");
    if (auth !== "true") {
      router.replace("/");
      return;
    }

    const savedMap = getSavedMap(id);
    if (!savedMap) {
      router.replace("/dashboard");
      return;
    }

    setMap(savedMap);
    setTitleValue(savedMap.title);

    // Restore saved versions, or create v1 from excalidrawData for backward compat
    if (savedMap.versions && savedMap.versions.length > 0) {
      setVersions(savedMap.versions);
      versionsRef.current = savedMap.versions;
      setCurrentVersion(savedMap.versions.length);
    } else {
      const v1: DiagramVersion = {
        version: 1,
        label: "v1 — Original",
        excalidrawData: savedMap.excalidrawData,
        timestamp: savedMap.createdAt,
      };
      setVersions([v1]);
      versionsRef.current = [v1];
      setCurrentVersion(1);
    }
    setLoading(false);
  }, [id, router]);

  // Keep ref in sync so the chat callback always reads latest
  useEffect(() => {
    versionsRef.current = versions;
  }, [versions]);

  // ── Streaming state for live diagram preview during edits ──
  const [isEditStreaming, setIsEditStreaming] = useState(false);
  const [streamingScene, setStreamingScene] = useState<ExcalidrawScene | null>(null);

  const handleStreamingElements = useCallback((elements: Record<string, unknown>[]) => {
    setStreamingScene({ elements, appState: {}, files: {} });
  }, []);

  const handleStreamingStateChange = useCallback((streaming: boolean) => {
    setIsEditStreaming(streaming);
    if (!streaming) {
      // Clear the streaming preview when done — the final result will come via onNewVersion
      setStreamingScene(null);
    }
  }, []);

  // ── Derive the scene that should be displayed ──
  // During streaming, show the in-progress scene; otherwise show the selected version
  const displayedScene: ExcalidrawScene =
    (isEditStreaming && streamingScene)
      ? streamingScene
      : (versions.find((v) => v.version === currentVersion)?.excalidrawData ||
         map?.excalidrawData || { elements: [] });

  // ── Called by chat to get the scene it should send to the API ──
  const getCurrentScene = useCallback((): ExcalidrawScene => {
    const v = versionsRef.current.find((v) => v.version === currentVersion);
    return v?.excalidrawData || map?.excalidrawData || { elements: [] };
  }, [currentVersion, map]);

  // ── Called by chat when Grok returns a new version ──
  const handleNewVersion = useCallback(
    (scene: ExcalidrawScene, summary: string) => {
      const nextNum = versionsRef.current.length + 1;
      const newVersion: DiagramVersion = {
        version: nextNum,
        label: `v${nextNum} — ${summary}`,
        excalidrawData: scene,
        timestamp: new Date().toISOString(),
      };
      const updatedVersions = [...versionsRef.current, newVersion];
      setVersions(updatedVersions);
      setCurrentVersion(nextNum);

      // Persist all versions to localStorage
      if (map) {
        updateMapVersions(map.id, updatedVersions);
      }
    },
    [map]
  );

  // ── Export the currently displayed version ──
  const handleExport = useCallback(() => {
    if (!map) return;
    const exportData = {
      type: "excalidraw",
      version: 2,
      source: "grokessmap",
      elements: displayedScene.elements,
      appState: {
        ...(displayedScene.appState || {}),
        collaborators: [],
        exportBackground: true,
        viewBackgroundColor: "#ffffff",
      },
      files: displayedScene.files || {},
    };
    const filename = `${map.title.replace(/[^a-zA-Z0-9]/g, "_")}_v${currentVersion}.excalidraw`;
    downloadFile(JSON.stringify(exportData, null, 2), filename, "application/json");
  }, [map, displayedScene, currentVersion]);

  const handleTitleSave = () => {
    if (map && titleValue.trim()) {
      updateMapTitle(map.id, titleValue.trim());
      setMap({ ...map, title: titleValue.trim() });
    }
    setEditingTitle(false);
  };

  // Keyboard shortcut: Cmd+E export
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "e") {
        e.preventDefault();
        handleExport();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleExport]);

  if (loading || !map) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#121212]">
        <div className="w-8 h-8 border-2 border-[#6c5ce7]/30 border-t-[#6c5ce7] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0a0a0a]">
      {/* ── Header bar ── */}
      <header className="shrink-0 h-12 flex items-center justify-between px-3 border-b border-[#2a2a2a] bg-[#121212]">
        {/* Left: back */}
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-[#ccc] hover:text-white hover:bg-[#232329] transition-colors"
          title="Back to Dashboard"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Dashboard</span>
        </button>

        {/* Center: title */}
        <div className="flex-1 flex justify-center min-w-0 mx-4">
          {editingTitle ? (
            <div className="flex items-center gap-1 bg-[#232329] border border-[#3a3a4a] rounded-lg px-2 py-0.5">
              <input
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleTitleSave();
                  if (e.key === "Escape") {
                    setEditingTitle(false);
                    setTitleValue(map.title);
                  }
                }}
                onBlur={handleTitleSave}
                className="h-7 w-56 px-2 text-sm bg-transparent text-white focus:outline-none text-center"
                autoFocus
              />
              <button
                onClick={handleTitleSave}
                className="p-1 rounded text-[#6c5ce7] hover:bg-[#6c5ce7]/10"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditingTitle(true)}
              className="flex items-center gap-1.5 max-w-xs truncate text-sm text-[#ccc] hover:text-white transition-colors"
              title="Click to rename"
            >
              <span className="truncate">{map.title}</span>
              <Pencil className="w-3 h-3 shrink-0 opacity-40" />
            </button>
          )}
        </div>

        {/* Right: export + chat toggle */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 bg-[#6c5ce7] rounded-lg px-3 py-1.5 text-sm text-white font-medium hover:bg-[#7c6cf7] transition-colors"
            title="Export .excalidraw (⌘E)"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </button>

          <button
            onClick={() => setChatOpen((o) => !o)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${
              chatOpen
                ? "bg-[#232329] text-[#ccc] hover:text-white hover:bg-[#3a3a4a]"
                : "bg-[#6c5ce7]/20 text-[#a78bfa] hover:bg-[#6c5ce7]/30"
            }`}
            title={chatOpen ? "Close chat panel" : "Open chat panel"}
          >
            {chatOpen ? (
              <PanelRightClose className="w-4 h-4" />
            ) : (
              <MessageSquare className="w-4 h-4" />
            )}
          </button>
        </div>
      </header>

      {/* ── Main content: viewer + sliding chat ── */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Diagram viewer — always fills remaining space */}
        <main className="flex-1 h-full min-w-0">
          <ProcessMapViewer sceneData={displayedScene} isStreaming={isEditStreaming} />
        </main>

        {/* Edit chat sidebar — slides in/out */}
        <aside
          className="h-full shrink-0 overflow-hidden transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
          style={{ width: chatOpen ? 340 : 0 }}
        >
          <div className="w-[340px] h-full relative">
            <EditChat
              versions={versions}
              currentVersion={currentVersion}
              onVersionChange={setCurrentVersion}
              getCurrentScene={getCurrentScene}
              onNewVersion={handleNewVersion}
              onStreamingElements={handleStreamingElements}
              onStreamingStateChange={handleStreamingStateChange}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}