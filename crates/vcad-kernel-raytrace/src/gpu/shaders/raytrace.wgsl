// Ray tracing compute shader for direct BRep rendering.
//
// This shader traces rays against analytic surfaces without tessellation,
// achieving pixel-perfect silhouettes at any zoom level.

// Constants
const SURFACE_PLANE: u32 = 0u;
const SURFACE_CYLINDER: u32 = 1u;
const SURFACE_SPHERE: u32 = 2u;
const SURFACE_CONE: u32 = 3u;
const SURFACE_TORUS: u32 = 4u;
const SURFACE_BILINEAR: u32 = 5u;

const MAX_T: f32 = 1e10;
const EPSILON: f32 = 1e-6;
const PI: f32 = 3.14159265359;

// Structures matching Rust definitions

struct GpuSurface {
    surface_type: u32,
    // Use explicit u32 padding instead of vec3<u32> to match Rust layout
    // vec3<u32> in WGSL has 16-byte alignment which would misalign params
    _pad0: u32,
    _pad1: u32,
    _pad2: u32,
    params: array<f32, 32>,
}

struct GpuFace {
    surface_idx: u32,
    orientation: u32,
    trim_start: u32,
    trim_count: u32,
    aabb_min: vec4<f32>,
    aabb_max: vec4<f32>,
    inner_start: u32,
    inner_count: u32,
    inner_loop_count: u32,
    inner_desc_start: u32,
}

struct GpuBvhNode {
    aabb_min: vec4<f32>,
    aabb_max: vec4<f32>,
    left_or_first: u32,
    right_or_count: u32,
    is_leaf: u32,
    _pad: u32,
}

struct Camera {
    position: vec4<f32>,
    look_at: vec4<f32>,
    up: vec4<f32>,
    fov: f32,
    width: u32,
    height: u32,
    _pad: u32,
}

struct RayHit {
    t: f32,
    face_idx: u32,
    uv: vec2<f32>,
}

// Bind groups

@group(0) @binding(0) var<uniform> camera: Camera;
@group(0) @binding(1) var<storage, read> surfaces: array<GpuSurface>;
@group(0) @binding(2) var<storage, read> faces: array<GpuFace>;
@group(0) @binding(3) var<storage, read> bvh_nodes: array<GpuBvhNode>;
@group(0) @binding(4) var<storage, read> trim_verts: array<vec2<f32>>;
@group(0) @binding(5) var<storage, read> inner_loop_descs: array<u32>;
@group(0) @binding(6) var output: texture_storage_2d<rgba8unorm, write>;

// Utility functions

fn ray_origin_and_direction(pixel: vec2<u32>) -> mat2x3<f32> {
    let aspect = f32(camera.width) / f32(camera.height);
    let fov_tan = tan(camera.fov * 0.5);

    // Compute normalized device coordinates
    let ndc = vec2<f32>(
        (f32(pixel.x) + 0.5) / f32(camera.width) * 2.0 - 1.0,
        1.0 - (f32(pixel.y) + 0.5) / f32(camera.height) * 2.0
    );

    // Build camera coordinate system
    let forward = normalize(camera.look_at.xyz - camera.position.xyz);
    let right = normalize(cross(forward, camera.up.xyz));
    let up = cross(right, forward);

    // Compute ray direction
    let dir = normalize(
        forward +
        right * ndc.x * fov_tan * aspect +
        up * ndc.y * fov_tan
    );

    return mat2x3<f32>(camera.position.xyz, dir);
}

fn intersect_aabb(origin: vec3<f32>, inv_dir: vec3<f32>, aabb_min: vec3<f32>, aabb_max: vec3<f32>) -> vec2<f32> {
    let t1 = (aabb_min - origin) * inv_dir;
    let t2 = (aabb_max - origin) * inv_dir;

    let t_min = min(t1, t2);
    let t_max = max(t1, t2);

    let t_enter = max(max(t_min.x, t_min.y), t_min.z);
    let t_exit = min(min(t_max.x, t_max.y), t_max.z);

    return vec2<f32>(t_enter, t_exit);
}

// Ray-surface intersection functions

