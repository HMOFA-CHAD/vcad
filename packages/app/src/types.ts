import type { NodeId } from "@vcad/ir";

export type PrimitiveKind = "cube" | "cylinder" | "sphere";

export interface PartInfo {
  id: string;
  name: string;
  kind: PrimitiveKind;
  primitiveNodeId: NodeId;
  scaleNodeId: NodeId;
  rotateNodeId: NodeId;
  translateNodeId: NodeId;
}

export type ToolMode = "select" | "primitive";
export type TransformMode = "translate" | "rotate" | "scale";
export type Theme = "dark" | "light";
