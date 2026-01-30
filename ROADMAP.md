# vcad Strategic Roadmap

## Vision

**Replace Fusion 360 / CATIA / NX / Onshape / Shapr3D / FreeCAD** with a free, open-source, AI-native parametric CAD ecosystem. Native apps + web + API + plugins.

The first CAD system where:
- You can **describe** what you want in natural language
- **AI suggests** constraints, features, and manufacturing fixes
- **Collaboration** is real-time without cloud lock-in
- **PCB and MCAD** are unified in one tool
- **Anyone can contribute** to the kernel (open source)
- It runs **anywhere** — browser, CLI, mobile, embedded
- It's **free forever**

This isn't incremental improvement. This is **category creation**.

---

## Current State

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
| 10 | STEP Import/Export | 🔶 Kernel only |
| 11 | Sweep + Loft (Kernel) | ✅ |
| 12 | Sweep + Loft UI Integration | ✅ |
| 13 | Assembly + Joints | 🔶 Partial |
| 15 | Headless Mode + API | 🔶 CLI + MCP |

**Kernel crates:** math, topo, geom, primitives, tessellate, booleans, nurbs, fillet, sketch, sweep, shell, constraints, step

**Kernel stats:** ~29K lines Rust, ~5.4K lines in booleans alone

**App features:**
- React + Three.js viewport
- Parametric DAG with undo/redo
- Feature tree with part hierarchy
- Property panel with scrub inputs
- Sketch mode with constraint UI (horizontal, vertical, length, parallel, equal)
- Extrude, Revolve, Sweep, Loft operations
- Shell and pattern operations
- Boolean operations (union, difference, intersection)
- Assembly rendering with instances/joints (partial)

**Export:** STL, GLB, USD, DXF | **Import:** .vcad

**Headless:** Rust CLI (`vcad export/info`), JS CLI (TUI), MCP server (`create_cad_document`, `export_cad`, `inspect_cad`)

---

## The Five Legendary Pillars

### 1. AI-Native CAD (No competitor has this)

| Feature | Research | Impact |
|---------|----------|--------|
| **Text-to-CAD** | CAD-MLLM [2411.04954], CAD-Recode [2412.14042] | "Design a flange with 6 holes" → parametric model |
| **Point Cloud → CAD** | P2CADNet [2310.02638], Point2Primitive [2505.02043] | 3D scan → editable B-rep |
| **Sketch Completion** | SketchAgent [2411.17673], CurveGen [2104.09621] | Underconstrained sketch → AI suggests constraints |
| **Manufacturing AI** | Physics-Informed ML [2407.10761], Agentic AM [2510.02567] | "Is this printable?" with suggested modifications |

**Implementation:** Integrate `burn` (Rust ML framework) for on-device inference. MCP server is already the perfect interface.

### 2. Bulletproof Robustness (Beat Parasolid)

| Problem | Solution | Paper |
|---------|----------|-------|
| Boolean failures | Exact predicates | Shewchuk's adaptive arithmetic |
| Trim curve gaps | Watertightization | [2402.10216] |
| Containment edge cases | GWN queries | [2504.11435] |
| Mesh self-intersection | Interactive booleans | [2205.14151] — 200K tris at 30fps |

**Already integrated:** 5 arXiv papers on boolean robustness (see `/docs/research/`)

### 3. Real-Time Collaboration (Beat Onshape)

| Component | Technology | Paper |
|-----------|------------|-------|
| Document sync | **CRDTs** | Collabs [2212.02618] — 100+ simultaneous users |
| Conflict resolution | Operational Transform | [1905.01517] real-world analysis |
| Presence | WebSocket + Y.js | — |

**Advantage:** vcad's DAG-based document model is already CRDT-friendly. Unlike Onshape's server-round-trip, vcad can do local-first with eventual consistency.

### 4. Topology Optimization (Beat Fusion's generative design)

| Method | Use Case | Paper |
|--------|----------|-------|
| SIMP | Structural optimization | [1009.4975] dynamic adaptive mesh |
| Lattice structures | Lightweighting | [2303.03866] fillet-aware lattices |
| RL-guided | Diverse designs | [2008.07119] reinforcement learning |
| Multi-scale | Graded materials | [2303.08710] buckling-aware |

**Implementation path:**
1. Voxelize B-rep → density field
2. FEA on density field (integrate `nalgebra-sparse`)
3. SIMP iteration → updated density
4. Marching cubes → mesh → B-rep reconstruction

### 5. GPU-Accelerated Everything (10-100x speedup)

| Operation | GPU Method | Expected Speedup |
|-----------|------------|------------------|
| NURBS evaluation | De Boor on compute shader | 50x |
| Boolean SSI | Parallel face-pairs via `wgpu` | 20x |
| Tessellation | Hardware tessellator | 100x |
| Collision detection | BVH on GPU | 30x |

**Rust stack:** `wgpu` for WebGPU/Vulkan, `rayon` for CPU parallelism

---

## Phase 19: PCB Design (Unified MCAD-ECAD)

**Goal:** First-class PCB design integrated with mechanical CAD.

