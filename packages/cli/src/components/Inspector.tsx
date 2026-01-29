import React from "react";
import { Box, Text } from "ink";
import { useDocumentStore, useEngineStore, isPrimitivePart, isBooleanPart } from "@vcad/core";
import type { PartInfo } from "@vcad/core";

interface Props {
  selectedIds: Set<string>;
}

function formatVec3(v: { x: number; y: number; z: number }): string {
  return `(${v.x.toFixed(1)}, ${v.y.toFixed(1)}, ${v.z.toFixed(1)})`;
}

export function Inspector({ selectedIds }: Props) {
  const parts = useDocumentStore((s) => s.parts);
  const document = useDocumentStore((s) => s.document);
  const scene = useEngineStore((s) => s.scene);

  if (selectedIds.size === 0) {
    return (
      <Box flexDirection="column" paddingX={1}>
        <Text dimColor>No selection</Text>
        <Text dimColor>Use j/k to navigate, Enter to select</Text>
      </Box>
    );
  }

  if (selectedIds.size > 1) {
    return (
      <Box flexDirection="column" paddingX={1}>
        <Text bold>{selectedIds.size} parts selected</Text>
      </Box>
    );
  }

  const partId = Array.from(selectedIds)[0]!;
  const part = parts.find((p) => p.id === partId);
  if (!part) return null;

  // Get transform nodes
  const translateNode = document.nodes[String(part.translateNodeId)];
  const rotateNode = document.nodes[String(part.rotateNodeId)];
  const scaleNode = document.nodes[String(part.scaleNodeId)];

  const position = translateNode?.op.type === "Translate" ? translateNode.op.offset : { x: 0, y: 0, z: 0 };
  const rotation = rotateNode?.op.type === "Rotate" ? rotateNode.op.angles : { x: 0, y: 0, z: 0 };
  const scale = scaleNode?.op.type === "Scale" ? scaleNode.op.factor : { x: 1, y: 1, z: 1 };

  // Get mesh stats
  const evalPart = scene?.parts.find((p) => p.name === part.name);
  const triangles = evalPart ? evalPart.mesh.indices.length / 3 : 0;
  const vertices = evalPart ? evalPart.mesh.positions.length / 3 : 0;

  return (
    <Box flexDirection="column" paddingX={1}>
      <Text bold color="cyan">{part.name}</Text>
      <Text dimColor>Kind: {part.kind}</Text>

      {isPrimitivePart(part) && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold>Primitive</Text>
          {part.kind === "cube" && (
            <PrimitiveDimensions partInfo={part} document={document} />
          )}
          {part.kind === "cylinder" && (
            <PrimitiveDimensions partInfo={part} document={document} />
          )}
          {part.kind === "sphere" && (
            <PrimitiveDimensions partInfo={part} document={document} />
          )}
        </Box>
      )}

      {isBooleanPart(part) && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold>Boolean: {part.booleanType}</Text>
        </Box>
      )}

      <Box flexDirection="column" marginTop={1}>
        <Text bold>Transform</Text>
        <Text>Position: {formatVec3(position)}</Text>
        <Text>Rotation: {formatVec3(rotation)}</Text>
        <Text>Scale: {formatVec3(scale)}</Text>
      </Box>

      <Box flexDirection="column" marginTop={1}>
        <Text bold>Mesh</Text>
        <Text>Triangles: {triangles.toLocaleString()}</Text>
        <Text>Vertices: {vertices.toLocaleString()}</Text>
      </Box>
    </Box>
  );
}

function PrimitiveDimensions({ partInfo, document }: { partInfo: PartInfo; document: any }) {
  if (!isPrimitivePart(partInfo)) return null;

  const node = document.nodes[String(partInfo.primitiveNodeId)];
  if (!node) return null;

  const op = node.op;

  if (op.type === "Cube") {
    return (
      <>
        <Text>Width: {op.size.x}</Text>
        <Text>Height: {op.size.y}</Text>
        <Text>Depth: {op.size.z}</Text>
      </>
    );
  }

  if (op.type === "Cylinder") {
    return (
      <>
        <Text>Radius: {op.radius}</Text>
        <Text>Height: {op.height}</Text>
      </>
    );
  }

  if (op.type === "Sphere") {
    return (
      <Text>Radius: {op.radius}</Text>
    );
  }

  return null;
}
