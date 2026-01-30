# @vcad/docs

Interactive documentation site for vcad - parametric CAD in Rust.

## Features

- **Live Playground**: Edit code and see 3D results instantly
- **Parametric Sliders**: Adjust parameters without touching code
- **Learning Paths**: Beginner → Intermediate → Advanced tutorials
- **Cookbook**: Recipe-style guides for common patterns
- **Gallery**: Community showcase with fork-to-playground
- **Architecture Deep-Dives**: How the kernel works

## Development

```bash
# Install dependencies (from repo root)
npm install

# Start dev server
npm run dev --workspace=@vcad/docs

# Build static site
npm run build --workspace=@vcad/docs

# Preview build
npx serve packages/docs/out
```

## Stack

- **Next.js 15** - App Router with React Server Components
- **Three.js** - 3D viewport via @react-three/fiber
- **Monaco Editor** - Code editing with Rust syntax
- **@vcad/engine** - WASM-based CSG evaluation
- **Tailwind CSS 4** - Styling

## Deployment

The site builds to a static export (`out/` directory) for deployment to any static host.

For GitHub Pages at `vcad.io/docs`, set the environment variable:

```bash
NEXT_PUBLIC_BASE_PATH=/docs npm run build
```
