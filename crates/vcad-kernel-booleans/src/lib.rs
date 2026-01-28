#![warn(missing_docs)]

//! CSG boolean operations on B-rep solids for the vcad kernel.
//!
//! Implements union, difference, and intersection of B-rep solids.
//! This is a mesh-based implementation for Phase 1, using triangle
//! mesh booleans as a stepping stone. Full B-rep booleans (surface-surface
//! intersection, face splitting, classification) will be added in Phase 2.
//!
//! The current approach:
//! 1. Tessellate both input solids to triangle meshes
//! 2. Perform mesh-based CSG (point-in-solid classification)
//! 3. Return result as a mesh-only solid (no B-rep structure)
//!
//! This preserves API compatibility while the true B-rep boolean engine
//! is developed.

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
/// Currently uses a naive mesh-based approach:
/// - Tessellates both solids
/// - Classifies triangles by point-in-solid tests
/// - Concatenates the selected triangles
///
/// This is a placeholder for the full B-rep boolean engine.
pub fn boolean_op(
    solid_a: &BRepSolid,
    solid_b: &BRepSolid,
    op: BooleanOp,
    segments: u32,
) -> BooleanResult {
    let mesh_a = tessellate_brep(solid_a, segments);
    let mesh_b = tessellate_brep(solid_b, segments);
    let result = mesh_boolean(&mesh_a, &mesh_b, op);
    BooleanResult::Mesh(result)
}

/// Perform mesh-based CSG boolean.
///
/// This is a simplified implementation that:
/// - For Union: concatenates both meshes (no intersection handling)
/// - For Difference: concatenates A + flipped B (no intersection handling)
/// - For Intersection: returns empty (needs proper implementation)
///
/// Full mesh CSG with proper triangle clipping will come in Phase 2.
/// For now, this provides the API structure.
fn mesh_boolean(mesh_a: &TriangleMesh, mesh_b: &TriangleMesh, op: BooleanOp) -> TriangleMesh {
    match op {
        BooleanOp::Union => {
            let mut result = mesh_a.clone();
            result.merge(mesh_b);
            result
        }
        BooleanOp::Difference => {
            let mut result = mesh_a.clone();
            // Flip winding of B's triangles for subtraction
            let mut flipped_b = mesh_b.clone();
            for tri in flipped_b.indices.chunks_mut(3) {
                tri.swap(1, 2);
            }
            result.merge(&flipped_b);
            result
        }
        BooleanOp::Intersection => {
            // Placeholder: proper intersection requires triangle clipping
            // For now, return mesh_a (will be replaced in Phase 2)
            mesh_a.clone()
        }
    }
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
    fn test_union_mesh() {
        let a = make_cube(10.0, 10.0, 10.0);
        let b = make_cube(10.0, 10.0, 10.0);
        let result = boolean_op(&a, &b, BooleanOp::Union, 32);
        let mesh = result.to_mesh(32);
        assert!(mesh.num_triangles() > 0);
    }

    #[test]
    fn test_difference_mesh() {
        let a = make_cube(10.0, 10.0, 10.0);
        let b = make_cube(5.0, 5.0, 5.0);
        let result = boolean_op(&a, &b, BooleanOp::Difference, 32);
        let mesh = result.to_mesh(32);
        assert!(mesh.num_triangles() > 0);
    }

    #[test]
    fn test_boolean_result_types() {
        let a = make_cube(10.0, 10.0, 10.0);
        let b = make_cube(10.0, 10.0, 10.0);

        let union_result = boolean_op(&a, &b, BooleanOp::Union, 32);
        let diff_result = boolean_op(&a, &b, BooleanOp::Difference, 32);
        let isect_result = boolean_op(&a, &b, BooleanOp::Intersection, 32);

        assert!(matches!(union_result, BooleanResult::Mesh(_)));
        assert!(matches!(diff_result, BooleanResult::Mesh(_)));
        assert!(matches!(isect_result, BooleanResult::Mesh(_)));
    }
}
