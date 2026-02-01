//! Compact text-based IR format for cad0 model training and inference.
//!
//! This format is designed to be:
//! - Token-efficient (short opcodes, minimal punctuation)
//! - Unambiguous (line-based, implicit node IDs)
//! - Easy to parse and generate
//!
//! # Format
//!
//! Each line represents a node. Line number (0-indexed) is the node ID.
//!
//! ```text
//! # Primitives
//! C sx sy sz                    # Cube
//! Y r h                         # Cylinder (segments=32 default)
//! S r                           # Sphere
//! K rb rt h                     # Cone (bottom radius, top radius, height)
//!
//! # Booleans
//! U a b                         # Union
//! D a b                         # Difference
//! I a b                         # Intersection
//!
//! # Transforms
//! T n dx dy dz                  # Translate
//! R n rx ry rz                  # Rotate (degrees)
//! X n sx sy sz                  # Scale
//!
//! # Patterns
//! LP n dx dy dz count spacing   # Linear pattern
//! CP n ox oy oz ax ay az count angle  # Circular pattern
//!
//! # Sketch (block)
//! SK ox oy oz  xx xy xz  yx yy yz
//! L x1 y1 x2 y2                 # Line segment
//! A x1 y1 x2 y2 cx cy ccw       # Arc (ccw: 0 or 1)
//! END
//!
//! # Sketch ops
//! E sk dx dy dz                 # Extrude
//! V sk ox oy oz ax ay az angle  # Revolve
//!
//! # Modifiers
//! SH n thickness                # Shell
//! ```
//!
//! # Example
//!
//! A 50x30x5mm plate with a 10mm diameter hole in the center:
//!
//! ```text
//! C 50 30 5
//! Y 5 10
//! T 1 25 15 0
//! D 0 2
//! ```
//!
//! This creates:
//! - Node 0: Cube 50x30x5
//! - Node 1: Cylinder r=5 h=10
//! - Node 2: Translate node 1 by (25, 15, 0)
//! - Node 3: Difference node 0 minus node 2

use crate::{CsgOp, Document, MaterialDef, Node, SceneEntry, SketchSegment2D, Vec2, Vec3};
use std::collections::HashMap;
use std::fmt::{self, Write as FmtWrite};

/// Error type for compact IR parsing.
#[derive(Debug, Clone, PartialEq)]
pub struct CompactParseError {
    /// Line number where the error occurred (0-indexed).
    pub line: usize,
    /// Description of the error.
    pub message: String,
}

impl fmt::Display for CompactParseError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "line {}: {}", self.line, self.message)
    }
}

impl std::error::Error for CompactParseError {}

/// Convert a Document to compact IR format.
///
/// The document must have a simple DAG structure where node IDs can be
/// mapped to sequential line numbers. Nodes are sorted topologically
/// so dependencies appear before their dependents.
pub fn to_compact(doc: &Document) -> Result<String, CompactParseError> {
    if doc.nodes.is_empty() {
        return Ok(String::new());
    }

    // Find all root nodes (nodes not referenced by any other node)
    let referenced: std::collections::HashSet<u64> = doc
        .nodes
        .values()
        .flat_map(|n| get_children(&n.op))
        .collect();

    let roots: Vec<u64> = doc
        .nodes
        .keys()
        .filter(|id| !referenced.contains(id))
        .copied()
        .collect();

    // Topological sort: dependencies before dependents
    let sorted = topological_sort(doc, &roots)?;

    // Create ID mapping: original NodeId -> line number
    let id_map: HashMap<u64, usize> = sorted.iter().enumerate().map(|(i, &id)| (id, i)).collect();

    let mut output = String::new();

    for &node_id in &sorted {
        let node = &doc.nodes[&node_id];
        let line = format_op(&node.op, &id_map)?;
        writeln!(output, "{}", line).unwrap();
    }

    // Remove trailing newline
    if output.ends_with('\n') {
        output.pop();
    }

    Ok(output)
}

/// Parse compact IR format into a Document.
pub fn from_compact(s: &str) -> Result<Document, CompactParseError> {
    let mut doc = Document::new();
    let mut current_line = 0;
    let mut lines = s.lines().peekable();

    while let Some(line) = lines.next() {
        let trimmed = line.trim();

        // Skip empty lines and comments
        if trimmed.is_empty() || trimmed.starts_with('#') {
            current_line += 1;
            continue;
        }

        let node_id = current_line as u64;
        let op = parse_line(trimmed, current_line, &mut lines, &mut current_line)?;

        doc.nodes.insert(
            node_id,
            Node {
                id: node_id,
                name: None,
                op,
            },
        );

        current_line += 1;
    }

    // Find the root node (highest ID that isn't referenced by others)
    if !doc.nodes.is_empty() {
        let referenced: std::collections::HashSet<u64> = doc
            .nodes
            .values()
            .flat_map(|n| get_children(&n.op))
            .collect();

        let root_id = doc
            .nodes
            .keys()
            .filter(|id| !referenced.contains(id))
            .max()
            .copied()
            .unwrap_or(0);

        // Add default material and scene entry
        doc.materials.insert(
            "default".to_string(),
            MaterialDef {
                name: "default".to_string(),
                color: [0.8, 0.8, 0.8],
                metallic: 0.0,
                roughness: 0.5,
                density: None,
                friction: None,
            },
        );

        doc.roots.push(SceneEntry {
            root: root_id,
            material: "default".to_string(),
        });
    }

    Ok(doc)
}

