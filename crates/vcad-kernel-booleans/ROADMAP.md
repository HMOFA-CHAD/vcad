# vcad-kernel Roadmap

## Overview

Replace `manifold-rs` with a pure-Rust B-rep parametric kernel. Enable fillets/chamfers, STEP I/O, and sketch-based operations.

Each phase ships something testable. `manifold-rs` stays feature-flagged (not ripped out) until the kernel is fully proven.

---

## Phase 1: Topology + Geometry + Primitives + Tessellation ✅

**Status: Complete**

Built 7 crates forming the kernel foundation:

| Crate | Purpose | Tests |
|-------|---------|-------|
| `vcad-kernel-math` | Point/Vec/Transform/Tolerance (nalgebra aliases) | 7 |
| `vcad-kernel-topo` | Arena-based half-edge topology (slotmap) | 5 |
| `vcad-kernel-geom` | Surface/Curve traits + Plane, Cylinder, Cone, Sphere | 8 |
| `vcad-kernel-primitives` | cube, cylinder, sphere, cone B-rep construction | 9 |
| `vcad-kernel-tessellate` | B-rep → triangle mesh | 8 |
| `vcad-kernel-booleans` | CSG ops (mesh-based stub) | 4 |
| `vcad-kernel` | Facade crate with `Solid` API | 17 |

Integration:
- Feature flags `kernel-manifold` (default) and `kernel-brep` in vcad crate
- `PartMesh` adaptor provides common mesh interface for all exporters
- All 90 tests + 2 doctests pass across workspace

---

## Phase 2: Boolean Operations

**Status: In Progress**

Replace the mesh-based boolean stubs with proper B-rep booleans that preserve topology and geometry.

### Pipeline

```
Input: BRepSolid A, BRepSolid B, BooleanOp
  │
  ├─ Step 1: AABB face-pair filter
  ├─ Step 2: Surface-surface intersection (SSI)
  ├─ Step 3: Trim intersection curves to face domains
  ├─ Step 4: Face splitting along intersection curves
  ├─ Step 5: Sub-face classification (IN/OUT/ON)
  ├─ Step 6: Topology reconstruction (sewing)
  └─ Step 7: Integration into boolean_op()

Output: BRepSolid
```

### Step 1: AABB face-pair filter

**File:** `src/bbox.rs`

Compute axis-aligned bounding boxes for each face. Only attempt SSI for face pairs whose AABBs overlap.

- `face_aabb(brep: &BRepSolid, face: FaceId) -> Aabb3`
- `aabb_overlap(a: &Aabb3, b: &Aabb3) -> bool`
- `find_candidate_face_pairs(a: &BRepSolid, b: &BRepSolid) -> Vec<(FaceId, FaceId)>`

**Tests:**
- Two non-overlapping cubes → 0 pairs
- Two overlapping cubes → correct subset
- Cube inside another → all inner faces are candidates

### Step 2: Analytic surface-surface intersection (SSI)

**File:** `src/ssi.rs`

Closed-form intersection for analytic surface pairs:

| Surface A | Surface B | Intersection |
|-----------|-----------|-------------|
| Plane | Plane | Line / empty / coincident |
| Plane | Sphere | Circle / point / empty |
| Plane | Cylinder | 0-2 Lines / Ellipse |
| Plane | Cone | Conic section |
| Sphere | Sphere | Circle / point / empty |
| Cylinder | Cylinder | Degree-4 (sampled) |

```rust
pub enum IntersectionCurve {
    Empty,
    Point(Point3),
    Line(Line3d),
    Circle(Circle3d),
    Ellipse(Ellipse3d),
    Sampled(Vec<Point3>),
}
```

**Tests:**
- Parallel planes → Empty
- Perpendicular planes → Line with correct direction
- Plane through sphere center → Circle with sphere radius
- Plane tangent to sphere → Point

### Step 3: Trim intersection curves to face domains

**File:** `src/trim.rs`

Clip SSI curves to the bounded region of each face by testing against trim loops in UV space.

- `point_in_face_uv(face, surface, uv, brep) -> bool`
- `trim_curve_to_face(curve, face, brep) -> Vec<(f64, f64)>`

### Step 4: Face splitting

**File:** `src/split.rs`

Split faces along intersection curves:

