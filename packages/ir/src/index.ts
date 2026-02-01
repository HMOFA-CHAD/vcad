/**
 * @vcad/ir — Intermediate representation for the vcad CAD ecosystem.
 *
 * Mirrors the Rust `vcad-ir` crate types exactly for cross-language compatibility.
 */

/** Unique identifier for a node in the IR graph. */
export type NodeId = number;

/** 2D vector with f64 components (for sketch coordinates). */
export interface Vec2 {
  x: number;
  y: number;
}

/** 3D vector with f64 components (conventionally millimeters). */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** 3D transform (translation, rotation in degrees, scale). */
export interface Transform3D {
  translation: Vec3;
  rotation: Vec3;
  scale: Vec3;
}

/** Create an identity transform (no translation, rotation, or scaling). */
export function identityTransform(): Transform3D {
  return {
    translation: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
  };
}

// --- SketchSegment2D discriminated union ---

export interface LineSegment2D {
  type: "Line";
  start: Vec2;
  end: Vec2;
}

export interface ArcSegment2D {
  type: "Arc";
  start: Vec2;
  end: Vec2;
  center: Vec2;
  ccw: boolean;
}

/** A segment of a 2D sketch profile. */
export type SketchSegment2D = LineSegment2D | ArcSegment2D;

// --- Sketch Constraints ---

/** Reference to a point within a sketch entity. */
export type EntityRef =
  | { type: "Point"; index: number }
  | { type: "LineStart"; index: number }
  | { type: "LineEnd"; index: number }
  | { type: "ArcStart"; index: number }
  | { type: "ArcEnd"; index: number }
  | { type: "Center"; index: number };

/** Coincident constraint - two points at the same location. */
export interface CoincidentConstraint {
  type: "Coincident";
  pointA: EntityRef;
  pointB: EntityRef;
}

/** Horizontal constraint - line parallel to X axis. */
export interface HorizontalConstraint {
  type: "Horizontal";
  line: number;
}

/** Vertical constraint - line parallel to Y axis. */
export interface VerticalConstraint {
  type: "Vertical";
  line: number;
}

/** Parallel constraint - two lines are parallel. */
export interface ParallelConstraint {
  type: "Parallel";
  lineA: number;
  lineB: number;
}

/** Perpendicular constraint - two lines are perpendicular. */
export interface PerpendicularConstraint {
  type: "Perpendicular";
  lineA: number;
  lineB: number;
}

/** Fixed constraint - point at a fixed position. */
export interface FixedConstraint {
  type: "Fixed";
  point: EntityRef;
  x: number;
  y: number;
}

/** Distance constraint - distance between two points. */
export interface DistanceConstraint {
  type: "Distance";
  pointA: EntityRef;
  pointB: EntityRef;
  distance: number;
}

/** Length constraint - length of a line. */
export interface LengthConstraint {
  type: "Length";
  line: number;
  length: number;
}

/** Equal length constraint - two lines have same length. */
export interface EqualLengthConstraint {
  type: "EqualLength";
  lineA: number;
  lineB: number;
}

/** Radius constraint - circle/arc has specific radius. */
export interface RadiusConstraint {
  type: "Radius";
  circle: number;
  radius: number;
}

/** Angle constraint - angle between two lines. */
export interface AngleConstraint {
  type: "Angle";
  lineA: number;
  lineB: number;
  angleDeg: number;
}

/** A constraint on sketch entities. */
export type SketchConstraint =
  | CoincidentConstraint
  | HorizontalConstraint
  | VerticalConstraint
  | ParallelConstraint
  | PerpendicularConstraint
  | FixedConstraint
  | DistanceConstraint
  | LengthConstraint
  | EqualLengthConstraint
  | RadiusConstraint
  | AngleConstraint;

// --- CsgOp discriminated union ---

export interface CubeOp {
  type: "Cube";
  size: Vec3;
}

export interface CylinderOp {
  type: "Cylinder";
  radius: number;
  height: number;
  segments: number;
}

export interface SphereOp {
  type: "Sphere";
  radius: number;
  segments: number;
}

export interface ConeOp {
  type: "Cone";
  radius_bottom: number;
  radius_top: number;
  height: number;
  segments: number;
}

export interface EmptyOp {
  type: "Empty";
}

export interface UnionOp {
  type: "Union";
  left: NodeId;
  right: NodeId;
}

