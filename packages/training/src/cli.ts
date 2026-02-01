#!/usr/bin/env node
/**
 * CLI for synthetic training data generation.
 */

import { Command } from "commander";
import * as fs from "node:fs";
import * as path from "node:path";
import * as readline from "node:readline";
import {
  generators,
  generatorFamilies,
  defaultCounts,
  type GeneratedPart,
  type TrainingExample,
} from "./generators/index.js";
import { annotate, generateSyntheticExamples } from "./annotate.js";
import {
  validateExamples,
  computeValidationStats,
  filterValidExamples,
} from "./validate.js";

const program = new Command();

program
  .name("vcad-training")
  .description("Synthetic training data generation for cad0")
  .version("0.1.0");

/**
 * Generate command - creates raw IR examples without annotation.
 */
program
  .command("generate")
  .description("Generate raw compact IR examples")
  .option("-f, --family <family>", "Part family to generate", "all")
  .option("-c, --count <count>", "Number of examples to generate", "100")
  .option("-o, --output <path>", "Output file path", "data/raw/output.jsonl")
  .action(async (options) => {
    const count = parseInt(options.count, 10);
    const outputPath = path.resolve(options.output);

    // Ensure output directory exists
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });

    const families =
      options.family === "all"
        ? generatorFamilies
        : [options.family];

    console.log(`Generating ${count} examples from families: ${families.join(", ")}`);

    const parts: GeneratedPart[] = [];
    const countsPerFamily =
      options.family === "all"
        ? distributeCount(count, families)
        : { [options.family]: count };

    for (const family of families) {
      const generator = generators[family];
      if (!generator) {
        console.error(`Unknown family: ${family}`);
        process.exit(1);
      }

      const familyCount = countsPerFamily[family];
      console.log(`  ${family}: ${familyCount} examples`);

      for (let i = 0; i < familyCount; i++) {
        parts.push(generator.generate());
      }
    }

    // Write to JSONL
    const output = fs.createWriteStream(outputPath);
    for (const part of parts) {
      output.write(JSON.stringify(part) + "\n");
    }
    output.end();

    console.log(`\nWrote ${parts.length} examples to ${outputPath}`);
  });

/**
 * Annotate command - adds text descriptions using Claude API.
 */
program
  .command("annotate")
  .description("Annotate raw IR with text descriptions")
  .option("-i, --input <path>", "Input JSONL file", "data/raw/output.jsonl")
  .option("-o, --output <path>", "Output JSONL file", "data/annotated/output.jsonl")
  .option("--synthetic", "Use synthetic descriptions instead of API", false)
  .option("--prompts <count>", "Number of prompts per part (1-5)", "5")
  .action(async (options) => {
    const inputPath = path.resolve(options.input);
    const outputPath = path.resolve(options.output);

    // Ensure output directory exists
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });

    // Read input
    const parts = await readJsonlFile<GeneratedPart>(inputPath);
    console.log(`Read ${parts.length} parts from ${inputPath}`);

    let examples: TrainingExample[];

    if (options.synthetic) {
      console.log("Generating synthetic descriptions...");
      examples = generateSyntheticExamples(parts);
    } else {
      // Use Claude API
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        console.error("Error: ANTHROPIC_API_KEY environment variable not set");
        console.error("Use --synthetic flag for testing without API");
        process.exit(1);
      }

      const Anthropic = (await import("@anthropic-ai/sdk")).default;
      const client = new Anthropic({ apiKey });

      console.log("Annotating with Claude API...");
      const promptsPerPart = Math.min(5, Math.max(1, parseInt(options.prompts, 10)));

      examples = await annotate(parts, {
        client,
        promptsPerPart,
        onProgress: (completed, total) => {
          process.stdout.write(`\r  Progress: ${completed}/${total}`);
        },
      });
      console.log("");
    }

    // Write output
    const output = fs.createWriteStream(outputPath);
    for (const example of examples) {
      output.write(JSON.stringify(example) + "\n");
    }
    output.end();

    console.log(`Wrote ${examples.length} examples to ${outputPath}`);
  });

/**
 * Validate command - checks generated examples for validity.
 */
