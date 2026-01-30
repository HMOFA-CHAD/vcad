# Boolean Robustness Research Notes (2026-01-29)

This document records the research-backed improvements applied to vcad boolean
operations and tessellation, along with the arXiv sources that motivated them.

## Sources

- 2310.10351: B-rep Boolean Resulting Model Repair by Correcting Intersection Edges
- 2402.10216: Watertightization of Trimmed Surfaces at Intersection Boundary
- 2504.11435: Robust Containment Queries over Collections of Trimmed NURBS Surfaces via GWN
- 2510.25159: Fast and Robust Point Containment Queries on Trimmed Surface
- 2512.23719: Survey of Geometry Preparation and Mesh Generation

## Implemented Changes

### Post-boolean topology repair (2310.10351)

Goal: Repair small topological defects after sewing to avoid gaps and orphan edges.

Implementation:
- Added a conservative repair pass that collapses degenerate half-edges, removes
  local A-B-A spikes, and pairs orphan half-edges.
- Wired into the sewing pipeline after vertex merge.

Files:
- crates/vcad-kernel-booleans/src/repair.rs
- crates/vcad-kernel-booleans/src/sew.rs

### Watertight trim handling + containment robustness (2402.10216, 2504.11435, 2510.25159)

Goals:
- Close tiny gaps between trimmed curve segments.
- Avoid seam artifacts on cylindrical faces.
- Treat boundary points as inside for containment.

Implementation:
- Merge adjacent trim segments when endpoints are within face-scale tolerance.
- Unwrap cylindrical UV loops across the seam and project test points into the
  same unwrapped space.
- Replaced integer winding with robust winding (atan2) and added boundary
  tolerance for point-in-polygon checks.

Files:
- crates/vcad-kernel-booleans/src/trim.rs

### Tessellation robustness (2512.23719)

Goal: Improve cylinder tessellation quality by balancing height sampling with
circumferential resolution.

Implementation:
- Adaptively raise cylinder height segments based on height-to-circumference
  ratio to reduce long skinny triangles.

Files:
- crates/vcad-kernel-tessellate/src/lib.rs