export interface DifferenceOp {
  type: "Difference";
  left: NodeId;
  right: NodeId;
}

export interface IntersectionOp {
  type: "Intersection";
  left: NodeId;
  right: NodeId;
}

export interface TranslateOp {
  type: "Translate";
  child: NodeId;
  offset: Vec3;
}

export interface RotateOp {
  type: "Rotate";
  child: NodeId;
  angles: Vec3;
}

export interface ScaleOp {
  type: "Scale";
  child: NodeId;
  factor: Vec3;
}

export interface Sketch2DOp {
  type: "Sketch2D";
  origin: Vec3;
  x_dir: Vec3;
  y_dir: Vec3;
  segments: SketchSegment2D[];
}

export interface ExtrudeOp {
  type: "Extrude";
  sketch: NodeId;
  direction: Vec3;
}

export interface RevolveOp {
  type: "Revolve";
  sketch: NodeId;
  axis_origin: Vec3;
  axis_dir: Vec3;
  angle_deg: number;
}

export interface LinearPatternOp {
  type: "LinearPattern";
  child: NodeId;
  direction: Vec3;
  count: number;
  spacing: number;
}

export interface CircularPatternOp {
  type: "CircularPattern";
  child: NodeId;
  axis_origin: Vec3;
  axis_dir: Vec3;
  count: number;
  angle_deg: number;
}

export interface ShellOp {
  type: "Shell";
  child: NodeId;
  thickness: number;
}

/**
 * An imported mesh (e.g., from STEP file).
 * Stores pre-tessellated geometry that can be transformed but not used in booleans.
 */
export interface ImportedMeshOp {
  type: "ImportedMesh";
  /** Flat array of vertex positions (x, y, z, x, y, z, ...) */
  positions: number[];
  /** Triangle indices */
  indices: number[];
  /** Optional vertex normals (nx, ny, nz, ...) */
  normals?: number[];
  /** Source filename for display purposes */
  source?: string;
}

// --- Path curves for sweep operations ---

/** A straight line path from start to end. */
export interface LinePath {
  type: "Line";
  start: Vec3;
  end: Vec3;
}

/** A helical path for sweep operations. */
export interface HelixPath {
  type: "Helix";
  radius: number;
  pitch: number;
  height: number;
  turns: number;
}

/** Path curve types for sweep operations. */
export type PathCurve = LinePath | HelixPath;

/** Sweep operation — extrude a profile along a path curve. */
export interface SweepOp {
  type: "Sweep";
  sketch: NodeId;              // Reference to Sketch2D node
  path: PathCurve;             // The path to sweep along
  twist_angle?: number;        // Total twist in radians (default 0)
  scale_start?: number;        // Scale at start (default 1.0)
  scale_end?: number;          // Scale at end (default 1.0)
  path_segments?: number;      // Segments along path (0 = auto)
  arc_segments?: number;       // Segments per arc in profile (default 8)
}

/** Loft operation — interpolate between multiple profiles. */
export interface LoftOp {
  type: "Loft";
  sketches: NodeId[];          // Array of Sketch2D node references (≥2)
  closed?: boolean;            // Connect last to first (creates tube)
}

/** CSG operation — the core building block of the IR DAG. */
export type CsgOp =
  | CubeOp
  | CylinderOp
  | SphereOp
  | ConeOp
  | EmptyOp
  | UnionOp
  | DifferenceOp
  | IntersectionOp
  | TranslateOp
  | RotateOp
  | ScaleOp
  | Sketch2DOp
  | ExtrudeOp
  | RevolveOp
  | LinearPatternOp
  | CircularPatternOp
  | ShellOp
  | SweepOp
  | LoftOp
  | ImportedMeshOp;

/** A node in the IR graph. */
export interface Node {
  id: NodeId;
  name: string | null;
  op: CsgOp;
}

/** PBR material definition. */
export interface MaterialDef {
  name: string;
  color: [number, number, number];
  metallic: number;
  roughness: number;
  density?: number;
  friction?: number;
}

/** An entry in the scene — a root node with an assigned material. */
export interface SceneEntry {
  root: NodeId;
  material: string;
}

/** Joint limits as [min, max] tuple for constrained joints. */
export type JointLimits = [number, number];

/** Joint kind variants for assembly joints. */
export type JointKind =
  | { type: "Fixed" }
  | { type: "Revolute"; axis: Vec3; limits?: JointLimits }
  | { type: "Slider"; axis: Vec3; limits?: JointLimits }
  | { type: "Cylindrical"; axis: Vec3 }
  | { type: "Ball" };

