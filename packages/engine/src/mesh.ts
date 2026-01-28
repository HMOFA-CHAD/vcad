/** Triangle mesh output — positions and indices ready for rendering. */
export interface TriangleMesh {
  positions: Float32Array;
  indices: Uint32Array;
}

/** A single evaluated part with its mesh and material key. */
export interface EvaluatedPart {
  mesh: TriangleMesh;
  material: string;
}

/** Result of evaluating a full document — one part per scene root. */
export interface EvaluatedScene {
  parts: EvaluatedPart[];
}

/**
 * Extract xyz positions from manifold-3d interleaved vertex data.
 *
 * manifold-3d stores vertices as interleaved floats with `numProp` properties
 * per vertex (first 3 are always x, y, z). This unpacks to a dense xyz array.
 */
export function extractPositions(
  numProp: number,
  vertProperties: Float32Array,
): Float32Array {
  const vertexCount = vertProperties.length / numProp;
  const positions = new Float32Array(vertexCount * 3);
  for (let i = 0; i < vertexCount; i++) {
    positions[i * 3] = vertProperties[i * numProp];
    positions[i * 3 + 1] = vertProperties[i * numProp + 1];
    positions[i * 3 + 2] = vertProperties[i * numProp + 2];
  }
  return positions;
}
