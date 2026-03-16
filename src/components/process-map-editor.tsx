"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { ExcalidrawScene } from "@/lib/types";

interface ProcessMapViewerProps {
  sceneData: ExcalidrawScene;
}

const MIN_SCALE = 0.1;
const MAX_SCALE = 5;
const ZOOM_STEP = 0.025;

export default function ProcessMapViewer({ sceneData }: ProcessMapViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgWrapperRef = useRef<HTMLDivElement>(null);
  const svgSizeRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Transform state
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  // Pan tracking (refs to avoid re-renders during drag)
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const posAtPanStart = useRef({ x: 0, y: 0 });

  // ── Fit the SVG inside the container with padding ──
  const fitToView = useCallback(() => {
    const container = containerRef.current;
    const { w: svgW, h: svgH } = svgSizeRef.current;
    if (!container || !svgW || !svgH) return;

    const cW = container.clientWidth;
    const cH = container.clientHeight;
    const padding = 40;

    const fitScale = Math.min(
      (cW - padding * 2) / svgW,
      (cH - padding * 2) / svgH,
      1 // never zoom beyond 100 % on initial fit
    );
    const x = (cW - svgW * fitScale) / 2;
    const y = (cH - svgH * fitScale) / 2;

    setScale(fitScale);
    setPos({ x, y });
  }, []);

  // ── Render SVG from scene data ──
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    async function renderSvg() {
      try {
        const { exportToSvg } = await import("@excalidraw/excalidraw");

        const svg = await exportToSvg({
          elements: sceneData.elements as Parameters<typeof exportToSvg>[0]["elements"],
          appState: {
            exportBackground: true,
            viewBackgroundColor: "#ffffff",
            ...(sceneData.appState || {}),
          },
          files: (sceneData.files as Parameters<typeof exportToSvg>[0]["files"]) || null,
          exportPadding: 40,
        });

        if (cancelled || !svgWrapperRef.current || !containerRef.current) return;

        // Read the SVG's intrinsic size before we touch it
        const w = parseFloat(svg.getAttribute("width") || "800");
        const h = parseFloat(svg.getAttribute("height") || "600");
        svgSizeRef.current = { w, h };

        // Keep natural pixel dimensions — transform handles scaling
        svg.style.width = `${w}px`;
        svg.style.height = `${h}px`;
        svg.style.display = "block";

        svgWrapperRef.current.innerHTML = "";
        svgWrapperRef.current.appendChild(svg);

        setLoading(false);

        // Fit after a tick so the container has laid out
        requestAnimationFrame(() => {
          if (!cancelled) fitToView();
        });
      } catch (err) {
        if (!cancelled) {
          console.error("exportToSvg failed:", err);
          setError(err instanceof Error ? err.message : "Failed to render diagram");
          setLoading(false);
        }
      }
    }

    renderSvg();
    return () => { cancelled = true; };
  }, [sceneData, fitToView]);

  // ── Re-fit when the container resizes ──
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(() => fitToView());
    ro.observe(container);
    return () => ro.disconnect();
  }, [fitToView]);

  // Keep refs in sync so the wheel handler always reads the latest values
  const scaleRef = useRef(scale);
  const posRef = useRef(pos);
  useEffect(() => { scaleRef.current = scale; }, [scale]);
  useEffect(() => { posRef.current = pos; }, [pos]);

  // ── Wheel → zoom centred on cursor ──
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();

      const rect = container.getBoundingClientRect();
      const cursorX = e.clientX - rect.left;
      const cursorY = e.clientY - rect.top;

      const oldScale = scaleRef.current;
      const oldPos = posRef.current;

      // Diagram-space point under the cursor
      const diagX = (cursorX - oldPos.x) / oldScale;
      const diagY = (cursorY - oldPos.y) / oldScale;

      // Compute new scale
      const factor = e.deltaY > 0 ? 1 - ZOOM_STEP : 1 + ZOOM_STEP;
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, oldScale * factor));

      // Adjust translation so the same diagram point stays under the cursor
      const newPos = {
        x: cursorX - diagX * newScale,
        y: cursorY - diagY * newScale,
      };

      setScale(newScale);
      setPos(newPos);
    };

    container.addEventListener("wheel", onWheel, { passive: false });
    return () => container.removeEventListener("wheel", onWheel);
  }, []);

  // ── Pointer events → pan ──
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Only primary button (left click)
      if (e.button !== 0) return;
      isPanning.current = true;
      panStart.current = { x: e.clientX, y: e.clientY };
      posAtPanStart.current = { ...pos };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [pos]
  );

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isPanning.current) return;
    const dx = e.clientX - panStart.current.x;
    const dy = e.clientY - panStart.current.y;
    setPos({
      x: posAtPanStart.current.x + dx,
      y: posAtPanStart.current.y + dy,
    });
  }, []);

  const handlePointerUp = useCallback(() => {
    isPanning.current = false;
  }, []);

  // ── Zoom button helpers ──
  const zoomIn = useCallback(() => {
    setScale((s) => Math.min(MAX_SCALE, s * 1.25));
  }, []);

  const zoomOut = useCallback(() => {
    setScale((s) => Math.max(MIN_SCALE, s / 1.25));
  }, []);

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#121212]">
        <div className="text-center px-6">
          <p className="text-red-400 text-sm mb-2">Failed to render diagram</p>
          <p className="text-[#666] text-xs">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative bg-[#f5f5f5] overflow-hidden select-none">
      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-[#121212]">
          <div className="text-center">
            <div className="w-10 h-10 border-2 border-[#6c5ce7]/30 border-t-[#6c5ce7] rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[#888] text-sm">Rendering diagram…</p>
          </div>
        </div>
      )}

      {/* ── Interactive canvas area ── */}
      <div
        ref={containerRef}
        className="w-full h-full"
        style={{ cursor: isPanning.current ? "grabbing" : "grab" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onDoubleClick={fitToView}
      >
        <div
          ref={svgWrapperRef}
          style={{
            transformOrigin: "0 0",
            transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
            willChange: "transform",
            pointerEvents: "none", // let events pass through to the container
          }}
        />
      </div>

      {/* ── Zoom controls (bottom-right) ── */}
      <div className="absolute bottom-4 right-4 z-10 flex items-center gap-1 bg-[#232329]/90 backdrop-blur border border-[#3a3a4a] rounded-xl px-1 py-1 shadow-lg">
        <button
          onClick={zoomOut}
          className="p-1.5 rounded-lg text-[#ccc] hover:text-white hover:bg-[#3a3a4a] transition-colors"
          title="Zoom out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        <span className="text-[11px] text-[#888] w-12 text-center tabular-nums">
          {Math.round(scale * 100)}%
        </span>

        <button
          onClick={zoomIn}
          className="p-1.5 rounded-lg text-[#ccc] hover:text-white hover:bg-[#3a3a4a] transition-colors"
          title="Zoom in"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-[#3a3a4a]" />

        <button
          onClick={fitToView}
          className="p-1.5 rounded-lg text-[#ccc] hover:text-white hover:bg-[#3a3a4a] transition-colors"
          title="Fit to view (double-click)"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}