/** A joint connecting two instances in an assembly. */
export interface Joint {
  id: string;
  name?: string;
  parentInstanceId: string | null;
  childInstanceId: string;
  parentAnchor: Vec3;
  childAnchor: Vec3;
  kind: JointKind;
  state: number;
}

/** An instance of a part definition in an assembly. */
export interface Instance {
  id: string;
  partDefId: string;
  name?: string;
  transform?: Transform3D;
  material?: string;
}

/** Alias for Instance (used in some components). */
export type PartInstance = Instance;

/** A reusable part definition in an assembly. */
export interface PartDef {
  id: string;
  name?: string;
  root: NodeId;
  defaultMaterial?: string;
}

/** A vcad document — the `.vcad` file format. */
export interface Document {
  version: string;
  nodes: Record<string, Node>;
  materials: Record<string, MaterialDef>;
  part_materials: Record<string, string>;
  roots: SceneEntry[];
  /** Part definitions for assembly mode. */
  partDefs?: Record<string, PartDef>;
  /** Instances of part definitions. */
  instances?: Instance[];
  /** Joints connecting instances. */
  joints?: Joint[];
  /** The instance that is fixed in world space (ground). */
  groundInstanceId?: string;
}

/** Create a new empty document. */
export function createDocument(): Document {
  return {
    version: "0.1",
    nodes: {},
    materials: {},
    part_materials: {},
    roots: [],
  };
}

/** Serialize a document to a JSON string. */
export function toJson(doc: Document): string {
  return JSON.stringify(doc, null, 2);
}

/** Deserialize a document from a JSON string. */
export function fromJson(json: string): Document {
  return JSON.parse(json) as Document;
}

// ============================================================================
// Compact IR Format (for cad0 model training and inference)
// ============================================================================

/**
 * Parse compact IR text format into a vcad IR Document.
 *
 * The compact IR format is a token-efficient text representation designed
 * for ML model training and inference.
 *
 * @example
 * ```typescript
 * const ir = "C 50 30 5\nY 5 10\nT 1 25 15 0\nD 0 2";
 * const doc = fromCompact(ir);
 * ```
 */
export function fromCompact(compact: string): Document {
  const doc = createDocument();
  let currentLine = 0;
  const lines = compact.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();

    // Skip empty lines and comments
    if (!line || line.startsWith('#')) {
      currentLine++;
      i++;
      continue;
    }

    const nodeId = currentLine;
    const result = parseLine(line, currentLine, lines, i);
    const [op, newIndex] = result;

    doc.nodes[nodeId.toString()] = {
      id: nodeId,
      name: null,
      op,
    };

    currentLine = newIndex + 1;
    i = newIndex + 1;
  }

  // Find the root node (highest ID that isn't referenced by others)
  if (Object.keys(doc.nodes).length > 0) {
    const referenced = new Set<number>();
    for (const node of Object.values(doc.nodes)) {
      for (const childId of getChildren(node.op)) {
        referenced.add(childId);
      }
    }

    const rootId = Object.keys(doc.nodes)
      .map(Number)
      .filter(id => !referenced.has(id))
      .reduce((a, b) => Math.max(a, b), 0);

    // Add default material and scene entry
    doc.materials['default'] = {
      name: 'default',
      color: [0.8, 0.8, 0.8],
      metallic: 0,
      roughness: 0.5,
    };

    doc.roots.push({
      root: rootId,
      material: 'default',
    });
  }

  return doc;
}

/**
 * Convert a vcad IR Document to compact IR text format.
 *
 * @example
 * ```typescript
 * const compact = toCompact(doc);
 * console.log(compact); // "C 50 30 5\nY 5 10\n..."
 * ```
 */
export function toCompact(doc: Document): string {
  if (Object.keys(doc.nodes).length === 0) {
    return '';
  }

  // Find all root nodes (nodes not referenced by any other node)
  const referenced = new Set<number>();
  for (const node of Object.values(doc.nodes)) {
    for (const childId of getChildren(node.op)) {
      referenced.add(childId);
    }
  }

  const roots = Object.keys(doc.nodes)
    .map(Number)
    .filter(id => !referenced.has(id));

  // Topological sort: dependencies before dependents
  const sorted = topologicalSort(doc, roots);

  // Create ID mapping: original NodeId -> line number
  const idMap = new Map<number, number>();
  sorted.forEach((id, index) => {
    idMap.set(id, index);
  });

  const lines: string[] = [];
  for (const nodeId of sorted) {
    const node = doc.nodes[nodeId.toString()];
    const line = formatOp(node.op, idMap);
    lines.push(line);
  }

  return lines.join('\n');
}

