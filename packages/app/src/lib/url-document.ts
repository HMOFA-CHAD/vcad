/**
 * Load documents from URL parameters.
 *
 * URL format: https://vcad.io/#/new?doc=<compressed>&name=<name>
 *
 * The `doc` parameter contains gzip-compressed, base64url-encoded compact IR.
 */

import { parseVcadFile, type VcadFile } from "@vcad/core";

/**
 * Base64url decode (URL-safe base64 without padding).
 */
function base64urlDecode(str: string): Uint8Array {
  // Restore standard base64
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  // Add padding
  while (base64.length % 4) {
    base64 += "=";
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Decompress gzip data using DecompressionStream (native browser API).
 */
async function decompressGzip(data: Uint8Array): Promise<string> {
  // Use Response + DecompressionStream for cleaner API
  // Cast to BlobPart to satisfy TypeScript's strict buffer type checking
  const blob = new Blob([data as unknown as BlobPart]);
  const ds = new DecompressionStream("gzip");
  const decompressedStream = blob.stream().pipeThrough(ds);
  const decompressedBlob = await new Response(decompressedStream).blob();
  return decompressedBlob.text();
}

export interface UrlDocumentParams {
  doc: string;
  name?: string;
}

/**
 * Parse URL hash parameters.
 * Expects format: #/new?doc=<compressed>&name=<name>
 */
export function parseUrlParams(): UrlDocumentParams | null {
  const hash = window.location.hash;
  if (!hash.startsWith("#/new?")) {
    return null;
  }

  const queryString = hash.slice(6); // Remove "#/new?"
  const params = new URLSearchParams(queryString);

  const doc = params.get("doc");
  if (!doc) {
    return null;
  }

  return {
    doc,
    name: params.get("name") ?? undefined,
  };
}

/**
 * Load a document from URL parameters.
 * Returns null if no URL document is present or loading fails.
 */
export async function loadDocumentFromUrl(): Promise<{
  file: VcadFile;
  name: string;
} | null> {
  const params = parseUrlParams();
  if (!params) {
    return null;
  }

  try {
    // Decode and decompress
    const compressed = base64urlDecode(params.doc);
    const compact = await decompressGzip(compressed);

    // Parse compact IR into VcadFile
    const file = parseVcadFile(compact);

    // Clear the URL to prevent re-loading on refresh
    window.history.replaceState(null, "", window.location.pathname);

    return {
      file,
      name: params.name ?? "Shared Document",
    };
  } catch (err) {
    console.error("Failed to load document from URL:", err);
    return null;
  }
}

/**
 * Check if the current URL has document parameters.
 */
export function hasUrlDocument(): boolean {
  return parseUrlParams() !== null;
}