/// Get child node IDs from an operation.
fn get_children(op: &CsgOp) -> Vec<u64> {
    match op {
        CsgOp::Union { left, right }
        | CsgOp::Difference { left, right }
        | CsgOp::Intersection { left, right } => vec![*left, *right],
        CsgOp::Translate { child, .. }
        | CsgOp::Rotate { child, .. }
        | CsgOp::Scale { child, .. }
        | CsgOp::LinearPattern { child, .. }
        | CsgOp::CircularPattern { child, .. }
        | CsgOp::Shell { child, .. }
        | CsgOp::Fillet { child, .. }
        | CsgOp::Chamfer { child, .. } => vec![*child],
        CsgOp::Extrude { sketch, .. } | CsgOp::Revolve { sketch, .. } => vec![*sketch],
        _ => vec![],
    }
}

/// Topological sort of nodes.
fn topological_sort(doc: &Document, roots: &[u64]) -> Result<Vec<u64>, CompactParseError> {
    let mut result = Vec::new();
    let mut visited = std::collections::HashSet::new();
    let mut temp_visited = std::collections::HashSet::new();

    fn visit(
        node_id: u64,
        doc: &Document,
        visited: &mut std::collections::HashSet<u64>,
        temp_visited: &mut std::collections::HashSet<u64>,
        result: &mut Vec<u64>,
    ) -> Result<(), CompactParseError> {
        if visited.contains(&node_id) {
            return Ok(());
        }
        if temp_visited.contains(&node_id) {
            return Err(CompactParseError {
                line: 0,
                message: format!("cycle detected at node {}", node_id),
            });
        }

        temp_visited.insert(node_id);

        if let Some(node) = doc.nodes.get(&node_id) {
            for child_id in get_children(&node.op) {
                visit(child_id, doc, visited, temp_visited, result)?;
            }
        }

        temp_visited.remove(&node_id);
        visited.insert(node_id);
        result.push(node_id);
        Ok(())
    }

    for &root_id in roots {
        visit(root_id, doc, &mut visited, &mut temp_visited, &mut result)?;
    }

    // Also visit any orphan nodes
    let all_ids: Vec<u64> = doc.nodes.keys().copied().collect();
    for id in all_ids {
        if !visited.contains(&id) {
            visit(id, doc, &mut visited, &mut temp_visited, &mut result)?;
        }
    }

    Ok(result)
}