/** Get child node IDs from an operation. */
function getChildren(op: CsgOp): number[] {
  switch (op.type) {
    case 'Union':
    case 'Difference':
    case 'Intersection':
      return [op.left, op.right];
    case 'Translate':
    case 'Rotate':
    case 'Scale':
    case 'LinearPattern':
    case 'CircularPattern':
    case 'Shell':
      return [op.child];
    case 'Extrude':
    case 'Revolve':
      return [op.sketch];
    case 'Sweep':
      return [op.sketch];
    case 'Loft':
      return op.sketches;
    default:
      return [];
  }
}

/** Topological sort of nodes. */
function topologicalSort(doc: Document, roots: number[]): number[] {
  const result: number[] = [];
  const visited = new Set<number>();
  const tempVisited = new Set<number>();

  function visit(nodeId: number): void {
    if (visited.has(nodeId)) return;
    if (tempVisited.has(nodeId)) {
      throw new Error(`Cycle detected at node ${nodeId}`);
    }

    tempVisited.add(nodeId);

    const node = doc.nodes[nodeId.toString()];
    if (node) {
      for (const childId of getChildren(node.op)) {
        visit(childId);
      }
    }

    tempVisited.delete(nodeId);
    visited.add(nodeId);
    result.push(nodeId);
  }

  for (const rootId of roots) {
    visit(rootId);
  }

  // Also visit any orphan nodes
  for (const id of Object.keys(doc.nodes).map(Number)) {
    if (!visited.has(id)) {
      visit(id);
    }
  }

  return result;
}

/** Format a CsgOp as a compact IR line. */
function formatOp(op: CsgOp, idMap: Map<number, number>): string {
  switch (op.type) {
    case 'Cube':
      return `C ${op.size.x} ${op.size.y} ${op.size.z}`;
    case 'Cylinder':
      return `Y ${op.radius} ${op.height}`;
    case 'Sphere':
      return `S ${op.radius}`;
    case 'Cone':
      return `K ${op.radius_bottom} ${op.radius_top} ${op.height}`;
    case 'Empty':
      return 'C 0 0 0';
    case 'Union':
      return `U ${idMap.get(op.left)} ${idMap.get(op.right)}`;
    case 'Difference':
      return `D ${idMap.get(op.left)} ${idMap.get(op.right)}`;
    case 'Intersection':
      return `I ${idMap.get(op.left)} ${idMap.get(op.right)}`;
    case 'Translate':
      return `T ${idMap.get(op.child)} ${op.offset.x} ${op.offset.y} ${op.offset.z}`;
    case 'Rotate':
      return `R ${idMap.get(op.child)} ${op.angles.x} ${op.angles.y} ${op.angles.z}`;
    case 'Scale':
      return `X ${idMap.get(op.child)} ${op.factor.x} ${op.factor.y} ${op.factor.z}`;
    case 'LinearPattern':
      return `LP ${idMap.get(op.child)} ${op.direction.x} ${op.direction.y} ${op.direction.z} ${op.count} ${op.spacing}`;
    case 'CircularPattern':
      return `CP ${idMap.get(op.child)} ${op.axis_origin.x} ${op.axis_origin.y} ${op.axis_origin.z} ${op.axis_dir.x} ${op.axis_dir.y} ${op.axis_dir.z} ${op.count} ${op.angle_deg}`;
    case 'Shell':
      return `SH ${idMap.get(op.child)} ${op.thickness}`;
    case 'Sketch2D': {
      const lines: string[] = [];
      lines.push(`SK ${op.origin.x} ${op.origin.y} ${op.origin.z}  ${op.x_dir.x} ${op.x_dir.y} ${op.x_dir.z}  ${op.y_dir.x} ${op.y_dir.y} ${op.y_dir.z}`);
      for (const seg of op.segments) {
        if (seg.type === 'Line') {
          lines.push(`L ${seg.start.x} ${seg.start.y} ${seg.end.x} ${seg.end.y}`);
        } else {
          lines.push(`A ${seg.start.x} ${seg.start.y} ${seg.end.x} ${seg.end.y} ${seg.center.x} ${seg.center.y} ${seg.ccw ? 1 : 0}`);
        }
      }
      lines.push('END');
      return lines.join('\n');
    }
    case 'Extrude':
      return `E ${idMap.get(op.sketch)} ${op.direction.x} ${op.direction.y} ${op.direction.z}`;
    case 'Revolve':
      return `V ${idMap.get(op.sketch)} ${op.axis_origin.x} ${op.axis_origin.y} ${op.axis_origin.z} ${op.axis_dir.x} ${op.axis_dir.y} ${op.axis_dir.z} ${op.angle_deg}`;
    default:
      throw new Error(`Unsupported op type for compact IR: ${(op as CsgOp).type}`);
  }
}

