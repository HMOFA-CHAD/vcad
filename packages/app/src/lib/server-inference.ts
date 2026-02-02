/**
 * Server-based inference for text-to-CAD generation.
 *
 * Calls the cad0 model deployed on Modal.
 * No authentication required.
 */

/** Server inference endpoint (Modal deployment). */
const INFERENCE_ENDPOINT = "https://ecto--cad0-training-inference-infer.modal.run";

/** Inference result. */
export interface ServerInferResult {
  ir: string;
  tokens: number;
  durationMs: number;
}

/**
 * Generate Compact IR from a text prompt using server inference.
 *
 * @param prompt - Text description of the desired CAD part
 * @param options - Generation options
 * @returns The generated Compact IR
 */
export async function generateCADServer(
  prompt: string,
  options: {
    temperature?: number;
    maxTokens?: number;
  } = {},
): Promise<ServerInferResult> {
  const startTime = performance.now();

  const response = await fetch(INFERENCE_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      temperature: options.temperature ?? 0.1,
      max_tokens: options.maxTokens ?? 128,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Server inference failed: ${response.status} ${text}`);
  }

  const result = await response.json();

  if (result.error) {
    throw new Error(result.error);
  }

  const durationMs = performance.now() - startTime;

  // Clean up the generated IR
  let ir = result.ir ?? "";
  ir = cleanGeneratedIR(ir);

  return {
    ir,
    tokens: result.tokens ?? 0,
    durationMs,
  };
}

/**
 * Clean up generated IR text by removing markdown and extra content.
 */
function cleanGeneratedIR(text: string): string {
  let ir = text.trim();

  // Remove markdown code blocks
  if (ir.startsWith("```")) {
    ir = ir.replace(/^```(?:ir|text|plaintext)?\n?/, "").replace(/\n?```$/, "");
  }

  // Stop at common hallucination patterns
  const stopPatterns = ["\n\n", "User", "Now:", "Assistant", "Design:"];
  for (const pattern of stopPatterns) {
    const idx = ir.indexOf(pattern);
    if (idx > 0) {
      ir = ir.substring(0, idx);
    }
  }

  // Find valid IR lines only
  const lines = ir.split("\n");
  const validOpcodes = [
    "C", "Y", "S", "K", "T", "R", "X", "U", "D", "I",
    "LP", "CP", "SH", "FI", "CH", "SK", "L", "A", "E", "V",
    "M", "ROOT", "PDEF", "INST", "END",
  ];

  // Minimum args required for each opcode
  const minArgs: Record<string, number> = {
    C: 3, Y: 2, S: 1, K: 3, T: 4, R: 4, X: 4,
    U: 2, D: 2, I: 2, SH: 2, FI: 2, CH: 2,
    LP: 4, CP: 4, SK: 1, L: 4, A: 7, E: 2, V: 2,
    M: 4, ROOT: 1, PDEF: 1, INST: 2, END: 0,
  };

  const validLines: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue; // Skip empty lines and comments
    }
    const parts = trimmed.split(/\s+/);
    const opcode = parts[0] ?? "";
    if (!validOpcodes.includes(opcode)) {
      // Stop at first invalid opcode
      break;
    }
    // Check if line has enough arguments
    const required = minArgs[opcode] ?? 0;
    if (parts.length < required + 1) {
      // Incomplete line - skip it (likely truncated)
      break;
    }
    validLines.push(line);
  }

  return validLines.join("\n").trim();
}

/**
 * Check if the server inference endpoint is reachable.
 */
export async function checkServerHealth(): Promise<boolean> {
  try {
    // Simple health check - just try to reach the endpoint
    // The actual inference will fail with empty prompt, but we just check connectivity
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(INFERENCE_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "" }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    // 400 is expected for empty prompt, 200 means endpoint is up
    return response.status === 400 || response.status === 200;
  } catch {
    return false;
  }
}
