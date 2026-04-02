// ---- Grok model selection ----

export type GrokModelId =
  | "grok-4-1-fast-reasoning"
  | "grok-4.20-0309-reasoning"
  | "grok-4.20-multi-agent-0309-low"
  | "grok-4.20-multi-agent-0309-high";

export interface GrokModelConfig {
  apiModelId: string;                   // actual model name sent to the API
  reasoningEffort?: "low" | "high";     // only for multi-agent models
}

export const GROK_MODELS: { id: GrokModelId; label: string; config: GrokModelConfig }[] = [
  {
    id: "grok-4-1-fast-reasoning",
    label: "Grok 4.1 Fast",
    config: { apiModelId: "grok-4-1-fast-reasoning" },
  },
  {
    id: "grok-4.20-0309-reasoning",
    label: "Grok 4.2 Reasoning",
    config: { apiModelId: "grok-4.20-0309-reasoning" },
  },
  {
    id: "grok-4.20-multi-agent-0309-low",
    label: "Grok 4.2 MA (Low)",
    config: { apiModelId: "grok-4.20-multi-agent-0309", reasoningEffort: "low" },
  },
  {
    id: "grok-4.20-multi-agent-0309-high",
    label: "Grok 4.2 MA (High)",
    config: { apiModelId: "grok-4.20-multi-agent-0309", reasoningEffort: "high" },
  },
];

export const DEFAULT_MODEL_ID: GrokModelId = "grok-4.20-multi-agent-0309-low";

export function getModelConfig(modelId: GrokModelId): GrokModelConfig {
  const model = GROK_MODELS.find((m) => m.id === modelId);
  return model?.config ?? GROK_MODELS[2].config; // default to MA-low
}

// ---- Excalidraw scene (what gets stored and rendered) ----

export interface ExcalidrawScene {
  elements: readonly Record<string, unknown>[];
  appState?: Record<string, unknown>;
  files?: Record<string, unknown>;
}

// ---- Result from the Grok API (Excalidraw JSON + metadata) ----

export interface GrokExcalidrawResult {
  title: string;
  summary: string;
  excalidraw: ExcalidrawScene;
}

// ---- Saved map stored in localStorage ----

export interface SavedMap {
  id: string;
  title: string;
  summary: string;
  transcript: string;
  excalidrawData: ExcalidrawScene;
  createdAt: string;
  updatedAt: string;
  /** All diagram versions. If absent, the map has only the original version. */
  versions?: DiagramVersion[];
}

// ---- Diagram versioning ----

export interface DiagramVersion {
  version: number;
  label: string;                 // e.g. "v1 — Original" or "v2 — Added review step"
  excalidrawData: ExcalidrawScene;
  timestamp: string;
}

// ---- Chat messages for the edit sidebar ----

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  versionCreated?: number;       // version # produced by this exchange
}

// ---- API request/response ----

export interface ParseTranscriptRequest {
  transcript: string;
}

export interface ParseTranscriptResponse {
  success: boolean;
  data?: GrokExcalidrawResult;
  error?: string;
}

export interface EditDiagramRequest {
  currentExcalidraw: ExcalidrawScene;
  instruction: string;
}

export interface EditDiagramResponse {
  success: boolean;
  data?: {
    excalidraw: ExcalidrawScene;
    summary: string;
  };
  error?: string;
}

export interface VerifyPinRequest {
  pin: string;
}

export interface VerifyPinResponse {
  success: boolean;
  error?: string;
}

// ---- Use Case extraction ----

export interface UseCase {
  id: string;
  title: string;
  description: string;
  details: string[];
  participants?: string[];
  systems?: string[];
}

export interface ExtractUseCasesResult {
  useCases: UseCase[];
  transcriptSummary: string;
}

export interface ExtractUseCasesRequest {
  transcript: string;
  modelId?: GrokModelId;
}

export interface ExtractUseCasesResponse {
  success: boolean;
  data?: ExtractUseCasesResult;
  error?: string;
}

// ---- Process map generation with use case context ----

export interface GenerateProcessMapRequest {
  transcript: string;
  useCase: UseCase;
  modelId?: GrokModelId;
}