import { NextRequest, NextResponse } from "next/server";
import { parseTranscriptForUseCase } from "@/lib/grok";
import { getModelConfig, GrokModelId, DEFAULT_MODEL_ID, UseCase } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const { transcript, useCase, modelId } = await req.json();

    if (!transcript || typeof transcript !== "string") {
      return NextResponse.json(
        { success: false, error: "Transcript text is required" },
        { status: 400 }
      );
    }

    if (!useCase || !useCase.id || !useCase.title) {
      return NextResponse.json(
        { success: false, error: "Use case selection is required" },
        { status: 400 }
      );
    }

    if (transcript.trim().length < 50) {
      return NextResponse.json(
        { success: false, error: "Transcript is too short. Please provide more content." },
        { status: 400 }
      );
    }

    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey || apiKey === "your-xai-api-key-here") {
      return NextResponse.json(
        { success: false, error: "xAI API key is not configured. Set XAI_API_KEY in your environment." },
        { status: 500 }
      );
    }

    const selectedModelId: GrokModelId = modelId || DEFAULT_MODEL_ID;
    const modelConfig = getModelConfig(selectedModelId);

    const data = await parseTranscriptForUseCase(
      transcript,
      useCase as UseCase,
      apiKey,
      modelConfig
    );

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Generate process map error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to generate process map";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}