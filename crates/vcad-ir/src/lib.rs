//! Intermediate representation for the vcad CAD ecosystem.
//!
//! This crate defines the DAG-based IR that represents parametric CAD models.
//! It is shared between the Rust and TypeScript sides of the vcad ecosystem.
//!
//! The IR is purely declarative — no mesh data, just a graph of operations.
//! Evaluation (meshing) is handled separately by the engine.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Unique identifier for a node in the IR graph.
pub type NodeId = u64;

/// 2D vector with f64 components (for sketch coordinates).
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct Vec2 {
    /// X component.
    pub x: f64,
    /// Y component.
    pub y: f64,
}

impl Vec2 {
    /// Create a new Vec2.
    pub fn new(x: f64, y: f64) -> Self {
        Self { x, y }
    }
}

/// 3D vector with f64 components (conventionally millimeters).
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct Vec3 {
    /// X component.
    pub x: f64,
    /// Y component.
    pub y: f64,
    /// Z component.
    pub z: f64,
}

impl Vec3 {
    /// Create a new Vec3.
    pub fn new(x: f64, y: f64, z: f64) -> Self {
        Self { x, y, z }
    }
}

/// A segment of a 2D sketch profile.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum SketchSegment2D {
    /// A line segment from start to end.
    Line {
        /// Start point in 2D sketch coordinates.
        start: Vec2,
        /// End point in 2D sketch coordinates.
        end: Vec2,
    },
    /// A circular arc from start to end around a center.
    Arc {
        /// Start point in 2D sketch coordinates.
        start: Vec2,
        /// End point in 2D sketch coordinates.
        end: Vec2,
        /// Center of the arc in 2D sketch coordinates.
        center: Vec2,
        /// If true, arc goes counter-clockwise from start to end.
        ccw: bool,
    },
}

/// CSG operation — the core building block of the IR DAG.
///
/// Each variant is either a leaf primitive or a combining/transform operation
/// that references child nodes by [`NodeId`].
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum CsgOp {
    /// Axis-aligned box centered at origin.
    Cube {
        /// Size along each axis.
        size: Vec3,
    },
    /// Cylinder along the Z axis, centered at origin.
    Cylinder {
        /// Radius of the cylinder.
        radius: f64,
        /// Height of the cylinder.
        height: f64,
        /// Number of circular segments (0 = auto).
        segments: u32,
    },
    /// Sphere centered at origin.
    Sphere {
        /// Radius of the sphere.
        radius: f64,
        /// Number of circular segments (0 = auto).
        segments: u32,
    },
    /// Cone along the Z axis, centered at origin.
    Cone {
        /// Bottom radius.
        radius_bottom: f64,
        /// Top radius (0 for a point).
        radius_top: f64,
        /// Height of the cone.
        height: f64,
        /// Number of circular segments (0 = auto).
        segments: u32,
    },
    /// Empty geometry (identity for union).
    Empty,
    /// Boolean union of two geometries.
    Union {
        /// Left operand.
        left: NodeId,
        /// Right operand.
        right: NodeId,
    },
    /// Boolean difference (left minus right).
    Difference {
        /// Left operand (base).
        left: NodeId,
        /// Right operand (subtracted).
        right: NodeId,
    },
    /// Boolean intersection of two geometries.
    Intersection {
        /// Left operand.
        left: NodeId,
        /// Right operand.
        right: NodeId,
    },
    /// Translation by an offset vector.
    Translate {
        /// Child node to translate.
        child: NodeId,
        /// Translation offset.
        offset: Vec3,
    },
    /// Rotation by Euler angles in degrees (applied as X, then Y, then Z).
    Rotate {
        /// Child node to rotate.
        child: NodeId,
        /// Rotation angles in degrees.
        angles: Vec3,
    },
    /// Non-uniform scale.
    Scale {
        /// Child node to scale.
        child: NodeId,
        /// Scale factors per axis.
        factor: Vec3,
    },
    /// A 2D sketch profile on a plane.
    ///
    /// The sketch defines a closed profile in a local 2D coordinate system.
    /// Use with [`CsgOp::Extrude`] or [`CsgOp::Revolve`] to create 3D geometry.
    Sketch2D {
        /// Origin point of the sketch plane in 3D.
        origin: Vec3,
        /// Unit vector along the local X axis.
        x_dir: Vec3,
        /// Unit vector along the local Y axis.
        y_dir: Vec3,
        /// The segments forming the closed profile.
        segments: Vec<SketchSegment2D>,
    },
    /// Extrude a sketch profile along a direction vector.
    Extrude {
        /// The sketch node to extrude.
        sketch: NodeId,
        /// Extrusion direction and distance (length of vector = extrusion depth).
        direction: Vec3,
    },
    /// Revolve a sketch profile around an axis.
    Revolve {
        /// The sketch node to revolve.
        sketch: NodeId,
        /// A point on the revolution axis.
        axis_origin: Vec3,
        /// Direction of the revolution axis.
        axis_dir: Vec3,
        /// Revolution angle in degrees (360 for full revolution).
        angle_deg: f64,
    },
    /// Linear pattern — repeat geometry along a direction.
    LinearPattern {
        /// Child node to pattern.
        child: NodeId,
        /// Direction vector (will be normalized).
        direction: Vec3,
        /// Number of copies (including original).
        count: u32,
        /// Spacing between copies along direction.
        spacing: f64,
    },
    /// Circular pattern — repeat geometry around an axis.
    CircularPattern {
        /// Child node to pattern.
        child: NodeId,
        /// A point on the rotation axis.
        axis_origin: Vec3,
        /// Direction of the rotation axis.
        axis_dir: Vec3,
        /// Number of copies (including original).
        count: u32,
        /// Total angle span in degrees.
        angle_deg: f64,
    },
    /// Shell — hollow out a solid by offsetting faces.
    Shell {
        /// Child node to shell.
        child: NodeId,
        /// Wall thickness (inward offset).
        thickness: f64,
    },
}

