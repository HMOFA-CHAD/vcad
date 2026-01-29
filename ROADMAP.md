# vcad Strategic Roadmap

## Vision

Replace Fusion 360 / Shapr3D / Onshape with a free, open-source parametric CAD ecosystem. Native apps + web + API + plugins.

---

## Current State (Phases 1-12 Complete)

| Phase | Component | Status |
|-------|-----------|--------|
| 1 | Topology + Geometry + Primitives + Tessellation | ✅ |
| 2 | Boolean Operations | ✅ |
| 3 | Surface Transforms | ✅ |
| 4 | NURBS | ✅ |
| 5 | Fillets & Chamfers | ✅ |
| 6 | Sketch-Based Operations (extrude/revolve) | ✅ |
| 7 | Sketch IR + UI Integration | ✅ |
| 8 | Shell + Pattern Operations | ✅ |
| 9 | Constraint Solver | ✅ |
| 10 | STEP Import/Export | ✅ |
| 11 | Sweep + Loft (Kernel) | ✅ |
| 12 | Sweep + Loft UI Integration | ✅ |

**Kernel crates:** math, topo, geom, primitives, tessellate, booleans, nurbs, fillet, sketch, sweep, shell, constraints, step

**App features:**
- React + Three.js viewport
- Parametric DAG with undo/redo
- Feature tree with part hierarchy
- Property panel with scrub inputs
- Sketch mode with constraint UI (horizontal, vertical, length, parallel, equal)
- Extrude, Revolve, Sweep, Loft operations
- Shell and pattern operations
- Boolean operations (union, difference, intersection)

**Export:** STL, GLB, USD, DXF, STEP | **Import:** .vcad, STEP

---

## Phase 13: Assembly + Joints

**Goal:** Multi-part designs with kinematic motion.

### Assembly Document

```rust
pub struct Assembly {
    parts: Vec<PartInstance>,     // part + transform
    joints: Vec<Joint>,
    ground: PartId,               // fixed reference
}
```

### Joint Types

| Joint | DOF | Example |
|-------|-----|---------|
| Fixed | 0 | Welded parts |
| Revolute | 1 | Hinge |
| Slider | 1 | Piston |
| Cylindrical | 2 | Rotate + slide |
| Planar | 3 | Slide on plane |
| Ball | 3 | Ball joint |

### Implementation

1. **IR Changes** — Add `Assembly` document type, `Joint` definitions
2. **UI** — Assembly mode, part insertion, joint definition workflow
3. **Motion Study** — Simple kinematic solver for joint angles/positions
4. **Interference Detection** — Boolean intersection volume > 0

### UX Decisions Needed

- How to define mates? (face selection, axis selection, point selection)
- Joint preview during definition?
- Animation timeline for motion study?

---

## Phase 14: 2D Drafting

**Goal:** Technical drawings from 3D models.

### Projection

`pub fn project(solid: &BRepSolid, view_dir: Vec3) -> DxfDocument`

- Hidden line removal
- Silhouette edges
- Intersection edges

### Views

- Front, Top, Right, Isometric
- Section views (cut plane)
- Detail views (zoomed region)

### Dimensions

- Linear, angular, radial
- Geometric tolerances (GD&T)
- Notes, balloons, BOM

---

## Phase 15: Headless Mode + API

**Goal:** Automation and CI/CD integration.

- CLI: `vcad export model.vcad --format step`
- REST API: `POST /evaluate` with IR JSON
- GitHub Actions integration
- Batch processing of models

---

## Phase 16: Plugin System

**Goal:** Extensibility for custom workflows.

- Plugin API (Rust traits + WASM)
- Custom primitives, operations, exporters
- Plugin marketplace
- Example plugins: gear generator, thread creator, sheet metal

---

## Phase 17: Real-Time Collaboration

**Goal:** Team-based design.

- CRDT-based document sync
- Presence indicators (cursors, selections)
- Comments on geometry
- Version history with branching

---

## Phase 18: AI-Assisted Design

**Goal:** Natural language CAD.

- Natural language → sketch constraints
- "Make this fit inside a 100mm cube"
- Design suggestions based on manufacturing constraints
- Auto-fillet for printability

---

## Priority Order

| Priority | Phase | Value | Complexity |
|----------|-------|-------|------------|
| 1 | **13: Assembly + Joints** | Multi-part designs | Medium |
| 2 | **14: 2D Drafting** | Documentation | Medium |
| 3 | **15: Headless/API** | Automation | Low |
| 4 | **16: Plugins** | Extensibility | Medium |
| 5 | **17: Collaboration** | Team use | High |
| 6 | **18: AI Design** | Differentiation | High |

---

## Competitive Analysis

| Feature | Fusion | Shapr3D | Onshape | vcad (today) |
|---------|--------|---------|---------|--------------|
| Parametric sketches | ✅ | ✅ | ✅ | ✅ |
| Extrude/Revolve | ✅ | ✅ | ✅ | ✅ |
| Sweep/Loft | ✅ | ✅ | ✅ | ✅ |
| Shell/Pattern | ✅ | ✅ | ✅ | ✅ |
| Fillets | ✅ | ✅ | ✅ | ✅ |
| STEP I/O | ✅ | ✅ | ✅ | ✅ |
| Assembly | ✅ | ✅ | ✅ | ❌ |
| 2D Drafting | ✅ | ✅ | ✅ | ❌ |
| Collaboration | ❌ | ❌ | ✅ | ❌ |
| Self-hosted | ❌ | ❌ | ❌ | ✅ |
| Open source | ❌ | ❌ | ❌ | ✅ |
| API/Headless | Limited | ❌ | ✅ | ❌ |
| Price | $$$$ | $$$ | $$$ | Free |

---

## Immediate Opportunities

### Quick Wins (Low complexity, high value)

1. **Keyboard shortcuts** — Full keyboard-driven workflow (already started)
2. **Sketch plane selection** — Click face to start sketch on that plane
3. **Dimension editing** — Click dimension in viewport to edit
4. **Part copy/paste** — Clipboard support for parts
5. **STL import** — Convert mesh to solid for boolean operations

### Technical Debt

1. **Edge selection for sweep path** — Currently sweep uses preset paths; edge picking would enable sweep-along-edge
2. **Smooth loft mode** — Kernel supports B-spline interpolation, needs UI toggle
3. **Multi-face shell** — Shell with open faces (remove selected faces)
4. **Draft angle** — Tapered walls for injection molding

---

## Next Step

**Phase 13: Assembly + Joints** is the next major milestone. It unlocks multi-part mechanical designs — the bread and butter of CAD work.

Alternatively, we could focus on **quick wins** to polish the single-part workflow before tackling assemblies.
