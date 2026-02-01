/**
 * Annotation pipeline - uses Claude API to generate diverse text descriptions.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { GeneratedPart, TrainingExample } from "./generators/types.js";

/** Prompts for generating diverse text descriptions. */
const ANNOTATION_PROMPTS = [
  "Describe this CAD part technically, mentioning exact dimensions in mm:",
  "Describe this part casually as a hobbyist maker would:",
  "What would someone search to find this part?",
  "Write a one-line manufacturing specification:",
  "Describe what this part could be used for:",
];

/** Rate limit delay between batches (ms). */
const RATE_LIMIT_DELAY = 3000;

/** Batch size for parallel API calls. */
const BATCH_SIZE = 50;

/** Split array into chunks. */
function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/** Sleep for a given number of milliseconds. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Options for annotation. */
export interface AnnotateOptions {
  /** Anthropic API client. */
  client: Anthropic;
  /** Number of prompts to use per part (1-5, default 5). */
  promptsPerPart?: number;
  /** Callback for progress updates. */
  onProgress?: (completed: number, total: number) => void;
  /** Model to use (default: claude-3-haiku-20240307). */
  model?: string;
}

/**
 * Annotate generated parts with text descriptions using Claude API.
 *
 * @param parts - Array of generated parts to annotate
 * @param options - Annotation options
 * @returns Array of training examples with text-IR pairs
 */
export async function annotate(
  parts: GeneratedPart[],
  options: AnnotateOptions,
): Promise<TrainingExample[]> {
  const {
    client,
    promptsPerPart = 5,
    onProgress,
    model = "claude-3-haiku-20240307",
  } = options;

  const examples: TrainingExample[] = [];
  const prompts = ANNOTATION_PROMPTS.slice(0, promptsPerPart);
  const totalTasks = parts.length * prompts.length;
  let completed = 0;

  // Process in batches to respect rate limits
  const batches = chunk(parts, BATCH_SIZE);

  for (const batch of batches) {
    // Create all prompt-part combinations for this batch
    const tasks = batch.flatMap((part) =>
      prompts.map((prompt) => ({
        part,
        prompt: `${prompt}\n\nCompact IR:\n${part.compact}`,
      })),
    );

    // Execute API calls in parallel within batch
    const responses = await Promise.all(
      tasks.map(async (task) => {
        try {
          const response = await client.messages.create({
            model,
            max_tokens: 150,
            messages: [{ role: "user", content: task.prompt }],
          });

          const text =
            response.content[0].type === "text"
              ? response.content[0].text.trim()
              : "";

          return { task, text, error: null };
        } catch (error) {
          return { task, text: null, error };
        }
      }),
    );

    // Process responses
    for (const { task, text, error } of responses) {
      if (text && !error) {
        examples.push({
          text,
          ir: task.part.compact,
          family: task.part.family,
          complexity: task.part.complexity,
        });
      }
      completed++;
      onProgress?.(completed, totalTasks);
    }

    // Rate limit delay between batches
    if (batches.indexOf(batch) < batches.length - 1) {
      await sleep(RATE_LIMIT_DELAY);
    }
  }

  return examples;
}

/**
 * Generate a single synthetic description without calling the API.
 * Useful for testing or generating deterministic examples.
 */
export function generateSyntheticDescription(part: GeneratedPart): string {
  const params = part.params;

  switch (part.family) {
    case "plate": {
      const width = params.width as number;
      const depth = params.depth as number;
      const thickness = params.thickness as number;
      const pattern = params.holePattern as string;

      if (pattern === "none") {
        return `${width}x${depth}x${thickness}mm flat plate`;
      }
      const holeDiam = params.holeDiameter as number;
      return `${width}x${depth}x${thickness}mm mounting plate with ${pattern} ${holeDiam}mm holes`;
    }

    case "spacer": {
      const od = params.outerDiameter as number;
      const h = params.height as number;
      const type = params.spacerType as string;

      if (type === "solid") {
        return `${od}mm diameter ${h}mm tall standoff`;
      }
      const id = params.innerDiameter as number;
      if (type === "hollow") {
        return `${od}mm OD ${id}mm ID ${h}mm tall spacer tube`;
      }
      return `${od}mm flanged spacer ${h}mm tall`;
    }

    case "bracket": {
      const w = params.legWidth as number;
      const l1 = params.leg1Length as number;
      const l2 = params.leg2Length as number;
      const type = params.bracketType as string;
      const holes = params.hasHoles as boolean;

      let desc = `${l1}x${l2}mm L-bracket`;
      if (type === "gusseted") desc = "gusseted " + desc;
      if (holes) desc += " with mounting holes";
      return desc;
    }

    case "flange": {
      const od = params.outerDiameter as number;
      const thickness = params.thickness as number;
      const boltCount = params.boltCount as number;
      const type = params.flangeType as string;

      let desc = `${od}mm flange ${thickness}mm thick`;
      if (type === "hubbed") desc += " with hub";
      desc += ` ${boltCount}-bolt pattern`;
      return desc;
    }

    case "shaft": {
      const type = params.shaftType as string;
      const d1 = params.diameter1 as number;
      const l1 = params.length1 as number;

      if (type === "simple") {
        return `${d1}mm diameter ${l1}mm shaft`;
      }

      const d2 = params.diameter2 as number;
      const l2 = params.length2 as number;
      const hasKeyway = params.hasKeyway as boolean;

      let desc = `stepped shaft ${d1}/${d2}mm`;
      if (hasKeyway) desc += " with keyway";
      return desc;
    }

    case "enclosure": {
      const w = params.width as number;
      const d = params.depth as number;
      const h = params.height as number;
      const type = params.enclosureType as string;

      if (type === "lid") {
        return `${w}x${d}mm enclosure lid`;
      }
      let desc = `${w}x${d}x${h}mm enclosure box`;
      if (type === "boxWithStandoffs") desc += " with standoffs";
      if (type === "boxWithVents") desc += " with vents";
      return desc;
    }

    case "mount": {
      const type = params.mountType as string;
      const w = params.plateWidth as number;
      const h = params.plateHeight as number;

      if (type === "nema17") return "NEMA 17 motor mount plate";
      if (type === "nema23") return "NEMA 23 motor mount plate";
      if (type === "sensor") {
        const sd = params.sensorDiameter as number;
        return `${sd}mm sensor mount bracket`;
      }
      return `${w}x${h}mm adjustable mount plate`;
    }

    default:
      return `${part.family} part`;
  }
}

/**
 * Generate training examples without API calls using synthetic descriptions.
 * Useful for testing or when API access is not available.
 */
export function generateSyntheticExamples(
  parts: GeneratedPart[],
): TrainingExample[] {
  return parts.map((part) => ({
    text: generateSyntheticDescription(part),
    ir: part.compact,
    family: part.family,
    complexity: part.complexity,
  }));
}
