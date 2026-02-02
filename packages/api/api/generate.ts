import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

// Modal endpoint for cad0 model
const MODAL_ENDPOINT =
  process.env.MODAL_INFERENCE_URL ||
  "https://ecto--cad0-training-inference-infer.modal.run";

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
    "C",
    "Y",
    "S",
    "K",
    "T",
    "R",
    "X",
    "U",
    "D",
    "I",
    "LP",
    "CP",
    "SH",
    "FI",
    "CH",
    "SK",
    "L",
    "A",
    "E",
    "V",
    "M",
    "ROOT",
    "PDEF",
    "INST",
    "END",
  ];

  // Minimum args required for each opcode
  const minArgs: Record<string, number> = {
    C: 3,
    Y: 2,
    S: 1,
    K: 3,
    T: 4,
    R: 4,
    X: 4,
    U: 2,
    D: 2,
    I: 2,
    SH: 2,
    FI: 2,
    CH: 2,
    LP: 4,
    CP: 4,
    SK: 1,
    L: 4,
    A: 7,
    E: 2,
    V: 2,
    M: 4,
    ROOT: 1,
    PDEF: 1,
    INST: 2,
    END: 0,
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

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Authorization, Content-Type"
  );

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  // Verify auth via Supabase JWT
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = authHeader.slice(7);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);

  if (authError || !user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { prompt } = req.body;
  if (!prompt || typeof prompt !== "string") {
    res.status(400).json({ error: "Prompt required" });
    return;
  }

  if (prompt.length > 2000) {
    res.status(400).json({ error: "Prompt too long (max 2000 characters)" });
    return;
  }

  const startTime = Date.now();

  try {
    const response = await fetch(MODAL_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        temperature: 0.1,
        max_tokens: 512,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Modal inference failed: ${error}`);
    }

    const result = (await response.json()) as {
      ir?: string;
      tokens?: number;
      error?: string;
    };
    if (result.error) {
      throw new Error(result.error);
    }

    // Clean up the generated IR
    const ir = cleanGeneratedIR(result.ir ?? "");
    const durationMs = Date.now() - startTime;

    res.status(200).json({
      ir,
      tokens: result.tokens ?? 0,
      durationMs,
    });
  } catch (error) {
    console.error("AI inference failed:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "AI inference failed",
    });
  }
}
