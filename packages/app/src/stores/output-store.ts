import { create } from "zustand";

export type OutputAction = "manufacture" | "stl" | "glb" | "step";
export type MaterialType = "pla" | "aluminum" | "steel";

export const PRICING = {
  pla: { rate: 0.05, base: 2, method: "3D Print", days: 3 },
  aluminum: { rate: 0.5, base: 5, method: "CNC", days: 5 },
  steel: { rate: 0.8, base: 8, method: "CNC", days: 7 },
} as const;

interface OutputStore {
  // Dropdown state
  selectedAction: OutputAction;
  setSelectedAction: (action: OutputAction) => void;

  // Quote panel state
  quotePanelOpen: boolean;
  openQuotePanel: () => void;
  closeQuotePanel: () => void;

  // Material selection
  selectedMaterial: MaterialType;
  setSelectedMaterial: (m: MaterialType) => void;
}

export const useOutputStore = create<OutputStore>((set) => ({
  // Default to manufacture
  selectedAction: "manufacture",
  setSelectedAction: (action) => set({ selectedAction: action }),

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