/// Format a CsgOp as a compact IR line.
fn format_op(op: &CsgOp, id_map: &HashMap<u64, usize>) -> Result<String, CompactParseError> {
    match op {
        CsgOp::Cube { size } => Ok(format!("C {} {} {}", size.x, size.y, size.z)),

        CsgOp::Cylinder {
            radius, height, ..
        } => Ok(format!("Y {} {}", radius, height)),

        CsgOp::Sphere { radius, .. } => Ok(format!("S {}", radius)),

        CsgOp::Cone {
            radius_bottom,
            radius_top,
            height,
            ..
        } => Ok(format!("K {} {} {}", radius_bottom, radius_top, height)),

        CsgOp::Empty => Ok("C 0 0 0".to_string()), // Represent empty as zero-size cube

        CsgOp::Union { left, right } => {
            let l = id_map.get(left).ok_or_else(|| CompactParseError {
                line: 0,
                message: format!("unknown node {}", left),
            })?;
            let r = id_map.get(right).ok_or_else(|| CompactParseError {
                line: 0,
                message: format!("unknown node {}", right),
            })?;
            Ok(format!("U {} {}", l, r))
        }

        CsgOp::Difference { left, right } => {
            let l = id_map.get(left).ok_or_else(|| CompactParseError {
                line: 0,
                message: format!("unknown node {}", left),
            })?;
            let r = id_map.get(right).ok_or_else(|| CompactParseError {
                line: 0,
                message: format!("unknown node {}", right),
            })?;
            Ok(format!("D {} {}", l, r))
        }

        CsgOp::Intersection { left, right } => {
            let l = id_map.get(left).ok_or_else(|| CompactParseError {
                line: 0,
                message: format!("unknown node {}", left),
            })?;
            let r = id_map.get(right).ok_or_else(|| CompactParseError {
                line: 0,
                message: format!("unknown node {}", right),
            })?;
            Ok(format!("I {} {}", l, r))
        }

        CsgOp::Translate { child, offset } => {
            let c = id_map.get(child).ok_or_else(|| CompactParseError {
                line: 0,
                message: format!("unknown node {}", child),
            })?;
            Ok(format!("T {} {} {} {}", c, offset.x, offset.y, offset.z))
        }

        CsgOp::Rotate { child, angles } => {
            let c = id_map.get(child).ok_or_else(|| CompactParseError {
                line: 0,
                message: format!("unknown node {}", child),
            })?;
            Ok(format!("R {} {} {} {}", c, angles.x, angles.y, angles.z))
        }

        CsgOp::Scale { child, factor } => {
            let c = id_map.get(child).ok_or_else(|| CompactParseError {
                line: 0,
                message: format!("unknown node {}", child),
            })?;
            Ok(format!("X {} {} {} {}", c, factor.x, factor.y, factor.z))
        }

        CsgOp::LinearPattern {
            child,
            direction,
            count,
            spacing,
        } => {
            let c = id_map.get(child).ok_or_else(|| CompactParseError {
                line: 0,
                message: format!("unknown node {}", child),
            })?;
            Ok(format!(
                "LP {} {} {} {} {} {}",
                c, direction.x, direction.y, direction.z, count, spacing
            ))
        }

        CsgOp::CircularPattern {
            child,
            axis_origin,
            axis_dir,
            count,
            angle_deg,
        } => {
            let c = id_map.get(child).ok_or_else(|| CompactParseError {
                line: 0,
                message: format!("unknown node {}", child),
            })?;
            Ok(format!(
                "CP {} {} {} {} {} {} {} {} {}",
                c,
                axis_origin.x,
                axis_origin.y,
                axis_origin.z,
                axis_dir.x,
                axis_dir.y,
                axis_dir.z,
                count,
                angle_deg
            ))
        }

        CsgOp::Shell { child, thickness } => {
            let c = id_map.get(child).ok_or_else(|| CompactParseError {
                line: 0,
                message: format!("unknown node {}", child),
            })?;
            Ok(format!("SH {} {}", c, thickness))
        }

        CsgOp::Fillet { child, radius } => {
            let c = id_map.get(child).ok_or_else(|| CompactParseError {
                line: 0,
                message: format!("unknown node {}", child),
            })?;
            Ok(format!("FI {} {}", c, radius))
        }

        CsgOp::Chamfer { child, distance } => {
            let c = id_map.get(child).ok_or_else(|| CompactParseError {
                line: 0,
                message: format!("unknown node {}", child),
            })?;
            Ok(format!("CH {} {}", c, distance))
        }

        CsgOp::Sketch2D {
            origin,
            x_dir,
            y_dir,
            segments,
        } => {
            let mut lines = vec![format!(
                "SK {} {} {}  {} {} {}  {} {} {}",
                origin.x,
                origin.y,
                origin.z,
                x_dir.x,
                x_dir.y,
                x_dir.z,
                y_dir.x,
                y_dir.y,
                y_dir.z
            )];

            for seg in segments {
                match seg {
                    SketchSegment2D::Line { start, end } => {
                        lines.push(format!("L {} {} {} {}", start.x, start.y, end.x, end.y));
                    }
                    SketchSegment2D::Arc {
                        start,
                        end,
                        center,
                        ccw,
                    } => {
                        lines.push(format!(
                            "A {} {} {} {} {} {} {}",
                            start.x,
                            start.y,
                            end.x,
                            end.y,
                            center.x,
                            center.y,
                            if *ccw { 1 } else { 0 }
                        ));
                    }
                }
            }

            lines.push("END".to_string());
            Ok(lines.join("\n"))
        }

        CsgOp::Extrude { sketch, direction } => {
            let sk = id_map.get(sketch).ok_or_else(|| CompactParseError {
                line: 0,
                message: format!("unknown node {}", sketch),
            })?;
            Ok(format!(
                "E {} {} {} {}",
                sk, direction.x, direction.y, direction.z
            ))
        }

        CsgOp::Revolve {
            sketch,
            axis_origin,
            axis_dir,
            angle_deg,
        } => {
            let sk = id_map.get(sketch).ok_or_else(|| CompactParseError {
                line: 0,
                message: format!("unknown node {}", sketch),
            })?;
            Ok(format!(
                "V {} {} {} {} {} {} {} {}",
                sk,
                axis_origin.x,
                axis_origin.y,
                axis_origin.z,
                axis_dir.x,
                axis_dir.y,
                axis_dir.z,
                angle_deg
            ))
        }

        CsgOp::StepImport { .. } => Err(CompactParseError {
            line: 0,
            message: "STEP import not supported in compact format".to_string(),
        }),
    }
}

