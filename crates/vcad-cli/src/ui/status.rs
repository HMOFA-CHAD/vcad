//! Status bar widget.

use ratatui::{
    layout::Rect,
    style::{Color, Style},
    text::{Line, Span},
    widgets::Paragraph,
    Frame,
};

use crate::app::App;

/// Draw the status bar.
pub fn draw_status(f: &mut Frame, area: Rect, app: &App) {
    let parts = app.get_parts();
    let tri_count: usize = app.meshes.iter().map(|m| m.indices.len() / 3).sum();

    let status_line = Line::from(vec![
        Span::styled(" ", Style::default()),
        Span::styled(&app.status, Style::default().fg(Color::Green)),
        Span::styled(" │ ", Style::default().fg(Color::DarkGray)),
        Span::styled(
            format!("Parts: {}", parts.len()),
            Style::default().fg(Color::Cyan),
        ),
        Span::styled(" │ ", Style::default().fg(Color::DarkGray)),
        Span::styled(
            format!("Tris: {}", tri_count),
            Style::default().fg(Color::Cyan),
        ),
        Span::styled(" │ ", Style::default().fg(Color::DarkGray)),
        Span::styled(
            format!("Selected: {}", app.selected.len()),
            Style::default().fg(if app.selected.is_empty() {
                Color::DarkGray
            } else {
                Color::Yellow
            }),
        ),
    ]);

    let paragraph = Paragraph::new(status_line).style(Style::default().bg(Color::Rgb(30, 30, 35)));
    f.render_widget(paragraph, area);
}
