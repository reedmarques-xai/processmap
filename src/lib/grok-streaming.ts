import { createXai } from "@ai-sdk/xai";
import { streamText } from "ai";

const XAI_API_KEY = process.env.XAI_API_KEY || "";

const xai = createXai({
  apiKey: XAI_API_KEY,
});

/**
 * Send a prompt and stream the response with reasoning trace.
 */
export async function getReasoningResponseStreaming(prompt: string) {
  const result = streamText({
    model: xai.responses("grok-4.20-multi-agent-0309"),
    prompt,
    providerOptions: {
      xai: { reasoningEffort: "high" },
    },
  });

  return result;
}

// Main function to test streaming
async function main(): Promise<void> {
  const testPrompt = "Find the expected distance in miles between two randomly chosen Starbucks in the USA.";
  console.log(`Prompt: ${testPrompt}\n`);

  const result = await getReasoningResponseStreaming(testPrompt);

  // Stream all parts - reasoning and text
  console.log("=== STREAMING OUTPUT ===\n");
  
  let inReasoning = false;
  let inText = false;
  
  for await (const part of result.fullStream) {
    // Handle reasoning chunks (thinking trace)
    if (part.type === "reasoning-delta") {
      if (!inReasoning) {
        console.log("\n[REASONING]");
        inReasoning = true;
        inText = false;
      }
      process.stdout.write((part as any).text ?? "");
    }
    
    // Handle text chunks (final response)
    if (part.type === "text-delta") {
      if (!inText) {
        console.log("\n\n[RESPONSE]");
        inText = true;
        inReasoning = false;
      }
      process.stdout.write((part as any).text ?? "");
    }
  }
  
  console.log("\n\n=== DONE ===");
}

// Run if executed directly
main().catch(console.error);