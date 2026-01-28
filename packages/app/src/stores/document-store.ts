import { create } from "zustand";
import type {
  Document,
  NodeId,
  CsgOp,
  Node,
  Vec3,
} from "@vcad/ir";
import { createDocument } from "@vcad/ir";
import type { PartInfo, PrimitiveKind } from "@/types";

const MAX_UNDO = 50;

interface Snapshot {
  document: string; // JSON-serialized Document
  parts: PartInfo[];
}

interface DocumentState {
  document: Document;
  parts: PartInfo[];
  nextNodeId: number;
  nextPartNum: number;

  // undo/redo
  undoStack: Snapshot[];
  redoStack: Snapshot[];

  // mutations
  addPrimitive: (kind: PrimitiveKind) => string;
  removePart: (partId: string) => void;
  setTranslation: (partId: string, offset: Vec3, skipUndo?: boolean) => void;
  setRotation: (partId: string, angles: Vec3, skipUndo?: boolean) => void;
  setScale: (partId: string, factor: Vec3, skipUndo?: boolean) => void;
  updatePrimitiveOp: (partId: string, op: CsgOp, skipUndo?: boolean) => void;
  renamePart: (partId: string, name: string) => void;
  pushUndoSnapshot: () => void;
  undo: () => void;
  redo: () => void;
}

function makeNode(id: NodeId, name: string | null, op: CsgOp): Node {
  return { id, name, op };
}

function snapshot(state: DocumentState): Snapshot {
  return {
    document: JSON.stringify(state.document),
    parts: state.parts.map((p) => ({ ...p })),
  };
}

function pushUndo(state: DocumentState): Pick<DocumentState, "undoStack" | "redoStack"> {
  const snap = snapshot(state);
  const stack = [...state.undoStack, snap];
  if (stack.length > MAX_UNDO) stack.shift();
  return { undoStack: stack, redoStack: [] };
}

const DEFAULT_SIZES: Record<PrimitiveKind, CsgOp> = {
  cube: { type: "Cube", size: { x: 20, y: 20, z: 20 } },
  cylinder: { type: "Cylinder", radius: 10, height: 20, segments: 64 },
  sphere: { type: "Sphere", radius: 10, segments: 64 },
};

const KIND_LABELS: Record<PrimitiveKind, string> = {
  cube: "Box",
  cylinder: "Cylinder",
  sphere: "Sphere",
};

