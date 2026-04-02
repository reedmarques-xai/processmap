import { streamText } from "ai";
import { createXai } from "@ai-sdk/xai";
import { GrokExcalidrawResult, ExcalidrawScene, GrokModelConfig, ExtractUseCasesResult, UseCase } from "./types";
import { EXCALIDRAW_PROCESS_MAP_PROMPT } from "./prompts/excalidraw-process-map";

/**
 * Custom fetch wrapper that patches xAI API requests to enable reasoning
 * streaming. The @ai-sdk/xai provider sends `reasoning: { effort }` but
 * omits two things the API now requires to stream reasoning events:
 *
 * 1. `reasoning.summary: "auto"` — tells the API to generate and stream
 *    human-readable reasoning summaries (`response.reasoning_summary_text.delta`).
 *    Without this, no summary events are sent.
 *
 * 2. `include: ["reasoning.encrypted_content"]` — for grok-4+ models,
 *    reasoning content is encrypted. This flag must be set for the API to
 *    emit ANY reasoning-related SSE events during streaming.
 *
 * See: https://docs.x.ai/developers/model-capabilities/text/reasoning
 */
function createReasoningFetch(): typeof globalThis.fetch {
  return async (input, init) => {
    if (init?.body && typeof init.body === "string") {
      try {
        const body = JSON.parse(init.body);
        if (body.reasoning && body.reasoning.effort) {
          // Enable human-readable reasoning summaries in the stream
          // Use "detailed" for more in-depth reasoning trace
          if (!body.reasoning.summary) {
            body.reasoning.summary = "detailed";
          }
          // Ensure reasoning events are included in the response
          const includeSet = new Set<string>(body.include || []);
          includeSet.add("reasoning.encrypted_content");
          body.include = [...includeSet];
          init = { ...init, body: JSON.stringify(body) };
        }
      } catch {
        // Not JSON — pass through unchanged
      }
    }
    return globalThis.fetch(input, init);
  };
}

/** Creates an xAI provider instance with reasoning streaming enabled. */
function createXaiWithReasoning(apiKey: string) {
  return createXai({ apiKey, fetch: createReasoningFetch() });
}

// Stream event types
export type StreamEvent = 
  | { type: "text"; text: string }
  | { type: "reasoning"; text: string }
  | { type: "result"; data: ExtractUseCasesResult };

/**
 * Extracts all use cases/processes discussed in a transcript via streaming.
 * Yields text and reasoning chunks as they arrive, then returns the final parsed result.
 */
