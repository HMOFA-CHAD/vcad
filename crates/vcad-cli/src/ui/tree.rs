//! Feature tree widget.

use ratatui::{
    layout::Rect,
    style::{Color, Modifier, Style},
    text::{Line, Span},
    widgets::{Block, Borders, List, ListItem},
    Frame,
};

use crate::app::App;

/// Draw the parts/feature tree.
pub fn draw_tree(f: &mut Frame, area: Rect, app: &App, focused_index: usize) {
    let block = Block::default().borders(Borders::ALL).title(" Parts ");

    let inner = block.inner(area);
    f.render_widget(block, area);

    let parts = app.get_parts();

    if parts.is_empty() {
        let empty_msg = ratatui::widgets::Paragraph::new("No parts")
            .style(Style::default().fg(Color::DarkGray));
        f.render_widget(empty_msg, inner);
        return;
    }

    let items: Vec<ListItem> = parts
        .iter()
        .enumerate()
        .map(|(i, (id, name))| {
            let is_selected = app.selected.contains(id);
            let is_focused = i == focused_index;

            let prefix = if is_selected { "* " } else { "  " };
            let tree_prefix = if i == parts.len() - 1 {
                "└─ "
            } else {
                "├─ "
            };

            let style = if is_selected {
                Style::default()
                    .fg(Color::Yellow)
                    .add_modifier(Modifier::BOLD)
            } else if is_focused {
                Style::default()
                    .fg(Color::Cyan)
                    .add_modifier(Modifier::UNDERLINED)
            } else {
                Style::default().fg(Color::White)
            };

            ListItem::new(Line::from(vec![
                Span::raw(prefix),
                Span::styled(tree_prefix, Style::default().fg(Color::DarkGray)),
                Span::styled(name.clone(), style),
            ]))
        })
        .collect();

    let list = List::new(items);
    f.render_widget(list, inner);
}
