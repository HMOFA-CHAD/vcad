import { create } from "zustand";
import type { EvaluatedScene } from "@vcad/core";

export type MaterialType = "pla" | "aluminum" | "steel";

export const PRICING = {
  pla: { rate: 0.05, base: 2, method: "3D Print", days: 3 },
  aluminum: { rate: 0.5, base: 5, method: "CNC", days: 5 },
  steel: { rate: 0.8, base: 8, method: "CNC", days: 7 },
} as const;

interface OutputStore {
  // Quote panel state
  quotePanelOpen: boolean;
  openQuotePanel: () => void;
  closeQuotePanel: () => void;

  // Material selection
  selectedMaterial: MaterialType;
  setSelectedMaterial: (m: MaterialType) => void;
}

export const useOutputStore = create<OutputStore>((set) => ({
  // Quote panel
  quotePanelOpen: false,
  openQuotePanel: () => set({ quotePanelOpen: true }),
  closeQuotePanel: () => set({ quotePanelOpen: false }),

  // Material
  selectedMaterial: "pla",
  setSelectedMaterial: (m) => set({ selectedMaterial: m }),
}));

/**
 * Calculate price for a given volume and material
 * @param volumeCm3 Volume in cubic centimeters
 * @param material Material type
 * @returns Price in dollars
 */
export function calculatePrice(volumeCm3: number, material: MaterialType): number {
  const { rate, base } = PRICING[material];
  return volumeCm3 * rate + base;
}

/**
 * Estimate total volume (cm³) for an evaluated scene.
 * Uses a rough bounding-box fill ratio to keep estimates cheap.
 */
export function estimateVolumeCm3(scene: EvaluatedScene | null): number {
  if (!scene?.parts?.length) return 0;
  return scene.parts.reduce((sum, part) => {
    const positions = part.mesh.positions;
    if (!positions.length) return sum;
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    for (let i = 0; i < positions.length; i += 3) {
      minX = Math.min(minX, positions[i]!);
      maxX = Math.max(maxX, positions[i]!);
      minY = Math.min(minY, positions[i + 1]!);
      maxY = Math.max(maxY, positions[i + 1]!);
      minZ = Math.min(minZ, positions[i + 2]!);
      maxZ = Math.max(maxZ, positions[i + 2]!);
    }
    const bbox = (maxX - minX) * (maxY - minY) * (maxZ - minZ);
    return sum + bbox * 0.3 / 1000;
  }, 0);
}

/**
 * Estimate price for an evaluated scene and material.
 */
export function estimatePrice(
  scene: EvaluatedScene | null,
  material: MaterialType
): number | null {
  if (!scene?.parts?.length) return null;
  const volumeCm3 = estimateVolumeCm3(scene);
  return calculatePrice(volumeCm3, material);
}
