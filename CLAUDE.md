# CLAUDE.md

Instructions for AI agents working on vcad.

## Overview

vcad is a parametric CAD library in Rust. It provides CSG primitives, boolean operations, transforms, and multi-format export (STL, glTF, USD, DXF). Built on [manifold-rs](https://crates.io/crates/manifold-rs) for geometry.

## Commands

```bash
cargo test                    # run all tests (21 unit + 1 doctest)
cargo clippy -- -D warnings   # lint — must pass clean
cargo fmt --check             # formatting check
cargo build --examples        # verify examples compile
cargo doc --no-deps           # build docs (warns on missing docs)
```

## Architecture

```
vcad/
├── src/
│   ├── lib.rs              # Part, Scene, primitives, CSG, transforms, inspection
│   ├── step.rs             # STEP export (optional, requires OpenCASCADE)
│   └── export/
│       ├── mod.rs           # Re-exports
│       ├── stl.rs           # Binary STL export
│       ├── gltf.rs          # GLB export (single + multi-material scene)
│       ├── usd.rs           # USD/USDA with physics (Isaac Sim)
│       ├── dxf.rs           # DXF R12 for laser cutting
│       └── materials.rs     # PBR material database from TOML
├── examples/
│   ├── mascot.rs            # Multi-material robot mascot (STL + GLB)
│   ├── plate.rs             # Simple plate with holes
│   └── bracket.rs           # L-bracket with mounting holes
└── web/                     # vcad.io landing page (GitHub Pages)
```

## Key types

- **`Part`** — named geometry. Created from primitives, combined with CSG, transformed, exported.
- **`Scene`** — multi-part assembly with per-part material keys.
- **`Materials`** — PBR material database parsed from TOML.
- **`DxfDocument`** — 2D profile builder for laser cutting.
- **`CadError`** — error type for export operations.

## Conventions

- `#![warn(missing_docs)]` is enforced — all public items need `///` doc comments.
- Tests go in `#[cfg(test)] mod tests` at the bottom of each file.
- Operator overloads: `+` (union), `-` (difference), `&` (intersection) on `Part`.
- Manifold-rs doesn't expose inspection methods, so volume/area/bbox are computed from mesh data in `lib.rs`.
- Feature flags: `gltf` (default on), `step` (requires OCCT), `usd` (always compiled).
- Units are `f64`, conventionally millimeters.

## Adding new functionality

- New primitives/transforms: add to `impl Part` in `lib.rs`, add test.
- New export format: create `src/export/<format>.rs`, add `pub mod` in `export/mod.rs`.
- New inspection method: add to the mesh inspection `impl Part` block in `lib.rs`, compute from `self.manifold.to_mesh()`.
- Always run `cargo clippy -- -D warnings` and `cargo test` after changes.
