import type {
  Document,
  Node,
  NodeId,
  CsgOp,
  Sketch2DOp,
  SketchSegment2D,
  SweepOp,
  LoftOp,
} from "@vcad/ir";
import type { EvaluatedScene, TriangleMesh } from "./mesh.js";
import type { Solid } from "@vcad/kernel-wasm";

/** Convert IR sketch segment to WASM format */
function convertSegment(seg: SketchSegment2D) {
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
}

/** Convert IR Sketch2D op to WASM profile format */
function convertSketchToProfile(op: Sketch2DOp) {
  return {
    origin: [op.origin.x, op.origin.y, op.origin.z],
    x_dir: [op.x_dir.x, op.x_dir.y, op.x_dir.z],
    y_dir: [op.y_dir.x, op.y_dir.y, op.y_dir.z],
    segments: op.segments.map(convertSegment),
  };
}

/** Type for the kernel module */
interface KernelModule {
  Solid: typeof Solid;
}

/**
 * Evaluate a vcad IR Document into an EvaluatedScene using vcad-kernel-wasm.
 *
 * Walks the DAG for each scene root, memoizes intermediate Solid objects
 * by NodeId, then extracts triangle meshes.
 */
export function evaluateDocument(
  doc: Document,
  kernel: KernelModule,
): EvaluatedScene {
  const { Solid } = kernel;
  const cache = new Map<NodeId, Solid>();

  // Evaluate all parts
  const solids: Solid[] = [];
  const parts = doc.roots.map((entry) => {
    const solid = evaluateNode(entry.root, doc.nodes, Solid, cache);
    solids.push(solid);
    const meshData = solid.getMesh();
    const mesh: TriangleMesh = {
      positions: new Float32Array(meshData.positions),
      indices: new Uint32Array(meshData.indices),
      normals: meshData.normals ? new Float32Array(meshData.normals) : undefined,
    };
    return {
      mesh,
      material: entry.material,
    };
  });

  // Compute pairwise intersections for clash detection
  const clashes: TriangleMesh[] = [];
  for (let i = 0; i < solids.length; i++) {
    for (let j = i + 1; j < solids.length; j++) {
      const intersection = solids[i].intersection(solids[j]);
      // Only include non-empty intersections
      if (!intersection.isEmpty()) {
        const meshData = intersection.getMesh();
        if (meshData.positions.length > 0) {
          clashes.push({
            positions: new Float32Array(meshData.positions),
            indices: new Uint32Array(meshData.indices),
            normals: meshData.normals ? new Float32Array(meshData.normals) : undefined,
          });
        }
      }
    }
  }

  return { parts, clashes };
}

function evaluateNode(
  nodeId: NodeId,
  nodes: Record<string, Node>,
  Solid: typeof import("@vcad/kernel-wasm").Solid,
  cache: Map<NodeId, import("@vcad/kernel-wasm").Solid>,
): import("@vcad/kernel-wasm").Solid {
  const cached = cache.get(nodeId);
  if (cached) return cached;

  const node = nodes[String(nodeId)];
  if (!node) {
    throw new Error(`Missing node: ${nodeId}`);
  }

  const result = evaluateOp(node.op, nodes, Solid, cache);
  cache.set(nodeId, result);
  return result;
}