program
  .command("validate")
  .description("Validate training examples")
  .option("-i, --input <path>", "Input JSONL file", "data/annotated/output.jsonl")
  .option("--geometry", "Validate geometry with engine (slower)", false)
  .action(async (options) => {
    const inputPath = path.resolve(options.input);

    const examples = await readJsonlFile<TrainingExample>(inputPath);
    console.log(`Validating ${examples.length} examples from ${inputPath}`);

    let engine;
    if (options.geometry) {
      console.log("Loading engine for geometry validation...");
      const { Engine } = await import("@vcad/engine");
      engine = await Engine.init();
    }

    const results = await validateExamples(
      examples,
      {
        onProgress: (completed, total, errors) => {
          process.stdout.write(`\r  Progress: ${completed}/${total} (${errors} errors)`);
        },
      },
      engine,
    );
    console.log("");

    const stats = computeValidationStats(results);

    console.log("\nValidation Statistics:");
    console.log(`  Total: ${stats.total}`);
    console.log(`  Valid: ${stats.valid} (${((stats.valid / stats.total) * 100).toFixed(1)}%)`);
    console.log(`  Invalid: ${stats.invalid}`);

    if (Object.keys(stats.errorCounts).length > 0) {
      console.log("\nError breakdown:");
      for (const [error, count] of Object.entries(stats.errorCounts)) {
        console.log(`  ${error}: ${count}`);
      }
    }

    if (stats.avgVolume !== undefined) {
      console.log(`\nAverage bounding box volume: ${stats.avgVolume.toFixed(2)} mm³`);
    }
    if (stats.avgTriangles !== undefined) {
      console.log(`Average triangle count: ${Math.round(stats.avgTriangles)}`);
    }
  });

/**
 * Pipeline command - full generation + annotation + split pipeline.
 */
program
  .command("pipeline")
  .description("Run full data generation pipeline")
  .option("-c, --count <count>", "Total examples to generate", "1000")
  .option("-o, --output <dir>", "Output directory", "data")
  .option("--synthetic", "Use synthetic descriptions instead of API", false)
  .option("--validate", "Validate examples before splitting", false)
  .action(async (options) => {
    const totalCount = parseInt(options.count, 10);
    const outputDir = path.resolve(options.output);

    console.log(`Running pipeline for ${totalCount} examples`);
    console.log(`Output directory: ${outputDir}`);

    // Ensure directories exist
    fs.mkdirSync(path.join(outputDir, "raw"), { recursive: true });
    fs.mkdirSync(path.join(outputDir, "annotated"), { recursive: true });

    // 1. Generate
    console.log("\n=== Step 1: Generate ===");
    const parts: GeneratedPart[] = [];
    const countsPerFamily = distributeCount(totalCount, generatorFamilies);

    for (const family of generatorFamilies) {
      const generator = generators[family];
      const familyCount = countsPerFamily[family];
      console.log(`  ${family}: ${familyCount} examples`);

      for (let i = 0; i < familyCount; i++) {
        parts.push(generator.generate());
      }
    }

    // Save raw
    const rawPath = path.join(outputDir, "raw", "all.jsonl");
    writeJsonlFile(rawPath, parts);
    console.log(`  Wrote ${parts.length} parts to ${rawPath}`);

    // 2. Annotate
    console.log("\n=== Step 2: Annotate ===");
    let examples: TrainingExample[];

    if (options.synthetic) {
      console.log("  Using synthetic descriptions");
      examples = generateSyntheticExamples(parts);
    } else {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        console.log("  ANTHROPIC_API_KEY not set, falling back to synthetic");
        examples = generateSyntheticExamples(parts);
      } else {
        const Anthropic = (await import("@anthropic-ai/sdk")).default;
        const client = new Anthropic({ apiKey });

        examples = await annotate(parts, {
          client,
          promptsPerPart: 5,
          onProgress: (completed, total) => {
            process.stdout.write(`\r  Progress: ${completed}/${total}`);
          },
        });
        console.log("");
      }
    }

    // Save annotated
    const annotatedPath = path.join(outputDir, "annotated", "all.jsonl");
    writeJsonlFile(annotatedPath, examples);
    console.log(`  Wrote ${examples.length} examples to ${annotatedPath}`);

    // 3. Validate (optional)
    if (options.validate) {
      console.log("\n=== Step 3: Validate ===");
      const results = await validateExamples(examples, {
        onProgress: (completed, total, errors) => {
          process.stdout.write(`\r  Progress: ${completed}/${total} (${errors} errors)`);
        },
      });
      console.log("");

      const validExamples = filterValidExamples(examples, results);
      const stats = computeValidationStats(results);
      console.log(`  Valid: ${stats.valid}/${stats.total}`);
      examples = validExamples;
    }

    // 4. Split
    console.log("\n=== Step 4: Split ===");
    const shuffled = shuffle(examples);
    const trainEnd = Math.floor(shuffled.length * 0.9);
    const valEnd = Math.floor(shuffled.length * 0.95);

    const train = shuffled.slice(0, trainEnd);
    const val = shuffled.slice(trainEnd, valEnd);
    const test = shuffled.slice(valEnd);

    writeJsonlFile(path.join(outputDir, "train.jsonl"), train);
    writeJsonlFile(path.join(outputDir, "val.jsonl"), val);
    writeJsonlFile(path.join(outputDir, "test.jsonl"), test);

    console.log(`  train: ${train.length} examples`);
    console.log(`  val: ${val.length} examples`);
    console.log(`  test: ${test.length} examples`);

    console.log("\n=== Pipeline Complete ===");
  });

