import { create } from "zustand";

/** Standard orthographic and isometric view directions. */
export type ViewDirection =
  | "front"
  | "back"
  | "top"
  | "bottom"
  | "left"
  | "right"
  | "isometric";

/** Drawing view state for 2D technical drawing mode. */
interface DrawingState {
  /** Current view mode: 3D for interactive viewport, 2D for technical drawing. */
  viewMode: "3d" | "2d";
  /** View direction for 2D projection. */
  viewDirection: ViewDirection;
  /** Whether to show hidden lines (dashed) in 2D view. */
  showHiddenLines: boolean;
  /** Whether to show dimension annotations in 2D view. */
  showDimensions: boolean;
  /** Scale factor for the 2D view. */
  scale: number;

  /** Switch between 3D and 2D view modes. */
  setViewMode: (mode: "3d" | "2d") => void;
  /** Set the view direction for 2D projection. */
  setViewDirection: (dir: ViewDirection) => void;
  /** Toggle hidden line visibility. */
  toggleHiddenLines: () => void;
  /** Toggle dimension annotation visibility. */
  toggleDimensions: () => void;
  /** Set the scale factor. */
  setScale: (scale: number) => void;
}

export const useDrawingStore = create<DrawingState>((set) => ({
  viewMode: "3d",
  viewDirection: "front",
  showHiddenLines: true,
  showDimensions: true,
  scale: 1.0,

  setViewMode: (mode) => set({ viewMode: mode }),
  setViewDirection: (dir) => set({ viewDirection: dir }),
  toggleHiddenLines: () => set((s) => ({ showHiddenLines: !s.showHiddenLines })),
  toggleDimensions: () => set((s) => ({ showDimensions: !s.showDimensions })),
  setScale: (scale) => set({ scale }),
}));
