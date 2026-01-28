#![warn(missing_docs)]

//! CSG boolean operations on B-rep solids for the vcad kernel.
//!
//! Implements union, difference, and intersection of B-rep solids.
//!
//! The boolean pipeline has 4 stages:
//! 1. **AABB filter** — broadphase to find candidate face pairs
//! 2. **SSI** — surface-surface intersection for each candidate pair
//! 3. **Classification** — label sub-faces as IN/OUT/ON
//! 4. **Reconstruction** — sew selected faces into the result solid
//!
//! Phase 2 is building this pipeline incrementally. The mesh-based
//! fallback from Phase 1 remains as a backup.

pub mod bbox;
pub mod classify;
pub mod sew;
pub mod split;
pub mod ssi;
pub mod trim;

use vcad_kernel_math::Point3;
use vcad_kernel_primitives::BRepSolid;
use vcad_kernel_tessellate::{tessellate_brep, TriangleMesh};

/// CSG boolean operation type.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BooleanOp {
    /// Union: combine both solids.
    Union,
    /// Difference: subtract the tool from the target.
    Difference,
    /// Intersection: keep only the overlapping region.
    Intersection,
}

/// Result of a boolean operation.
///
/// In Phase 1, this is a mesh-only result (no B-rep topology).
/// In Phase 2, this will contain a full BRepSolid.
#[derive(Debug, Clone)]
pub enum BooleanResult {
    /// Mesh-only result (Phase 1 fallback).
    Mesh(TriangleMesh),
    /// Full B-rep result (Phase 2, not yet implemented).
    BRep(Box<BRepSolid>),
}

impl BooleanResult {
    /// Get the triangle mesh, tessellating if needed.
    pub fn to_mesh(&self, _segments: u32) -> TriangleMesh {
        match self {
            BooleanResult::Mesh(m) => m.clone(),
            BooleanResult::BRep(brep) => tessellate_brep(brep.as_ref(), _segments),
        }
    }
}

/// Perform a CSG boolean operation on two B-rep solids.
///
/// Uses a B-rep classification pipeline:
/// 1. AABB filter to check for overlap
/// 2. Classify each face of A relative to B and vice versa
/// 3. Select faces based on the boolean operation
/// 4. Sew selected faces into a result solid
///
/// For non-overlapping solids, shortcuts are taken (e.g., union is
/// just both solids combined). Falls back to mesh-based approach
/// when the B-rep pipeline can't handle a case.
pub fn boolean_op(
    solid_a: &BRepSolid,
    solid_b: &BRepSolid,
    op: BooleanOp,
    segments: u32,
) -> BooleanResult {
    // Check if solids overlap at all
    let aabb_a = bbox::solid_aabb(solid_a);
    let aabb_b = bbox::solid_aabb(solid_b);

    if !aabb_a.overlaps(&aabb_b) {
        // No overlap — shortcut
        return non_overlapping_boolean(solid_a, solid_b, op, segments);
    }

    // Solids overlap — use classification pipeline
    brep_boolean(solid_a, solid_b, op, segments)
}

/// Handle boolean operations on non-overlapping solids.
fn non_overlapping_boolean(
    solid_a: &BRepSolid,
    solid_b: &BRepSolid,
    op: BooleanOp,
    _segments: u32,
) -> BooleanResult {
    match op {
        BooleanOp::Union => {
            // Union of non-overlapping = both solids combined
            let faces_a: Vec<_> = solid_a.topology.faces.keys().collect();
            let faces_b: Vec<_> = solid_b.topology.faces.keys().collect();
            let result = sew::sew_faces(solid_a, &faces_a, solid_b, &faces_b, false, 1e-6);
            BooleanResult::BRep(Box::new(result))
        }
        BooleanOp::Difference => {
            // Difference with non-overlapping = just A (nothing to subtract)
            let faces_a: Vec<_> = solid_a.topology.faces.keys().collect();
            let result = sew::sew_faces(solid_a, &faces_a, solid_b, &[], false, 1e-6);
            BooleanResult::BRep(Box::new(result))
        }
        BooleanOp::Intersection => {
            // Intersection of non-overlapping = empty
            BooleanResult::Mesh(TriangleMesh {
                vertices: Vec::new(),
                indices: Vec::new(),
            })
        }
    }
}

/// B-rep boolean pipeline for overlapping solids.
fn brep_boolean(
    solid_a: &BRepSolid,
    solid_b: &BRepSolid,
    op: BooleanOp,
    segments: u32,
) -> BooleanResult {
    // Classify all faces of A relative to B
    let classes_a = classify::classify_all_faces(solid_a, solid_b, segments);
    // Classify all faces of B relative to A
    let classes_b = classify::classify_all_faces(solid_b, solid_a, segments);

    // Select which faces to keep
    let (keep_a, keep_b, reverse_b) = classify::select_faces(op, &classes_a, &classes_b);

    // Sew the selected faces together
    let result = sew::sew_faces(solid_a, &keep_a, solid_b, &keep_b, reverse_b, 1e-6);

    BooleanResult::BRep(Box::new(result))
}

