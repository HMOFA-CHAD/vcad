import { create } from "zustand";
import type { EvaluatedScene } from "@vcad/engine";

export interface EngineState {
  scene: EvaluatedScene | null;
  engineReady: boolean;
  loading: boolean;
  error: string | null;

  setScene: (scene: EvaluatedScene) => void;
  setEngineReady: (ready: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useEngineStore = create<EngineState>((set) => ({
  scene: null,
  engineReady: false,
  loading: false,
  error: null,

  setScene: (scene) => set({ scene, error: null }),
  setEngineReady: (ready) => set({ engineReady: ready }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error, loading: false }),
}));
