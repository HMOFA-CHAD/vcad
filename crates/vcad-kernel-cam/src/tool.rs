//! Tool definitions for CAM operations.

use serde::{Deserialize, Serialize};

/// A cutting tool definition.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum Tool {
    /// Flat end mill for general machining.
    FlatEndMill {
        /// Tool diameter in mm.
        diameter: f64,
        /// Flute length (cutting depth) in mm.
        flute_length: f64,
        /// Number of flutes.
        flutes: u8,
    },
    /// Ball end mill for 3D contouring.
    BallEndMill {
        /// Tool diameter in mm.
        diameter: f64,
        /// Flute length in mm.
        flute_length: f64,
        /// Number of flutes.
        flutes: u8,
    },
    /// V-bit for engraving and chamfering.
    VBit {
        /// Tool diameter at widest point in mm.
        diameter: f64,
        /// Included angle in degrees (e.g., 60, 90).
        angle: f64,
    },
    /// Drill bit for hole making.
    Drill {
        /// Drill diameter in mm.
        diameter: f64,
        /// Point angle in degrees (typically 118 or 135).
        point_angle: f64,
    },
    /// Face mill for surface machining.
    FaceMill {
        /// Cutter diameter in mm.
        diameter: f64,
        /// Number of inserts.
        inserts: u8,
    },
}

impl Tool {
    /// Get the cutting diameter of the tool.
    pub fn diameter(&self) -> f64 {
        match self {
            Tool::FlatEndMill { diameter, .. } => *diameter,
            Tool::BallEndMill { diameter, .. } => *diameter,
            Tool::VBit { diameter, .. } => *diameter,
            Tool::Drill { diameter, .. } => *diameter,
            Tool::FaceMill { diameter, .. } => *diameter,
        }
    }

    /// Get the tool radius.
    pub fn radius(&self) -> f64 {
        self.diameter() / 2.0
    }

    /// Get the number of flutes/cutting edges.
    pub fn flutes(&self) -> u8 {
        match self {
            Tool::FlatEndMill { flutes, .. } => *flutes,
            Tool::BallEndMill { flutes, .. } => *flutes,
            Tool::VBit { .. } => 2,
            Tool::Drill { .. } => 2,
            Tool::FaceMill { inserts, .. } => *inserts,
        }
    }

    /// Get the maximum cutting depth.
    pub fn max_depth(&self) -> Option<f64> {
        match self {
            Tool::FlatEndMill { flute_length, .. } => Some(*flute_length),
            Tool::BallEndMill { flute_length, .. } => Some(*flute_length),
            Tool::VBit { .. } => None,
            Tool::Drill { .. } => None,
            Tool::FaceMill { .. } => None,
        }
    }

    /// Create a default flat end mill (6mm, 2 flute).
    pub fn default_endmill() -> Self {
        Tool::FlatEndMill {
            diameter: 6.0,
            flute_length: 20.0,
            flutes: 2,
        }
    }

    /// Create a default ball end mill (6mm, 2 flute).
    pub fn default_ball() -> Self {
        Tool::BallEndMill {
            diameter: 6.0,
            flute_length: 20.0,
            flutes: 2,
        }
    }

    /// Create a default drill (3mm).
    pub fn default_drill() -> Self {
        Tool::Drill {
            diameter: 3.0,
            point_angle: 118.0,
        }
    }
}

/// A tool entry in a tool library with metadata.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolEntry {
    /// Tool number (T1, T2, etc.).
    pub number: u32,
    /// Tool name/description.
    pub name: String,
    /// The tool definition.
    pub tool: Tool,
    /// Default spindle speed (RPM).
    pub default_rpm: f64,
    /// Default feed rate (mm/min).
    pub default_feed: f64,
    /// Default plunge rate (mm/min).
    pub default_plunge: f64,
}

impl ToolEntry {
    /// Create a new tool entry with defaults.
    pub fn new(number: u32, name: impl Into<String>, tool: Tool) -> Self {
        Self {
            number,
            name: name.into(),
            tool,
            default_rpm: 12000.0,
            default_feed: 1000.0,
            default_plunge: 300.0,
        }
    }
}

/// A collection of tools available for a job.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct ToolLibrary {
    /// The tools in this library.
    pub tools: Vec<ToolEntry>,
}

impl ToolLibrary {
    /// Create a new empty tool library.
    pub fn new() -> Self {
        Self::default()
    }

    /// Add a tool to the library.
    pub fn add(&mut self, entry: ToolEntry) {
        self.tools.push(entry);
    }

    /// Get a tool by its number.
    pub fn get_by_number(&self, number: u32) -> Option<&ToolEntry> {
        self.tools.iter().find(|t| t.number == number)
    }

    /// Get a tool by index.
    pub fn get(&self, index: usize) -> Option<&ToolEntry> {
        self.tools.get(index)
    }

    /// Create a default library with common tools.
    pub fn default_library() -> Self {
        let mut lib = Self::new();
        lib.add(ToolEntry::new(1, "6mm Flat Endmill", Tool::default_endmill()));
        lib.add(ToolEntry::new(2, "6mm Ball Endmill", Tool::default_ball()));
        lib.add(ToolEntry::new(3, "3mm Drill", Tool::default_drill()));
        lib.add(ToolEntry::new(
            4,
            "90° V-Bit",
            Tool::VBit {
                diameter: 6.0,
                angle: 90.0,
            },
        ));
        lib
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tool_diameter() {
        let tool = Tool::FlatEndMill {
            diameter: 6.0,
            flute_length: 20.0,
            flutes: 2,
        };
        assert!((tool.diameter() - 6.0).abs() < 1e-6);
        assert!((tool.radius() - 3.0).abs() < 1e-6);
    }

    #[test]
    fn test_tool_serialization() {
        let tool = Tool::FlatEndMill {
            diameter: 6.0,
            flute_length: 20.0,
            flutes: 2,
        };
        let json = serde_json::to_string(&tool).unwrap();
        assert!(json.contains("FlatEndMill"));
        let parsed: Tool = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed, tool);
    }

    #[test]
    fn test_tool_entry() {
        let entry = ToolEntry::new(1, "Test Endmill", Tool::default_endmill());
        assert_eq!(entry.number, 1);
        assert_eq!(entry.name, "Test Endmill");
    }

    #[test]
    fn test_tool_library() {
        let lib = ToolLibrary::default_library();
        assert_eq!(lib.tools.len(), 4);
        assert!(lib.get_by_number(1).is_some());
        assert!(lib.get_by_number(99).is_none());
    }
}