/// Parse a single line of compact IR.
fn parse_line<'a, I>(
    line: &str,
    line_num: usize,
    lines: &mut std::iter::Peekable<I>,
    current_line: &mut usize,
) -> Result<CsgOp, CompactParseError>
where
    I: Iterator<Item = &'a str>,
{
    let parts: Vec<&str> = line.split_whitespace().collect();
    if parts.is_empty() {
        return Err(CompactParseError {
            line: line_num,
            message: "empty line".to_string(),
        });
    }

    let opcode = parts[0];

    match opcode {
        "C" => {
            if parts.len() != 4 {
                return Err(CompactParseError {
                    line: line_num,
                    message: format!("C requires 3 args, got {}", parts.len() - 1),
                });
            }
            Ok(CsgOp::Cube {
                size: Vec3::new(
                    parse_f64(parts[1], line_num)?,
                    parse_f64(parts[2], line_num)?,
                    parse_f64(parts[3], line_num)?,
                ),
            })
        }

        "Y" => {
            if parts.len() != 3 {
                return Err(CompactParseError {
                    line: line_num,
                    message: format!("Y requires 2 args, got {}", parts.len() - 1),
                });
            }
            Ok(CsgOp::Cylinder {
                radius: parse_f64(parts[1], line_num)?,
                height: parse_f64(parts[2], line_num)?,
                segments: 0,
            })
        }

        "S" => {
            if parts.len() != 2 {
                return Err(CompactParseError {
                    line: line_num,
                    message: format!("S requires 1 arg, got {}", parts.len() - 1),
                });
            }
            Ok(CsgOp::Sphere {
                radius: parse_f64(parts[1], line_num)?,
                segments: 0,
            })
        }

        "K" => {
            if parts.len() != 4 {
                return Err(CompactParseError {
                    line: line_num,
                    message: format!("K requires 3 args, got {}", parts.len() - 1),
                });
            }
            Ok(CsgOp::Cone {
                radius_bottom: parse_f64(parts[1], line_num)?,
                radius_top: parse_f64(parts[2], line_num)?,
                height: parse_f64(parts[3], line_num)?,
                segments: 0,
            })
        }

        "U" => {
            if parts.len() != 3 {
                return Err(CompactParseError {
                    line: line_num,
                    message: format!("U requires 2 args, got {}", parts.len() - 1),
                });
            }
            Ok(CsgOp::Union {
                left: parse_u64(parts[1], line_num)?,
                right: parse_u64(parts[2], line_num)?,
            })
        }

        "D" => {
            if parts.len() != 3 {
                return Err(CompactParseError {
                    line: line_num,
                    message: format!("D requires 2 args, got {}", parts.len() - 1),
                });
            }
            Ok(CsgOp::Difference {
                left: parse_u64(parts[1], line_num)?,
                right: parse_u64(parts[2], line_num)?,
            })
        }

        "I" => {
            if parts.len() != 3 {
                return Err(CompactParseError {
                    line: line_num,
                    message: format!("I requires 2 args, got {}", parts.len() - 1),
                });
            }
            Ok(CsgOp::Intersection {
                left: parse_u64(parts[1], line_num)?,
                right: parse_u64(parts[2], line_num)?,
            })
        }

        "T" => {
            if parts.len() != 5 {
                return Err(CompactParseError {
                    line: line_num,
                    message: format!("T requires 4 args, got {}", parts.len() - 1),
                });
            }
            Ok(CsgOp::Translate {
                child: parse_u64(parts[1], line_num)?,
                offset: Vec3::new(
                    parse_f64(parts[2], line_num)?,
                    parse_f64(parts[3], line_num)?,
                    parse_f64(parts[4], line_num)?,
                ),
            })
        }

        "R" => {
            if parts.len() != 5 {
                return Err(CompactParseError {
                    line: line_num,
                    message: format!("R requires 4 args, got {}", parts.len() - 1),
                });
            }
            Ok(CsgOp::Rotate {
                child: parse_u64(parts[1], line_num)?,
                angles: Vec3::new(
                    parse_f64(parts[2], line_num)?,
                    parse_f64(parts[3], line_num)?,
                    parse_f64(parts[4], line_num)?,
                ),
            })
        }

        "X" => {
            if parts.len() != 5 {
                return Err(CompactParseError {
                    line: line_num,
                    message: format!("X requires 4 args, got {}", parts.len() - 1),
                });
            }
            Ok(CsgOp::Scale {
                child: parse_u64(parts[1], line_num)?,
                factor: Vec3::new(
                    parse_f64(parts[2], line_num)?,
                    parse_f64(parts[3], line_num)?,
                    parse_f64(parts[4], line_num)?,
                ),
            })
        }

        "LP" => {
            if parts.len() != 7 {
                return Err(CompactParseError {
                    line: line_num,
                    message: format!("LP requires 6 args, got {}", parts.len() - 1),
                });
            }
            Ok(CsgOp::LinearPattern {
                child: parse_u64(parts[1], line_num)?,
                direction: Vec3::new(
                    parse_f64(parts[2], line_num)?,
                    parse_f64(parts[3], line_num)?,
                    parse_f64(parts[4], line_num)?,
                ),
                count: parse_u32(parts[5], line_num)?,
                spacing: parse_f64(parts[6], line_num)?,
            })
        }

        "CP" => {
            if parts.len() != 10 {
                return Err(CompactParseError {
                    line: line_num,
                    message: format!("CP requires 9 args, got {}", parts.len() - 1),
                });
            }
            Ok(CsgOp::CircularPattern {
                child: parse_u64(parts[1], line_num)?,
                axis_origin: Vec3::new(
                    parse_f64(parts[2], line_num)?,
                    parse_f64(parts[3], line_num)?,
                    parse_f64(parts[4], line_num)?,
                ),
                axis_dir: Vec3::new(
                    parse_f64(parts[5], line_num)?,
                    parse_f64(parts[6], line_num)?,
                    parse_f64(parts[7], line_num)?,
                ),
                count: parse_u32(parts[8], line_num)?,
                angle_deg: parse_f64(parts[9], line_num)?,
            })
        }

        "SH" => {
            if parts.len() != 3 {
                return Err(CompactParseError {
                    line: line_num,
                    message: format!("SH requires 2 args, got {}", parts.len() - 1),
                });
            }
            Ok(CsgOp::Shell {
                child: parse_u64(parts[1], line_num)?,
                thickness: parse_f64(parts[2], line_num)?,
            })
        }

        "FI" => {
            if parts.len() != 3 {
                return Err(CompactParseError {
                    line: line_num,
                    message: format!("FI requires 2 args, got {}", parts.len() - 1),
                });
            }
            Ok(CsgOp::Fillet {
                child: parse_u64(parts[1], line_num)?,
                radius: parse_f64(parts[2], line_num)?,
            })
        }

        "CH" => {
            if parts.len() != 3 {
                return Err(CompactParseError {
                    line: line_num,
                    message: format!("CH requires 2 args, got {}", parts.len() - 1),
                });
            }
            Ok(CsgOp::Chamfer {
                child: parse_u64(parts[1], line_num)?,
                distance: parse_f64(parts[2], line_num)?,
            })
        }

        "SK" => {
            if parts.len() != 10 {
                return Err(CompactParseError {
                    line: line_num,
                    message: format!("SK requires 9 args, got {}", parts.len() - 1),
                });
            }

            let origin = Vec3::new(
                parse_f64(parts[1], line_num)?,
                parse_f64(parts[2], line_num)?,
                parse_f64(parts[3], line_num)?,
            );
            let x_dir = Vec3::new(
                parse_f64(parts[4], line_num)?,
                parse_f64(parts[5], line_num)?,
                parse_f64(parts[6], line_num)?,
            );
            let y_dir = Vec3::new(
                parse_f64(parts[7], line_num)?,
                parse_f64(parts[8], line_num)?,
                parse_f64(parts[9], line_num)?,
            );

            let mut segments = Vec::new();

            // Parse sketch segments until END
            loop {
                *current_line += 1;
                let seg_line = lines.next().ok_or_else(|| CompactParseError {
                    line: *current_line,
                    message: "unexpected end of sketch block".to_string(),
                })?;

                let seg_trimmed = seg_line.trim();
                if seg_trimmed == "END" {
                    break;
                }

                let seg_parts: Vec<&str> = seg_trimmed.split_whitespace().collect();
                if seg_parts.is_empty() {
                    continue; // Skip empty lines in sketch
                }

                match seg_parts[0] {
                    "L" => {
                        if seg_parts.len() != 5 {
                            return Err(CompactParseError {
                                line: *current_line,
                                message: format!("L requires 4 args, got {}", seg_parts.len() - 1),
                            });
                        }
                        segments.push(SketchSegment2D::Line {
                            start: Vec2::new(
                                parse_f64(seg_parts[1], *current_line)?,
                                parse_f64(seg_parts[2], *current_line)?,
                            ),
                            end: Vec2::new(
                                parse_f64(seg_parts[3], *current_line)?,
                                parse_f64(seg_parts[4], *current_line)?,
                            ),
                        });
                    }
                    "A" => {
                        if seg_parts.len() != 8 {
                            return Err(CompactParseError {
                                line: *current_line,
                                message: format!("A requires 7 args, got {}", seg_parts.len() - 1),
                            });
                        }
                        segments.push(SketchSegment2D::Arc {
                            start: Vec2::new(
                                parse_f64(seg_parts[1], *current_line)?,
                                parse_f64(seg_parts[2], *current_line)?,
                            ),
                            end: Vec2::new(
                                parse_f64(seg_parts[3], *current_line)?,
                                parse_f64(seg_parts[4], *current_line)?,
                            ),
                            center: Vec2::new(
                                parse_f64(seg_parts[5], *current_line)?,
                                parse_f64(seg_parts[6], *current_line)?,
                            ),
                            ccw: parse_u32(seg_parts[7], *current_line)? != 0,
                        });
                    }
                    _ => {
                        return Err(CompactParseError {
                            line: *current_line,
                            message: format!("unknown sketch segment opcode: {}", seg_parts[0]),
                        });
                    }
                }
            }

            Ok(CsgOp::Sketch2D {
                origin,
                x_dir,
                y_dir,
                segments,
            })
        }

        "E" => {
            if parts.len() != 5 {
                return Err(CompactParseError {
                    line: line_num,
                    message: format!("E requires 4 args, got {}", parts.len() - 1),
                });
            }
            Ok(CsgOp::Extrude {
                sketch: parse_u64(parts[1], line_num)?,
                direction: Vec3::new(
                    parse_f64(parts[2], line_num)?,
                    parse_f64(parts[3], line_num)?,
                    parse_f64(parts[4], line_num)?,
                ),
            })
        }

        "V" => {
            if parts.len() != 9 {
                return Err(CompactParseError {
                    line: line_num,
                    message: format!("V requires 8 args, got {}", parts.len() - 1),
                });
            }
            Ok(CsgOp::Revolve {
                sketch: parse_u64(parts[1], line_num)?,
                axis_origin: Vec3::new(
                    parse_f64(parts[2], line_num)?,
                    parse_f64(parts[3], line_num)?,
                    parse_f64(parts[4], line_num)?,
                ),
                axis_dir: Vec3::new(
                    parse_f64(parts[5], line_num)?,
                    parse_f64(parts[6], line_num)?,
                    parse_f64(parts[7], line_num)?,
                ),
                angle_deg: parse_f64(parts[8], line_num)?,
            })
        }

        _ => Err(CompactParseError {
            line: line_num,
            message: format!("unknown opcode: {}", opcode),
        }),
    }
}