1. Project curves into (u,v) parameter space
2. Build planar graph with existing trim loops + cut curves
3. Extract minimal cycles → new sub-face loops
4. Create new Face entities

Start with planar faces (line intersections), extend to curved faces.

### Step 5: Sub-face classification

**File:** `src/classify.rs`

For each sub-face, determine IN/OUT/ON_SAME/ON_OPPOSITE by:
1. Sample interior point (UV centroid)
2. Evaluate to 3D
3. Ray-cast against other solid
4. For boundary faces: compare normals

Selection rules:

| Operation | Keep from A | Keep from B |
|-----------|------------|------------|
| Union | Outside + OnSame | Outside |
| Difference | Outside + OnOpposite | Inside (reversed) |
| Intersection | Inside + OnSame | Inside |

### Step 6: Topology reconstruction

**File:** `src/sew.rs`

Stitch selected sub-faces into a valid B-rep:

1. Collect faces, flip orientation for reversed faces
2. Match edges along intersection curves (find twins)
3. Merge vertices within tolerance
4. Build Shell(s) and Solid

### Step 7: Integration

Update `boolean_op()` in `src/lib.rs` to use the B-rep pipeline. Keep mesh fallback for robustness.

**Verification:**
- `cube - cylinder` produces correct hole topology
- Volume matches manifold-rs within 5%
- All workspace tests pass
- Clippy clean

### Dependencies

```toml
robust = "1"  # Shewchuk exact predicates
```

### Files

```
crates/vcad-kernel-booleans/src/
  lib.rs       # Pipeline orchestration
  bbox.rs      # AABB filter
  ssi.rs       # Surface-surface intersection
  trim.rs      # Curve trimming
  split.rs     # Face splitting
  classify.rs  # Sub-face classification
  sew.rs       # Topology reconstruction
```

---

## Phase 3: Transforms + Inspection

**Status: Partially done (mesh-based in Phase 1)**

Upgrade transform and inspection to work directly on B-rep topology/geometry instead of going through tessellation.

### Steps

1. **B-rep transforms** — Apply affine transform to all vertices, surfaces, and curves in the topology. Currently transforms go through tessellation; this makes them exact.
   - `Solid::translate/rotate/scale` → modify `Topology.vertices[*].point` + transform surface definitions
   - Planes: transform origin + directions
   - Cylinders/Spheres/Cones: transform center + axis + ref_dir

2. **Exact volume** — Use the divergence theorem on parametric surface integrals instead of mesh approximation. For analytic faces:
   - Planar faces: ∫∫ (r · n) dA via Green's theorem on polygon vertices
   - Cylindrical/spherical faces: closed-form parametric integrals
   - Falls back to mesh-based for mixed/complex solids

3. **Exact surface area** — Parametric integration ∫∫ |dS/du × dS/dv| du dv per face

4. **Exact bounding box** — From vertex positions + surface extrema (e.g. sphere poles)

5. **Center of mass** — Volume-weighted centroid via parametric integrals

### Files

- `crates/vcad-kernel/src/lib.rs` — upgrade `Solid` methods

---

## Phase 4: NURBS

**Status: Not started**

New crate: `crates/vcad-kernel-nurbs/`

### Steps

