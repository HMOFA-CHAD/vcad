# Feature Documentation Guide

Instructions for AI agents and contributors on writing feature specs. This directory is vcad's **product management source of truth**.

## Philosophy

1. **Specs are living documents** — Update them as understanding evolves
2. **Track work granularly** — Every task should be checkboxed and assignable
3. **Be opinionated** — Make decisions, don't enumerate options endlessly
4. **Ship incrementally** — Define MVP, then enhancements

## File Naming

```
kebab-case.md
```

Examples: `hover-preview.md`, `smart-auto-names.md`, `drag-drop-reordering.md`

## Document Structure

Every feature spec MUST include these sections in order:

```markdown
# Feature Name

One-line description of what this feature does.

## Status

Current state and ownership.

## Problem

Why this matters — the pain point we're solving.

## Solution

What we're building — be specific and opinionated.

## UX Details

How it looks and feels — interactions, edge cases.

## Implementation

Technical approach — files to change, data structures, algorithms.

## Tasks

Granular work items with checkboxes.

## Acceptance Criteria

How we know it's done.

## Future Enhancements

Out of scope for MVP, but worth tracking.
```

---

## Section Details

### Status

Track the current state with a simple table:

```markdown
## Status

| Field | Value |
|-------|-------|
| State | `proposed` / `in-progress` / `shipped` / `on-hold` |
| Owner | @username or `unassigned` |
| Priority | `p0` (critical) / `p1` (high) / `p2` (medium) / `p3` (low) |
| Effort | `xs` (hours) / `s` (1-2 days) / `m` (3-5 days) / `l` (1-2 weeks) / `xl` (2+ weeks) |
| Target | Version or date, e.g., `v0.5` or `2025-Q1` |
| PR | Link to implementation PR when in progress |
```

### Problem

- Start with the user's pain point, not the technical gap
- Quantify if possible ("users click 6 times to change a parameter")
- Reference competitors if relevant ("SolidWorks doesn't do this")

```markdown
## Problem

Every parameter change requires opening a modal dialog:
1. Double-click feature
2. Wait for dialog to load
3. Find the parameter
4. Change the value
5. Click OK
6. Wait for rebuild

This friction adds up. Power users make 100+ parameter changes per session.
```

### Solution

- Be specific about what we're building
- Include a visual mockup if helpful (ASCII art is fine)
- State what's NOT included (scope boundaries)

```markdown
## Solution

Click a feature to expand inline parameter editing:

```
▼ Ø5 Hole at Center
   Diameter: [5.0] mm    ← scrub input
   Depth: [Through] ▼   ← dropdown
   Position: (25, 25)    ← read-only, click to edit in viewport
```

Live preview updates as you scrub. Enter commits, Escape cancels.

**Not included:** Full constraint editing, sketch parameters (separate feature).
```

### UX Details

Cover all interaction states:

- **Default state** — What does it look like normally?
- **Hover** — What changes on hover?
- **Active/Selected** — What changes when active?
- **Loading** — What happens during async operations?
- **Error** — How do we show failures?
- **Edge cases** — Empty states, overflow, mobile, keyboard-only

```markdown
## UX Details

### Interaction States

| State | Behavior |
|-------|----------|
| Hover | Feature row highlights, viewport shows preview |
| Click | Expands to show parameters |
| Scrub | Live preview in viewport, throttled to 60fps |
| Enter | Commits change, collapses row |
| Escape | Cancels change, reverts to previous value |
| Outside click | Commits change |

### Edge Cases

- **Long parameter names**: Truncate with ellipsis, full name in tooltip
- **Invalid values**: Red border, show validation message below input
- **Rebuild failure**: Show error inline, keep input open for correction
```

### Implementation

Be specific about:

- **Files to modify** — List actual paths
- **Data structures** — New types or state additions
- **Key algorithms** — Pseudocode for complex logic
- **Dependencies** — External packages needed

```markdown
## Implementation

### Files to Modify

| File | Changes |
|------|---------|
| `packages/app/src/components/FeatureTree.tsx` | Add expanded state, render parameters |
| `packages/core/src/stores/ui-store.ts` | Add `expandedFeatureId` |
| `packages/app/src/components/ViewportContent.tsx` | Subscribe to preview state |
| `packages/engine/src/evaluate.ts` | Add preview evaluation mode |

### State Additions

```typescript
// ui-store.ts
interface UiState {
  expandedFeatureId: string | null;
  previewParams: Record<string, unknown> | null;
}
```

### Algorithm

1. User clicks feature row
2. Set `expandedFeatureId` in store
3. Render `<ParameterEditor>` component inline
4. On parameter change:
   a. Update `previewParams` in store
   b. Engine re-evaluates with preview params
   c. Viewport renders preview mesh with dashed edges
5. On commit: Apply params to document, clear preview
```