export async function* extractUseCasesFromTranscriptStream(
  transcript: string,
  apiKey: string,
  modelConfig: GrokModelConfig
): AsyncGenerator<StreamEvent> {
  const xai = createXaiWithReasoning(apiKey);

  const maxChars = 12000;
  const truncated =
    transcript.length > maxChars
      ? transcript.slice(0, maxChars) + "\n\n[Transcript truncated for processing]"
      : transcript;

  const systemPrompt = `You are an expert at analyzing business conversations and identifying distinct use cases, processes, and workflows being discussed.

Your job is to extract ALL distinct use cases, workflows, or processes mentioned in the transcript. For each use case, identify:
1. A clear, concise title
2. A brief description of what the process/use case is about
3. Key details mentioned (steps, pain points, requirements, etc.)
4. Participants involved (roles, teams, departments)
5. Systems or tools mentioned

Be thorough - capture every process or workflow discussed, even if only briefly mentioned.`;

  const userMessage = `Analyze this transcript and extract ALL distinct use cases, processes, or workflows being discussed.

Return your response as JSON in this exact format (return ONLY this JSON, nothing else):
{
  "transcriptSummary": "A 1-2 sentence summary of what this conversation was about overall",
  "useCases": [
    {
      "id": "use-case-1",
      "title": "Short descriptive title of the process/use case",
      "description": "1-2 sentence description of what this process is about",
      "details": [
        "Specific detail or step mentioned",
        "Pain point or challenge discussed",
        "Requirement or goal mentioned"
      ],
      "participants": ["Role 1", "Team 2"],
      "systems": ["System A", "Tool B"]
    }
  ]
}

Include at least 1 use case. If multiple processes are discussed, include all of them. Generate unique IDs like "use-case-1", "use-case-2", etc.

Here is the transcript:

${truncated}`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const generateOptions: any = {
    model: xai.responses(modelConfig.apiModelId),
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    temperature: 0.3,
    maxOutputTokens: 8192,
  };

  if (modelConfig.reasoningEffort) {
    generateOptions.providerOptions = {
      xai: { reasoningEffort: modelConfig.reasoningEffort },
    };
  }

  console.log(`\x1b[32m[Grok API] extractUseCasesFromTranscriptStream using model: ${modelConfig.apiModelId}\x1b[0m`);
  
  const result = streamText(generateOptions);
  let content = "";
  let reasoningChunks = 0;
  let textChunks = 0;
  
  // Use fullStream to capture both text and reasoning
  for await (const part of result.fullStream) {
    if (part.type === "reasoning-start") {
      console.log(`\x1b[33m[Reasoning started]\x1b[0m`);
    } else if (part.type === "reasoning-delta") {
      const text = (part as any).text ?? "";
      if (text) {
        reasoningChunks++;
        if (reasoningChunks === 1) console.log(`\x1b[33m[Streaming reasoning chunks...]\x1b[0m`);
        yield { type: "reasoning", text };
      }
    } else if (part.type === "reasoning-end") {
      console.log(`\x1b[33m[Reasoning ended — ${reasoningChunks} chunks]\x1b[0m`);
    } else if (part.type === "text-delta") {
      const text = (part as any).text ?? "";
      if (text) {
        textChunks++;
        content += text;
        yield { type: "text", text };
      }
    }
  }
  console.log(`\x1b[32m[Stream complete] reasoning=${reasoningChunks} text=${textChunks}\x1b[0m`);

  if (!content) {
    throw new Error("No content in xAI API response");
  }

  // Strip markdown fences if present
  let jsonStr = content.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  const parsed = JSON.parse(jsonStr);

  if (!parsed.useCases || !Array.isArray(parsed.useCases) || parsed.useCases.length === 0) {
    throw new Error("Response missing valid 'useCases' array");
  }

  if (!parsed.transcriptSummary || typeof parsed.transcriptSummary !== "string") {
    throw new Error("Response missing 'transcriptSummary'");
  }

  for (const uc of parsed.useCases) {
    if (!uc.id || !uc.title || !uc.description) {
      throw new Error("Each use case must have id, title, and description");
    }
    if (!Array.isArray(uc.details)) {
      uc.details = [];
    }
  }

  yield {
    type: "result",
    data: {
      useCases: parsed.useCases,
      transcriptSummary: parsed.transcriptSummary,
    },
  };
}

// ============== STREAMING GENERATORS ==============

// Stream event types for diagram editing
export type EditStreamEvent = 
  | { type: "text"; text: string }
  | { type: "reasoning"; text: string }
  | { type: "result"; data: { excalidraw: ExcalidrawScene; summary: string } };

/**
 * Edits an existing Excalidraw diagram given a natural-language instruction via streaming.
 */
export async function* editDiagramWithGrokStream(
  currentExcalidraw: ExcalidrawScene,
  instruction: string,
  apiKey: string,
  modelConfig: GrokModelConfig
): AsyncGenerator<EditStreamEvent> {
  const xai = createXaiWithReasoning(apiKey);

  const currentJson = JSON.stringify({
    type: "excalidraw", version: 2, source: "https://excalidraw.com",
    elements: currentExcalidraw.elements,
    appState: currentExcalidraw.appState || {},
    files: currentExcalidraw.files || {},
  }, null, 2);

  const userMessage = `Here is the CURRENT Excalidraw diagram JSON:\n\n\`\`\`json\n${currentJson}\n\`\`\`\n\nApply the following edit: "${instruction}"\n\nRules:\n- Return the COMPLETE updated Excalidraw JSON.\n- Re-number steps if needed.\n\nReturn ONLY this JSON:\n{\n  "summary": "Brief description of what changed",\n  "excalidraw": <full updated JSON>\n}`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const opts: any = {
    model: xai.responses(modelConfig.apiModelId),
    messages: [{ role: "system", content: EXCALIDRAW_PROCESS_MAP_PROMPT }, { role: "user", content: userMessage }],
    temperature: 0.3, maxOutputTokens: 16384,
  };
  if (modelConfig.reasoningEffort) opts.providerOptions = { xai: { reasoningEffort: modelConfig.reasoningEffort } };

  console.log(`\x1b[32m[Grok API] editDiagramWithGrokStream using model: ${modelConfig.apiModelId}\x1b[0m`);
  const result = streamText(opts);
  let content = "";
  let reasoningChunks = 0;
  for await (const part of result.fullStream) {
    if (part.type === "reasoning-start") {
      console.log(`\x1b[33m[Edit reasoning started]\x1b[0m`);
    } else if (part.type === "reasoning-delta") {
      const t = (part as any).text ?? "";
      if (t) { reasoningChunks++; yield { type: "reasoning", text: t }; }
    } else if (part.type === "reasoning-end") {
      console.log(`\x1b[33m[Edit reasoning ended — ${reasoningChunks} chunks]\x1b[0m`);
    } else if (part.type === "text-delta") {
      const t = (part as any).text ?? "";
      if (t) { content += t; yield { type: "text", text: t }; }
    }
  }
  console.log(`\x1b[32m[Edit stream complete] reasoning=${reasoningChunks}\x1b[0m`);
  if (!content) throw new Error("No content");
  let js = content.trim();
  if (js.startsWith("```")) js = js.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  const p = JSON.parse(js);
  if (!p.summary || !p.excalidraw?.elements) throw new Error("Invalid response");
  yield { type: "result", data: { summary: p.summary, excalidraw: { elements: p.excalidraw.elements, appState: p.excalidraw.appState || {}, files: p.excalidraw.files || {} } } };
}