No tool does this well:
- Design enclosure in vcad → auto-place mounting holes for PCB
- Define thermal zones → route high-power traces away
- Mechanical interference checking with assembled PCB

### PCB Architecture

```
vcad-pcb/
├── crates/
│   ├── vcad-pcb-ir/           # PCB intermediate representation
│   │   ├── component.rs       # Footprints, pads, pins
│   │   ├── net.rs             # Netlist, connections
│   │   ├── layer.rs           # Stackup, copper layers
│   │   └── rules.rs           # Design rules (clearance, width)
│   ├── vcad-pcb-router/       # Autorouting engine
│   │   ├── astar.rs           # Pathfinding
│   │   ├── congestion.rs      # Congestion-aware routing
│   │   └── differential.rs    # Differential pair routing
│   ├── vcad-pcb-placer/       # Component placement
│   │   ├── force_directed.rs  # Force-directed placement
│   │   └── ml_placer.rs       # ML-based placement
│   └── vcad-pcb-drc/          # Design rule checking
│       ├── clearance.rs       # Copper clearance
│       └── manufacturing.rs   # Fab constraints
└── packages/
    └── pcb-engine/            # WASM binding for web app
```

### PCB Research

| Feature | Algorithm | Paper |
|---------|-----------|-------|
| **Auto-routing** | A* with congestion awareness | [2303.01648] |
| **Placement optimization** | AI chip placement | [2407.15026] ChiPBench |
| **DRC** | Constraint propagation | GPU solvers [2207.12116] |
| **Defect detection** | ChangeChip | [2109.05746] |
| **Nanomodular routing** | Algorithmic tradeoffs | [2510.03126] — 108x speedup |

---

## Competitive Matrix (Post-Implementation)

| Feature | Fusion | CATIA | NX | Onshape | Shapr3D | FreeCAD | **vcad** |
|---------|--------|-------|-----|---------|---------|---------|----------|
| AI Text-to-CAD | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | **✅** |
| Point Cloud → CAD | 🔶 | 🔶 | 🔶 | ❌ | ❌ | ❌ | **✅** |
| Generative Design | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | **✅** |
| Real-Time Collab | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | **✅** |
| Local-First | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ | **✅** |
| Open Source | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | **✅** |
| API-First | 🔶 | ❌ | ❌ | ✅ | ❌ | 🔶 | **✅** |
| PCB Integration | 🔶 | ❌ | ❌ | ❌ | ❌ | 🔶 | **✅** |
| GPU Acceleration | ❌ | ❌ | 🔶 | ❌ | ❌ | ❌ | **✅** |
| Self-Hosted | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | **✅** |
| Price | $$$$ | $$$$$ | $$$$$ | $$$ | $$ | Free | **Free** |

---

## Research-to-Implementation Priorities

### Phase A: Robustness Foundation (Now)
1. **Exact predicates** for boolean operations — Shewchuk's adaptive arithmetic
2. **Parallel boolean pipeline** with `rayon` — instant 4-8x speedup
3. **Performance benchmarking** suite — establish baseline metrics

### Phase B: AI Core (Q2)
4. **CAD-MLLM integration** — text/image → parametric CAD
5. **Sketch constraint inference** — ML-based suggestion
6. **P2CADNet** — point cloud reconstruction

### Phase C: PCB MVP (Q3)
7. **PCB IR types** — components, nets, layers
8. **Basic autorouter** — A* with congestion
9. **KiCad import** — leverage existing designs

### Phase D: Performance (Q4)
10. **GPU tessellation** — wgpu compute shaders
11. **CRDT collaboration** — Collabs-inspired sync
12. **Topology optimization** — SIMP + marching cubes

---

## Key arXiv Papers to Implement

| Paper | ID | Category | Why |
|-------|-----|----------|-----|
| CAD-MLLM | 2411.04954 | AI | Multimodal CAD generation |
| CAD-Recode | 2412.14042 | AI | Point cloud → Python CAD code |
| P2CADNet | 2310.02638 | AI | End-to-end point cloud → CAD |
| Interactive Booleans | 2205.14151 | Kernel | 30fps on 200K triangles |
| Collabs CRDT | 2212.02618 | Collab | 100+ user collaboration |
| ChiPBench | 2407.15026 | PCB | AI chip/PCB placement |
| Nanomodular Routing | 2510.03126 | PCB | 108x routing speedup |
| Physics-Informed AM | 2407.10761 | DFM | Smart manufacturing |
| Body-and-CAD Rigidity | 1006.1126 | Kernel | Constraint theory foundation |
| BRT Transformer | 2504.07134 | AI | B-rep learning |
| FilletRec | 2511.05561 | AI | ML fillet detection |
| SketchAgent | 2411.17673 | AI | Language-driven sketching |

---

## Technical Architecture

### Kernel Design
- **Half-edge B-rep topology** (arena-based with `slotmap`)
- **Analytic surfaces:** Plane, Cylinder, Cone, Sphere, Bilinear patches
- **NURBS:** B-spline curves/surfaces with De Boor evaluation, rational NURBS
- **Trait-based geometry abstraction** (`Surface`, `Curve3d`, `Curve2d`)

