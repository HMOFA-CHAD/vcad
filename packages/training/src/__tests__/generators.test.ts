/**
 * Tests for part generators.
 */

import { describe, it, expect } from "vitest";
import { fromCompact } from "@vcad/ir";
import {
  PlateGenerator,
  SpacerGenerator,
  BracketGenerator,
  FlangeGenerator,
  ShaftGenerator,
  EnclosureGenerator,
  MountGenerator,
  generators,
  generatorFamilies,
  generateRandomPart,
} from "../generators/index.js";
import { validateExample } from "../validate.js";
import { generateSyntheticDescription } from "../annotate.js";

describe("PlateGenerator", () => {
  const gen = new PlateGenerator();

  it("generates valid plate without holes", () => {
    const part = gen.generate({ holePattern: "none" });
    expect(part.family).toBe("plate");
    expect(part.compact).toMatch(/^C \d/); // Starts with cube

    // Parse should succeed
    const doc = fromCompact(part.compact);
    expect(Object.keys(doc.nodes).length).toBeGreaterThan(0);
  });

  it("generates valid plate with corner holes", () => {
    const part = gen.generate({ holePattern: "corners" });
    expect(part.compact).toContain("D"); // Should have difference ops

    const doc = fromCompact(part.compact);
    expect(Object.keys(doc.nodes).length).toBeGreaterThan(4); // Base + 4 holes
  });

  it("generates valid plate with grid holes", () => {
    const part = gen.generate({ holePattern: "grid", gridCols: 3, gridRows: 2 });
    expect(part.compact).toContain("D");

    const doc = fromCompact(part.compact);
    expect(doc.roots.length).toBe(1);
  });

  it("has correct param definitions", () => {
    const defs = gen.paramDefs();
    expect(defs.width.type).toBe("number");
    expect(defs.holePattern.type).toBe("choice");
    expect(defs.holePattern.choices).toContain("corners");
  });
});

describe("SpacerGenerator", () => {
  const gen = new SpacerGenerator();

  it("generates solid spacer", () => {
    const part = gen.generate({ spacerType: "solid" });
    expect(part.compact).toMatch(/^Y \d/); // Just a cylinder
    expect(part.complexity).toBe(1);
  });

  it("generates hollow spacer", () => {
    const part = gen.generate({ spacerType: "hollow" });
    expect(part.compact).toContain("D"); // Difference for hole
  });

  it("generates flanged spacer", () => {
    const part = gen.generate({ spacerType: "flanged" });
    expect(part.compact).toContain("U"); // Union for flange
    expect(part.compact).toContain("D"); // Difference for center hole
  });
});

describe("BracketGenerator", () => {
  const gen = new BracketGenerator();

  it("generates simple L-bracket", () => {
    const part = gen.generate({ bracketType: "simple", hasHoles: false });
    expect(part.compact).toContain("U"); // Union of two legs
    expect(part.family).toBe("bracket");
  });

  it("generates gusseted bracket", () => {
    const part = gen.generate({ bracketType: "gusseted", hasHoles: false });
    expect(part.compact.match(/U/g)?.length).toBeGreaterThanOrEqual(2); // Extra union for gusset
  });

  it("generates bracket with holes", () => {
    const part = gen.generate({ bracketType: "simple", hasHoles: true });
    expect(part.compact).toContain("D"); // Differences for holes
  });
});

describe("FlangeGenerator", () => {
  const gen = new FlangeGenerator();

  it("generates flat flange", () => {
    const part = gen.generate({ flangeType: "flat" });
    expect(part.compact).toMatch(/^Y \d/); // Base cylinder
    expect(part.compact).toContain("D"); // Center hole and bolt holes
  });

  it("generates hubbed flange", () => {
    const part = gen.generate({ flangeType: "hubbed" });
    expect(part.compact).toContain("U"); // Hub union
  });

  it("has correct bolt pattern", () => {
    const part = gen.generate({ boltCount: 6 });
    // Count cylinder operations (should have base + center hole + 6 bolt holes)
    const cylCount = (part.compact.match(/^Y /gm) || []).length;
    expect(cylCount).toBeGreaterThanOrEqual(7);
  });
});

describe("ShaftGenerator", () => {
  const gen = new ShaftGenerator();

  it("generates simple shaft", () => {
    const part = gen.generate({ shaftType: "simple", hasCenterHole: false, hasKeyway: false });
    expect(part.compact).toMatch(/^Y \d/);
    expect(part.complexity).toBe(1);
  });

  it("generates stepped shaft", () => {
    const part = gen.generate({ shaftType: "stepped2", hasCenterHole: false, hasKeyway: false });
    expect(part.compact).toContain("U"); // Union of sections
  });

  it("generates shaft with keyway", () => {
    const part = gen.generate({ shaftType: "stepped2", hasKeyway: true, hasCenterHole: false });
    expect(part.compact).toContain("D"); // Difference for keyway
    expect(part.compact).toContain("C "); // Cube for keyway slot
  });
});

