# vcad UI Style Guide

Design patterns for consistent UI across the app.

## Modal / Card Pattern

Used for dialogs, welcome screens, and floating panels.

### Container

```
border border-border bg-card/95 backdrop-blur-sm shadow-lg
```

- Sharp corners (no border-radius)
- Semi-transparent background with blur
- Subtle border, soft shadow

### Close Button

```html
<div class="absolute right-2 top-2 z-10">
  <button class="p-1 text-text-muted hover:bg-border/50 hover:text-text cursor-pointer">
    <X size={14} />
  </button>
</div>
```

### Header

```html
<h1 class="text-2xl font-bold tracking-tighter text-text mb-0.5">
  vcad<span class="text-accent">.</span>
</h1>
<p class="text-xs text-text-muted mb-5">
  subtitle text here
</p>
```

- Brand name with accent-colored period
- `tracking-tighter` for tight letter spacing
- Small muted subtitle

### Button Pairs

Primary + secondary side by side:

```html
<div class="flex gap-2">
  <!-- Primary -->
  <button class="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white text-xs font-medium hover:bg-accent-hover">
    Primary Action
  </button>
  <!-- Secondary -->
  <button class="flex items-center gap-1.5 px-3 py-1.5 border border-border bg-transparent text-text text-xs hover:bg-border/50">
    Secondary
  </button>
</div>
```

### Footer

```html
<div class="border-t border-border px-4 py-2.5 flex items-center justify-center">
  <p class="text-[10px] text-text-muted">
    footer content
  </p>
</div>
```

- Top border separator
- Centered, very small text

### Input Fields

```html
<input class="h-7 px-2 bg-transparent border border-border text-xs text-text placeholder-text-muted/50 focus:outline-none focus:border-accent transition-colors" />
```

- Transparent background
- Small height (h-7)
- Focus state changes border to accent

## Text Hierarchy

| Use | Classes |
|-----|---------|
| Modal title | `text-2xl font-bold tracking-tighter text-text` |
| Section label | `text-xs text-text-muted` |
| Body text | `text-sm text-text` |
| Fine print | `text-[10px] text-text-muted` |
| Links | `hover:text-text` on muted base |

## Colors

Reference `tailwind.config.js` for values. Key tokens:

- `bg` - page background
- `card` - elevated surface
- `border` - borders and dividers
- `text` - primary text
- `text-muted` - secondary text
- `accent` - brand pink, primary actions
- `accent-hover` - accent hover state
- `danger` - errors

## Spacing

- Modal padding: `px-6 py-5`
- Footer padding: `px-4 py-2.5`
- Gap between buttons: `gap-2`
- Section margin: `mb-5`