fn intersect_plane(origin: vec3<f32>, dir: vec3<f32>, params: array<f32, 32>) -> RayHit {
    var hit: RayHit;
    hit.t = MAX_T;
    hit.face_idx = 0xFFFFFFFFu;

    let plane_origin = vec3<f32>(params[0], params[1], params[2]);
    let plane_normal = vec3<f32>(params[9], params[10], params[11]);

    let denom = dot(dir, plane_normal);
    if abs(denom) < EPSILON {
        return hit;
    }

    let t = dot(plane_origin - origin, plane_normal) / denom;
    if t < 0.0 {
        return hit;
    }

    hit.t = t;

    // Compute UV
    let p = origin + t * dir;
    let x_dir = vec3<f32>(params[3], params[4], params[5]);
    let y_dir = vec3<f32>(params[6], params[7], params[8]);
    let to_p = p - plane_origin;
    hit.uv = vec2<f32>(dot(to_p, x_dir), dot(to_p, y_dir));

    return hit;
}

fn intersect_sphere(origin: vec3<f32>, dir: vec3<f32>, params: array<f32, 32>) -> RayHit {
    var hit: RayHit;
    hit.t = MAX_T;
    hit.face_idx = 0xFFFFFFFFu;

    let center = vec3<f32>(params[0], params[1], params[2]);
    let radius = params[3];

    let oc = origin - center;
    let a = dot(dir, dir);
    let b = 2.0 * dot(oc, dir);
    let c = dot(oc, oc) - radius * radius;

    let disc = b * b - 4.0 * a * c;
    if disc < 0.0 {
        return hit;
    }

    let sqrt_disc = sqrt(disc);
    var t = (-b - sqrt_disc) / (2.0 * a);
    if t < 0.0 {
        t = (-b + sqrt_disc) / (2.0 * a);
    }
    if t < 0.0 {
        return hit;
    }

    hit.t = t;

    // Compute UV (spherical coordinates)
    let p = origin + t * dir;
    let ref_dir = vec3<f32>(params[4], params[5], params[6]);
    let axis = vec3<f32>(params[7], params[8], params[9]);
    let y_dir = cross(axis, ref_dir);

    let to_p = normalize((p - center) / radius);
    let z = clamp(dot(to_p, axis), -1.0, 1.0);
    let v = asin(z);

    let proj = to_p - z * axis;
    let proj_len = length(proj);
    var u = 0.0;
    if proj_len > EPSILON {
        let x = dot(proj, ref_dir) / proj_len;
        let y = dot(proj, y_dir) / proj_len;
        u = atan2(y, x);
        if u < 0.0 { u += 2.0 * PI; }
    }

    hit.uv = vec2<f32>(u, v);
    return hit;
}

fn intersect_cylinder(origin: vec3<f32>, dir: vec3<f32>, params: array<f32, 32>) -> RayHit {
    var hit: RayHit;
    hit.t = MAX_T;
    hit.face_idx = 0xFFFFFFFFu;

    let center = vec3<f32>(params[0], params[1], params[2]);
    let axis = vec3<f32>(params[3], params[4], params[5]);
    let ref_dir = vec3<f32>(params[6], params[7], params[8]);
    let radius = params[9];

    let oc = origin - center;

    // Project onto plane perpendicular to axis
    let d_perp = dir - dot(dir, axis) * axis;
    let oc_perp = oc - dot(oc, axis) * axis;

    let a = dot(d_perp, d_perp);
    if a < EPSILON {
        return hit; // Ray parallel to axis
    }

    let b = 2.0 * dot(oc_perp, d_perp);
    let c = dot(oc_perp, oc_perp) - radius * radius;

    let disc = b * b - 4.0 * a * c;
    if disc < 0.0 {
        return hit;
    }

    let sqrt_disc = sqrt(disc);
    var t = (-b - sqrt_disc) / (2.0 * a);
    if t < 0.0 {
        t = (-b + sqrt_disc) / (2.0 * a);
    }
    if t < 0.0 {
        return hit;
    }

    hit.t = t;

    // Compute UV
    let p = origin + t * dir;
    let y_dir = cross(axis, ref_dir);
    let to_p = p - center;
    let v = dot(to_p, axis);
    let proj = to_p - v * axis;
    let x = dot(proj, ref_dir);
    let y = dot(proj, y_dir);
    var u = atan2(y, x);
    if u < 0.0 { u += 2.0 * PI; }

    hit.uv = vec2<f32>(u, v);
    return hit;
}

fn intersect_surface(origin: vec3<f32>, dir: vec3<f32>, surface_idx: u32) -> RayHit {
    let surface = surfaces[surface_idx];

    switch surface.surface_type {
        case SURFACE_PLANE: {
            return intersect_plane(origin, dir, surface.params);
        }
        case SURFACE_SPHERE: {
            return intersect_sphere(origin, dir, surface.params);
        }
        case SURFACE_CYLINDER: {
            return intersect_cylinder(origin, dir, surface.params);
        }
        default: {
            var hit: RayHit;
            hit.t = MAX_T;
            hit.face_idx = 0xFFFFFFFFu;
            return hit;
        }
    }
}