/** Parse a single line of compact IR. Returns [op, newLineIndex]. */
function parseLine(line: string, lineNum: number, lines: string[], currentIndex: number): [CsgOp, number] {
  const parts = line.split(/\s+/);
  const opcode = parts[0];

  switch (opcode) {
    case 'C':
      if (parts.length !== 4) throw new CompactParseError(lineNum, `C requires 3 args, got ${parts.length - 1}`);
      return [{ type: 'Cube', size: { x: parseFloat(parts[1]), y: parseFloat(parts[2]), z: parseFloat(parts[3]) } }, currentIndex];

    case 'Y':
      if (parts.length !== 3) throw new CompactParseError(lineNum, `Y requires 2 args, got ${parts.length - 1}`);
      return [{ type: 'Cylinder', radius: parseFloat(parts[1]), height: parseFloat(parts[2]), segments: 0 }, currentIndex];

    case 'S':
      if (parts.length !== 2) throw new CompactParseError(lineNum, `S requires 1 arg, got ${parts.length - 1}`);
      return [{ type: 'Sphere', radius: parseFloat(parts[1]), segments: 0 }, currentIndex];

    case 'K':
      if (parts.length !== 4) throw new CompactParseError(lineNum, `K requires 3 args, got ${parts.length - 1}`);
      return [{ type: 'Cone', radius_bottom: parseFloat(parts[1]), radius_top: parseFloat(parts[2]), height: parseFloat(parts[3]), segments: 0 }, currentIndex];

    case 'U':
      if (parts.length !== 3) throw new CompactParseError(lineNum, `U requires 2 args, got ${parts.length - 1}`);
      return [{ type: 'Union', left: parseInt(parts[1]), right: parseInt(parts[2]) }, currentIndex];

    case 'D':
      if (parts.length !== 3) throw new CompactParseError(lineNum, `D requires 2 args, got ${parts.length - 1}`);
      return [{ type: 'Difference', left: parseInt(parts[1]), right: parseInt(parts[2]) }, currentIndex];

    case 'I':
      if (parts.length !== 3) throw new CompactParseError(lineNum, `I requires 2 args, got ${parts.length - 1}`);
      return [{ type: 'Intersection', left: parseInt(parts[1]), right: parseInt(parts[2]) }, currentIndex];

    case 'T':
      if (parts.length !== 5) throw new CompactParseError(lineNum, `T requires 4 args, got ${parts.length - 1}`);
      return [{ type: 'Translate', child: parseInt(parts[1]), offset: { x: parseFloat(parts[2]), y: parseFloat(parts[3]), z: parseFloat(parts[4]) } }, currentIndex];

    case 'R':
      if (parts.length !== 5) throw new CompactParseError(lineNum, `R requires 4 args, got ${parts.length - 1}`);
      return [{ type: 'Rotate', child: parseInt(parts[1]), angles: { x: parseFloat(parts[2]), y: parseFloat(parts[3]), z: parseFloat(parts[4]) } }, currentIndex];

    case 'X':
      if (parts.length !== 5) throw new CompactParseError(lineNum, `X requires 4 args, got ${parts.length - 1}`);
      return [{ type: 'Scale', child: parseInt(parts[1]), factor: { x: parseFloat(parts[2]), y: parseFloat(parts[3]), z: parseFloat(parts[4]) } }, currentIndex];

    case 'LP':
      if (parts.length !== 7) throw new CompactParseError(lineNum, `LP requires 6 args, got ${parts.length - 1}`);
      return [{ type: 'LinearPattern', child: parseInt(parts[1]), direction: { x: parseFloat(parts[2]), y: parseFloat(parts[3]), z: parseFloat(parts[4]) }, count: parseInt(parts[5]), spacing: parseFloat(parts[6]) }, currentIndex];

    case 'CP':
      if (parts.length !== 10) throw new CompactParseError(lineNum, `CP requires 9 args, got ${parts.length - 1}`);
      return [{ type: 'CircularPattern', child: parseInt(parts[1]), axis_origin: { x: parseFloat(parts[2]), y: parseFloat(parts[3]), z: parseFloat(parts[4]) }, axis_dir: { x: parseFloat(parts[5]), y: parseFloat(parts[6]), z: parseFloat(parts[7]) }, count: parseInt(parts[8]), angle_deg: parseFloat(parts[9]) }, currentIndex];

    case 'SH':
      if (parts.length !== 3) throw new CompactParseError(lineNum, `SH requires 2 args, got ${parts.length - 1}`);
      return [{ type: 'Shell', child: parseInt(parts[1]), thickness: parseFloat(parts[2]) }, currentIndex];

    case 'SK': {
      if (parts.length !== 10) throw new CompactParseError(lineNum, `SK requires 9 args, got ${parts.length - 1}`);
      const origin = { x: parseFloat(parts[1]), y: parseFloat(parts[2]), z: parseFloat(parts[3]) };
      const x_dir = { x: parseFloat(parts[4]), y: parseFloat(parts[5]), z: parseFloat(parts[6]) };
      const y_dir = { x: parseFloat(parts[7]), y: parseFloat(parts[8]), z: parseFloat(parts[9]) };
      const segments: SketchSegment2D[] = [];

      let idx = currentIndex + 1;
      while (idx < lines.length) {
        const segLine = lines[idx].trim();
        if (segLine === 'END') break;
        if (!segLine || segLine.startsWith('#')) {
          idx++;
          continue;
        }

        const segParts = segLine.split(/\s+/);
        if (segParts[0] === 'L') {
          if (segParts.length !== 5) throw new CompactParseError(idx, `L requires 4 args, got ${segParts.length - 1}`);
          segments.push({
            type: 'Line',
            start: { x: parseFloat(segParts[1]), y: parseFloat(segParts[2]) },
            end: { x: parseFloat(segParts[3]), y: parseFloat(segParts[4]) },
          });
        } else if (segParts[0] === 'A') {
          if (segParts.length !== 8) throw new CompactParseError(idx, `A requires 7 args, got ${segParts.length - 1}`);
          segments.push({
            type: 'Arc',
            start: { x: parseFloat(segParts[1]), y: parseFloat(segParts[2]) },
            end: { x: parseFloat(segParts[3]), y: parseFloat(segParts[4]) },
            center: { x: parseFloat(segParts[5]), y: parseFloat(segParts[6]) },
            ccw: parseInt(segParts[7]) !== 0,
          });
        } else {
          throw new CompactParseError(idx, `Unknown sketch segment opcode: ${segParts[0]}`);
        }
        idx++;
      }

      return [{ type: 'Sketch2D', origin, x_dir, y_dir, segments }, idx];
    }

    case 'E':
      if (parts.length !== 5) throw new CompactParseError(lineNum, `E requires 4 args, got ${parts.length - 1}`);
      return [{ type: 'Extrude', sketch: parseInt(parts[1]), direction: { x: parseFloat(parts[2]), y: parseFloat(parts[3]), z: parseFloat(parts[4]) } }, currentIndex];

    case 'V':
      if (parts.length !== 9) throw new CompactParseError(lineNum, `V requires 8 args, got ${parts.length - 1}`);
      return [{ type: 'Revolve', sketch: parseInt(parts[1]), axis_origin: { x: parseFloat(parts[2]), y: parseFloat(parts[3]), z: parseFloat(parts[4]) }, axis_dir: { x: parseFloat(parts[5]), y: parseFloat(parts[6]), z: parseFloat(parts[7]) }, angle_deg: parseFloat(parts[8]) }, currentIndex];

    default:
      throw new CompactParseError(lineNum, `Unknown opcode: ${opcode}`);
  }
}

/** Error thrown when parsing compact IR fails. */
export class CompactParseError extends Error {
  line: number;

  constructor(line: number, message: string) {
    super(`line ${line}: ${message}`);
    this.name = 'CompactParseError';
    this.line = line;
  }
}
