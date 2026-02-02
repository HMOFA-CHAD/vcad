/**
 * Server-based inference for text-to-CAD generation.
 *
 * Routes requests through /api/generate with JWT authentication.
 */

/** API base URL from environment. */
const API_BASE = import.meta.env.VITE_API_URL || "";

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
 * @param options - Generation options (authToken required)
 * @returns The generated Compact IR
 */
export async function generateCADServer(
  prompt: string,
  options: {
    /** Auth token for API authentication (required) */
    authToken: string;
  }
): Promise<ServerInferResult> {
  const response = await fetch(`${API_BASE}/api/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${options.authToken}`,
    },
    body: JSON.stringify({ prompt }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(data.error || `Server inference failed: ${response.status}`);
  }

  const result = await response.json();

  if (result.error) {
    throw new Error(result.error);
  }

  return {
    ir: result.ir ?? "",
    tokens: result.tokens ?? 0,
    durationMs: result.durationMs ?? 0,
  };
}