1. **B-spline curve evaluation** — De Boor's algorithm for non-rational B-spline curves
2. **B-spline surface evaluation** — Tensor-product B-spline surfaces
3. **NURBS support** — Weighted control points for rational curves/surfaces
4. **Knot operations** — Knot insertion (Boehm's algorithm), degree elevation
5. **BSplineCurve** — Implements `Curve3d` trait
6. **BSplineSurface** — Implements `Surface` trait
7. **Tessellation** — Adaptive tessellation of B-spline faces
8. **SSI extension** — Marching method with Newton-Raphson for B-spline SSI

### Files

```
crates/vcad-kernel-nurbs/
  Cargo.toml
  src/
    lib.rs          # Re-exports
    basis.rs        # B-spline basis functions
    curve.rs        # BSplineCurve, NurbsCurve
    surface.rs      # BSplineSurface, NurbsSurface
    knot.rs         # Knot insertion, degree elevation
    tessellate.rs   # Adaptive tessellation
```

### Dependencies

- `vcad-kernel-math`
- `vcad-kernel-geom` (implements Surface/Curve3d traits)

---

## Phase 5: Fillets and Chamfers

**Status: Not started**

### Steps

1. **Constant-radius fillet** — Rolling-ball blend surface between two adjacent faces along a shared edge
   - For analytic edges: torus/cylinder blend surfaces (closed-form)
   - For general edges: fit B-spline blend surface
   - Trim adjacent faces to accommodate fillet face

2. **Chamfer** — Planar bevel face replacing an edge (simpler variant)
   - Compute two offset curves along the edge
   - Create planar face between them
   - Trim adjacent faces

3. **Variable-radius fillet** — Radius varies along the edge (later)

### Key challenges
- Identifying the rolling-ball center track along the edge
- Trimming adjacent faces exactly
- Handling chains of edges and smooth transitions at vertices

### Files

```
crates/vcad-kernel/src/
  fillet.rs     # Fillet operations
  chamfer.rs    # Chamfer operations
```

---

## Phase 6: Sketch-Based Operations

**Status: Not started**

### Steps

1. **2D sketch profile** — Closed wire of lines, arcs, B-splines in a construction plane
   - `Sketch` type with `add_line`, `add_arc`, `add_spline`
   - Constraint solver (later — start with explicit geometry)

2. **Extrude** — Sweep profile along direction → solid
   - Create top/bottom faces from profile
   - Create lateral faces from swept edges
   - Handle blind, through-all, up-to-face variants

3. **Revolve** — Sweep profile around axis → solid
   - Create surfaces of revolution (cylinder, cone, torus, B-spline)
   - Handle partial revolution (< 360°)

4. **Sweep** — Sweep profile along 3D guide curve → solid
   - Frenet frame or fixed reference direction
   - Handle twist

5. **Loft** — Surface between 2+ cross-section profiles → solid
   - Interpolate between profiles
   - Construct B-spline surface

### Files

```
crates/vcad-kernel/src/
  sketch.rs     # 2D sketch profile
  extrude.rs    # Extrude operation
  revolve.rs    # Revolve operation
  sweep.rs      # Sweep operation
  loft.rs       # Loft operation
```

---

## Phase 7: STEP I/O

**Status: Not started**

New crate: `crates/vcad-kernel-step/`

### Steps

1. **EXPRESS schema parser** — Parse EXPRESS (ISO 10303-11) schema definitions
2. **Part 21 reader** — Read STEP physical file format (ASCII)
3. **Part 21 writer** — Write STEP physical files
4. **Entity mapping** — Map AP214/AP242 entities (~80 types) to/from kernel B-rep
   - Geometric types: cartesian_point, direction, axis2_placement_3d, line, circle, b_spline_curve, plane, cylindrical_surface, spherical_surface, b_spline_surface, ...
   - Topological types: vertex_point, edge_curve, oriented_edge, edge_loop, face_bound, advanced_face, closed_shell, manifold_solid_brep, ...

5. **Replace OCCT-based STEP** — Remove dependency on `opencascade` crate for STEP export

### Files

```
crates/vcad-kernel-step/
  Cargo.toml
  src/
    lib.rs          # Re-exports
    express.rs      # EXPRESS schema parser
    reader.rs       # Part 21 reader
    writer.rs       # Part 21 writer
    entities.rs     # Entity type definitions
    mapping.rs      # Kernel ↔ STEP entity conversion
```

---

## Risk Matrix

| Component | Difficulty | Key Risk |
|-----------|-----------|----------|
| Math types | 1/5 | None |
| Half-edge topology | 3/5 | Maintaining validity after edits |
| Analytic geometry | 2/5 | Surface singularities (sphere poles, cone apex) |
| Primitives | 2/5 | Correct topology for curved primitives |
| Tessellation | 3/5 | CDT quality, degenerate parametric domains |
| **Booleans** | **5/5** | **Robustness — tangential contact, coincident faces, slivers** |
| Face splitting | 4/5 | Correct cycle extraction from planar graph |
| NURBS | 3/5 | Numerical stability of high-degree evaluation |
| Fillets | 4/5 | Rolling-ball on non-analytic edges |
| Sketch ops | 3/5 | Sweep along non-planar paths, dissimilar loft profiles |
| STEP I/O | 4/5 | EXPRESS schema complexity, entity coverage |

**Booleans are the make-or-break component.** Mitigation: Shewchuk predicates, massive test suite, fuzz testing, comparison against manifold-rs.