// Stream event types for process map generation
export type ProcessMapStreamEvent = 
  | { type: "text"; text: string }
  | { type: "reasoning"; text: string }
  | { type: "result"; data: GrokExcalidrawResult };

/**
 * Generates a process map for a specific use case from a transcript via streaming.
 */
export async function* parseTranscriptForUseCaseStream(
  transcript: string,
  useCase: UseCase,
  apiKey: string,
  modelConfig: GrokModelConfig
): AsyncGenerator<ProcessMapStreamEvent> {
  const xai = createXaiWithReasoning(apiKey);
  const maxChars = 12000;
  const truncated = transcript.length > maxChars ? transcript.slice(0, maxChars) + "\n\n[Truncated]" : transcript;
  const ctx = `USE CASE: ${useCase.title}\n${useCase.description}\n${useCase.details.map(d => `- ${d}`).join('\n')}`;
  const userMessage = `Generate a process map for:\n\n${ctx}\n\nReturn ONLY JSON:\n{\n  "title": "${useCase.title}",\n  "summary": "...",\n  "excalidraw": <full JSON>\n}\n\nTranscript:\n${truncated}`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const opts: any = {
    model: xai.responses(modelConfig.apiModelId),
    messages: [{ role: "system", content: EXCALIDRAW_PROCESS_MAP_PROMPT }, { role: "user", content: userMessage }],
    temperature: 0.3, maxOutputTokens: 16384,
  };
  if (modelConfig.reasoningEffort) opts.providerOptions = { xai: { reasoningEffort: modelConfig.reasoningEffort } };

  console.log(`\x1b[32m[Grok API] parseTranscriptForUseCaseStream using model: ${modelConfig.apiModelId}\x1b[0m`);
  const result = streamText(opts);
  let content = "";
  let reasoningChunks = 0;
  for await (const part of result.fullStream) {
    if (part.type === "reasoning-start") {
      console.log(`\x1b[33m[Map reasoning started]\x1b[0m`);
    } else if (part.type === "reasoning-delta") {
      const t = (part as any).text ?? "";
      if (t) { reasoningChunks++; yield { type: "reasoning", text: t }; }
    } else if (part.type === "reasoning-end") {
      console.log(`\x1b[33m[Map reasoning ended — ${reasoningChunks} chunks]\x1b[0m`);
    } else if (part.type === "text-delta") {
      const t = (part as any).text ?? "";
      if (t) { content += t; yield { type: "text", text: t }; }
    }
  }
  console.log(`\x1b[32m[Map stream complete] reasoning=${reasoningChunks}\x1b[0m`);
  if (!content) throw new Error("No content");
  let js = content.trim();
  if (js.startsWith("```")) js = js.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  const p = JSON.parse(js);
  if (!p.title || !p.summary || !p.excalidraw?.elements) throw new Error("Invalid response");
  yield { type: "result", data: { title: p.title, summary: p.summary, excalidraw: { elements: p.excalidraw.elements, appState: p.excalidraw.appState || {}, files: p.excalidraw.files || {} } } };
}