// Compute winding number for a single polygon
fn winding_number_polygon(uv: vec2<f32>, start: u32, count: u32) -> i32 {
    if count < 3u {
        return 0;
    }

    var winding: i32 = 0;

    for (var i = 0u; i < count; i++) {
        let p1 = trim_verts[start + i];
        let p2 = trim_verts[start + ((i + 1u) % count)];

        if p1.y <= uv.y {
            if p2.y > uv.y {
                let cross_val = (p2.x - p1.x) * (uv.y - p1.y) - (uv.x - p1.x) * (p2.y - p1.y);
                if cross_val > 0.0 {
                    winding++;
                }
            }
        } else {
            if p2.y <= uv.y {
                let cross_val = (p2.x - p1.x) * (uv.y - p1.y) - (uv.x - p1.x) * (p2.y - p1.y);
                if cross_val < 0.0 {
                    winding--;
                }
            }
        }
    }

    return winding;
}

// Simple AABB check for outer loop (for debugging)
fn uv_in_trim_bounds(uv: vec2<f32>, start: u32, count: u32) -> bool {
    if count == 0u {
        return false;
    }

    var min_uv = trim_verts[start];
    var max_uv = trim_verts[start];

    for (var i = 1u; i < count; i++) {
        let v = trim_verts[start + i];
        min_uv = min(min_uv, v);
        max_uv = max(max_uv, v);
    }

    // Add small epsilon for numerical tolerance
    let eps = 0.001;
    return uv.x >= min_uv.x - eps && uv.x <= max_uv.x + eps &&
           uv.y >= min_uv.y - eps && uv.y <= max_uv.y + eps;
}

// Point-in-polygon test with inner loops (holes)
fn point_in_face(uv: vec2<f32>, face_idx: u32) -> bool {
    let face = faces[face_idx];

    // Check outer loop - point must be inside
    if face.trim_count < 3u {
        // For faces with < 3 trim vertices (e.g., full cylinder walls),
        // the 2 vertices define a v-range (height bounds).
        // The u-coordinate wraps around 0 to 2π.
        if face.trim_count == 2u {
            let v1 = trim_verts[face.trim_start];
            let v2 = trim_verts[face.trim_start + 1u];
            let v_min = min(v1.y, v2.y);
            let v_max = max(v1.y, v2.y);
            // Check v is in range (u is assumed valid for full wrap-around)
            return uv.y >= v_min && uv.y <= v_max;
        }
        // For 0 or 1 vertices, reject
        return false;
    }

    // Quick AABB rejection before expensive winding number test
    if !uv_in_trim_bounds(uv, face.trim_start, face.trim_count) {
        return false;
    }

    // Winding number test for proper polygon boundary
    let outer_winding = winding_number_polygon(uv, face.trim_start, face.trim_count);
    if outer_winding == 0 {
        return false; // Outside outer boundary
    }

    // Check inner loops (holes) - point must be outside all holes
    if face.inner_loop_count > 0u {
        var inner_offset = face.inner_start;
        for (var loop_idx = 0u; loop_idx < face.inner_loop_count; loop_idx++) {
            let loop_size = inner_loop_descs[face.inner_desc_start + loop_idx];
            if loop_size >= 3u {
                let inner_winding = winding_number_polygon(uv, inner_offset, loop_size);
                if inner_winding != 0 {
                    return false; // Inside a hole
                }
            }
            inner_offset += loop_size;
        }
    }

    return true;
}

// Debug: trace with bounds checking but without BVH
fn trace_debug(origin: vec3<f32>, dir: vec3<f32>) -> RayHit {
    var best_hit: RayHit;
    best_hit.t = MAX_T;
    best_hit.face_idx = 0xFFFFFFFFu;

    let num_faces = arrayLength(&faces);
    for (var i = 0u; i < num_faces; i++) {
        let face = faces[i];
        let hit = intersect_surface(origin, dir, face.surface_idx);
        if hit.t > EPSILON && hit.t < best_hit.t {
            // Apply bounds checking to reject hits outside face boundary
            if point_in_face(hit.uv, i) {
                best_hit = hit;
                best_hit.face_idx = i;
            }
        }
    }

    return best_hit;
}