/// Test if a point is inside a closed triangle mesh using ray casting.
///
/// Casts a ray along a slightly tilted direction from the point and counts
/// intersections using the Möller-Trumbore algorithm.
/// Odd count = inside, even count = outside.
///
/// The ray direction is slightly off-axis to avoid hitting triangle edges
/// exactly (which would cause double-counting on shared edges).
pub fn point_in_mesh(point: &Point3, mesh: &TriangleMesh) -> bool {
    let verts = &mesh.vertices;
    let indices = &mesh.indices;
    let mut crossings = 0u32;

    // Slightly tilted ray direction to avoid hitting edges/vertices exactly
    let ray_dir = [1.0f64, 1e-7, 1.3e-7];

    for tri in indices.chunks(3) {
        let i0 = tri[0] as usize * 3;
        let i1 = tri[1] as usize * 3;
        let i2 = tri[2] as usize * 3;

        let v0 = [verts[i0] as f64, verts[i0 + 1] as f64, verts[i0 + 2] as f64];
        let v1 = [verts[i1] as f64, verts[i1 + 1] as f64, verts[i1 + 2] as f64];
        let v2 = [verts[i2] as f64, verts[i2 + 1] as f64, verts[i2 + 2] as f64];

        // Möller-Trumbore ray-triangle intersection
        let edge1 = [v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2]];
        let edge2 = [v2[0] - v0[0], v2[1] - v0[1], v2[2] - v0[2]];

        // h = ray_dir × edge2
        let h = [
            ray_dir[1] * edge2[2] - ray_dir[2] * edge2[1],
            ray_dir[2] * edge2[0] - ray_dir[0] * edge2[2],
            ray_dir[0] * edge2[1] - ray_dir[1] * edge2[0],
        ];

        let a = edge1[0] * h[0] + edge1[1] * h[1] + edge1[2] * h[2];
        if a.abs() < 1e-15 {
            continue; // Ray parallel to triangle
        }

        let f = 1.0 / a;
        let s = [point.x - v0[0], point.y - v0[1], point.z - v0[2]];
        let u = f * (s[0] * h[0] + s[1] * h[1] + s[2] * h[2]);
        if !(0.0..=1.0).contains(&u) {
            continue;
        }

        // q = s × edge1
        let q = [
            s[1] * edge1[2] - s[2] * edge1[1],
            s[2] * edge1[0] - s[0] * edge1[2],
            s[0] * edge1[1] - s[1] * edge1[0],
        ];

        let v = f * (ray_dir[0] * q[0] + ray_dir[1] * q[1] + ray_dir[2] * q[2]);
        if v < 0.0 || u + v > 1.0 {
            continue;
        }

        let t = f * (edge2[0] * q[0] + edge2[1] * q[1] + edge2[2] * q[2]);
        if t > 1e-10 {
            crossings += 1;
        }
    }

    crossings % 2 == 1
}

#[cfg(test)]
mod tests {
    use super::*;
    use vcad_kernel_primitives::make_cube;

    #[test]
    fn test_point_in_cube_mesh() {
        let brep = make_cube(10.0, 10.0, 10.0);
        let mesh = tessellate_brep(&brep, 32);

        // Point inside the cube
        assert!(point_in_mesh(&Point3::new(5.0, 5.0, 5.0), &mesh));
        // Point outside the cube
        assert!(!point_in_mesh(&Point3::new(15.0, 5.0, 5.0), &mesh));
        assert!(!point_in_mesh(&Point3::new(-1.0, 5.0, 5.0), &mesh));
    }

    #[test]
    fn test_union_overlapping() {
        // Partially overlapping cubes
        let a = make_cube(10.0, 10.0, 10.0);
        let mut b = make_cube(10.0, 10.0, 10.0);
        for (_, v) in &mut b.topology.vertices {
            v.point.x += 5.0; // shift B by half
        }
        let result = boolean_op(&a, &b, BooleanOp::Union, 32);
        // Overlapping booleans return BRep
        assert!(matches!(result, BooleanResult::BRep(_)));
        let mesh = result.to_mesh(32);
        assert!(mesh.num_triangles() > 0);
    }

    #[test]
    fn test_difference_overlapping() {
        let a = make_cube(10.0, 10.0, 10.0);
        let b = make_cube(5.0, 5.0, 5.0);
        let result = boolean_op(&a, &b, BooleanOp::Difference, 32);
        let mesh = result.to_mesh(32);
        assert!(mesh.num_triangles() > 0);
    }

    #[test]
    fn test_non_overlapping_union() {
        let a = make_cube(10.0, 10.0, 10.0);
        let mut b = make_cube(10.0, 10.0, 10.0);
        for (_, v) in &mut b.topology.vertices {
            v.point.x += 100.0;
        }
        let result = boolean_op(&a, &b, BooleanOp::Union, 32);
        // Non-overlapping union returns BRep with all faces
        assert!(matches!(result, BooleanResult::BRep(_)));
        let mesh = result.to_mesh(32);
        assert!(mesh.num_triangles() > 0);
    }

    #[test]
    fn test_non_overlapping_intersection() {
        let a = make_cube(10.0, 10.0, 10.0);
        let mut b = make_cube(10.0, 10.0, 10.0);
        for (_, v) in &mut b.topology.vertices {
            v.point.x += 100.0;
        }
        let result = boolean_op(&a, &b, BooleanOp::Intersection, 32);
        // Non-overlapping intersection returns empty mesh
        assert!(matches!(result, BooleanResult::Mesh(_)));
        let mesh = result.to_mesh(32);
        assert_eq!(mesh.num_triangles(), 0);
    }

    #[test]
    fn test_non_overlapping_difference() {
        let a = make_cube(10.0, 10.0, 10.0);
        let mut b = make_cube(10.0, 10.0, 10.0);
        for (_, v) in &mut b.topology.vertices {
            v.point.x += 100.0;
        }
        let result = boolean_op(&a, &b, BooleanOp::Difference, 32);
        // Non-overlapping difference returns just A
        assert!(matches!(result, BooleanResult::BRep(_)));
        let mesh = result.to_mesh(32);
        assert!(mesh.num_triangles() > 0);
    }
}
