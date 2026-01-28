import type { Document, Node, NodeId, CsgOp } from "@vcad/ir";
import type { EvaluatedScene } from "./mesh.js";
import { extractPositions } from "./mesh.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ManifoldModule = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ManifoldObj = any;

/**
 * Evaluate a vcad IR Document into an EvaluatedScene using manifold-3d.
 *
 * Walks the DAG for each scene root, memoizes intermediate Manifold objects
 * by NodeId, then extracts triangle meshes. All manifold objects are deleted
 * in a finally block to avoid WASM memory leaks.
 */
export function evaluateDocument(
  doc: Document,
  wasm: ManifoldModule,
): EvaluatedScene {
  const { Manifold } = wasm;
  const cache = new Map<NodeId, ManifoldObj>();

  try {
    const parts = doc.roots.map((entry) => {
      const manifold = evaluateNode(entry.root, doc.nodes, Manifold, cache);
      const mesh = manifold.getMesh();
      const positions = extractPositions(mesh.numProp, mesh.vertProperties);
      return {
        mesh: { positions, indices: new Uint32Array(mesh.triVerts) },
        material: entry.material,
      };
    });
    return { parts };
  } finally {
    for (const obj of cache.values()) {
      obj.delete();
    }
  }
}

function evaluateNode(
  nodeId: NodeId,
  nodes: Record<string, Node>,
  Manifold: ManifoldObj,
  cache: Map<NodeId, ManifoldObj>,
): ManifoldObj {
  const cached = cache.get(nodeId);
  if (cached) return cached;

  const node = nodes[String(nodeId)];
  if (!node) {
    throw new Error(`Missing node: ${nodeId}`);
  }

  const result = evaluateOp(node.op, nodes, Manifold, cache);
  cache.set(nodeId, result);
  return result;
}

function evaluateOp(
  op: CsgOp,
  nodes: Record<string, Node>,
  Manifold: ManifoldObj,
  cache: Map<NodeId, ManifoldObj>,
): ManifoldObj {
  switch (op.type) {
    case "Cube":
      return Manifold.cube([op.size.x, op.size.y, op.size.z]);

    case "Cylinder":
      return Manifold.cylinder(
        op.height,
        op.radius,
        op.radius,
        op.segments || undefined,
      );

    case "Sphere":
      return Manifold.sphere(op.radius, op.segments || undefined);

    case "Cone":
      return Manifold.cylinder(
        op.height,
        op.radius_bottom,
        op.radius_top,
        op.segments || undefined,
      );

    case "Empty":
      return Manifold.compose([]);

    case "Union": {
      const left = evaluateNode(op.left, nodes, Manifold, cache);
      const right = evaluateNode(op.right, nodes, Manifold, cache);
      return left.add(right);
    }

    case "Difference": {
      const left = evaluateNode(op.left, nodes, Manifold, cache);
      const right = evaluateNode(op.right, nodes, Manifold, cache);
      return left.subtract(right);
    }

    case "Intersection": {
      const left = evaluateNode(op.left, nodes, Manifold, cache);
      const right = evaluateNode(op.right, nodes, Manifold, cache);
      return left.intersect(right);
    }

    case "Translate": {
      const child = evaluateNode(op.child, nodes, Manifold, cache);
      return child.translate([op.offset.x, op.offset.y, op.offset.z]);
    }

    case "Rotate": {
      const child = evaluateNode(op.child, nodes, Manifold, cache);
      return child.rotate([op.angles.x, op.angles.y, op.angles.z]);
    }

    case "Scale": {
      const child = evaluateNode(op.child, nodes, Manifold, cache);
      return child.scale([op.factor.x, op.factor.y, op.factor.z]);
    }
  }
}