### Tasks

**This is the most important section for tracking work.**

Use GitHub-flavored checkboxes. Group by phase or component. Include effort estimates.

```markdown
## Tasks

### Phase 1: Core Infrastructure

- [ ] Add `expandedFeatureId` to ui-store (`xs`)
- [ ] Add `previewParams` state for live preview (`xs`)
- [ ] Create `<ParameterEditor>` component shell (`s`)

### Phase 2: Parameter Inputs

- [ ] Implement scrub input for numeric values (`s`)
- [ ] Implement dropdown for enum values (`xs`)
- [ ] Add validation and error display (`s`)

### Phase 3: Live Preview

- [ ] Add preview evaluation mode to engine (`m`)
- [ ] Render preview mesh with distinct style (`s`)
- [ ] Throttle preview updates to 60fps (`xs`)

### Phase 4: Polish

- [ ] Keyboard navigation (Tab between inputs) (`xs`)
- [ ] Undo/redo integration (`s`)
- [ ] Mobile touch support (`s`)
```

Effort scale:
- `xs` = hours
- `s` = 1-2 days
- `m` = 3-5 days
- `l` = 1-2 weeks
- `xl` = 2+ weeks

### Acceptance Criteria

Testable statements that define "done". Write them as user stories or test cases.

```markdown
## Acceptance Criteria

- [ ] Clicking a feature expands to show its parameters
- [ ] Scrubbing a numeric value updates the viewport in real-time
- [ ] Pressing Enter commits the change and updates the document
- [ ] Pressing Escape reverts to the previous value
- [ ] Invalid values show an error message and prevent commit
- [ ] Works on mobile (touch drag to scrub)
- [ ] Keyboard accessible (Tab to navigate, Enter to commit)
```

### Future Enhancements

Track ideas that are out of scope but worth remembering.

```markdown
## Future Enhancements

- [ ] Edit sketch constraints inline (requires sketch param exposure)
- [ ] Batch edit multiple features at once
- [ ] Parameter expressions (e.g., `diameter * 2`)
- [ ] Parameter linking (one param drives another)
```

---

## Updating Feature Status

When starting work:
```markdown
| State | `in-progress` |
| Owner | @cam |
| PR | #123 |
```

When shipping:
```markdown
| State | `shipped` |
| PR | #123 (merged) |
```

Check off tasks as completed:
```markdown
- [x] Add `expandedFeatureId` to ui-store (`xs`)
- [x] Add `previewParams` state for live preview (`xs`)
- [ ] Create `<ParameterEditor>` component shell (`s`)  ← in progress
```

---

## Index Maintenance

When adding a new feature spec:

1. Create the `.md` file following this template
2. Add it to `index.md` in the appropriate tier
3. Update effort/impact estimates based on tasks

When shipping a feature:

1. Update status to `shipped`
2. Move to a "Shipped" section in `index.md` (or keep in place with ✅)
3. Archive detailed implementation notes if they clutter the doc

---

## Example: Minimal Feature Spec

```markdown
# Keyboard Navigation

Full keyboard control for power users in the feature tree.

## Status

| Field | Value |
|-------|-------|
| State | `proposed` |
| Owner | `unassigned` |
| Priority | `p2` |
| Effort | `s` |

## Problem

Mouse-only navigation is slow. Power users want vim-like efficiency.

## Solution

| Key | Action |
|-----|--------|
| `j` / `↓` | Move selection down |
| `k` / `↑` | Move selection up |
| `Enter` | Edit selected feature |
| `Delete` | Delete with confirmation |
| `r` | Rename |
| `/` | Focus search |

## Tasks

- [ ] Add keyboard event handler to FeatureTree (`s`)
- [ ] Implement j/k navigation (`xs`)
- [ ] Add visual focus indicator (`xs`)
- [ ] Wire up Enter/Delete/r actions (`xs`)

## Acceptance Criteria

- [ ] Can navigate entire tree without mouse
- [ ] Focus indicator clearly visible
- [ ] Works when tree has focus (not global)
```

---

## Questions?

If something isn't covered here, make a reasonable decision and document it. These guidelines evolve with the project.
