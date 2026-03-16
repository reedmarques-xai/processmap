import { generateText } from "ai";
import { createXai } from "@ai-sdk/xai";
import { GrokExcalidrawResult, ExcalidrawScene, GrokModelConfig, ExtractUseCasesResult, UseCase } from "./types";
import { EXCALIDRAW_PROCESS_MAP_PROMPT } from "./prompts/excalidraw-process-map";

/**
 * Sends a Gong transcript to the xAI Grok API and receives back a complete
 * Excalidraw scene (elements, appState, files) plus a title and summary.
 *
 * Uses the official @ai-sdk/xai provider for all Grok requests.
 * The system prompt instructs Grok to output raw Excalidraw JSON directly —
 * no intermediate format or client-side conversion needed.
 */
export async function parseTranscriptWithGrok(
  transcript: string,
  apiKey: string,
  modelConfig: GrokModelConfig
): Promise<GrokExcalidrawResult> {
  const xai = createXai({ apiKey });

  // Truncate very long transcripts to ~12K chars (~3K tokens)
  const maxChars = 12000;
  const truncated =
    transcript.length > maxChars
      ? transcript.slice(0, maxChars) + "\n\n[Transcript truncated for processing]"
      : transcript;

  const userMessage = `Analyze this Gong sales-call transcript. Extract the prospect's CURRENT workflow/process being described (not the sales pitch or proposed solution) and generate a complete Excalidraw process map.

Focus on:
- How the prospect currently does things (their existing process)
- Sequential steps, decision points, approvals, and handoffs
- 8-20 steps for readability with concise labels

After you generate the Excalidraw JSON, wrap your entire response in this structure (return ONLY this JSON, nothing else):
{
  "title": "Short descriptive title of the process",
  "summary": "1-2 sentence summary of what this process covers",
  "excalidraw": <your full Excalidraw JSON object here>
}

Here is the transcript:

${truncated}`;

  // Build options — only include reasoningEffort when specified (multi-agent models)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const generateOptions: any = {
    model: xai.responses(modelConfig.apiModelId),
    messages: [
      { role: "system", content: EXCALIDRAW_PROCESS_MAP_PROMPT },
      { role: "user", content: userMessage },
    ],
    temperature: 0.3,
    maxOutputTokens: 16384,
  };

  if (modelConfig.reasoningEffort) {
    generateOptions.providerOptions = {
      xai: { reasoningEffort: modelConfig.reasoningEffort },
    };
  }

  console.log(`\x1b[32m[Grok API] parseTranscriptWithGrok using model: ${modelConfig.apiModelId}\x1b[0m`);
  const { text: content } = await generateText(generateOptions);

  if (!content) {
    throw new Error("No content in xAI API response");
  }

  // Strip markdown fences if present
  let jsonStr = content.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  const parsed = JSON.parse(jsonStr);

  // ---- Validate the wrapper ----
  if (!parsed.title || typeof parsed.title !== "string") {
    throw new Error("Response missing 'title'");
  }
  if (!parsed.summary || typeof parsed.summary !== "string") {
    throw new Error("Response missing 'summary'");
  }

  // ---- Validate the Excalidraw payload ----
  const excalidraw = parsed.excalidraw;
  if (!excalidraw || !Array.isArray(excalidraw.elements)) {
    throw new Error("Response missing valid 'excalidraw.elements' array");
  }
  if (excalidraw.elements.length < 2) {
    throw new Error("Excalidraw scene must have at least 2 elements");
  }

  return {
    title: parsed.title,
    summary: parsed.summary,
    excalidraw: {
      elements: excalidraw.elements,
      appState: excalidraw.appState || {},
      files: excalidraw.files || {},
    },
  };
}

/**
 * Takes an existing Excalidraw scene and a natural-language edit instruction,
 * sends both to Grok, and returns the updated scene plus a short summary of
 * what changed.
 */
