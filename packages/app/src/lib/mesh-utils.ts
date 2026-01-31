import type { TriangleMesh } from "@vcad/core";

/**
 * Merge multiple meshes into a single mesh.
 * Combines vertex buffers and adjusts indices.
 */
export function mergeMeshes(meshes: TriangleMesh[]): TriangleMesh {
  if (meshes.length === 0) {
    return { positions: new Float32Array(0), indices: new Uint32Array(0) };
  }

  if (meshes.length === 1) {
    return meshes[0]!;
  }

  let totalPositions = 0;
  let totalIndices = 0;

  for (const m of meshes) {
    totalPositions += m.positions.length;
    totalIndices += m.indices.length;
  }

  const positions = new Float32Array(totalPositions);
  const indices = new Uint32Array(totalIndices);

  let posOffset = 0;
  let idxOffset = 0;
  let vertexOffset = 0;

  for (const m of meshes) {
    positions.set(m.positions, posOffset);

    for (let i = 0; i < m.indices.length; i++) {
      indices[idxOffset + i] = m.indices[i]! + vertexOffset;
    }

    posOffset += m.positions.length;
    idxOffset += m.indices.length;
    vertexOffset += m.positions.length / 3;
  }

  return { positions, indices };
}
