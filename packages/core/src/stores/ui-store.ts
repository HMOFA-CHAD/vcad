import { create } from "zustand";
import type { Theme, ToolMode, TransformMode } from "../types.js";

export interface UiState {
  selectedPartIds: Set<string>;
  hoveredPartId: string | null;
  commandPaletteOpen: boolean;
  toolMode: ToolMode;
  transformMode: TransformMode;
  featureTreeOpen: boolean;
  theme: Theme;
  isDraggingGizmo: boolean;
  showWireframe: boolean;
  gridSnap: boolean;
  snapIncrement: number;
  clipboard: string[];
  deleteConfirmParts: string[] | null;

  select: (partId: string | null) => void;
  toggleSelect: (partId: string) => void;
  selectMultiple: (partIds: string[]) => void;
  clearSelection: () => void;
  setHoveredPartId: (partId: string | null) => void;
  toggleCommandPalette: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setToolMode: (mode: ToolMode) => void;
  setTransformMode: (mode: TransformMode) => void;
  toggleFeatureTree: () => void;
  setFeatureTreeOpen: (open: boolean) => void;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  toggleWireframe: () => void;
  toggleGridSnap: () => void;
  setSnapIncrement: (value: number) => void;
  setDraggingGizmo: (dragging: boolean) => void;
  copyToClipboard: (partIds: string[]) => void;
  showDeleteConfirm: (partIds: string[]) => void;
  hideDeleteConfirm: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  selectedPartIds: new Set(),
  hoveredPartId: null,
  commandPaletteOpen: false,
  toolMode: "select",
  transformMode: "translate",
  featureTreeOpen: true,
  theme: "dark",
  isDraggingGizmo: false,
  showWireframe: false,
  gridSnap: false,
  snapIncrement: 5,
  clipboard: [],
  deleteConfirmParts: null,

  select: (partId) =>
    set({ selectedPartIds: partId ? new Set([partId]) : new Set() }),

  toggleSelect: (partId) =>
    set((s) => {
      const next = new Set(s.selectedPartIds);
      if (next.has(partId)) {
        next.delete(partId);
      } else {
        next.add(partId);
      }
      return { selectedPartIds: next };
    }),

  selectMultiple: (partIds) =>
    set({ selectedPartIds: new Set(partIds) }),

  clearSelection: () => set({ selectedPartIds: new Set() }),

  setHoveredPartId: (partId) => set({ hoveredPartId: partId }),

  toggleCommandPalette: () =>
    set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),

  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),

  setToolMode: (mode) => set({ toolMode: mode }),

  setTransformMode: (mode) => set({ transformMode: mode }),

  toggleFeatureTree: () =>
    set((s) => ({ featureTreeOpen: !s.featureTreeOpen })),

  setFeatureTreeOpen: (open) => set({ featureTreeOpen: open }),

  setTheme: (theme) => set({ theme }),

  toggleTheme: () =>
    set((s) => ({ theme: s.theme === "dark" ? "light" : "dark" })),

  toggleWireframe: () =>
    set((s) => ({ showWireframe: !s.showWireframe })),

  toggleGridSnap: () =>
    set((s) => ({ gridSnap: !s.gridSnap })),

  setSnapIncrement: (value) =>
    set({ snapIncrement: value, gridSnap: true }),

  setDraggingGizmo: (dragging) => set({ isDraggingGizmo: dragging }),

  copyToClipboard: (partIds) => set({ clipboard: partIds }),

  showDeleteConfirm: (partIds) => set({ deleteConfirmParts: partIds }),

  hideDeleteConfirm: () => set({ deleteConfirmParts: null }),
}));