// BVH traversal
fn trace_bvh(origin: vec3<f32>, dir: vec3<f32>) -> RayHit {
    var best_hit: RayHit;
    best_hit.t = MAX_T;
    best_hit.face_idx = 0xFFFFFFFFu;

    let inv_dir = 1.0 / dir;

    // Stack-based traversal
    var stack: array<u32, 32>;
    var stack_ptr = 0;
    stack[0] = 0u; // Root node
    stack_ptr = 1;

    while stack_ptr > 0 {
        stack_ptr--;
        let node_idx = stack[stack_ptr];
        let node = bvh_nodes[node_idx];

        // Test AABB
        let t_range = intersect_aabb(origin, inv_dir, node.aabb_min.xyz, node.aabb_max.xyz);
        if t_range.y < 0.0 || t_range.x > t_range.y || t_range.x > best_hit.t {
            continue;
        }

        if node.is_leaf == 1u {
            // Leaf node: test faces
            for (var i = 0u; i < node.right_or_count; i++) {
                let face_idx = node.left_or_first + i;
                let face = faces[face_idx];

                let hit = intersect_surface(origin, dir, face.surface_idx);
                if hit.t < best_hit.t && hit.t > 0.0 {
                    // Use proper UV-based point-in-polygon test
                    if point_in_face(hit.uv, face_idx) {
                        best_hit = hit;
                        best_hit.face_idx = face_idx;
                    }
                }
            }
        } else {
            // Internal node: push children
            if stack_ptr < 31 {
                stack[stack_ptr] = node.left_or_first;
                stack_ptr++;
            }
            if stack_ptr < 31 {
                stack[stack_ptr] = node.right_or_count;
                stack_ptr++;
            }
        }
    }

    return best_hit;
}

// Compute surface normal at hit point
fn compute_normal(hit: RayHit) -> vec3<f32> {
    let face = faces[hit.face_idx];
    let surface = surfaces[face.surface_idx];

    var normal: vec3<f32>;

    switch surface.surface_type {
        case SURFACE_PLANE: {
            normal = vec3<f32>(surface.params[9], surface.params[10], surface.params[11]);
        }
        case SURFACE_SPHERE: {
            let center = vec3<f32>(surface.params[0], surface.params[1], surface.params[2]);
            let ref_dir = vec3<f32>(surface.params[4], surface.params[5], surface.params[6]);
            let axis = vec3<f32>(surface.params[7], surface.params[8], surface.params[9]);
            let y_dir = cross(axis, ref_dir);

            let u = hit.uv.x;
            let v = hit.uv.y;
            let cos_v = cos(v);
            let sin_v = sin(v);
            let cos_u = cos(u);
            let sin_u = sin(u);

            normal = cos_v * (cos_u * ref_dir + sin_u * y_dir) + sin_v * axis;
        }
        case SURFACE_CYLINDER: {
            let ref_dir = vec3<f32>(surface.params[6], surface.params[7], surface.params[8]);
            let axis = vec3<f32>(surface.params[3], surface.params[4], surface.params[5]);
            let y_dir = cross(axis, ref_dir);

            let u = hit.uv.x;
            let cos_u = cos(u);
            let sin_u = sin(u);

            normal = cos_u * ref_dir + sin_u * y_dir;
        }
        default: {
            normal = vec3<f32>(0.0, 0.0, 1.0);
        }
    }

    // Apply face orientation
    if face.orientation == 1u {
        normal = -normal;
    }

    return normalize(normal);
}

// Shading with lighting
fn shade(hit: RayHit, dir: vec3<f32>) -> vec4<f32> {
    if hit.face_idx == 0xFFFFFFFFu {
        // Background color (sky blue gradient)
        let t = dir.y * 0.5 + 0.5;
        return mix(vec4<f32>(0.3, 0.4, 0.5, 1.0), vec4<f32>(0.6, 0.7, 0.9, 1.0), t);
    }

    // Compute normal
    let normal = compute_normal(hit);

    // Simple directional lighting
    let light_dir = normalize(vec3<f32>(0.5, 0.8, 0.3));
    let ndotl = max(dot(normal, light_dir), 0.0);
    let ambient = 0.3;
    let diffuse = 0.7 * ndotl;

    // Base material color (neutral gray)
    let base_color = vec3<f32>(0.7, 0.7, 0.7);
    let lit_color = base_color * (ambient + diffuse);

    return vec4<f32>(lit_color, 1.0);
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let pixel = global_id.xy;

    if pixel.x >= camera.width || pixel.y >= camera.height {
        return;
    }

    let ray = ray_origin_and_direction(pixel);
    let origin = ray[0];
    let dir = ray[1];

    // Trace ray using BVH acceleration
    let hit = trace_bvh(origin, dir);
    let color = shade(hit, dir);

    textureStore(output, vec2<i32>(pixel), color);
}
