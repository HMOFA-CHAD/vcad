import posthog from "posthog-js";

export const analytics = {
  // Document lifecycle
  documentCreated: () => posthog.capture("document_created"),
  documentOpened: (source: "recent" | "file" | "new") =>
    posthog.capture("document_opened", { source }),
  documentSaved: (method: "manual" | "auto" | "cloud") =>
    posthog.capture("document_saved", { method }),
  documentExported: (format: "stl" | "glb" | "step" | "dxf") =>
    posthog.capture("document_exported", { format }),

  // Feature usage
  primitiveAdded: (kind: "cube" | "cylinder" | "sphere" | "cone") =>
    posthog.capture("primitive_added", { kind }),
  booleanApplied: (type: "union" | "difference" | "intersection") =>
    posthog.capture("boolean_applied", { type }),
  sketchStarted: () => posthog.capture("sketch_started"),
  sketchCompleted: (constraintCount: number) =>
    posthog.capture("sketch_completed", { constraint_count: constraintCount }),
  extrudeApplied: () => posthog.capture("extrude_applied"),

  // Auth events
  signupStarted: (provider: "google" | "github") =>
    posthog.capture("signup_started", { provider }),
  signupCompleted: (provider: "google" | "github") =>
    posthog.capture("signup_completed", { provider }),

  // Advanced features
  stepImported: () => posthog.capture("step_imported"),
  aiGenerationStarted: (prompt: string) =>
    posthog.capture("ai_generation_started", { prompt_length: prompt.length }),
  aiGenerationCompleted: (durationMs: number) =>
    posthog.capture("ai_generation_completed", { duration_ms: durationMs }),
  physicsSimulationRun: () => posthog.capture("physics_simulation_run"),
  printPanelOpened: () => posthog.capture("print_panel_opened"),
  quotePanelOpened: () => posthog.capture("quote_panel_opened"),
};
