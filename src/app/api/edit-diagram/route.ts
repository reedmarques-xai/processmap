import { NextRequest, NextResponse } from "next/server";
import { editDiagramWithGrok } from "@/lib/grok";
import { getModelConfig, GrokModelId, DEFAULT_MODEL_ID } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const { currentExcalidraw, instruction, modelId } = await req.json();

    if (!currentExcalidraw || !Array.isArray(currentExcalidraw.elements)) {
      return NextResponse.json(
        { success: false, error: "Valid currentExcalidraw with elements array is required" },
        { status: 400 }
      );
    }

    if (!instruction || typeof instruction !== "string" || instruction.trim().length < 3) {
      return NextResponse.json(
        { success: false, error: "Edit instruction is required (at least 3 characters)" },
        { status: 400 }
      );
    }

    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey || apiKey === "your-xai-api-key-here") {
      return NextResponse.json(
        { success: false, error: "xAI API key is not configured." },
        { status: 500 }
      );
    }

    const selectedModelId: GrokModelId = modelId || DEFAULT_MODEL_ID;
    const modelConfig = getModelConfig(selectedModelId);

    const data = await editDiagramWithGrok(currentExcalidraw, instruction.trim(), apiKey, modelConfig);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Edit diagram error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to edit diagram";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}