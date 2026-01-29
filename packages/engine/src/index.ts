import type { Document, Vec3, SketchSegment2D } from "@vcad/ir";
import { evaluateDocument } from "./evaluate.js";
import type { EvaluatedScene, TriangleMesh } from "./mesh.js";
import type { Solid } from "@vcad/kernel-wasm";

export type {
  TriangleMesh,
  EvaluatedPart,
  EvaluatedPartDef,
  EvaluatedInstance,
  EvaluatedScene,
} from "./mesh.js";

export {
  solveForwardKinematics,
  applyForwardKinematics,
} from "./kinematics.js";

/** Re-export Solid class for direct use */
export type { Solid } from "@vcad/kernel-wasm";

/** Type for the initialized kernel module */
export interface KernelModule {
  Solid: typeof Solid;
}

/** CSG evaluation engine backed by vcad-kernel (WASM). */
export class Engine {
  private kernel: KernelModule;

  private constructor(kernel: KernelModule) {
    this.kernel = kernel;
  }

  /** Load the vcad-kernel WASM module and return a ready engine. */
  static async init(): Promise<Engine> {
    const wasmModule = await import("@vcad/kernel-wasm");

    // Check if we're in Node.js environment (for tests)
    const isNode =
      typeof process !== "undefined" &&
      process.versions != null &&
      process.versions.node != null;

    if (isNode) {
      // In Node.js, we need to read the WASM file and pass it as a buffer
      // Dynamic imports ensure these aren't bundled for browser
      const fs = await import("node:fs");
      const url = await import("node:url");
      const path = await import("node:path");

      // Get the path to the WASM file relative to the kernel-wasm package
      const kernelWasmPath = url.fileURLToPath(import.meta.url);
      const wasmPath = path.join(
        path.dirname(kernelWasmPath),
        "..",
        "..",
        "kernel-wasm",
        "vcad_kernel_wasm_bg.wasm",
      );
      const wasmBuffer = fs.readFileSync(wasmPath);
      wasmModule.initSync({ module: wasmBuffer });
    } else {
      // In browser, use the default async init
      await wasmModule.default();
    }

    return new Engine({ Solid: wasmModule.Solid });
  }

  /** Evaluate an IR document into triangle meshes. */
  evaluate(doc: Document): EvaluatedScene {
    return evaluateDocument(doc, this.kernel);
  }

  /** Get the Solid class for direct use */
  get Solid(): typeof Solid {
    return this.kernel.Solid;
  }

  /** Evaluate a preview extrusion without adding to document */
  evaluateExtrudePreview(
    origin: Vec3,
    xDir: Vec3,
    yDir: Vec3,
    segments: SketchSegment2D[],
    direction: Vec3,
  ): TriangleMesh | null {
    if (segments.length === 0) return null;

    try {
      const profile = {
        origin: [origin.x, origin.y, origin.z],
        x_dir: [xDir.x, xDir.y, xDir.z],
        y_dir: [yDir.x, yDir.y, yDir.z],
        segments: segments.map((seg) => {
          if (seg.type === "Line") {
            return {
              type: "Line" as const,
              start: [seg.start.x, seg.start.y],
              end: [seg.end.x, seg.end.y],
            };
          } else {
            return {
              type: "Arc" as const,
              start: [seg.start.x, seg.start.y],
              end: [seg.end.x, seg.end.y],
              center: [seg.center.x, seg.center.y],
              ccw: seg.ccw,
            };
          }
        }),
      };

      const dirArray = new Float64Array([direction.x, direction.y, direction.z]);
      const solid = this.kernel.Solid.extrude(profile, dirArray);
      const meshData = solid.getMesh();

      return {
        positions: new Float32Array(meshData.positions),
        indices: new Uint32Array(meshData.indices),
      };
    } catch {
      return null;
    }
  }
}
