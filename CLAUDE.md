# CLAUDE.md

Instructions for AI agents working on vcad.

## Overview

vcad is a parametric CAD ecosystem in Rust and TypeScript. It provides CSG primitives, boolean operations, transforms, and multi-format export (STL, glTF, USD, DXF). Built on [manifold-rs](https://crates.io/crates/manifold-rs) for geometry.

The repo is a Cargo + npm workspace with a shared intermediate representation (`vcad-ir` / `@vcad/ir`).

## Commands

```bash
# Rust
cargo test --workspace             # run all tests
cargo clippy --workspace -- -D warnings  # lint — must pass clean
cargo fmt --all --check            # formatting check
cargo build --workspace --examples # verify examples compile
cargo doc --workspace --no-deps    # build docs

# TypeScript
npm ci                             # install deps
npm run build --workspaces         # build all TS packages
npm test --workspaces --if-present # run all TS tests
```

## Architecture

```
vcad/
├── Cargo.toml                    # workspace manifest
├── package.json                  # npm workspace root
├── crates/
│   ├── vcad-ir/                  # IR types (shared DAG representation)
│   │   ├── Cargo.toml
│   │   └── src/lib.rs
│   └── vcad/                     # main CAD library
│       ├── Cargo.toml
│       ├── src/
│       │   ├── lib.rs            # Part, Scene, primitives, CSG, transforms, inspection
│       │   ├── step.rs           # STEP export (optional, requires OpenCASCADE)
│       │   └── export/
│       │       ├── mod.rs        # Re-exports
│       │       ├── stl.rs        # Binary STL export
│       │       ├── gltf.rs       # GLB export (single + multi-material scene)
│       │       ├── usd.rs        # USD/USDA with physics (Isaac Sim)
│       │       ├── dxf.rs        # DXF R12 for laser cutting
│       │       └── materials.rs  # PBR material database from TOML
│       └── examples/
│           ├── mascot.rs         # Multi-material robot mascot (STL + GLB)
│           ├── plate.rs          # Simple plate with holes
│           ├── bracket.rs        # L-bracket with mounting holes
│           └── generate_renders.rs
├── packages/
│   ├── ir/                       # @vcad/ir — TypeScript IR types
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts
│   │       └── __tests__/
│   │           └── document.test.ts
│   └── engine/                   # @vcad/engine — CSG evaluation via manifold-3d WASM
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts          # Engine class (async init + sync evaluate)
│           ├── mesh.ts           # Output types (TriangleMesh, EvaluatedScene)
│           ├── evaluate.ts       # DAG evaluator (IR → manifold-3d → mesh)
│           └── __tests__/
│               └── evaluate.test.ts
└── web/                          # vcad.io landing page (GitHub Pages)
```

## Key types

### Rust (`vcad` crate)
- **`Part`** — named geometry. Created from primitives, combined with CSG, transformed, exported.
- **`Scene`** — multi-part assembly with per-part material keys.
- **`Materials`** — PBR material database parsed from TOML.
- **`DxfDocument`** — 2D profile builder for laser cutting.
- **`CadError`** — error type for export operations.

### IR (`vcad-ir` / `@vcad/ir`)
- **`NodeId`** — `u64` node identifier.
- **`Vec3`** — 3D vector `{ x, y, z }`.
- **`CsgOp`** — tagged enum of primitives and boolean/transform operations.
- **`Node`** — `{ id, name, op }` graph node.
- **`MaterialDef`** — PBR material with physics properties.
- **`Document`** — the `.vcad` file: nodes, materials, scene entries.

## Conventions

- `#![warn(missing_docs)]` is enforced — all public items need `///` doc comments.
- Tests go in `#[cfg(test)] mod tests` at the bottom of each file.
- Operator overloads: `+` (union), `-` (difference), `&` (intersection) on `Part`.
- Manifold-rs doesn't expose inspection methods, so volume/area/bbox are computed from mesh data in `lib.rs`.
- Feature flags: `gltf` (default on), `step` (requires OCCT), `usd` (always compiled).
- Units are `f64`, conventionally millimeters.
- IR types use `#[serde(tag = "type")]` for clean JSON discrimination.

## Adding new functionality

- New primitives/transforms: add to `impl Part` in `crates/vcad/src/lib.rs`, add test.
- New export format: create `crates/vcad/src/export/<format>.rs`, add `pub mod` in `export/mod.rs`.
- New inspection method: add to the mesh inspection `impl Part` block in `lib.rs`, compute from `self.manifold.to_mesh()`.
- New IR operation: add variant to `CsgOp` in `crates/vcad-ir/src/lib.rs` AND `packages/ir/src/index.ts`.
- Always run `cargo clippy --workspace -- -D warnings` and `cargo test --workspace` after changes.