/// A node in the IR graph.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Node {
    /// Unique identifier.
    pub id: NodeId,
    /// Optional human-readable name.
    pub name: Option<String>,
    /// The operation this node represents.
    pub op: CsgOp,
}

/// PBR material definition.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct MaterialDef {
    /// Material name (e.g. "aluminum", "abs_white").
    pub name: String,
    /// Base color as `[r, g, b]` in 0.0..1.0.
    pub color: [f64; 3],
    /// Metallic factor (0.0 = dielectric, 1.0 = metal).
    pub metallic: f64,
    /// Roughness factor (0.0 = mirror, 1.0 = diffuse).
    pub roughness: f64,
    /// Density in kg/m^3 (for physics simulation).
    pub density: Option<f64>,
    /// Static friction coefficient (for physics simulation).
    pub friction: Option<f64>,
}

/// An entry in the scene — a root node with an assigned material.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SceneEntry {
    /// Root node of this scene part.
    pub root: NodeId,
    /// Material key referencing a [`MaterialDef::name`].
    pub material: String,
}

/// A vcad document — the `.vcad` file format.
///
/// Contains the full IR DAG, material definitions, and scene assembly.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Document {
    /// Format version string (e.g. "0.1").
    pub version: String,
    /// All nodes in the graph, keyed by [`NodeId`].
    pub nodes: HashMap<NodeId, Node>,
    /// Material definitions, keyed by name.
    pub materials: HashMap<String, MaterialDef>,
    /// Per-part material assignments (part name → material name).
    pub part_materials: HashMap<String, String>,
    /// Scene entries (assembled parts with materials).
    pub roots: Vec<SceneEntry>,
}

impl Default for Document {
    fn default() -> Self {
        Self {
            version: "0.1".to_string(),
            nodes: HashMap::new(),
            materials: HashMap::new(),
            part_materials: HashMap::new(),
            roots: Vec::new(),
        }
    }
}

impl Document {
    /// Create a new empty document.
    pub fn new() -> Self {
        Self::default()
    }

    /// Serialize to JSON string.
    pub fn to_json(&self) -> Result<String, serde_json::Error> {
        serde_json::to_string_pretty(self)
    }

