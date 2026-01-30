/* tslint:disable */
/* eslint-disable */

/**
 * A 3D solid geometry object.
 *
 * Create solids from primitives, combine with boolean operations,
 * transform, and extract triangle meshes for rendering.
 */
export class Solid {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Get the bounding box as [minX, minY, minZ, maxX, maxY, maxZ].
     */
    boundingBox(): Float64Array;
    /**
     * Get the center of mass as [x, y, z].
     */
    centerOfMass(): Float64Array;
    /**
     * Chamfer all edges of the solid by the given distance.
     */
    chamfer(distance: number): Solid;
    /**
     * Create a circular pattern of the solid around an axis.
     *
     * # Arguments
     *
     * * `axis_origin_x/y/z` - A point on the rotation axis
     * * `axis_dir_x/y/z` - Direction of the rotation axis
     * * `count` - Number of copies (including original)
     * * `angle_deg` - Total angle span in degrees
     */
    circularPattern(axis_origin_x: number, axis_origin_y: number, axis_origin_z: number, axis_dir_x: number, axis_dir_y: number, axis_dir_z: number, count: number, angle_deg: number): Solid;
    /**
     * Create a cone/frustum along Z axis.
     */
    static cone(radius_bottom: number, radius_top: number, height: number, segments?: number | null): Solid;
    /**
     * Create a box with corner at origin and dimensions (sx, sy, sz).
     */
    static cube(sx: number, sy: number, sz: number): Solid;
    /**
     * Create a cylinder along Z axis with given radius and height.
     */
    static cylinder(radius: number, height: number, segments?: number | null): Solid;
    /**
     * Boolean difference (self − other).
     */
    difference(other: Solid): Solid;
    /**
     * Create an empty solid.
     */
    static empty(): Solid;
    /**
     * Create a solid by extruding a 2D sketch profile.
     *
     * Takes a sketch profile and extrusion direction as JS objects.
     */
    static extrude(profile_js: any, direction: Float64Array): Solid;
    /**
     * Fillet all edges of the solid with the given radius.
     */
    fillet(radius: number): Solid;
    /**
     * Get the triangle mesh representation.
     *
     * Returns a JS object with `positions` (Float32Array) and `indices` (Uint32Array).
     */
    getMesh(segments?: number | null): any;
    /**
     * Boolean intersection (self ∩ other).
     */
    intersection(other: Solid): Solid;
    /**
     * Check if the solid is empty (has no geometry).
     */
    isEmpty(): boolean;
    /**
     * Create a linear pattern of the solid along a direction.
     *
     * # Arguments
     *
     * * `dir_x`, `dir_y`, `dir_z` - Direction vector
     * * `count` - Number of copies (including original)
     * * `spacing` - Distance between copies
     */
    linearPattern(dir_x: number, dir_y: number, dir_z: number, count: number, spacing: number): Solid;
    /**
     * Create a solid by lofting between multiple profiles.
     *
     * Takes an array of sketch profiles (minimum 2).
     */
    static loft(profiles_js: any, closed?: boolean | null): Solid;
    /**
     * Get the number of triangles in the tessellated mesh.
     */
    numTriangles(): number;
    /**
     * Create a solid by revolving a 2D sketch profile around an axis.
     *
     * Takes a sketch profile, axis origin, axis direction, and angle in degrees.
     */
    static revolve(profile_js: any, axis_origin: Float64Array, axis_dir: Float64Array, angle_deg: number): Solid;
    /**
     * Rotate the solid by angles in degrees around X, Y, Z axes.
     */
    rotate(x_deg: number, y_deg: number, z_deg: number): Solid;
    /**
     * Scale the solid by (x, y, z).
     */
    scale(x: number, y: number, z: number): Solid;
    /**
     * Shell (hollow) the solid by offsetting all faces inward.
     */
    shell(thickness: number): Solid;
    /**
     * Create a sphere centered at origin with given radius.
     */
    static sphere(radius: number, segments?: number | null): Solid;
    /**
     * Compute the surface area of the solid.
     */
    surfaceArea(): number;
    /**
     * Create a solid by sweeping a profile along a helix path.
     *
     * Takes a sketch profile and helix parameters.
     */
    static sweepHelix(profile_js: any, radius: number, pitch: number, height: number, turns: number, twist_angle?: number | null, scale_start?: number | null, scale_end?: number | null, path_segments?: number | null, arc_segments?: number | null): Solid;
    /**
     * Create a solid by sweeping a profile along a line path.
     *
     * Takes a sketch profile and path endpoints.
     */
    static sweepLine(profile_js: any, start: Float64Array, end: Float64Array, twist_angle?: number | null, scale_start?: number | null, scale_end?: number | null): Solid;
    /**
     * Translate the solid by (x, y, z).
     */
    translate(x: number, y: number, z: number): Solid;
    /**
     * Boolean union (self ∪ other).
     */
    union(other: Solid): Solid;
    /**
     * Compute the volume of the solid.
     */
    volume(): number;
}

/**
 * Initialize the WASM module (sets up panic hook for better error messages).
 */
export function init(): void;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_solid_free: (a: number, b: number) => void;
    readonly solid_boundingBox: (a: number) => [number, number];
    readonly solid_centerOfMass: (a: number) => [number, number];
    readonly solid_chamfer: (a: number, b: number) => number;
    readonly solid_circularPattern: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number) => number;
    readonly solid_cone: (a: number, b: number, c: number, d: number) => number;
    readonly solid_cube: (a: number, b: number, c: number) => number;
    readonly solid_cylinder: (a: number, b: number, c: number) => number;
    readonly solid_difference: (a: number, b: number) => number;
    readonly solid_empty: () => number;
    readonly solid_extrude: (a: any, b: number, c: number) => [number, number, number];
    readonly solid_fillet: (a: number, b: number) => number;
    readonly solid_getMesh: (a: number, b: number) => any;
    readonly solid_intersection: (a: number, b: number) => number;
    readonly solid_isEmpty: (a: number) => number;
    readonly solid_linearPattern: (a: number, b: number, c: number, d: number, e: number, f: number) => number;
    readonly solid_loft: (a: any, b: number) => [number, number, number];
    readonly solid_numTriangles: (a: number) => number;
    readonly solid_revolve: (a: any, b: number, c: number, d: number, e: number, f: number) => [number, number, number];
    readonly solid_rotate: (a: number, b: number, c: number, d: number) => number;
    readonly solid_scale: (a: number, b: number, c: number, d: number) => number;
    readonly solid_shell: (a: number, b: number) => number;
    readonly solid_sphere: (a: number, b: number) => number;
    readonly solid_surfaceArea: (a: number) => number;
    readonly solid_sweepHelix: (a: any, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number, l: number, m: number) => [number, number, number];
    readonly solid_sweepLine: (a: any, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number) => [number, number, number];
    readonly solid_translate: (a: number, b: number, c: number, d: number) => number;
    readonly solid_union: (a: number, b: number) => number;
    readonly solid_volume: (a: number) => number;
    readonly init: () => void;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_exn_store: (a: number) => void;
    readonly __externref_table_alloc: () => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
