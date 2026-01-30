//! vcad CLI - Terminal-based CAD editor
//!
//! Provides an interactive TUI for creating and editing 3D models.

use anyhow::Result;
use clap::{Parser, Subcommand};
use std::path::PathBuf;

mod app;
mod input;
mod render;
mod ui;

#[derive(Parser)]
#[command(name = "vcad")]
#[command(about = "Terminal-based parametric CAD editor", long_about = None)]
struct Cli {
    #[command(subcommand)]
    command: Option<Commands>,
}

#[derive(Subcommand)]
enum Commands {
    /// Open the interactive TUI editor
    Tui {
        /// Path to a .vcad file to open
        file: Option<PathBuf>,
    },
    /// Export a .vcad file to another format
    Export {
        /// Input .vcad file
        input: PathBuf,
        /// Output file (format determined by extension: .stl, .glb)
        output: PathBuf,
    },
    /// Display information about a .vcad file
    Info {
        /// Path to the .vcad file
        file: PathBuf,
    },
}

fn main() -> Result<()> {
    let cli = Cli::parse();

    match cli.command {
        Some(Commands::Tui { file }) => {
            app::run_tui(file)?;
        }
        Some(Commands::Export { input, output }) => {
            export_file(&input, &output)?;
        }
        Some(Commands::Info { file }) => {
            show_info(&file)?;
        }
        None => {
            // Default to TUI with no file
            app::run_tui(None)?;
        }
    }

    Ok(())
}

fn export_file(input: &PathBuf, output: &PathBuf) -> Result<()> {
    use std::fs;

    let json = fs::read_to_string(input)?;
    let doc = vcad_ir::Document::from_json(&json)?;

    // Evaluate document to get meshes
    let meshes = crate::app::evaluate_document(&doc)?;

    let ext = output.extension().and_then(|e| e.to_str()).unwrap_or("");
    match ext.to_lowercase().as_str() {
        "stl" => {
            // Combine all meshes and export as STL
            let mut combined_verts = Vec::new();
            let mut combined_idxs = Vec::new();
            for mesh in &meshes {
                let base_idx = (combined_verts.len() / 3) as u32;
                combined_verts.extend_from_slice(&mesh.vertices);
                for idx in &mesh.indices {
                    combined_idxs.push(idx + base_idx);
                }
            }
            let stl_bytes = export_stl_bytes(&combined_verts, &combined_idxs)?;
            fs::write(output, stl_bytes)?;
            println!("Exported STL to {}", output.display());
        }
        "glb" => {
            println!("GLB export not yet implemented in CLI");
        }
        _ => {
            anyhow::bail!("Unknown output format: {}", ext);
        }
    }

    Ok(())
}

fn export_stl_bytes(vertices: &[f32], indices: &[u32]) -> Result<Vec<u8>> {
    let num_triangles = indices.len() / 3;
    let mut data = Vec::with_capacity(84 + num_triangles * 50);

    // 80-byte header
    data.extend_from_slice(
        b"vcad-cli STL export                                                             ",
    );
    // Number of triangles
    data.extend_from_slice(&(num_triangles as u32).to_le_bytes());

    for tri in indices.chunks(3) {
        let i0 = tri[0] as usize * 3;
        let i1 = tri[1] as usize * 3;
        let i2 = tri[2] as usize * 3;

        let v0 = [vertices[i0], vertices[i0 + 1], vertices[i0 + 2]];
        let v1 = [vertices[i1], vertices[i1 + 1], vertices[i1 + 2]];
        let v2 = [vertices[i2], vertices[i2 + 1], vertices[i2 + 2]];

        // Compute normal
        let e1 = [v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2]];
        let e2 = [v2[0] - v0[0], v2[1] - v0[1], v2[2] - v0[2]];
        let nx = e1[1] * e2[2] - e1[2] * e2[1];
        let ny = e1[2] * e2[0] - e1[0] * e2[2];
        let nz = e1[0] * e2[1] - e1[1] * e2[0];
        let len = (nx * nx + ny * ny + nz * nz).sqrt();
        let (nx, ny, nz) = if len > 1e-10 {
            (nx / len, ny / len, nz / len)
        } else {
            (0.0, 0.0, 1.0)
        };

        // Normal
        data.extend_from_slice(&nx.to_le_bytes());
        data.extend_from_slice(&ny.to_le_bytes());
        data.extend_from_slice(&nz.to_le_bytes());
        // Vertices
        for v in [v0, v1, v2] {
            data.extend_from_slice(&v[0].to_le_bytes());
            data.extend_from_slice(&v[1].to_le_bytes());
            data.extend_from_slice(&v[2].to_le_bytes());
        }
        // Attribute byte count
        data.extend_from_slice(&0u16.to_le_bytes());
    }

    Ok(data)
}

fn show_info(file: &PathBuf) -> Result<()> {
    use std::fs;

    let json = fs::read_to_string(file)?;
    let doc = vcad_ir::Document::from_json(&json)?;

    println!("vcad document: {}", file.display());
    println!("  Version: {}", doc.version);
    println!("  Nodes: {}", doc.nodes.len());
    println!("  Materials: {}", doc.materials.len());
    println!("  Scene entries: {}", doc.roots.len());

    if !doc.roots.is_empty() {
        println!("\nScene:");
        for (i, entry) in doc.roots.iter().enumerate() {
            let node = doc.nodes.get(&entry.root);
            let name = node
                .and_then(|n| n.name.as_ref())
                .map(|s| s.as_str())
                .unwrap_or("unnamed");
            println!("  {}: {} (material: {})", i + 1, name, entry.material);
        }
    }

    // Evaluate and show mesh stats
    match crate::app::evaluate_document(&doc) {
        Ok(meshes) => {
            let total_tris: usize = meshes.iter().map(|m| m.indices.len() / 3).sum();
            let total_verts: usize = meshes.iter().map(|m| m.vertices.len() / 3).sum();
            println!("\nMesh stats:");
            println!("  Total triangles: {}", total_tris);
            println!("  Total vertices: {}", total_verts);
        }
        Err(e) => {
            println!("\nFailed to evaluate: {}", e);
        }
    }

    Ok(())
}
