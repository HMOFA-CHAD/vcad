import type { PartInfo } from "@vcad/core";
import { isPrimitivePart, isBooleanPart, isFilletPart, isChamferPart, isShellPart, isExtrudePart, isRevolvePart, isSweepPart, isLoftPart, isImportedMeshPart, isLinearPatternPart, isCircularPatternPart, isMirrorPart } from "@vcad/core";
import type { Document } from "@vcad/ir";

/**
 * Get a compact dimension summary string for a part.
 * Returns: "20x30x10" for cube, "R=10, H=25" for cylinder, etc.
 */
export function getPartSummary(part: PartInfo, document: Document): string {
  if (isPrimitivePart(part)) {
    const node = document.nodes[String(part.primitiveNodeId)];
    if (!node) return "";

    const op = node.op;
    switch (op.type) {
      case "Cube":
        return `${fmt(op.size.x)}x${fmt(op.size.y)}x${fmt(op.size.z)}`;
      case "Cylinder":
        return `R=${fmt(op.radius)}, H=${fmt(op.height)}`;
      case "Sphere":
        return `R=${fmt(op.radius)}`;
      default:
        return "";
    }
  }

  if (isBooleanPart(part)) {
    return `(${part.booleanType})`;
  }

  if (isFilletPart(part)) {
    const node = document.nodes[String(part.filletNodeId)];
    if (node?.op.type === "Fillet") {
      return `R=${fmt(node.op.radius)}`;
    }
    return "(fillet)";
  }

  if (isChamferPart(part)) {
    const node = document.nodes[String(part.chamferNodeId)];
    if (node?.op.type === "Chamfer") {
      return `D=${fmt(node.op.distance)}`;
    }
    return "(chamfer)";
  }

  if (isShellPart(part)) {
    const node = document.nodes[String(part.shellNodeId)];
    if (node?.op.type === "Shell") {
      return `T=${fmt(node.op.thickness)}`;
    }
    return "(shell)";
  }

  if (isExtrudePart(part)) {
    const node = document.nodes[String(part.extrudeNodeId)];
    if (node?.op.type === "Extrude") {
      const dir = node.op.direction;
      const height = Math.sqrt(dir.x ** 2 + dir.y ** 2 + dir.z ** 2);
      return `H=${fmt(height)}`;
    }
    return "(extrude)";
  }

  if (isRevolvePart(part)) {
    const node = document.nodes[String(part.revolveNodeId)];
    if (node?.op.type === "Revolve") {
      return `${fmt(node.op.angle_deg)}deg`;
    }
    return "(revolve)";
  }

  if (isSweepPart(part)) {
    return "(sweep)";
  }

  if (isLoftPart(part)) {
    return "(loft)";
  }

  if (isImportedMeshPart(part)) {
    return "(mesh)";
  }

  if (isLinearPatternPart(part)) {
    const node = document.nodes[String(part.patternNodeId)];
    if (node?.op.type === "LinearPattern") {
      return `${node.op.count}x`;
    }
    return "(pattern)";
  }

  if (isCircularPatternPart(part)) {
    const node = document.nodes[String(part.patternNodeId)];
    if (node?.op.type === "CircularPattern") {
      return `${node.op.count}x`;
    }
    return "(pattern)";
  }

  if (isMirrorPart(part)) {
    return "(mirror)";
  }

  return "";
}

/** Format a number compactly (remove trailing zeros) */
function fmt(n: number): string {
  // Round to 2 decimal places and remove trailing zeros
  return parseFloat(n.toFixed(2)).toString();
}
