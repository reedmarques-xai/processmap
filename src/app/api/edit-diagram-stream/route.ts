import { NextRequest } from "next/server";
import { editDiagramWithGrokStream } from "@/lib/grok";
import { getModelConfig, GrokModelId, DEFAULT_MODEL_ID } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { currentExcalidraw, instruction, modelId } = await req.json();

    if (!currentExcalidraw || !Array.isArray(currentExcalidraw.elements)) {
      return new Response(
        JSON.stringify({ success: false, error: "Valid currentExcalidraw with elements array is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!instruction || typeof instruction !== "string" || instruction.trim().length < 3) {
      return new Response(
        JSON.stringify({ success: false, error: "Edit instruction is required (at least 3 characters)" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey || apiKey === "your-xai-api-key-here") {
      return new Response(
        JSON.stringify({ success: false, error: "xAI API key is not configured." }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const selectedModelId: GrokModelId = modelId || DEFAULT_MODEL_ID;
    const modelConfig = getModelConfig(selectedModelId);

    // Create a streaming response using Server-Sent Events
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const generator = editDiagramWithGrokStream(
            currentExcalidraw,
            instruction.trim(),
            apiKey,
            modelConfig
          );

          for await (const event of generator) {
            if (event.type === "reasoning") {
              // Send reasoning chunk as SSE event
              const sseData = `data: ${JSON.stringify({ type: "reasoning", text: event.text })}\n\n`;
              controller.enqueue(encoder.encode(sseData));
            } else if (event.type === "result") {
              // Send final result
              const sseData = `data: ${JSON.stringify({ type: "result", data: event.data })}\n\n`;
              controller.enqueue(encoder.encode(sseData));
            }
          }

          // Send done event
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          console.error("Streaming error:", error);
          const errorMessage = error instanceof Error ? error.message : "Streaming failed";
          const sseData = `data: ${JSON.stringify({ type: "error", error: errorMessage })}\n\n`;
          controller.enqueue(encoder.encode(sseData));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Edit diagram stream error:", error);
    const message = error instanceof Error ? error.message : "Failed to start streaming";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