### Constraint Solver
- **Algorithm:** Levenberg-Marquardt with adaptive damping (λ ∈ [1e-12, 1e12])
- **Jacobian:** Numerical via finite differences (opportunity: autodiff)
- **Constraints:** Coincident, Horizontal, Vertical, Parallel, Perpendicular, Tangent, Distance, Length, Radius, Angle, Equal Length, Fixed

### Boolean Pipeline (4-stage)
1. **AABB Filter** — Broadphase candidate detection
2. **Surface-Surface Intersection** — Analytic solutions + sampled fallback
3. **Face Classification** — Ray casting + winding number
4. **Sewing** — Trim, split, merge with topology repair

### Research Integration
vcad already incorporates arXiv research:
- [2310.10351] Post-boolean topology repair
- [2402.10216] Watertight trim handling
- [2504.11435, 2510.25159] Robust containment queries
- [2512.23719] Adaptive tessellation

---

## Phase Details

### Phase 10: STEP Import/Export

The kernel crate `vcad-kernel-step` implements STEP AP214 read/write for B-rep solids:
- `read_step(path)` → `Vec<BRepSolid>`
- `write_step(solid, path)`

**Gaps:**
- Not wired into high-level `vcad` crate or web/app flows
- CLI only supports STL export (GLB stub exists)
- No STEP import in web app

### Phase 13: Assembly + Joints

**What's done:**
- TS IR types: `Joint`, `JointKind`, `Instance`, `partDefs`, `groundInstanceId`
- Forward kinematics solver (`packages/engine/src/kinematics.ts`)
- App UI: FeatureTree shows instances/joints, PropertyPanel has joint state sliders
- Document store has `setInstanceTransform`, `setInstanceMaterial`, `setJointState` actions

**Gaps:**
- Rust IR (`vcad-ir`) doesn't have `Instance`/`Joint`/`partDefs` types
- Engine evaluator still builds meshes from `doc.roots` only
- No UI for creating/editing joints
- No interference detection

### Phase 14: 2D Drafting

**Goal:** Technical drawings from 3D models.

- Projection with hidden line removal
- Views: Front, Top, Right, Isometric, Section, Detail
- Dimensions: Linear, angular, radial, GD&T
- Notes, balloons, BOM

### Phase 15: Headless Mode + API

**What's done:**
- Rust CLI: `vcad tui`, `vcad export input.vcad output.stl`, `vcad info file.vcad`
- JS CLI: TUI runner using Ink + @vcad/engine
- MCP server: `create_cad_document`, `export_cad` (STL/GLB), `inspect_cad`

**Gaps:**
- No REST API
- No GitHub Actions integration
- CLI doesn't support STEP/GLB export
- No batch processing

### Phase 16: Plugin System

- Plugin API (Rust traits + WASM)
- Custom primitives, operations, exporters
- Plugin marketplace
- Example plugins: gear generator, thread creator, sheet metal

### Phase 17: Real-Time Collaboration

- CRDT-based document sync
- Presence indicators (cursors, selections)
- Comments on geometry
- Version history with branching

### Phase 18: AI-Assisted Design

- Natural language → sketch constraints
- "Make this fit inside a 100mm cube"
- Design suggestions based on manufacturing constraints
- Auto-fillet for printability

---

## Immediate Next Steps

### Assembly Evaluation (13a)
1. Update `packages/engine/src/evaluate.ts` to evaluate partDefs → meshes
2. Apply kinematics to instances
3. Export kinematics solver from engine

### Rust IR Parity (13b)
1. Add `Instance`, `Joint`, `JointKind`, `PartDef` to `crates/vcad-ir/src/lib.rs`
2. Add assembly fields to `Document`
3. Update serde for JSON compat

### STEP Wiring (10a + 10b)
1. Add `step` feature to `crates/vcad/Cargo.toml`
2. Add `Part::from_step(path)` and `Part::to_step(path)`
3. Add `--format step` to CLI

### Performance Quick Wins
1. Add `rayon` to parallelize boolean face-pair processing
2. Integrate Shewchuk's exact predicates for containment queries
3. Create benchmark suite

### PCB Foundation
1. Create `vcad-pcb-ir` crate with component/net/layer types
2. Implement basic DRC (clearance checking)
3. KiCad footprint import

---

## The Moat

**Why vcad will win:**

1. **Open Research Loop** — We integrate SIGGRAPH/Eurographics/arXiv papers within weeks of publication. Commercial vendors take years.

2. **Rust Safety** — Memory safety eliminates entire class of kernel crashes that plague ACIS/Parasolid.

3. **AI-First Architecture** — MCP server enables Claude/GPT integration. No bolted-on AI features.

4. **Cloud-Native + Local-First** — WASM compilation enables browser CAD. No mandatory cloud dependency.

5. **Unified MCAD-ECAD** — First tool to properly integrate mechanical and electronic design.

6. **Community Velocity** — Open source means thousands of contributors vs. hundreds of employees.

The research exists. The architecture is clean. The moment is now.