export async function editDiagramWithGrok(
  currentExcalidraw: ExcalidrawScene,
  instruction: string,
  apiKey: string,
  modelConfig: GrokModelConfig
): Promise<{ excalidraw: ExcalidrawScene; summary: string }> {
  const xai = createXai({ apiKey });

  // Serialize just the elements array (appState/files are boilerplate)
  const currentJson = JSON.stringify(
    {
      type: "excalidraw",
      version: 2,
      source: "https://excalidraw.com",
      elements: currentExcalidraw.elements,
      appState: currentExcalidraw.appState || {},
      files: currentExcalidraw.files || {},
    },
    null,
    2
  );

  const userMessage = `Here is the CURRENT Excalidraw diagram JSON:

\`\`\`json
${currentJson}
\`\`\`

Apply the following edit to the diagram:

"${instruction}"

Rules:
- Return the COMPLETE updated Excalidraw JSON — all elements, not just the changed ones.
- Follow every rule in the system prompt (numbering, sizing, bindings, layout, etc.).
- Re-number steps if the edit inserts, removes, or reorders steps.
- Keep all elements that are NOT affected by the edit exactly as they are.

Wrap your response in this JSON structure (return ONLY this, nothing else):
{
  "summary": "Brief 1-sentence description of what changed",
  "excalidraw": <your full updated Excalidraw JSON object>
}`;

  // Build options — only include reasoningEffort when specified (multi-agent models)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const generateOptions: any = {
    model: xai.responses(modelConfig.apiModelId),
    messages: [
      { role: "system", content: EXCALIDRAW_PROCESS_MAP_PROMPT },
      { role: "user", content: userMessage },
    ],
    temperature: 0.3,
    maxOutputTokens: 16384,
  };

  if (modelConfig.reasoningEffort) {
    generateOptions.providerOptions = {
      xai: { reasoningEffort: modelConfig.reasoningEffort },
    };
  }

  console.log(`\x1b[32m[Grok API] editDiagramWithGrok using model: ${modelConfig.apiModelId}\x1b[0m`);
  const { text: content } = await generateText(generateOptions);

  if (!content) {
    throw new Error("No content in xAI API response");
  }

  // Strip markdown fences if present
  let jsonStr = content.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  const parsed = JSON.parse(jsonStr);

  if (!parsed.summary || typeof parsed.summary !== "string") {
    throw new Error("Response missing 'summary'");
  }

  const excalidraw = parsed.excalidraw;
  if (!excalidraw || !Array.isArray(excalidraw.elements)) {
    throw new Error("Response missing valid 'excalidraw.elements' array");
  }
  if (excalidraw.elements.length < 2) {
    throw new Error("Updated Excalidraw scene must have at least 2 elements");
  }

  return {
    summary: parsed.summary,
    excalidraw: {
      elements: excalidraw.elements,
      appState: excalidraw.appState || {},
      files: excalidraw.files || {},
    },
  };
}

/**
 * Extracts all use cases/processes discussed in a transcript.
 * Returns a list of use cases with their details for the user to select from.
 */
export async function extractUseCasesFromTranscript(
  transcript: string,
  apiKey: string,
  modelConfig: GrokModelConfig
): Promise<ExtractUseCasesResult> {
  const xai = createXai({ apiKey });

  // Truncate very long transcripts to ~12K chars (~3K tokens)
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

  // Build options — only include reasoningEffort when specified (multi-agent models)
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

  console.log(`\x1b[32m[Grok API] extractUseCasesFromTranscript using model: ${modelConfig.apiModelId}\x1b[0m`);
  const { text: content } = await generateText(generateOptions);

  if (!content) {
    throw new Error("No content in xAI API response");
  }

  // Strip markdown fences if present
  let jsonStr = content.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  const parsed = JSON.parse(jsonStr);

  // Validate the response
  if (!parsed.useCases || !Array.isArray(parsed.useCases) || parsed.useCases.length === 0) {
    throw new Error("Response missing valid 'useCases' array");
  }

  if (!parsed.transcriptSummary || typeof parsed.transcriptSummary !== "string") {
    throw new Error("Response missing 'transcriptSummary'");
  }

  // Validate each use case
  for (const uc of parsed.useCases) {
    if (!uc.id || !uc.title || !uc.description) {
      throw new Error("Each use case must have id, title, and description");
    }
    if (!Array.isArray(uc.details)) {
      uc.details = [];
    }
  }

  return {
    useCases: parsed.useCases,
    transcriptSummary: parsed.transcriptSummary,
  };
}

