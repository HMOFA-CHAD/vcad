import type { EvaluatedScene } from "@vcad/engine";

/**
 * Export an evaluated scene as a STEP file ArrayBuffer.
 * Uses the first part with B-rep data available.
 *
 * @throws Error if no parts have B-rep data for STEP export
 */
export function exportStepBuffer(scene: EvaluatedScene): Uint8Array {
  for (const part of scene.parts) {
    if (part.solid?.canExportStep?.()) {
      try {
        return part.solid.toStepBuffer();
      } catch {
        continue;
      }
    }
  }
  throw new Error("No parts with B-rep data available for STEP export");
}

/**
 * Export an evaluated scene as a STEP file Blob (browser only).
 */
export function exportStepBlob(scene: EvaluatedScene): Blob {
  const buffer = exportStepBuffer(scene);
  return new Blob([buffer.buffer as ArrayBuffer], { type: "application/step" });
}
