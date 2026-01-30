//! TUI widgets and layout.

mod command;
mod status;
mod tree;
mod viewport;

pub use command::*;
pub use status::*;
pub use tree::*;
pub use viewport::*;

use ratatui::{
    layout::{Constraint, Direction, Layout, Rect},
    style::{Color, Modifier, Style},
    text::{Line, Span},
    widgets::{Block, Borders, Paragraph},
    Frame,
};

use crate::app::App;
use crate::render::RenderBuffer;

/// Draw the full UI.
pub fn draw(f: &mut Frame, app: &App, render_buffer: &RenderBuffer, focused_part_index: usize) {
    let size = f.area();

    // Main vertical layout
    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(3), // Header
            Constraint::Min(10),   // Main content
            Constraint::Length(3), // Command input
            Constraint::Length(1), // Status bar
        ])
        .split(size);

    // Header
    draw_header(f, chunks[0]);

    // Main content (sidebar + viewport)
    let main_chunks = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([
            Constraint::Length(24), // Sidebar
            Constraint::Min(20),    // Viewport
        ])
        .split(chunks[1]);

    // Sidebar (parts tree)
    draw_tree(f, main_chunks[0], app, focused_part_index);

    // 3D Viewport
    draw_viewport(f, main_chunks[1], render_buffer);

    // Command input
    draw_command(f, chunks[2], app);

    // Status bar
    draw_status(f, chunks[3], app);
}

fn draw_header(f: &mut Frame, area: Rect) {
    let header = Block::default()
        .borders(Borders::ALL)
        .border_style(Style::default().fg(Color::Cyan))
        .title(Span::styled(
            " vcad ",
            Style::default()
                .fg(Color::Cyan)
                .add_modifier(Modifier::BOLD),
        ));

    let help_text = Line::from(vec![
        Span::styled("1", Style::default().fg(Color::Yellow)),
        Span::raw(":box "),
        Span::styled("2", Style::default().fg(Color::Yellow)),
        Span::raw(":cyl "),
        Span::styled("3", Style::default().fg(Color::Yellow)),
        Span::raw(":sph "),
        Span::styled("arrows", Style::default().fg(Color::Yellow)),
        Span::raw(":rotate "),
        Span::styled("+/-", Style::default().fg(Color::Yellow)),
        Span::raw(":zoom "),
        Span::styled("x", Style::default().fg(Color::Yellow)),
        Span::raw(":del "),
        Span::styled("u", Style::default().fg(Color::Yellow)),
        Span::raw(":undo "),
        Span::styled(":", Style::default().fg(Color::Yellow)),
        Span::raw(":cmd "),
        Span::styled("q", Style::default().fg(Color::Yellow)),
        Span::raw(":quit"),
    ]);

    let inner = header.inner(area);
    f.render_widget(header, area);
    f.render_widget(Paragraph::new(help_text), inner);
}