/**
 * Generates a process map for a specific use case extracted from a transcript.
 * This provides more focused results by telling Grok exactly which process to map.
 */
export async function parseTranscriptForUseCase(
  transcript: string,
  useCase: UseCase,
  apiKey: string,
  modelConfig: GrokModelConfig
): Promise<GrokExcalidrawResult> {
  const xai = createXai({ apiKey });

  // Truncate very long transcripts to ~12K chars (~3K tokens)
  const maxChars = 12000;
  const truncated =
    transcript.length > maxChars
      ? transcript.slice(0, maxChars) + "\n\n[Transcript truncated for processing]"
      : transcript;

  const useCaseContext = `
USE CASE TO MAP:
Title: ${useCase.title}
Description: ${useCase.description}
${useCase.details.length > 0 ? `Key Details:\n${useCase.details.map(d => `- ${d}`).join('\n')}` : ''}
${useCase.participants && useCase.participants.length > 0 ? `Participants: ${useCase.participants.join(', ')}` : ''}
${useCase.systems && useCase.systems.length > 0 ? `Systems: ${useCase.systems.join(', ')}` : ''}
`;

  const userMessage = `Analyze this Gong sales-call transcript and generate a process map for THIS SPECIFIC USE CASE:

${useCaseContext}

Focus ONLY on mapping this specific process/use case. Extract the workflow steps, decision points, approvals, and handoffs related to this use case.

Rules:
- Map the prospect's CURRENT workflow (not the sales pitch or proposed solution)
- Focus specifically on the use case described above
- Include 8-20 steps for readability with concise labels
- Capture sequential steps, decision points, approvals, and handoffs

After you generate the Excalidraw JSON, wrap your entire response in this structure (return ONLY this JSON, nothing else):
{
  "title": "${useCase.title}",
  "summary": "1-2 sentence summary of this specific process",
  "excalidraw": <your full Excalidraw JSON object here>
}

Here is the transcript:

${truncated}`;

  // Build options — only include reasoningEffort when specified (multi-agent models)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const generateOptions: any = {
    model: xai.responses(modelConfig.apiModelId),
    messages: [
      { role: "system", content: EXCALIDRAW_PROCESS_MAP_PROMPT },
      { role: "user", content: userMessage },
    ],
    temperature: 0.3,
    maxOutputTokens: 16384,
  };

  if (modelConfig.reasoningEffort) {
    generateOptions.providerOptions = {
      xai: { reasoningEffort: modelConfig.reasoningEffort },
    };
  }

  console.log(`\x1b[32m[Grok API] parseTranscriptForUseCase using model: ${modelConfig.apiModelId}\x1b[0m`);
  const { text: content } = await generateText(generateOptions);

  if (!content) {
    throw new Error("No content in xAI API response");
  }

  // Strip markdown fences if present
  let jsonStr = content.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  const parsed = JSON.parse(jsonStr);

  // ---- Validate the wrapper ----
  if (!parsed.title || typeof parsed.title !== "string") {
    throw new Error("Response missing 'title'");
  }
  if (!parsed.summary || typeof parsed.summary !== "string") {
    throw new Error("Response missing 'summary'");
  }

  // ---- Validate the Excalidraw payload ----
  const excalidraw = parsed.excalidraw;
  if (!excalidraw || !Array.isArray(excalidraw.elements)) {
    throw new Error("Response missing valid 'excalidraw.elements' array");
  }
  if (excalidraw.elements.length < 2) {
    throw new Error("Excalidraw scene must have at least 2 elements");
  }

  return {
    title: parsed.title,
    summary: parsed.summary,
    excalidraw: {
      elements: excalidraw.elements,
      appState: excalidraw.appState || {},
      files: excalidraw.files || {},
    },
  };
}