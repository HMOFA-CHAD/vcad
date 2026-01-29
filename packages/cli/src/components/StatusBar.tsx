import React from "react";
import { Box, Text } from "ink";
import { useEngineStore, useDocumentStore, useUiStore } from "@vcad/core";

export function StatusBar() {
  const engineReady = useEngineStore((s) => s.engineReady);
  const loading = useEngineStore((s) => s.loading);
  const error = useEngineStore((s) => s.error);
  const scene = useEngineStore((s) => s.scene);
  const parts = useDocumentStore((s) => s.parts);
  const selectedPartIds = useUiStore((s) => s.selectedPartIds);
  const transformMode = useUiStore((s) => s.transformMode);

  // Calculate total triangles
  let totalTriangles = 0;
  let totalVertices = 0;
  if (scene) {
    for (const part of scene.parts) {
      totalTriangles += part.mesh.indices.length / 3;
      totalVertices += part.mesh.positions.length / 3;
    }
  }

  return (
    <Box justifyContent="space-between" paddingX={1}>
      <Box>
        {error ? (
          <Text color="red">Error: {error}</Text>
        ) : loading ? (
          <Text color="yellow">Loading...</Text>
        ) : engineReady ? (
          <Text color="green">Ready</Text>
        ) : (
          <Text color="yellow">Initializing...</Text>
        )}
      </Box>
      <Box gap={2}>
        <Text dimColor>Parts: {parts.length}</Text>
        <Text dimColor>Selected: {selectedPartIds.size}</Text>
        <Text dimColor>Tris: {totalTriangles.toLocaleString()}</Text>
        <Text dimColor>Mode: {transformMode}</Text>
      </Box>
    </Box>
  );
}
