/**
 * Generator registry - exports all part generators.
 */

export type {
  PartParams,
  ParamValue,
  ParamDef,
  ParamRange,
  GeneratedPart,
  PartGenerator,
  TrainingExample,
  ValidationResult,
} from "./types.js";

export { PlateGenerator, type PlateParams, type HolePattern } from "./plate.js";
export { SpacerGenerator, type SpacerParams, type SpacerType } from "./spacer.js";
export { BracketGenerator, type BracketParams, type BracketType } from "./bracket.js";
export { FlangeGenerator, type FlangeParams, type FlangeType } from "./flange.js";
export { ShaftGenerator, type ShaftParams, type ShaftType } from "./shaft.js";
export { EnclosureGenerator, type EnclosureParams, type EnclosureType } from "./enclosure.js";
export { MountGenerator, type MountParams, type MountType } from "./mount.js";

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
} from "./utils.js";

import type { PartGenerator } from "./types.js";
import { PlateGenerator } from "./plate.js";
import { SpacerGenerator } from "./spacer.js";
import { BracketGenerator } from "./bracket.js";
import { FlangeGenerator } from "./flange.js";
import { ShaftGenerator } from "./shaft.js";
import { EnclosureGenerator } from "./enclosure.js";
import { MountGenerator } from "./mount.js";

/** All available generators by family name. */
export const generators: Record<string, PartGenerator> = {
  plate: new PlateGenerator(),
  spacer: new SpacerGenerator(),
  bracket: new BracketGenerator(),
  flange: new FlangeGenerator(),
  shaft: new ShaftGenerator(),
  enclosure: new EnclosureGenerator(),
  mount: new MountGenerator(),
};

/** List of all generator family names. */
export const generatorFamilies = Object.keys(generators);

/** Get a generator by family name. */
export function getGenerator(family: string): PartGenerator | undefined {
  return generators[family];
}

/** Generate a random part from a random family. */
export function generateRandomPart(): ReturnType<PartGenerator["generate"]> {
  const families = Object.keys(generators);
  const family = families[Math.floor(Math.random() * families.length)];
  return generators[family].generate();
}

/** Default counts per family for the full 500K dataset. */
export const defaultCounts: Record<string, number> = {
  plate: 15000,
  bracket: 10000,
  flange: 8000,
  spacer: 5000,
  shaft: 5000,
  enclosure: 5000,
  mount: 2000,
};
