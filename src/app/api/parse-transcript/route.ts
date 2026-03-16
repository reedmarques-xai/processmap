import { NextRequest, NextResponse } from "next/server";
import { parseTranscriptWithGrok } from "@/lib/grok";
import { getModelConfig, GrokModelId, DEFAULT_MODEL_ID } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const { transcript, modelId } = await req.json();

    if (!transcript || typeof transcript !== "string") {
      return NextResponse.json(
        { success: false, error: "Transcript text is required" },
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

    const data = await parseTranscriptWithGrok(transcript, apiKey, modelConfig);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Parse transcript error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to parse transcript";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}