function evaluateOp(
  op: CsgOp,
  nodes: Record<string, Node>,
  Solid: typeof import("@vcad/kernel-wasm").Solid,
  cache: Map<NodeId, import("@vcad/kernel-wasm").Solid>,
): import("@vcad/kernel-wasm").Solid {
  switch (op.type) {
    case "Cube":
      return Solid.cube(op.size.x, op.size.y, op.size.z);

    case "Cylinder":
      return Solid.cylinder(op.radius, op.height, op.segments || undefined);

    case "Sphere":
      return Solid.sphere(op.radius, op.segments || undefined);

    case "Cone":
      return Solid.cone(
        op.radius_bottom,
        op.radius_top,
        op.height,
        op.segments || undefined,
      );

    case "Empty":
      return Solid.empty();

    case "Union": {
      const left = evaluateNode(op.left, nodes, Solid, cache);
      const right = evaluateNode(op.right, nodes, Solid, cache);
      return left.union(right);
    }

    case "Difference": {
      const left = evaluateNode(op.left, nodes, Solid, cache);
      const right = evaluateNode(op.right, nodes, Solid, cache);
      return left.difference(right);
    }

    case "Intersection": {
      const left = evaluateNode(op.left, nodes, Solid, cache);
      const right = evaluateNode(op.right, nodes, Solid, cache);
      return left.intersection(right);
    }

    case "Translate": {
      const child = evaluateNode(op.child, nodes, Solid, cache);
      return child.translate(op.offset.x, op.offset.y, op.offset.z);
    }

    case "Rotate": {
      const child = evaluateNode(op.child, nodes, Solid, cache);
      return child.rotate(op.angles.x, op.angles.y, op.angles.z);
    }

    case "Scale": {
      const child = evaluateNode(op.child, nodes, Solid, cache);
      return child.scale(op.factor.x, op.factor.y, op.factor.z);
    }

    case "Sketch2D":
      // Sketch2D nodes don't produce geometry directly — they're referenced by Extrude/Revolve
      // Return an empty solid as a placeholder
      return Solid.empty();

    case "Extrude": {
      const sketchNode = nodes[String(op.sketch)];
      if (!sketchNode || sketchNode.op.type !== "Sketch2D") {
        throw new Error(`Extrude references invalid sketch node: ${op.sketch}`);
      }
      const profile = convertSketchToProfile(sketchNode.op);
      const direction = new Float64Array([
        op.direction.x,
        op.direction.y,
        op.direction.z,
      ]);
      return Solid.extrude(profile, direction);
    }

    case "Revolve": {
      const sketchNode = nodes[String(op.sketch)];
      if (!sketchNode || sketchNode.op.type !== "Sketch2D") {
        throw new Error(`Revolve references invalid sketch node: ${op.sketch}`);
      }
      const profile = convertSketchToProfile(sketchNode.op);
      const axisOrigin = new Float64Array([
        op.axis_origin.x,
        op.axis_origin.y,
        op.axis_origin.z,
      ]);
      const axisDir = new Float64Array([
        op.axis_dir.x,
        op.axis_dir.y,
        op.axis_dir.z,
      ]);
      return Solid.revolve(profile, axisOrigin, axisDir, op.angle_deg);
    }

    case "LinearPattern": {
      const child = evaluateNode(op.child, nodes, Solid, cache);
      return child.linearPattern(
        op.direction.x,
        op.direction.y,
        op.direction.z,
        op.count,
        op.spacing,
      );
    }

    case "CircularPattern": {
      const child = evaluateNode(op.child, nodes, Solid, cache);
      return child.circularPattern(
        op.axis_origin.x,
        op.axis_origin.y,
        op.axis_origin.z,
        op.axis_dir.x,
        op.axis_dir.y,
        op.axis_dir.z,
        op.count,
        op.angle_deg,
      );
    }

    case "Shell": {
      const child = evaluateNode(op.child, nodes, Solid, cache);
      return child.shell(op.thickness);
    }

    case "Sweep": {
      const sketchNode = nodes[String(op.sketch)];
      if (!sketchNode || sketchNode.op.type !== "Sketch2D") {
        throw new Error(`Sweep references invalid sketch node: ${op.sketch}`);
      }
      const profile = convertSketchToProfile(sketchNode.op);

      if (op.path.type === "Line") {
        const start = new Float64Array([
          op.path.start.x,
          op.path.start.y,
          op.path.start.z,
        ]);
        const end = new Float64Array([
          op.path.end.x,
          op.path.end.y,
          op.path.end.z,
        ]);
        return Solid.sweepLine(
          profile,
          start,
          end,
          op.twist_angle,
          op.scale_start,
          op.scale_end,
        );
      } else {
        // Helix path
        return Solid.sweepHelix(
          profile,
          op.path.radius,
          op.path.pitch,
          op.path.height,
          op.path.turns,
          op.twist_angle,
          op.scale_start,
          op.scale_end,
        );
      }
    }

    case "Loft": {
      const profiles = op.sketches.map((sketchId) => {
        const sketchNode = nodes[String(sketchId)];
        if (!sketchNode || sketchNode.op.type !== "Sketch2D") {
          throw new Error(`Loft references invalid sketch node: ${sketchId}`);
        }
        return convertSketchToProfile(sketchNode.op);
      });
      return Solid.loft(profiles, op.closed);
    }
  }
}