export const useDocumentStore = create<DocumentState>((set, get) => ({
  document: createDocument(),
  parts: [],
  nextNodeId: 1,
  nextPartNum: 1,
  undoStack: [],
  redoStack: [],

  pushUndoSnapshot: () => {
    set((s) => pushUndo(s));
  },

  addPrimitive: (kind) => {
    const state = get();
    let nid = state.nextNodeId;
    const partNum = state.nextPartNum;

    const primitiveId = nid++;
    const scaleId = nid++;
    const rotateId = nid++;
    const translateId = nid++;

    const primOp = DEFAULT_SIZES[kind];
    const scaleOp: CsgOp = {
      type: "Scale",
      child: primitiveId,
      factor: { x: 1, y: 1, z: 1 },
    };
    const rotateOp: CsgOp = {
      type: "Rotate",
      child: scaleId,
      angles: { x: 0, y: 0, z: 0 },
    };
    const translateOp: CsgOp = {
      type: "Translate",
      child: rotateId,
      offset: { x: 0, y: 0, z: 0 },
    };

    const partId = `part-${partNum}`;
    const name = `${KIND_LABELS[kind]} ${partNum}`;

    const newDoc = structuredClone(state.document);
    newDoc.nodes[String(primitiveId)] = makeNode(primitiveId, null, primOp);
    newDoc.nodes[String(scaleId)] = makeNode(scaleId, null, scaleOp);
    newDoc.nodes[String(rotateId)] = makeNode(rotateId, null, rotateOp);
    newDoc.nodes[String(translateId)] = makeNode(translateId, name, translateOp);
    newDoc.roots.push({ root: translateId, material: "default" });

    if (!newDoc.materials["default"]) {
      newDoc.materials["default"] = {
        name: "Default",
        color: [0.7, 0.7, 0.75],
        metallic: 0.1,
        roughness: 0.6,
      };
    }

    const partInfo: PartInfo = {
      id: partId,
      name,
      kind,
      primitiveNodeId: primitiveId,
      scaleNodeId: scaleId,
      rotateNodeId: rotateId,
      translateNodeId: translateId,
    };

    const undoState = pushUndo(state);

    set({
      document: newDoc,
      parts: [...state.parts, partInfo],
      nextNodeId: nid,
      nextPartNum: partNum + 1,
      ...undoState,
    });

    return partId;
  },

  removePart: (partId) => {
    const state = get();
    const part = state.parts.find((p) => p.id === partId);
    if (!part) return;

    const undoState = pushUndo(state);
    const newDoc = structuredClone(state.document);

    // Remove nodes
    delete newDoc.nodes[String(part.primitiveNodeId)];
    delete newDoc.nodes[String(part.scaleNodeId)];
    delete newDoc.nodes[String(part.rotateNodeId)];
    delete newDoc.nodes[String(part.translateNodeId)];

    // Remove scene root
    newDoc.roots = newDoc.roots.filter(
      (r) => r.root !== part.translateNodeId,
    );

    set({
      document: newDoc,
      parts: state.parts.filter((p) => p.id !== partId),
      ...undoState,
    });
  },

  setTranslation: (partId, offset, skipUndo) => {
    const state = get();
    const part = state.parts.find((p) => p.id === partId);
    if (!part) return;

    const undoState = skipUndo ? {} : pushUndo(state);
    const newDoc = structuredClone(state.document);
    const node = newDoc.nodes[String(part.translateNodeId)];
    if (node && node.op.type === "Translate") {
      node.op.offset = offset;
    }

    set({ document: newDoc, ...undoState });
  },

  setRotation: (partId, angles, skipUndo) => {
    const state = get();
    const part = state.parts.find((p) => p.id === partId);
    if (!part) return;

    const undoState = skipUndo ? {} : pushUndo(state);
    const newDoc = structuredClone(state.document);
    const node = newDoc.nodes[String(part.rotateNodeId)];
    if (node && node.op.type === "Rotate") {
      node.op.angles = angles;
    }

    set({ document: newDoc, ...undoState });
  },

  setScale: (partId, factor, skipUndo) => {
    const state = get();
    const part = state.parts.find((p) => p.id === partId);
    if (!part) return;

    const undoState = skipUndo ? {} : pushUndo(state);
    const newDoc = structuredClone(state.document);
    const node = newDoc.nodes[String(part.scaleNodeId)];
    if (node && node.op.type === "Scale") {
      node.op.factor = factor;
    }

    set({ document: newDoc, ...undoState });
  },

  updatePrimitiveOp: (partId, op, skipUndo) => {
    const state = get();
    const part = state.parts.find((p) => p.id === partId);
    if (!part) return;

    const undoState = skipUndo ? {} : pushUndo(state);
    const newDoc = structuredClone(state.document);
    const node = newDoc.nodes[String(part.primitiveNodeId)];
    if (node) {
      node.op = op;
    }

    set({ document: newDoc, ...undoState });
  },

  renamePart: (partId, name) => {
    const state = get();
    const idx = state.parts.findIndex((p) => p.id === partId);
    if (idx === -1) return;

    const undoState = pushUndo(state);
    const newParts = state.parts.map((p) =>
      p.id === partId ? { ...p, name } : p,
    );
    const newDoc = structuredClone(state.document);
    const node = newDoc.nodes[String(state.parts[idx]!.translateNodeId)];
    if (node) node.name = name;

    set({ parts: newParts, document: newDoc, ...undoState });
  },

  undo: () => {
    const state = get();
    if (state.undoStack.length === 0) return;

    const currentSnap = snapshot(state);
    const prevSnap = state.undoStack[state.undoStack.length - 1]!;

    set({
      document: JSON.parse(prevSnap.document) as Document,
      parts: prevSnap.parts,
      undoStack: state.undoStack.slice(0, -1),
      redoStack: [...state.redoStack, currentSnap],
    });
  },

  redo: () => {
    const state = get();
    if (state.redoStack.length === 0) return;

    const currentSnap = snapshot(state);
    const nextSnap = state.redoStack[state.redoStack.length - 1]!;

    set({
      document: JSON.parse(nextSnap.document) as Document,
      parts: nextSnap.parts,
      undoStack: [...state.undoStack, currentSnap],
      redoStack: state.redoStack.slice(0, -1),
    });
  },
}));