describe("EnclosureGenerator", () => {
  const gen = new EnclosureGenerator();

  it("generates box enclosure", () => {
    const part = gen.generate({ enclosureType: "box", hasFlange: false });
    expect(part.compact).toMatch(/^C \d/); // Outer cube
    expect(part.compact).toContain("D"); // Hollow out
  });

  it("generates lid", () => {
    const part = gen.generate({ enclosureType: "lid" });
    expect(part.compact).toContain("U"); // Lip union
  });

  it("generates box with standoffs", () => {
    const part = gen.generate({ enclosureType: "boxWithStandoffs", hasFlange: false });
    expect(part.compact).toContain("Y"); // Standoff cylinders
    expect(part.complexity).toBe(4);
  });
});

describe("MountGenerator", () => {
  const gen = new MountGenerator();

  it("generates NEMA 17 mount", () => {
    const part = gen.generate({ mountType: "nema17", hasBoss: false });
    // Should have 4 bolt holes in NEMA pattern
    const diffCount = (part.compact.match(/^D /gm) || []).length;
    expect(diffCount).toBeGreaterThanOrEqual(5); // Center + 4 bolts
  });

  it("generates sensor mount", () => {
    const part = gen.generate({ mountType: "sensor" });
    expect(part.compact).toContain("D"); // Mounting holes
  });

  it("generates adjustable mount with slots", () => {
    const part = gen.generate({ mountType: "adjustable" });
    expect(part.compact).toContain("D"); // Slots cut out
  });
});

describe("Generator Registry", () => {
  it("has all expected families", () => {
    expect(generatorFamilies).toContain("plate");
    expect(generatorFamilies).toContain("spacer");
    expect(generatorFamilies).toContain("bracket");
    expect(generatorFamilies).toContain("flange");
    expect(generatorFamilies).toContain("shaft");
    expect(generatorFamilies).toContain("enclosure");
    expect(generatorFamilies).toContain("mount");
    expect(generatorFamilies.length).toBe(7);
  });

  it("all generators produce valid IR", () => {
    for (const family of generatorFamilies) {
      const generator = generators[family];
      const part = generator.generate();

      expect(part.family).toBe(family);
      expect(part.compact.length).toBeGreaterThan(0);
      expect(part.complexity).toBeGreaterThanOrEqual(1);
      expect(part.complexity).toBeLessThanOrEqual(5);

      // Parse should succeed
      const doc = fromCompact(part.compact);
      expect(doc.roots.length).toBe(1);
    }
  });

  it("generateRandomPart works", () => {
    const part = generateRandomPart();
    expect(generatorFamilies).toContain(part.family);
    expect(part.compact.length).toBeGreaterThan(0);
  });
});

describe("Validation", () => {
  it("validates correct IR", () => {
    const gen = new PlateGenerator();
    const part = gen.generate({ holePattern: "none" });

    const result = validateExample({
      text: "test",
      ir: part.compact,
      family: part.family,
      complexity: part.complexity,
    });

    expect(result.valid).toBe(true);
  });

  it("rejects malformed IR", () => {
    const result = validateExample({
      text: "test",
      ir: "INVALID STUFF",
      family: "test",
      complexity: 1,
    });

    expect(result.valid).toBe(false);
    expect(result.error).toBe("parse_error");
  });

  it("rejects empty IR", () => {
    const result = validateExample({
      text: "test",
      ir: "",
      family: "test",
      complexity: 1,
    });

    expect(result.valid).toBe(false);
  });
});

describe("Synthetic Descriptions", () => {
  it("generates descriptions for all families", () => {
    for (const family of generatorFamilies) {
      const part = generators[family].generate();
      const desc = generateSyntheticDescription(part);

      expect(desc.length).toBeGreaterThan(0);
      expect(typeof desc).toBe("string");
    }
  });

  it("includes dimensions in plate description", () => {
    const gen = new PlateGenerator();
    const part = gen.generate({ width: 100, depth: 50, thickness: 5, holePattern: "none" });
    const desc = generateSyntheticDescription(part);

    expect(desc).toContain("100");
    expect(desc).toContain("50");
    expect(desc).toContain("5");
  });
});

describe("Random Generation Consistency", () => {
  it("generates diverse parts", () => {
    const gen = new PlateGenerator();
    const parts = Array.from({ length: 10 }, () => gen.generate());

    // Should have some variation
    const compacts = new Set(parts.map((p) => p.compact));
    expect(compacts.size).toBeGreaterThan(1);
  });

  it("respects provided parameters", () => {
    const gen = new PlateGenerator();
    const part = gen.generate({ width: 100, depth: 60, thickness: 5 });

    expect(part.params.width).toBe(100);
    expect(part.params.depth).toBe(60);
    expect(part.params.thickness).toBe(5);
    expect(part.compact).toContain("C 100 60 5");
  });
});