/**
 * Stats command - show statistics about generated data.
 */
program
  .command("stats")
  .description("Show statistics about training data")
  .option("-i, --input <path>", "Input JSONL file", "data/train.jsonl")
  .action(async (options) => {
    const inputPath = path.resolve(options.input);
    const examples = await readJsonlFile<TrainingExample>(inputPath);

    console.log(`Statistics for ${inputPath}`);
    console.log(`Total examples: ${examples.length}\n`);

    // By family
    const byFamily: Record<string, number> = {};
    const byComplexity: Record<number, number> = {};

    for (const ex of examples) {
      byFamily[ex.family] = (byFamily[ex.family] || 0) + 1;
      byComplexity[ex.complexity] = (byComplexity[ex.complexity] || 0) + 1;
    }

    console.log("By family:");
    for (const [family, count] of Object.entries(byFamily).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${family}: ${count} (${((count / examples.length) * 100).toFixed(1)}%)`);
    }

    console.log("\nBy complexity:");
    for (const [complexity, count] of Object.entries(byComplexity).sort()) {
      console.log(`  ${complexity}: ${count} (${((count / examples.length) * 100).toFixed(1)}%)`);
    }

    // Text length stats
    const textLengths = examples.map((e) => e.text.length);
    const irLengths = examples.map((e) => e.ir.length);

    console.log("\nText lengths:");
    console.log(`  Min: ${Math.min(...textLengths)}`);
    console.log(`  Max: ${Math.max(...textLengths)}`);
    console.log(`  Avg: ${Math.round(textLengths.reduce((a, b) => a + b, 0) / textLengths.length)}`);

    console.log("\nIR lengths:");
    console.log(`  Min: ${Math.min(...irLengths)}`);
    console.log(`  Max: ${Math.max(...irLengths)}`);
    console.log(`  Avg: ${Math.round(irLengths.reduce((a, b) => a + b, 0) / irLengths.length)}`);
  });

// Helper functions

async function readJsonlFile<T>(filePath: string): Promise<T[]> {
  const items: T[] = [];
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    if (line.trim()) {
      items.push(JSON.parse(line) as T);
    }
  }

  return items;
}

function writeJsonlFile<T>(filePath: string, items: T[]): void {
  const output = fs.createWriteStream(filePath);
  for (const item of items) {
    output.write(JSON.stringify(item) + "\n");
  }
  output.end();
}

function distributeCount(
  total: number,
  families: string[],
): Record<string, number> {
  // Distribute proportionally based on defaultCounts
  const totalDefault = Object.values(defaultCounts).reduce((a, b) => a + b, 0);
  const result: Record<string, number> = {};
  let remaining = total;

  for (let i = 0; i < families.length; i++) {
    const family = families[i];
    if (i === families.length - 1) {
      result[family] = remaining;
    } else {
      const proportion = (defaultCounts[family] || 1000) / totalDefault;
      const count = Math.round(total * proportion);
      result[family] = count;
      remaining -= count;
    }
  }

  return result;
}

function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

program.parse();
