import { create } from "zustand";
import type { Theme, ToolMode, TransformMode } from "@/types";

interface UiState {
  selectedPartId: string | null;
  toolMode: ToolMode;
  transformMode: TransformMode;
  featureTreeOpen: boolean;
  theme: Theme;
  isDraggingGizmo: boolean;

  select: (partId: string | null) => void;
  setToolMode: (mode: ToolMode) => void;
  setTransformMode: (mode: TransformMode) => void;
  toggleFeatureTree: () => void;
  toggleTheme: () => void;
  setDraggingGizmo: (dragging: boolean) => void;
}

function loadTheme(): Theme {
  try {
    const stored = localStorage.getItem("vcad-theme");
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // ignore
  }
  return "dark";
}

function loadFeatureTree(): boolean {
  try {
    const stored = localStorage.getItem("vcad-feature-tree");
    if (stored !== null) return stored === "true";
  } catch {
    // ignore
  }
  return true;
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove("dark", "light");
  root.classList.add(theme);
  localStorage.setItem("vcad-theme", theme);
}

export const useUiStore = create<UiState>((set) => {
  const initialTheme = loadTheme();
  // Apply on init
  queueMicrotask(() => applyTheme(initialTheme));

  return {
    selectedPartId: null,
    toolMode: "select",
    transformMode: "translate",
    featureTreeOpen: loadFeatureTree(),
    theme: initialTheme,
    isDraggingGizmo: false,

    select: (partId) => set({ selectedPartId: partId }),

    setToolMode: (mode) => set({ toolMode: mode }),

    setTransformMode: (mode) => set({ transformMode: mode }),

    toggleFeatureTree: () =>
      set((s) => {
        const next = !s.featureTreeOpen;
        localStorage.setItem("vcad-feature-tree", String(next));
        return { featureTreeOpen: next };
      }),

    toggleTheme: () =>
      set((s) => {
        const next = s.theme === "dark" ? "light" : "dark";
        applyTheme(next);
        return { theme: next };
      }),

    setDraggingGizmo: (dragging) => set({ isDraggingGizmo: dragging }),
  };
});
