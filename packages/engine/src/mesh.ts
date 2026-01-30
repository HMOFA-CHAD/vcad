/** Triangle mesh output — positions, indices, and optional normals for rendering. */
export interface TriangleMesh {
  positions: Float32Array;
  indices: Uint32Array;
  /** Optional vertex normals for smooth shading. If undefined, renderer computes them. */
  normals?: Float32Array;
}

/** A single evaluated part with its mesh and material key. */
export interface EvaluatedPart {
  mesh: TriangleMesh;
  material: string;
}

/** Result of evaluating a full document — one part per scene root. */
export interface EvaluatedScene {
  parts: EvaluatedPart[];
  /** Meshes representing intersections between overlapping parts (for clash visualization). */
  clashes: TriangleMesh[];
}
