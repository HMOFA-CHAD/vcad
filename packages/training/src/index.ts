/**
 * @vcad/training - Synthetic training data generation for cad0.
 *
 * This package provides generators for creating text-IR training pairs
 * for fine-tuning the cad0 text-to-CAD model.
 */

// Generator types and utilities
export type {
  PartParams,
  ParamValue,
  ParamDef,
  ParamRange,
  GeneratedPart,
  PartGenerator,
  TrainingExample,
  ValidationResult,
} from "./generators/types.js";

// Part generators
export {
  PlateGenerator,
  SpacerGenerator,
  BracketGenerator,
  FlangeGenerator,
  ShaftGenerator,
  EnclosureGenerator,
  MountGenerator,
} from "./generators/index.js";

// Generator registry
export {
  generators,
  generatorFamilies,
  getGenerator,
  generateRandomPart,
  defaultCounts,
} from "./generators/index.js";

// Generator utilities
export {
  randInt,
  randFloat,
  randChoice,
  randBool,
  fmt,
  cornerHoles,
  edgeHoles,
  gridHoles,
  circularHoles,
  centerHole,
} from "./generators/utils.js";

// Annotation
export {
  annotate,
  generateSyntheticDescription,
  generateSyntheticExamples,
  type AnnotateOptions,
} from "./annotate.js";

// Validation
export {
  validateExample,
  validateExamples,
  computeValidationStats,
  filterValidExamples,
  type ValidateOptions,
  type ValidationStats,
} from "./validate.js";