fn parse_f64(s: &str, line: usize) -> Result<f64, CompactParseError> {
    s.parse().map_err(|_| CompactParseError {
        line,
        message: format!("invalid number: {}", s),
    })
}

fn parse_u64(s: &str, line: usize) -> Result<u64, CompactParseError> {
    s.parse().map_err(|_| CompactParseError {
        line,
        message: format!("invalid node id: {}", s),
    })
}

fn parse_u32(s: &str, line: usize) -> Result<u32, CompactParseError> {
    s.parse().map_err(|_| CompactParseError {
        line,
        message: format!("invalid integer: {}", s),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_simple_cube() {
        let compact = "C 50 30 5";
        let doc = from_compact(compact).unwrap();

        assert_eq!(doc.nodes.len(), 1);
        let node = &doc.nodes[&0];
        match &node.op {
            CsgOp::Cube { size } => {
                assert_eq!(size.x, 50.0);
                assert_eq!(size.y, 30.0);
                assert_eq!(size.z, 5.0);
            }
            _ => panic!("expected Cube"),
        }
    }

    #[test]
    fn test_plate_with_hole() {
        let compact = "C 50 30 5\nY 5 10\nT 1 25 15 0\nD 0 2";
        let doc = from_compact(compact).unwrap();

        assert_eq!(doc.nodes.len(), 4);

        // Node 0: Cube
        match &doc.nodes[&0].op {
            CsgOp::Cube { size } => {
                assert_eq!(size.x, 50.0);
                assert_eq!(size.y, 30.0);
                assert_eq!(size.z, 5.0);
            }
            _ => panic!("expected Cube at node 0"),
        }

        // Node 1: Cylinder
        match &doc.nodes[&1].op {
            CsgOp::Cylinder { radius, height, .. } => {
                assert_eq!(*radius, 5.0);
                assert_eq!(*height, 10.0);
            }
            _ => panic!("expected Cylinder at node 1"),
        }

        // Node 2: Translate
        match &doc.nodes[&2].op {
            CsgOp::Translate { child, offset } => {
                assert_eq!(*child, 1);
                assert_eq!(offset.x, 25.0);
                assert_eq!(offset.y, 15.0);
                assert_eq!(offset.z, 0.0);
            }
            _ => panic!("expected Translate at node 2"),
        }

        // Node 3: Difference
        match &doc.nodes[&3].op {
            CsgOp::Difference { left, right } => {
                assert_eq!(*left, 0);
                assert_eq!(*right, 2);
            }
            _ => panic!("expected Difference at node 3"),
        }

        // Root should be node 3
        assert_eq!(doc.roots[0].root, 3);
    }

    #[test]
    fn test_roundtrip_cube() {
        let mut doc = Document::new();
        doc.nodes.insert(
            0,
            Node {
                id: 0,
                name: None,
                op: CsgOp::Cube {
                    size: Vec3::new(10.0, 20.0, 30.0),
                },
            },
        );
        doc.roots.push(SceneEntry {
            root: 0,
            material: "default".to_string(),
        });

        let compact = to_compact(&doc).unwrap();
        assert_eq!(compact, "C 10 20 30");

        let restored = from_compact(&compact).unwrap();
        match &restored.nodes[&0].op {
            CsgOp::Cube { size } => {
                assert_eq!(size.x, 10.0);
                assert_eq!(size.y, 20.0);
                assert_eq!(size.z, 30.0);
            }
            _ => panic!("expected Cube"),
        }
    }

    #[test]
    fn test_roundtrip_plate_with_hole() {
        let mut doc = Document::new();

        // Cube
        doc.nodes.insert(
            0,
            Node {
                id: 0,
                name: None,
                op: CsgOp::Cube {
                    size: Vec3::new(50.0, 30.0, 5.0),
                },
            },
        );

        // Cylinder
        doc.nodes.insert(
            1,
            Node {
                id: 1,
                name: None,
                op: CsgOp::Cylinder {
                    radius: 5.0,
                    height: 10.0,
                    segments: 0,
                },
            },
        );

        // Translate
        doc.nodes.insert(
            2,
            Node {
                id: 2,
                name: None,
                op: CsgOp::Translate {
                    child: 1,
                    offset: Vec3::new(25.0, 15.0, 0.0),
                },
            },
        );

        // Difference
        doc.nodes.insert(
            3,
            Node {
                id: 3,
                name: None,
                op: CsgOp::Difference { left: 0, right: 2 },
            },
        );

        doc.roots.push(SceneEntry {
            root: 3,
            material: "default".to_string(),
        });

        let compact = to_compact(&doc).unwrap();
        let lines: Vec<&str> = compact.lines().collect();
        assert_eq!(lines.len(), 4);
        assert_eq!(lines[0], "C 50 30 5");
        assert_eq!(lines[1], "Y 5 10");
        assert_eq!(lines[2], "T 1 25 15 0");
        assert_eq!(lines[3], "D 0 2");
    }

    #[test]
    fn test_all_primitives() {
        let compact = "C 10 20 30\nY 5 15\nS 8\nK 5 2 20";
        let doc = from_compact(compact).unwrap();

        assert_eq!(doc.nodes.len(), 4);

        match &doc.nodes[&0].op {
            CsgOp::Cube { size } => assert_eq!(*size, Vec3::new(10.0, 20.0, 30.0)),
            _ => panic!("expected Cube"),
        }

        match &doc.nodes[&1].op {
            CsgOp::Cylinder { radius, height, .. } => {
                assert_eq!(*radius, 5.0);
                assert_eq!(*height, 15.0);
            }
            _ => panic!("expected Cylinder"),
        }

        match &doc.nodes[&2].op {
            CsgOp::Sphere { radius, .. } => assert_eq!(*radius, 8.0),
            _ => panic!("expected Sphere"),
        }

        match &doc.nodes[&3].op {
            CsgOp::Cone {
                radius_bottom,
                radius_top,
                height,
                ..
            } => {
                assert_eq!(*radius_bottom, 5.0);
                assert_eq!(*radius_top, 2.0);
                assert_eq!(*height, 20.0);
            }
            _ => panic!("expected Cone"),
        }
    }

    #[test]
    fn test_all_booleans() {
        let compact = "C 10 10 10\nC 5 5 5\nU 0 1\nD 0 1\nI 0 1";
        let doc = from_compact(compact).unwrap();

        match &doc.nodes[&2].op {
            CsgOp::Union { left, right } => {
                assert_eq!(*left, 0);
                assert_eq!(*right, 1);
            }
            _ => panic!("expected Union"),
        }

        match &doc.nodes[&3].op {
            CsgOp::Difference { left, right } => {
                assert_eq!(*left, 0);
                assert_eq!(*right, 1);
            }
            _ => panic!("expected Difference"),
        }

        match &doc.nodes[&4].op {
            CsgOp::Intersection { left, right } => {
                assert_eq!(*left, 0);
                assert_eq!(*right, 1);
            }
            _ => panic!("expected Intersection"),
        }
    }

    #[test]
    fn test_all_transforms() {
        let compact = "C 10 10 10\nT 0 5 10 15\nR 1 45 0 90\nX 2 2 2 2";
        let doc = from_compact(compact).unwrap();

        match &doc.nodes[&1].op {
            CsgOp::Translate { child, offset } => {
                assert_eq!(*child, 0);
                assert_eq!(*offset, Vec3::new(5.0, 10.0, 15.0));
            }
            _ => panic!("expected Translate"),
        }

        match &doc.nodes[&2].op {
            CsgOp::Rotate { child, angles } => {
                assert_eq!(*child, 1);
                assert_eq!(*angles, Vec3::new(45.0, 0.0, 90.0));
            }
            _ => panic!("expected Rotate"),
        }

        match &doc.nodes[&3].op {
            CsgOp::Scale { child, factor } => {
                assert_eq!(*child, 2);
                assert_eq!(*factor, Vec3::new(2.0, 2.0, 2.0));
            }
            _ => panic!("expected Scale"),
        }
    }

    #[test]
    fn test_linear_pattern() {
        let compact = "C 10 10 5\nLP 0 1 0 0 5 20";
        let doc = from_compact(compact).unwrap();

        match &doc.nodes[&1].op {
            CsgOp::LinearPattern {
                child,
                direction,
                count,
                spacing,
            } => {
                assert_eq!(*child, 0);
                assert_eq!(*direction, Vec3::new(1.0, 0.0, 0.0));
                assert_eq!(*count, 5);
                assert_eq!(*spacing, 20.0);
            }
            _ => panic!("expected LinearPattern"),
        }
    }

    #[test]
    fn test_circular_pattern() {
        let compact = "Y 3 10\nCP 0 0 0 0 0 0 1 6 360";
        let doc = from_compact(compact).unwrap();

        match &doc.nodes[&1].op {
            CsgOp::CircularPattern {
                child,
                axis_origin,
                axis_dir,
                count,
                angle_deg,
            } => {
                assert_eq!(*child, 0);
                assert_eq!(*axis_origin, Vec3::new(0.0, 0.0, 0.0));
                assert_eq!(*axis_dir, Vec3::new(0.0, 0.0, 1.0));
                assert_eq!(*count, 6);
                assert_eq!(*angle_deg, 360.0);
            }
            _ => panic!("expected CircularPattern"),
        }
    }

    #[test]
    fn test_shell() {
        let compact = "C 50 50 50\nSH 0 2";
        let doc = from_compact(compact).unwrap();

        match &doc.nodes[&1].op {
            CsgOp::Shell { child, thickness } => {
                assert_eq!(*child, 0);
                assert_eq!(*thickness, 2.0);
            }
            _ => panic!("expected Shell"),
        }
    }

    #[test]
    fn test_sketch_extrude() {
        let compact = "SK 0 0 0  1 0 0  0 1 0\nL 0 0 10 0\nL 10 0 10 5\nL 10 5 0 5\nL 0 5 0 0\nEND\nE 0 0 0 20";
        let doc = from_compact(compact).unwrap();

        // The sketch takes up line 0 (SK header consumes lines until END)
        match &doc.nodes[&0].op {
            CsgOp::Sketch2D {
                origin,
                x_dir,
                y_dir,
                segments,
            } => {
                assert_eq!(*origin, Vec3::new(0.0, 0.0, 0.0));
                assert_eq!(*x_dir, Vec3::new(1.0, 0.0, 0.0));
                assert_eq!(*y_dir, Vec3::new(0.0, 1.0, 0.0));
                assert_eq!(segments.len(), 4);
            }
            _ => panic!("expected Sketch2D"),
        }

        // Extrude is at line 6 (after SK + 4 segments + END)
        match &doc.nodes[&6].op {
            CsgOp::Extrude { sketch, direction } => {
                assert_eq!(*sketch, 0);
                assert_eq!(*direction, Vec3::new(0.0, 0.0, 20.0));
            }
            _ => panic!("expected Extrude"),
        }
    }

    #[test]
    fn test_sketch_revolve() {
        let compact =
            "SK 0 0 0  1 0 0  0 1 0\nL 5 0 10 0\nL 10 0 10 20\nL 10 20 5 20\nL 5 20 5 0\nEND\nV 0 0 0 0 0 1 0 360";
        let doc = from_compact(compact).unwrap();

        match &doc.nodes[&6].op {
            CsgOp::Revolve {
                sketch,
                axis_origin,
                axis_dir,
                angle_deg,
            } => {
                assert_eq!(*sketch, 0);
                assert_eq!(*axis_origin, Vec3::new(0.0, 0.0, 0.0));
                assert_eq!(*axis_dir, Vec3::new(0.0, 1.0, 0.0));
                assert_eq!(*angle_deg, 360.0);
            }
            _ => panic!("expected Revolve"),
        }
    }

    #[test]
    fn test_sketch_with_arc() {
        let compact = "SK 0 0 0  1 0 0  0 1 0\nL 0 0 10 0\nA 10 0 10 10 10 5 1\nL 10 10 0 10\nL 0 10 0 0\nEND";
        let doc = from_compact(compact).unwrap();

        match &doc.nodes[&0].op {
            CsgOp::Sketch2D { segments, .. } => {
                assert_eq!(segments.len(), 4);
                match &segments[1] {
                    SketchSegment2D::Arc {
                        start,
                        end,
                        center,
                        ccw,
                    } => {
                        assert_eq!(*start, Vec2::new(10.0, 0.0));
                        assert_eq!(*end, Vec2::new(10.0, 10.0));
                        assert_eq!(*center, Vec2::new(10.0, 5.0));
                        assert!(*ccw);
                    }
                    _ => panic!("expected Arc"),
                }
            }
            _ => panic!("expected Sketch2D"),
        }
    }

    #[test]
    fn test_comments_and_empty_lines() {
        let compact = "# This is a comment\nC 10 10 10\n\n# Another comment\nY 5 10";
        let doc = from_compact(compact).unwrap();

        // Comments and empty lines are skipped but don't affect node IDs
        // Line 0: comment (skipped)
        // Line 1: C -> node 1
        // Line 2: empty (skipped)
        // Line 3: comment (skipped)
        // Line 4: Y -> node 4
        assert_eq!(doc.nodes.len(), 2);
        assert!(doc.nodes.contains_key(&1));
        assert!(doc.nodes.contains_key(&4));
    }

    #[test]
    fn test_parse_error_invalid_opcode() {
        let compact = "Z 10 10 10";
        let result = from_compact(compact);
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert_eq!(err.line, 0);
        assert!(err.message.contains("unknown opcode"));
    }

    #[test]
    fn test_parse_error_wrong_arg_count() {
        let compact = "C 10 10"; // Missing third arg
        let result = from_compact(compact);
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(err.message.contains("requires 3 args"));
    }

    #[test]
    fn test_parse_error_invalid_number() {
        let compact = "C 10 abc 10";
        let result = from_compact(compact);
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(err.message.contains("invalid number"));
    }

    #[test]
    fn test_negative_numbers() {
        let compact = "C 10 10 10\nT 0 -5 -10 -15";
        let doc = from_compact(compact).unwrap();

        match &doc.nodes[&1].op {
            CsgOp::Translate { offset, .. } => {
                assert_eq!(offset.x, -5.0);
                assert_eq!(offset.y, -10.0);
                assert_eq!(offset.z, -15.0);
            }
            _ => panic!("expected Translate"),
        }
    }

    #[test]
    fn test_floating_point() {
        let compact = "C 10.5 20.25 30.125";
        let doc = from_compact(compact).unwrap();

        match &doc.nodes[&0].op {
            CsgOp::Cube { size } => {
                assert_eq!(size.x, 10.5);
                assert_eq!(size.y, 20.25);
                assert_eq!(size.z, 30.125);
            }
            _ => panic!("expected Cube"),
        }
    }

    #[test]
    fn test_empty_input() {
        let compact = "";
        let doc = from_compact(compact).unwrap();
        assert!(doc.nodes.is_empty());
        assert!(doc.roots.is_empty());
    }

    #[test]
    fn test_complex_model() {
        // Flange with 6 bolt holes
        let compact = r#"Y 25 5
Y 3 10
T 1 15 0 0
CP 2 0 0 0 0 0 1 6 360
D 0 3"#;

        let doc = from_compact(compact).unwrap();
        assert_eq!(doc.nodes.len(), 5);

        // Final difference should be root
        assert_eq!(doc.roots[0].root, 4);
    }
}
