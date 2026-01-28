import type { Document } from "@vcad/ir";
import { evaluateDocument } from "./evaluate.js";
import type { EvaluatedScene } from "./mesh.js";

export type { TriangleMesh, EvaluatedPart, EvaluatedScene } from "./mesh.js";
export { extractPositions } from "./mesh.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ManifoldModule = any;

/** CSG evaluation engine backed by manifold-3d (WASM). */
export class Engine {
  private wasm: ManifoldModule;

  private constructor(wasm: ManifoldModule) {
    this.wasm = wasm;
  }

  /** Load the manifold-3d WASM module and return a ready engine. */
  static async init(): Promise<Engine> {
    const Module = (await import("manifold-3d")).default;
    const wasm = await Module();
    wasm.setup();
    return new Engine(wasm);
  }

  /** Evaluate an IR document into triangle meshes. */
  evaluate(doc: Document): EvaluatedScene {
    return evaluateDocument(doc, this.wasm);
  }
}