    /// Deserialize from JSON string.
    pub fn from_json(json: &str) -> Result<Self, serde_json::Error> {
        serde_json::from_str(json)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn roundtrip_document() {
        let mut doc = Document::new();

        // Add a cube node
        let cube_id = 1;
        doc.nodes.insert(
            cube_id,
            Node {
                id: cube_id,
                name: Some("box".to_string()),
                op: CsgOp::Cube {
                    size: Vec3::new(10.0, 20.0, 30.0),
                },
            },
        );

        // Add a cylinder node
        let cyl_id = 2;
        doc.nodes.insert(
            cyl_id,
            Node {
                id: cyl_id,
                name: Some("hole".to_string()),
                op: CsgOp::Cylinder {
                    radius: 3.0,
                    height: 40.0,
                    segments: 0,
                },
            },
        );

        // Add a difference node
        let diff_id = 3;
        doc.nodes.insert(
            diff_id,
            Node {
                id: diff_id,
                name: Some("box_with_hole".to_string()),
                op: CsgOp::Difference {
                    left: cube_id,
                    right: cyl_id,
                },
            },
        );

        // Add material
        doc.materials.insert(
            "aluminum".to_string(),
            MaterialDef {
                name: "aluminum".to_string(),
                color: [0.91, 0.92, 0.93],
                metallic: 1.0,
                roughness: 0.4,
                density: Some(2700.0),
                friction: Some(0.6),
            },
        );

        // Add scene entry
        doc.roots.push(SceneEntry {
            root: diff_id,
            material: "aluminum".to_string(),
        });

        // Serialize and deserialize
        let json = doc.to_json().expect("serialize");
        let restored = Document::from_json(&json).expect("deserialize");

        assert_eq!(doc, restored);
        assert_eq!(restored.nodes.len(), 3);
        assert_eq!(restored.materials.len(), 1);
        assert_eq!(restored.roots.len(), 1);
    }

    #[test]
    fn node_graph_dag() {
        let mut doc = Document::new();

        doc.nodes.insert(
            1,
            Node {
                id: 1,
                name: None,
                op: CsgOp::Sphere {
                    radius: 5.0,
                    segments: 0,
                },
            },
        );

        doc.nodes.insert(
            2,
            Node {
                id: 2,
                name: None,
                op: CsgOp::Cube {
                    size: Vec3::new(8.0, 8.0, 8.0),
                },
            },
        );

        doc.nodes.insert(
            3,
            Node {
                id: 3,
                name: Some("rounded_cube".to_string()),
                op: CsgOp::Intersection { left: 1, right: 2 },
            },
        );

        // Verify structure
        assert_eq!(doc.nodes.len(), 3);
        match &doc.nodes[&3].op {
            CsgOp::Intersection { left, right } => {
                assert_eq!(*left, 1);
                assert_eq!(*right, 2);
            }
            _ => panic!("expected Intersection"),
        }
    }

    #[test]
    fn empty_document() {
        let doc = Document::new();
        assert_eq!(doc.version, "0.1");
        assert!(doc.nodes.is_empty());
        assert!(doc.materials.is_empty());
        assert!(doc.part_materials.is_empty());
        assert!(doc.roots.is_empty());
    }

    #[test]
    fn serde_tagged_enum() {
        let op = CsgOp::Cube {
            size: Vec3::new(1.0, 2.0, 3.0),
        };
        let json = serde_json::to_string(&op).unwrap();
        assert!(json.contains(r#""type":"Cube""#));

        let restored: CsgOp = serde_json::from_str(&json).unwrap();
        assert_eq!(op, restored);
    }

    #[test]
    fn sketch_operations() {
        let mut doc = Document::new();

        // Add a rectangle sketch
        let sketch_id = 1;
        doc.nodes.insert(
            sketch_id,
            Node {
                id: sketch_id,
                name: Some("rectangle".to_string()),
                op: CsgOp::Sketch2D {
                    origin: Vec3::new(0.0, 0.0, 0.0),
                    x_dir: Vec3::new(1.0, 0.0, 0.0),
                    y_dir: Vec3::new(0.0, 1.0, 0.0),
                    segments: vec![
                        SketchSegment2D::Line {
                            start: Vec2::new(0.0, 0.0),
                            end: Vec2::new(10.0, 0.0),
                        },
                        SketchSegment2D::Line {
                            start: Vec2::new(10.0, 0.0),
                            end: Vec2::new(10.0, 5.0),
                        },
                        SketchSegment2D::Line {
                            start: Vec2::new(10.0, 5.0),
                            end: Vec2::new(0.0, 5.0),
                        },
                        SketchSegment2D::Line {
                            start: Vec2::new(0.0, 5.0),
                            end: Vec2::new(0.0, 0.0),
                        },
                    ],
                },
            },
        );

        // Add an extrusion
        let extrude_id = 2;
        doc.nodes.insert(
            extrude_id,
            Node {
                id: extrude_id,
                name: Some("extruded_block".to_string()),
                op: CsgOp::Extrude {
                    sketch: sketch_id,
                    direction: Vec3::new(0.0, 0.0, 20.0),
                },
            },
        );

        // Round-trip through JSON
        let json = doc.to_json().expect("serialize");
        let restored = Document::from_json(&json).expect("deserialize");
        assert_eq!(doc, restored);

        // Verify structure
        match &restored.nodes[&sketch_id].op {
            CsgOp::Sketch2D { segments, .. } => {
                assert_eq!(segments.len(), 4);
            }
            _ => panic!("expected Sketch2D"),
        }
        match &restored.nodes[&extrude_id].op {
            CsgOp::Extrude { sketch, direction } => {
                assert_eq!(*sketch, sketch_id);
                assert_eq!(direction.z, 20.0);
            }
            _ => panic!("expected Extrude"),
        }
    }

    #[test]
    fn revolve_operation() {
        let op = CsgOp::Revolve {
            sketch: 1,
            axis_origin: Vec3::new(0.0, 0.0, 0.0),
            axis_dir: Vec3::new(0.0, 1.0, 0.0),
            angle_deg: 360.0,
        };
        let json = serde_json::to_string(&op).unwrap();
        assert!(json.contains(r#""type":"Revolve""#));
        let restored: CsgOp = serde_json::from_str(&json).unwrap();
        assert_eq!(op, restored);
    }
}
