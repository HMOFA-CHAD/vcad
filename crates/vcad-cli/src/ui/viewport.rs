//! 3D viewport widget.

use ratatui::{
    layout::Rect,
    style::{Color, Style},
    widgets::{Block, Borders, Paragraph},
    Frame,
};

use crate::render::{buffer_to_braille, RenderBuffer};

/// Draw the 3D viewport using braille characters.
pub fn draw_viewport(f: &mut Frame, area: Rect, render_buffer: &RenderBuffer) {
    let block = Block::default()
        .borders(Borders::ALL)
        .border_style(Style::default().fg(Color::DarkGray))
        .title(" Viewport ");

    let inner = block.inner(area);
    f.render_widget(block, area);

    // Convert render buffer to braille
    let (_char_width, _char_height, braille_text) = buffer_to_braille(render_buffer);

    // Create a paragraph with the braille text
    // Note: The braille text contains ANSI escape codes for colors
    // We need to use a raw text approach here

    // For now, use a simpler approach without colors
    let lines: Vec<&str> = braille_text.lines().collect();
    let display_lines: Vec<ratatui::text::Line> = lines
        .iter()
        .take(inner.height as usize)
        .map(|line| {
            // Strip ANSI codes for ratatui (it handles styling differently)
            let stripped = strip_ansi_codes(line);
            ratatui::text::Line::raw(stripped)
        })
        .collect();

    let paragraph = Paragraph::new(display_lines).style(Style::default().fg(Color::White));

    f.render_widget(paragraph, inner);
}

/// Strip ANSI escape codes from a string.
fn strip_ansi_codes(s: &str) -> String {
    let mut result = String::with_capacity(s.len());
    let mut in_escape = false;

    for c in s.chars() {
        if c == '\x1b' {
            in_escape = true;
        } else if in_escape {
            if c == 'm' {
                in_escape = false;
            }
        } else {
            result.push(c);
        }
    }

    result
}
