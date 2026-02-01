import type { VcadFile } from "@vcad/core";

export interface Example {
  id: string;
  name: string;
  description?: string;
  difficulty?: "beginner" | "intermediate" | "advanced";
  thumbnail?: string;
  features?: string[];
  unlockAfter?: number;
  file: VcadFile;
}

import { plateExample } from "./plate.vcad";
import { bracketExample } from "./bracket.vcad";
import { mascotExample } from "./mascot.vcad";
import { containerExample } from "./container.vcad";
import { flangeExample } from "./flange.vcad";
import { ribbonExample } from "./ribbon.vcad";
import { springExample } from "./spring.vcad";
import { vaseExample } from "./vase.vcad";
import { wineglassExample } from "./wineglass.vcad";
import { robotArmExample } from "./robot-arm.vcad";

export const examples: Example[] = [
  plateExample,
  bracketExample,
  mascotExample,
  containerExample,
  flangeExample,
  ribbonExample,
  springExample,
  vaseExample,
  wineglassExample,
  robotArmExample,
];
